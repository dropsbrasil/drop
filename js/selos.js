// ============================================
// SELOS DE ORIGEM — Linha única no visualizador
// ============================================
(function() {
  'use strict';

  function detectarPlataforma() {
    var ua = navigator.userAgent.toLowerCase();
    var platform = (navigator.platform || '').toLowerCase();
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'iPhone';
    if (ua.includes('windows') || platform.includes('win')) return 'Windows';
    if (ua.includes('macintosh') || platform.includes('mac')) return 'macOS';
    if (ua.includes('linux') || platform.includes('linux')) return 'Linux';
    return 'Web';
  }

  function detectarPeriodo() {
    var h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Manhã';
    if (h >= 12 && h < 18) return 'Tarde';
    if (h >= 18 && h < 24) return 'Noite';
    return 'Madrugada';
  }

  function detectarNavegador() {
    var ua = navigator.userAgent;
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Safari/')) return 'Safari';
    return null;
  }

  function detectarBateria() {
    if (!('getBattery' in navigator)) return Promise.resolve(null);
    return navigator.getBattery()
      .then(function(b) {
        return { nivel: Math.round(b.level * 100), carregando: b.charging };
      })
      .catch(function() { return null; });
  }

  function coletarSelos() {
    return detectarBateria().then(function(b) {
      return {
        plataforma: detectarPlataforma(),
        periodo: detectarPeriodo(),
        navegador: detectarNavegador(),
        bateria: b ? b.nivel : null,
        carregando: b ? b.carregando : false
      };
    });
  }

  function emojiBateria(nivel, carregando) {
    if (carregando) return '⚡';
    if (nivel === null || nivel === undefined) return '';
    return nivel >= 30 ? '🔋' : '🪫';
  }

  function gerarHTML(selos) {
    if (!selos) return '';

    var ICONES = { Android:'🤖', iPhone:'🍎', Windows:'🪟', macOS:'🍏', Linux:'🐧', Web:'🌐' };
    var PERIODO = { 'Manhã':'☀️', 'Tarde':'🌤️', 'Noite':'🌙', 'Madrugada':'🌌' };
    var itens = [];

    if (selos.plataforma) {
      itens.push((ICONES[selos.plataforma] || '🌐') + ' ' + selos.plataforma);
    }
    if (selos.periodo) {
      itens.push((PERIODO[selos.periodo] || '') + ' ' + selos.periodo);
    }
    if (selos.bateria !== null && selos.bateria !== undefined) {
      itens.push(emojiBateria(selos.bateria, selos.carregando) + ' ' + selos.bateria + '%');
    }
    if (selos.navegador) {
      itens.push(selos.navegador);
    }

    var html = '<div class="selos-origem">';
    for (var i = 0; i < itens.length; i++) {
      html += '<span class="selo">' + itens[i] + '</span>';
    }
    html += '</div>';

    return html;
  }

var css = document.createElement('style');
css.textContent = `
  .selos-origem {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 2px 4px;
    margin-top: 6px;
    padding: 0;
    background: transparent;
    border: none;
    box-shadow: none;
    pointer-events: none;
    max-width: 100%;
    box-sizing: border-box;
    overflow: visible;
  }

  .selos-origem .selo {
    display: inline-flex;
    align-items: center;
    color: #cbd5e1;
    font-size: 9.5px;
    font-weight: 700;
    line-height: 1.2;
    white-space: nowrap;
    text-shadow:
      0 1px 2px rgba(0, 0, 0, 0.65),
      0 0 8px rgba(0, 0, 0, 0.4);
    letter-spacing: 0.1px;
    flex-shrink: 0;
  }

  /* Pontinho separador entre os itens */
  .selos-origem .selo:not(:last-child)::after {
    content: '·';
    margin: 0 3px;
    opacity: 0.4;
    font-weight: 900;
    font-size: 10px;
    color: #94a3b8;
  }

  /* No visualizador */
  .mydrops-publication-viewer #mydropsPubSelos .selos-origem,
  .mydrops-publication-viewer .nearby-drop-user-meta .selos-origem {
    margin-top: 6px;
  }
`;
document.head.appendChild(css);

  // ---------- COLETA ÚNICA ----------
  var selosProntos = null;
  coletarSelos().then(function(s) {
    selosProntos = s;
    console.log('✅ Selos de origem prontos:', s);
  });

  // ---------- INTERCEPTA SALVAMENTO ----------
  var setItemOriginal = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(chave, valor) {
    if (chave === 'mydropsPublicacoesMyDropsNex' && selosProntos) {
      try {
        var lista = JSON.parse(valor);
        if (Array.isArray(lista)) {
          lista.forEach(function(pub) {
            if (!pub.selos) pub.selos = selosProntos;
          });
          valor = JSON.stringify(lista);
        }
      } catch(e) {}
    }
    return setItemOriginal(chave, valor);
  };

  // ---------- INJETA NO VISUALIZADOR ----------
  function injetarNoVisualizador() {
    var topLeft = document.querySelector('.mydrops-publication-viewer .nearby-drop-top-left');
    if (!topLeft) return;

    // Evita duplicar
    if (topLeft.querySelector('.selos-origem')) return;

    var counter = document.querySelector('#mydropsPubCounter');
    if (!counter) return;

    var atual = parseInt((counter.textContent || '').split('/')[0]);
    if (isNaN(atual) || atual < 1) return;

    try {
      var lista = JSON.parse(localStorage.getItem('mydropsPublicacoesMyDropsNex') || '[]');
      var ordenadas = lista.slice().sort(function(a, b) {
        return (b.criadoEm || 0) - (a.criadoEm || 0);
      });
      var pub = ordenadas[atual - 1];
      if (pub && pub.selos) {
        var meta = topLeft.querySelector('.nearby-drop-user-meta');
        if (meta) {
          meta.insertAdjacentHTML('beforeend', gerarHTML(pub.selos));
        }
      }
    } catch(e) {}
  }

  // ---------- LIMPA AO TROCAR DE PUBLICAÇÃO ----------
  function limparSeTrocou() {
    var counter = document.querySelector('#mydropsPubCounter');
    if (!counter) return;
    var atual = (counter.textContent || '').split('/')[0];
    var marcado = counter.dataset.seloPub;
    if (marcado !== atual) {
      var antigos = document.querySelectorAll('.mydrops-publication-viewer .selos-origem');
      antigos.forEach(function(el) { el.remove(); });
      counter.dataset.seloPub = atual;
    }
  }

  // ---------- OBSERVER ----------
  var observer = new MutationObserver(function() {
    limparSeTrocou();
    injetarNoVisualizador();
  });

  function iniciar() {
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }

})();