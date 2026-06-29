/**
 * SettingsModel.gs
 * Reads configuration values from the Settings sheet.
 */

const SettingsModel = (() => {

  const SHEET = "Settings";

  function getSheet_() {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName(SHEET);
    if (!sheet) throw new Error(SHEET + " sheet not found.");
    return sheet;
  }

  function getValue_(key) {
    const sheet = getSheet_();
    const values = sheet.getRange(1,1, sheet.getLastRow(), 2).getValues();
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === key) {
        return values[i][1];
      }
    }
    throw new Error("Settings key not found: " + key);
  }

  function getAllowedYears() {
    const raw = getValue_("AllowedYears");
    return raw.toString().split(",").map(y => y.trim());
  }

  function getDefaultYear() {
    return getValue_("DefaultYear").toString().trim();
  }

  function getSeasonName() {
    return getValue_("SeasonName").toString().trim();
  }

  function getAppointmentSite() {
    return getValue_("Appointment Site");
  }

  function getShowSSNL4() {
    return getValue_("Show SSN Last 4");
  }

  function getShowTicketNo() {
    return getValue_("Show Ticket No");
  }

  function getShowCheckInTime() {
    return getValue_("Show CheckIn Time");
  }

  return {
    getAllowedYears,
    getDefaultYear,
    getSeasonName,
    getAppointmentSite,
    getShowSSNL4,
    getShowTicketNo,
    getShowCheckInTime
  };

})();
