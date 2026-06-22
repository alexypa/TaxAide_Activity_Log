/**
 * SettingsModel.gs
 * Reads configuration values from the Settings sheet.
 */

const SettingsModel = (() => {

  const SHEET_NAME = "Settings";

  function getSheet_() {
    const ss = SpreadsheetApp.getActive();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error("Settings sheet not found.");
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

  return {
    getAllowedYears,
    getDefaultYear,
    getSeasonName
  };

})();
