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
/**
 * Standard Google Apps Script entry point that fires automatically 
 * when the Spreadsheet workbook is opened by any user.
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu("TaxAide Operations")
    .addItem("🔄 Refresh Activity Log", "runDashboardRefresh")
    .addSeparator()
    .addItem("🌙 Execute End-of-Day Sweep", "runEndOfDaySweep")
    .addSeparator()
    .addItem("Refresh Dashboard", "SiteDashboardController.refreshDashboard")
    .addToUi();

  // Grab a lock so if 3 volunteers open the sheet at 8:59 AM, 
  // they don't all try to delete and redraw the Activity_Log at the exact same time.
  const lock = LockService.getDocumentLock();
  try {
    // Only wait 2 seconds on open. If someone else is already rebuilding the dashboard, 
    // it will time out silently and just let the other person's rebuild populate the screen.
    if (lock.tryLock(2000)) {
      DashboardController.refreshDailyDashboard();
    }
  } catch (err) {
    Logger.log(`Automated onOpen dashboard compile failed: ${err.message}`);
  } finally {
    lock.releaseLock();
  }
}

function runDashboardRefresh() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "🔄 Refreshing Activity_Log Sheet",
    "This operation will rebuild the Activity_Log sheet with current data.\n\n" +
    "The process may take a few moments, depending on the size of the database.\n" +
    "Please wait for the confirmation message before proceeding with any other operations.",
    ui.ButtonSet.OK_CANCEL
  );

  if (response !== ui.Button.OK) return;

  const lock = LockService.getDocumentLock();
  try {
    // Wait up to 10 seconds if another background process is doing something
    lock.waitLock(10000);
    SpreadsheetApp.getActiveSpreadsheet().toast("Compiling database logs...", "System Sync", 3);
    
    DashboardController.refreshDailyDashboard();
    SpreadsheetApp.flush(); // Force the visual update before releasing the lock
    
    SpreadsheetApp.getActiveSpreadsheet().toast("The Activity_Log sheet is up to date!", "Sync Success", 3);
  } catch (err) {
    Logger.log(`Activity_Log sheet refresh failed: ${err.message}`);
    ui.alert("System Busy", "The system is currently processing another request. Please try refreshing again in a few seconds.", ui.ButtonSet.OK);
  } finally {
    lock.releaseLock();
  }
}

function runEndOfDaySweep() {
  const lock = LockService.getDocumentLock();
  try {
    // End of Day sweep is a massive data movement. We must absolutely ensure 
    // nobody else is running it, and nobody is checking in a taxpayer.
    lock.waitLock(15000); 
    
    EodController.executeEndOfDaySweep();
    SpreadsheetApp.flush(); // Secure the sweeping changes
    
  } catch (err) {
    Logger.log(`End-of-Day sweep failed: ${err.message}`);
    SpreadsheetApp.getUi().alert(
      "End of Day Sweep Blocked", 
      "Another process is currently running (likely another coordinator running the sweep). Please verify if the sweep has already been completed.", 
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } finally {
    lock.releaseLock();
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



