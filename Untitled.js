function myFunction() {
  const cols = ActivityLogModel.getColumns();
  Logger.log(JSON.stringify(cols));
}

function debugColumnMapper() {
  const map = ColumnMapper.map("Activity_Log");
  Logger.log(JSON.stringify(map, null, 2));
}

function debugSheetName() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Activity_Log");
  Logger.log("Sheet found: " + (sheet ? sheet.getName() : "NONE"));
  if (sheet) {
    Logger.log("Sheet ID: " + sheet.getSheetId());
    Logger.log("Last column: " + sheet.getLastColumn());
    Logger.log("Headers: " + JSON.stringify(sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0]));
  }
}

function debugSheetIDs() {
  const ss = SpreadsheetApp.getActive();
  const sheets = ss.getSheets();

  sheets.forEach(sh => {
    Logger.log(`Name: '${sh.getName()}'  ID: ${sh.getSheetId()}`);
  });
}

function copySheet() {
  const ss = SpreadsheetApp.getActive();
  const source = ss.getSheetByName("Activity_Log");

  // Creates a full duplicate named "Activity_Log_Copy"
  const copy = source.copyTo(ss);
  copy.setName("Activity_Log_Copy");
}

function debugColumnMapperColSource() {
  Logger.log(ColumnMapper.col.toString());
}


