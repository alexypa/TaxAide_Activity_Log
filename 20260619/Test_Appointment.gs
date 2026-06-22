/**
 * ============================================================
 *  Tests_Appointment.gs
 *  Full test suite for AppointmentController + AppointmentModel
 *  Pure logic — uses mock model + mock view.
 * ============================================================
 */

function runAppointmentTests() {
  const results = [];

  results.push(testCheckInCreatesActivityLogEntry());
  results.push(testCheckInSetsProcessedFlag());
  results.push(testCheckInSetsTimestamp());
  results.push(testDoubleProcessingIsPrevented());
  results.push(testUncheckingIsIgnored());
  results.push(testNonColumnAEditsAreIgnored());
  results.push(testProcessNoShows());
  results.push(testClearAppointments());

  Logger.log("========== APPOINTMENT TEST RESULTS ==========");
  results.forEach(r => Logger.log(r));
  Logger.log("==============================================");
}

/**
 * ------------------------------------------------------------
 * Mock Appointment Model
 * ------------------------------------------------------------
 */
function makeMockAppointmentModel(rows) {
  return {
    rows, // array of row objects

    getAppointmentRow(row) {
      return this.rows[row - 2]; // row 2 → index 0
    },

    getAllAppointments() {
      return this.rows.map((r, i) => ({
        row: i + 2,
        checkedIn: r.checkedIn,
        apptTime: r.apptTime,
        firstName: r.firstName,
        lastName: r.lastName,
        phone: r.phone,
        checkInTime: r.checkInTime,
        processed: r.processed
      }));
    }
  };
}

/**
 * ------------------------------------------------------------
 * Mock View — captures actions instead of writing to sheets
 * ------------------------------------------------------------
 */
function makeMockAppointmentView() {
  return {
    log: [],

    apply(result) {
      if (!result || result.ignore) return;

      this.log.push(result);
    }
  };
}

/**
 * ------------------------------------------------------------
 * Utility: fake event
 * ------------------------------------------------------------
 */
function fakeEvent(sheetName, row, col, value) {
  return {
    range: {
      getSheet: () => ({ getName: () => sheetName }),
      getRow: () => row,
      getColumn: () => col,
      getValue: () => value
    }
  };
}

/**
 * ------------------------------------------------------------
 * TEST 1 — Check-in creates Activity_Log entry
 * ------------------------------------------------------------
 */
function testCheckInCreatesActivityLogEntry() {
  try {
    const model = makeMockAppointmentModel([
      {
        checkedIn: false,
        apptTime: "10:00 AM",
        firstName: "John",
        lastName: "Doe",
        phone: "555-1111",
        checkInTime: "",
        processed: false
      }
    ]);

    const view = makeMockAppointmentView();

    const e = fakeEvent("Appointments", 2, 1, true);

    const result = AppointmentController.handleAppointmentEdit(model, e);
    view.apply(result);

    if (view.log.length !== 1) throw "No Activity_Log entry created";
    if (view.log[0].action !== "CREATE_ACTIVITY_LOG_ENTRY") throw "Wrong action";

    return "PASS: Check-in creates Activity_Log entry";
  } catch (err) {
    return "FAIL: Check-in creates Activity_Log entry — " + err;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 2 — Check-in sets Processed flag
 * ------------------------------------------------------------
 */
function testCheckInSetsProcessedFlag() {
  try {
    const model = makeMockAppointmentModel([
      {
        checkedIn: false,
        apptTime: "11:00 AM",
        firstName: "Alice",
        lastName: "Smith",
        phone: "555-2222",
        checkInTime: "",
        processed: false
      }
    ]);

    const view = makeMockAppointmentView();
    const e = fakeEvent("Appointments", 2, 1, true);

    const result = AppointmentController.handleAppointmentEdit(model, e);
    view.apply(result);

    if (!result.entry) throw "Missing entry";
    if (result.row !== 2) throw "Wrong row";

    return "PASS: Check-in sets Processed flag";
  } catch (err) {
    return "FAIL: Check-in sets Processed flag — " + err;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 3 — Check-in sets timestamp
 * ------------------------------------------------------------
 */
function testCheckInSetsTimestamp() {
  try {
    const model = makeMockAppointmentModel([
      {
        checkedIn: false,
        apptTime: "1:00 PM",
        firstName: "Bob",
        lastName: "Jones",
        phone: "555-3333",
        checkInTime: "",
        processed: false
      }
    ]);

    const view = makeMockAppointmentView();
    const e = fakeEvent("Appointments", 2, 1, true);

    const result = AppointmentController.handleAppointmentEdit(model, e);
    view.apply(result);

    if (!result.entry.checkInTime) throw "Timestamp missing";

    return "PASS: Check-in sets timestamp";
  } catch (err) {
    return "FAIL: Check-in sets timestamp — " + err;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 4 — Double-processing is prevented
 * ------------------------------------------------------------
 */
function testDoubleProcessingIsPrevented() {
  try {
    const model = makeMockAppointmentModel([
      {
        checkedIn: true,
        apptTime: "2:00 PM",
        firstName: "Carol",
        lastName: "Lee",
        phone: "555-4444",
        checkInTime: new Date(),
        processed: true
      }
    ]);

    const e = fakeEvent("Appointments", 2, 1, true);

    const result = AppointmentController.handleAppointmentEdit(model, e);

    if (result.ok !== false) throw "Double-processing allowed";

    return "PASS: Double-processing prevented";
  } catch (err) {
    return "FAIL: Double-processing prevented — " + err;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 5 — Unchecking is ignored
 * ------------------------------------------------------------
 */
function testUncheckingIsIgnored() {
  try {
    const model = makeMockAppointmentModel([
      {
        checkedIn: true,
        apptTime: "3:00 PM",
        firstName: "Dan",
        lastName: "Miller",
        phone: "555-5555",
        checkInTime: new Date(),
        processed: true
      }
    ]);

    const e = fakeEvent("Appointments", 2, 1, false);

    const result = AppointmentController.handleAppointmentEdit(model, e);

    if (result.ignore !== true) throw "Unchecking was not ignored";

    return "PASS: Unchecking is ignored";
  } catch (err) {
    return "FAIL: Unchecking is ignored — " + err;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 6 — Non-column-A edits are ignored
 * ------------------------------------------------------------
 */
function testNonColumnAEditsAreIgnored() {
  try {
    const model = makeMockAppointmentModel([
      {
        checkedIn: false,
        apptTime: "4:00 PM",
        firstName: "Eve",
        lastName: "Brown",
        phone: "555-6666",
        checkInTime: "",
        processed: false
      }
    ]);

    const e = fakeEvent("Appointments", 2, 3, "Eve");

    const result = AppointmentController.handleAppointmentEdit(model, e);

    if (result.ignore !== true) throw "Non-column-A edit was not ignored";

    return "PASS: Non-column-A edits ignored";
  } catch (err) {
    return "FAIL: Non-column-A edits ignored — " + err;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 7 — No-shows are processed correctly
 * ------------------------------------------------------------
 */
function testProcessNoShows() {
  try {
    const model = makeMockAppointmentModel([
      {
        checkedIn: false,
        apptTime: "9:00 AM",
        firstName: "Frank",
        lastName: "White",
        phone: "555-7777",
        checkInTime: "",
        processed: false
      },
      {
        checkedIn: true,
        apptTime: "10:00 AM",
        firstName: "Grace",
        lastName: "Black",
        phone: "555-8888",
        checkInTime: new Date(),
        processed: true
      }
    ]);

    const result = AppointmentController.processNoShows(model);

    if (result.rows.length !== 1) throw "Wrong number of no-shows";
    if (result.rows[0].firstName !== "Frank") throw "Wrong no-show row";

    return "PASS: No-shows processed correctly";
  } catch (err) {
    return "FAIL: No-shows processed correctly — " + err;
  }
}

/**
 * ------------------------------------------------------------
 * TEST 8 — Clear Appointments returns correct action
 * ------------------------------------------------------------
 */
function testClearAppointments() {
  try {
    const result = AppointmentController.clearAppointments();

    if (result.action !== "CLEAR_APPOINTMENTS") throw "Wrong action";

    return "PASS: Clear Appointments action correct";
  } catch (err) {
    return "FAIL: Clear Appointments action correct — " + err;
  }
}

