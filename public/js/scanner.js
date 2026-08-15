// ---------------------------------------------------------------------------
// EduVault ID Card Scanner - Using html5-qrcode (fast, free, optimized)
// ---------------------------------------------------------------------------
// Opens a camera modal, decodes barcodes/QR codes from the live video feed
// using html5-qrcode (Google-backed, free, much faster than ZXing).
// Works for 1D barcodes (Code128, EAN, UPC, Code39) and QR codes.
// ---------------------------------------------------------------------------

let __scanModalEl = null;
let __scannerActive = false;
let __html5QrcodeScanner = null;

// Ensure html5-qrcode library is loaded; try existing globals, then inject
function ensureHtml5QrcodeLoaded(timeoutMs = 5000) {
  if (typeof Html5Qrcode !== "undefined") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const urls = [
      "https://unpkg.com/html5-qrcode@2.3.4/dist/html5-qrcode.min.js",
      "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.4/dist/html5-qrcode.min.js",
    ];
    let loaded = false;
    let tried = 0;
    function tryLoad() {
      if (loaded) return;
      if (tried >= urls.length) {
        return reject(new Error("Failed to load html5-qrcode library"));
      }
      const script = document.createElement("script");
      script.src = urls[tried++];
      script.async = true;
      script.onload = () => {
        loaded = true;
        if (typeof Html5Qrcode !== "undefined") return resolve();
        // small delay to allow the global to be set
        setTimeout(() => {
          if (typeof Html5Qrcode !== "undefined") resolve();
          else reject(new Error("html5-qrcode loaded but global not found"));
        }, 50);
      };
      script.onerror = () => {
        // try next
        setTimeout(tryLoad, 50);
      };
      document.head.appendChild(script);
    }
    tryLoad();
    // timeout
    setTimeout(() => {
      if (!loaded) reject(new Error("Timed out loading html5-qrcode"));
    }, timeoutMs);
  });
}

function buildScanModal() {
  // Always create a fresh modal to avoid video stream conflicts
  const existingModal = document.getElementById("scanModal");
  if (existingModal) {
    existingModal.remove();
  }
  
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
      <div id="scanVideoContainer" style="position:relative; background:#000; aspect-ratio:4/3; overflow:hidden; border-radius:10px;">
        <div id="qr-reader" style="width:100%; height:100%;"></div>
        <div style="position:absolute; inset:14% 8%; border:2px solid #02C39A; border-radius:10px; pointer-events:none; box-shadow:0 0 0 999px rgba(0,0,0,0.35);"></div>
      </div>
      <div style="padding:0.9rem 1.3rem 1.2rem;">
        <p id="scanStatus" style="margin:0 0 0.7rem; font-size:0.85rem; color:#5B7A75;">Hold the barcode on your ID card steady inside the frame.</p>
        <div style="display:flex; gap:0.6rem;">
          <button id="scanRefreshBtn" type="button" style="flex:1; padding:0.55rem; border-radius:7px; border:1px solid #02C39A; background:transparent; color:#02C39A; font-weight:600; font-size:0.85rem; cursor:pointer;">
            ↻ Rescan
          </button>
          <button id="scanManualBtn" type="button" style="flex:1; padding:0.55rem; border-radius:7px; border:1px solid #028090; background:transparent; color:#028090; font-weight:600; font-size:0.85rem; cursor:pointer;">
            Manual Entry
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

/**
 * Opens the scanner. Resolves with the decoded string, or rejects if cancelled.
 */
function openIdCardScanner() {
  // Prevent multiple concurrent scans
  if (__scannerActive) {
    return Promise.reject(new Error("Scanner is already active"));
  }
  
  __scannerActive = true;
  
  return new Promise((resolve, reject) => {
    const modal = buildScanModal();
    const status = modal.querySelector("#scanStatus");
    const closeBtn = modal.querySelector("#scanCloseBtn");
    const refreshBtn = modal.querySelector("#scanRefreshBtn");
    const manualBtn = modal.querySelector("#scanManualBtn");
    
    modal.style.display = "flex";
    status.textContent = "Hold the barcode on your ID card steady inside the frame.";
    status.style.color = "#5B7A75";

    let settled = false;
    let scanTimeout = null;
    
    function cleanup() {
      try {
        if (__html5QrcodeScanner) {
          __html5QrcodeScanner.stop().catch(() => {});
          __html5QrcodeScanner.clear();
          __html5QrcodeScanner = null;
        }
      } catch (e) {
        console.error("Cleanup error:", e);
      }
      if (scanTimeout) clearTimeout(scanTimeout);
      try {
        modal.style.display = "none";
        setTimeout(() => {
          if (modal && modal.parentNode) {
            modal.remove();
          }
          __scannerActive = false;
        }, 200);
      } catch (e) {}
      closeBtn.onclick = null;
      refreshBtn.onclick = null;
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
    
    refreshBtn.onclick = () => {
      // Restart scanner
      if (__html5QrcodeScanner) {
        try {
          __html5QrcodeScanner.stop().catch(() => {});
        } catch (e) {}
      }
      status.textContent = "Hold the barcode on your ID card steady inside the frame.";
      status.style.color = "#5B7A75";
      if (scanTimeout) clearTimeout(scanTimeout);
      startScanning();
    };

    // Ensure html5-qrcode library is available (load dynamically if needed)
    ensureHtml5QrcodeLoaded().then(() => {
      // library loaded — start scanning
      startScanning();
    }).catch((err) => {
      console.warn("html5-qrcode failed to load:", err);
      status.textContent = "Scanner library not available — enter your code manually below.";
      status.style.color = "#B23A2E";
      __scannerActive = false;
    });

    function startScanning() {
      try {
        // Create a new scanner instance
        __html5QrcodeScanner = new Html5Qrcode("qr-reader", {
          formFactor: "portrait",
          supportedScanTypes: ["SCAN_TYPE_CAMERA"],
          numAttempts: 3,
          isMediaStreamTrackSettingsSupported: true,
        });

        // Set timeout for scanning (15 seconds)
        scanTimeout = setTimeout(() => {
          if (!settled) {
            status.textContent = "Scan timeout — try manual entry below.";
            status.style.color = "#B23A2E";
            try {
              if (__html5QrcodeScanner) {
                __html5QrcodeScanner.stop();
              }
            } catch (e) {}
          }
        }, 15000);

        // Start scanning
        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.333,
          disableFlip: false,
        };

        __html5QrcodeScanner
          .start(
            { facingMode: "environment" },
            config,
            (decodedText, decodedResult) => {
              if (!settled) {
                status.textContent = "Card detected!";
                status.style.color = "#0C6B54";
                finish(decodedText);
              }
            },
            (errorMessage) => {
              // Silently ignore scanning errors (common in video stream)
            }
          )
          .catch((error) => {
            if (!settled) {
              console.warn("Camera access error:", error);
              status.textContent = "Couldn't access the camera — enter your code manually below.";
              status.style.color = "#B23A2E";
            }
          });
      } catch (e) {
        console.error("Scanner exception:", e);
        status.textContent = "Couldn't access the camera — enter your code manually below.";
        status.style.color = "#B23A2E";
        __scannerActive = false;
      }
    }
    
    // Start scanning
    startScanning();
  });
}
