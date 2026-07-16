/**
 * ActivityLogView.gs
 */

const ActivityLogView = (() => {

  function applyActivityLogResult(result, e) {

    // If result is "ignore" or does not exist - do nothing
    if (!result || result.ignore) return;

    // If result is not OK - revent cell to old value and pop and error message
    if (!result.ok) {
      const oldValue = e.oldValue || "";   // previous cell content
      // Revert the edited cell to its previous value
      e.range.setValue(oldValue);
      SpreadsheetApp.getUi().alert(result.message);
      return;
    }

    const COL = ActivityLogModel.getColumns();

    // ───────────────────────────────────────────────
    // Transfer returns in terminal state to Archive sheet
    // ───────────────────────────────────────────────
    if (result.action === "ARCHIVE_ACTIVITY_LOGS") {

      const archiveSheet = SpreadsheetApp.getActive().getSheetByName("Archive");
      result.rows.forEach( r=> {

        const taxPrepDuration = getDurationHoursMinutes(r.checkedInTime, r.latestChange);

        const row = [
          r.checkedInTime,
          r.ssnLast4,
          r.firstName,
          r.lastName,
          r.taxYear,
          r.counselor,
          r.reviewer,
          r.status,
          r.comments,
          r.latestChange,
          taxPrepDuration
        ]
        archiveSheet.appendRow(row);
      });
    }

    // ───────────────────────────────────────────────
    // Transfer Incomplete returns to Incomplete sheet
    // ───────────────────────────────────────────────
    if (result.action === "TRANSFER_TO_INCOMPLETE") {

      const incompleteSheet = SpreadsheetApp.getActive().getSheetByName("Incomplete");

      const transferToActivityLog = false;
      
      result.rows.forEach( r=> {
        const row = [
          r.transferToActivityLog,
          r.checkedInTime,
          r.ssnLast4,
          r.firstName,
          r.lastName,
          r.taxYear,
          r.counselor,
          r.reviewer,
          r.status,
          r.comments,
          r.latestChange
        ]
        incompleteSheet.appendRow(row);

        const transferToActivityLogCell = incompleteSheet.getRange(incompleteSheet.getLastRow(), 1);
        const checkboxRule = SpreadsheetApp.newDataValidation()
            .requireCheckbox()
            .setAllowInvalid(false) // Blocks users from typing junk values text over the checkbox grid
            .build();
        transferToActivityLogCell.setDataValidation(checkboxRule);
      });
    }

    // ───────────────────────────────────────────────
    // Clears Activity_Log sheet
    // ───────────────────────────────────────────────
    if (result.action === "CLEAR_ACTIVITY_LOGS") {

      const activityLogSheet = SpreadsheetApp.getActive().getSheetByName("Activity_Log");
      if (activityLogSheet.getLastRow() > 1) {
        activityLogSheet.getRange(2, 1, activityLogSheet.getLastRow() - 1, activityLogSheet.getLastColumn()).clearContent();
      }
    }

    // ───────────────────────────────────────────────
    // Forbidden edit - clear cell content & notify user
    // ───────────────────────────────────────────────
    if (result.action === "FORBIDDEN_EDIT") {
      SpreadsheetApp.getActive()
        .getSheetByName("Activity_Log")
        .getRange(result.row, result.col)
        .clearContent();
      SpreadsheetApp.getUi().alert(result.message);
      return;
    }

    // ───────────────────────────────────────────────
    // First and Last Names formatting
    // ───────────────────────────────────────────────
    if (result.action === "FORMAT_NAME") {
      SpreadsheetApp.getActive()
        .getSheetByName("Activity_Log")
        .getRange(result.row, result.col)
        .setValue(result.value);
      return;
    }

    // ───────────────────────────────────────────────
    // Check-in
    // ───────────────────────────────────────────────
    if (result.action === "CHECK_IN") {
      ActivityLogModel.setFields(result.row, {
        firstName: result.firstName,
        lastName:  result.lastName,
        checkInTime: result.checkInTime,
        status: "Checked In"
      });
      return;
    }

    // ───────────────────────────────────────────────
    // Assign Counselor -> Assigned
    // ───────────────────────────────────────────────
    if (result.action === "ASSIGN_COUNSELOR") {  
      ActivityLogModel.setFields(result.row, {
        status: "Assigned", 
        latestChange: new Date()
      });
      return;
    }

    // ───────────────────────────────────────────────
    // Assign Reviewer -> In Review
    // ───────────────────────────────────────────────
    if (result.action === "ASSIGN_REVIEWER") {  
      ActivityLogModel.setFields(result.row, {status: "In Review", latestChange: new Date()});
      return;
    }

    // ───────────────────────────────────────────────
    // Status change logic (including reason dialog)
    // ───────────────────────────────────────────────
    if (result.action === "STATUS_CHANGE") {

      if (result.requiresReason) {
        showReasonDialog(result.reasonType, result.row, result.newStatus, result.oldStatus);
        return;
      }

      // Write new status when no reason is required
      ActivityLogModel.setFields(result.row, {
        status: result.newStatus,
        latestChange: new Date()
      });
      return;
    }
  }

  function getDurationHoursMinutes(startIso, endIso) {

    // Parse ISO timestamps into Date objects
    const start = new Date(startIso);
    const end   = new Date(endIso);

    // Compute difference in milliseconds
    const diffMs = end.getTime() - start.getTime();

    // Convert to hours and minutes
    const totalMinutes = Math.floor(diffMs / 60000); // 1000 ms * 60 sec
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    // Return formatted duration
    return `${hours}h : ${minutes}m`;
    
  }


  function showReasonDialog(reasonType, row, newStatus, previousStatus) {
    
    const reasons = TransitionReasonRegistry[reasonType] || [];

    const template = HtmlService.createTemplateFromFile("ReasonDialog");
    template.reasonType = reasonType;
    template.reasons = reasons;
    template.row = row;
    template.newStatus = newStatus;
    template.previousStatus = previousStatus;

    const html = template.evaluate()
      .setWidth(420)
      .setHeight(300);

    SpreadsheetApp.getUi().showModalDialog(html, "Reason Required");
  }

  return { 
    applyActivityLogResult
  };

})();
