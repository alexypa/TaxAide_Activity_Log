/**
 * ActivityLogView.gs
 * Renders and commits view updates onto the Activity_Log dashboard.
 */
const ActivityLogView = {

  /**
   * Applies the state controller's directive payload back onto the grid view.
   * @param {Object} result - The payload returned from StateController
   * @param {Object} e - The original installable edit event context
   */
  applyActivityLogResult: function(result, e) {
    if (!result || result.ignore) return;

    const sheet = e.range.getSheet();
    const rowNumber = result.rowNumber || result.row;

    // SCENARIO 1: A brand new manual walk-in has been validated and created
    if (result.action === "CHECK_IN") {
      ActivityLogModel.setFields(rowNumber, {
        returnId: result.taxReturnId,
        checkInTime: result.checkInTime,
        firstName: result.firstName,
        lastName: result.lastName,
        status: result.status
      });
      return;
    }

    // SCENARIO 2: Counselor Assignment (Checked In -> Assigned)
    if (result.action === "ASSIGN_COUNSELOR") {
      // 1. Visually shift status to Assigned
      ActivityLogModel.setFields(rowNumber, { status: result.newStatus });

      // 2. Log event into relational DB_History_Log
      const dbHistorySheet = e.source.getSheetByName("DB_History_Log");
      const historyEvent = new TaxReturnHistory(result.taxReturnId, result.newStatus, e.value, "");
      DatabaseController.appendRowExplicit(dbHistorySheet, historyEvent.toRowArray());
      return;
    }

    // SCENARIO 3: Reviewer Assignment (Ready for Review -> In Review)
    if (result.action === "ASSIGN_REVIEWER") {
      // 1. Visually shift status to In Review
      ActivityLogModel.setFields(rowNumber, { status: result.newStatus });

      // 2. Log event into relational DB_History_Log
      const dbHistorySheet = e.source.getSheetByName("DB_History_Log");
      const reviewerName = e.range.getValue();
      const historyEvent = new TaxReturnHistory(result.taxReturnId, result.newStatus, reviewerName, "");
      DatabaseController.appendRowExplicit(dbHistorySheet, historyEvent.toRowArray());
      return;
    }

    // SCENARIO 4: Core Status Column Dropdown Changes
    if (result.action === "STATUS_CHANGE") {
      const TERMINAL_STATES = ["Accepted", "Paper", "No Return", "Deactivated"];
      
      // 1. Append state update straight into your background history log first
      const dbHistorySheet = e.source.getSheetByName("DB_History_Log");
      const currentComments = sheet.getRange(rowNumber, ActivityLogModel.getColumns().COMMENTS).getValue();
      const historyEvent = new TaxReturnHistory(result.taxReturnId, result.newStatus, "", currentComments);
      DatabaseController.appendRowExplicit(dbHistorySheet, historyEvent.toRowArray());

      // 2. Visual Layer Handling: If terminal, drop the row from the live screen!
      if (TERMINAL_STATES.includes(result.newStatus)) {
        // Delete the row cleanly from the active grid
        sheet.deleteRow(rowNumber);
        
        // Optional: Flash a quick toast message confirming the cleanup
        e.source.toast("Return completed and moved to archives.", "Queue Cleared", 2);
      } else {
        // If it's a normal transition (e.g., In Review -> Incomplete), just update the status cell
        ActivityLogModel.setFields(rowNumber, { status: result.newStatus });
      }
      return;
    }

    // SCENARIO 5: Basic inline updates like formatting name strings to upper case
    if (result.action === "FORMAT_NAME") {
      sheet.getRange(rowNumber, result.col).setValue(result.value);
      return;
    }
    
    // SCENARIO 6: Validation Errors (Forbidden Transitions, IRS rule infractions)
    if (result.ok === false && result.message) {
      // Revert the cell edit back to its baseline value to preserve grid safety
      if (e.oldValue === undefined) {
        e.range.clearContent();
      } else {
        e.range.setValue(e.oldValue);
      }
      
      // Flash a clear validation alert to the volunteer
      SpreadsheetApp.getUi().alert("⚠️ Validation Rule Infraction", result.message, SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
  }
};