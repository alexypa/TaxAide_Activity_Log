/**
 * ============================================================
 *  AppointmentController.gs
 *  Handles appointment check-ins and end-of-day processing.
 *  Pure controller logic — no UI, no formatting.
 * ============================================================
 */

const AppointmentController = (() => {

  /**
   * Called by Main onEdit when an edit occurs on the Appointments sheet.
   * Handles check-in events only.
   */
  function handleAppointmentEdit(e) {
    const sheetName = e.range.getSheet().getName();
    if (sheetName !== "Appointments") return { ok: true, ignore: true };

    const col = e.range.getColumn();
    const row = e.range.getRow();
    const newValue = e.range.getValue();

    // Ignore edits in any column other that column E (Check In) and in header row
    if (col !== 5 || row === 1) return { ok: true, ignore: true };

    // Ignore unchecking
    if (newValue !== true) return { ok: true, ignore: true };

    // Read row data
    const appt = AppointmentModel.getAppointmentRow(row);

    // Prevent double-processing
    if (appt.checkedInTime) {
      return { ok: false, message: "Appointment already processed." };
    }

    // Build Activity Log entry
    const entry = {
      checkedInTime : new Date(),
      firstName: appt.firstName.toUpperCase(),
      lastName: appt.lastName.toUpperCase()      
    };

    return {
      ok: true,
      action: "CREATE_ACTIVITY_LOG_ENTRY",
      entry,
      row
    }; 
  }

  /**
   * End-of-day: Move no-shows from the Appointment sheet to the No Show sheet.
   */
  function processNoShows() {
    const appts = AppointmentModel.getAllAppointments();  

    // No Shows are out appointments that were not previously processed by moving them to the Activity_Log tab 
    // or rows that have no names associated with them, namely rows with only unchecked checkboxes 
    const noShows = appts.filter(r => !r.checkedIn && !r.CheckedInTime && r.firstName !== "" && r.lastName !== "");   

    return {
      ok: true,
      action: "MOVE_NO_SHOWS",
      rows: noShows
    };
  }

  /**
   * End-of-day: Clear the Appointments sheet (except header).
   */
  function clearAppointments() {
    return {
      ok: true,
      action: "CLEAR_APPOINTMENTS"
    };
  }

  return {
    handleAppointmentEdit,
    processNoShows,
    clearAppointments
  };
  
})();
