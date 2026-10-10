/* ============================================
   32-NOTIFICACOES-TABS.JS
   Bolinha vermelha nas tabs Nearby e My Drops

   Regra:
   - Se está na tab → bolinha NÃO aparece
   - Bolinha some ao abrir a tab
   - Persiste via localStorage entre sessões

   Depende de: nada (só DOM + localStorage)
============================================ */

(function () {
  'use strict';

  const CHAVE_NEARBY = 'drops_novidade_nearby';
  const CHAVE_MYDROPS = 'drops_novidade_mydrops';

  // ============================================
  // LER / GRAVAR ESTADO
  // ============================================

  function temNovidadeNex(tipo) {
    try {
      const chave = tipo === 'nearby' ? CHAVE_NEARBY : CHAVE_MYDROPS;
      return localStorage.getItem(chave) === '1';
    } catch (e) {
      return false;
    }
  }

  function gravarNovidadeNex(tipo, valor) {
    try {
      const chave = tipo === 'nearby' ? CHAVE_NEARBY : CHAVE_MYDROPS;
      if (valor) {
        localStorage.setItem(chave, '1');
      } else {
        localStorage.removeItem(chave);
      }
    } catch (e) {}
  }

  // ============================================
  // TAB ATIVA NO DOM?
  // ============================================

  function tabEstaAtivaNex(tipo) {
    const seletor =
      tipo === 'nearby' ? '.tab.tab-nearby' :
      tipo === 'mydrops' ? '.tab.tab-mydrops' :
      null;

    if (!seletor) return false;

    const tab = document.querySelector(seletor);
    return !!(tab && tab.classList.contains('active-tab'));
  }

  // ============================================
  // APLICAR CLASSE NO DOM
  // ============================================

  function atualizarBolinhasTabsNex() {
    const alvos = [
      { tipo: 'nearby',  seletor: '.tab.tab-nearby'  },
      { tipo: 'mydrops', seletor: '.tab.tab-mydrops' }
    ];

    alvos.forEach(({ tipo, seletor }) => {
      const tab = document.querySelector(seletor);
      if (!tab) return;

      const deveMostrar =
        temNovidadeNex(tipo) && !tabEstaAtivaNex(tipo);

      tab.classList.toggle('tem-notificacao', deveMostrar);
    });
  }

  // ============================================
  // API PÚBLICA
  // ============================================

  // Chamado quando o app detecta algo novo (realtime/polling)
  function sinalizarNovidadeNex(tipo) {
    if (tipo !== 'nearby' && tipo !== 'mydrops') return;
    if (tabEstaAtivaNex(tipo)) return; // está na tab → não sinaliza

    gravarNovidadeNex(tipo, true);
    atualizarBolinhasTabsNex();
  }

  // Chamado quando o usuário abre a tab
  function marcarViuNex(tipo) {
    if (tipo !== 'nearby' && tipo !== 'mydrops') return;
    gravarNovidadeNex(tipo, false);
    atualizarBolinhasTabsNex();
  }

  // Limpa tudo (debug/reset)
  function limparNovidadesNex() {
    gravarNovidadeNex('nearby', false);
    gravarNovidadeNex('mydrops', false);
    atualizarBolinhasTabsNex();
  }

  // ============================================
  // INTERCEPTAR CLIQUES NA TABBAR
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    // Aplica estado salvo ao carregar
    atualizarBolinhasTabsNex();

    // Escuta clique em cada tab
    document.querySelectorAll('.tabbar .tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        // Pequeno delay pro mostrarTela() rodar primeiro
        setTimeout(() => {
          if (tab.classList.contains('tab-nearby')) {
            marcarViuNex('nearby');
          } else if (tab.classList.contains('tab-mydrops')) {
            marcarViuNex('mydrops');
          }
        }, 50);
      });
    });
  });

  // ============================================
  // EXPOR GLOBALMENTE
  // ============================================

  window.sinalizarNovidadeNex = sinalizarNovidadeNex;
  window.marcarViuNex = marcarViuNex;
  window.limparNovidadesNex = limparNovidadesNex;
  window.atualizarBolinhasTabsNex = atualizarBolinhasTabsNex;
  window.temNovidadeNex = temNovidadeNex;

  console.log('🔔 32-notificacoes-tabs.js carregado');

})();