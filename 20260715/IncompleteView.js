/**
 * ====================================================================================
 *  IncompleteView.gs
 *  Applies controller results to the spreadsheet.
 *  CREATE_ACTIVITY_LOG_ENTRY -> Relocation pipeline back to Activity_Log with 
 *  relational DB_History_Log logging.
 * ====================================================================================
 */

const IncompleteView = (() => {

  function applyIncompleteResult(result, e) {
    if (!result || result.ignore) return;

    if (result.action === "CREATE_ACTIVITY_LOG_ENTRY") {
      
      const lock = LockService.getDocumentLock();
      
      try {
        // Wait up to 15 seconds for any other check-ins/reactivations to finish
        lock.waitLock(15000);

        const ss = e.source;
        const activityLogSheet = ss.getSheetByName("Activity_Log");
        const incompleteSheet = ss.getSheetByName("Incomplete");
        const dbReturnsSheet = ss.getSheetByName("DB_Tax_Returns");
        const dbHistorySheet = ss.getSheetByName("DB_History_Log");

        const taxReturn = result.taxReturn;

        // 1. Relational Lookup: Find Return ID (UUID) and original Ticket # from DB_Tax_Returns
        let returnId = "";
        let ticketNum = "99"; // Default ticket # to 99 if missing

        const lastRowReturns = dbReturnsSheet ? dbReturnsSheet.getLastRow() : 0;
        if (lastRowReturns > 1) {
          const returnsData = dbReturnsSheet.getRange(2, 1, lastRowReturns - 1, 9).getValues();
          for (let i = 0; i < returnsData.length; i++) {
            const dbSSN = returnsData[i][1] ? returnsData[i][1].toString().trim() : "";
            const dbLast = returnsData[i][3] ? returnsData[i][3].toString().trim().toUpperCase() : "";
            
            if (dbSSN === taxReturn.ssnLast4 && dbLast === taxReturn.lastName) {
              returnId = returnsData[i][0];
              if (returnsData[i][8]) {
                ticketNum = returnsData[i][8].toString();
              }
              break;
            }
          }
        }

        // Safeguard: If returnId isn't found in DB_Tax_Returns, generate one so the grid doesn't shift
        if (!returnId) {
          returnId = Utilities.getUuid();
        }

        // Format clean returning comment string
        const now = new Date();
        const dateTag = Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), "MM/dd");
        const updatedComments = `[Reactivated ${dateTag}] ${taxReturn.comments || ""}`;

        // Preserve original Check In Time if present on the Incomplete row; fallback to now
        const originalCheckIn = (taxReturn.checkInTime && taxReturn.checkInTime instanceof Date) 
          ? taxReturn.checkInTime 
          : now;

        // INSTANT DURATION FIX: Calculate elapsed time so the UI turns green immediately
        const elapsedMins = Math.floor((now.getTime() - originalCheckIn.getTime()) / 60000);
        const hours = Math.floor(elapsedMins / 60);
        const mins = elapsedMins % 60;
        const initialDurationStr = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;

        // 2. Build exact 12-Column Array matching Activity_Log relational schema
        const logEntry = [
          returnId,                               // Col A: Return ID
          originalCheckIn,                        // Col B: Check In Time (Preserves original check-in)
          ticketNum,                              // Col C: Ticket #
          taxReturn.ssnLast4,                     // Col D: SSN Last 4
          taxReturn.firstName,                    // Col E: First Name
          taxReturn.lastName,                     // Col F: Last Name
          taxReturn.taxYear,                      // Col G: Tax Year
          taxReturn.counselor,                    // Col H: Counselor
          taxReturn.reviewer,                     // Col I: Reviewer
          taxReturn.status || "Checked In",       // Col J: Status
          updatedComments,                        // Col K: Comments
          initialDurationStr                      // Col L: Duration (Instant pre-fill!)
        ];

        // 3. Append to Activity_Log safely
        activityLogSheet.appendRow(logEntry);
        const newRow = activityLogSheet.getLastRow();
        activityLogSheet.getRange(newRow, 2).setNumberFormat("h:mm AM/PM");

        // 4. Log Relational Event to DB_History_Log safely
        if (dbHistorySheet) {
          const formattedTimestamp = Utilities.formatDate(now, ss.getSpreadsheetTimeZone(), "MM/dd/yy hh:mm:ss a");
          dbHistorySheet.appendRow([
            Utilities.getUuid(),
            returnId,
            taxReturn.status || "Checked In",
            "", // Blank Volunteer ID
            formattedTimestamp,
            updatedComments
          ]);
        }

        // 5. RE-FIND TRUE ROW ON INCOMPLETE SHEET (Prevents Row-Shift Trap)
        const incompleteData = incompleteSheet.getDataRange().getValues();
        let trueRowIndex = -1;
        
        for (let i = 1; i < incompleteData.length; i++) {
          const rowSSN = incompleteData[i][2] ? incompleteData[i][2].toString().trim() : "";
          const rowLast = incompleteData[i][4] ? incompleteData[i][4].toString().toUpperCase().trim() : "";
          
          if (rowSSN === taxReturn.ssnLast4 && rowLast === taxReturn.lastName) {
            trueRowIndex = i + 1;
            break;
          }
        }

        if (trueRowIndex !== -1) {
          incompleteSheet.deleteRow(trueRowIndex);
        } else {
          Logger.log(`Warning: Could not find exact row to delete on Incomplete tab for ${taxReturn.lastName}.`);
        }

        // CRITICAL: Flush all changes to the sheet before releasing the lock
        SpreadsheetApp.flush();

        // 6. Shift user's screen focus directly to the Activity_Log tab
        ss.setActiveSheet(activityLogSheet);
        activityLogSheet.getRange(newRow, 1).activate(); // Selects the newly reactivated row

        // 7. Alert User
        const ui = SpreadsheetApp.getUi();
        ui.alert(
          'Transferred Tax Return to Activity_Log',
          `Name: ${taxReturn.firstName} ${taxReturn.lastName}\n` +
          `Previously counseled by: ${taxReturn.counselor || "N/A"}\n` +
          `Current status: ${taxReturn.status}\n` +
          `Comments: ${updatedComments}`,
          ui.ButtonSet.OK
        );

      } catch (err) {
        Logger.log("Incomplete Reactivation Concurrency Error: " + err.message);
        SpreadsheetApp.getUi().alert("System Busy", "Another process is running. Please wait a moment and try again.", SpreadsheetApp.getUi().ButtonSet.OK);
      } finally {
        lock.releaseLock();
      }
    }
  }

  return {
    applyIncompleteResult
  };

})();