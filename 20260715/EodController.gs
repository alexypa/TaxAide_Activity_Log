/**
 * ====================================================================================
 *  EodController.gs
 *  Manages the End-of-Day data translation out of the active log queue.
 * ====================================================================================
 */
const EodController = (() => {

  /**
   * Sweeps remaining active items on the dashboard over to the Incomplete tab
   * while creating interactive reactivation checkboxes.
   */
  function executeEndOfDaySweep() {
    const ui = SpreadsheetApp.getUi();
    
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const logSheet = ss.getSheetByName("Activity_Log");
      const incompleteSheet = ss.getSheetByName("Incomplete");
      const dbHistorySheet = ss.getSheetByName("DB_History_Log");
      
      if (!logSheet || !incompleteSheet || !dbHistorySheet) {
        throw new Error("Missing required spreadsheet tabs. Please verify Activity_Log, Incomplete, and DB_History_Log exist.");
      }

      // Scan Column A directly to calculate the true data boundaries
      const firstColumnValues = logSheet.getRange(1, 1, logSheet.getMaxRows(), 1).getValues();
      let trueLastRow = 1;
      
      for (let r = firstColumnValues.length - 1; r >= 1; r--) {
        const cellValue = firstColumnValues[r][0];
        if (cellValue !== "" && cellValue !== undefined && cellValue !== null) {
          trueLastRow = r + 1;
          break;
        }
      }

      if (trueLastRow <= 1) {
        ui.alert("EOD Process Complete", "The live active queue is already empty.", ui.ButtonSet.OK);
        return;
      }

      const response = ui.alert(
        "⚠️ Confirm Day Close", 
        `Are you sure you want to sweep all remaining active returns to the Incomplete sheet?`, 
        ui.ButtonSet.YES_NO
      );
      if (response !== ui.Button.YES) return;

      const now = new Date();
      const timeZone = ss.getSpreadsheetTimeZone();
      const dateString = Utilities.formatDate(now, timeZone, "MM/dd");

      let sweptCount = 0;

      // Loop backwards to safely manage row deletions
      for (let currentRowNum = trueLastRow; currentRowNum >= 2; currentRowNum--) {
        const rowModel = ActivityLogModel.getRow(currentRowNum);

        if (!rowModel.ssnLast4 && !rowModel.lastName) {
          logSheet.deleteRow(currentRowNum);
          continue;
        }

        const eodComments = `[EOD Close ${dateString}] ${rowModel.comments || ""}`;

        // Build 11-column array matching Incomplete tab tracking requirements
        // Leave index 0 empty '' so it doesn't write flat text into the checkbox cell
        const incompleteRow = [
          '', 
          rowModel.checkInTime || now,
          rowModel.ssnLast4 ? rowModel.ssnLast4.toString() : "",
          rowModel.firstName ? rowModel.firstName.toUpperCase() : "",
          rowModel.lastName ? rowModel.lastName.toUpperCase() : "",
          rowModel.taxYear || "",
          rowModel.counselor || "",
          rowModel.reviewer || "",
          rowModel.status || "Incomplete",
          eodComments,
          now
        ];

        // Explicitly calculate the exact next row insertion point on the Incomplete sheet
        const targetNewRow = incompleteSheet.getLastRow() + 1;
        
        // Write the full 11-column row data set to the sheet in one block
        incompleteSheet.getRange(targetNewRow, 1, 1, 11).setValues([incompleteRow]);

        // Explicitly inject a physical checkbox criteria cell into Column A and force it FALSE
        const checkboxRange = incompleteSheet.getRange(targetNewRow, 1);
        checkboxRange.insertCheckboxes();
        checkboxRange.setValue(false); 

        // Relational DB logging event trace
        if (rowModel.returnId) {
          const historyEvent = new TaxReturnHistory(rowModel.returnId, rowModel.status || "Incomplete", "SYSTEM_EOD_SWEEP", eodComments);
          DatabaseController.appendRowExplicit(dbHistorySheet, historyEvent.toRowArray());
        }

        logSheet.deleteRow(currentRowNum);
        sweptCount++;
      }

      ui.alert("Success", `End-of-Day complete. Moved ${sweptCount} items to Incomplete tracking.`, ui.ButtonSet.OK);

    } catch (globalErr) {
      ui.alert("❌ Script Execution Interrupted", `Error details:\n${globalErr.message}`, ui.ButtonSet.OK);
    }
  }

  return {
    executeEndOfDaySweep
  };

})();