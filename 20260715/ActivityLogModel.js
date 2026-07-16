/**
 * ActivityLogModel.gs 
 * Reads and writes data from/to the Activity_Log sheet
 */

const ActivityLogModel = (() => {

  const SHEET = "Activity_Log";

  let cachedColumns = null;

  /**
   * Column lookup
   */
  function getColumns() {
    
    if (cachedColumns) return cachedColumns;

    cachedColumns = {
      TICKET:       ColumnMapper.col(SHEET, "Ticket #"),
      SSN_LAST4:    ColumnMapper.col(SHEET, "SSN Last 4"),
      FIRST:        ColumnMapper.col(SHEET, "First Name"),
      LAST:         ColumnMapper.col(SHEET, "Last Name"),
      TAXYEAR:      ColumnMapper.col(SHEET, "Tax Year"),
      CHECKIN_TIME: ColumnMapper.col(SHEET, "Check In Time"),
      COUNSELOR:    ColumnMapper.col(SHEET, "Counselor"),
      REVIEWER:     ColumnMapper.col(SHEET, "Reviewer"),
      STATUS:       ColumnMapper.col(SHEET, "Status"),
      COMMENTS:     ColumnMapper.col(SHEET, "Comments"),
      LATEST_CHANGE:ColumnMapper.col(SHEET, "Latest Status Change"),
    };
    return cachedColumns;
  }

  /**
   * Load a row into a structured object.
   */
  function getRow(row) {
    const activityLogSheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const COL = getColumns();
    const values = activityLogSheet.getRange(row, 1, 1, activityLogSheet.getLastColumn()).getValues()[0];

    return {
      row,
      ticket:       values[COL.TICKET - 1],
      ssnLast4:     values[COL.SSN_LAST4 - 1].toString(),
      firstName:    values[COL.FIRST - 1],
      lastName:     values[COL.LAST - 1],
      taxYear:      values[COL.TAXYEAR - 1].toString(),
      checkInTime:  values[COL.CHECKIN_TIME - 1],
      counselor:    values[COL.COUNSELOR - 1],
      reviewer:     values[COL.REVIEWER - 1],
      status:       values[COL.STATUS - 1],
      comments:     values[COL.COMMENTS - 1],
      latestChange: values[COL.LATEST_CHANGE - 1]
    };
  }

  function getAllActivityLogs() {
    const activityLogSheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const rows = activityLogSheet.getLastRow() - 1;
    if (rows < 1) return [];

    const values = activityLogSheet.getRange(2, 1, rows, 11).getValues();

    return values.map((r, i) => ({
      row: i + 2,
      checkedInTime: r[0],
      ticketNo: r[1],
      ssnLast4: r[2].toString(),
      firstName: r[3],
      lastName: r[4],
      taxYear: r[5].toString(),
      counselor: r[6],
      reviewer: r[7],
      status: r[8],
      comments: r[9],
      latestChange: r[10]
    }));
  }

  /**
   * Generic single-field write helper.
   */
  function writeField(row, fieldName, value) {
    const activityLogSheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const col = ColumnMapper.col(SHEET, fieldName);
    activityLogSheet.getRange(row, col).setValue(value);
  }

  // -----------------------------
  // Batch write support
  // -----------------------------
  function setFields(row, fields) {

    const activityLogSheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const COL = getColumns();
    const maxCols = activityLogSheet.getLastColumn();
    const range = activityLogSheet.getRange(row, 1, 1, maxCols);    
    const rowValues = range.getValues();

    if (fields.firstName !== undefined)   rowValues[0][COL.FIRST - 1] = fields.firstName;
    if (fields.lastName !== undefined)    rowValues[0][COL.LAST - 1] = fields.lastName;
    if (fields.checkInTime !== undefined) rowValues[0][COL.CHECKIN_TIME - 1] = fields.checkInTime;
    if (fields.status !== undefined)       rowValues[0][COL.STATUS - 1] = fields.status;
    if (fields.counselor !== undefined)    rowValues[0][COL.COUNSELOR - 1] = fields.counselor;
    if (fields.reviewer !== undefined)     rowValues[0][COL.REVIEWER - 1] = fields.reviewer;
    if (fields.comments !== undefined)     rowValues[0][COL.COMMENTS - 1] = fields.comments;
    if (fields.latestChange !== undefined) rowValues[0][COL.LATEST_CHANGE - 1] = fields.latestChange;

    // 3. Write the whole array back to the sheet at once (1 server hit!)
    range.setValues(rowValues);
    const updates = [];
  }

  // -----------------------------
  // Convenience wrappers
  // -----------------------------
  function setStatus(row, newStatus) {
    setFields(row, { status: newStatus });
  }

  function setCounselor(row, newCounselor) {
    setFields(row, { counselor: newCounselor });
  }

  function setReviewer(row, newReviewer) {
    setFields(row, { reviewer: newReviewer });
  }

  function setCheckInTime(row, timestamp) {
    setFields(row, { checkInTime: timestamp });
  }

  function setName(row, first, last) {
    setFields(row, { firstName: first, lastName: last });
  }

  function setComments(row, comments) {
    setFields(row, { comments });
  }

  // Append text to existing comment
  function appendComment(row, text) {
    const activityLogSheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const COL = getColumns();

    // Get the existing comment text
    const cell = activityLogSheet.getRange(row, COL.COMMENTS);
    const existing = cell.getValue();

    // Append properly
    const updated = existing
      ? `${existing}\n${text}`
      : text;

    // Write back
    cell.setValue(updated);
  }

  function setLatestChange(row, timeStamp) {
    setFields(row, {latestChange : timeStamp});
  }


  return {
    getColumns,
    getRow,
    writeField,
    setFields,
    setStatus,
    setCounselor,
    setReviewer,
    setCheckInTime,
    setName,
    setComments,
    setLatestChange,
    appendComment,
    getAllActivityLogs
  };

})();
