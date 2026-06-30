function myFunction() {
  const rows = ActivityLogModel.getAllActivityLogs();
  Logger.log("Rows: " + JSON.stringify(rows));
}

function testMoveNoShows() {
  const ss = SpreadsheetApp.getActive();
  const result = AppointmentController.processNoShows();
  Logger.log("Result: " + JSON.stringify(result));
  AppointmentView.moveNoShows_(ss, result);
}

