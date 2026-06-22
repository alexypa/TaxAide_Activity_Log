/**
 * ====================================================================================
 *  AppointmentView.gs
 *  Applies controller results to the spreadsheet.
 *  CREATE_ACTIVITY_LOG_ENTRY -> Creates a new entry in the Activity_Log tab
 *  MOVE_NO_SHOWS -> Move all no shows to the No SHows tab
 *  CLEAR_APPOINTMENTS -> Clears the Appointments sheet to get ready for the next day
 * ====================================================================================
 */

const AppointmentView = (() => {

  function applyAppointmentResult(result) {

    // No op if result object does not exist or result contains "ignore"
    if (!result || result.ignore) return;

    const ss = SpreadsheetApp.getActive();
    const apptSheet = ss.getSheetByName("Appointments");

    // Create Activity_Log entry
    if (result.action === "CREATE_ACTIVITY_LOG_ENTRY") {
      createActivityLog_(ss, apptSheet, result);
    }

    // Move no show from Appointments to No Show tab
    if (result.action === "MOVE_NO_SHOWS") {
      moveNoShows_(ss, result);
    }

    // Clear entire Appointments sheet - ready for next day
    if (result.action === "CLEAR_APPOINTMENTS") {
      clearAllAppointments_(apptSheet);
    }
  }

  function createActivityLog_(ss, apptSheet, result) {
    const log = ss.getSheetByName("Activity_Log");
    // Append to Activity Log
      log.appendRow([
        result.entry.checkInTime,
        "", "", // Ticket, SSN blank
        result.entry.firstName.toUpperCase(),
        result.entry.lastName.toUpperCase(),
        "", "", "", // Tax Year, Counselor, Reviewer blank
        "Checked In", // Status
        "" // Comments blank
      ]);
    // Write timestamp + mark processed on Appointments sheet row
    apptSheet.getRange(result.row, 6).setValue(result.entry.checkInTime); // Timestamp
    apptSheet.getRange(result.row, 7).setValue(true); // Processed
  }

  function moveNoShows_(ss, result) {
    const noShowSheet = ss.getSheetByName("No Shows");
    result.rows.forEach(r => {
      const row = [
        getDayTime_(r.apptTime),
        r.firstName.toUpperCase(),
        r.lastName.toUpperCase(),
        r.phone
      ]
      noShowSheet.appendRow(row);
    });
  }

  function clearAllAppointments_(apptSheet) {
    if (apptSheet.getLastRow() > 1) {
      apptSheet.getRange(2, 1, apptSheet.getLastRow() - 1, apptSheet.getLastColumn()).clearContent();
    }
  }

  /**
   * Helper function to combine hours and minutes of appointment with today's date
   */
  function getDayTime_(value)  {
    // 1. Create a date object representing today
    const today = new Date();

    let hours = 0;
    let minutes = 0;

    // 2. Handle if the value comes in as a JavaScript Date object
    if (value instanceof Date) {
      hours = value.getHours();
      minutes = value.getMinutes();
    } else if (typeof value === 'string') {
        // 3. Handle if the value comes in as a raw formatted string (e.g., "02:30 PM")
        const match = timeValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (!match) {
          throw new Error("Time format must be HH:MM AM/PM. Received: " + value);
        }
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();

        if (ampm === 'PM' && hours <12) {
          hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0;
        }
      } else {
        throw new Error("Unsupported time format or empty cell");
      }
    // 4. Set today's date to the target hours, minutes, seconds, miliseconds
    today.setHours(hours, minutes, 0, 0);
    return today;
  }

  return {
    applyAppointmentResult,
  };

})();
