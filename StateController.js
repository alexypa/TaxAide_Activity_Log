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
    "Incomplete":      ["Checked In", "Assigned", "Deactivated", "In Review"],
    "Complete":        ["e-Filed", "Deactivated", "Paper"],
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
      return { ok:false, message:`Transition from: ${oldStatus} to ${newStatus} is not allowed` };
    }

    return { ok:true };
  }

  // -----------------------------
  // COUNSELOR VALIDATION
  // -----------------------------
  function validateCounselorChange(model, newCounselor) {

    const status = model.status;
    const oldCounselor = (model.counselor || "").toString().trim();

    // A counselor cannot be changed if the tax return is already in an advanced or terminal status
    if (["In Review", "Complete", "e-Filed", "Accepted", "Rejected", "Paper", "No Return", "Deactivated"]
        .includes(status)) {
      return { ok:false, message:`Counselor cannot be changed after the tax return is set to '${status}'.` };
    }

    // When a counselor is assigned to a checked-in taxpayer, set the status to "Assigned"
    if (status === "Checked In" && newCounselor !== "") {
      return { ok:true, newStatus:"Assigned" };
    }

    // When a counselor is deleted while the status is "Assigned, revert back to "Checked In" status
    if (status === "Assigned" && newCounselor === "") {
      return { ok:true, newStatus:"Checked In" };
    }

    // A new counselor can only be reassigned if the status is "Assigned" or "Checked In"
    if (newCounselor !== oldCounselor) {
      return { ok:false, message:"A new counselor may only be reassinged if the tax return status is 'Checked In' or 'Assigned'." };
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

    // Per rules counselor and reviewer may not be the same person
    if (reviewer && reviewer === counselor) {
      return { ok:false, message:"Reviewer may not be the same as the counselor." };
    }

    // A reviewer may not be directly assigned to a tax return from a preliminary phase that can only be assigned to a counselor 
    if (["Checked In", "Assigned"].includes(status)) {
      return { ok:false, message:"Reviewer may not be assigned before the return is'Ready for Review'." };
    }

    // A reviewer may not be changed after the tax return has reached an advanced state
    if (["Complete", "e-Filed", "Accepted", "Rejected", "Paper", "No Return", "Deactivated"]
        .includes(status)) {
      return { ok:false, message:`Reviewer may not be changed after tax return is in '${status}' state.` };
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

    // Auto-transition: Ready for Review → In Review
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
      if (oldStatus === newStatus) {
        return { ok:true, noChange:true };
      }
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

    if (result.noChange) {
      return { applied:false, reverted:false };
    }

    if (!result.ok) {
      e.range.setValue(model.status);
      return { applied:false, reverted:true };
    }

    if (result.newStatus) {
      StateModel.setStatus(row, result.newStatus);
    }

    return { applied:true, reverted:false };
  }

  // Public interface
  return {
    handleCounselorEdit,
    handleReviewerEdit,
    handleStatusEdit,
    applyResult
  };

})();
