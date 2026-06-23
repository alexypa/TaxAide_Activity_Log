/**
 * ActivityLogView.gs — DIAGNOSTIC VERSION
 */

const ActivityLogView = (() => {

  function applyActivityLogResult(result) {

    Logger.log("VIEW RECEIVED RESULT: %s", JSON.stringify(result));

    if (!result || result.ignore) {
      Logger.log("VIEW: Ignored result");
      return;
    }

    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName("Activity_Log");
    const COL = ActivityLogModel.getColumns();

    // Forbidden edit
    if (result.action === "FORBIDDEN_EDIT") {
      Logger.log("VIEW: FORBIDDEN_EDIT — clearing cell");
      sheet.getRange(result.row, result.col).clearContent();
      SpreadsheetApp.getUi().alert(result.message);
      return;
    }

    // ── Single name cell edited, check-in not triggered ──
    if (result.action === "FORMAT_NAME") {
      Logger.log("VIEW: FORMAT_NAME — uppercasing cell row=%s col=%s", result.row, result.col);
      sheet.getRange(result.row, result.col).setValue(result.value);
      return;
    }

    // ── Both names present and not yet checked in ──
    if (result.action === "CHECK_IN") {
      Logger.log("VIEW: CHECK-IN — writing names, timestamp and status");

      sheet.getRange(result.row, COL.FIRST).setValue(result.firstName);
      sheet.getRange(result.row, COL.LAST).setValue(result.lastName);

      const timeCell = sheet.getRange(result.row, COL.CHECKIN_TIME);
      timeCell.setValue(result.checkInTime);
      timeCell.setNumberFormat("h:mm AM/PM");

      sheet.getRange(result.row, COL.STATUS).setValue(result.status);

      Logger.log("VIEW: CHECK-IN COMPLETE");
      return;
    }

    Logger.log("VIEW: Unknown action");
  }

  return { applyActivityLogResult };

})();
