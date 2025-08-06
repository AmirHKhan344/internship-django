// Navigation with active state
document.querySelectorAll(".sidebar li").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".sidebar li").forEach(li => li.classList.remove("active"));
    item.classList.add("active");

    document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
    document.getElementById(item.dataset.page).classList.add("active");
  });
});

// File upload handler setup
function setupFileUpload(fileInputId, fileLabelId, dropZoneId, formId) {
  const fileInput = document.getElementById(fileInputId);
  const fileLabel = document.getElementById(fileLabelId);
  const dropZone = document.getElementById(dropZoneId);
  let droppedFiles = null;

  // Prevent default drag/drop everywhere
  ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    document.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  function updateFileLabel(files) {
    if (files.length > 0) {
      fileLabel.textContent = Array.from(files).map(file => file.name).join(", ");
    } else {
      fileLabel.textContent = "Select Files";
    }
  }

  // Click opens file picker
  dropZone.addEventListener("click", () => fileInput.click());

  // File input change
  fileInput.addEventListener("change", () => {
    droppedFiles = null;
    updateFileLabel(fileInput.files);
  });

  // Drag over
  dropZone.addEventListener("dragover", () => {
    dropZone.classList.add("dragover");
  });

  // Drag leave
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  // Drop
  dropZone.addEventListener("drop", (e) => {
    dropZone.classList.remove("dragover");
    droppedFiles = e.dataTransfer.files;
    updateFileLabel(droppedFiles);
  });

  // Form submit (demo)
  document.getElementById(formId).addEventListener("submit", (e) => {
    e.preventDefault();
    let filesToUpload = droppedFiles || fileInput.files;
    if (filesToUpload.length > 0) {
      alert("Ready to upload: " + Array.from(filesToUpload).map(f => f.name).join(", "));
    } else {
      alert("No files selected");
    }
  });
}

// Setup for both pages
setupFileUpload("fileInputPO", "fileLabelPO", "dropZonePO", "uploadFormPO");
setupFileUpload("fileInputCoal", "fileLabelCoal", "dropZoneCoal", "uploadFormCoal");
