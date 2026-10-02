/* ============================================
   SELOS DE ORIGEM — público (Supabase)
   Plataforma • Período • Bateria • Navegador
============================================ */

(function () {
  'use strict';

  // ============================================
  // DETECÇÕES
  // ============================================

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
      .then(function (b) {
        return { nivel: Math.round(b.level * 100), carregando: b.charging };
      })
      .catch(function () { return null; });
  }

  // ============================================
  // COLETA
  // ============================================

  var selosProntos = null;

  function coletarSelos() {
    return detectarBateria().then(function (b) {
      return {
        plataforma: detectarPlataforma(),
        periodo: detectarPeriodo(),
        navegador: detectarNavegador(),
        bateria: b ? b.nivel : null,
        carregando: b ? b.carregando : false
      };
    });
  }

  coletarSelos().then(function (s) {
    selosProntos = s;
    console.log('✅ Selos prontos:', s);
  });

  // ============================================
  // API GLOBAL
  // ============================================

  window.obterSelosAtuais = function () {
    return selosProntos;
  };

  // ============================================
  // RENDERIZAÇÃO (HTML)
  // ============================================

  function emojiBateria(nivel, carregando) {
    if (carregando) return '⚡';
    if (nivel === null || nivel === undefined) return '';
    return nivel >= 30 ? '🔋' : '🪫';
  }

  function gerarHTMLSelos(selos) {
    if (!selos) return '';

    var ICONES = {
      Android: '🤖',
      iPhone: '🍎',
      Windows: '🪟',
      macOS: '🍏',
      Linux: '🐧',
      Web: '🌐'
    };

    var PERIODO = {
      'Manhã': '☀️',
      'Tarde': '🌤️',
      'Noite': '🌙',
      'Madrugada': '🌌'
    };

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

  window.gerarHTMLSelos = gerarHTMLSelos;

  // ============================================
  // CSS
  // ============================================

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

    .selos-origem .selo:not(:last-child)::after {
      content: '·';
      margin: 0 3px;
      opacity: 0.4;
      font-weight: 900;
      font-size: 10px;
      color: #94a3b8;
    }
  `;
  document.head.appendChild(css);

  console.log('✅ selos.js carregado');
})();