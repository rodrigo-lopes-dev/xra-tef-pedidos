/**
 * Modo Kiosk/Fullscreen para Totem de Autoatendimento
 * Importar no componente do cliente: import '../../utils/kioskMode';
 *
 * - Fullscreen automatico com re-entry
 * - Bloqueio de teclas, mouse, touch, selecao
 * - Saida secreta via Ctrl+Shift+Alt+Q (pede senha)
 */

const KIOSK_PASSWORD = 'xra2026';
let kioskAtivo = false;
let fullscreenInterval: ReturnType<typeof setInterval> | null = null;
let focusInterval: ReturnType<typeof setInterval> | null = null;

// =============================================
// FULLSCREEN
// =============================================

function enterFullscreen() {
  const el = document.documentElement as any;
  const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (req && !document.fullscreenElement) {
    req.call(el).catch(() => {});
  }
}

function startFullscreenPolling() {
  // Entra fullscreen apos 1 segundo
  setTimeout(enterFullscreen, 1000);

  // Re-entra se sair (polling 500ms)
  fullscreenInterval = setInterval(() => {
    if (kioskAtivo && !document.fullscreenElement) {
      enterFullscreen();
    }
  }, 500);
}

function stopFullscreenPolling() {
  if (fullscreenInterval) {
    clearInterval(fullscreenInterval);
    fullscreenInterval = null;
  }
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

// =============================================
// BLOQUEIO DE TECLAS
// =============================================

function handleKeydown(e: KeyboardEvent) {
  if (!kioskAtivo) return;

  // Saida secreta: Ctrl+Shift+Alt+Q
  if (e.ctrlKey && e.shiftKey && e.altKey && (e.key === 'Q' || e.key === 'q')) {
    e.preventDefault();
    const senha = prompt('Senha do administrador:');
    if (senha === KIOSK_PASSWORD) {
      desativarKiosk();
    }
    return;
  }

  // Permitir copiar/colar dentro de inputs
  const target = e.target as HTMLElement;
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
  if (isInput && e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'a')) {
    return; // permitir
  }

  // Bloquear F5, F11, F12, Escape
  if (['F5', 'F11', 'F12', 'Escape'].includes(e.key)) {
    e.preventDefault();
    return;
  }

  // Bloquear Ctrl/Cmd + R, W, N, T, U, P
  if ((e.ctrlKey || e.metaKey) && ['r', 'w', 'n', 't', 'u', 'p'].includes(e.key.toLowerCase())) {
    e.preventDefault();
    return;
  }

  // Bloquear Ctrl+Shift+I/J/C (DevTools)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) {
    e.preventDefault();
    return;
  }

  // Bloquear Alt+Tab, Alt+F4
  if (e.altKey && (e.key === 'Tab' || e.key === 'F4')) {
    e.preventDefault();
    return;
  }
}

// =============================================
// BLOQUEIO DE MOUSE
// =============================================

function handleContextMenu(e: Event) {
  if (!kioskAtivo) return;
  e.preventDefault();
}

function handleDblClick(e: Event) {
  if (!kioskAtivo) return;
  e.preventDefault();
}

function handleAuxClick(e: Event) {
  if (!kioskAtivo) return;
  e.preventDefault();
}

function handleDragStart(e: Event) {
  if (!kioskAtivo) return;
  e.preventDefault();
}

function handleDrop(e: Event) {
  if (!kioskAtivo) return;
  e.preventDefault();
}

// =============================================
// BLOQUEIO DE TOUCH
// =============================================

let touchStartY = 0;
// touchStartX reservado para uso futuro (swipe horizontal)
let touchCount = 0;

function handleTouchStart(e: TouchEvent) {
  if (!kioskAtivo) return;

  touchCount = e.touches.length;
  touchStartY = e.touches[0].clientY;

  // Bloquear pinch zoom (2+ dedos)
  if (touchCount > 1) {
    e.preventDefault();
  }
}

function handleTouchMove(e: TouchEvent) {
  if (!kioskAtivo) return;

  // Bloquear pinch zoom
  if (e.touches.length > 1) {
    e.preventDefault();
    return;
  }

  const touchY = e.touches[0].clientY;
  const deltaY = touchY - touchStartY;

  // Bloquear swipe down da borda superior (sair fullscreen)
  if (touchStartY < 30 && deltaY > 10) {
    e.preventDefault();
    return;
  }

  // Bloquear swipe up da borda inferior (navegacao Android)
  const screenH = window.innerHeight;
  if (touchStartY > screenH - 30 && deltaY < -10) {
    e.preventDefault();
    return;
  }
}

// Bloquear duplo toque (zoom)
let lastTap = 0;
function handleTouchEnd(e: TouchEvent) {
  if (!kioskAtivo) return;
  const now = Date.now();
  if (now - lastTap < 300) {
    e.preventDefault();
  }
  lastTap = now;
}

// =============================================
// BLOQUEIO DE SCROLL/ZOOM
// =============================================

function handleWheel(e: WheelEvent) {
  if (!kioskAtivo) return;
  if (e.ctrlKey) e.preventDefault(); // Ctrl+scroll = zoom
}

// =============================================
// BLOQUEIO DE SELECAO (CSS)
// =============================================

let styleEl: HTMLStyleElement | null = null;

function addKioskCSS() {
  styleEl = document.createElement('style');
  styleEl.id = 'kiosk-mode-css';
  styleEl.textContent = `
    body.kiosk-mode,
    body.kiosk-mode * {
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }
    body.kiosk-mode input,
    body.kiosk-mode textarea,
    body.kiosk-mode [contenteditable="true"] {
      -webkit-user-select: text !important;
      user-select: text !important;
    }
    body.kiosk-mode .hg-button {
      -webkit-user-select: none !important;
      user-select: none !important;
    }
    body.kiosk-mode {
      overscroll-behavior: none !important;
      touch-action: manipulation !important;
    }
  `;
  document.head.appendChild(styleEl);
  document.body.classList.add('kiosk-mode');
}

function removeKioskCSS() {
  document.body.classList.remove('kiosk-mode');
  if (styleEl) {
    styleEl.remove();
    styleEl = null;
  }
}

// =============================================
// BLOQUEIO DE SAIDA
// =============================================

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (!kioskAtivo) return;
  e.preventDefault();
  e.returnValue = 'Voce esta em modo totem. Deseja realmente sair?';
}

// =============================================
// MONITORAMENTO DE FOCO
// =============================================

function startFocusMonitor() {
  focusInterval = setInterval(() => {
    if (kioskAtivo && !document.hasFocus()) {
      window.focus();
    }
  }, 1000);
}

function stopFocusMonitor() {
  if (focusInterval) {
    clearInterval(focusInterval);
    focusInterval = null;
  }
}

function handleBlur() {
  if (!kioskAtivo) return;
  setTimeout(() => window.focus(), 100);
}

// =============================================
// ATIVAR / DESATIVAR
// =============================================

function ativarKiosk() {
  if (kioskAtivo) return;
  kioskAtivo = true;

  // CSS
  addKioskCSS();

  // Fullscreen
  startFullscreenPolling();

  // Teclas
  document.addEventListener('keydown', handleKeydown, true);

  // Mouse
  document.addEventListener('contextmenu', handleContextMenu, true);
  document.addEventListener('dblclick', handleDblClick, true);
  document.addEventListener('auxclick', handleAuxClick, true);
  document.addEventListener('dragstart', handleDragStart, true);
  document.addEventListener('drop', handleDrop, true);

  // Touch
  document.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });

  // Scroll/zoom
  document.addEventListener('wheel', handleWheel, { passive: false });

  // Saida
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Foco
  window.addEventListener('blur', handleBlur);
  startFocusMonitor();

  console.log('[KioskMode] Ativado');
}

function desativarKiosk() {
  if (!kioskAtivo) return;
  kioskAtivo = false;

  // CSS
  removeKioskCSS();

  // Fullscreen
  stopFullscreenPolling();

  // Teclas
  document.removeEventListener('keydown', handleKeydown, true);

  // Mouse
  document.removeEventListener('contextmenu', handleContextMenu, true);
  document.removeEventListener('dblclick', handleDblClick, true);
  document.removeEventListener('auxclick', handleAuxClick, true);
  document.removeEventListener('dragstart', handleDragStart, true);
  document.removeEventListener('drop', handleDrop, true);

  // Touch
  document.removeEventListener('touchstart', handleTouchStart, true);
  document.removeEventListener('touchmove', handleTouchMove, true);
  document.removeEventListener('touchend', handleTouchEnd, true);

  // Scroll/zoom
  document.removeEventListener('wheel', handleWheel);

  // Saida
  window.removeEventListener('beforeunload', handleBeforeUnload);

  // Foco
  window.removeEventListener('blur', handleBlur);
  stopFocusMonitor();

  console.log('[KioskMode] Desativado (senha correta)');
}

// =============================================
// AUTO-ATIVAR ao importar
// =============================================

ativarKiosk();

export { ativarKiosk, desativarKiosk };
