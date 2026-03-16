(() => {
  const OVERLAY_ID = "__ppcp_overlay__";

  function teardown(overlay, handlers) {
    if (!overlay) return;
    overlay.removeEventListener("mousemove", handlers.onMove, true);
    overlay.removeEventListener("click", handlers.onClick, true);
    window.removeEventListener("keydown", handlers.onKeyDown, true);
    overlay.remove();
  }

  function ensureOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "2147483647";
    overlay.style.cursor = "crosshair";
    overlay.style.background = "rgba(0,0,0,0.02)";
    overlay.style.backdropFilter = "none";

    const cross = document.createElement("div");
    cross.style.position = "absolute";
    cross.style.width = "18px";
    cross.style.height = "18px";
    cross.style.transform = "translate(-50%, -50%)";
    cross.style.border = "1px solid rgba(0,0,0,0.55)";
    cross.style.borderRadius = "4px";
    cross.style.boxShadow = "0 0 0 1px rgba(255,255,255,0.75) inset";
    cross.style.pointerEvents = "none";
    overlay.appendChild(cross);

    document.documentElement.appendChild(overlay);
    return { overlay, cross };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.type !== "PP_PICK_PIXEL") return;

    const { overlay, cross } = ensureOverlay();

    const handlers = {
      onMove: (e) => {
        cross.style.left = `${e.clientX}px`;
        cross.style.top = `${e.clientY}px`;
      },
      onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const payload = {
          canceled: false,
          x: e.clientX,
          y: e.clientY,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight
        };

        teardown(overlay, handlers);
        sendResponse(payload);
      },
      onKeyDown: (e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        teardown(overlay, handlers);
        sendResponse({ canceled: true });
      }
    };

    overlay.addEventListener("mousemove", handlers.onMove, true);
    overlay.addEventListener("click", handlers.onClick, true);
    window.addEventListener("keydown", handlers.onKeyDown, true);

    // Keep the message channel open for async sendResponse.
    return true;
  });
})();
