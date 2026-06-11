const CounselorController = (() => {

  function handleCounselorEdit(sheet, row, oldValue, newValue) {
    const COL = ActivityLogModel.COL;
    const statusCell = sheet.getRange(row, COL.STATUS);
    const currentStatus = statusCell.getValue();

    const nextState = StateController.nextStateForCounselor(currentStatus, newValue);

    if (!nextState) {
      SpreadsheetApp.getUi().alert(
        `Cannot change counselor when return is in state: ${currentStatus}`
      );
      sheet.getRange(row, COL.COUNSELOR).setValue(oldValue || "");
      return;
    }

    statusCell.setValue(nextState);
  }

  return { handleCounselorEdit };

})();

