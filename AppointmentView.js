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

  /**
   * A router for Appointment sheet events
   */
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

  /**
   * Creates an activity log entry by clocking on the Check In checkbox
   * on the Appointment sheet.
   * The log transfers the first and last name of the taxpayer to the Activity_Log sheet,
   * timestamps the log when the taxpayer checks in an sets the status to 'Checked In'
   * It also timestamps the Appointment sheet and marks the entry as 'processed' 
   */
  function createActivityLog_(ss, apptSheet, result) {

    const activityLogSheet = ss.getSheetByName("Activity_Log");
    const COL = ActivityLogModel.getColumns();
    const row = [
      result.entry.checkedInTime,
      "", "", // Ticket, SSN blank
      result.entry.firstName.toUpperCase(),
      result.entry.lastName.toUpperCase(),
      "", "", "", // Tax Year, Counselor, Reviewer blank
      "Checked In", // Status
      "" // Comments blank
      ]
    
    activityLogSheet.appendRow(row);

    const newRow = activityLogSheet.getLastRow();    
    activityLogSheet.getRange(newRow, COL.CHECKIN_TIME).setNumberFormat("h:mm AM/PM");
    
    // Write timestamp on Appointments sheet row
    apptSheet.getRange(result.row, 6).setValue(result.entry.checkedInTime); // Time stamp
  }

  /**
   * Invoked by the End of the Day menu item, this function moves all no shows
   * to the No Shows sheet
   */
  function moveNoShows_(ss, result) {
    const noShowSheet = ss.getSheetByName("No Shows");
    result.rows.forEach(r => {
      const row = [
        getFormattedDateTimeString(r.apptTime),
        r.firstName.toUpperCase(),
        r.lastName.toUpperCase(),
        r.phone
      ]
      noShowSheet.appendRow(row);
      //const newRow = noShowSheet.getLastRow();
      //oShowSheet.getRange(newRow, 1).setNumberFormat("YYYY-MM-DD");
    });
  }

  /**
   * Combines today's calendar date with a provided time value (Date object or string)
   * and returns a string formatted exactly as "M/d/YYYY HH:mm:ss".
   *
   * @param {Date|string} timeValue - The raw time value to parse.
   * @return {string|null} The formatted date-time string, or null if parsing fails.
   */
  function getFormattedDateTimeString(timeValue) {
    try {
      let hours = 0;
      let minutes = 0;
      let isValid = false;

      // 1. PATH A: Value is already a native Date object
      if (timeValue instanceof Date && !isNaN(timeValue.getTime())) {
        hours = timeValue.getHours();
        minutes = timeValue.getMinutes();
        isValid = true;
      } 
      // 2. PATH B: Value is a raw text string (e.g., "6:27 PM", "18:27")
      else if (typeof timeValue === 'string' && timeValue.trim() !== "") {
        const timeStr = timeValue.trim().toUpperCase();
        
        // RegEx to capture hours, minutes, and optional AM/PM designator
        const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
        
        if (timeMatch) {
          let extractedHours = parseInt(timeMatch[1], 10);
          const extractedMinutes = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3];

          if (ampm) {
            // Standard 12-hour AM/PM conversion
            if (ampm === "PM" && extractedHours < 12) extractedHours += 12;
            if (ampm === "AM" && extractedHours === 12) extractedHours = 0;
          }

          // Validate boundary constraints
          if (extractedHours >= 0 && extractedHours < 24 && extractedMinutes >= 0 && extractedMinutes < 60) {
            hours = extractedHours;
            minutes = extractedMinutes;
            isValid = true;
          }
        }
      }

      if (!isValid) {
        console.warn(`⚠️ Unparseable time format parameter: "${timeValue}"`);
        return null;
      }

      // 3. Construct a fresh Date object anchored precisely to today's date context
      const dynamicDateTime = new Date();
      
      // Set the parsed hours and minutes. 
      // We explicitly set seconds and milliseconds to match the current actual moment.
      dynamicDateTime.setHours(hours, minutes, new Date().getSeconds(), 0);

      // 4. Transform the object into the requested string blueprint
      // Using the current active spreadsheet's time zone definition ensures alignment
      const timeZone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
      const finalizedFormat = Utilities.formatDate(dynamicDateTime, timeZone, "M/d/yyyy HH:mm:ss");

      return finalizedFormat;

    } catch (err) {
      console.error(`Error constructing formatted datetime string: ${err.message}`);
      return null;
    }
  }

  /**
   * Invoked by the End of the Day menu item, this function clears all of the day's 
   * appointment entries from the Appointments sheet
   */
  function clearAllAppointments_(apptSheet) {
    if (apptSheet.getLastRow() > 1) {
      apptSheet.getRange(2, 1, apptSheet.getLastRow() - 1, apptSheet.getLastColumn()).clearContent();
    }
  }

  return {
    applyAppointmentResult,
    moveNoShows_,
    getFormattedDateTimeString
  };

})();
