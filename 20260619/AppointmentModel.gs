/**
 * ============================================================
 *  AppointmentModel.gs
 *  Data access for the Appointments sheet.
 * ============================================================
 */

const AppointmentModel = (() => {

  const SHEET = "Appointments";

  function getAppointmentRow(row) {
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const values = sh.getRange(row, 1, 1, 7).getValues()[0];

    return {
      checkedIn: values[0] === true,
      apptTime: values[1],
      firstName: values[2],
      lastName: values[3],
      phone: values[4],
      checkInTime: values[5],
      processed: values[6] === true
    };
  }

  function getAllAppointments() {
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const rows = sh.getLastRow() - 1;
    if (rows < 1) return [];

    const values = sh.getRange(2, 1, rows, 7).getValues();

    return values.map((r, i) => ({
      row: i + 2,
      checkedIn: r[0] === true,
      apptTime: r[1],
      firstName: r[2],
      lastName: r[3],
      phone: r[4],
      checkInTime: r[5],
      processed: r[6] === true
    }));
  }

  return {
    getAppointmentRow,
    getAllAppointments
  };

})();

