function wireUpload(dropId, inputId, labelId){
  const drop = document.getElementById(dropId);
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  if(!drop || !input || !label) return;

  const openPicker = () => input.click();

  drop.addEventListener("click", openPicker);
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPicker(); }
  });

  input.addEventListener("change", () => {
    label.textContent = input.files?.length
      ? Array.from(input.files).map(f => f.name).join(", ")
      : "Select Files";
  });

  ["dragenter","dragover"].forEach(evt =>
    drop.addEventListener(evt, e => { e.preventDefault(); drop.classList.add("dragover"); })
  );
  ["dragleave","drop"].forEach(evt =>
    drop.addEventListener(evt, e => { e.preventDefault(); drop.classList.remove("dragover"); })
  );
  drop.addEventListener("drop", e => {
    input.files = e.dataTransfer.files;
    input.dispatchEvent(new Event("change"));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  wireUpload("dropZonePO","fileInputPO","fileLabelPO");
  wireUpload("dropZoneCoal","fileInputCoal","fileLabelCoal");
});
