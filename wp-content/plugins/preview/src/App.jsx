import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import QRCode from "qrcode";

const config = window.plecPreviewConfig || {};
const assetsUrl = config.assetsUrl || "./assets";
const uploadsUrl = config.uploadsUrl || "";

function parseIterations() {
  const params = new URLSearchParams(window.location.search);
  const iterations = [];
  let i = 1;
  while (params.has(`n${i}`) || params.has(`m${i}`)) {
    const file = params.get(`m${i}`) || "";
    if (file) {
      iterations.push({
        name: params.get(`n${i}`) || `Iteration ${i}`,
        file,
      });
    }
    i++;
  }
  return iterations;
}

function detectMobile() {
  // Touch device with small screen in either dimension (catches landscape phones)
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const smallDimension = Math.min(window.innerWidth, window.innerHeight) <= 768;
  return hasTouch && smallDimension;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(detectMobile);
  useEffect(() => {
    const handler = () => setIsMobile(detectMobile());
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

// Screen area within each frame image (percentages of the image's own dimensions)
const FRAME_CONFIG = {
  phone: {
    portrait:  { left: 37.66, top: 17.50, iw: 27.07, ih: 64.95 },
    landscape: { left: 21.21, top: 29.11, iw: 56.13, ih: 41.67 },
  },
  tablet: {
    portrait:  { left: 31.80, top: 15.16, iw: 38.83, ih: 69.43 },
    landscape: { left: 18.63, top: 19.58, iw: 60.90, ih: 60.42 },
  },
};

const IMG_ASPECT = 2560 / 1920;

export default function App() {
  const [orientation, setOrientation] = useState("portrait");
  const [device, setDevice] = useState("phone");
  const [activeIteration, setActiveIteration] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [imgRect, setImgRect] = useState(null);
  const [showClickBanner, setShowClickBanner] = useState(false);
  const [mobilePlayingIdx, setMobilePlayingIdx] = useState(null);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const mobileIframeRef = useRef(null);
  const clickTimerRef = useRef(null);

  const isMobile = useIsMobile();
  const iterations = useMemo(parseIterations, []);

  const currentFile = iterations[activeIteration]?.file || "";
  const iframeSrc = currentFile && uploadsUrl ? `${uploadsUrl}/${currentFile}` : "";

  const frameImg = `${assetsUrl}/frames/${device}-${orientation}.png`;
  const fc = FRAME_CONFIG[device]?.[orientation] || FRAME_CONFIG.phone.portrait;

  // Compute rendered image rect for desktop frame
  const computeImgRect = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw === 0 || ch === 0) return;
    let rw, rh;
    if (cw / ch > IMG_ASPECT) { rh = ch; rw = ch * IMG_ASPECT; }
    else { rw = cw; rh = cw / IMG_ASPECT; }
    setImgRect({ x: (cw - rw) / 2, y: (ch - rh) / 2, w: rw, h: rh });
  }, []);

  useEffect(() => {
    if (isMobile) return;
    computeImgRect();
    const ro = new ResizeObserver(computeImgRect);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [computeImgRect, device, orientation, sidebarOpen, isMobile]);

  // QR code
  useEffect(() => {
    QRCode.toDataURL(window.location.href, {
      width: 240, margin: 1,
      color: { dark: "#3C4044", light: "#ffffff" },
    }).then(setQrDataUrl).catch(() => {});
  }, [activeIteration, device, orientation]);

  // Click banner
  const triggerClickBanner = useCallback(() => {
    clearTimeout(clickTimerRef.current);
    setShowClickBanner(true);
    clickTimerRef.current = setTimeout(() => setShowClickBanner(false), 1500);
  }, []);

  // mraid override — works for both desktop and mobile iframes
  const injectMraidOverride = useCallback((iframe) => {
    if (!iframe) return;
    try {
      const win = iframe.contentWindow;
      if (!win) return;

      win.mraid = win.mraid || {};
      win.mraid.open = function () { triggerClickBanner(); };
      win.mraid.getState = function () { return "default"; };
      win.mraid.addEventListener = function () {};
      win.mraid.removeEventListener = function () {};
      win.mraid.isViewable = function () { return true; };
      win.mraid.getVersion = function () { return "2.0"; };

      win.playableSDK = win.playableSDK || {};
      win.playableSDK.openAppStore = function () { triggerClickBanner(); };

      win.dapi = win.dapi || {};
      win.dapi.openStoreUrl = function () { triggerClickBanner(); };
      win.dapi.isReady = function () { return true; };
      win.dapi.addEventListener = function () {};
      win.dapi.removeEventListener = function () {};
      win.dapi.getScreenSize = function () { return { width: 320, height: 480 }; };

      win.ExitApi = win.ExitApi || {};
      win.ExitApi.exit = function () { triggerClickBanner(); };

      win.FbPlayableAd = win.FbPlayableAd || {};
      win.FbPlayableAd.onCTAClick = function () { triggerClickBanner(); };
    } catch (e) { /* cross-origin */ }
  }, [triggerClickBanner]);

  const handleIframeLoad = useCallback(() => {
    injectMraidOverride(iframeRef.current);
  }, [injectMraidOverride]);

  const handleMobileIframeLoad = useCallback(() => {
    injectMraidOverride(mobileIframeRef.current);
  }, [injectMraidOverride]);

  useEffect(() => { return () => clearTimeout(clickTimerRef.current); }, []);

  // Auto-play single iteration on mobile
  useEffect(() => {
    if (isMobile && iterations.length === 1) {
      setMobilePlayingIdx(0);
    }
  }, [isMobile, iterations.length]);

  const iterationLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  // ─── MOBILE VIEW ───
  if (isMobile) {
    const mobileFile = mobilePlayingIdx !== null ? iterations[mobilePlayingIdx]?.file : null;
    const mobileSrc = mobileFile && uploadsUrl ? `${uploadsUrl}/${mobileFile}` : "";

    // Fullscreen iframe mode
    if (mobilePlayingIdx !== null && mobileSrc) {
      return (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999 }}>
          {/* Back button */}
          {iterations.length > 1 && (
            <button
              onClick={() => setMobilePlayingIdx(null)}
              style={{
                position: "absolute", top: 12, left: 12, zIndex: 10001,
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(0,0,0,0.6)", border: "none",
                color: "#fff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <iframe
            ref={mobileIframeRef}
            src={mobileSrc}
            title="Preview"
            onLoad={handleMobileIframeLoad}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              border: "none", background: "#000",
            }}
            sandbox="allow-scripts allow-same-origin"
          />

          {/* Click banner — mobile */}
          {showClickBanner && (
            <div className="pv-click-banner" style={{
              position: "absolute", top: 0, left: 0, width: "100%", zIndex: 10000,
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 16px",
                background: "linear-gradient(135deg, #0583AA 0%, #047a9e 100%)",
                color: "#fff", fontSize: 14, fontWeight: 600,
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 100 100" fill="white">
                  <polygon points="50,8 61,35 90,35 67,55 76,83 50,66 24,83 33,55 10,35 39,35" />
                  <circle cx="50" cy="50" r="12" fill="none" stroke="white" strokeWidth="2" />
                </svg>
                <span>You have successfully clicked</span>
              </div>
            </div>
          )}
        </div>
      );
    }

    // Iteration selection screen
    return (
      <div style={{
        minHeight: "100vh", background: "var(--pv-sidebar-bg)",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "48px 20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif",
      }}>
        <h1 style={{
          color: "#fff", fontSize: 22, fontWeight: 700,
          margin: "0 0 32px", textAlign: "center",
        }}>
          Playable Preview
        </h1>

        {iterations.length === 0 && (
          <p style={{ color: "var(--pv-sidebar-muted)", fontSize: 14 }}>No iterations found.</p>
        )}

        <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 8 }}>
          {iterations.map((iter, idx) => (
            <button
              key={idx}
              onClick={() => setMobilePlayingIdx(idx)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 18px", borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff", fontSize: 15, fontWeight: 500,
                cursor: "pointer", textAlign: "left",
                width: "100%", transition: "all 0.15s",
              }}
            >
              <span style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: "var(--pv-accent)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700,
              }}>
                {iterationLabels[idx] || idx + 1}
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {iter.name}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.4)" strokeWidth={2} style={{ marginLeft: "auto", flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── DESKTOP VIEW ───
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--pv-bg)" }}>
      {/* Sidebar toggle (visible when collapsed) */}
      {!sidebarOpen && (
        <button
          className="pv-sidebar-toggle"
          onClick={() => setSidebarOpen(true)}
          title="Open sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <div
        className="pv-sidebar"
        style={{
          width: sidebarOpen ? 310 : 0,
          minWidth: sidebarOpen ? 310 : 0,
          overflow: "hidden",
          background: "var(--pv-sidebar-bg)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto", flex: 1 }}>
          {/* Close button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 2 }}>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                width: 31, height: 31, borderRadius: 8, border: "none",
                background: "rgba(255,255,255,0.06)", color: "var(--pv-sidebar-muted)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--pv-sidebar-muted)"; }}
              title="Close sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Orientation */}
          <button
            className={`pv-menu-item${orientation === "landscape" ? " is-active" : ""}`}
            onClick={() => setOrientation((o) => o === "portrait" ? "landscape" : "portrait")}
          >
            <img src={`${assetsUrl}/icons/orientation.png`} alt="" className="pv-menu-icon" />
            <span>Orientation</span>
          </button>

          {/* QR */}
          <button
            className={`pv-menu-item${qrOpen ? " is-active" : ""}`}
            onClick={() => setQrOpen((v) => !v)}
          >
            <img src={`${assetsUrl}/icons/qr.png`} alt="" className="pv-menu-icon" />
            <span>QR</span>
          </button>
          {qrOpen && qrDataUrl && (
            <div className="pv-qr" style={{ margin: "4px 0 6px" }}>
              <img src={qrDataUrl} alt="QR Code" style={{ width: "100%", height: "auto", borderRadius: 4 }} />
            </div>
          )}

          {/* Iterations section */}
          {iterations.length > 0 && (
            <div style={{ marginTop: 2 }}>
              <button className="pv-menu-item" style={{ cursor: "default" }}>
                <img src={`${assetsUrl}/icons/iterations.png`} alt="" className="pv-menu-icon" />
                <span>Iterations</span>
              </button>
              {iterations.map((iter, idx) => (
                <button
                  key={idx}
                  className={`pv-sub-item${activeIteration === idx ? " is-active" : ""}`}
                  onClick={() => setActiveIteration(idx)}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                    background: activeIteration === idx ? "var(--pv-accent)" : "rgba(255,255,255,0.1)",
                    color: activeIteration === idx ? "#fff" : "inherit",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {iterationLabels[idx] || idx + 1}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {iter.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Devices section */}
          <div style={{ marginTop: 2 }}>
            <button className="pv-menu-item" style={{ cursor: "default" }}>
              <img src={`${assetsUrl}/icons/devices.png`} alt="" className="pv-menu-icon" />
              <span>Devices</span>
            </button>
            <button
              className={`pv-sub-item${device === "phone" ? " is-active" : ""}`}
              onClick={() => setDevice("phone")}
            >
              <img src={`${assetsUrl}/icons/device-phone.png`} alt="" className="pv-sub-icon" />
              <span>Phone</span>
            </button>
            <button
              className={`pv-sub-item${device === "tablet" ? " is-active" : ""}`}
              onClick={() => setDevice("tablet")}
            >
              <img src={`${assetsUrl}/icons/device-tablet.png`} alt="" className="pv-sub-icon" />
              <span>Tablet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
      >
        {/* Current iteration & filename — top right */}
        {iterations.length > 0 && (
          <div style={{
            position: "absolute", top: 12, right: 16, zIndex: 20,
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 8,
            background: "rgba(60,64,68,0.75)", backdropFilter: "blur(8px)",
            color: "#fff", fontSize: 12, fontWeight: 500,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}>
            <span style={{
              width: 20, height: 20, borderRadius: 6,
              background: "var(--pv-accent)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 700, flexShrink: 0,
            }}>
              {iterationLabels[activeIteration] || activeIteration + 1}
            </span>
            <span>{iterations[activeIteration]?.name || ""}</span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>|</span>
            <span style={{ color: "rgba(255,255,255,0.6)", fontFamily: "monospace", fontSize: 11 }}>
              {currentFile}
            </span>
          </div>
        )}

        <img
          src={frameImg}
          alt={`${device} ${orientation}`}
          onLoad={computeImgRect}
          style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: "100%",
            objectFit: "contain",
            pointerEvents: "none", userSelect: "none",
            zIndex: 2,
          }}
        />

        {imgRect && (iframeSrc ? (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title="Preview"
            onLoad={handleIframeLoad}
            style={{
              position: "absolute",
              left: imgRect.x + imgRect.w * (fc.left / 100),
              top: imgRect.y + imgRect.h * (fc.top / 100),
              width: imgRect.w * (fc.iw / 100),
              height: imgRect.h * (fc.ih / 100),
              border: "none", background: "#000", zIndex: 3,
            }}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div style={{
            position: "absolute",
            left: imgRect.x + imgRect.w * (fc.left / 100),
            top: imgRect.y + imgRect.h * (fc.top / 100),
            width: imgRect.w * (fc.iw / 100),
            height: imgRect.h * (fc.ih / 100),
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "rgba(255,255,255,0.3)", fontSize: 14, fontWeight: 500,
            background: "#000", zIndex: 3,
          }}>
            No file selected
          </div>
        ))}

        {/* Click banner — desktop */}
        {showClickBanner && imgRect && (
          <div
            className="pv-click-banner"
            style={{
              position: "absolute",
              left: imgRect.x + imgRect.w * (fc.left / 100),
              top: imgRect.y + imgRect.h * (fc.top / 100),
              width: imgRect.w * (fc.iw / 100),
              zIndex: 10,
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px",
              background: "linear-gradient(135deg, #0583AA 0%, #047a9e 100%)",
              color: "#fff", fontSize: 12, fontWeight: 600,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 100 100" fill="white">
                <polygon points="50,8 61,35 90,35 67,55 76,83 50,66 24,83 33,55 10,35 39,35" />
                <circle cx="50" cy="50" r="12" fill="none" stroke="white" strokeWidth="2" />
              </svg>
              <span>You have successfully clicked</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
