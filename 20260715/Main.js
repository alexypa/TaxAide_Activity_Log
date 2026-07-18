/**
 * Main.gs
 * This is the entry point to the application
 */

/**
 * =================================================================
 *  Main onOpen handler
 *  Fires when spreadsheet is opened for the first time or refreshed
 * =================================================================
 */
function onOpen(e) {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu("TaxAide")
    .addItem("First-Time Activation (Run Once Only)", "activateUserSession_")
    .addSeparator()
    .addItem("End of Day Process (Clears/Archives Logs)", "menuEndOfDayProcess_")
    .addToUi();

  // Configure the spreadsheet according to the site's settings
  SettingsController.configureSpreadsheet(); 

  securityCheck_(e);
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
 * Menu item processor
 * Process no shows and clear appointment sheet for next day
 */
function menuEndOfDayProcess_() {

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "Confirm End of Day Process",
    "This operation will:\n" +
    "\t* Archive all completed returns to the Archive sheet\n" +
    "\t* Transfer all incomplete returns to the Incomplete sheet\n" +
    "\t* Clear today's Activity_Log sheet\n\n" + 
    "If the site operates by appointment, this operation will also\n" +
    "\t* Clear the Appointment sheet, and\n" +
    "\t* Transfer the 'no shows' to the No Show sheet\n\n" + 
    "Are you sure you want to proceed?",
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  // Move no shows to No Show tab
  AppointmentView.applyAppointmentResult(AppointmentController.processNoShows());

  // Clear Appointment tab for next day
  AppointmentView.applyAppointmentResult(AppointmentController.clearAppointments());

  // Process activity logs - to Archive
  ActivityLogView.applyActivityLogResult(ActivityLogController.archiveActivityLogs());

  // Process activity logs - to Incomplete
  ActivityLogView.applyActivityLogResult(ActivityLogController.transferActivityLogsToIncomplete());

  // Clear Activity_Log sheet
  ActivityLogView.applyActivityLogResult(ActivityLogController.clearActivityLogs());
  
  // Notify user that End of Day Process is complete
    ui.alert(
      'Completed End of Day Process',
      '\t* Archived completed tax returns\n' +
      '\t* Transferred incomplete tax returns to Incomplete sheet\n' + 
      '\t* Cleared Activity_Log sheet\n',
      ui.ButtonSet.OK
  );
}

function updateMasterClock() {
  const settingsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Settings");  
  settingsSheet.getRange("B8").setValue(new Date());
}



