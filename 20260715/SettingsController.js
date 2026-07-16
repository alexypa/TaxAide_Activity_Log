/**
 * ===================================================================
 *  SettingsController.gs
 *  Handles settings of the spreadsheet accroding to the SettingsModel
 * ===================================================================
 */

const SettingsController = (() => {

  function configureSpreadsheet() {

    const apptSite = SettingsModel.getAppointmentSite();
    const showSSNL4 = SettingsModel.getShowSSNL4();
    const showCheckInTime = SettingsModel.getShowCheckInTime();

    const settings = {
      apptSite,
      showSSNL4,
      showCheckInTime
    }

    SettingsView.applySettingsToSpreadsheet(settings);

  }

  return {
    configureSpreadsheet
  };

})();