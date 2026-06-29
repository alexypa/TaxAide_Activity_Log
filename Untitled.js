/**
 * SAFE Test Harness for StateController
 * -------------------------------------
 * - No global overrides
 * - No pollution of production ColumnMapper or ActivityLogModel
 * - All mocks are local to the test harness
 * - StateController is invoked exactly as production code does
 */


/**************************************
 * Mock ColumnMapper (sandboxed)
 **************************************/
function MockColumnMapper() {
  return {
    col: (sheet, name) => {
      const map = {
        "Check In Time": 1,
        "Ticket #": 2,
        "SSN Last 4": 3,
        "First Name": 4,
        "Last Name": 5,
        "Tax Year": 6,
        "Counselor": 7,
        "Reviewer": 8,
        "Status": 9,
        "Comments": 10
      };
      return map[name];
    }
  };
}


/**************************************
 * Mock ActivityLogModel (sandboxed)
 **************************************/
function MockActivityLogModel() {
  const rows = {};

  return {
    setRow: (row, data) => rows[row] = data,
    getRow: (row) => rows[row]
  };
}


/**************************************
 * Mock event generator
 **************************************/
function makeEvent(row, newValue, oldValue) {
  return {
    range: {
      getRow: () => row,
      getValue: () => newValue
    },
    value: newValue,
    oldValue: oldValue
  };
}


/**************************************
 * Assert Utility
 **************************************/
function assert(condition, message) {
  if (!condition) {
    throw new Error("ASSERTION FAILED: " + message);
  }
}


/**************************************
 * Test: Status Transitions (SAFE)
 **************************************/
function testStatusTransitionsSafe() {

  const mockMapper = MockColumnMapper();
  const mockModel = MockActivityLogModel();

  const row = 1;

  // Seed row
  mockModel.setRow(row, {
    row,
    status: "Checked In",
    counselor: "",
    reviewer: "",
    firstName: "",
    lastName: "",
    checkInTime: ""
  });

  // Build event
  const e = makeEvent(row, "Assigned", "Checked In");

  // Call real controller
  const result = StateController.handleStatusEdit(mockModel.getRow(row), e);

  assert(result.ok === true, "Checked In → Assigned should be allowed");
}


/**************************************
 * SAFE Test Runner
 **************************************/
function runStateControllerTestsSafe() {

  Logger.log("Running SAFE StateController tests...");

  testStatusTransitionsSafe();
  // Add more SAFE tests here

  Logger.log("✓ SAFE tests passed");
}
