/**
 * ============================================================
 *  AppointmentView.gs
 *  Applies controller results to the spreadsheet.
 * ============================================================
 */

const AppointmentView = (() => {

  function applyAppointmentResult(result) {
    if (!result || result.ignore) return;

    const ss = SpreadsheetApp.getActive();

    if (result.action === "CREATE_ACTIVITY_LOG_ENTRY") {
      const log = ss.getSheetByName("Activity_Log");
      const appt = ss.getSheetByName("Appointments");

      // Append to Activity Log
      log.appendRow([
        result.entry.checkInTime,
        "", "", // Ticket, SSN
        result.entry.firstName,
        result.entry.lastName,
        "", "", "", // Tax Year, Counselor, Reviewer
        "Checked In",
        result.entry.comments
      ]);

      // Write timestamp + mark processed
      appt.getRange(result.row, 6).setValue(result.entry.checkInTime);
      appt.getRange(result.row, 7).setValue(true);
    }

    if (result.action === "MOVE_NO_SHOWS") {
      const ss = SpreadsheetApp.getActive();
      const appt = ss.getSheetByName("Appointments");
      const noShow = ss.getSheetByName("No Show");

      result.rows.forEach(r => {
        noShow.appendRow([
          r.apptTime,
          r.firstName,
          r.lastName,
          r.phone,
          new Date()
        ]);
        appt.deleteRow(r.row);
      });
    }

    if (result.action === "CLEAR_APPOINTMENTS") {
      const sh = ss.getSheetByName("Appointments");
      if (sh.getLastRow() > 1) {
        sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
      }
    }
  }

  return {
    applyAppointmentResult
  };

})();

