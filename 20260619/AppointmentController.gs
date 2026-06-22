/**
 * ============================================================
 *  AppointmentController.gs
 *  Handles appointment check-ins and end-of-day processing.
 *  Pure controller logic — no UI, no formatting.
 * ============================================================
 */

const AppointmentController = (() => {

  /**
   * Called by onEditRouter when an edit occurs on the Appointments sheet.
   * Handles check-in events only.
   */
  function handleAppointmentEdit(model, e) {
    const sheetName = e.range.getSheet().getName();
    if (sheetName !== "Appointments") return { ok: true, ignore: true };

    const col = e.range.getColumn();
    const row = e.range.getRow();
    const newValue = e.range.getValue();

    // Only process edits in column A (Check In)
    if (col !== 1 || row === 1) return { ok: true, ignore: true };

    // Ignore unchecking
    if (newValue !== true) return { ok: true, ignore: true };

    // Read row data
    const appt = model.getAppointmentRow(row);

    // Prevent double-processing
    if (appt.processed === true) {
      return { ok: false, message: "Appointment already processed." };
    }

    // Build Activity Log entry
    const entry = {
      checkInTime: new Date(),
      firstName: appt.firstName,
      lastName: appt.lastName,
      phone: appt.phone,
      apptTime: appt.apptTime,
      comments: `Appointment @ ${appt.apptTime}`
    };

    return {
      ok: true,
      action: "CREATE_ACTIVITY_LOG_ENTRY",
      entry,
      row
    };
  }


  /**
   * End-of-day: Move no-shows to No Show sheet.
   */
  function processNoShows(model) {
    const appts = model.getAllAppointments();
    const noShows = appts.filter(r => !r.checkedIn && !r.processed);

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
