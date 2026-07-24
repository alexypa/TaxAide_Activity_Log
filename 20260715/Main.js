/**
 * Main.gs
 * This is the entry point to the application
 */

/**
 * Standard Google Apps Script entry point that fires automatically 
 * when the Spreadsheet workbook is opened by any user.
 * Automatically creates the custom TaxAide operations toolbar menu 
 * when the spreadsheet workbook initializes.
 * Automatically forces a live dashboard compiler refresh.
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu("TaxAide Operations")
    .addItem("🔄 Refresh Activity Log", "runDashboardRefresh")
    .addSeparator()
    .addItem("🌙 Execute End-of-Day Sweep", "runEndOfDaySweep")
    .addSeparator()
    .addItem("Refresh Dashboard", "SiteDashboardController.refreshDashboard")
    .addToUi();

  try {
    DashboardController.refreshDailyDashboard();
  } catch (err) {
    Logger.log(`Automated onOpen dashboard compile failed: ${err.message}`);
  }
}

function runDashboardRefresh() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    "🔄 Refreshing Activity_Log Sheet",
    "This operation will rebuild the Activity_Log sheet with current data.\n\n" +
    "The process may take a few moments, depending on the size of the database.\n" +
    "Please wait for the confirmation message before proceeding with any other operations.",
    ui.ButtonSet.OK
  );
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast("Compiling database logs...", "System Sync", 3);
    DashboardController.refreshDailyDashboard();
    SpreadsheetApp.getActiveSpreadsheet().toast("The Activity_Log sheet is up to date!", "Sync Success", 3);
  } catch (err) {
    Logger.log(`Activity_Log sheet refresh failed: ${err.message}`);
  }
}

function runEndOfDaySweep() {
  try {
    EodController.executeEndOfDaySweep();
  } catch (err) {
    Logger.log(`End-of-Day sweep failed: ${err.message}`);
  }
}

/**
 * =======================================================================
 *  Main onEdit router
 *  An installable trigger that fires every time a cell or range is edited
 *  Runs under the owner's permissions to safely update backend DB tabs.
 * =======================================================================
 */

function onEdit(e) {
  // Do nothing. onEditHandler(e) will handle the onEdit() installed trigger.
}

function onEditHandler(e) {
  if (!e || !e.range || !e.source) return;

  Logger.log("Event: " + JSON.stringify(e));

  const sheetName = e.source.getActiveSheet().getName();

  // Route edits to the appropriate controller based on the sheet name
  if (sheetName === "Appointments") {
    const result = AppointmentController.handleAppointmentEdit(e);
    AppointmentView.applyAppointmentResult(result);
    return;
  }

  if (sheetName === "Activity_Log") {
    const result = ActivityLogController.handleActivityLogEdit(e);
    ActivityLogView.applyActivityLogResult(result, e);
    return;
  }

  if (sheetName === "Incomplete") {
    const result = IncompleteController.handleIncompleteEdit(e);
    IncompleteView.applyIncompleteResult(result, e);
    return;
  }
}

/**
 * Updates the 1 minute clock in the Settings sheet.
 * and then calls QueueTimerController.updateLiveQueueDurations() to recalculate the live durations.
 */
function updateMasterClock() {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");  
  settingsSheet.getRange("B8").setValue(new Date());
  QueueTimerController.updateLiveQueueDurations();
}



