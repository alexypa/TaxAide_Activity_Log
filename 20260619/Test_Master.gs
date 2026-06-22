/**
 * ============================================================
 *  Tests_Master.gs
 *  Runs all test suites and prints a consolidated summary.
 * ============================================================
 */

function runAllTests() {
  const results = [];

  Logger.log("========== RUNNING ALL TEST SUITES ==========");

  // ---------------------------------------------------------
  // 1. State Machine Matrix Suite
  // ---------------------------------------------------------
  if (typeof runStateMachineMatrixTests === "function") {
    Logger.log("Running State Machine Matrix Tests...");
    results.push(...runStateMachineMatrixTests());
  } else {
    results.push("SKIP: State Machine Matrix Suite not found");
  }

  // ---------------------------------------------------------
  // 2. Combined Counselor/Reviewer Suite
  // ---------------------------------------------------------
  if (typeof runCombinedInteractionTests === "function") {
    Logger.log("Running Combined Counselor/Reviewer Tests...");
    results.push(...runCombinedInteractionTests());
  } else {
    results.push("SKIP: Combined Interaction Suite not found");
  }

  // ---------------------------------------------------------
  // 3. Workflow Simulation Suite
  // ---------------------------------------------------------
  if (typeof runWorkflowSimulationTests === "function") {
    Logger.log("Running Workflow Simulation Tests...");
    results.push(...runWorkflowSimulationTests());
  } else {
    results.push("SKIP: Workflow Simulation Suite not found");
  }

  // ---------------------------------------------------------
  // 4. Appointment Test Suite
  // ---------------------------------------------------------
  if (typeof runAppointmentTests === "function") {
    Logger.log("Running Appointment Tests...");
    results.push(...runAppointmentTests());
  } else {
    results.push("SKIP: Appointment Test Suite not found");
  }

  // ---------------------------------------------------------
  // Summary
  // ---------------------------------------------------------
  Logger.log("========== TEST SUMMARY ==========");
  results.forEach(r => Logger.log(r));
  Logger.log("==================================");

  return results;
}
