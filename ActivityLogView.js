/**
 * ActivityLogView.gs — Updated for unified ActivityLogModel
 */

const ActivityLogView = (() => {

  function applyActivityLogResult(result) {

    if (!result || result.ignore) return;

    const COL = ActivityLogModel.getColumns();

    if (result.action === "FORBIDDEN_EDIT") {
      SpreadsheetApp.getActive()
        .getSheetByName("Activity_Log")
        .getRange(result.row, result.col)
        .clearContent();
      SpreadsheetApp.getUi().alert(result.message);
      return;
    }

    if (result.action === "FORMAT_NAME") {
      SpreadsheetApp.getActive()
        .getSheetByName("Activity_Log")
        .getRange(result.row, result.col)
        .setValue(result.value);
      return;
    }

    if (result.action === "CHECK_IN") {
      ActivityLogModel.setFields(result.row, {
        firstName: result.firstName,
        lastName:  result.lastName,
        checkInTime: result.checkInTime,
        status: "Checked In"
      });
      return;
    }
  }

  return { applyActivityLogResult };

})();
