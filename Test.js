function assertEqual(actual, expected, message) {
  if (actual === expected) {
    Logger.log("PASS: " + message);
  } else {
    Logger.log("FAIL: " + message + " (expected: " + expected + ", got: " + actual + ")");
  }
}

function assertOk(result, message) {
  if (result.ok) Logger.log("PASS: " + message);
  else Logger.log("FAIL: " + message + " (" + result.message + ")");
}

function assertNotOk(result, message) {
  if (!result.ok) Logger.log("PASS: " + message);
  else Logger.log("FAIL: " + message + " (unexpected OK)");
}

/**
 * Create a fake onEdit event object.
 */
function fakeEvent(row, col, oldValue, newValue) {
  return {
    range: {
      getRow: () => row,
      getColumn: () => col,
      getValue: () => newValue,
      setValue: v => Logger.log("setValue(" + v + ")"),
    },
    oldValue: oldValue,
    source: SpreadsheetApp.getActive()
  };
}

function testColumnMapper() {
  const map = ColumnMapper.map("Activity_Log");
  Logger.log(JSON.stringify(map, null, 2));

  assertEqual(typeof map["STATUS"], "number", "ColumnMapper returns numeric column index");
}

function testStateModel() {
  const model = StateModel.loadRow(2); // assumes row 2 has data

  Logger.log(JSON.stringify(model, null, 2));

  assertEqual(typeof model.status, "string", "StateModel loads status");
  assertEqual(typeof model.counselor, "string", "StateModel loads counselor");
}

function testCounselorRules() {
  const row = 2;
  const model = StateModel.loadRow(row);

  // Simulate: Checked In → assign counselor
  model.status = "Checked In";
  const e1 = fakeEvent(row, ColumnMapper.col("Activity_Log", "Counselor"), "", "JOHN");
  const r1 = StateController.handleCounselorEdit(model, e1);
  assertOk(r1, "Checked In → Assigned is allowed");

  // Simulate: Assigned → clear counselor
  model.status = "Assigned";
  const e2 = fakeEvent(row, ColumnMapper.col("Activity_Log", "Counselor"), "JOHN", "");
  const r2 = StateController.handleCounselorEdit(model, e2);
  assertOk(r2, "Assigned → Checked In is allowed");

  // Simulate: In Review → change counselor
  model.status = "In Review";
  const e3 = fakeEvent(row, ColumnMapper.col("Activity_Log", "Counselor"), "JOHN", "MIKE");
  const r3 = StateController.handleCounselorEdit(model, e3);
  assertNotOk(r3, "Cannot change counselor after In Review");
}

function testReviewerRules() {
  const row = 2;
  const model = StateModel.loadRow(row);

  // Reviewer cannot match counselor
  model.status = "Ready for Review";
  model.counselor = "JOHN";
  const e1 = fakeEvent(row, ColumnMapper.col("Activity_Log", "Reviewer"), "", "JOHN");
  const r1 = StateController.handleReviewerEdit(model, e1);
  assertNotOk(r1, "Reviewer cannot equal counselor");

  // Reviewer cannot be assigned too early
  model.status = "Assigned";
  const e2 = fakeEvent(row, ColumnMapper.col("Activity_Log", "Reviewer"), "", "SUE");
  const r2 = StateController.handleReviewerEdit(model, e2);
  assertNotOk(r2, "Reviewer cannot be assigned before Ready for Review");

  // Reviewer cannot be changed too late
  model.status = "Complete";
  const e3 = fakeEvent(row, ColumnMapper.col("Activity_Log", "Reviewer"), "SUE", "MIKE");
  const r3 = StateController.handleReviewerEdit(model, e3);
  assertNotOk(r3, "Reviewer cannot be changed after Complete");
}

function testStatusTransitions() {
  const row = 2;
  const model = StateModel.loadRow(row);

  // Legal: Assigned → Ready for Review
  model.status = "Assigned";
  const e1 = fakeEvent(row, ColumnMapper.col("Activity_Log", "Status"), "Assigned", "Ready for Review");
  const r1 = StateController.handleStatusEdit(model, e1);
  assertOk(r1, "Assigned → Ready for Review is legal");

  // Illegal: Ready for Review → Assigned
  model.status = "Ready for Review";
  const e2 = fakeEvent(row, ColumnMapper.col("Activity_Log", "Status"), "Ready for Review", "Assigned");
  const r2 = StateController.handleStatusEdit(model, e2);
  assertNotOk(r2, "Ready for Review → Assigned is illegal");
}

function testTerminalStates() {
  const row = 2;
  const model = StateModel.loadRow(row);

  model.status = "Accepted";
  const e1 = fakeEvent(row, ColumnMapper.col("Activity_Log", "Status"), "Accepted", "Rejected");
  const r1 = StateController.handleStatusEdit(model, e1);
  assertNotOk(r1, "No transitions allowed from Accepted");
}

function testNewTransitions() {
  const row = 2;
  const model = StateModel.loadRow(row);

  // Incomplete → Deactivated
  model.status = "Incomplete";
  const e1 = fakeEvent(row, ColumnMapper.col("Activity_Log", "Status"), "Incomplete", "Deactivated");
  const r1 = StateController.handleStatusEdit(model, e1);
  assertOk(r1, "Incomplete → Deactivated is legal");

  // In Review → Paper
  model.status = "In Review";
  const e2 = fakeEvent(row, ColumnMapper.col("Activity_Log", "Status"), "In Review", "Paper");
  const r2 = StateController.handleStatusEdit(model, e2);
  assertOk(r2, "In Review → Paper is legal");

  // Rejected → e-Filed
  model.status = "Rejected";
  const e3 = fakeEvent(row, ColumnMapper.col("Activity_Log", "Status"), "Rejected", "e-Filed");
  const r3 = StateController.handleStatusEdit(model, e3);
  assertOk(r3, "Rejected → e-Filed is legal");
}

function runAllTests() {
  Logger.log("=== ColumnMapper ===");
  testColumnMapper();

  Logger.log("=== StateModel ===");
  testStateModel();

  Logger.log("=== Counselor Rules ===");
  testCounselorRules();

  Logger.log("=== Reviewer Rules ===");
  testReviewerRules();

  Logger.log("=== Status Transitions ===");
  testStatusTransitions();

  Logger.log("=== Terminal States ===");
  testTerminalStates();

  Logger.log("=== New Transitions ===");
  testNewTransitions();
}

