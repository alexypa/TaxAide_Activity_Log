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

  function getSiteName() {
    return getValue_("Site Name");
  }

  function getAppointmentSite() {
    return getValue_("Appointment Site");
  }

  function getShowSSNL4() {
    return getValue_("Show SSN Last 4");
  }

  function getShowCheckInTime() {
    return getValue_("Show CheckIn Time");
  }

  function getCurrentTaxYear() {
    return getValue_("Current Tax Year").toString().trim();
  }

  function getYearsReturnsFiled() {
    const raw = getValue_("Years Returns Filed");
    return raw.toString().split(",").map(y => y.trim());
  }

  return {
    getSiteName,
    getAppointmentSite,
    getShowSSNL4,
    getShowCheckInTime,
    getCurrentTaxYear,
    getYearsReturnsFiled
  };

})();
