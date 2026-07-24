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
        Logger.log("Result: " + JSON.stringify(result));
        const reasons = TransitionReasonRegistry[result.reasonType] || [];
        const template = HtmlService.createTemplateFromFile("ReasonDialog");
        template.reasonType = result.reasonType;
        template.reasons = reasons;
        template.row = result.row;
        template.newStatus = result.newStatus;
        template.previousStatus = result.oldStatus;

        const html = template.evaluate().setWidth(420).setHeight(300);
        SpreadsheetApp.getUi().showModalDialog(html, "Reason Required");
        return; // Exits here to wait for the user to type a reason in the dialog
      }
      
      // ========================================================================
      // ENTER CRITICAL SECTION: Lock required for DB writes, sorting, and row deletion
      // ========================================================================
      const lock = LockService.getDocumentLock();
      try {
        lock.waitLock(15000); // Wait up to 15 seconds for traffic to clear

        // 2. Write to the central DB History Log safely
        const dbHistorySheet = e.source.getSheetByName("DB_History_Log");
        const currentComments = activitySheet.getRange(rowNumber, ActivityLogModel.getColumns().COMMENTS).getValue();
        const historyEvent = new TaxReturnHistory(result.taxReturnId, result.newStatus, "", currentComments);
        DatabaseController.appendRowExplicit(dbHistorySheet, historyEvent.toRowArray());
      
        // 3. Process the archival and row deletion for terminal states
        if (TERMINAL_STATES.includes(result.newStatus)) {

          // RE-FIND THE TRUE ROW: Because we waited for a lock, another script may have 
          // deleted a row above us, shifting our target row up!
          const activeData = activitySheet.getDataRange().getValues();
          let trueRowIndex = -1;
          const returnIdColIndex = ActivityLogModel.getColumns().RETURN_ID - 1;
          
          for (let i = 1; i < activeData.length; i++) {
            if (activeData[i][returnIdColIndex] === result.taxReturnId) {
              trueRowIndex = i + 1;
              break;
            }
          }

          if (trueRowIndex === -1) throw new Error("Could not locate taxpayer for archival. Row may have already been removed.");

          // Archive the row into the Archive sheet before deletion
          const archiveSheet = e.source.getSheetByName("Archive");
          const timeZone = e.source.getSpreadsheetTimeZone();
          const now = new Date();

          // Fetch current row values using the safe trueRowIndex
          const rowModel = ActivityLogModel.getRow(trueRowIndex);
          
          // Grab the previously frozen duration text directly from Column L
          const frozenDurationText = activitySheet.getRange(trueRowIndex, 12).getValue().toString();

          const formattedCheckIn = rowModel.checkInTime instanceof Date ? 
            Utilities.formatDate(rowModel.checkInTime, timeZone, "MM/dd/yyyy hh:mm a") : rowModel.checkInTime;
          const formattedCompleted = Utilities.formatDate(now, timeZone, "MM/dd/yyyy hh:mm a");

          // Calculate Time to Complete safely
          let totalMinutes = 0;
          const match = frozenDurationText.match(/\d+/); 
          if (match) {
            totalMinutes = parseInt(match[0], 10);
          } else if (rowModel.checkInTime instanceof Date) {
            totalMinutes = Math.floor((now.getTime() - rowModel.checkInTime.getTime()) / 60000);
          }

          const hours = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          const timeToCompleteStr = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;

          const archiveViewRow = [
            formattedCheckIn, rowModel.ssnLast4, rowModel.firstName, rowModel.lastName,
            rowModel.taxYear, rowModel.counselor, rowModel.reviewer, result.newStatus,
            currentComments || rowModel.comments || "", formattedCompleted, timeToCompleteStr
          ];

          // Safely Append and Sort Archive
          archiveSheet.appendRow(archiveViewRow);
          archiveSheet.getRange(2, 1, archiveSheet.getLastRow() - 1, archiveSheet.getLastColumn()).sort({column: 10, ascending: false});

          // Delete the row cleanly from the active grid using the verified row index
          activitySheet.deleteRow(trueRowIndex);
          
          e.source.toast(rowModel.firstName + " " + rowModel.lastName + " - Tax return completed and moved to archives.", "Tax Return Completed", 5);
          
        } else {
          // If it's a normal transition (e.g., In Review -> Incomplete)
          ActivityLogModel.setFields(rowNumber, { status: result.newStatus });
        }
        
        SpreadsheetApp.flush(); // Commit all safe structural changes to Google's servers

      } catch (err) {
        Logger.log("Archival Concurrency Error: " + err.message);
        SpreadsheetApp.getUi().alert("System Busy", "Another process was updating the log. Please verify the status change was recorded.", SpreadsheetApp.getUi().ButtonSet.OK);
      } finally {
        lock.releaseLock();
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
      Logger.log("Result: " + JSON.stringify(result));
      SpreadsheetApp.getUi().alert("⚠️ Validation Rule Infraction", 
        result.message + "\nPermitted tansitions from " + e.oldValue + " are: " + StateController.getAllowedTransitions(e.oldValue) + 
        "\nThe attempted change has been reverted to its previous value.", 
        SpreadsheetApp.getUi().ButtonSet.OK);
      return;
    }
  }  
  
};