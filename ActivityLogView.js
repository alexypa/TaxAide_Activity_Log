/**
 * ActivityLogView.gs — Updated for unified ActivityLogModel
 * The result object expected has any number of the following fields:
 *    ok:             boolean
 *    ignore:         boolean
 *    action:         string
 *    rowNo:          int
 *    colNo:          int
 *    value:          string // The value of the cell defined by rowNo/colNo
 *    status:         string
 *    message:        string 
 *    requiredReason: boolean // Indicates whether to pop up a form to fill out a required reason for an edit
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
    // Forbidden edit
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
    // First and Lat Names formatting
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
      ActivityLogModel.setFields(result.row, {status: "Assigned"});
      return;
    }

    // ───────────────────────────────────────────────
    // Assign Reviewer -> In Review
    // ───────────────────────────────────────────────
    if (result.action === "ASSIGN_REVIEWER") {  
      ActivityLogModel.setFields(result.row, {status: "In Review"});
      return;
    }

    // ───────────────────────────────────────────────
    // Status change logic (including reason dialog)
    // ───────────────────────────────────────────────
    if (result.action === "STATUS_CHANGE") {

      // If the transition requires a reason, open modal dialog
      if (result.requiresReason) {
        showReasonDialog(result.reasonType, result.row);
        return;
      }

      // Otherwise apply the status change normally
      ActivityLogModel.setFields(result.row, {
        status: result.newStatus
      });

      return;
    }
  }

  function showReasonDialog(reasonType, row) {
    
    const reasons = TransitionReasonRegistry[reasonType] || [];

    const template = HtmlService.createTemplateFromFile("ReasonDialog");
    template.reasonType = reasonType;
    template.reasons = reasons;
    template.row = row;

    const html = template.evaluate()
      .setWidth(420)
      .setHeight(300);

    SpreadsheetApp.getUi().showModalDialog(html, "Reason Required");
  }

  return { applyActivityLogResult };

})();
