/**
 * Controller.gs
 * Thin onEdit router using MVC modules for each sheet.
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu("TaxAide")
    .addItem("Open Check-In Sidebar", "showCheckInSidebar")
    .addItem("Process No Shows", "menuProcessNoShows")
    .addItem("Clear Appointments", "menuClearAppointments")
    .addToUi();

  applyDynamicValidation_();
}

function showCheckInSidebar() {
  const html = HtmlService.createHtmlOutputFromFile("CheckInSidebar")
    .setTitle("Check In");
  SpreadsheetApp.getUi().showSidebar(html);
}

function menuProcessNoShows() {
  const result = AppointmentController.processNoShows(AppointmentModel);
  AppointmentView.applyAppointmentResult(result);
}

function menuClearAppointments() {
  const result = AppointmentController.clearAppointments();
  AppointmentView.applyAppointmentResult(result);
}

function onEdit(e) {
  onEditRouter(e);
}

/**
 * ============================================================
 *  Main onEdit router — pure controller dispatch
 * ============================================================
 */
function onEditRouter(e) {
  try {
    if (!e || !e.range || !e.source) return;

    const sheet = e.source.getActiveSheet();
    const sheetName = sheet.getName();

    Logger.log("[onEditRouter] active sheet = " + sheetName);

    // ---------------------------------------------------------
    // 1. Appointments sheet
    // ---------------------------------------------------------
    if (sheetName === "Appointments") {
      const result = AppointmentController.handleAppointmentEdit(AppointmentModel, e);
      AppointmentView.applyAppointmentResult(result);
      return;
    }

    // ---------------------------------------------------------
    // 2. Activity_Log sheet
    // ---------------------------------------------------------
    if (sheetName === "Activity_Log") {
      handleActivityLogEdit(e);
      return;
    }

    // ---------------------------------------------------------
    // 3. Other sheets — ignore
    // ---------------------------------------------------------
    return;

  } catch (err) {
    SpreadsheetApp.getUi().alert("Error in onEdit: " + err);
  }
}

/**
 * ============================================================
 *  Activity Log routing (extracted for clarity)
 * ============================================================
 */
function handleActivityLogEdit(e) {
  const row = e.range.getRow();
  const col = e.range.getColumn();

  Logger.log("[onEditRouter] row = " + row + ". column =" + col);

  if (row < 2) return; // ignore header row

  const model = StateModel.loadRow(row);

  const COL = {
    TICKET:     ColumnMapper.col("Activity_Log", "Ticket #"),
    SSN:        ColumnMapper.col("Activity_Log", "SSN Last 4"),
    FIRST:      ColumnMapper.col("Activity_Log", "First Name"),
    LAST:       ColumnMapper.col("Activity_Log", "Last Name"),
    TAXYEAR:    ColumnMapper.col("Activity_Log", "Tax Year"),
    COUNSELOR:  ColumnMapper.col("Activity_Log", "Counselor"),
    REVIEWER:   ColumnMapper.col("Activity_Log", "Reviewer"),
    STATUS:     ColumnMapper.col("Activity_Log", "Status"),
    COMMENTS:   ColumnMapper.col("Activity_Log", "Comments")
  };

  let result = null;

  if (col === COL.COUNSELOR) {
    result = StateController.handleCounselorEdit(model, e);
  }
  else if (col === COL.REVIEWER) {
    result = StateController.handleReviewerEdit(model, e);
  }
  else if (col === COL.STATUS) {
    result = StateController.handleStatusEdit(model, e);
  }
  else {
    return;
  }

  StateController.applyResult(result, model, row, e);
}

/**
 * ============================================================
 *  Dynamic validation for Tax Year
 * ============================================================
 */
function applyDynamicValidation_() {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName("Activity_Log");
  if (!sheet) return;

  const allowedYears = SettingsModel.getAllowedYears();
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(allowedYears, true)
    .setAllowInvalid(false)
    .build();

  const col = ColumnMapper.col("Activity_Log", "Tax Year");
  const lastRow = sheet.getMaxRows();
  const range = sheet.getRange(2, col, lastRow - 1, 1);
  range.setDataValidation(rule);
}
