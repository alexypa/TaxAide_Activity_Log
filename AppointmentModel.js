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
    const values = sh.getRange(row, 1, 1, 6).getValues()[0];

    return {
      apptTime: values[0],
      firstName: values[1],
      lastName: values[2],
      phone: values[3],
      checkedIn: values[4] === true,
      checkedInTime: values[5]
    };
  }

  function getAllAppointments() {
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const rows = sh.getLastRow() - 1;
    if (rows < 1) return [];

    const values = sh.getRange(2, 1, rows, 6).getValues();

    return values.map((r, i) => ({
      row: i + 2,
      apptTime: r[0],
      firstName: r[1],
      lastName: r[2],
      phone: r[3],
      CheckedIn: r[4],
      CheckedInTime: r[5]
    }));
  }

  return {
    getAppointmentRow,
    getAllAppointments
  };

})();
