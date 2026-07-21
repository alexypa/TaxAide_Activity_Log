/**
 * ActivityLogModel.gs 
 * Reads and writes data from/to the Activity_Log sheet
 */

const ActivityLogModel = (() => {

  const SHEET = "Activity_Log";
  let cachedColumns = null;

  /**
   * Column lookup matching actual tab headers
   */
  function getColumns() {
    if (cachedColumns) return cachedColumns;

    cachedColumns = {
      RETURN_ID:    ColumnMapper.col(SHEET, "Return ID"), 
      CHECKIN_TIME: ColumnMapper.col(SHEET, "Check In Time"),
      TICKET:       ColumnMapper.col(SHEET, "Ticket #"),
      SSN_LAST4:    ColumnMapper.col(SHEET, "SSN Last 4"),
      FIRST:        ColumnMapper.col(SHEET, "First Name"),
      LAST:         ColumnMapper.col(SHEET, "Last Name"),
      TAXYEAR:      ColumnMapper.col(SHEET, "Tax Year"),
      COUNSELOR:    ColumnMapper.col(SHEET, "Counselor"),
      REVIEWER:     ColumnMapper.col(SHEET, "Reviewer"),
      STATUS:       ColumnMapper.col(SHEET, "Status"),
      COMMENTS:     ColumnMapper.col(SHEET, "Comments"),
      DURATION:     ColumnMapper.col(SHEET, "Duration")
    };
    return cachedColumns;
  }

  /**
   * Load a row into a structured object using dynamic column positions.
   */
  function getAcivityLogRow(row) {
    const activityLogSheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const COL = getColumns();
    const values = activityLogSheet.getRange(row, 1, 1, activityLogSheet.getLastColumn()).getValues()[0];

    return {
      row,
      returnId:     values[COL.RETURN_ID - 1] ? values[COL.RETURN_ID - 1].toString() : "",
      checkInTime:  values[COL.CHECKIN_TIME - 1],
      ticket:       values[COL.TICKET - 1],
      ssnLast4:     values[COL.SSN_LAST4 - 1] ? values[COL.SSN_LAST4 - 1].toString() : "",
      firstName:    values[COL.FIRST - 1],
      lastName:     values[COL.LAST - 1],
      taxYear:      values[COL.TAXYEAR - 1] ? values[COL.TAXYEAR - 1].toString() : "",
      counselor:    values[COL.COUNSELOR - 1],
      reviewer:     values[COL.REVIEWER - 1],
      status:       values[COL.STATUS - 1],
      comments:     values[COL.COMMENTS - 1],
      duration:     values[COL.DURATION - 1] ? values[COL.DURATION - 1].toString() : ""
    };
  }

  /**
   * Reads all current records dynamically mapping based on schema structure.
   */
  function getAllActivityLogs() {
    const activityLogSheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const rows = activityLogSheet.getLastRow() - 1;
    if (rows < 1) return [];

    const COL = getColumns();
    const maxCols = activityLogSheet.getLastColumn();
    const values = activityLogSheet.getRange(2, 1, rows, maxCols).getValues();

    return values.map((r, i) => ({
      row: i + 2,
      returnId:    r[COL.RETURN_ID - 1] ? r[COL.RETURN_ID - 1].toString() : "",
      checkInTime:  r[COL.CHECKIN_TIME - 1],
      ticketNo:     r[COL.TICKET - 1],
      ssnLast4:     r[COL.SSN_LAST4 - 1] ? r[COL.SSN_LAST4 - 1].toString() : "",
      firstName:    r[COL.FIRST - 1],
      lastName:     r[COL.LAST - 1],
      taxYear:      r[COL.TAXYEAR - 1] ? r[COL.TAXYEAR - 1].toString() : "",
      counselor:    r[COL.COUNSELOR - 1],
      reviewer:     r[COL.REVIEWER - 1],
      status:       r[COL.STATUS - 1],
      comments:     r[COL.COMMENTS - 1],
      duration:     r[COL.DURATION - 1] ? r[COL.DURATION - 1].toString() : ""
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

  /**
   * Batch write support mapped directly to column definitions.
   */
  function setFields(row, fields) {
    const activityLogSheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const COL = getColumns();
    const maxCols = activityLogSheet.getLastColumn();
    const range = activityLogSheet.getRange(row, 1, 1, maxCols);    
    const rowValues = range.getValues();

    if (fields.returnId !== undefined)    rowValues[0][COL.RETURN_ID - 1]    = fields.returnId;
    if (fields.checkInTime !== undefined) rowValues[0][COL.CHECKIN_TIME - 1] = fields.checkInTime;
    if (fields.ticket !== undefined)       rowValues[0][COL.TICKET - 1]       = fields.ticket;
    if (fields.ssnLast4 !== undefined)    rowValues[0][COL.SSN_LAST4 - 1]    = fields.ssnLast4;
    if (fields.firstName !== undefined)   rowValues[0][COL.FIRST - 1]        = fields.firstName;
    if (fields.lastName !== undefined)    rowValues[0][COL.LAST - 1]         = fields.lastName;
    if (fields.taxYear !== undefined)     rowValues[0][COL.TAXYEAR - 1]      = fields.taxYear;
    if (fields.status !== undefined)      rowValues[0][COL.STATUS - 1]       = fields.status;
    if (fields.counselor !== undefined)   rowValues[0][COL.COUNSELOR - 1]    = fields.counselor;
    if (fields.reviewer !== undefined)    rowValues[0][COL.REVIEWER - 1]     = fields.reviewer;
    if (fields.comments !== undefined)    rowValues[0][COL.COMMENTS - 1]     = fields.comments;
    if (fields.duration !== undefined)    rowValues[0][COL.DURATION - 1]     = fields.duration;

    range.setValues(rowValues);
  }

  // -----------------------------
  // Convenience wrappers
  // -----------------------------
  function setReturnId(row, id) {
    setFields(row, { returnId: id });
  }

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

  function setDuration(row, durationText) {
    setFields(row, { duration: durationText });
  }

  function appendComment(row, text) {
    const activityLogSheet = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const COL = getColumns();
    const cell = activityLogSheet.getRange(row, COL.COMMENTS);
    const existing = cell.getValue();
    const updated = existing ? `${existing}\n${text}` : text;
    cell.setValue(updated);
  }

  return {
    getColumns,
    getRow: getAcivityLogRow,
    writeField,
    setFields,
    setReturnId,
    setStatus,
    setCounselor,
    setReviewer,
    setCheckInTime,
    setName,
    setComments,
    setDuration,
    appendComment,
    getAllActivityLogs
  };

})();