/**
 * ============================================================
 *  TAXAIDE ACTIVITY LOG — FULL UNIT TEST SUITE
 * ============================================================
 */

function runAllTests() {
  const results = [];

  results.push(testColumnMapper());
  results.push(testSettingsModel());
  results.push(testStateModelLoadWrite());
  results.push(testStateControllerTransitions());
  results.push(testTerminalStateEnforcement());
  results.push(testCounselorReviewerRules());
  results.push(testCheckInValidation());
  results.push(testIntegrationCheckInFlow());

  Logger.log("========== TEST RESULTS ==========");
  results.forEach(r => Logger.log(r));
  Logger.log("==================================");
}

/**
 * ------------------------------------------------------------
 * TEST 1 — ColumnMapper
 * ------------------------------------------------------------
 */
function testColumnMapper() {
  try {
    const col = ColumnMapper.col("Activity_Log", "Status");
    if (typeof col !== "number" || col <= 0) throw "Column not found";
    return "PASS: ColumnMapper";
  } catch (e) {
    return "FAIL: ColumnMapper — " + e;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 2 — SettingsModel
 * ------------------------------------------------------------
 */
function testSettingsModel() {
  try {
    const years = SettingsModel.getAllowedYears();
    const def = SettingsModel.getDefaultYear();

    if (!Array.isArray(years)) throw "AllowedYears not array";
    if (years.length === 0) throw "AllowedYears empty";
    if (!years.includes(def)) throw "DefaultYear not in AllowedYears";

    return "PASS: SettingsModel";
  } catch (e) {
    return "FAIL: SettingsModel — " + e;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 3 — StateModel load/write
 * ------------------------------------------------------------
 */
function testStateModelLoadWrite() {
  try {
    const row = 5;

    StateModel.writeField(row, "Status", "Assigned");
    const model = StateModel.loadRow(row);

    if (model.status !== "Assigned") throw "Write or load failed";

    return "PASS: StateModel load/write";
  } catch (e) {
    return "FAIL: StateModel load/write — " + e;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 4 — StateController transitions
 * ------------------------------------------------------------
 */
function testStateControllerTransitions() {
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName("Activity_Log");
    const row = 6;
    const statusCol = ColumnMapper.col("Activity_Log", "Status");

    const transitions = [
      ["Checked In", "Assigned"],
      ["Assigned", "Ready for Review"],
      ["Ready for Review", "In Review"],
      ["In Review", "Complete"],
      ["Complete", "e-Filed"],
      ["e-Filed", "Accepted"]
    ];

    transitions.forEach(([from, to]) => {
      sheet.getRange(row, 1, 1, sheet.getLastColumn()).clearContent();

      StateModel.setStatus(row, from);
      const model = StateModel.loadRow(row);

      sheet.getRange(row, statusCol).setValue(to);

      const fakeEvent = {
        range: {
          getValue: () => to,
          setValue: v => sheet.getRange(row, statusCol).setValue(v)
        }
      };

      const result = StateController.handleStatusEdit(model, fakeEvent);
      if (!result.ok) throw `Transition ${from} → ${to} failed: ${result.message}`;

      StateController.applyResult(result, model, row, fakeEvent);

      const updated = StateModel.loadRow(row).status;
      if (updated !== to) throw `Transition ${from} → ${to} did not apply (got '${updated}')`;
    });

    return "PASS: StateController transitions";
  } catch (e) {
    return "FAIL: StateController transitions — " + e;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 5 — Terminal state enforcement
 * ------------------------------------------------------------
 */
function testTerminalStateEnforcement() {
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName("Activity_Log");
    const row = 7;
    const statusCol = ColumnMapper.col("Activity_Log", "Status");
    const terminals = ["Accepted", "Paper", "No Return", "Deactivated"];

    terminals.forEach(state => {
      sheet.getRange(row, 1, 1, sheet.getLastColumn()).clearContent();
      StateModel.setStatus(row, state);
      const model = StateModel.loadRow(row);

      sheet.getRange(row, statusCol).setValue("Assigned");

      const fakeEvent = {
        range: {
          getValue: () => "Assigned",
          setValue: v => sheet.getRange(row, statusCol).setValue(v)
        }
      };

      const result = StateController.handleStatusEdit(model, fakeEvent);
      if (result.ok) throw `Terminal state ${state} incorrectly allowed transition`;
    });

    return "PASS: Terminal state enforcement";
  } catch (e) {
    return "FAIL: Terminal state enforcement — " + e;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 6 — Counselor/Reviewer rules
 * ------------------------------------------------------------
 */
function testCounselorReviewerRules() {
  try {
    const row = 8;

    StateModel.setStatus(row, "In Review");
    const model1 = StateModel.loadRow(row);

    const fakeEvent1 = {
      range: {
        getValue: () => "Alice",
        setValue: v => StateModel.setCounselor(row, v)
      }
    };

    const result1 = StateController.handleCounselorEdit(model1, fakeEvent1);
    if (result1.ok) throw "Counselor incorrectly allowed after In Review";

    StateModel.setStatus(row, "Ready for Review");
    StateModel.setCounselor(row, "Bob");
    const model2 = StateModel.loadRow(row);

    const fakeEvent2 = {
      range: {
        getValue: () => "Bob",
        setValue: v => StateModel.setReviewer(row, v)
      }
    };

    const result2 = StateController.handleReviewerEdit(model2, fakeEvent2);
    if (result2.ok) throw "Reviewer incorrectly allowed to match counselor";

    return "PASS: Counselor/Reviewer rules";
  } catch (e) {
    return "FAIL: Counselor/Reviewer rules — " + e;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 7 — checkIn validation
 * ------------------------------------------------------------
 */
function testCheckInValidation() {
  try {
    const good = checkIn({
      ticketNumber: "ABC",
      ssnLast4: "1234",
      firstName: "John",
      lastName: "Doe",
      taxYear: SettingsModel.getDefaultYear(),
      comments: ""
    });

    if (!good.ok) throw "Valid check-in rejected";

    return "PASS: checkIn validation";
  } catch (e) {
    return "FAIL: checkIn validation — " + e;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 8 — Integration test: full check-in flow
 * ------------------------------------------------------------
 */
function testIntegrationCheckInFlow() {
  try {
    const year = SettingsModel.getDefaultYear();

    const result = checkIn({
      ticketNumber: "33",
      ssnLast4: "9876",
      firstName: "Jane",
      lastName: "Smith",
      taxYear: year,
      comments: "Integration test"
    });

    if (!result.ok) throw "Check-in failed";

    const sheet = SpreadsheetApp.getActive().getSheetByName("Activity_Log");
    const lastRow = sheet.getLastRow();

    const model = StateModel.loadRow(lastRow);
    if (model.status !== "Checked In") throw "Check-in did not set status";

    return "PASS: Integration check-in flow";
  } catch (e) {
    return "FAIL: Integration check-in flow — " + e;
  }
}
