/**
 * ActivityLogModel.gs — LAZY LOAD VERSION
 */

const ActivityLogModel = (() => {

  const SHEET = "Activity_Log";

  function getColumns() {
    return {
      TICKET:       ColumnMapper.col(SHEET, "Ticket #"),
      SSN:          ColumnMapper.col(SHEET, "SSN Last 4"),
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

  function getRow(row) {
    const COL = getColumns();  // <-- ColumnMapper resolved HERE, safely
    const sh = SpreadsheetApp.getActive().getSheetByName(SHEET);
    const values = sh.getRange(row, 1, 1, sh.getLastColumn()).getValues()[0];

    return {
      ticket:       values[COL.TICKET - 1],
      ssn:          values[COL.SSN - 1],
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

  return { getColumns, getRow };

})();
