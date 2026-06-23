/**
 * StateController.gs — Updated to use unified ActivityLogModel
 */

const StateController = (() => {

  const ALLOWED_TRANSITIONS = {
    "Checked In":      ["Assigned", "No Return"],
    "Assigned":        ["Ready for Review", "Incomplete", "Checked In"],
    "Ready for Review":["In Review", "Incomplete", "Assigned"],
    "In Review":       ["Complete", "Incomplete", "e-Filed", "Paper","Ready for Review"],
    "Incomplete":      ["Checked In", "Assigned", "Deactivated", "In Review", "Ready for Review"],
    "Complete":        ["e-Filed", "Deactivated", "Paper"],
    "e-Filed":         ["Accepted", "Rejected"],
    "Rejected":        ["Accepted", "Deactivated", "e-Filed"],
    "Accepted":        [],
    "Paper":           [],
    "No Return":       [],
    "Deactivated":     []
  };

  const TERMINAL = ["Accepted", "Paper", "No Return", "Deactivated"];

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

  function validateCounselorChange(model, newCounselor) {
    const status       = (model.status || "").toString().trim();
    const oldCounselor = (model.counselor || "").toString().trim();
    const counselor    = (newCounselor || "").toString().trim();

    // Counselor edits allowed only in Checked In and Assigned
    if (!["Checked In", "Assigned"].includes(status)) {
      return { ok:false, message:`Counselor cannot be changed after '${status}'.` };
    }

    // Checked In → assign counselor → Assigned
    if (status === "Checked In" && counselor !== "") {
      return { ok:true, newStatus:"Assigned" };
    }

    // Checked In → empty counselor → forbidden
    if (status === "Checked In" && counselor === "") {
      return { ok:false, message:"A counselor must be assigned when the return is Checked In." };
    }

    // Assigned → remove counselor → Checked In
    if (status === "Assigned" && counselor === "") {
      return { ok:true, newStatus:"Checked In" };
    }

    // Assigned → same counselor → allowed
    if (status === "Assigned" && counselor === oldCounselor) {
      return { ok:true };
    }

    // Assigned → different counselor → forbidden
    if (status === "Assigned" && counselor !== oldCounselor) {
      return { ok:false, message:"A new counselor may only be reassigned if the return is Checked In or Assigned." };
    }

    return { ok:true };
  }


  function validateReviewerChange(model, newReviewer) {
    const status    = (model.status || "").toString().trim();
    const counselor = (model.counselor || "").toString().trim();
    const reviewer  = (newReviewer || "").toString().trim();

    // Reject ANY reviewer edit before Ready for Review
    if (["", "Checked In", "Assigned"].includes(status)) {
      return { ok:false, message:"Reviewer may not be assigned before the return is 'Ready for Review'." };
    }

    // Reviewer cannot equal counselor
    if (reviewer && reviewer === counselor) {
      return { ok:false, message:"Reviewer may not be the same as the counselor." };
    }

    // Terminal states: reviewer locked
    if (["Complete", "e-Filed", "Accepted", "Rejected", "Paper", "No Return", "Deactivated"]
        .includes(status)) {
      return { ok:false, message:`Reviewer cannot be changed after '${status}'.` };
    }

    // ⭐ Ready for Review → reviewer assigned → In Review
    if (status === "Ready for Review" && reviewer !== "") {
      return { ok:true, newStatus:"In Review" };
    }

    // ⭐ Ready for Review → reviewer removed → forbidden
    if (status === "Ready for Review" && reviewer === "") {
      return { ok:false, message:"Reviewer cannot be removed while return is Ready for Review." };
    }

    // ⭐ Incomplete → reviewer edits allowed (no status change)
    if (status === "Incomplete") {
      return { ok:true };
    }

    // ⭐ In Review → reviewer removed → back to Ready for Review
    if (status === "In Review" && reviewer === "") {
      return { ok:true, newStatus:"Ready for Review" };
    }

    // ⭐ In Review → reviewer changed to ANY non-empty name → allowed
    if (status === "In Review" && reviewer !== "") {
      return { ok:true };
    }

    return { ok:true };
  }

  function handleCounselorEdit(model, e) {
    const newCounselor = (e.range.getValue() || "").toString().trim();
    return validateCounselorChange(model, newCounselor);
  }

  function handleReviewerEdit(model, e) {   
    const newReviewer = (e.range.getValue() || "").toString().trim();
    return validateReviewerChange(model, newReviewer);
  }

  function handleStatusEdit(model, e) {
    const oldStatus = e.oldValue || model.status || "";
    const newStatus = (e.range.getValue() || "").toString().trim();

    if (TERMINAL.includes(oldStatus)) {
      if (oldStatus === newStatus) return { ok:true, noChange:true };
      return { ok:false, message:`No transitions allowed from terminal state '${oldStatus}'.` };
    }

    if (oldStatus === newStatus) return { ok:true, noChange:true };

    return validateStatusTransition(oldStatus, newStatus);
  }

  function applyResult(result, model, row, e) {
    if (result.noChange) return { applied:false, reverted:false };

    if (!result.ok) {
      // Only used for direct status edits if you ever call it
      e.range.setValue(model.status);
      return { applied:false, reverted:true };
    }

    if (result.newStatus) {
      ActivityLogModel.setStatus(row, result.newStatus);
    }

    return { applied:true, reverted:false };
  }

  return {
    handleCounselorEdit,
    handleReviewerEdit,
    handleStatusEdit,
    applyResult
  };

})();
