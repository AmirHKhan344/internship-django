/* ===========================
   Uploader (PO + Coal) — Unified
   =========================== */

// 1) Stop the browser from opening files when dropped anywhere
document.addEventListener('dragover', e => { e.preventDefault(); }, { passive:false });
document.addEventListener('drop',     e => { e.preventDefault(); }, { passive:false });

// 2) Helper: safely assign files to an <input type="file">
function setInputFiles(input, fileList){
  const dt = new DataTransfer();
  for (const f of fileList) dt.items.add(f);
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles:true }));
}

// 3) Simple wiring (click/keyboard + DnD + label update)
function wireUpload(dropId, inputId, labelId){
  const drop  = document.getElementById(dropId);
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);

  if(!drop || !input || !label){
    console.warn('[wireUpload] Missing element(s):', { dropId, inputId, labelId });
    return;
  }

  // Make zone accessible + clickable
  drop.setAttribute('tabindex','0');
  drop.setAttribute('role','button');
  drop.style.cursor = 'pointer';
  drop.style.pointerEvents = 'auto';
  drop.style.position = drop.style.position || 'relative';
  drop.style.zIndex = 1;

  const openPicker = () => { if(!input.disabled) input.click(); };

  drop.addEventListener('click', openPicker);
  drop.addEventListener('keydown', e=>{
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openPicker(); }
  });

  input.addEventListener('change', () => {
    const names = input.files && input.files.length
      ? Array.from(input.files).map(f => f.name).join(', ')
      : 'Select Files';
    label.textContent = names;
  });

  // Drag visuals
  ['dragenter','dragover'].forEach(evt=>{
    drop.addEventListener(evt, e=>{
      e.preventDefault(); e.stopPropagation();
      drop.classList.add('dragover');
    });
  });
  ['dragleave','drop'].forEach(evt=>{
    drop.addEventListener(evt, e=>{
      e.preventDefault(); e.stopPropagation();
      drop.classList.remove('dragover');
    });
  });

  // Drop -> assign to input
  drop.addEventListener('drop', e=>{
    if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length){
      setInputFiles(input, e.dataTransfer.files);
    }
  });
}

// 4) Fancy features (file list + remove + clear + overall progress via AJAX)
function fmtBytes(n){
  if (n < 1024) return n + ' B';
  if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
  return (n/1024/1024).toFixed(1) + ' MB';
}

function enhanceUploader(opts){
  const {
    formId, inputId, listId,
    btnClearId, btnUploadId,
    overallId, overallBarId
  } = opts;

  const form = document.getElementById(formId);
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  const btnClear = document.getElementById(btnClearId);
  const btnUpload = document.getElementById(btnUploadId);
  const overall = document.getElementById(overallId);
  const overallBar = document.getElementById(overallBarId);

  if(!form || !input || !list || !btnClear || !btnUpload || !overall || !overallBar){
    // If this page doesn't have these elements, quietly skip.
    return;
  }

  // CSRF from hidden input in the form (works even when cookie is HttpOnly)
  const csrfInput = form.querySelector('input[name=csrfmiddlewaretoken]');
  const csrfToken = csrfInput ? csrfInput.value : null;

  let queue = [];

  function render(){
    list.innerHTML = '';
    queue.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'file-item';
      row.innerHTML = `
        <div class="file-name" title="${f.name}">${f.name}</div>
        <div class="file-meta">
          <span class="file-size">${fmtBytes(f.size)}</span>
          <div class="progress"><div class="bar" id="${inputId}Bar${i}"></div></div>
          <button type="button" class="file-remove" data-i="${i}">Remove</button>
        </div>`;
      list.appendChild(row);
    });
    btnUpload.disabled = queue.length === 0;
  }

  function syncFromInput(){
    queue = input.files ? Array.from(input.files) : [];
    render();
  }

  // Remove a single file (rebuild FileList)
  list.addEventListener('click', e=>{
    const btn = e.target.closest('.file-remove');
    if(!btn) return;
    const idx = +btn.dataset.i;
    queue.splice(idx,1);
    const dt = new DataTransfer();
    queue.forEach(f => dt.items.add(f));
    input.files = dt.files;
    render();
  });

  // Clear all
  btnClear.addEventListener('click', ()=>{
    queue = [];
    const dt = new DataTransfer();
    input.files = dt.files;
    render();
  });

  // Sync on native picker change
  input.addEventListener('change', syncFromInput);

  // Intercept submit for AJAX upload with progress (fallback to normal submit on error)
  form.addEventListener('submit', (e)=>{
    if(queue.length === 0) return; // allow normal submit (no files)
    e.preventDefault();

    const fd = new FormData();
    queue.forEach(f => fd.append('files', f)); // field name expected by your Django view

    overall.hidden = false;
    overallBar.style.width = '0%';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', form.action, true);
    if (csrfToken) xhr.setRequestHeader('X-CSRFToken', csrfToken);

    xhr.upload.addEventListener('progress', evt=>{
      if(!evt.lengthComputable) return;
      const p = Math.round((evt.loaded/evt.total)*100);
      overallBar.style.width = p + '%';
      // mirror progress to each file bar (simple visual)
      queue.forEach((_, i)=>{
        const bar = document.getElementById(`${inputId}Bar${i}`);
        if (bar) bar.style.width = p + '%';
      });
    });

    xhr.onreadystatechange = function(){
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300){
        // Success -> reset
        queue = [];
        const dt = new DataTransfer();
        input.files = dt.files;
        render();
        overallBar.style.width = '100%';
        setTimeout(()=>{ overall.hidden = true; overallBar.style.width = '0%'; }, 600);
      } else {
        // Fallback to normal submit
        console.error('[enhanceUploader] AJAX failed:', xhr.status, xhr.responseText);
        overall.hidden = true; overallBar.style.width = '0%';
        form.submit();
      }
    };

    xhr.send(fd);
  });
}

// 5) Auto-initialize for both pages (only wires what exists)
document.addEventListener('DOMContentLoaded', ()=>{
  // Basic DnD + label update
  wireUpload('dropZonePO',   'fileInputPO',   'fileLabelPO');
  wireUpload('dropZoneCoal', 'fileInputCoal', 'fileLabelCoal');

  // Fancy features (only if the elements are present on the page)
  enhanceUploader({
    formId:'poForm',
    inputId:'fileInputPO',
    listId:'fileListPO',
    btnClearId:'btnClearPO',
    btnUploadId:'btnUploadPO',
    overallId:'overallPO',
    overallBarId:'overallBarPO'
  });

  enhanceUploader({
    formId:'coalForm',
    inputId:'fileInputCoal',
    listId:'fileListCoal',
    btnClearId:'btnClearCoal',
    btnUploadId:'btnUploadCoal',
    overallId:'overallCoal',
    overallBarId:'overallBarCoal'
  });
});

