function submitReason(row, reasonType, selectedReason, freeText) {
  const reason = selectedReason || freeText || "(no explanation provided)";
  const formatted = `[${reasonType}] ${reason}`;

  ActivityLogModel.appendComment(row, formatted);
}


