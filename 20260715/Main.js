/**
 * Main.gs
 * This is the entry point to the application
 */

/**
 * Standard Google Apps Script entry point that fires automatically 
 * when the Spreadsheet workbook is opened by any user.
 */
/**
 * Automatically creates the custom TaxAide operational toolbar menu 
 * when the spreadsheet workbook initializes.
 */
/**
 * Automatically runs when the spreadsheet workbook initializes.
 * Builds the operational menus and forces a live dashboard compiler refresh.
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu("TaxAide Operations")
    .addItem("🔄 Refresh Activity Log", "runDashboardRefresh")
    .addSeparator()
    .addItem("🌙 Execute End-of-Day Sweep", "runEndOfDaySweep")
    addSeparator()
    .addItem("Refresh Dashboard", "DashboardController.refreshDashboard")
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


function securityCheck_(e) {
  try {
      if (e && e.authMode === ScriptApp.AuthMode.NONE) {
        ui.alert(
          "⚠️ First-Time Authorization Required",
          "Welcome to the TaxAide Activity Logging System!\n\n" +
          "Before you can use the entire system's functionality, Google requires your account to be authorized to run the script.\n\n" +
          "👉 TO ACTIVATE NOW:\n" +
          "1. Click the 'TaxAide' menu at the top of your screen.\n" +
          "2. Click 'First-Time Activation'.\n" +
          "3. If your account has not yet been authorized, this may launch some Google activation screen.\n" +
          "4. Follow the Google prompts (Click Continue -> Advanced -> Go to project).\n\n" +
          "This is a one-time setup step for your account.",
          ui.ButtonSet.OK
        );
      }
    } catch (err) {
      console.warn("Auth check skipped: " + err.message);
    }
}

/**
 * Harmless activation bridge function.
 * Triggered by user gesture to safely force Google's OAuth screen if missing.
 */
function activateUserSession_() {
  const ui = SpreadsheetApp.getUi();
  
  ui.alert(
    "✅ Activation Successful",
    "Your account is fully authorized and trusted by the TaxAide Activity Logging script.\n\n" +
    "You can now use the TaxAide Activity Logging System normally.",
    ui.ButtonSet.OK
  );
}

function onEdit(e) {
  // Do nothing. onEditHandler(e) will handle the onEdit() installed trigger.
}

/**
 * =======================================================================
 *  Main onEdit router
 *  An installable trigger that fires every time a cell or range is edited
 *  Runs under the owner's permissions to safely update backend DB tabs.
 * =======================================================================
 */
function onEditHandler(e) {
  if (!e || !e.range || !e.source) return;

  Logger.log("Event: " + JSON.stringify(e));
  const sheetName = e.source.getActiveSheet().getName();

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
 * Updates the master clock in the Settings sheet.
 *
 */
function updateMasterClock() {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");  
  settingsSheet.getRange("B8").setValue(new Date());
  QueueTimerController.updateLiveQueueDurations();
}



