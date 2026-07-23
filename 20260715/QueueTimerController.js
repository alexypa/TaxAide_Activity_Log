/**
 * QueueTimerController.gs
 * Executed every minute via time-driven background script trigger.
 */
const QueueTimerController = (() => {

  /**
   * Main entry point mapped to your 1-minute background clock trigger.
   */
  function updateLiveQueueDurations() {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      const logSheet = ss.getSheetByName("Activity_Log");
      const settingsSheet = ss.getSheetByName("Settings");

      const lastRow = logSheet.getLastRow();
      if (lastRow <= 1) return; // Queue is empty

      const COL = ActivityLogModel.getColumns();

      // 1. Fetch Threshold parameters dynamically from rows 9 & 10 of Settings tab
      const xThresholdMinutes = Number(settingsSheet.getRange(9, 2).getValue()) || 30; // e.g., 30 mins
      const yThresholdMinutes = Number(settingsSheet.getRange(10, 2).getValue()) || 60; // e.g., 60 mins

      // 2. Read entire dashboard data range to evaluate check-in timestamps
      const dataRange = logSheet.getRange(2, 1, lastRow - 1, logSheet.getLastColumn());
      const values = dataRange.getValues();

      const durationValues = [];
      const fontColors = [];
      const backgroundColors = [];
      const now = new Date();

      // 3. Calculate running minutes and map hexadecimal alert profiles
      for (let i = 0; i < values.length; i++) {
        const rowData = values[i];
        const checkInTime = rowData[COL.CHECKIN_TIME - 1];

        // Guard against manual entry anomalies or incomplete data
        if (!checkInTime || !(checkInTime instanceof Date)) {
          durationValues.push(["--"]);
          fontColors.push(["#000000"]); // Black Text
          backgroundColors.push(["#ffffff"]); // Clear White
          continue;
        }

        // Calculate chronological delta in raw minutes
        const elapsedMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / 60000);
        durationValues.push([elapsedMinutes + " min"]);

        // Apply Hex styling based on Settings configurations
        if (elapsedMinutes < xThresholdMinutes) {
          backgroundColors.push(["#055c10"]);
          fontColors.push(["#ffffff"]); // White Text
        } else if (elapsedMinutes >= xThresholdMinutes && elapsedMinutes < yThresholdMinutes) {
          backgroundColors.push(["#daac16"]); // Soft Warning Orange/Yellow
          fontColors.push(["#ffffff"]); // White Text
        } else {
          backgroundColors.push(["#db0f20"]); // Soft Critical Red Alert
          fontColors.push(["#ffffff"]); // White Text
        }
      }

    // 4. Batch target column updates to minimize sheet recalculation lag
    const durationRange = logSheet.getRange(2, COL.DURATION, durationValues.length, 1);
    durationRange.setValues(durationValues);
    durationRange.clearDataValidations();
    durationRange.setBackgrounds(backgroundColors);
    durationRange.setFontColors(fontColors);

    // TARGET ALL MATERIAL CELL RANGES ALL THE WAY TO THE MAXIMUM SHEET BOUNDARY
    const maxRowsInSheet = logSheet.getMaxRows();
    const nextEmptyRow = lastRow + 1;
    
    if (maxRowsInSheet >= nextEmptyRow) {
      const trailingRowsCount = (maxRowsInSheet - nextEmptyRow) + 1;
      const trailingRange = logSheet.getRange(nextEmptyRow, COL.DURATION, trailingRowsCount, 1);
      trailingRange.clearContent();
      trailingRange.setBackground("#ffffff"); // Revert any trailing fields to standard transparent white
      trailingRange.setFontColor("#000000"); // Revert any trailing fields to standard black text
    }

    } catch (err) {
      Logger.log(`CRITICAL: Error inside QueueTimerController processing: ${err.stack}`);
    }
  }

  return {
    updateLiveQueueDurations
  };

})();