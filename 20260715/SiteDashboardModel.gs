/**
 * ============================================================
 *  SiteDashboardModel.gs
 *  Data access and metrics calculator for the Site Dashboard.
 * ============================================================
 */

const SiteDashboardModel = (() => {

  // Total planned site sessions for the tax season
  const TOTAL_PLANNED_SESSIONS = 120;

  function calculateMetrics() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tz = ss.getSpreadsheetTimeZone();

    const activitySheet   = ss.getSheetByName("Activity_Log");
    const incompleteSheet = ss.getSheetByName("Incomplete");
    const archiveSheet    = ss.getSheetByName("Archive");

    // Read raw data from sheets
    const activityData = (activitySheet && activitySheet.getLastRow() > 1) 
      ? activitySheet.getRange(2, 1, activitySheet.getLastRow() - 1, 12).getValues() : [];

    const incompleteData = (incompleteSheet && incompleteSheet.getLastRow() > 1) 
      ? incompleteSheet.getRange(2, 1, incompleteSheet.getLastRow() - 1, 11).getValues() : [];

    const archiveData = (archiveSheet && archiveSheet.getLastRow() > 1) 
      ? archiveSheet.getRange(2, 1, archiveSheet.getLastRow() - 1, 12).getValues() : [];

    // Determine Most Recent Session Date
    const todayStr = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
    let mostRecentDateStr = todayStr;

    // Check last entry in Archive if today has no activity yet
    if (activityData.length === 0 && archiveData.length > 0) {
      const lastArchiveDate = archiveData[archiveData.length - 1][1]; // Check In Time / Timestamp
      if (lastArchiveDate instanceof Date) {
        mostRecentDateStr = Utilities.formatDate(lastArchiveDate, tz, "yyyy-MM-dd");
      }
    }

    // Metric Storage Objects
    const metrics = {
      mostRecentDateLabel: Utilities.formatDate(new Date(mostRecentDateStr.replace(/-/g, '/')), tz, "MM/dd/yyyy"),
      std: createBlankMetricSet(),
      recent: createBlankMetricSet(),
      totalPlannedSessions: TOTAL_PLANNED_SESSIONS
    };

    // Track unique session dates and active volunteers
    const stdSessionDates = new Set();
    const recentVolunteers = new Set();
    const stdVolunteers = new Set();

    // Categorization Logic Helper
    function categorize(rowDate, status, counselor, reviewer) {
      const isRecent = (rowDate === mostRecentDateStr);
      if (rowDate) stdSessionDates.add(rowDate);

      // Collect unique active volunteers
      if (counselor && counselor.toString().trim() !== "") {
        stdVolunteers.add(counselor.toString().trim().toUpperCase());
        if (isRecent) recentVolunteers.add(counselor.toString().trim().toUpperCase());
      }
      if (reviewer && reviewer.toString().trim() !== "") {
        stdVolunteers.add(reviewer.toString().trim().toUpperCase());
        if (isRecent) recentVolunteers.add(reviewer.toString().trim().toUpperCase());
      }

      // Map Statuses
      const normalizedStatus = status ? status.toString().trim() : "";

      // 1. Terminal States
      if (normalizedStatus === "Accepted") {
        metrics.std.efiledAccepted++;
        if (isRecent) metrics.recent.efiledAccepted++;
      } 
      else if (normalizedStatus === "Paper") {
        metrics.std.paper++;
        if (isRecent) metrics.recent.paper++;
      } 
      else if (normalizedStatus === "Deactivated") {
        metrics.std.deactivated++;
        if (isRecent) metrics.recent.deactivated++;
      } 
      else if (normalizedStatus === "No Return") {
        metrics.std.noReturn++;
        if (isRecent) metrics.recent.noReturn++;
      } 
      // 2. Incomplete / Non-Terminal States
      else if (normalizedStatus === "Rejected") {
        metrics.std.rejected++;
        if (isRecent) metrics.recent.rejected++;
      } 
      else {
        // Includes: e-Filed, Checked In, Assigned, Ready for Review, In Review, Complete, Incomplete
        metrics.std.waitingForCompletion++;
        if (isRecent) metrics.recent.waitingForCompletion++;
      }
    }

    // Process Activity_Log (Active, non-terminal returns)
    activityData.forEach(r => {
      const rowDate = r[1] instanceof Date ? Utilities.formatDate(r[1], tz, "yyyy-MM-dd") : todayStr;
      categorize(rowDate, r[9], r[7], r[8]);
    });

    // Process Incomplete (Paused/In-progress returns)
    incompleteData.forEach(r => {
      const rowDate = r[1] instanceof Date ? Utilities.formatDate(r[1], tz, "yyyy-MM-dd") : todayStr;
      categorize(rowDate, r[8], r[6], r[7]);
    });

    // Process Archive (Historical completed & terminal returns)
    archiveData.forEach(r => {
      const rowDate = r[1] instanceof Date ? Utilities.formatDate(r[1], tz, "yyyy-MM-dd") : todayStr;
      categorize(rowDate, r[9], r[7], r[8]);
    });

    // Final Summaries
    metrics.std.uniqueSessions = stdSessionDates.size || 1;
    metrics.recent.uniqueSessions = 1;

    metrics.std.activeVolunteers = stdVolunteers.size;
    metrics.recent.activeVolunteers = recentVolunteers.size;

    return metrics;
  }

  function createBlankMetricSet() {
    return {
      efiledAccepted: 0,
      paper: 0,
      waitingForCompletion: 0,
      rejected: 0,
      deactivated: 0,
      noReturn: 0,
      uniqueSessions: 0,
      activeVolunteers: 0
    };
  }

  return {
    calculateMetrics
  };

})();