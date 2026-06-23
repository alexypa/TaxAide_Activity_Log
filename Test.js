/**
 * Tests all allowed and prohibited status transitions in StateController.
 */
function test_StateController_StatusTransitions() {
  
  const statuses = [
    "Checked In", "Assigned", "Ready for Review", "In Review",
    "Incomplete", "Complete", "e-Filed", "Rejected",
    "Accepted", "Paper", "No Return", "Deactivated"
  ];

  const ALLOWED = {
    "Checked In":      ["Assigned", "No Return"],
    "Assigned":        ["Ready for Review", "Incomplete", "Checked In"],
    "Ready for Review":["In Review", "Incomplete", "Assigned"],
    "In Review":       ["Complete", "Incomplete", "e-Filed", "Paper", "Ready for Review"],
    "Incomplete":      ["Checked In", "Assigned", "Deactivated", "In Review", "Ready for Review"],
    "Complete":        ["e-Filed", "Deactivated", "Paper"],
    "e-Filed":         ["Accepted", "Rejected"],
    "Rejected":        ["Accepted", "Deactivated", "e-Filed"],
    "Accepted":        [],
    "Paper":           [],
    "No Return":       [],
    "Deactivated":     []
  };

  let failures = [];

  for (let oldStatus of statuses) {
    for (let newStatus of statuses) {

      if (oldStatus === newStatus) continue; // ignore no-op

      const model = {
        status: oldStatus,
        counselor: "Alice",
        reviewer: "Bob"
      };

      const e = {
        range: { getValue: () => newStatus },
        oldValue: oldStatus
      };

      const result = StateController.handleStatusEdit(model, e);

      const isAllowed = ALLOWED[oldStatus].includes(newStatus);

      // -----------------------------
      // Allowed transitions
      // -----------------------------
      if (isAllowed) {
        if (!result.ok) {
          failures.push(`❌ Allowed transition blocked: ${oldStatus} → ${newStatus}`);
        }
        continue;
      }

      // -----------------------------
      // Forbidden transitions
      // -----------------------------
      if (!isAllowed) {
        if (result.ok) {
          failures.push(`❌ Forbidden transition allowed: ${oldStatus} → ${newStatus}`);
        }
      }
    }
  }

  if (failures.length === 0) {
    Logger.log("✅ All status transition tests passed.");
  } else {
    Logger.log("❌ FAILURES:");
    failures.forEach(f => Logger.log(f));
  }
}


/**
 * Tests all counselor transition rules in StateController.
 */
function test_StateController_CounselorTransitions() {

  const TERMINAL = ["Complete", "e-Filed", "Accepted", "Rejected", "Paper", "No Return", "Deactivated"];

  const ALL_STATUSES = [
    "Checked In",
    "Assigned",
    "Ready for Review",
    "In Review",
    "Incomplete",
    "Complete",
    "e-Filed",
    "Accepted",
    "Rejected",
    "Paper",
    "No Return",
    "Deactivated"
  ];

  const TEST_COUNSELORS = ["Alice", "Bob", ""];  // non-empty, different, empty

  let failures = [];

  function fakeEvent(newCounselor) {
    return {
      oldValue: null,
      range: {
        getValue: () => newCounselor
      }
    };
  }

  ALL_STATUSES.forEach(oldStatus => {
    TEST_COUNSELORS.forEach(newCounselor => {

      const model = {
        status: oldStatus,
        counselor: "Alice"   // default old counselor
      };

      const e = fakeEvent(newCounselor);

      const result = StateController.handleCounselorEdit(model, e);

      // -----------------------------
      // Terminal states: ALL changes forbidden
      // -----------------------------
      if (TERMINAL.includes(oldStatus)) {
        if (result.ok) {
          failures.push(`❌ Terminal state '${oldStatus}' incorrectly allowed counselor change to '${newCounselor}'`);
        }
        return;
      }

      // -----------------------------
      // Checked In rules
      // -----------------------------
      if (oldStatus === "Checked In") {

        if (newCounselor === "") {
          if (result.ok) failures.push(`❌ Checked In → empty counselor should be forbidden`);
          return;
        }

        if (newCounselor !== "") {
          if (!result.ok || result.newStatus !== "Assigned") {
            failures.push(`❌ Checked In → '${newCounselor}' should auto-transition to Assigned`);
          }
          return;
        }
      }

      // -----------------------------
      // Assigned rules
      // -----------------------------
      if (oldStatus === "Assigned") {

        if (newCounselor === "") {
          if (!result.ok || result.newStatus !== "Checked In") {
            failures.push(`❌ Assigned → empty counselor should auto-transition to Checked In`);
          }
          return;
        }

        if (newCounselor === "Alice") {
          if (!result.ok) failures.push(`❌ Assigned → same counselor should be allowed`);
          return;
        }

        if (newCounselor !== "Alice") {
          if (result.ok) failures.push(`❌ Assigned → different counselor should be forbidden`);
          return;
        }
      }

      // -----------------------------
      // All other non-terminal states
      // Counselor changes forbidden
      // -----------------------------
      if (!["Checked In", "Assigned"].includes(oldStatus)) {
        if (result.ok) {
          failures.push(`❌ Counselor change incorrectly allowed in status '${oldStatus}'`);
        }
        return;
      }

      if (!result.ok) {
        return; // correct
      } else {
        failures.push(`❌ Counselor change incorrectly allowed in status '${oldStatus}'`);
      }

    });
  });

  if (failures.length === 0) {
    Logger.log("✅ All counselor transition tests passed.");
  } else {
    Logger.log("❌ FAILURES:");
    failures.forEach(f => Logger.log(f));
  }
}

/**
 * Tests all reviewer transition rules in StateController.
 */
function test_StateController_ReviewerTransitions() {

  const TERMINAL = ["Complete", "e-Filed", "Accepted", "Rejected", "Paper", "No Return", "Deactivated"];

  const ALL_STATUSES = [
    "",
    "Checked In",
    "Assigned",
    "Ready for Review",
    "In Review",
    "Incomplete",
    "Complete",
    "e-Filed",
    "Accepted",
    "Rejected",
    "Paper",
    "No Return",
    "Deactivated"
  ];

  const TEST_REVIEWERS = ["Alice", "Bob", ""];  // non-empty, different, empty

  let failures = [];

  function fakeEvent(newReviewer) {
    return {
      oldValue: null,
      range: {
        getValue: () => newReviewer
      }
    };
  }

  ALL_STATUSES.forEach(oldStatus => {
    TEST_REVIEWERS.forEach(newReviewer => {

      const model = {
        status: oldStatus,
        counselor: "Alice",   // default counselor
        reviewer: "Bob"       // default old reviewer
      };

      const e = fakeEvent(newReviewer);

      const result = StateController.handleReviewerEdit(model, e);

      // -----------------------------
      // Terminal states: ALL changes forbidden
      // -----------------------------
      if (TERMINAL.includes(oldStatus)) {
        if (result.ok) {
          failures.push(`❌ Terminal state '${oldStatus}' incorrectly allowed reviewer change to '${newReviewer}'`);
        }
        return;
      }

      // -----------------------------
      // Before Ready for Review: ALL reviewer edits forbidden
      // -----------------------------
      if (["", "Checked In", "Assigned"].includes(oldStatus)) {
        if (result.ok) {
          failures.push(`❌ Reviewer change incorrectly allowed in '${oldStatus}' → '${newReviewer}'`);
        }
        return;
      }

      // -----------------------------
      // Counselor == Reviewer forbidden
      // -----------------------------
      if (newReviewer === model.counselor && newReviewer !== "") {
        if (result.ok) {
          failures.push(`❌ Reviewer '${newReviewer}' equals counselor '${model.counselor}' but was allowed`);
        }
        return;
      }

      // -----------------------------
      // Ready for Review rules
      // -----------------------------
      if (oldStatus === "Ready for Review") {

        // Reviewer removed → forbidden
        if (newReviewer === "") {
          if (result.ok) failures.push(`❌ Ready for Review → empty reviewer should be forbidden`);
          return;
        }

        // Reviewer equals counselor → forbidden
        if (newReviewer === model.counselor) {
          if (result.ok) failures.push(`❌ Ready for Review → reviewer '${newReviewer}' equals counselor '${model.counselor}' but was allowed`);
          return;
        }

        // Reviewer assigned → MUST transition to In Review
        if (!result.ok || result.newStatus !== "In Review") {
          failures.push(`❌ Ready for Review → '${newReviewer}' should auto-transition to In Review`);
        }
        return;
      }


      // -----------------------------
      // In Review rules
      // -----------------------------
      if (oldStatus === "In Review") {

        // Removing reviewer → Ready for Review
        if (newReviewer === "") {
          if (!result.ok || result.newStatus !== "Ready for Review") {
            failures.push(`❌ In Review → empty reviewer should transition to Ready for Review`);
          }
          return;
        }

        // Reviewer equals counselor → forbidden
        if (newReviewer === model.counselor) {
          if (result.ok) failures.push(`❌ In Review → reviewer '${newReviewer}' equals counselor '${model.counselor}' but was allowed`);
          return;
        }

        // Changing reviewer to ANY non-empty name → allowed
        if (!result.ok) {
          failures.push(`❌ In Review → reviewer change to '${newReviewer}' should be allowed`);
        }
        return;
      }


      // Incomplete: reviewer changes allowed
      if (oldStatus === "Incomplete") {
        if (!result.ok) failures.push(`❌ Reviewer change should be allowed in 'Incomplete'`);
        return;
      }


      // -----------------------------
      // Any other unexpected case
      // -----------------------------
      failures.push(`❌ Unexpected allowed reviewer change: '${oldStatus}' → '${newReviewer}'`);

    });
  });

  if (failures.length === 0) {
    Logger.log("✅ All reviewer transition tests passed.");
  } else {
    Logger.log("❌ FAILURES:");
    failures.forEach(f => Logger.log(f));
  }
}



