function submitReason(row, reasonType, selectedReason, freeText, newStatus) {
  
  const reason = selectedReason || freeText || "(no explanation provided)";

  ActivityLogModel.appendComment(row, reason);

  // Apply the new status after appending the comment
  ActivityLogModel.setFields(row, { status: newStatus});
}

function cancelReason(row, previousStatus) {
  ActivityLogModel.setFields(row, { status: previousStatus });
}



