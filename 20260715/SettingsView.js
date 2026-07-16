/**
 * ============================================================
 *  SettingsView.gs
 *  Applies settings to the spreadsheet.
 * ============================================================
 */

const SettingsView = (() => {

  function applySettingsToSpreadsheet(settings) {

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Hide Settings and Registry tabs for all sites
    ss.getSheetByName("Settings").hideSheet();
    ss.getSheetByName("Local_Registry").hideSheet();

    const apptSheet = ss.getSheetByName("Appointments");
    const noShowsSheet = ss.getSheetByName("No Shows");

    // Only appointment sites should show the Appointments and No Shows tabs
    settings.apptSite ? apptSheet.showSheet() : apptSheet.hideSheet();
    settings.apptSite ? noShowsSheet.showSheet() : noShowsSheet.hideSheet();

    // Show or hide Check In Time, SSN Last 4, and Ticket # columns based on their settings on the Activity_Log tab
    const activityLogSheet = ss.getSheetByName("Activity_Log");
    settings.showCheckInTime ? // Check In Time column
        activityLogSheet.showColumns(1) : 
        activityLogSheet.hideColumns(1);
    settings.apptSite ? // Ticket # Column
        activityLogSheet.hideColumns(2) : 
        activityLogSheet.showColumns(2);
    settings.showSSNL4 ? // SSN Last 4 column
        activityLogSheet.showColumns(3) : 
        activityLogSheet.hideColumns(3); 

    // Show Appointment Date/Time only on appointment sites on the Incomplete tab
    const incompleteSheet = ss.getSheetByName("Incomplete");
    settings.showSSNL4 ?
        incompleteSheet.showColumns(3) :
        incompleteSheet.hideColumns(3);

    // Show Appointment Date/Time only on appointment sites on the Archive tab
    const archiveSheet = ss.getSheetByName("Archive");
    settings.showSSNL4 ?
          archiveSheet.showColumns(2) :
          archiveSheet.hideColumns(2);

  }

  return {
    applySettingsToSpreadsheet
  }

})();
