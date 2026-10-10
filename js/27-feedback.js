/* ============================================
   27-FEEDBACK.JS
   Vibração + som + badge no ícone do PWA

   ⚠️ REGRAS:
   - Gravar áudio / parar: SÓ VIBRA (nunca toca som)
   - iOS: navigator.vibrate() e setAppBadge não existem
     → chamadas são ignoradas silenciosamente
   - Web Audio API exige 1 interação do usuário pra tocar
============================================ */

(function () {
  'use strict';

  // ============================================
  // PREFERÊNCIAS
  // ============================================

  function somLigado() {
    return localStorage.getItem('drops_sons') !== 'off';
  }

  function vibracaoLigada() {
    return localStorage.getItem('drops_vibracao') !== 'off';
  }

  // ============================================
  // VIBRAÇÃO (Android only)
  // ============================================

  const PADROES_VIBRACAO = {
    msgRecebida:    [80, 40, 80],
    reacao:         [60],
    muralSalvo:     [50, 30, 50, 30, 50],
    reagiu:         [40],
    enviouMsg:      [30],
    gravandoInicio: [120],
    gravandoFim:    [120],
    erro:           [200, 100, 200]
  };

  function vibrarNex(padrao) {
    if (!vibracaoLigada()) return;
    if (!navigator.vibrate) return;
    try { navigator.vibrate(padrao); } catch (e) {}
  }

  // ============================================
  // SOM (Web Audio API)
  // ============================================

  let audioCtxNex = null;

  function obterAudioCtx() {
    if (!audioCtxNex) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtxNex = new Ctx();
    }
    if (audioCtxNex.state === 'suspended') {
      audioCtxNex.resume().catch(() => {});
    }
    return audioCtxNex;
  }

  function tocarTomNex({ freq = 880, dur = 0.12, tipo = 'sine', vol = 0.15 } = {}) {
    if (!somLigado()) return;

    const ctx = obterAudioCtx();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = tipo;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (e) {}
  }

  const SONS = {
    msgRecebida: () => {
      tocarTomNex({ freq: 880, dur: 0.08, tipo: 'sine' });
      setTimeout(() => tocarTomNex({ freq: 1174, dur: 0.12, tipo: 'sine' }), 90);
    },
    reacao: () => {
      tocarTomNex({ freq: 1320, dur: 0.09, tipo: 'triangle', vol: 0.12 });
    },
    muralSalvo: () => {
      tocarTomNex({ freq: 660, dur: 0.07 });
      setTimeout(() => tocarTomNex({ freq: 990, dur: 0.10 }), 80);
    },
    enviouMsg: () => {
      tocarTomNex({ freq: 1046, dur: 0.05, vol: 0.08 });
    },
  reagiu: () => {
    tocarTomNex({ freq: 1318, dur: 0.06, vol: 0.10 });
  },
  navegou: () => {
    tocarTomNex({ freq: 700, dur: 0.03, vol: 0.06 });
  }
};

  // ============================================
  // BADGE NO ÍCONE DO PWA
  // ============================================

  const CHAVE_BADGE = 'drops_badge_contadores';

  let contadoresBadgeNex = (() => {
    try {
      const bruto = localStorage.getItem(CHAVE_BADGE);
      const dados = JSON.parse(bruto || '{}');
      return {
        msgsNaoLidas: Number(dados.msgsNaoLidas) || 0,
        reacoesNovas: Number(dados.reacoesNovas) || 0,
        artesMurais:  Number(dados.artesMurais)  || 0
      };
    } catch (e) {
      return { msgsNaoLidas: 0, reacoesNovas: 0, artesMurais: 0 };
    }
  })();

  function salvarContadoresBadge() {
    try {
      localStorage.setItem(CHAVE_BADGE, JSON.stringify(contadoresBadgeNex));
    } catch (e) {}
  }

  function atualizarBadgeNex() {
    const total =
      contadoresBadgeNex.msgsNaoLidas +
      contadoresBadgeNex.reacoesNovas +
      contadoresBadgeNex.artesMurais;

    if ('setAppBadge' in navigator) {
      try {
        if (total > 0) {
          navigator.setAppBadge(total).catch(() => {});
        } else {
          navigator.clearAppBadge().catch(() => {});
        }
      } catch (e) {}
    }
  }

  function incrementarBadgeNex(tipo, qtd = 1) {
    if (contadoresBadgeNex[tipo] == null) return;
    contadoresBadgeNex[tipo] = Math.max(0, contadoresBadgeNex[tipo] + qtd);
    salvarContadoresBadge();
    atualizarBadgeNex();
  }

  function zerarBadgeNex(tipo) {
    if (tipo) {
      if (contadoresBadgeNex[tipo] == null) return;
      contadoresBadgeNex[tipo] = 0;
    } else {
      contadoresBadgeNex.msgsNaoLidas = 0;
      contadoresBadgeNex.reacoesNovas = 0;
      contadoresBadgeNex.artesMurais  = 0;
    }
    salvarContadoresBadge();
    atualizarBadgeNex();
  }

  // ============================================
  // API DE ALTO NÍVEL
  // ============================================

  const feedbackNex = {
    msgRecebida({ contarBadge = true } = {}) {
      vibrarNex(PADROES_VIBRACAO.msgRecebida);
      SONS.msgRecebida?.();
      if (contarBadge) incrementarBadgeNex('msgsNaoLidas');
    },

    reacaoRecebida() {
      vibrarNex(PADROES_VIBRACAO.reacao);
      SONS.reacao?.();
      incrementarBadgeNex('reacoesNovas');
    },

    muralSalvo() {
      vibrarNex(PADROES_VIBRACAO.muralSalvo);
      SONS.muralSalvo?.();
      incrementarBadgeNex('artesMurais');
    },

    reagiu() {
  vibrarNex(PADROES_VIBRACAO.reagiu);
  SONS.reagiu?.();
},

// ⚠️ Trocar de drop (horizontal): vibra + toca
navegouDrop() {
  vibrarNex(PADROES_VIBRACAO.reagiu);
  SONS.navegou?.();
},

// ⚠️ Trocar de perfil (vertical): só vibra
trocouPerfil() {
  vibrarNex(PADROES_VIBRACAO.reagiu);
},

    enviouMsg() {
      vibrarNex(PADROES_VIBRACAO.enviouMsg);
      SONS.enviouMsg?.();
    },

    comentou() {
      SONS.enviouMsg?.();
    },

    gravandoInicio() {
      vibrarNex(PADROES_VIBRACAO.gravandoInicio);
    },

    gravandoFim() {
      vibrarNex(PADROES_VIBRACAO.gravandoFim);
    },

    abriuNex()    { zerarBadgeNex('msgsNaoLidas'); },
    abriuPerfil() { zerarBadgeNex('reacoesNovas'); },
    abriuMural()  { zerarBadgeNex('artesMurais'); },

    limparTudo()  { zerarBadgeNex(); },

    ligarSom()        { localStorage.setItem('drops_sons', 'on'); },
    desligarSom()     { localStorage.setItem('drops_sons', 'off'); },
    ligarVibracao()   { localStorage.setItem('drops_vibracao', 'on'); },
    desligarVibracao(){ localStorage.setItem('drops_vibracao', 'off'); },
    somLigado,
    vibracaoLigada,

    _contadores() { return { ...contadoresBadgeNex }; }
  };

  // ============================================
  // DESBLOQUEIO DE ÁUDIO (iOS)
  // ============================================

  document.addEventListener(
    'pointerdown',
    function desbloquear() {
      obterAudioCtx();
      document.removeEventListener('pointerdown', desbloquear);
    },
    { once: true }
  );

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  atualizarBadgeNex();

  // ============================================
  // EXPÕE
  // ============================================

  window.feedbackNex = feedbackNex;
  window.vibrarNex = vibrarNex;

  console.log('🔔 27-feedback.js carregado');
})();