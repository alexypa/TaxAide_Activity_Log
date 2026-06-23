/**
 * Main.gs
 * This is the entry point to the application
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu("TaxAide")
    .addItem("End of Day Process", "menuEndOfDayProcess_")
    .addToUi();

    SettingsController.configureSpreadsheet(); 
}

function menuEndOfDayProcess_() {
  // Move no shows to No Show tab
  AppointmentView.applyAppointmentResult(AppointmentController.processNoShows());

  // Clear Appointment tab for next day
  AppointmentView.applyAppointmentResult(AppointmentController.clearAppointments());
}

/**
 * ============================================================
 *  Main onEdit router
 * ============================================================
 */
function onEdit(e) {
  try {
    if (!e || !e.range || !e.source) return;

    const sheet = e.source.getActiveSheet();
    const sheetName = sheet.getName();

    if (sheetName === "Appointments") {
      const result = AppointmentController.handleAppointmentEdit(e);
      AppointmentView.applyAppointmentResult(result);
      return;
    }

    if (sheetName === "Activity_Log") {

      const row = e.range.getRow();
      const col = e.range.getColumn();
      const COL = ActivityLogModel.getColumns();

      if (col === COL.STATUS) {
        const model = ActivityLogModel.getRow(row);
        const result = StateController.handleStatusEdit(model, e);

        if (!result.ok) {
          const oldValue = e.oldValue || model.status || "";
          e.range.setValue(oldValue);
          SpreadsheetApp.getUi().alert(result.message);
          return;
        }

        if (result.newStatus) {
          ActivityLogModel.setStatus(row, result.newStatus);
        }

        return;
      }

      if (col === COL.COUNSELOR || col === COL.REVIEWER) {
        const model = ActivityLogModel.getRow(row);
        const result =
          col === COL.COUNSELOR ? StateController.handleCounselorEdit(model, e) :
          col === COL.REVIEWER  ? StateController.handleReviewerEdit(model, e) :
                                  StateController.handleStatusEdit(model, e);

        if (!result.ok) {
          const oldValue = e.oldValue || "";   // previous cell content

          // Revert the edited cell to its previous value
          e.range.setValue(oldValue);

          SpreadsheetApp.getUi().alert(result.message);
          return;
        }

        if (result.newStatus) {
          ActivityLogModel.setStatus(row, result.newStatus);
        }

        return;
      }

      const result = ActivityLogController.handleActivityLogEdit(e);
      ActivityLogView.applyActivityLogResult(result);
      return;
    }

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
