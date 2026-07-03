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

function verifyExtractionEngine() {
  // Test 1: Passing a text string
  const output1 = AppointmentView.getFormattedDateTimeString("6:27 PM");
  console.log(output1); // 💡 Output: "7/2/2026 18:27:52" (Seconds match runtime generation)

  // Test 2: Passing a direct cell-serialized Date object
  const sampleDate = new Date();
  sampleDate.setHours(9, 5, 0); 
  const output2 = AppointmentView.getFormattedDateTimeString(sampleDate);
  console.log(output2); // 💡 Output: "7/2/2026 09:05:52"
}

