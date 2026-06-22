/**
 * ActivityLogController.gs — DIAGNOSTIC VERSION
 */

const ActivityLogController = (() => {

  function handleActivityLogEdit(e) {

    Logger.log("CONTROLLER CALLED: row=%s col=%s value=%s",
      e.range.getRow(), e.range.getColumn(), e.range.getValue());

    const sheet = e.range.getSheet();
    if (sheet.getName() !== "Activity_Log") {
      Logger.log("IGNORED: Not Activity_Log sheet");
      return { ignore: true };
    }

    const row = e.range.getRow();
    const col = e.range.getColumn();
    const value = e.range.getValue();

    if (row < 2) {
      Logger.log("IGNORED: Header row");
      return { ignore: true };
    }

    const COL = ActivityLogModel.getColumns();
    Logger.log("CONTROLLER COLUMN MAP: %s", JSON.stringify(COL));

    // Allowed greeter fields
    if ([COL.TICKET, COL.SSN, COL.TAXYEAR, COL.COMMENTS].includes(col)) {
      Logger.log("IGNORED: Greeter editable field");
      return { ignore: true };
    }

    // Forbidden fields
    if ([COL.CHECKIN_TIME, COL.COUNSELOR, COL.REVIEWER, COL.STATUS].includes(col)) {
      Logger.log("FORBIDDEN EDIT DETECTED");
      return {
        ok: false,
        action: "FORBIDDEN_EDIT",
        row,
        col,
        message: "This field is managed by the system. Manual edits are not allowed."
      };
    }

    // Check-in detection
    if (col === COL.FIRST || col === COL.LAST) {

      Logger.log("CHECK-IN LOGIC ENTERED");

      const rowData = ActivityLogModel.getRow(row);

      const first = (col === COL.FIRST) ? value : rowData.firstName;
      const last  = (col === COL.LAST)  ? value : rowData.lastName;

      Logger.log("CHECK-IN EVAL: first='%s' last='%s' status='%s' checkInTime='%s'",
        first, last, rowData.status, rowData.checkInTime);

      const alreadyCheckedIn =
        rowData.status === "Checked In" || !!rowData.checkInTime;

      if (first && last && !alreadyCheckedIn) {
        Logger.log("CHECK-IN TRIGGERED!");
        return {
          ok: true,
          action: "CHECK_IN",
          row,
          checkInTime: new Date(),
          status: "Checked In"
        };
      }

      Logger.log("CHECK-IN NOT TRIGGERED");
    }

    Logger.log("CONTROLLER: No action");
    return { ignore: true };
  }

  return { handleActivityLogEdit };

})();
