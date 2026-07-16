/**
 * ====================================================================================
 *  IncompleteView.gs
 *  Applies controller results to the spreadsheet.
 *  CREATE_ACTIVITY_LOG_ENTRY -> Creates a new entry in the Activity_Log tab
 * ====================================================================================
 */

const IncompleteView = (() => {

  function applyIncompleteResult(result, e) {

    // No op if result object does not exist or result contains "ignore"
    if (!result || result.ignore) return;    

    // Create Activity_Log entry
    if (result.action === "CREATE_ACTIVITY_LOG_ENTRY") {

      const activityLogSheet = e.source.getSheetByName("Activity_Log");
      const COL = ActivityLogModel.getColumns();

      const taxReturn = result.taxReturn;

      const comments = "Returning from " + 
                        taxReturn.checkInTime.toString().split(' ')[1] + 
                        " " + taxReturn.checkInTime.toString().split(' ')[2] + 
                        ". " + 
                        taxReturn.comments;

      logEntry = [
        new Date(),
        "99", // Ticket # 99 indicates a taxpayer returning to complete his incomplete return
        taxReturn.ssnLast4.toString(),
        taxReturn.firstName.toUpperCase(),
        taxReturn.lastName.toUpperCase(),
        taxReturn.taxYear,
        taxReturn.counselor,
        taxReturn.reviewer,
        taxReturn.status,
        comments,
        taxReturn.lastChange
      ]

      activityLogSheet.appendRow(logEntry);

      const newRow = activityLogSheet.getLastRow();    
      activityLogSheet.getRange(newRow, COL.CHECKIN_TIME).setNumberFormat("h:mm AM/PM");

      // Delete row from Incomplete sheet
      const incompleteSheet = e.source.getSheetByName("Incomplete");
      incompleteSheet.deleteRow(result.row);

      const ui = SpreadsheetApp.getUi();
        ui.alert(
        'Transferred tax return to Activity_Log sheet',
        'Name: ' + taxReturn.firstName.toUpperCase() + " " + taxReturn.lastName.toUpperCase() + '\n' +
        'Previously counseled by: ' + taxReturn.counselor + '\n' +
        'Current status: ' + taxReturn.status + '\n' +
        'Comments: ' + comments + "\n" + 
        'Last changed: ' + taxReturn.lastChange,
        ui.ButtonSet.OK
      );
    }
  }

  return {
    applyIncompleteResult
  };

})();