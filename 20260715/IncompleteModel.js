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
    const values = sh.getRange(row, 1, 1, 11).getValues()[0];

    return {
      transferToActivityLog: values[0] === true,
      checkInTime: values[1],
      ssnLast4: values[2],
      firstName: values[3],
      lastName: values[4],
      taxYear: values[5],
      counselor: values[6],
      reviewer: values[7],
      status: values[8],
      comments: values[9],
      lastChange: values[10]
    };
  }

  function getAllIncompleteRows() {
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const rows = sh.getLastRow() - 1;
    if (rows < 1) return [];

    const values = sh.getRange(2, 1, rows, 11).getValues();

    return values.map((r, i) => ({
      row: i + 2,
      transferToActivityLog: r[0] === true,
      checkInTime: r[1],
      ssnLast4: r[2],
      firstName: r[3],
      lastName: r[4],
      taxYear: r[5],
      counselor: r[6],
      reviewer: r[7],
      status: r[8],
      comments: r[9],
      lastChange: r[10]
    }));
  }

  return {
    getIncompleteRow,
    getAllIncompleteRows
  };

})();
