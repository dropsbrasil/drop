/* ============================================
   37-ONBOARDING-VIEWERS.JS
   Balão instrutivo de primeira vez nos viewers
   (Minhas Publicações e Nearby)

   Regras:
   - Aparece só na PRIMEIRA vez que o usuário abre cada viewer
   - Salvo no localStorage por usuário
   - Ao clicar em "Entendi", não aparece mais
   - Nearby mostra 2 balões em sequência:
       Balão 1 → vertical (mudar de perfil)
       Balão 2 → horizontal (navegar entre publicações)
   - Não depende de Supabase

   Depende de: 00-config.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // CHAVES localStorage (por usuário)
  // ============================================

  function chaveVistaNex(tipo) {
    const user = String(window.Drops?.usernameAtual || '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase();

    return `drops_onboarding_viewer_${tipo}_${user || 'anon'}`;
  }

  function jaViuNex(tipo) {
    try {
      return localStorage.getItem(chaveVistaNex(tipo)) === 'true';
    } catch (e) {
      return false;
    }
  }

  function marcarComoVistoNex(tipo) {
    try {
      localStorage.setItem(chaveVistaNex(tipo), 'true');
    } catch (e) {}
  }

  // ============================================
  // ESTADO
  // ============================================

  let overlayAtualNex = null;

  // ============================================
  // CRIAR / FECHAR OVERLAY
  // ============================================

  function criarOverlayNex(html) {
    const overlay = document.createElement('div');
    overlay.className = 'onb-viewer-overlay-nex';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    // Força reflow pra animar a entrada
    void overlay.offsetWidth;
    overlay.classList.add('visivel');

    overlayAtualNex = overlay;

    return overlay;
  }

  function fecharOverlayNex(overlay, tipo) {
    if (!overlay) return;

    overlay.classList.remove('visivel');

    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (overlayAtualNex === overlay) overlayAtualNex = null;
    }, 300);

    if (tipo) marcarComoVistoNex(tipo);
  }

  // ============================================
  // AVISO — MINHAS PUBLICAÇÕES
  // ============================================

  function mostrarOnboardingMinhasPublicacoesNex() {
    if (jaViuNex('mydrops')) return false;
    if (overlayAtualNex) return false;

    const overlay = criarOverlayNex(`
      <div class="onb-viewer-balao-nex">
        <div class="onb-viewer-icones-nex">
          <span class="onb-viewer-icone-nex onb-viewer-icone-horizontal-nex">👈🏻</span>
          <span class="onb-viewer-icone-nex onb-viewer-icone-horizontal-nex">👉🏻</span>
        </div>

        <div class="onb-viewer-texto-nex">
          <strong>Arraste na horizontal</strong> para ver seus drops
        </div>

        <button type="button" class="onb-viewer-btn-nex" id="onbViewerOkNex">
          Entendi
        </button>
      </div>
    `);

    overlay.querySelector('#onbViewerOkNex').addEventListener('click', () => {
      fecharOverlayNex(overlay, 'mydrops');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.querySelector('#onbViewerOkNex').click();
      }
    });

    return true;
  }

  // ============================================
  // AVISO — NEARBY (BALÃO 1 — VERTICAL)
  // ============================================

  function mostrarOnboardingNearbyNex() {
    if (jaViuNex('nearby')) return false;
    if (overlayAtualNex) return false;

    const overlay = criarOverlayNex(`
      <div class="onb-viewer-balao-nex">
        <div class="onb-viewer-icones-nex">
          <span class="onb-viewer-icone-nex onb-viewer-icone-vertical-nex">👆🏻</span>
          <span class="onb-viewer-icone-nex onb-viewer-icone-vertical-nex">👇🏻</span>
        </div>

        <div class="onb-viewer-texto-nex">
          <strong>Arraste na vertical</strong> para mudar de perfil
        </div>

        <button type="button" class="onb-viewer-btn-nex" id="onbViewerOkNex">
          Entendi
        </button>
      </div>
    `);

    overlay.querySelector('#onbViewerOkNex').addEventListener('click', () => {
      // ⚠️ Fecha o balão 1 SEM marcar como visto
      fecharOverlayNex(overlay, null);

      // ⚠️ Depois de fechar, abre o balão 2 (horizontal)
      setTimeout(() => {
        mostrarOnboardingNearbyBalao2Nex();
      }, 250);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.querySelector('#onbViewerOkNex').click();
      }
    });

    return true;
  }

  // ============================================
  // AVISO — NEARBY (BALÃO 2 — HORIZONTAL)
  // ============================================

  function mostrarOnboardingNearbyBalao2Nex() {
    if (overlayAtualNex) return false;

    const overlay = criarOverlayNex(`
      <div class="onb-viewer-balao-nex">
        <div class="onb-viewer-icones-nex">
          <span class="onb-viewer-icone-nex onb-viewer-icone-horizontal-nex">👈🏻</span>
          <span class="onb-viewer-icone-nex onb-viewer-icone-horizontal-nex">👉🏻</span>
        </div>

        <div class="onb-viewer-texto-nex">
          <strong>Arraste na horizontal</strong> para navegar entre as publicações do mesmo perfil
        </div>

        <button type="button" class="onb-viewer-btn-nex" id="onbViewerOkNex">
          Entendi
        </button>
      </div>
    `);

    overlay.querySelector('#onbViewerOkNex').addEventListener('click', () => {
      fecharOverlayNex(overlay, 'nearby');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.querySelector('#onbViewerOkNex').click();
      }
    });

    return true;
  }

  // ============================================
  // RESET (pra testar no console)
  // ============================================

  function resetOnboardingViewersNex() {
    try {
      localStorage.removeItem(chaveVistaNex('mydrops'));
      localStorage.removeItem(chaveVistaNex('nearby'));
      console.log('🔄 Onboarding dos viewers resetado');
    } catch (e) {}
  }

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.mostrarOnboardingMinhasPublicacoesNex = mostrarOnboardingMinhasPublicacoesNex;
  window.mostrarOnboardingNearbyNex = mostrarOnboardingNearbyNex;
  window.mostrarOnboardingNearbyBalao2Nex = mostrarOnboardingNearbyBalao2Nex;
  window.resetOnboardingViewersNex = resetOnboardingViewersNex;

  console.log('🎓 37-onboarding-viewers.js carregado');

})();