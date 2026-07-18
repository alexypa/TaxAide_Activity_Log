/**
 * StateController.gs
 * Evaluates state machine rules and transitions for the relational architecture.
 */
const StateController = (() => {

  /**
   * Allowed transition matrix
   * "From" : ["To"]
   * See diagram: https://app.diagrams.net/#G1yJvid-OvGY6ZCAN18lyyTcECVRLSy-BW#%7B%22pageId%22%3A%22KDzbJBr2kpYvJaWEdd2Y%22%7D
   */
  const ALLOWED_TRANSITIONS = {
    "Checked In":        ["Assigned", "No Return"],
    "Assigned":          ["Ready for Review", "Incomplete", "No Return", "Deactivated"],
    "Ready for Review":  ["In Review", "Incomplete"],
    "In Review":         ["Complete", "Incomplete", "e-Filed", "Paper", "Deactivated"],
    "Incomplete":        ["Checked In", "Assigned", "Deactivated", "In Review", "Ready for Review", "Paper"],
    "Complete":          ["e-Filed", "Deactivated", "Paper"],
    "e-Filed":           ["Accepted", "Rejected"],
    "Rejected":          ["Accepted", "Deactivated", "e-Filed"],
    "Accepted":          [], // Terminal state
    "Paper":             [], // Terminal state
    "No Return":         [], // Terminal state
    "Deactivated":       []  // Terminal state
  };

  /**
   * The following states are terminal. No transition out of these states are permitted
   */

  const TERMINAL = ["Accepted", "Paper", "No Return", "Deactivated"];

  /** The following states require the operator to state a reason why the transition occured
   * The system will pop up a form, the operator will fill the reason from a dropdown or enter free text
   *and the reason will be appended to the Comments field.
  */
  const TRANSITION_REQUIRES_REASON = ["No Return", "Incomplete", "Rejected", "Paper", "Deactivated"];

  /**
   * Handles edit to first and last name columns.
   * If both parts are available, sets up a relational walk-in creation payload.
   */
  function handleFirstAndLastNames(COL, col, logRow, value) { 
    const rawFirst = (col === COL.FIRST) ? value : logRow.firstName;
    const rawLast = (col === COL.LAST) ? value : logRow.lastName;
    const first = rawFirst ? String(rawFirst).toUpperCase() : "";
    const last = rawLast ? String(rawLast).toUpperCase() : "";

    const alreadyCheckedIn = logRow.status === "Checked In" || !!logRow.checkInTime;

    // Relational Check: If it already has a master Return ID, ignore name adjustments here
    if (logRow.returnId) {
      return { ok: true, ignore: true };
    }

    if (first && last && !alreadyCheckedIn) {
      // Gather extra grid context parameters for the transaction processor
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Activity_Log");
      
      const walkInData = {
        ticketNumber: sheet.getRange(logRow.row, COL.TICKET).getValue().toString().trim(),
        ssnLast4: sheet.getRange(logRow.row, COL.SSN_LAST4).getValue().toString().trim(),
        firstName: first,
        lastName: last,
        taxYear: sheet.getRange(logRow.row, COL.TAXYEAR).getValue() || new Date().getFullYear().toString(),
        firstNameSpouse: "",
        lastNameSpouse: ""
      };

      // Process backend transactional logic immediately to generate our tracking key
      const newTaxReturnId = DatabaseController.processCheckInTransaction(SpreadsheetApp.getActiveSpreadsheet(), walkInData);

      return {
        ok : true,
        action: "CHECK_IN",
        row: logRow.row,
        taxReturnId: newTaxReturnId,
        firstName: first,
        lastName : last,
        checkInTime : new Date(),
        status : "Checked In"
      };
    }

    return {
      ok: true,
      action: "FORMAT_NAME",
      row: logRow.row,
      col,
      value: String(value).toUpperCase()
    };
  }

  /**
   * Handles edits to the Counselor column
   */
  function handleCounselorEdit(e) {
    const model = ActivityLogModel.getRow(e.range.getRow());
    const status = (model.status || "").toString().trim();
    const counselor = (e.value || "").toString().trim();
    const oldCounselor = (e.oldValue || "").toString().trim();

    if (status === "Checked In" && counselor !== "") {
      return { 
        ok: true,
        ignore: false,       
        action: "ASSIGN_COUNSELOR",
        row: model.row,
        taxReturnId: model.returnId,
        newStatus: "Assigned" // Triggers status progression to database history logs
      };
    }

    if (status === "Assigned" && counselor === "" && oldCounselor !== "") {
      return {
        ok: true,
        ignore: false,
        action: "STATUS_CHANGE",
        newStatus: "Checked In",
        requiresReason: false,
        row: model.row,
        taxReturnId: model.returnId
      };
    }
    
    if (!["Checked In", "Assigned"].includes(status)) {
      return { 
        ok: false,
        ignore: false, 
        message: `Counselor cannot be changed after '${status}'.` 
      };
    }

    if (status === "Assigned" && counselor === oldCounselor) {
      return { ignore: true };
    }

    return { ignore: true };
  }

  /**
   * Handles edits to the Reviewer column (Includes strict IRS validation)
   */
  function handleReviewerEdit(e) { 
    const model = ActivityLogModel.getRow(e.range.getRow()); 
    const reviewer = (e.range.getValue() || "").toString().trim();
    const status    = (model.status || "").toString().trim();
    const counselor = (model.counselor || "").toString().trim();

    if (reviewer && reviewer === counselor) {
      return { ok: false, message: "Reviewer may not be the same as the counselor." };
    }

    if (["Checked In", "Assigned"].includes(status)) {
      return { ok: false, message: "Reviewer may not be assigned before the return is in 'Ready for Review' state." };
    }
    
    if (status === "Ready for Review" && reviewer !== "") {
      return { 
        ok: true, 
        ignore: false,
        action: "ASSIGN_REVIEWER",
        row: model.row,
        taxReturnId: model.returnId,
        newStatus: "In Review" // Triggers automatic phase shift to log sheet
      };
    }

    if (["Accepted", "No Return", "Deactivated"].includes(status)) {
      return { ok: false, message: `Reviewer cannot be changed after terminal state: '${status}'.` };
    }

    if (status === "Ready for Review" && reviewer === "") {
      return { ok: false, message: "Reviewer cannot be removed while return is in Ready for Review state." };
    }

    if (status === "Incomplete") {
      return { ok: true, ignore: true };
    }

    if (status === "In Review" && reviewer === "") {
      return {
        ok: true,
        ignore: false,
        action: "STATUS_CHANGE",
        newStatus: "Ready for Review",
        oldStatus: "In Review",
        row: model.row,
        taxReturnId: model.returnId
      };
    }

    return { ok: true, ignore: true };
  }

  /**
   * Handles edits to the Status column via transition matrices
   */
  function handleStatusEdit(e) {   
    const model = ActivityLogModel.getRow(e.range.getRow());
    const oldStatus = e.oldValue || model.status || "";
    const newStatus = (e.range.getValue() || "").toString().trim();

    if (oldStatus === newStatus) { return { ok: true, ignore: true }; }

    if (TERMINAL.includes(oldStatus)) { 
      return { ok: false, ignore: false, action: "FORBIDDEN_EDIT", message: `No transitions permitted from terminal state: ${oldStatus}.` };
    }

    const allowed = ALLOWED_TRANSITIONS[oldStatus] || [];
    if (!allowed.includes(newStatus)) {
      return { ok: false, ignore: false, message: `Direct transition from: ${oldStatus} state to ${newStatus} state is not permitted` };
    }

    if (TRANSITION_REQUIRES_REASON.includes(newStatus)) {
      return {
        ok: true,
        ignore: false,
        action: "STATUS_CHANGE",
        requiresReason: true,
        reasonType: newStatus,
        newStatus: newStatus,
        oldStatus: oldStatus,
        row: model.row,
        taxReturnId: model.returnId
      };
    }
    
    return { 
      ok: true, 
      ignore: false,
      action: "STATUS_CHANGE",
      newStatus: newStatus,
      oldStatus: oldStatus,
      row: model.row,
      taxReturnId: model.returnId
    };
  }

  return {
    handleFirstAndLastNames,
    handleCounselorEdit,
    handleReviewerEdit,
    handleStatusEdit
  };

})();