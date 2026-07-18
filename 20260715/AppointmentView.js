/**
 * ====================================================================================
 *  AppointmentView.gs
 *  Applies controller results to the spreadsheet.
 *  INSERT_CHECKBOXES -> Inserts checkboxes into the Appointments tab
 *  CREATE_ACTIVITY_LOG_ENTRY -> Creates a new entry in the Activity_Log tab
 *  MOVE_NO_SHOWS -> Moves all no shows to the No Shows tab
 *  CLEAR_APPOINTMENTS -> Clears the Appointments tab to get ready for the next day
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

    // Insert checkboxes in Check In column (E)
    if (result.action === "INSERT_CHECKBOXES") {
      insertCheckboxes(ss, apptSheet, result);
    }

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
   * Inserts checkboxes in column E of the Appointments sheet
   */
  function insertCheckboxes(ss, apptSheet, result) {

    const checkboxesRange = apptSheet.getRange(result.rows[0], 5, result.rows[1] - 1, 1);
    const checkboxRule = SpreadsheetApp.newDataValidation()
      .requireCheckbox()
      .setAllowInvalid(false)
      .build();
    checkboxesRange.setDataValidation(checkboxRule);
  }

function createActivityLog_(ss, apptSheet, result) {
  // Extract entry fields cleanly from your payload
  const apptEntry = {
    firstName: result.entry.firstName,
    lastName: result.entry.lastName,
    ssnLast4: "", 
    taxYear: "", 
    firstNameSpouse: "",
    lastNameSpouse: ""
  };

  // 1. Run the relational database operations
  const taxReturnId = DatabaseController.processCheckInTransaction(ss, apptEntry);

  // 2. Mark the appointment sheet timeline timestamp exactly as before
  apptSheet.getRange(result.row, 6).setValue(result.entry.checkedInTime);

  // 3. Flush changes to secure the database transaction instantly
  SpreadsheetApp.flush();

  // 4. Alert user interface confirmation
  const ui = SpreadsheetApp.getUi();
  ui.alert(
      'Checked in taxpayer',
      'Name: ' + apptEntry.firstName.toUpperCase() + " " + apptEntry.lastName.toUpperCase() + "\n" +
      'Database Track ID: ' + taxReturnId,
      ui.ButtonSet.OK
  );
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
    });
  }

  /**
   * Invoked by the End of the Day menu item, this function clears all of the day's 
   * appointment entries from the Appointments sheet and clears the checkboxes from column E
   */
  function clearAllAppointments_(apptSheet) {
    if (apptSheet.getLastRow() > 1) {
      const rangeToClear = apptSheet.getRange(2, 1, apptSheet.getLastRow() - 1, apptSheet.getLastColumn());
      rangeToClear.setDataValidation(null);
      rangeToClear.clearContent();
    }
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
      dynamicDateTime.setHours(hours, minutes, 0, 0);

      // 4. Transform the object into the requested string blueprint
      // Using the current active spreadsheet's time zone definition ensures alignment
      const timeZone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
      const finalizedFormat = Utilities.formatDate(dynamicDateTime, timeZone, "M/d/yyyy HH:mm");

      return finalizedFormat;

    } catch (err) {
        console.error(`Error constructing formatted datetime string: ${err.message}`);
        return null;
    }
  }

  return {
    applyAppointmentResult,
    moveNoShows_,
    getFormattedDateTimeString
  };

})();
