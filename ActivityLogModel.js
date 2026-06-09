// ActivityLogModel.gs
const ActivityLogModel = (() => {

  const SHEET_NAME = "Activity_Log";

  const COL = {
    CHECK_IN_TIME: 1,
    TICKET: 2,
    SSN_LAST4: 3,
    FIRST_NAME: 4,
    LAST_NAME: 5,
    TAX_YEAR: 6,
    COUNSELOR: 7,
    REVIEWER: 8,
    STATUS: 9,
    COMMENTS: 10
  };

  function getSheet() {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error(`Sheet '${SHEET_NAME}' not found.`);
    return sheet;
  }

  function getLastRow() {
    return getSheet().getLastRow();
  }

  function writeRow(row, values) {
    getSheet().getRange(row, 1, 1, values.length).setValues([values]);
  }

  function addEntry(entry) {
    const sheet = getSheet();
    const row = getLastRow() + 1;

    const values = [
      entry.checkInTime || new Date(),
      entry.ticket || "",
      entry.ssnLast4 ? "'" + entry.ssnLast4 : "",
      entry.firstName || "",
      entry.lastName || "",
      entry.taxYear || "",
      entry.counselor || "",
      entry.reviewer || "",
      entry.status || "",
      entry.comments || ""
    ];

    writeRow(row, values);
    sheet.getRange(row, COL.SSN_LAST4).setHorizontalAlignment("right");
    return row;
  }

  return {
    COL,
    addEntry
  };

})();
