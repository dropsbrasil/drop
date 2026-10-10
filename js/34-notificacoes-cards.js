/* ============================================
   34-NOTIFICACOES-CARDS.JS
   Borda azul em cards com novidade (Fase 5)

   - Card do conectado que postou algo novo
   - Card do meu drop que recebeu reação nova

   Borda some ao ABRIR O DROP (não o perfil).
   Persistência: localStorage com timestamps.

   Depende de: nada
============================================ */

(function () {
  'use strict';

  const CHAVE_POST   = 'drops_novidade_post_conectado';
  const CHAVE_REACAO = 'drops_novidade_reacao_drop';

  // ============================================
  // HELPERS localStorage
  // ============================================

  function lerMapa(chave) {
    try {
      const raw = localStorage.getItem(chave);
      if (!raw) return {};
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function gravarMapa(chave, obj) {
    try {
      localStorage.setItem(chave, JSON.stringify(obj || {}));
    } catch (e) {}
  }

  function normalizarUser(v) {
    return String(v || '').replace(/^@/, '').toLowerCase().trim();
  }

  // ============================================
  // POST NOVO DE CONECTADO
  // ============================================

  function marcarNovidadePostConectado(username) {
    const u = normalizarUser(username);
    if (!u) return;
    const mapa = lerMapa(CHAVE_POST);
    mapa[u] = Date.now();
    gravarMapa(CHAVE_POST, mapa);
  }

  function temNovidadePostConectado(username) {
    const u = normalizarUser(username);
    if (!u) return false;
    const mapa = lerMapa(CHAVE_POST);
    return !!mapa[u];
  }

  function limparNovidadePostConectado(username) {
    const u = normalizarUser(username);
    if (!u) return;
    const mapa = lerMapa(CHAVE_POST);
    if (mapa[u]) {
      delete mapa[u];
      gravarMapa(CHAVE_POST, mapa);
    }
  }

  // ============================================
  // REAÇÃO NOVA EM MEU DROP
  // ============================================

  function marcarNovidadeReacaoDrop(publicacaoId) {
    const id = String(publicacaoId || '').trim();
    if (!id) return;
    const mapa = lerMapa(CHAVE_REACAO);
    mapa[id] = Date.now();
    gravarMapa(CHAVE_REACAO, mapa);
  }

  function temNovidadeReacaoDrop(publicacaoId) {
    const id = String(publicacaoId || '').trim();
    if (!id) return false;
    const mapa = lerMapa(CHAVE_REACAO);
    return !!mapa[id];
  }

  function limparNovidadeReacaoDrop(publicacaoId) {
    const id = String(publicacaoId || '').trim();
    if (!id) return;
    const mapa = lerMapa(CHAVE_REACAO);
    if (mapa[id]) {
      delete mapa[id];
      gravarMapa(CHAVE_REACAO, mapa);
    }
  }

  // ============================================
  // ATUALIZAR BORDAS DOS CARDS JÁ NO DOM
  // ============================================

  function atualizarBordasNearby() {
    document
      .querySelectorAll('.story-card[data-autor-id]')
      .forEach((card) => {
        const autor = card.dataset.autorId;
        card.classList.toggle(
          'tem-novidade',
          temNovidadePostConectado(autor)
        );
      });
  }

  function atualizarBordasMyDrops() {
    document
      .querySelectorAll('.mydrops-publication-card[data-novidade-id]')
      .forEach((card) => {
        const id = card.dataset.novidadeId;
        card.classList.toggle('tem-novidade', temNovidadeReacaoDrop(id));
      });
  }

  function atualizarBordasCardsNex() {
    atualizarBordasNearby();
    atualizarBordasMyDrops();
  }

  // ============================================
  // EXPOR
  // ============================================

  window.marcarNovidadePostConectado   = marcarNovidadePostConectado;
  window.temNovidadePostConectado      = temNovidadePostConectado;
  window.limparNovidadePostConectado   = limparNovidadePostConectado;

  window.marcarNovidadeReacaoDrop      = marcarNovidadeReacaoDrop;
  window.temNovidadeReacaoDrop         = temNovidadeReacaoDrop;
  window.limparNovidadeReacaoDrop      = limparNovidadeReacaoDrop;

  window.atualizarBordasCardsNex       = atualizarBordasCardsNex;

// ⚠️ Reforço: os cards são re-renderizados depois do DOMContentLoaded
// (sincronização Supabase, init, etc). Sem isso, a borda some ao recarregar.
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(atualizarBordasCardsNex, 500);
  setTimeout(atualizarBordasCardsNex, 1500);
  setTimeout(atualizarBordasCardsNex, 3000);
});

// ⚠️ Cobre "sair e voltar" via bfcache
window.addEventListener('pageshow', () => {
  setTimeout(atualizarBordasCardsNex, 300);
});

console.log('🟦 34-notificacoes-cards.js carregado');
  
})();
