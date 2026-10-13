/* ============================================
   37-ONBOARDING-VIEWERS.JS
   Balão instrutivo de primeira vez nos viewers
   (Minhas Publicações e Nearby)

   Regras:
   - Cada balão aparece só UMA VEZ para o usuário
   - Só marca como visto quando o usuário clica em "Entendi"
   - Se o viewer for fechado antes do balão aparecer, ou enquanto
     o balão está aberto, ele é removido automaticamente SEM marcar
     como visto (na próxima vez, aparece de novo)
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
  let observerViewerNex = null;

  // ============================================
  // CRIAR / FECHAR OVERLAY
  // ============================================

  function criarOverlayNex(html) {
    const overlay = document.createElement('div');
    overlay.className = 'onb-viewer-overlay-nex';
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

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

    // ⚠️ Só marca como visto se o usuário clicou em Entendi
    if (tipo) marcarComoVistoNex(tipo);
  }

  // Remove o overlay na hora, sem animação, sem marcar como visto
  function removerOverlayNex(overlay) {
    if (!overlay) return;

    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (overlayAtualNex === overlay) overlayAtualNex = null;
  }

  // ============================================
  // MONITORAR SAÍDA DO VIEWER
  // ============================================
  // Se o viewer for removido do DOM (por qualquer motivo), o balão é
  // removido imediatamente — sem marcar como visto.
  //
  // Os viewers são filhos diretos do <body>, então o observer precisa
  // só olhar pro body com childList (sem subtree). É leve.

  function monitorarSaidaDoViewerNex(overlay, seletorViewer) {
    pararMonitoramentoNex();

    observerViewerNex = new MutationObserver(() => {
      const viewerAindaExiste = document.querySelector(seletorViewer);

      if (!viewerAindaExiste) {
        // ⚠️ SEM marcar como visto — o usuário não clicou em Entendi
        removerOverlayNex(overlay);
        pararMonitoramentoNex();
      }
    });

    observerViewerNex.observe(document.body, { childList: true });
  }

  function pararMonitoramentoNex() {
    if (observerViewerNex) {
      observerViewerNex.disconnect();
      observerViewerNex = null;
    }
  }

  // ============================================
  // AVISO — MINHAS PUBLICAÇÕES
  // ============================================

  function mostrarOnboardingMinhasPublicacoesNex() {
    // ⚠️ Só mostra se o viewer de Minhas Publicações estiver aberto
    if (!document.querySelector('.mydrops-publication-viewer')) return false;
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

    monitorarSaidaDoViewerNex(overlay, '.mydrops-publication-viewer');

    overlay.querySelector('#onbViewerOkNex').addEventListener('click', () => {
      // ⚠️ Marca como visto (o usuário clicou em Entendi)
      fecharOverlayNex(overlay, 'mydrops');
      pararMonitoramentoNex();
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
    // ⚠️ Só mostra se o viewer do Nearby estiver aberto
    if (!document.querySelector('.nearby-drop-viewer')) return false;
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

    monitorarSaidaDoViewerNex(overlay, '.nearby-drop-viewer');

    overlay.querySelector('#onbViewerOkNex').addEventListener('click', () => {
      // ⚠️ Fecha o balão 1 SEM marcar como visto
      fecharOverlayNex(overlay, null);
      pararMonitoramentoNex();

      // ⚠️ Abre o balão 2 — a função verifica se o viewer ainda tá aberto
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
    // ⚠️ Só mostra se o viewer ainda tá aberto
    if (!document.querySelector('.nearby-drop-viewer')) return false;
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

    monitorarSaidaDoViewerNex(overlay, '.nearby-drop-viewer');

    overlay.querySelector('#onbViewerOkNex').addEventListener('click', () => {
      // ⚠️ Aqui SIM marca como visto (fim dos 2 balões)
      fecharOverlayNex(overlay, 'nearby');
      pararMonitoramentoNex();
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