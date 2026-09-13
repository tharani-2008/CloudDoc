/* =====================================================
   CLOUDDOC — FRONTEND LOGIC
   Existing upload flow (Sections 1-4 below) is unchanged.
   Section 5 is new: it builds and powers a documents
   dashboard fed by GET /documents, reusing existing CSS
   classes from style.css so no new stylesheet is needed.
   ===================================================== */
 
// ---- Configuration -----------------------------------
// Change this single constant if your API Gateway URL changes.
const API_BASE_URL = "https://xlvt3ww0uj.execute-api.ap-south-1.amazonaws.com";
const UPLOAD_ENDPOINT = `${API_BASE_URL}/upload`;
const DOCUMENTS_ENDPOINT = `${API_BASE_URL}/documents`;
const DOWNLOAD_ENDPOINT = `${API_BASE_URL}/download`; // NEW
 
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "txt", "xls", "xlsx", "ppt", "pptx", "jpg", "jpeg", "png"
];
 
// ---- Cached DOM references (all IDs confirmed to exist in index.html) ----
const hamburger = document.getElementById("hamburger");
const mainNav = document.getElementById("mainNav");
 
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const uploadError = document.getElementById("uploadError");
 
const stateDropzone = document.getElementById("stateDropzone");
const stateSelected = document.getElementById("stateSelected");
const stateUploading = document.getElementById("stateUploading");
const stateSuccess = document.getElementById("stateSuccess");
const stateError = document.getElementById("stateError");
 
const fileIcon = document.getElementById("fileIcon");
const selectedFileName = document.getElementById("selectedFileName");
const selectedFileSize = document.getElementById("selectedFileSize");
const removeFileBtn = document.getElementById("removeFileBtn");
const uploadBtn = document.getElementById("uploadBtn");
 
const progressStatus = document.getElementById("progressStatus");
const progressBarFill = document.getElementById("progressBarFill");
 
const successFileName = document.getElementById("successFileName");
const successDocId = document.getElementById("successDocId");
const uploadAnotherBtn = document.getElementById("uploadAnotherBtn");
 
const errorDetail = document.getElementById("errorDetail");
const retryBtn = document.getElementById("retryBtn");
 
// Holds the currently selected File object between UI states.
let currentFile = null;
 
/* =====================================================
   SECTION 1: MOBILE NAVIGATION (unchanged)
   ===================================================== */
hamburger.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  hamburger.classList.toggle("open", isOpen);
  hamburger.setAttribute("aria-expanded", String(isOpen));
});
 
mainNav.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    hamburger.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
  });
});
 
/* =====================================================
   SECTION 2: UPLOAD-CARD STATE SWITCHING (unchanged)
   ===================================================== */
function showState(stateEl) {
  [stateDropzone, stateSelected, stateUploading, stateSuccess, stateError].forEach((el) => {
    el.hidden = el !== stateEl;
  });
}
 
/* =====================================================
   SECTION 3: FILE SELECTION & VALIDATION (unchanged)
   ===================================================== */
function getExtension(fileName) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}
 
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
 
function validateFile(file) {
  if (!file) {
    return "No file selected. Choose a file first.";
  }
  const ext = getExtension(file.name);
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `"${ext || "unknown"}" files aren't supported. Try PDF, Word, Excel, PowerPoint, TXT, JPG or PNG.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `That file is ${formatFileSize(file.size)} — the limit is 10 MB.`;
  }
  return null;
}
 
function handleFileSelected(file) {
  const validationError = validateFile(file);
  if (validationError) {
    uploadError.textContent = validationError;
    uploadError.hidden = false;
    return;
  }
  uploadError.hidden = true;
  currentFile = file;
 
  fileIcon.textContent = getExtension(file.name).slice(0, 4).toUpperCase() || "FILE";
  selectedFileName.textContent = file.name;
  selectedFileSize.textContent = formatFileSize(file.size);
 
  showState(stateSelected);
}
 
dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});
 
fileInput.addEventListener("change", () => {
  if (fileInput.files.length > 0) {
    handleFileSelected(fileInput.files[0]);
  }
});
 
["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzone.classList.add("drag-over");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropzone.classList.remove("drag-over");
  });
});
dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelected(file);
});
 
removeFileBtn.addEventListener("click", () => {
  currentFile = null;
  fileInput.value = "";
  showState(stateDropzone);
});
 
uploadAnotherBtn.addEventListener("click", () => {
  currentFile = null;
  fileInput.value = "";
  progressBarFill.style.width = "0%";
  progressStatus.textContent = "Generating secure upload URL…";
  showState(stateDropzone);
});
 
retryBtn.addEventListener("click", () => {
  if (currentFile) {
    showState(stateSelected);
  } else {
    showState(stateDropzone);
  }
});
 
/* =====================================================
   SECTION 4: S3 UPLOAD FLOW (unchanged, except for one
   new line marked "NEW" that refreshes the documents
   dashboard after a successful upload)
   ===================================================== */
uploadBtn.addEventListener("click", async (event) => {
  event.preventDefault();
 
  if (!currentFile) {
    uploadError.textContent = "No file selected. Choose a file first.";
    uploadError.hidden = false;
    return;
  }
 
  uploadBtn.disabled = true;
  try {
    await startUpload(currentFile);
  } finally {
    uploadBtn.disabled = false;
  }
});
 
async function startUpload(file) {
  showState(stateUploading);
  progressBarFill.style.width = "0%";
  progressStatus.textContent = "Generating secure upload URL…";
 
  let documentId, uploadUrl, fileName;
 
  try {
    const requestResponse = await fetch(UPLOAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
      }),
    });
 
    if (!requestResponse.ok) {
      throw new Error(`The server responded with status ${requestResponse.status}.`);
    }
 
    const data = await requestResponse.json();
    documentId = data.documentId;
    uploadUrl = data.uploadUrl;
    fileName = data.fileName;
 
    if (!uploadUrl) {
      throw new Error("The server didn't return an upload URL.");
    }
  } catch (err) {
    handleUploadFailure(err, "request");
    return;
  }
 
  try {
    progressStatus.textContent = "Uploading to cloud…";
    await uploadFileToS3(uploadUrl, file, (percent) => {
      progressBarFill.style.width = `${percent}%`;
    });
  } catch (err) {
    handleUploadFailure(err, "s3");
    return;
  }
 
  progressStatus.textContent = "Upload complete";
  progressBarFill.style.width = "100%";
 
  successFileName.textContent = fileName || file.name;
  successDocId.textContent = documentId || "—";
 
  setTimeout(() => showState(stateSuccess), 350);
 
  // NEW: pull the fresh document list right away, then again a few
  // seconds later in case the backend updates status asynchronously
  // (e.g. an S3 event flips "Uploading" -> "Uploaded" after this call).
  refreshDocumentsAfterUpload();
}
 
function uploadFileToS3(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
 
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });
 
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Cloud storage rejected the upload (status ${xhr.status}).`));
      }
    };
 
    xhr.onerror = () => {
      reject(new Error("Network error while uploading to S3 — this can also be a CORS configuration issue."));
    };
 
    xhr.send(file);
  });
}
 
function handleUploadFailure(err, stage) {
  console.error(`CloudDoc upload failed during ${stage} stage:`, err);
 
  let message = "Something went wrong while contacting the server.";
  if (err instanceof TypeError) {
    message = "Couldn't reach the server — check your connection, or this may be a CORS issue.";
  } else if (err && err.message) {
    message = err.message;
  }
 
  errorDetail.textContent = message;
  showState(stateError);
}
 
/* =====================================================
   SECTION 5: DOCUMENTS DASHBOARD (new)
 
   index.html has no document-list container yet, so this
   section builds one at runtime — reusing existing classes
   from style.css (section-inner, section-title, tech-grid,
   tech-card, file-row, file-icon, file-info, status-pill,
   spinner, btn, btn-primary) so it matches the site's look
   without adding any new CSS. index.html/style.css files
   themselves are left untouched.
   ===================================================== */
 
let docsListEl, docsLoadingEl, docsEmptyEl, docsErrorEl, docsErrorDetailEl, docsNoMatchEl, docsSearchInput;
let statTotalEl, statUploadedEl, statUploadingEl, statStorageEl;
 
// Holds the full, unfiltered list from the last successful GET /documents.
// Stats are always computed from this array; search only filters what's
// rendered in the list below it.
let allDocuments = [];
 
function buildDocumentsSection() {
   const uploadSection = document.getElementById("upload");
  if (!uploadSection) return; // safety guard, should always exist
 
  const section = document.createElement("section");
  section.id = "documentsSection";
 
  section.innerHTML = `
    <div class="section-inner">
      <h2 class="section-title">Your documents</h2>
      <p class="section-subtitle">Live from DynamoDB — reflects every file that has come through CloudDoc.</p>
 
      <div class="tech-grid" style="margin-top:32px;">
        <div class="tech-card">
          <h3 id="statTotal">0</h3>
          <p>Total documents</p>
        </div>
        <div class="tech-card">
          <h3 id="statUploaded">0</h3>
          <p>Uploaded</p>
        </div>
        <div class="tech-card">
          <h3 id="statUploading">0</h3>
          <p>Uploading</p>
        </div>
        <div class="tech-card">
          <h3 id="statStorage">0 B</h3>
          <p>Storage Used</p>
        </div>
      </div>
 
      <div class="upload-card" style="max-width:100%; margin-top:32px;">
        <input
          type="text"
          id="docsSearchInput"
          placeholder="Search documents..."
          autocomplete="off"
          style="width:100%; margin-bottom:20px; padding:14px 18px; border-radius:999px;
                 border:1px solid var(--border-soft); background:rgba(8,11,20,0.4);
                 color:var(--text-primary); font-family:var(--font-body); font-size:0.95rem;
                 outline:none; transition:border-color 0.15s ease;"
        />
 
        <div id="docsLoading" class="progress-wrap">
          <div class="spinner" aria-hidden="true"></div>
          <p class="progress-status">Loading documents…</p>
        </div>
 
        <div id="docsEmpty" class="success-card" hidden>
          <p class="success-title">No documents yet</p>
          <p class="success-note">Upload a file above and it will show up here.</p>
        </div>
 
        <div id="docsNoMatch" class="success-card" hidden>
          <p class="success-title">No matching documents</p>
        </div>
 
        <div id="docsError" class="error-card" hidden>
          <p class="error-title">Couldn't load documents</p>
          <p class="error-detail" id="docsErrorDetail">Something went wrong while contacting the server.</p>
          <button class="btn btn-primary" id="docsRetryBtn" type="button">Try again</button>
        </div>
 
        <ul id="docsList" style="list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:12px;" hidden></ul>
      </div>
    </div>
  `;
 
  uploadSection.insertAdjacentElement("afterend", section);
 
  // Cache the elements we just created.
  docsListEl = document.getElementById("docsList");
  docsLoadingEl = document.getElementById("docsLoading");
  docsEmptyEl = document.getElementById("docsEmpty");
  docsErrorEl = document.getElementById("docsError");
  docsErrorDetailEl = document.getElementById("docsErrorDetail");
  docsNoMatchEl = document.getElementById("docsNoMatch");
  docsSearchInput = document.getElementById("docsSearchInput");
  statTotalEl = document.getElementById("statTotal");
  statUploadedEl = document.getElementById("statUploaded");
  statUploadingEl = document.getElementById("statUploading");
  statStorageEl = document.getElementById("statStorage");
 
  document.getElementById("docsRetryBtn").addEventListener("click", loadDocuments);
 
  // NEW: instant client-side search — filters the already-fetched
  // allDocuments array by file name or document ID as the user types.
  docsSearchInput.addEventListener("input", applySearchFilter);
  docsSearchInput.addEventListener("focus", () => {
    docsSearchInput.style.borderColor = "var(--accent-teal)";
  });
  docsSearchInput.addEventListener("blur", () => {
    docsSearchInput.style.borderColor = "var(--border-soft)";
  });
 
  // Point the existing "Documents" nav link at the new section
  // instead of the upload form, so navigation makes sense.
  mainNav.querySelectorAll(".nav-link").forEach((link) => {
    if (link.textContent.trim() === "Documents") {
      link.setAttribute("href", "#documentsSection");
    }
  });
}
 
function showDocsState(which) {
  docsLoadingEl.hidden = which !== "loading";
  docsEmptyEl.hidden = which !== "empty";
  docsNoMatchEl.hidden = which !== "nomatch";
  docsErrorEl.hidden = which !== "error";
  docsListEl.hidden = which !== "list";
}
 
async function loadDocuments() {
  showDocsState("loading");
 
  try {
    const response = await fetch(DOCUMENTS_ENDPOINT, { method: "GET" });
 
    if (!response.ok) {
      throw new Error(`The server responded with status ${response.status}.`);
    }
 
    const data = await response.json();
    allDocuments = Array.isArray(data.documents) ? data.documents : [];
 
    // Stats always reflect every document, regardless of the search box.
    updateDocumentStats(allDocuments);
 
    // Re-apply whatever search term is currently in the box (if any)
    // to the freshly fetched list.
    applySearchFilter();
  } catch (err) {
    console.error("CloudDoc: failed to load documents:", err);
    const message = err instanceof TypeError
      ? "Couldn't reach the server — check your connection, or this may be a CORS issue."
      : (err.message || "Something went wrong while contacting the server.");
    docsErrorDetailEl.textContent = message;
    showDocsState("error");
  }
}
 
// NEW: filters allDocuments by the current search box value (matching
// file name or document ID) and renders the result. Pure client-side —
// no network request involved.
function applySearchFilter() {
  const term = docsSearchInput.value.trim().toLowerCase();
 
  const filtered = term === ""
    ? allDocuments
    : allDocuments.filter((doc) => {
        const name = (doc.fileName || "").toLowerCase();
        const id = (doc.documentId || "").toLowerCase();
        return name.includes(term) || id.includes(term);
      });
 
  renderDocuments(filtered);
}
 
function renderDocuments(documents) {
  // No documents at all (before any filtering) vs. a search with
  // zero matches are two different messages.
  if (allDocuments.length === 0) {
    showDocsState("empty");
    return;
  }
 
  if (documents.length === 0) {
    showDocsState("nomatch");
    return;
  }
 
  docsListEl.innerHTML = "";
 
  documents.forEach((doc) => {
    docsListEl.appendChild(buildDocumentRow(doc));
  });
 
  showDocsState("list");
}
 
function updateDocumentStats(documents) {
  const total = documents.length;
  // "Processed" is an older status value used by some existing DynamoDB
  // records; it means the same thing as "Uploaded" for this count.
  const uploaded = documents.filter((d) => {
    const status = (d.status || "").toLowerCase();
    return status === "uploaded" || status === "processed";
  }).length;
  const uploading = documents.filter((d) => (d.status || "").toLowerCase() === "uploading").length;
 
  // Sum fileSize across every document. Older records may not have
  // a fileSize field at all, so each one is safely coerced to 0 instead
  // of letting a missing/undefined value turn the sum into NaN.
  const totalBytes = documents.reduce((sum, d) => sum + Number(d.fileSize || 0), 0);
 
  statTotalEl.textContent = String(total);
  statUploadedEl.textContent = String(uploaded);
  statUploadingEl.textContent = String(uploading);
  statStorageEl.textContent = formatStorageSize(totalBytes);
}
 
// NEW: formats a byte count into a human-readable string, mirroring
// the style of the existing formatFileSize() helper used elsewhere.
function formatStorageSize(bytes) {
  const safeBytes = Number(bytes) || 0;
 
  if (safeBytes < 1024) return `${safeBytes} B`;
  if (safeBytes < 1024 * 1024) return `${(safeBytes / 1024).toFixed(1)} KB`;
  if (safeBytes < 1024 * 1024 * 1024) return `${(safeBytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(safeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
 
function buildDocumentRow(doc) {
  const li = document.createElement("li");
  li.className = "file-row";
  // Allow a second line (the download error message) to wrap onto
  // its own row without touching style.css.
  li.style.flexWrap = "wrap";
 
  const fileName = doc.fileName || "Untitled document";
  const status = doc.status || "Unknown";
  const isUploading = status.toLowerCase() === "uploading";
  const ext = getExtension(fileName) || (doc.contentType ? doc.contentType.split("/").pop() : "");
 
  const icon = document.createElement("div");
  icon.className = "file-icon";
  icon.textContent = (ext || "FILE").slice(0, 4).toUpperCase();
 
  const info = document.createElement("div");
  info.className = "file-info";
 
  const nameEl = document.createElement("p");
  nameEl.className = "file-name";
  nameEl.textContent = fileName;
 
  const idEl = document.createElement("p");
  idEl.className = "file-size";
  idEl.textContent = doc.documentId ? `ID: ${doc.documentId}` : "";
 
  info.appendChild(nameEl);
  info.appendChild(idEl);
 
  const statusPill = document.createElement("span");
  statusPill.className = "status-pill";
  statusPill.textContent = status;
  // Reuse the existing .status-pill look, just recolor it for
  // in-progress items so "Uploading" reads differently at a glance.
  if (isUploading) {
    statusPill.style.color = "#F5A65B";
    statusPill.style.background = "rgba(245, 166, 91, 0.1)";
  }
 
  // NEW: download button — reuses the existing .icon-btn look so it
  // matches the remove-file button elsewhere in the UI.
  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.className = "icon-btn";
  downloadBtn.setAttribute("aria-label", `Download ${fileName}`);
  downloadBtn.title = isUploading ? "Still uploading — not ready yet" : "Download";
  downloadBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 3v8M9 11l-3.5-3.5M9 11l3.5-3.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M3.5 13.5v1a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-1" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
    </svg>`;
 
  // NEW: hidden-by-default inline error message for this row,
  // shown only if the download request fails.
  const rowError = document.createElement("p");
  rowError.className = "file-size";
  rowError.style.color = "#F5738A";
  rowError.style.width = "100%";
  rowError.style.marginTop = "8px";
  rowError.hidden = true;
 
  function setDownloadDisabled(disabled) {
    downloadBtn.disabled = disabled;
    downloadBtn.style.opacity = disabled ? "0.4" : "1";
    downloadBtn.style.cursor = disabled ? "not-allowed" : "pointer";
  }
  setDownloadDisabled(isUploading);
 
  downloadBtn.addEventListener("click", async () => {
    if (downloadBtn.disabled || !doc.documentId) return;
 
    rowError.hidden = true;
    setDownloadDisabled(true);
 
    try {
      const url = `${DOWNLOAD_ENDPOINT}?documentId=${encodeURIComponent(doc.documentId)}`;
      const response = await fetch(url, { method: "GET" });
 
      if (!response.ok) {
        throw new Error(`The server responded with status ${response.status}.`);
      }
 
      const data = await response.json();
      if (!data.downloadUrl) {
        throw new Error("The server didn't return a download link.");
      }
 
      // Open the real presigned S3 URL in a new tab.
      window.open(data.downloadUrl, "_blank", "noopener");
    } catch (err) {
      console.error("CloudDoc: download failed:", err);
      rowError.textContent = err instanceof TypeError
        ? "Couldn't reach the server — check your connection, or this may be a CORS issue."
        : (err.message || "Something went wrong while preparing the download.");
      rowError.hidden = false;
    } finally {
      // Only re-enable if the document isn't (still) mid-upload.
      setDownloadDisabled(isUploading);
    }
  });
 
  li.appendChild(icon);
  li.appendChild(info);
  li.appendChild(statusPill);
  li.appendChild(downloadBtn);
  li.appendChild(rowError);
 
  return li;
}
 
function refreshDocumentsAfterUpload() {
  loadDocuments();
  // A second pass a few seconds later catches any status change
  // (e.g. "Uploading" -> "Uploaded") that happens asynchronously
  // on the backend after this request already returned.
  setTimeout(loadDocuments, 4000);
}
 
// ---- Initial load ----
buildDocumentsSection();
loadDocuments();
