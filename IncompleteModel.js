/**
 * ============================================================
 *  IncompleteModel.gs
 *  Data access for the Appointments sheet.
 * ============================================================
 */

const IncompleteModel = (() => {

  const SHEET = "Incomplete";

  function getIncompleteRow(row) {
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const values = sh.getRange(row, 1, 1, 7).getValues()[0];

    return {
      checkedIn: values[0] === true,
      apptTime: values[1],
      firstName: values[2],
      lastName: values[3],
      phone: values[4],
      processed: values[5] === true
    };
  }

  function getAllIncomepleteRows() {
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
      processed: r[5] === true
    }));
  }

  return {
    getIncompleteRow,
    getAllIncomepleteRows
  };

})();
