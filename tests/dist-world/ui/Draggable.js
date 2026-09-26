"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeDraggable = makeDraggable;

let topZIndex = 100;

function makeDraggable(panelEl, handleEl, options = {}) {
  const margin = options.margin ?? 8;
  const storageKey = options.storageKey;

  const getPanelDimensions = () => {
    let w = panelEl.offsetWidth;
    let h = panelEl.offsetHeight;
    if (!w || !h) {
      if (typeof window !== 'undefined' && window.getComputedStyle) {
        const computed = window.getComputedStyle(panelEl);
        w = parseInt(computed.width, 10) || 300;
        h = parseInt(computed.height, 10) || 200;
      } else {
        w = 300;
        h = 200;
      }
    }
    return { width: w, height: h };
  };

  const clampPosition = (left, top) => {
    const { width } = getPanelDimensions();
    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const winHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
    const maxLeft = Math.max(margin, winWidth - width - margin);
    const maxTop = Math.max(margin, winHeight - 40);
    return {
      left: Math.max(margin, Math.min(left, maxLeft)),
      top: Math.max(margin, Math.min(top, maxTop)),
    };
  };

  const applyPosition = (left, top) => {
    const clamped = clampPosition(left, top);
    panelEl.style.left = `${clamped.left}px`;
    panelEl.style.top = `${clamped.top}px`;
    panelEl.style.right = 'auto';
    panelEl.style.bottom = 'auto';
  };

  const bringToFront = () => {
    topZIndex++;
    panelEl.style.zIndex = String(topZIndex);
  };

  panelEl.addEventListener('pointerdown', bringToFront);

  if (storageKey && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
          applyPosition(parsed.left, parsed.top);
        }
      }
    } catch {
      // Ignore
    }
  }

  let isDragging = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let startPanelLeft = 0;
  let startPanelTop = 0;

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const target = e.target;
    if (target && target.closest && target.closest('button, input, select, textarea, a, [role="button"]')) {
      return;
    }

    isDragging = true;
    startPointerX = e.clientX;
    startPointerY = e.clientY;

    const rect = panelEl.getBoundingClientRect();
    startPanelLeft = rect.left;
    startPanelTop = rect.top;

    panelEl.style.left = `${startPanelLeft}px`;
    panelEl.style.top = `${startPanelTop}px`;
    panelEl.style.right = 'auto';
    panelEl.style.bottom = 'auto';

    panelEl.classList.add('is-dragging');
    handleEl.classList.add('is-dragging');
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.userSelect = 'none';
    }

    bringToFront();
    options.onDragStart?.();

    if (typeof window !== 'undefined') {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    }
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;

    applyPosition(startPanelLeft + dx, startPanelTop + dy);
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;

    panelEl.classList.remove('is-dragging');
    handleEl.classList.remove('is-dragging');
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.userSelect = '';
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    }

    const finalLeft = parseFloat(panelEl.style.left) || 0;
    const finalTop = parseFloat(panelEl.style.top) || 0;

    if (storageKey && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ left: finalLeft, top: finalTop }));
      } catch {
        // Ignore
      }
    }

    options.onDragEnd?.({ left: finalLeft, top: finalTop });
  };

  handleEl.addEventListener('pointerdown', onPointerDown);

  const onResize = () => {
    if (panelEl.style.left && panelEl.style.left !== 'auto') {
      const curLeft = parseFloat(panelEl.style.left) || 0;
      const curTop = parseFloat(panelEl.style.top) || 0;
      applyPosition(curLeft, curTop);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', onResize);
  }

  const resetPosition = () => {
    if (storageKey && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
    panelEl.style.left = '';
    panelEl.style.top = '';
    panelEl.style.right = '';
    panelEl.style.bottom = '';
  };

  const destroy = () => {
    handleEl.removeEventListener('pointerdown', onPointerDown);
    panelEl.removeEventListener('pointerdown', bringToFront);
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    }
  };

  return {
    destroy,
    resetPosition,
    bringToFront,
  };
}
