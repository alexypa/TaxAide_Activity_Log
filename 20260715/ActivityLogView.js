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

    const activitySheet = e.range.getSheet();
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
    if (result.action === "STATUS_CHANGE" || result.action === "ARCHIVE_STATUS_CHANGE") {
      const TERMINAL_STATES = ["Accepted", "Paper", "No Return", "Deactivated"];

      // 1. If the transition requires a reason, show the reason dialog and halt further processing
      if (result.requiresReason) {
        //showReasonDialog(result.reasonType, result.row, result.newStatus, result.oldStatus);
        Logger.log("Result: " + JSON.stringify(result));
        const reasons = TransitionReasonRegistry[result.reasonType] || [];
        const template = HtmlService.createTemplateFromFile("ReasonDialog");
        template.reasonType = result.reasonType;
        template.reasons = reasons;
        template.row = result.row;
        template.newStatus = result.newStatus;
        template.previousStatus = result.oldStatus;

        const html = template.evaluate()
          .setWidth(420)
          .setHeight(300);

        SpreadsheetApp.getUi().showModalDialog(html, "Reason Required");
        return; // Exits here to wait for the user to type a reason in the dialog
      }
      
      // 2. If no reason is required (or this is the secondary execution after the reason was saved)
      const dbHistorySheet = e.source.getSheetByName("DB_History_Log");
      const currentComments = activitySheet.getRange(rowNumber, ActivityLogModel.getColumns().COMMENTS).getValue();
      const historyEvent = new TaxReturnHistory(result.taxReturnId, result.newStatus, "", currentComments);
      DatabaseController.appendRowExplicit(dbHistorySheet, historyEvent.toRowArray());
    
      // 3. Process the archival and row deletion for terminal states
      if (TERMINAL_STATES.includes(result.newStatus)) {

        // Archive the row into the Archive sheet before deletion
        const archiveSheet = e.source.getSheetByName("Archive");
        const timeZone = e.source.getSpreadsheetTimeZone();
        const now = new Date();

        // Fetch current row values before deleting the row
        const rowModel = ActivityLogModel.getRow(rowNumber);

        // Format Date timestamps using our readable pattern
        const formattedCheckIn = rowModel.checkInTime instanceof Date ? 
          Utilities.formatDate(rowModel.checkInTime, timeZone, "MM/dd/yyyy hh:mm a") :
          rowModel.checkInTime;

        const formattedCompleted = Utilities.formatDate(now, timeZone, "MM/dd/yyyy hh:mm a");

        // Calculate Time to Complete (h:mm)
        let timeToCompleteStr = "0:00";
        if (rowModel.checkInTime instanceof Date) {
          const diffMs = now.getTime() - rowModel.checkInTime.getTime();  
          const totalMinutes = Math.floor(diffMs / (1000 * 60));
          const hours = Math.floor(totalMinutes / 60);
          const mins =  totalMinutes % 60;
          timeToCompleteStr = `${hours}:${mins < 10 ? "0" : ""}${mins}`;
        }

        const archiveViewRow = [
          formattedCheckIn,
          rowModel.ssnLast4,
          rowModel.firstName,
          rowModel.lastName,
          rowModel.taxYear,
          rowModel.counselor,
          rowModel.reviewer,
          result.newStatus,
          currentComments || rowModel.comments || "",
          formattedCompleted,
          timeToCompleteStr
        ];

        archiveSheet.appendRow(archiveViewRow);
        // Sorts the entire archive by Column 10 (Completed Date/Time) descending
        archiveSheet.getRange(2, 1, archiveSheet.getLastRow() - 1, archiveSheet.getLastColumn()).sort({column: 10, ascending: false});


        // Delete the row cleanly from the active grid
        activitySheet.deleteRow(rowNumber);
        
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
      activitySheet.getRange(rowNumber, result.col).setValue(result.value);
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