/**
 * ActivityLogController.gs — Updated for unified ActivityLogModel
 */

const ActivityLogController = (() => {

  function handleActivityLogEdit(e) {

    const sheet = e.range.getSheet();
    if (sheet.getName() !== "Activity_Log") return { ignore:true };

    const row = e.range.getRow();
    const col = e.range.getColumn();
    const value = e.range.getValue();

    if (row < 2) return { ignore:true };

    const COL = ActivityLogModel.getColumns();

    if ([COL.TICKET, COL.SSN_LAST4, COL.TAXYEAR, COL.COMMENTS].includes(col)) {
      return { ignore:true };
    }

    if ([COL.CHECKIN_TIME].includes(col)) {
      return {
        ok:false,
        action:"FORBIDDEN_EDIT",
        row, col,
        message:"Check-in time is managed by the system."
      };
    }

    if (col === COL.FIRST || col === COL.LAST) {

      const rowData = ActivityLogModel.getRow(row);

      const rawFirst = (col === COL.FIRST) ? value : rowData.firstName;
      const rawLast  = (col === COL.LAST)  ? value : rowData.lastName;

      const first = rawFirst ? String(rawFirst).toUpperCase() : "";
      const last  = rawLast  ? String(rawLast).toUpperCase() : "";

      const alreadyCheckedIn =
        rowData.status === "Checked In" || !!rowData.checkInTime;

      if (first && last && !alreadyCheckedIn) {
        return {
          ok:true,
          action:"CHECK_IN",
          row,
          firstName:first,
          lastName:last,
          checkInTime:new Date(),
          status:"Checked In"
        };
      }

      return {
        action:"FORMAT_NAME",
        row, col,
        value:String(value).toUpperCase()
      };
    }

    return { ignore:true };
  }

  return { handleActivityLogEdit };

})();
