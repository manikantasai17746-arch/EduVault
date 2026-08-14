// ---------------------------------------------------------------------------
// EduVault ID Card Scanner
// ---------------------------------------------------------------------------
// Opens a camera modal, decodes a barcode/QR code from the live video feed
// using ZXing (loaded from CDN in each page's <head>), and hands the decoded
// text back to the caller. Works for standard 1D barcodes (Code128, EAN,
// UPC, Code39 -- the formats most college ID cards use) as well as QR codes.
// ---------------------------------------------------------------------------

let __zxingReader = null;
let __scanModalEl = null;

function buildScanModal() {
  if (__scanModalEl) return __scanModalEl;
  const modal = document.createElement("div");
  modal.id = "scanModal";
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(2,52,54,0.82);
    display: none; align-items: center; justify-content: center; z-index: 1000;
    padding: 1rem;
  `;
  modal.innerHTML = `
    <div style="background:#fff; border-radius:14px; max-width:420px; width:100%; overflow:hidden;">
      <div style="padding:1.1rem 1.3rem 0.8rem; display:flex; align-items:center; justify-content:space-between;">
        <strong style="font-family:'Fraunces',serif; color:#023436; font-size:1.05rem;">Scan Your ID Card</strong>
        <button id="scanCloseBtn" style="background:none; border:none; font-size:1.3rem; cursor:pointer; color:#5B7A75; line-height:1;">&times;</button>
      </div>
      <div style="position:relative; background:#000; aspect-ratio:4/3;">
        <video id="scanVideo" style="width:100%; height:100%; object-fit:cover; display:block;" muted playsinline></video>
        <div style="position:absolute; inset:14% 8%; border:2px solid #02C39A; border-radius:10px; pointer-events:none; box-shadow:0 0 0 999px rgba(0,0,0,0.35);"></div>
      </div>
      <div style="padding:0.9rem 1.3rem 1.2rem;">
        <p id="scanStatus" style="margin:0 0 0.7rem; font-size:0.85rem; color:#5B7A75;">Hold the barcode on your ID card steady inside the frame.</p>
        <button id="scanManualBtn" type="button" style="width:100%; padding:0.55rem; border-radius:7px; border:1px solid #028090; background:transparent; color:#028090; font-weight:600; font-size:0.85rem; cursor:pointer;">
          Can't scan? Enter code manually
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  __scanModalEl = modal;
  return modal;
}

/**
 * Opens the scanner. Resolves with the decoded string, or rejects if the
 * user cancels / manually enters a code (manual entry also resolves).
 */
function openIdCardScanner() {
  return new Promise((resolve, reject) => {
    const modal = buildScanModal();
    const video = modal.querySelector("#scanVideo");
    const status = modal.querySelector("#scanStatus");
    const closeBtn = modal.querySelector("#scanCloseBtn");
    const manualBtn = modal.querySelector("#scanManualBtn");
    modal.style.display = "flex";
    status.textContent = "Hold the barcode on your ID card steady inside the frame.";
    status.style.color = "#5B7A75";

    let settled = false;
    function cleanup() {
      try { __zxingReader && __zxingReader.reset(); } catch (e) {}
      modal.style.display = "none";
      closeBtn.onclick = null;
      manualBtn.onclick = null;
    }
    function finish(code) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(code);
    }
    function cancel() {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("cancelled"));
    }

    closeBtn.onclick = cancel;
    manualBtn.onclick = () => {
      const code = prompt("Enter the number/code printed under your ID card's barcode:");
      if (code && code.trim()) finish(code.trim());
    };

    if (typeof ZXing === "undefined") {
      status.textContent = "Camera scanning isn't available right now — enter your code manually below.";
      status.style.color = "#B23A2E";
      return;
    }

    try {
      __zxingReader = new ZXing.BrowserMultiFormatReader();
      __zxingReader
        .decodeFromVideoDevice(null, video, (result, err) => {
          if (result) {
            status.textContent = "Card detected!";
            status.style.color = "#0C6B54";
            finish(result.getText());
          }
        })
        .catch(() => {
          status.textContent = "Couldn't access the camera — enter your code manually below.";
          status.style.color = "#B23A2E";
        });
    } catch (e) {
      status.textContent = "Couldn't access the camera — enter your code manually below.";
      status.style.color = "#B23A2E";
    }
  });
}
