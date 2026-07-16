function submitReason(row, reasonType, selectedReason, freeText, newStatus) {

  let reason = "";
  
  if (selectedReason === "" && freeText === "") {
    reason = "No explanation provided";
  } else {
    reason = selectedReason + ". " + freeText;
  }

  ActivityLogModel.appendComment(row, reason);

  // Apply the new status after appending the comment
  ActivityLogModel.setFields(row, { status: newStatus, latestChange: new Date()});
}

function cancelReason(row, previousStatus) {
  ActivityLogModel.setFields(row, { status: previousStatus });
}



