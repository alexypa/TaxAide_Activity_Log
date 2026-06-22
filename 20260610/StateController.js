/**
 * StateController.gs
 * Central state-machine and assignment rules.
 */

const StateController = (() => {

  // -----------------------------
  // FULL STATE MACHINE
  // -----------------------------
  const ALLOWED_TRANSITIONS = {
    "Checked In":      ["Assigned", "No Return"],
    "Assigned":        ["Ready for Review", "Incomplete", "Checked In"],
    "Ready for Review":["In Review", "Incomplete"],
    "In Review":       ["Complete", "Incomplete", "e-Filed", "Paper"],
    "Incomplete":      ["Checked In", "Assigned", "Deactivated"],
    "Complete":        ["e-Filed", "Deactivated"],
    "e-Filed":         ["Accepted", "Rejected"],
    "Rejected":        ["Accepted", "Deactivated", "e-Filed"],
    "Accepted":        [],
    "Paper":           [],
    "No Return":       [],
    "Deactivated":     []
  };

  const TERMINAL = ["Accepted", "Paper", "No Return", "Deactivated"];

  // -----------------------------
  // STATUS TRANSITION VALIDATION
  // -----------------------------
  function validateStatusTransition(oldStatus, newStatus) {

    if (TERMINAL.includes(oldStatus)) {
      return { ok:false, message:`No transitions allowed from terminal state '${oldStatus}'.` };
    }

    const allowed = ALLOWED_TRANSITIONS[oldStatus] || [];
    if (!allowed.includes(newStatus)) {
      return { ok:false, message:`Illegal transition: ${oldStatus} → ${newStatus}` };
    }

    return { ok:true };
  }

  // -----------------------------
  // COUNSELOR VALIDATION
  // -----------------------------
  function validateCounselorChange(model, newCounselor) {
    const status = model.status;
    const oldCounselor = (model.counselor || "").toString().trim();

    if (["In Review", "Complete", "e-Filed", "Accepted", "Rejected", "Paper", "No Return", "Deactivated"]
        .includes(status)) {
      return { ok:false, message:`Counselor cannot be changed after '${status}'.` };
    }

    if (status === "Checked In" && newCounselor !== "") {
      return { ok:true, newStatus:"Assigned" };
    }

    if (status === "Assigned" && newCounselor === "") {
      return { ok:true, newStatus:"Checked In" };
    }

    if (newCounselor !== oldCounselor) {
      return { ok:false, message:"Counselor can only be changed in 'Checked In' or 'Assigned'." };
    }

    return { ok:true, newStatus:status };
  }

  // -----------------------------
  // REVIEWER VALIDATION
  // -----------------------------
  function validateReviewerChange(model, newReviewer) {
    const status = model.status;
    const counselor = (model.counselor || "").toString().trim();
    const reviewer  = (newReviewer || "").toString().trim();

    if (reviewer && reviewer === counselor) {
      return { ok:false, message:"Reviewer cannot be the same as the counselor." };
    }

    if (["Checked In", "Assigned", "Incomplete"].includes(status)) {
      return { ok:false, message:"Reviewer cannot be assigned before 'Ready for Review'." };
    }

    if (["Complete", "e-Filed", "Accepted", "Rejected", "Paper", "No Return", "Deactivated"]
        .includes(status)) {
      return { ok:false, message:`Reviewer cannot be changed after '${status}'.` };
    }

    return { ok:true };
  }

  // -----------------------------
  // HANDLERS CALLED BY onEdit()
  // -----------------------------
  function handleCounselorEdit(model, e) {
    const newCounselor = (e.range.getValue() || "").toString().trim();
    return validateCounselorChange(model, newCounselor);
  }

  function handleReviewerEdit(model, e) {
    const newReviewer = (e.range.getValue() || "").toString().trim();
    const result = validateReviewerChange(model, newReviewer);

    if (!result.ok) return result;

    // ⭐ Auto-transition: Ready for Review → In Review
    if (model.status === "Ready for Review" && newReviewer !== "") {
      return { ok:true, newStatus:"In Review" };
    }

    return { ok:true };
  }

  function handleStatusEdit(model, e) {
    const oldStatus = model.status || "";
    const newStatus = (e.range.getValue() || "").toString().trim();

    // ⭐ Terminal-state enforcement
    if (TERMINAL.includes(oldStatus)) {
      return { ok:false, message:`No transitions allowed from terminal state '${oldStatus}'.` };
    }

    // ⭐ Ignore no-op edits
    if (oldStatus === newStatus) {
      return { ok:true, noChange:true };
    }

    return validateStatusTransition(oldStatus, newStatus);
  }

  // -----------------------------
  // APPLY RESULT BACK TO SHEET
  // -----------------------------
  function applyResult(result, model, row, e) {

    // Ignore no-op edits
    if (result.noChange) {
      return;
    }

    if (!result.ok) {
      // Revert to the real value from the model
      e.range.setValue(model.status);

      // Popup only — no writing to column A
      SpreadsheetApp.getUi().alert(result.message);
      return;
    }

    // Success — no note clearing either
    if (result.newStatus) {
      StateModel.setStatus(row, result.newStatus);
    }
  }


  return {
    handleCounselorEdit,
    handleReviewerEdit,
    handleStatusEdit,
    applyResult
  };

})();
