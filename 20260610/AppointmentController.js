const AppointmentController = (() => {

  function handleAppointmentCheckIn(e) {
    const sheet = e.source.getActiveSheet();
    const range = e.range;

    if (range.getColumn() !== 1) return;
    if (e.value !== "TRUE") return;

    const row = range.getRow();
    const processedCell = sheet.getRange(row, 6);

    if (processedCell.getValue() === "Checked IN") return;

    const rowValues = sheet.getRange(row, 1, 1, 5).getValues()[0];
    const firstName = rowValues[2];
    const lastName = rowValues[3];

    if (!firstName || !lastName) return;

    const result = checkIn({
      isAppointment: true,
      ticketNumber: "",
      ssnLast4: "",
      firstName,
      lastName,
      taxYear: "",
      comments: "Appointment Check-In"
    });

    if (!result.ok) {
      console.log("Appointment check-in failed:", result.message);
      return;
    }

    processedCell.setValue("Checked IN");
  }

  return { handleAppointmentCheckIn };

})();

