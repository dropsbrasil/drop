/* ============================================
   35-TUTORIAL.JS
   Tutorial de boas-vindas (4 passos).

   - Inicia automaticamente no 1º acesso.
   - Progresso persistido no Supabase
     (tabela tutorial_progresso, com RLS).
   - Cache local por usuário (multi-conta
     no mesmo aparelho funciona).
   - Back button fecha o tutorial.
   - Não abre o painel de controle sozinho.

   Depende de: 00-config.js, 02-ui.js, 20-supabase.js
============================================ */

(function () {
  'use strict';

  const TABELA = 'tutorial_progresso';
  const LS_PREFIXO = 'drops_tutorial_v1_';
  const LS_VERSAO = 1;

  const STEPS = [
    {
      id: 'boas-vindas',
      titulo: '👋 Bem-vindo ao Drop',
      texto:
        'Aqui você descobre <strong>o que está sendo compartilhado ' +
        'por perto</strong> — e compartilha também. ' +
        'Vou te mostrar o essencial em 30 segundos.',
      target: null,
      tab: 'mydrops'
    },
    {
      id: 'meu-espaco',
      titulo: 'Este é o seu espaço',
      texto:
        'No <strong>My Drops</strong> ficam seu perfil, seu mural, ' +
        'suas publicações e quem você conectou. ' +
        'É daqui que você cuida de tudo relacionado a você.',
      target: '.mydrops-profile-card',
      tab: 'mydrops'
    },
    {
      id: 'criar',
      titulo: '📝 Crie seu primeiro Drop',
      texto:
        'Toque em <strong>Notas</strong>, <strong>Foto</strong> ou ' +
        '<strong>Vídeo</strong> pra publicar. ' +
        'Depois de montar, você escolhe por quanto tempo o Drop ' +
        'fica no ar — de 12 horas a permanente.',
      target: '.mydrops-action-row',
      tab: 'mydrops'
    },
    {
      id: 'final',
      titulo: 'Tudo pronto! 🎉',
      texto:
        'Embaixo, na barra, você tem duas outras abas:<br><br>' +
        '<strong>Nearby</strong> — veja o que as pessoas próximas ' +
        '<strong>estão publicando</strong>.<br>' +
        '<strong>NEX</strong> — converse em particular com quem quiser.' +
        '<br><br>Bom Drop!',
      target: null,
      tab: 'mydrops'
    }
  ];

  let overlayEl = null;
  let ringEl = null;
  let tooltipEl = null;
  let confirmEl = null;
  let currentIndex = 0;
  let ativo = false;
  let salvando = false;
  let resizeHandler = null;
  let popstateHandler = null;
  let userIdAtual = null;
  let backEmpilhado = false;

  function lsKey() {
    return userIdAtual ? (LS_PREFIXO + userIdAtual) : null;
  }

  function lsMarcarConcluido() {
    const k = lsKey();
    if (!k) return;
    try { localStorage.setItem(k, 'true'); } catch (e) {}
  }

  function lsJaConcluido() {
    const k = lsKey();
    if (!k) return false;
    try { return localStorage.getItem(k) === 'true'; } catch (e) { return false; }
  }

  function lsLimpar() {
    const k = lsKey();
    if (!k) return;
    try { localStorage.removeItem(k); } catch (e) {}
  }

  function ehElementoVisivel(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    if (rect.bottom <= 0 || rect.right <= 0) return false;
    if (rect.top >= window.innerHeight) return false;
    if (rect.left >= window.innerWidth) return false;
    return true;
  }

  function obterUsuario() {
    return new Promise(function (resolve) {
      const inicio = Date.now();
      const check = async function () {
        if (window.supabaseClient) {
          try {
            const resp = await window.supabaseClient.auth.getUser();
            if (resp && resp.data && resp.data.user) {
              return resolve(resp.data.user);
            }
          } catch (e) {}
        }
        if (Date.now() - inicio > 15000) return resolve(null);
        setTimeout(check, 250);
      };
      check();
    });
  }

  function perfilSincronizou() {
    const el = document.getElementById('mydropsNomeUsuario');
    if (!el) return true;
    const t = (el.textContent || '').trim();
    return t && t !== 'Carregando...';
  }

  function irParaTelaDoPasso(passo) {
    if (!passo || !passo.tab) return;
    const mapa = { mydrops: 0, nearby: 1, nex: 2 };
    const idx = mapa[passo.tab];
    if (typeof idx !== 'number') return;

    if (typeof window.mostrarTela === 'function') {
      window.mostrarTela(passo.tab, idx);
    } else if (typeof window.abrirTela === 'function') {
      window.abrirTela(passo.tab, idx);
    }
  }

  function garantirSubAbaMyDrops() {
    const painelDrops = document.querySelector(
      '.mydrops-tab-panel[data-panel="drops"]'
    );
    if (painelDrops && painelDrops.classList.contains('active')) return;

    if (typeof window.mostrarMyDropsTab === 'function') {
      window.mostrarMyDropsTab('drops');
      return;
    }

    document.querySelectorAll('.mydrops-tab-panel').forEach(function (p) {
      p.classList.remove('active');
    });
    document.querySelectorAll('.mydrops-tab').forEach(function (t) {
      t.classList.remove('active');
    });
    if (painelDrops) painelDrops.classList.add('active');
    const tabDrops = document.querySelector('.mydrops-tab[data-tab="drops"]');
    if (tabDrops) tabDrops.classList.add('active');
  }
    async function upsertProgresso(patch) {
    if (salvando) return;
    salvando = true;
    try {
      if (!userIdAtual || !window.supabaseClient) return;

      const payload = Object.assign(
        {
          user_id: userIdAtual,
          updated_at: new Date().toISOString()
        },
        patch
      );

      const resp = await window.supabaseClient
        .from(TABELA)
        .upsert(payload, { onConflict: 'user_id' });

      if (resp.error) {
        console.warn('🎓 Tutorial: falha ao salvar progresso:', resp.error);
      }
    } catch (err) {
      console.warn('🎓 Tutorial: erro inesperado ao salvar:', err);
    } finally {
      salvando = false;
    }
  }

  async function marcarConcluido() {
    lsMarcarConcluido();
    await upsertProgresso({
      status: 'concluido',
      current_step: STEPS.length - 1,
      completed_at: new Date().toISOString()
    });
  }

  async function marcarPulado() {
    lsMarcarConcluido();
    await upsertProgresso({
      status: 'pulado',
      current_step: currentIndex,
      skipped_at: new Date().toISOString()
    });
  }

  async function marcarEmAndamento(stepIndex) {
    await upsertProgresso({
      status: 'em_andamento',
      current_step: stepIndex
    });
  }

  function criarElementos() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'tut-overlay';
    document.body.appendChild(overlayEl);

    ringEl = document.createElement('div');
    ringEl.className = 'tut-ring';
    document.body.appendChild(ringEl);

    tooltipEl = document.createElement('div');
    tooltipEl.className = 'tut-tooltip';
    document.body.appendChild(tooltipEl);

    overlayEl.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
    }, true);
  }

  function criarModalConfirm() {
    if (confirmEl) return;

    confirmEl = document.createElement('div');
    confirmEl.className = 'tut-confirm-overlay';
    confirmEl.innerHTML =
      '<div class="tut-confirm-box">' +
        '<div class="tut-confirm-icone">🎓</div>' +
        '<div class="tut-confirm-titulo">Pular o tutorial?</div>' +
        '<div class="tut-confirm-texto">' +
          'Você pode rever depois em: Menu (☰) → Sistema → Rever tutorial.' +
        '</div>' +
        '<div class="tut-confirm-acoes">' +
          '<button type="button" class="tut-confirm-btn tut-confirm-btn-cancelar" id="tutConfirmNao">' +
            'Continuar' +
          '</button>' +
          '<button type="button" class="tut-confirm-btn tut-confirm-btn-confirmar" id="tutConfirmSim">' +
            'Pular' +
          '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(confirmEl);

    confirmEl.querySelector('#tutConfirmNao')
      .addEventListener('click', fecharModalConfirm);
    confirmEl.querySelector('#tutConfirmSim')
      .addEventListener('click', function () {
        fecharModalConfirm();
        executarPulo();
      });
  }

  function abrirModalConfirm() {
    if (!confirmEl) criarModalConfirm();
    confirmEl.classList.add('ativo');
  }

  function fecharModalConfirm() {
    if (confirmEl) confirmEl.classList.remove('ativo');
  }

  function destruirElementos() {
    if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
    if (ringEl && ringEl.parentNode) ringEl.parentNode.removeChild(ringEl);
    if (tooltipEl && tooltipEl.parentNode) tooltipEl.parentNode.removeChild(tooltipEl);
    if (confirmEl && confirmEl.parentNode) confirmEl.parentNode.removeChild(confirmEl);
    overlayEl = null;
    ringEl = null;
    tooltipEl = null;
    confirmEl = null;
  }

  function posicionarTudo(target) {
    const temTarget = target && ehElementoVisivel(target);

    if (!temTarget) {
      if (ringEl) ringEl.classList.remove('ativo', 'pulsando');
      if (overlayEl) overlayEl.classList.add('sem-target');
      centralizarTooltip();
      return;
    }

    if (overlayEl) overlayEl.classList.remove('sem-target');

    const rect = target.getBoundingClientRect();
    const padding = 6;

    if (ringEl) {
      ringEl.classList.add('ativo', 'pulsando');
      ringEl.style.top = (rect.top - padding) + 'px';
      ringEl.style.left = (rect.left - padding) + 'px';
      ringEl.style.width = (rect.width + padding * 2) + 'px';
      ringEl.style.height = (rect.height + padding * 2) + 'px';
    }

    if (tooltipEl) {
      tooltipEl.style.visibility = 'hidden';
      tooltipEl.style.top = '0px';
      tooltipEl.style.left = '0px';

      const tRect = tooltipEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 14;
      const gap = 14;

      const espacoAbaixo = vh - (rect.bottom + padding) - gap - margin;
      const espacoAcima = (rect.top - padding) - gap - margin;

      let top;
      if (espacoAbaixo >= tRect.height || espacoAbaixo >= espacoAcima) {
        top = rect.bottom + padding + gap;
      } else {
        top = rect.top - padding - gap - tRect.height;
      }

      let left = rect.left + rect.width / 2 - tRect.width / 2;

      top = Math.max(margin, Math.min(vh - tRect.height - margin, top));
      left = Math.max(margin, Math.min(vw - tRect.width - margin, left));

      tooltipEl.style.top = top + 'px';
      tooltipEl.style.left = left + 'px';
      tooltipEl.style.visibility = 'visible';
    }
  }

  function centralizarTooltip() {
    if (!tooltipEl) return;
    tooltipEl.style.visibility = 'hidden';
    tooltipEl.style.top = '0px';
    tooltipEl.style.left = '0px';

    const tRect = tooltipEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const top = Math.max(16, (vh - tRect.height) / 2);
    const left = Math.max(16, (vw - tRect.width) / 2);

    tooltipEl.style.top = top + 'px';
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.visibility = 'visible';
  }
  function renderizarPasso() {
    const passo = STEPS[currentIndex];
    if (!passo) return;

    irParaTelaDoPasso(passo);
    if (passo.tab === 'mydrops') {
      garantirSubAbaMyDrops();
    }

    const tentarRenderizar = function (tentativa) {
      const target = passo.target
        ? document.querySelector(passo.target)
        : null;
      const total = STEPS.length;
      const humano = currentIndex + 1;

      if (!tooltipEl) return;

      tooltipEl.innerHTML =
        '<div class="tut-tooltip-progresso">' +
          '<span>Passo ' + humano + ' de ' + total + '</span>' +
          '<button type="button" class="tut-tooltip-pular" id="tutBtnPular">' +
            'Pular tutorial' +
          '</button>' +
        '</div>' +
        '<div class="tut-tooltip-titulo">' + passo.titulo + '</div>' +
        '<div class="tut-tooltip-texto">' + passo.texto + '</div>' +
        '<div class="tut-tooltip-acoes">' +
          '<button type="button" class="tut-btn tut-btn-voltar" id="tutBtnVoltar"' +
            (currentIndex === 0 ? ' disabled' : '') +
          '>Voltar</button>' +
          '<button type="button" class="tut-btn tut-btn-proximo" id="tutBtnProximo">' +
            (currentIndex === total - 1 ? 'Entendi' : 'Próximo') +
          '</button>' +
        '</div>';

      const btnPular = tooltipEl.querySelector('#tutBtnPular');
      const btnVoltar = tooltipEl.querySelector('#tutBtnVoltar');
      const btnProximo = tooltipEl.querySelector('#tutBtnProximo');

      if (btnPular) btnPular.addEventListener('click', abrirModalConfirm);
      if (btnVoltar) btnVoltar.addEventListener('click', voltarPasso);
      if (btnProximo) btnProximo.addEventListener('click', proximoPasso);

      const ehUltimaTentativa = tentativa >= 3;

      if (passo.target && !ehElementoVisivel(target) && !ehUltimaTentativa) {
        setTimeout(function () {
          tentarRenderizar(tentativa + 1);
        }, 150);
        return;
      }

      posicionarTudo(target);
    };

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        tentarRenderizar(0);
      });
    });
  }

  async function proximoPasso() {
    if (currentIndex >= STEPS.length - 1) {
      await finalizarTutorial();
      return;
    }
    currentIndex += 1;
    marcarEmAndamento(currentIndex);
    renderizarPasso();
  }

  function voltarPasso() {
    if (currentIndex <= 0) return;
    currentIndex -= 1;
    marcarEmAndamento(currentIndex);
    renderizarPasso();
  }

  async function executarPulo() {
    await marcarPulado();
    fecharTutorial();
  }

  async function finalizarTutorial() {
    await marcarConcluido();
    fecharTutorial();
  }

  function empilharBack() {
    if (backEmpilhado) return;
    try {
      if (typeof window.dropsEmpilharEstado === 'function') {
        window.dropsEmpilharEstado('tutorial', null);
      } else {
        history.pushState({ __dropsTutorial: true }, '', location.href);
      }
      backEmpilhado = true;
    } catch (e) {}
  }

  function desempilharBack() {
    if (!backEmpilhado) return;
    backEmpilhado = false;
  }

  function instalarPopstate() {
    if (popstateHandler) return;
    popstateHandler = function () {
      if (!ativo) return;
      backEmpilhado = false;
      executarPulo();
      try {
        if (typeof window.dropsEmpilharEstado === 'function') {
          window.dropsEmpilharEstado('tela-mydrops', null);
        } else {
          history.pushState({ __dropsSafe: true }, '', location.href);
        }
      } catch (e) {}
    };
    window.addEventListener('popstate', popstateHandler);
  }

  function removerPopstate() {
    if (!popstateHandler) return;
    window.removeEventListener('popstate', popstateHandler);
    popstateHandler = null;
  }

  async function iniciarTutorialDrop(stepIndex) {
    if (ativo) return;

    const idx = Number.isFinite(stepIndex) ? stepIndex : 0;
    currentIndex = Math.max(0, Math.min(idx, STEPS.length - 1));
    ativo = true;

    criarElementos();
    if (overlayEl) overlayEl.classList.add('ativo');

    await marcarEmAndamento(currentIndex);

    renderizarPasso();
    instalarPopstate();
    empilharBack();

    if (!resizeHandler) {
      resizeHandler = function () {
        if (!ativo) return;
        const passo = STEPS[currentIndex];
        const target = passo && passo.target
          ? document.querySelector(passo.target)
          : null;
        posicionarTudo(target);
      };
      window.addEventListener('resize', resizeHandler);
      window.addEventListener('scroll', resizeHandler, true);
      window.addEventListener('orientationchange', resizeHandler);
    }
  }

  function fecharTutorial() {
    ativo = false;

    if (overlayEl) overlayEl.classList.remove('ativo', 'sem-target');
    if (ringEl) ringEl.classList.remove('ativo', 'pulsando');
    fecharModalConfirm();

    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('scroll', resizeHandler, true);
      window.removeEventListener('orientationchange', resizeHandler);
      resizeHandler = null;
    }

    removerPopstate();
    desempilharBack();

    setTimeout(function () {
      if (!ativo) destruirElementos();
    }, 300);
  }

  async function reiniciarTutorialDrop() {
    lsLimpar();
    if (ativo) fecharTutorial();

    setTimeout(function () {
      iniciarTutorialDrop(0);
    }, 220);
  }
  function injetarBotaoRever() {
    const blocos = document.querySelectorAll(
      '#painelControleNex .controle-bloco-nex'
    );
    if (!blocos.length) return false;

    for (let i = 0; i < blocos.length; i++) {
      const bloco = blocos[i];
      const h4 = bloco.querySelector('h4');
      if (!h4) continue;
      if (h4.textContent.indexOf('Sistema') === -1) continue;

      if (bloco.querySelector('#btnReverTutorialNex')) return true;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'btnReverTutorialNex';
      btn.textContent = '🎓 Rever tutorial';

      btn.addEventListener('click', function () {
        if (typeof window.fecharPainelControleNex === 'function') {
          window.fecharPainelControleNex();
        }
        setTimeout(function () {
          reiniciarTutorialDrop();
        }, 260);
      });

      const btnSobre = bloco.querySelector('#btnSobreAppNex');
      if (btnSobre && btnSobre.parentNode === bloco) {
        bloco.insertBefore(btn, btnSobre);
      } else {
        bloco.appendChild(btn);
      }
      return true;
    }
    return false;
  }

  function esperarPerfilSincronizar() {
    return new Promise(function (resolve) {
      const inicio = Date.now();
      const check = function () {
        if (perfilSincronizou()) return resolve(true);
        if (Date.now() - inicio > 10000) return resolve(false);
        setTimeout(check, 500);
      };
      check();
    });
  }

  async function checarEIniciar() {
    const user = await obterUsuario();
    if (!user) {
      console.log('🎓 Tutorial: sem usuário autenticado');
      return;
    }
    userIdAtual = user.id;

    if (lsJaConcluido()) {
      console.log('🎓 Tutorial: já concluído (cache local)');
      return;
    }

    if (!window.supabaseClient) return;

    let data = null;
    try {
      const resp = await window.supabaseClient
        .from(TABELA)
        .select('status, current_step')
        .eq('user_id', user.id)
        .maybeSingle();

      if (resp.error) {
        console.warn('🎓 Tutorial: erro ao consultar:', resp.error);
        return;
      }
      data = resp.data;
    } catch (err) {
      console.warn('🎓 Tutorial: erro de rede:', err);
      return;
    }

    if (data && (data.status === 'concluido' || data.status === 'pulado')) {
      lsMarcarConcluido();
      console.log('🎓 Tutorial: já foi', data.status);
      return;
    }

    await esperarPerfilSincronizar();

    if (data && data.status === 'em_andamento') {
      const step = Math.max(
        0,
        Math.min(data.current_step || 0, STEPS.length - 1)
      );
      console.log('🎓 Tutorial: retomando do passo', step);
      await iniciarTutorialDrop(step);
      return;
    }

    console.log('🎓 Tutorial: primeiro acesso');
    await iniciarTutorialDrop(0);
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
      checarEIniciar().catch(function (err) {
        console.warn('🎓 Tutorial:', err);
      });
    }, 3000);

    setTimeout(injetarBotaoRever, 800);
    setTimeout(injetarBotaoRever, 2000);
    setTimeout(injetarBotaoRever, 4000);

    document.addEventListener('click', function (e) {
      if (e.target.closest('.btn-menu-global')) {
        setTimeout(injetarBotaoRever, 200);
      }
    }, true);
  });

  window.iniciarTutorialDrop = iniciarTutorialDrop;
  window.reiniciarTutorialDrop = reiniciarTutorialDrop;
  window.fecharTutorialDrop = fecharTutorial;

  console.log('🎓 35-tutorial.js carregado (v' + LS_VERSAO + ')');

})();