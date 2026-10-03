/* ============================================
   02-UI.JS
   Navegação entre telas e abas
   
   Depende de: 00-config.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // TROCAR ENTRE TELAS PRINCIPAIS
  // ============================================

  function mostrarTela(id, index = -1) {
    const telas = document.querySelectorAll('.screen');
    const tabs = document.querySelectorAll('.tab');

    telas.forEach((tela) => {
      tela.style.display = 'none';
      tela.classList.remove('active');
    });

    tabs.forEach((tab) => tab.classList.remove('active-tab'));

    const pagina = document.getElementById(id);
    if (pagina) {
      pagina.style.display = 'block';
      pagina.classList.add('active');
    }

    if (index >= 0 && tabs[index]) {
  tabs[index].classList.add('active-tab');
}

// ⚠️ Salva a tela atual pra restaurar no reload
if (id && id !== 'chatNex') {
  try {
    localStorage.setItem('drops_tela_atual', id);
  } catch (e) {}
}

    // Esconde a tela NEX quando abre o chat
    if (id === 'chatNex') {
      const nex = document.getElementById('nex');
      if (nex) nex.classList.remove('active');
    }

    window.scrollTo(0, 0);
  }

  // ============================================
  // TROCAR ENTRE ABAS DO NEX
  // ============================================

  function mostrarNexTab(tipo) {
    Drops.estado.abaNex = tipo;

    const paginas = document.querySelectorAll('.nex-page');
    const botoes = document.querySelectorAll('.nex-tab');

    paginas.forEach((pagina) => {
      pagina.style.display = 'none';
      pagina.classList.remove('active-nex-page');
    });

    botoes.forEach((botao) => botao.classList.remove('active-nex-tab'));

    const paginaAtiva = document.getElementById(`nex-${tipo}`);
    if (paginaAtiva) {
      paginaAtiva.style.display = 'flex';
      paginaAtiva.classList.add('active-nex-page');
    }

    const mapa = { naolidas: 0, geral: 1, conectados: 2 };
    const index = mapa[tipo];
    if (typeof index === 'number' && botoes[index]) {
      botoes[index].classList.add('active-nex-tab');
    }
  }

  // ============================================
  // TROCAR ENTRE ABAS DO MY DROPS
  // ============================================

  function mostrarMyDropsTab(tipo) {
    const tabs = document.querySelectorAll('.mydrops-tab');
    const panels = document.querySelectorAll('.mydrops-tab-panel');

    tabs.forEach((tab) => tab.classList.remove('active'));
    panels.forEach((panel) => panel.classList.remove('active'));

    const tabAtiva = document.querySelector(
      `.mydrops-tab[data-tab="${tipo}"]`
    );
    const painelAtivo = document.querySelector(
      `.mydrops-tab-panel[data-panel="${tipo}"]`
    );

    if (tabAtiva) tabAtiva.classList.add('active');
    if (painelAtivo) painelAtivo.classList.add('active');
  }

  // ============================================
  // EVENTOS DAS TABS DO MY DROPS
  // ============================================

  function initMyDropsTabs() {
    document.querySelectorAll('.mydrops-tab').forEach((botao) => {
      botao.addEventListener('click', () => {
        mostrarMyDropsTab(botao.dataset.tab);
      });
    });
  }

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    initMyDropsTabs();
  });

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.mostrarTela = mostrarTela;
  window.mostrarNexTab = mostrarNexTab;
  window.mostrarMyDropsTab = mostrarMyDropsTab;

  window.abrirTela = function (id, index = -1) {
    mostrarTela(id, index);
  };

  window.abrirNexTab = function (tipo) {
    mostrarNexTab(tipo);
  };

  // ============================================
  // DEBUG
  // ============================================

  console.log('🎨 02-ui.js carregado');

})();