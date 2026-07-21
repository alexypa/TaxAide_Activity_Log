/**
 * ====================================================================================
 *  EodController.gs
 *  Manages the End-of-Day data translation out of the active log queue.
 * ====================================================================================
 */
const EodController = (() => {

  /**
   * Sweeps remaining active items on the Activity_Log sheet over to the Incomplete tab
   * while creating interactive reactivation checkboxes and updating the DB ledger.
   * Sweeps the 'no shoes' from the Appointment tab to the No Show tab and clears the Appointment tab.
   * This is a destructive operation that cannot be undone. It is intended to be run at the end of each day.
   * The user is prompted for confirmation before any action is taken.
   */
  function executeEndOfDaySweep() {

    const ui = SpreadsheetApp.getUi();
    const response = ui.alert(
      "Confirm End of Day Process",
      "This operation will:\n" +
      "\t* Transfer all today's incomplete returns from the Activity_Log sheet to the Incomplete sheet\n" +
      "If the site operates by appointment, this operation will also:\n" +
      "\t* Clear the Appointment sheet, and\n" +
      "\t* Transfer the 'no shows' taxpayers to the No Show sheet\n\n" + 
      "Do you want to proceed?",
      ui.ButtonSet.YES_NO
    );

    if (response !== ui.Button.YES) return;
    
    transferIncompleteReturns_();

    // Move no shows to No Show tab
    AppointmentView.applyAppointmentResult(AppointmentController.processNoShows());

    // Clear Appointment tab for next day
    AppointmentView.applyAppointmentResult(AppointmentController.clearAppointments());
  }

  function transferIncompleteReturns_() {

    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const logSheet = ss.getSheetByName("Activity_Log");
      const incompleteSheet = ss.getSheetByName("Incomplete");
      const dbHistorySheet = ss.getSheetByName("DB_History_Log");
      
      if (!logSheet || !incompleteSheet || !dbHistorySheet) {
        throw new Error("Required sheets are missing. Verify Activity_Log, Incomplete, and DB_History_Log exist.");
      }

      // 1. Scan Activity_Log Column A for true data boundaries
      const firstColumnValues = logSheet.getRange(1, 1, logSheet.getMaxRows(), 1).getValues();
      let trueLastRow = 1;
      for (let r = firstColumnValues.length - 1; r >= 1; r--) {
        if (firstColumnValues[r][0] !== "" && firstColumnValues[r][0] !== undefined && firstColumnValues[r][0] !== null) {
          trueLastRow = r + 1;
          break;
        }
      }

      // If no active returns are present, exit early
      if (trueLastRow <= 1) {
        ui.alert("End-of-Day Process Complete", "The Activity Log is already empty.", ui.ButtonSet.OK);
        return;
      }

      // // 2. Prompt user with confirmation modal before actioning data shifts
      // const response = ui.alert(
      //   "⚠️ Confirm Day Close", 
      //   `Are you sure you want to sweep all remaining unfinished active returns to the Incomplete sheet?`, 
      //   ui.ButtonSet.YES_NO
      // );
      // if (response !== ui.Button.YES) return;

      const now = new Date();
      const timeZone = ss.getSpreadsheetTimeZone();
      const dateString = Utilities.formatDate(now, timeZone, "MM/dd");
      
      // Exact system format for DB_History_Log timestamps: MM/dd/yy hh:mm:ss a
      const formattedTimestamp = Utilities.formatDate(now, timeZone, "MM/dd/yy hh:mm:ss a");

      let sweptCount = 0;

      // 3. Loop backwards through the live queue to safely manage row deletions
      for (let currentRowNum = trueLastRow; currentRowNum >= 2; currentRowNum--) {
        const rowModel = ActivityLogModel.getRow(currentRowNum);

        // Skip ghost formatting rows that lack core payload data assets
        if (!rowModel.ssnLast4 && !rowModel.lastName) {
          logSheet.deleteRow(currentRowNum);
          continue;
        }

        const eodComments = `[EOD Close ${dateString}] ${rowModel.comments || ""}`;
        // Preserve current row status; fallback to "Incomplete" only if completely blank
        const rowStatus = rowModel.status ? rowModel.status.toString().trim() : "Incomplete";

        // Build 11-column array matching Incomplete tab tracking schema requirements
        const incompleteRow = [
          "", // Clean space left open exclusively for checkbox asset initialization
          rowModel.checkInTime || now,
          rowModel.ssnLast4 ? rowModel.ssnLast4.toString() : "",
          rowModel.firstName ? rowModel.firstName.toUpperCase() : "",
          rowModel.lastName ? rowModel.lastName.toUpperCase() : "",
          rowModel.taxYear || "",
          rowModel.counselor || "",
          rowModel.reviewer || "",
          rowStatus, // Preserves original status (e.g., Rejected, e-Filed, Incomplete)
          eodComments,
          now
        ];

        // 4. Find the true physical bottom of Incomplete tab to safely bypass ghost rows
        const incColA = incompleteSheet.getRange(1, 1, incompleteSheet.getMaxRows(), 1).getValues();
        let targetNewRow = 1;
        for (let i = incColA.length - 1; i >= 0; i--) {
          if (incColA[i][0] !== "" && incColA[i][0] !== undefined && incColA[i][0] !== null) {
            targetNewRow = i + 1;
            break;
          }
        }
        targetNewRow++; // Move to the empty line immediately below data boundary

        // 5. Write data block out to the staging layout line
        incompleteSheet.getRange(targetNewRow, 1, 1, 11).setValues([incompleteRow]);

        // 6. Inject the physical checkbox tool and force baseline value state
        const checkboxRange = incompleteSheet.getRange(targetNewRow, 1);
        checkboxRange.insertCheckboxes();
        checkboxRange.setValue(false);

        // 7. Log directly to DB_History_Log preserving current status and exact timestamp format
        if (rowModel.returnId) {
          const historyRow = [
            Utilities.getUuid(),    // Col A: History_ID
            rowModel.returnId,     // Col B: Tax_Return_ID
            rowStatus,             // Col C: Status (Preserved)
            "",                    // Col D: Volunteer_ID
            formattedTimestamp,    // Col E: Formatted Timestamp (MM/dd/yy hh:mm:ss a)
            eodComments            // Col F: Comments
          ];
          dbHistorySheet.appendRow(historyRow);
        }

        // 8. Wipe the row cleanly off the live daily view dashboard scratchpad surface
        logSheet.deleteRow(currentRowNum);
        sweptCount++;
      }

      //ui.alert("Success", `End-of-Day complete. Moved ${sweptCount} items to Incomplete tracking.`, ui.ButtonSet.OK);

    } catch (globalErr) {
      //ui.alert("❌ Script Execution Interrupted", `Error details:\n${globalErr.message}`, ui.ButtonSet.OK);
    }
  }

  return {
    executeEndOfDaySweep
  };

})();