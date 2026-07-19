function submitReason(row, reasonType, selectedReason, freeText, newStatus) {

  let reason = "";
  
  if (selectedReason === "" && freeText === "") {
    reason = "No explanation provided";
  } else {
    reason = selectedReason + ". " + freeText;
  }

  // 1. Commit the data updates to the model fields
  ActivityLogModel.appendComment(row, reason);
  ActivityLogModel.setFields(row, { status: newStatus, latestChange: new Date()});

  // 2. Build mock execution contexts to invoke the view manually
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Activity_Log");

  const mockResult = {
    action: "STATUS_CHANGE",
    requiresReason: false, // Explicitly false to pass right through the guard check
    newStatus: newStatus,
    row: row,
    taxReturnId: sheet.getRange(row, ActivityLogModel.getColumns().RETURN_ID).getValue()
  };

  const mockE = {
    source: ss,
    range: sheet.getRange(row, ActivityLogModel.getColumns().STATUS),
    value: newStatus
  };

  // 3. Direct the view layer to execute step 2 (history log) and step 3 (archive/delete)
  ActivityLogView.applyActivityLogResult(mockResult, mockE);
}

function cancelReason(row, previousStatus) {
  ActivityLogModel.setFields(row, { status: previousStatus });
}



