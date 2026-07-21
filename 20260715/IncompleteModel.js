/**
 * ============================================================
 *  IncompleteModel.gs
 *  Data access for the Incomplete sheet.
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
      ssnLast4: values[2] ? values[2].toString().trim() : "",
      firstName: values[3] ? values[3].toString().toUpperCase().trim() : "",
      lastName: values[4] ? values[4].toString().toUpperCase().trim() : "",
      taxYear: values[5] || "",
      counselor: values[6] || "",
      reviewer: values[7] || "",
      status: values[8] ? values[8].toString().trim() : "Checked In",
      comments: values[9] || "",
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
      ssnLast4: r[2] ? r[2].toString().trim() : "",
      firstName: r[3] ? r[3].toString().toUpperCase().trim() : "",
      lastName: r[4] ? r[4].toString().toUpperCase().trim() : "",
      taxYear: r[5] || "",
      counselor: r[6] || "",
      reviewer: r[7] || "",
      status: r[8] ? r[8].toString().trim() : "Checked In",
      comments: r[9] || "",
      lastChange: r[10]
    }));
  }

  return {
    getIncompleteRow,
    getAllIncompleteRows
  };

})();