/**
 * ActivityLogModel.gs — Unified Model (Option 3 naming + batch writes)
 * Single source of truth for Activity_Log sheet.
 */

const ActivityLogModel = (() => {

  const SHEET = "Activity_Log";

  /**
   * Column lookup
   */
  function getColumns() {
    return {
      TICKET:       ColumnMapper.col(SHEET, "Ticket #"),
      SSN_LAST4:    ColumnMapper.col(SHEET, "SSN Last 4"),
      FIRST:        ColumnMapper.col(SHEET, "First Name"),
      LAST:         ColumnMapper.col(SHEET, "Last Name"),
      TAXYEAR:      ColumnMapper.col(SHEET, "Tax Year"),
      CHECKIN_TIME: ColumnMapper.col(SHEET, "Check In Time"),
      COUNSELOR:    ColumnMapper.col(SHEET, "Counselor"),
      REVIEWER:     ColumnMapper.col(SHEET, "Reviewer"),
      STATUS:       ColumnMapper.col(SHEET, "Status"),
      COMMENTS:     ColumnMapper.col(SHEET, "Comments")
    };
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
      ssnLast4:     values[COL.SSN_LAST4 - 1],
      firstName:    values[COL.FIRST - 1],
      lastName:     values[COL.LAST - 1],
      taxYear:      values[COL.TAXYEAR - 1],
      checkInTime:  values[COL.CHECKIN_TIME - 1],
      counselor:    values[COL.COUNSELOR - 1],
      reviewer:     values[COL.REVIEWER - 1],
      status:       values[COL.STATUS - 1],
      comments:     values[COL.COMMENTS - 1]
    };
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

    const updates = [];

    if (fields.firstName !== undefined) {
      updates.push({ col: COL.FIRST, value: fields.firstName });
    }
    if (fields.lastName !== undefined) {
      updates.push({ col: COL.LAST, value: fields.lastName });
    }
    if (fields.checkInTime !== undefined) {
      updates.push({ col: COL.CHECKIN_TIME, value: fields.checkInTime });
    }
    if (fields.status !== undefined) {
      updates.push({ col: COL.STATUS, value: fields.status });
    }
    if (fields.counselor !== undefined) {
      updates.push({ col: COL.COUNSELOR, value: fields.counselor });
    }
    if (fields.reviewer !== undefined) {
      updates.push({ col: COL.REVIEWER, value: fields.reviewer });
    }
    if (fields.comments !== undefined) {
      updates.push({ col: COL.COMMENTS, value: fields.comments });
    }

    // Apply all updates in one batch
    updates.forEach(u => {
      activityLogSheet.getRange(row, u.col).setValue(u.value);
    });
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
    Logger.log("Row: " + row + ". text: " + text);
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
    appendComment
  };

})();
