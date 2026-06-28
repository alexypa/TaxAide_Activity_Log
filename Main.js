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
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu("TaxAide")
    .addItem("End of Day Process", "menuEndOfDayProcess_")
    .addToUi();

    SettingsController.configureSpreadsheet(); 
}

function onEdit(e) {
  // Do nothing. onEditHandler will be triggered by an installable trigger
}

/**
 * ============================================================
 *  Main onEdit router
 *  Fires every time a cell or range is edited
 * ============================================================
 */
function onEditHandler(e) {
  try {
    if (!e || !e.range || !e.source) return;

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

  } catch (err) {
    Logger.log("Error in onEdit: " + err);
    SpreadsheetApp.getUi().alert("Error in onEdit: " + err);
  }
}

/**
 * Menu item processor
 * Process no shows and clear appointment sheet for next day
 */
function menuEndOfDayProcess_() {
  // Move no shows to No Show tab
  AppointmentView.applyAppointmentResult(AppointmentController.processNoShows());

  // Clear Appointment tab for next day
  AppointmentView.applyAppointmentResult(AppointmentController.clearAppointments());
}



