/**
 * ActivityLogController.gs
 * onEdit router for the Activity_log sheet
 */
const ActivityLogController = (() => {

  function handleActivityLogEdit(e) {

    const sheetName = e.range.getSheet().getName();
    if (sheetName !== "Activity_Log") return { ignore:true };

    const rowNumber = e.range.getRow();
    const colNumber = e.range.getColumn();

    // Do not permit edits to header row
    if (rowNumber === 1) return {ok: false, action: "FORBIDDEN_EDIT", rowNumber, colNumber, message: "Edits to header row are not permitted"};

    const COL = ActivityLogModel.getColumns();

    const value = e.range.getValue();

    // Read row data
    const row = ActivityLogModel.getRow(rowNumber);

    switch (colNumber) {
      case COL.CHECKIN_TIME:
        return {ok: false, action: "FORBIDDEN_EDIT", rowNumber, colNumber, message: "Check In Time field is set by the system when a taxpayer checks in"};
      case COL.TICKET:
      case COL.SSN_LAST4:
      case COL.TAXYEAR:
      case COL.COMMENTS:
        // Entry in the above fields do not require action
        return { ok: true, ignore:true };
      case COL.FIRST:
      case COL.LAST:
        return StateController.handleFirstAndLastNames(COL, colNumber, row, value);
      case COL.COUNSELOR:
        return StateController.handleCounselorEdit(e);        
      case COL.REVIEWER:
        return StateController.handleReviewerEdit(e);
      case COL.STATUS:
        return StateController.handleStatusEdit(e);
      default:
        // Any column other than the above - ignore edits
        return { ok: true, ignore:true }; 
    }
  }

  function archiveActivityLogs() {

    const TERMINAL = ["Accepted", "Paper", "No Return", "Deactivated"];
    const logs = ActivityLogModel.getAllActivityLogs(); 

    const logsToArchive = logs.filter(r => (TERMINAL.includes(r.status)));

    return {
      ok: true, 
      ignore:false, 
      action: "ARCHIVE_ACTIVITY_LOGS", 
      rows: logsToArchive
    };
  }

  function transferActivityLogsToIncomplete() {

    const TERMINAL = ["Accepted", "Paper", "No Return", "Deactivated"];
    const logs = ActivityLogModel.getAllActivityLogs(); 

    const logsToIncomplete = logs.filter(r => (!TERMINAL.includes(r.status)));

    return {
      ok: true, 
      ignore:false, 
      action: "TRANSFER_TO_INCOMPLETE", 
      rows: logsToIncomplete
    };
  }

  function clearActivityLogs() {

    const logs = ActivityLogModel.getAllActivityLogs();

    return {
      ok: true,
      ignore: false,
      action: CLEAR_ACTIVITY_LOGS,
      rows:logs
    }
  }

  return { 
    handleActivityLogEdit,
    archiveActivityLogs,
    transferActivityLogsToIncomplete,
    clearActivityLogs
  };

})();
