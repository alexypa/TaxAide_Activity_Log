/**
 * ============================================================
 *  COMBINED STATE + COUNSELOR + REVIEWER TEST SUITE
 *  Pure logic — no UI, no sheet, no SpreadsheetApp.
 * ============================================================
 */

function runCombinedControllerTests() {
  const results = [];

  results.push(testCounselorStateInteractions());
  results.push(testReviewerStateInteractions());
  results.push(testReviewerCounselorConflict());
  results.push(testAutoTransitionReviewer());
  results.push(testCounselorClearingTransitions());
  results.push(testReviewerBlockedInEarlyStates());
  results.push(testReviewerBlockedInTerminalStates());

  Logger.log("========== COMBINED CONTROLLER TEST RESULTS ==========");
  results.forEach(r => Logger.log(r));
  Logger.log("=======================================================");
}

/**
 * Utility: fake model
 */
function fakeModel(status, counselor = "", reviewer = "") {
  return { status, counselor, reviewer };
}

/**
 * Utility: fake event
 */
function fakeEvent(newValue) {
  return {
    range: {
      getValue: () => newValue,
      setValue: v => {} // ignored
    }
  };
}

/**
 * ------------------------------------------------------------
 * TEST 1 — Counselor edits must trigger correct status transitions
 * ------------------------------------------------------------
 */
function testCounselorStateInteractions() {
  try {
    // Checked In → Assigned when counselor added
    let model = fakeModel("Checked In", "");
    let e = fakeEvent("Alice");
    let result = StateController.handleCounselorEdit(model, e);
    if (!result.ok || result.newStatus !== "Assigned") {
      throw "Counselor add did not transition Checked In → Assigned";
    }

    // Assigned → Checked In when counselor cleared
    model = fakeModel("Assigned", "Bob");
    e = fakeEvent("");
    result = StateController.handleCounselorEdit(model, e);
    if (!result.ok || result.newStatus !== "Checked In") {
      throw "Counselor clear did not transition Assigned → Checked In";
    }

    return "PASS: Counselor-state interactions";
  } catch (err) {
    return "FAIL: Counselor-state interactions — " + err;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 2 — Reviewer edits must trigger correct status transitions
 * ------------------------------------------------------------
 */
function testReviewerStateInteractions() {
  try {
    // Ready for Review → In Review when reviewer assigned
    const model = fakeModel("Ready for Review", "Bob");
    const e = fakeEvent("Alice");

    const result = StateController.handleReviewerEdit(model, e);
    if (!result.ok || result.newStatus !== "In Review") {
      throw "Reviewer add did not auto-transition Ready for Review → In Review";
    }

    return "PASS: Reviewer-state interactions";
  } catch (err) {
    return "FAIL: Reviewer-state interactions — " + err;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 3 — Reviewer cannot equal counselor
 * ------------------------------------------------------------
 */
function testReviewerCounselorConflict() {
  try {
    const model = fakeModel("Ready for Review", "Bob");
    const e = fakeEvent("Bob");

    const result = StateController.handleReviewerEdit(model, e);
    if (result.ok) {
      throw "Reviewer incorrectly allowed to match counselor";
    }

    return "PASS: Reviewer-counselor conflict";
  } catch (err) {
    return "FAIL: Reviewer-counselor conflict — " + err;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 4 — Auto-transition: Ready for Review → In Review
 * ------------------------------------------------------------
 */
function testAutoTransitionReviewer() {
  try {
    const model = fakeModel("Ready for Review", "Bob");
    const e = fakeEvent("Alice");

    const result = StateController.handleReviewerEdit(model, e);
    if (!result.ok || result.newStatus !== "In Review") {
      throw "Auto-transition to In Review failed";
    }

    return "PASS: Auto-transition reviewer";
  } catch (err) {
    return "FAIL: Auto-transition reviewer — " + err;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 5 — Counselor clearing transitions Assigned → Checked In
 * ------------------------------------------------------------
 */
function testCounselorClearingTransitions() {
  try {
    const model = fakeModel("Assigned", "Bob");
    const e = fakeEvent("");

    const result = StateController.handleCounselorEdit(model, e);
    if (!result.ok || result.newStatus !== "Checked In") {
      throw "Counselor clearing did not revert Assigned → Checked In";
    }

    return "PASS: Counselor clearing transitions";
  } catch (err) {
    return "FAIL: Counselor clearing transitions — " + err;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 6 — Reviewer cannot be assigned before Ready for Review
 * ------------------------------------------------------------
 */
function testReviewerBlockedInEarlyStates() {
  try {
    const earlyStates = ["Checked In", "Assigned"];

    for (const s of earlyStates) {
      const model = fakeModel(s, "Bob");
      const e = fakeEvent("Alice");

      const result = StateController.handleReviewerEdit(model, e);
      if (result.ok) {
        throw `Reviewer incorrectly allowed in early state '${s}'`;
      }
    }

    return "PASS: Reviewer blocked in early states";
  } catch (err) {
    return "FAIL: Reviewer blocked in early states — " + err;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 7 — Reviewer cannot be changed in terminal states
 * ------------------------------------------------------------
 */
function testReviewerBlockedInTerminalStates() {
  try {
    const terminal = ["Complete", "e-Filed", "Accepted", "Rejected", "Paper", "No Return", "Deactivated"];

    for (const s of terminal) {
      const model = fakeModel(s, "Bob", "Alice");
      const e = fakeEvent("Charlie");

      const result = StateController.handleReviewerEdit(model, e);
      if (result.ok) {
        throw `Reviewer incorrectly allowed in terminal state '${s}'`;
      }
    }

    return "PASS: Reviewer blocked in terminal states";
  } catch (err) {
    return "FAIL: Reviewer blocked in terminal states — " + err;
  }
}
