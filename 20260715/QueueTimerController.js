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

      const lastRow = logSheet.getLastRow();
      if (lastRow <= 1) return; // Queue is empty

      const COL = ActivityLogModel.getColumns();

      // Read entire Activity_Log sheet data range to evaluate check-in timestamps and statuses
      const dataRange = logSheet.getRange(2, 1, lastRow - 1, logSheet.getLastColumn());
      const values = dataRange.getValues();

      const durationValues = [];
      const now = new Date();

      // Define which statuses keep the clock running. All other statuses will freeze the duration at its last recorded value.
      const activeStatuses = ["Checked In", "Assigned", "Ready for Review", "In Review"];

      // Calculate running minutes
      for (let i = 0; i < values.length; i++) {
        const rowData = values[i];
        const checkInTime = rowData[COL.CHECKIN_TIME - 1];
        const status = rowData[COL.STATUS - 1]; // Grab the status of the current row
        const currentDuration = rowData[COL.DURATION - 1]; // Grab the cumulative duration text from Column L (Column 12)

        // Guard against manual entry anomalies or incomplete data
        if (!checkInTime || !(checkInTime instanceof Date)) {
          durationValues.push(["--"]);
          continue;
        }

        // If tax return is in active status, calculate new time. Otherwise, freeze existing time.
        if (activeStatuses.includes(status)) {
          const elapsedMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / 60000);
          durationValues.push([elapsedMinutes + " min"]);
        } else {
          // It's in a terminal or paused state (e-Filed, Incomplete, Rejected. Complete or any of the TERMINAL), 
          // freeze the duration at its last recorded value. This prevents the clock from advancing for completed or paused returns.
          // Push the currently recorded duration to stop the clock from advancing
          durationValues.push([currentDuration]);
        }
      }

    // Batch target column updates to minimize sheet recalculation lag
    const durationRange = logSheet.getRange(2, COL.DURATION, durationValues.length, 1);
    durationRange.setValues(durationValues);

    // Clean up any trailing rows beyond the last active row 
    // to prevent ghost formatting or stale data from lingering in the queue
    const maxRowsInSheet = logSheet.getMaxRows();
    const nextEmptyRow = lastRow + 1;
    
    if (maxRowsInSheet >= nextEmptyRow) {
      const trailingRowsCount = (maxRowsInSheet - nextEmptyRow) + 1;
      const trailingRange = logSheet.getRange(nextEmptyRow, COL.DURATION, trailingRowsCount, 1);
      trailingRange.clearContent(); // Just clear content, let conditional formatting handle the rest
    }

    } catch (err) {
      Logger.log(`CRITICAL: Error inside QueueTimerController processing: ${err.stack}`);
    }
  }

  return {
    updateLiveQueueDurations
  };

})();