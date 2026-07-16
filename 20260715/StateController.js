/**
 * StateController.gs
 * A result object returned by this State Controller has any number of the following fields:
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
const StateController = (() => {

  /**
   * Allowed transition matrix
   * "From" : ["To"]
   * See diagram: https://app.diagrams.net/#G1yJvid-OvGY6ZCAN18lyyTcECVRLSy-BW#%7B%22pageId%22%3A%22KDzbJBr2kpYvJaWEdd2Y%22%7D
   */
  const ALLOWED_TRANSITIONS = {
    "Checked In":      ["Assigned", "No Return"],
    "Assigned":        ["Ready for Review", "Incomplete", "No Return", "Deactivated"],
    "Ready for Review":["In Review", "Incomplete"],
    "In Review":       ["Complete", "Incomplete", "e-Filed", "Paper","Deactivated"],
    "Incomplete":      ["Checked In", "Assigned", "Deactivated", "In Review", "Ready for Review", "Paper"],
    "Complete":        ["e-Filed", "Deactivated", "Paper"],
    "e-Filed":         ["Accepted", "Rejected"],
    "Rejected":        ["Accepted", "Deactivated", "e-Filed"],
    "Accepted":        [], // Terminal state
    "Paper":           [], // Terminal state
    "No Return":       [], // Terminal state
    "Deactivated":     []  // Terminal state
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
   * If one of the columns is still blank, capitalize the one edited 
   * and set action code to "FORMAT_NAME"
   * 
   * If first and last names are populated, capitalize both names 
   * and set action code to "CHECK_IN" and time stamp the checkin time
   */
  function handleFirstAndLastNames(COL, col, logRow, value) { 

    const rawFirst = (col === COL.FIRST) ? value : logRow.firstName;
    const rawLast = (col === COL.LAST) ? value : logRow.lastName;
    const first = rawFirst ? String(rawFirst).toUpperCase() : "";
    const last = rawLast ? String(rawLast).toUpperCase() : "";

    const alreadyCheckedIn = logRow.status === "Checked In" || !!logRow.checkInTime;

    // If both first and last names are set and the status is still not Checked In - then check in the taxpayer
    if (first && last && !alreadyCheckedIn) {
      return {
        ok : true,
        action: "CHECK_IN",
        row: logRow.row,
        firstName: first,
        lastName : last,
        checkInTime : new Date(),
        status : "Checked In"
      };
    }
    // If only first or last names were edited, just format the edited name to uppercase
    return {
      ok: true,
      ignore: false,
      action: "FORMAT_NAME",
      row: logRow.row,
      col,
      value: String(value).toUpperCase()
    }
  }

  /**
   * Handles edits to the Counselor column
   */
  function handleCounselorEdit(e) {

    const model = ActivityLogModel.getRow(e.range.getRow());
    const status = (model.status || "").toString().trim();
    const counselor = (e.value || "").toString().trim();
    const oldCounselor = (e.oldValue || "").toString().trim();

    // Primary path: Checked In → assign counselor → Assigned
    if (status === "Checked In" && counselor !== "") {
      return { 
        ok: true,
        ignore: false,       
        action: "ASSIGN_COUNSELOR",
        row: model.row,
        latestChange: new Date()       
      };
    }

    // Deleting counselor when one is already assigned -> revert to Checked In
    if (status === "Assigned" && counselor === "" && oldCounselor !== "") {
      return {
        ok: true,
        ignore: false,
        action: "STATUS_CHANGE",
        newStatus: "Checked In",
        requiresReason: false,
        row: model.row,
        latestChange: new Date()
      };
    }
    
    // Counselor edits allowed only in Checked In and Assigned statuses
    if (!["Checked In", "Assigned"].includes(status)) {
      return{ 
        ok:false,
        ignore: false, 
        message:`Counselor cannot be changed after '${status}'.` 
      };
    }

    // Assigned → same counselor → ignore
    if (status === "Assigned" && counselor === oldCounselor) {
      return { ignore:true };
    }

    // Otherwise - ignore
    return { ignore:true };
  }

  /**
   * Handles edits to the Reviewer column
   */
  function handleReviewerEdit(e) { 

    const model = ActivityLogModel.getRow(e.range.getRow()); 
    const reviewer = (e.range.getValue() || "").toString().trim();
    const status    = (model.status || "").toString().trim();
    const counselor = (model.counselor || "").toString().trim();

    // Reviewer cannot be the same as counselor (IRS rule)
    if (reviewer && reviewer === counselor) {
      return { ok:false, message:"Reviewer may not be the same as the counselor." };
    }

    // Reject ANY reviewer edit before Ready for Review
    if (["Checked In", "Assigned"].includes(status)) {
      return { ok:false, message:"Reviewer may not be assigned before the return is in 'Ready for Review' state." };
    }
    
    // Primary path: Ready for Review → reviewer assigned → In Review
    if (status === "Ready for Review" && reviewer !== "") {
      return { 
        ok:true, 
        ignore: false,
        action: "ASSIGN_REVIEWER",
        row: model.row,
        latestChange: new Date()
      };
    }

    // Terminal states: reviewer locked
    if (["Accepted", "No Return", "Deactivated"].includes(status)) {
      return { ok:false, message:`Reviewer cannot be changed after terminal state: '${status}'.` };
    }

    // Ready for Review → reviewer removed → forbidden
    if (status === "Ready for Review" && reviewer === "") {
      return { ok:false, message:"Reviewer cannot be removed while return is in Ready for Review state." };
    }

    // Incomplete → reviewer edits allowed (no status change)
    if (status === "Incomplete") {
      return { ok:true, ignore: true };
    }

    // In Review → reviewer deleted → revert to Ready for Review
    if (status === "In Review" && reviewer === "") {
      return {
        ok: true,
        ignore: false,
        action: "STATUS_CHANGE",
        newStatus: "Ready for Review",
        oldStatus: "In Review",
        row: model.row,
        latestChange: new Date()
      };
    }

    // In Review → reviewer changed to ANY non-empty name → allowed
    if (status === "In Review" && reviewer !== "") {
      return { ok:true, ignore:true };
    }

    // Default
    return { ok:true, ignore:true };
  }

  /**
   * Handles edits to the Status column
   */
  function handleStatusEdit(e) {   

    const model = ActivityLogModel.getRow(e.range.getRow());
    const oldStatus = e.oldValue || model.status || "";
    const newStatus = (e.range.getValue() || "").toString().trim();

    // No-op transitions always allowed
    if (oldStatus === newStatus) { return { ok:true, ignore:true }; }

    // Old status is terminal state. Do not allow transition
    if (TERMINAL.includes(oldStatus)) { 
      return { ok:false, ignore:false, action:"FORBIDDEN_EDIT", message:`No transitions permitted from terminal state: ${oldStatus}. ` };
    }

    // Do not allow illegal transitions
    const allowed = ALLOWED_TRANSITIONS[oldStatus] || [];
    if (!allowed.includes(newStatus)) {
      return { ok:false, ignore:false, message:`Direct transition from: ${oldStatus} state to ${newStatus} state is not permitted` };
    }

    // If the transition requires the operator to state a reason why the transition occured
    // The system will pop up a form, the operator will fill the reason from a dropdown or enter free text
    // and the reason will be appended to the Comments field.
    if (TRANSITION_REQUIRES_REASON.includes(newStatus)) {
      return {
        ok: true,
        ignore: false,
        action: "STATUS_CHANGE",
        requiresReason: true,
        reasonType: newStatus,
        newStatus: newStatus,
        oldStatus: oldStatus,
        latestChange: new Date(),
        row: model.row
      }
    }
    
    // All other permitted status changes
    return { 
      ok:true, 
      ignore: false,
      action: "STATUS_CHANGE",
      latestChange: new Date(),
      row: model.row
    };
  }

  return {
    handleFirstAndLastNames,
    handleCounselorEdit,
    handleReviewerEdit,
    handleStatusEdit,
    submitReason
  };

})();
