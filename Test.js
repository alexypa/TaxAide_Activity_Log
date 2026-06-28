function test() {
  const activityLogSheet = SpreadsheetApp.getActive().getSheetByName("Activity_Log");
  const targetcell = activityLogSheet.getRange("G5");
  const e = {
    source : activityLogSheet,
    range: targetcell,
    value : "",
    oldValue : "George",
    value : "",
    user : Session.getActiveUser(),
    authMode : ScriptApp.AuthMode.LIMITED
  };
  ActivityLogController.handleActivityLogEdit(e);
}