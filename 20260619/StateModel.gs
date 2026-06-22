/**
 * StateModel.gs
 * Row-level model for Activity_Log, using generalized ColumnMapper.
 */

const StateModel = (() => {

  const SHEET = "Activity_Log";

  // Cache column numbers for this sheet
  const COL = {
    TICKET:     () => ColumnMapper.col(SHEET, "Ticket #"),
    SSN:        () => ColumnMapper.col(SHEET, "SSN Last 4"),
    FIRST:      () => ColumnMapper.col(SHEET, "First Name"),
    LAST:       () => ColumnMapper.col(SHEET, "Last Name"),
    TAXYEAR:    () => ColumnMapper.col(SHEET, "Tax Year"),
    COUNSELOR:  () => ColumnMapper.col(SHEET, "Counselor"),
    REVIEWER:   () => ColumnMapper.col(SHEET, "Reviewer"),
    STATUS:     () => ColumnMapper.col(SHEET, "Status"),
    COMMENTS:   () => ColumnMapper.col(SHEET, "Comments")
  };

  /**
   * Load a row from Activity_Log into a structured object.
   */
  function loadRow(row) {

    Logger.log("StateModel loadRow(" + row + ")");
    
    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const lastCol = sheet.getLastColumn();
    const values = sheet.getRange(row, 1, 1, lastCol).getValues()[0];

    Logger.log("values = "+ values);

    function get(colFunc) {
      const col = colFunc();
      return values[col - 1];
    }

    return {
      row: row,
      ticket:      get(COL.TICKET),
      ssnLast4:    get(COL.SSN),
      firstName:   get(COL.FIRST),
      lastName:    get(COL.LAST),
      taxYear:     get(COL.TAXYEAR),
      counselor:   get(COL.COUNSELOR),
      reviewer:    get(COL.REVIEWER),
      status:      get(COL.STATUS),
      comments:    get(COL.COMMENTS)
    };
  }

  /**
   * Write a single field by header name.
   */
  function writeField(row, fieldName, value) {
    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const col = ColumnMapper.col(SHEET, fieldName);
    sheet.getRange(row, col).setValue(value);
  }

  function setStatus(row, newStatus) {
    writeField(row, "Status", newStatus);
  }

  function setCounselor(row, newCounselor) {
    writeField(row, "Counselor", newCounselor);
  }

  function setReviewer(row, newReviewer) {
    writeField(row, "Reviewer", newReviewer);
  }

  return {
    loadRow,
    writeField,
    setStatus,
    setCounselor,
    setReviewer
  };

})();
