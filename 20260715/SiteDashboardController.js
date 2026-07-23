/**
 * ============================================================
 *  SiteDashboardController.gs
 *  Business logic and update handler for the Site Dashboard tab.
 * ============================================================
 */

const SiteDashboardController = (() => {

  function refreshDashboard() {
    const rawMetrics = SiteDashboardModel.calculateMetrics();

    // Compute Derived Totals
    const compileSet = (m) => {
      const completed = m.efiledAccepted + m.paper;
      const incomplete = m.waitingForCompletion + m.rejected;
      const totalServed = completed + incomplete + m.deactivated + m.noReturn;

      return {
        completedTotal: completed,
        efiledAccepted: m.efiledAccepted,
        paper: m.paper,
        incompleteTotal: incomplete,
        waitingForCompletion: m.waitingForCompletion,
        rejected: m.rejected,
        deactivated: m.deactivated,
        noReturn: m.noReturn,
        totalServed: totalServed,
        sessionsCount: m.uniqueSessions,
        volunteersCount: m.activeVolunteers
      };
    };

    const stdCompiled = compileSet(rawMetrics.std);
    const recentCompiled = compileSet(rawMetrics.recent);

    const percentCompleted = ((rawMetrics.std.uniqueSessions / rawMetrics.totalPlannedSessions) * 100).toFixed(1) + "%";

    const payload = {
      mostRecentDateLabel: rawMetrics.mostRecentDateLabel,
      totalPlannedSessions: rawMetrics.totalPlannedSessions,
      percentCompleted: percentCompleted,
      std: stdCompiled,
      recent: recentCompiled
    };

    SiteDashboardView.renderDashboard(payload);
  }

  return {
    refreshDashboard
  };

})();