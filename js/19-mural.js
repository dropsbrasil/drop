/* ============================================
   19-MURAL.JS
   Mural criativo: texto, desenho, fotos
============================================ */

(function () {
  'use strict';

  // ============================================
  // ESTADO
  // ============================================

  let muralScrollEl = null;
  let muralLimiteInferiorEl = null;
  let muralLimiteSuperiorEl = null;
  let muralRolagemIniciada = false;

  let muralTextoEditandoNex = null;
  let ultimoToqueTextoNex = { el: null, time: 0 };

  let canetaAtivaNex = false;
  let canetaCorAtualNex = '#1f2937';
  let desenhandoNex = false;

  let tracosSalvosNex = [];
  let tracosPendentesNex = [];
  let tracoAtualNex = null;
  let ultimoPontoNex = null;

  let elementoSelecionadoNex = null;
  let transformacoesNex = new WeakMap();

  let muralDonoUsernameNex = null;
  let muralAlteradoNex = false;

  // ============================================
  // ABRIR / FECHAR
  // ============================================

  function abrirMuralNex(usernameDono = null) {
  const modal = document.getElementById('modalMuralNex');
  if (!modal) {
    console.warn('⚠️ modalMuralNex não encontrado');
    return;
  }

  // ⚠️ Se veio um Event object (click), ignora
  if (usernameDono && typeof usernameDono === 'object') {
    usernameDono = null;
  }

  // Se não passou, é o meu próprio mural
  muralDonoUsernameNex = usernameDono
    ? String(usernameDono).replace(/^@/, '').trim()
    : Drops.usernameAtual;

    if (!muralDonoUsernameNex) {
      muralDonoUsernameNex = (localStorage.getItem('drops_username') || '')
        .trim()
        .toLowerCase();
    }

    console.log('🎨 Abrindo mural de:', muralDonoUsernameNex);

    const btnLimpar = document.getElementById('muralBtnLimparNex');

    if (btnLimpar) {
      const meuUser = String(Drops.usernameAtual || '')
        .replace(/^@/, '')
        .toLowerCase()
        .trim();

      const donoLimpo = String(muralDonoUsernameNex || '')
        .replace(/^@/, '')
        .toLowerCase()
        .trim();

      const souDono = !!meuUser && !!donoLimpo && meuUser === donoLimpo;

      if (souDono) {
        btnLimpar.classList.remove('oculto');
      } else {
        btnLimpar.classList.add('oculto');
      }
    }

    modal.style.display = 'flex';

    setTimeout(async () => {
      iniciarRolagemMuralNex();
      await carregarMuralSalvoNex();
    }, 80);
  }

  function tentarFecharMuralNex() {
    if (!muralAlteradoNex) {
      fecharMuralNex();
      return;
    }

    const modal = document.getElementById('muralConfirmSairNex');
    if (modal) modal.style.display = 'flex';
  }

  function fecharMuralNex() {
    const modal = document.getElementById('modalMuralNex');
    if (modal) modal.style.display = 'none';

    const confirmModal = document.getElementById('muralConfirmSairNex');
    if (confirmModal) confirmModal.style.display = 'none';

    muralTextoEditandoNex = null;
    fecharModalTextoMuralNex();
    desativarCanetaNex();
    desregistrarSelecaoNex();

    tracosPendentesNex = [];
    muralDonoUsernameNex = null;
    muralAlteradoNex = false;
  }
  
// ============================================
// LIMPAR MURAL (só dono)
// ============================================

function abrirConfirmLimparMuralNex() {
  const modal = document.getElementById('muralConfirmLimparNex');
  if (modal) modal.style.display = 'flex';
}

function fecharConfirmLimparMuralNex() {
  const modal = document.getElementById('muralConfirmLimparNex');
  if (modal) modal.style.display = 'none';
}

async function confirmarLimparMuralNex() {
  fecharConfirmLimparMuralNex();

  const donoUsername = muralDonoUsernameNex || Drops.usernameAtual;
  if (!donoUsername) return;

  window.mostrarToastNex?.('Limpando mural...', 'info');

  let ok = false;

  if (typeof window.limparMuralSupabase === 'function') {
    ok = await window.limparMuralSupabase(donoUsername);
  }

  if (!ok) {
    window.mostrarToastNex?.('Falha ao limpar o mural.', 'erro');
    return;
  }

  const camada = document.getElementById('muralCamadaElementosNex');
  if (camada) camada.innerHTML = '';

  tracosSalvosNex = [];
  tracosPendentesNex = [];

  redesenharTracosNex();

  muralAlteradoNex = false;
  atualizarBotaoSalvarNex();

  window.mostrarToastNex?.('Mural limpo!', 'sucesso');
}

// ============================================
// PENDÊNCIAS / BOTÃO SALVAR
// ============================================

function marcarAlterado() {
  muralAlteradoNex = true;
  atualizarBotaoSalvarNex();
}

function temPendentesNex() {
  return muralAlteradoNex;
}

function atualizarBotaoSalvarNex() {
  const btn = document.getElementById('muralBtnSalvarNex');
  if (!btn) return;

  btn.disabled = !muralAlteradoNex;
}

// ============================================
// ROLAGEM
// ============================================

function iniciarRolagemMuralNex() {
  muralScrollEl = document.getElementById('muralScrollNex');
  muralLimiteInferiorEl = document.getElementById('muralLimiteInferiorNex');
  muralLimiteSuperiorEl = document.getElementById('muralLimiteSuperiorNex');

  if (!muralScrollEl) return;

  if (!muralRolagemIniciada) {
    muralRolagemIniciada = true;

    const setaCima = document.getElementById('muralSetaCimaNex');
    const setaBaixo = document.getElementById('muralSetaBaixoNex');

    if (setaCima) setaCima.addEventListener('click', () => rolarMuralNex(-1));
    if (setaBaixo) setaBaixo.addEventListener('click', () => rolarMuralNex(1));

    muralScrollEl.addEventListener('scroll', atualizarAvisosLimiteNex, {
      passive: true
    });
  }

  muralScrollEl.scrollTop = 0;
  atualizarAvisosLimiteNex();

  setTimeout(configurarCanvasDesenhoNex, 50);
}

function rolarMuralNex(direcao) {
  if (!muralScrollEl) return;

  const passo = muralScrollEl.clientHeight * 0.55;
  const destino = muralScrollEl.scrollTop + passo * direcao;

  muralScrollEl.scrollTo({
    top: destino,
    behavior: 'smooth'
  });
}

function atualizarAvisosLimiteNex() {
  if (!muralScrollEl) return;

  const top = muralScrollEl.scrollTop;
  const height = muralScrollEl.scrollHeight;
  const visible = muralScrollEl.clientHeight;
  const tol = 4;

  if (muralLimiteSuperiorEl) {
    muralLimiteSuperiorEl.classList.toggle('visivel', top <= tol);
  }
  if (muralLimiteInferiorEl) {
    muralLimiteInferiorEl.classList.toggle(
      'visivel',
      top + visible >= height - tol
    );
  }
}
  
// ============================================
// FERRAMENTA TEXTO
// ============================================

function abrirModalTextoMuralNex() {
  const modal = document.getElementById('muralModalTextoNex');
  const input = document.getElementById('muralTextoInputNex');
  if (!modal || !input) return;

  if (muralTextoEditandoNex) {
    const conteudo = muralTextoEditandoNex.querySelector(
      '.mural-texto-conteudo-nex'
    );
    input.value = conteudo?.textContent || '';
  } else {
    input.value = '';
  }

  modal.style.display = 'flex';

  setTimeout(() => {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, 100);
}

function fecharModalTextoMuralNex() {
  const modal = document.getElementById('muralModalTextoNex');
  if (modal) modal.style.display = 'none';
  muralTextoEditandoNex = null;
}

function aplicarTextoMuralNex() {
  const input = document.getElementById('muralTextoInputNex');
  if (!input) return;

  const texto = input.value.trim();

  if (!texto) {
    fecharModalTextoMuralNex();
    return;
  }

  if (muralTextoEditandoNex) {
    const conteudo = muralTextoEditandoNex.querySelector(
      '.mural-texto-conteudo-nex'
    );
    if (conteudo) conteudo.textContent = texto;
  } else {
    criarTextoNoMuralNex(texto);
  }

  fecharModalTextoMuralNex();
  marcarAlterado();
}

function criarTextoNoMuralNex(texto, opcoes) {
  const canvas = document.getElementById('muralCanvasNex');
  const scroll = document.getElementById('muralScrollNex');
  const camada = document.getElementById('muralCamadaElementosNex');

  if (!canvas || !scroll || !camada) return null;

  const opts = opcoes || {};

  const scrollTop = scroll.scrollTop;
  const visibleHeight = scroll.clientHeight;
  const canvasWidth = canvas.clientWidth;

  const posX = opts.x != null ? opts.x : canvasWidth / 2;
  const posY = opts.y != null ? opts.y : scrollTop + visibleHeight / 2;

  const el = document.createElement('div');
  el.className = 'mural-texto-item-nex';
  el.style.left = posX + 'px';
  el.style.top = posY + 'px';
  el.style.transform = 'translate(-50%, -50%)';
  el.dataset.id =
    opts.id || 'txt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  el.dataset.baseTransform = 'translate(-50%, -50%)';

  const conteudo = document.createElement('span');
  conteudo.className = 'mural-texto-conteudo-nex';
  conteudo.textContent = texto;

  el.appendChild(conteudo);
  camada.appendChild(el);

  if (opts.escala != null || opts.rotacao != null) {
    transformacoesNex.set(el, {
      escala: opts.escala != null ? opts.escala : 1,
      rotacao: opts.rotacao != null ? opts.rotacao : 0
    });
    aplicarTransformacaoNex(el);
  }

  if (opts.travado) {
    el.classList.add('travado');
    el.dataset.travado = '1';
  } else {
    ativarInteracaoTextoMuralNex(el);
  }

  return el;
}

function editarTextoMuralNex(el) {
  if (el.dataset.travado === '1') return;
  muralTextoEditandoNex = el;
  abrirModalTextoMuralNex();
}

// ============================================
// INTERAÇÃO COM TEXTO
// ============================================

function ativarInteracaoTextoMuralNex(el) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let moved = false;

  el.addEventListener('pointerdown', (e) => {
    if (el.dataset.travado === '1') return;
    if (e.button !== undefined && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    pointerId = e.pointerId;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    originLeft = parseFloat(el.style.left) || 0;
    originTop = parseFloat(el.style.top) || 0;

    try {
      el.setPointerCapture(pointerId);
    } catch (_) {}

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        if (!moved) {
          moved = true;
          muralAlteradoNex = true;
        }
      }

      el.style.left = originLeft + dx + 'px';
      el.style.top = originTop + dy + 'px';
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;

      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);

      try {
        el.releasePointerCapture(pointerId);
      } catch (_) {}

      pointerId = null;

      if (moved) {
        atualizarBotaoSalvarNex();
        return;
      }

      const agora = Date.now();

      if (
        ultimoToqueTextoNex.el === el &&
        agora - ultimoToqueTextoNex.time < 350
      ) {
        ultimoToqueTextoNex = { el: null, time: 0 };
        editarTextoMuralNex(el);
      } else {
        ultimoToqueTextoNex = { el, time: agora };
        selecionarTextoMuralNex(el);
      }
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  });
}

function selecionarTextoMuralNex(el) {
  document
    .querySelectorAll(
      '.mural-texto-item-nex.selecionado, .mural-foto-item-nex.selecionado'
    )
    .forEach((item) => {
      if (item !== el) item.classList.remove('selecionado');
    });

  if (el) el.classList.add('selecionado');

  registrarElementoSelecionadoNex(el);
}

function deselecionarTudoMuralNex() {
  document
    .querySelectorAll(
      '.mural-texto-item-nex.selecionado, .mural-foto-item-nex.selecionado'
    )
    .forEach((item) => item.classList.remove('selecionado'));

  desregistrarSelecaoNex();
}

// ============================================
// FERRAMENTA FOTO
// ============================================

function abrirSeletorFotoMuralNex() {
  const input = document.getElementById('muralInputFotoNex');
  if (!input) return;

  input.value = '';
  input.click();
}

function processarFotoMuralNex(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    window.mostrarToastNex?.('Escolha uma imagem.', 'erro');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    criarFotoNoMuralNex(e.target.result);
    marcarAlterado();
  };

  reader.onerror = function () {
    window.mostrarToastNex?.('Falha ao ler a imagem.', 'erro');
  };

  reader.readAsDataURL(file);
  event.target.value = '';
}

function criarFotoNoMuralNex(dataUrl, opcoes) {
  const canvas = document.getElementById('muralCanvasNex');
  const scroll = document.getElementById('muralScrollNex');
  const camada = document.getElementById('muralCamadaElementosNex');

  if (!canvas || !scroll || !camada) return null;

  const opts = opcoes || {};

  const scrollTop = scroll.scrollTop;
  const visibleHeight = scroll.clientHeight;
  const canvasWidth = canvas.clientWidth;

  const posX = opts.x != null ? opts.x : canvasWidth / 2;
  const posY = opts.y != null ? opts.y : scrollTop + visibleHeight / 2;

  const larguraInicial =
    opts.largura != null
      ? opts.largura
      : Math.min(220, Math.max(120, canvasWidth * 0.4));

  const el = document.createElement('div');
  el.className = 'mural-foto-item-nex';
  el.style.left = posX + 'px';
  el.style.top = posY + 'px';
  el.style.width = larguraInicial + 'px';
  el.style.height = larguraInicial + 'px';
  el.style.transform = 'translate(-50%, -50%)';
  el.dataset.id =
    opts.id || 'foto_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  el.dataset.baseTransform = 'translate(-50%, -50%)';
  el.dataset.dataUrl = dataUrl;

  const img = document.createElement('img');
  img.className = 'mural-foto-conteudo-nex';
  img.src = dataUrl;
  img.alt = 'Sticker';

  el.appendChild(img);
  camada.appendChild(el);

  if (opts.escala != null || opts.rotacao != null) {
    transformacoesNex.set(el, {
      escala: opts.escala != null ? opts.escala : 1,
      rotacao: opts.rotacao != null ? opts.rotacao : 0
    });
    aplicarTransformacaoNex(el);
  }

  if (opts.travado) {
    el.classList.add('travado');
    el.dataset.travado = '1';
  } else {
    ativarInteracaoFotoMuralNex(el);
  }

  return el;
}

function ativarInteracaoFotoMuralNex(el) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let moved = false;

  el.addEventListener('pointerdown', (e) => {
    if (el.dataset.travado === '1') return;
    if (e.button !== undefined && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    pointerId = e.pointerId;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    originLeft = parseFloat(el.style.left) || 0;
    originTop = parseFloat(el.style.top) || 0;

    try {
      el.setPointerCapture(pointerId);
    } catch (_) {}

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        if (!moved) {
          moved = true;
          muralAlteradoNex = true;
        }
      }

      el.style.left = originLeft + dx + 'px';
      el.style.top = originTop + dy + 'px';
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;

      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);

      try {
        el.releasePointerCapture(pointerId);
      } catch (_) {}

      pointerId = null;

      if (moved) {
        atualizarBotaoSalvarNex();
        return;
      }

      selecionarFotoMuralNex(el);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  });
}

function selecionarFotoMuralNex(el) {
  document
    .querySelectorAll(
      '.mural-foto-item-nex.selecionado, .mural-texto-item-nex.selecionado'
    )
    .forEach((item) => {
      if (item !== el) item.classList.remove('selecionado');
    });

  if (el) el.classList.add('selecionado');

  registrarElementoSelecionadoNex(el);
}
  
// ============================================
// FERRAMENTA CANETA
// ============================================

function alternarCanetaNex() {
  canetaAtivaNex = !canetaAtivaNex;

  const btn = document.getElementById('muralBtnCanetaNex');
  const canvasDesenho = document.getElementById('muralDesenhoNex');
  const paleta = document.getElementById('muralPaletaNex');

  if (btn) btn.classList.toggle('ativa', canetaAtivaNex);
  if (canvasDesenho) canvasDesenho.classList.toggle('ativo', canetaAtivaNex);
  if (paleta) paleta.style.display = canetaAtivaNex ? 'flex' : 'none';

  if (canetaAtivaNex) deselecionarTudoMuralNex();
}

function desativarCanetaNex() {
  if (!canetaAtivaNex) return;
  canetaAtivaNex = false;

  const btn = document.getElementById('muralBtnCanetaNex');
  const canvasDesenho = document.getElementById('muralDesenhoNex');
  const paleta = document.getElementById('muralPaletaNex');

  if (btn) btn.classList.remove('ativa');
  if (canvasDesenho) canvasDesenho.classList.remove('ativo');
  if (paleta) paleta.style.display = 'none';
}

function trocarCorCanetaNex(cor) {
  canetaCorAtualNex = cor;

  document.querySelectorAll('.mural-cor-nex').forEach((btn) => {
    btn.classList.toggle('selecionada', btn.dataset.cor === cor);
  });
}

function configurarCanvasDesenhoNex() {
  const canvas = document.getElementById('muralDesenhoNex');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  redesenharTracosNex();
}

function redesenharTracosNex() {
  const canvas = document.getElementById('muralDesenhoNex');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;

  ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

  const todosTracos = tracosSalvosNex.concat(tracosPendentesNex);

  todosTracos.forEach((traco) => {
    if (!traco.pontos || traco.pontos.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = traco.cor;
    ctx.lineWidth = traco.largura || 3;

    ctx.moveTo(traco.pontos[0].x, traco.pontos[0].y);

    for (let i = 1; i < traco.pontos.length; i++) {
      ctx.lineTo(traco.pontos[i].x, traco.pontos[i].y);
    }

    ctx.stroke();
  });
}

function iniciarDesenhoNex(e) {
  if (!canetaAtivaNex) return;

  const canvas = document.getElementById('muralDesenhoNex');
  if (!canvas) return;

  e.preventDefault();

  const ponto = obterPontoCanvasNex(e, canvas);

  desenhandoNex = true;
  tracoAtualNex = {
    cor: canetaCorAtualNex,
    largura: 3,
    pontos: [ponto]
  };
  ultimoPontoNex = ponto;

  try {
    canvas.setPointerCapture(e.pointerId);
  } catch (_) {}
}

function moverDesenhoNex(e) {
  if (!desenhandoNex || !tracoAtualNex) return;

  e.preventDefault();

  const canvas = document.getElementById('muralDesenhoNex');
  if (!canvas) return;

  const ponto = obterPontoCanvasNex(e, canvas);

  if (ultimoPontoNex) {
    const dx = ponto.x - ultimoPontoNex.x;
    const dy = ponto.y - ultimoPontoNex.y;
    if (dx * dx + dy * dy < 1) return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.beginPath();
  ctx.strokeStyle = tracoAtualNex.cor;
  ctx.lineWidth = tracoAtualNex.largura;

  if (ultimoPontoNex) {
    ctx.moveTo(ultimoPontoNex.x, ultimoPontoNex.y);
    ctx.lineTo(ponto.x, ponto.y);
    ctx.stroke();
  }

  tracoAtualNex.pontos.push(ponto);
  ultimoPontoNex = ponto;
}

function finalizarDesenhoNex(e) {
  if (!desenhandoNex || !tracoAtualNex) return;

  const canvas = document.getElementById('muralDesenhoNex');
  if (canvas) {
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
  }

  if (tracoAtualNex.pontos.length > 1) {
    tracosPendentesNex.push(tracoAtualNex);
    marcarAlterado();
  }

  desenhandoNex = false;
  tracoAtualNex = null;
  ultimoPontoNex = null;
}

function obterPontoCanvasNex(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

// ============================================
// CONTROLES DE SELEÇÃO
// ============================================

function obterTransformacaoNex(el) {
  if (!transformacoesNex.has(el)) {
    transformacoesNex.set(el, { escala: 1, rotacao: 0 });
  }
  return transformacoesNex.get(el);
}

function aplicarTransformacaoNex(el) {
  const t = obterTransformacaoNex(el);
  const baseTransform = el.dataset.baseTransform || 'translate(-50%, -50%)';
  el.style.transform =
    baseTransform + ' rotate(' + t.rotacao + 'deg) scale(' + t.escala + ')';
}

function registrarElementoSelecionadoNex(el) {
  if (elementoSelecionadoNex && elementoSelecionadoNex !== el) {
    elementoSelecionadoNex.classList.remove('selecionado');
  }

  elementoSelecionadoNex = el;

  const controles = document.getElementById('muralControlesSelecaoNex');
  if (controles) {
    controles.style.display = el ? 'flex' : 'none';
  }

  if (el && !el.dataset.baseTransform) {
    el.dataset.baseTransform = 'translate(-50%, -50%)';
  }
}

function desregistrarSelecaoNex() {
  if (elementoSelecionadoNex) {
    elementoSelecionadoNex.classList.remove('selecionado');
  }

  elementoSelecionadoNex = null;

  const controles = document.getElementById('muralControlesSelecaoNex');
  if (controles) controles.style.display = 'none';
}

function podeEditarElementoSelecionadoNex() {
  if (!elementoSelecionadoNex) return false;
  if (elementoSelecionadoNex.dataset.travado === '1') return false;
  return true;
}

function aumentarElementoNex() {
  if (!podeEditarElementoSelecionadoNex()) return;

  const t = obterTransformacaoNex(elementoSelecionadoNex);
  t.escala = Math.min(3, t.escala + 0.15);
  aplicarTransformacaoNex(elementoSelecionadoNex);
  marcarAlterado();
}

function diminuirElementoNex() {
  if (!podeEditarElementoSelecionadoNex()) return;

  const t = obterTransformacaoNex(elementoSelecionadoNex);
  t.escala = Math.max(0.3, t.escala - 0.15);
  aplicarTransformacaoNex(elementoSelecionadoNex);
  marcarAlterado();
}

function girarElementoNex() {
  if (!podeEditarElementoSelecionadoNex()) return;

  const t = obterTransformacaoNex(elementoSelecionadoNex);
  t.rotacao = (t.rotacao + 15) % 360;
  aplicarTransformacaoNex(elementoSelecionadoNex);
  marcarAlterado();
}

function girarElementoInversoNex() {
  if (!podeEditarElementoSelecionadoNex()) return;

  const t = obterTransformacaoNex(elementoSelecionadoNex);
  t.rotacao = (t.rotacao - 15 + 360) % 360;
  aplicarTransformacaoNex(elementoSelecionadoNex);
  marcarAlterado();
}

function excluirElementoNex() {
  if (!podeEditarElementoSelecionadoNex()) return;

  elementoSelecionadoNex.remove();
  desregistrarSelecaoNex();
  marcarAlterado();
}

// ============================================
// SALVAR / CARREGAR
// ============================================

function coletarEstadoMuralNex() {
  const camada = document.getElementById('muralCamadaElementosNex');
  if (!camada) return null;

  const elementos = [];

  camada.querySelectorAll('.mural-texto-item-nex:not(.travado)').forEach((el) => {
    const t = obterTransformacaoNex(el);
    const conteudo = el.querySelector('.mural-texto-conteudo-nex');

    elementos.push({
      tipo: 'texto',
      id: el.dataset.id,
      x: parseFloat(el.style.left) || 0,
      y: parseFloat(el.style.top) || 0,
      texto: conteudo?.textContent || '',
      escala: t.escala,
      rotacao: t.rotacao
    });
  });

  camada.querySelectorAll('.mural-foto-item-nex:not(.travado)').forEach((el) => {
    const t = obterTransformacaoNex(el);
    const img = el.querySelector('.mural-foto-conteudo-nex');

    elementos.push({
      tipo: 'foto',
      id: el.dataset.id,
      x: parseFloat(el.style.left) || 0,
      y: parseFloat(el.style.top) || 0,
      largura: parseFloat(el.style.width) || 160,
      dataUrl: img?.src || el.dataset.dataUrl || '',
      escala: t.escala,
      rotacao: t.rotacao
    });
  });

  const meusTracosSalvos = tracosSalvosNex.filter((t) => t.ehMinha);
  const todosMeusTracos = meusTracosSalvos.concat(tracosPendentesNex);

  return {
    elementos,
    tracos: todosMeusTracos,
    versao: 1,
    atualizadoEm: Date.now()
  };
}

async function salvarMuralNex() {
  if (!muralAlteradoNex) return;

  const estado = coletarEstadoMuralNex();
  if (!estado) return;

  window.mostrarToastNex?.('Salvando...', 'info');

  const donoUsername = muralDonoUsernameNex || Drops.usernameAtual;

  let ok = false;

  if (typeof window.salvarMuralSupabase === 'function') {
    ok = await window.salvarMuralSupabase(donoUsername, estado);
  }

  if (!ok) {
    window.mostrarToastNex?.('Falha ao salvar a arte.', 'erro');
    return;
  }

  tracosSalvosNex = tracosSalvosNex.concat(tracosPendentesNex);
  tracosPendentesNex = [];

  tracosSalvosNex.forEach((t) => {
    if (t.pendente) t.pendente = false;
  });

  muralAlteradoNex = false;

  desregistrarSelecaoNex();
  atualizarBotaoSalvarNex();

  window.mostrarToastNex?.('Arte salva!', 'sucesso');
}

async function carregarMuralSalvoNex() {
  const camada = document.getElementById('muralCamadaElementosNex');
  if (!camada) return;

  camada.innerHTML = '';
  tracosSalvosNex = [];
  tracosPendentesNex = [];

  const donoUsername = muralDonoUsernameNex || Drops.usernameAtual;

  console.log('🎨 Carregando mural de:', donoUsername);

  let contribuicoes = [];

  if (typeof window.buscarMuralSupabase === 'function' && donoUsername) {
    contribuicoes = await window.buscarMuralSupabase(donoUsername);
    console.log('🎨 Contribuições recebidas:', contribuicoes.length);
  } else {
    console.warn('⚠️ Sem donoUsername ou sem buscarMuralSupabase');
  }

  if (!Array.isArray(contribuicoes) || !contribuicoes.length) {
    redesenharTracosNex();

    muralAlteradoNex = false;
    atualizarBotaoSalvarNex();
    return;
  }

  const meuUser = String(Drops.usernameAtual || '').toLowerCase().trim();

  contribuicoes.forEach((contrib) => {
    const dados = contrib.dados || {};
    const autor = String(contrib.autor_username || '').toLowerCase().trim();
    const ehMinha = autor === meuUser;

    if (Array.isArray(dados.elementos)) {
      dados.elementos.forEach((item) => {
        if (item.tipo === 'texto') {
          const el = criarTextoNoMuralNex(item.texto, {
            id: item.id,
            x: item.x,
            y: item.y,
            escala: item.escala,
            rotacao: item.rotacao,
            travado: !ehMinha
          });

          if (el) {
            el.dataset.autorId = autor;
            el.dataset.autorNome = contrib.autor_nome || autor;

            if (ehMinha) {
              el.classList.add('meu-elemento');
            } else {
              el.classList.add('elemento-outro');
            }
          }
        } else if (item.tipo === 'foto' && item.dataUrl) {
          const el = criarFotoNoMuralNex(item.dataUrl, {
            id: item.id,
            x: item.x,
            y: item.y,
            largura: item.largura,
            escala: item.escala,
            rotacao: item.rotacao,
            travado: !ehMinha
          });

          if (el) {
            el.dataset.autorId = autor;
            el.dataset.autorNome = contrib.autor_nome || autor;

            if (ehMinha) {
              el.classList.add('meu-elemento');
            } else {
              el.classList.add('elemento-outro');
            }
          }
        }
      });
    }

    if (Array.isArray(dados.tracos)) {
      dados.tracos.forEach((traco) => {
        traco.autorId = autor;
        traco.ehMinha = ehMinha;
        tracosSalvosNex.push(traco);
      });
    }
  });

  setTimeout(redesenharTracosNex, 100);

  muralAlteradoNex = false;
  atualizarBotaoSalvarNex();
}
  
  // ============================================
  // EVENT LISTENERS
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
  
    const btnFecharTopo = document.querySelector('.mural-topo-fechar-nex');
    if (btnFecharTopo) {
      const novoBtn = btnFecharTopo.cloneNode(true);
      btnFecharTopo.parentNode.replaceChild(novoBtn, btnFecharTopo);
      novoBtn.addEventListener('click', tentarFecharMuralNex);
    }

    const btnSalvar = document.getElementById('muralBtnSalvarNex');
    if (btnSalvar) {
      btnSalvar.addEventListener('click', salvarMuralNex);
    }

    const btnLimparMural = document.getElementById('muralBtnLimparNex');
    if (btnLimparMural) {
      btnLimparMural.addEventListener('click', abrirConfirmLimparMuralNex);
    }

    const btnConfirmLimparOk = document.getElementById('muralConfirmLimparOkNex');
    if (btnConfirmLimparOk) {
      btnConfirmLimparOk.addEventListener('click', confirmarLimparMuralNex);
    }

    const btnConfirmLimparCancelar = document.getElementById('muralConfirmLimparCancelarNex');
    if (btnConfirmLimparCancelar) {
      btnConfirmLimparCancelar.addEventListener('click', fecharConfirmLimparMuralNex);
    }

    const btnTexto = document.getElementById('muralBtnTextoNex');
    if (btnTexto) {
      btnTexto.addEventListener('click', abrirModalTextoMuralNex);
    }

    const btnFoto = document.getElementById('muralBtnFotoNex');
    if (btnFoto) {
      btnFoto.addEventListener('click', abrirSeletorFotoMuralNex);
    }

    const inputFoto = document.getElementById('muralInputFotoNex');
    if (inputFoto) {
      inputFoto.addEventListener('change', processarFotoMuralNex);
    }

    const btnCaneta = document.getElementById('muralBtnCanetaNex');
    if (btnCaneta) {
      btnCaneta.addEventListener('click', alternarCanetaNex);
    }

    document.querySelectorAll('.mural-cor-nex').forEach((btnCor) => {
      btnCor.addEventListener('click', () => {
        trocarCorCanetaNex(btnCor.dataset.cor);
      });
    });

    const canvasDesenho = document.getElementById('muralDesenhoNex');
    if (canvasDesenho) {
      canvasDesenho.addEventListener('pointerdown', iniciarDesenhoNex);
      canvasDesenho.addEventListener('pointermove', moverDesenhoNex);
      canvasDesenho.addEventListener('pointerup', finalizarDesenhoNex);
      canvasDesenho.addEventListener('pointercancel', finalizarDesenhoNex);
      canvasDesenho.addEventListener('pointerleave', finalizarDesenhoNex);
    }

    const primeiraCor = document.querySelector('.mural-cor-nex');
    if (primeiraCor) primeiraCor.classList.add('selecionada');

    const btnMenos = document.getElementById('muralBtnMenosNex');
    if (btnMenos) btnMenos.addEventListener('click', diminuirElementoNex);

    const btnMais = document.getElementById('muralBtnMaisNex');
    if (btnMais) btnMais.addEventListener('click', aumentarElementoNex);

    const btnGirar = document.getElementById('muralBtnGirarNex');
    if (btnGirar) btnGirar.addEventListener('click', girarElementoNex);

    const btnGirarInverso = document.getElementById('muralBtnGirarInversoNex');
    if (btnGirarInverso) {
      btnGirarInverso.addEventListener('click', girarElementoInversoNex);
    }

    const btnLixeira = document.getElementById('muralBtnLixeiraNex');
    if (btnLixeira) btnLixeira.addEventListener('click', excluirElementoNex);

    const btnCancelar = document.getElementById('muralTextoCancelarNex');
    if (btnCancelar) {
      btnCancelar.addEventListener('click', fecharModalTextoMuralNex);
    }

    const btnAplicar = document.getElementById('muralTextoAplicarNex');
    if (btnAplicar) {
      btnAplicar.addEventListener('click', aplicarTextoMuralNex);
    }

    const btnSalvarSair = document.getElementById('muralConfirmSalvarSairNex');
    if (btnSalvarSair) {
      btnSalvarSair.addEventListener('click', async () => {
        await salvarMuralNex();
        fecharMuralNex();
      });
    }

    const btnSairSemSalvar = document.getElementById('muralConfirmSairSemSalvarNex');
    if (btnSairSemSalvar) {
      btnSairSemSalvar.addEventListener('click', () => {
        fecharMuralNex();
      });
    }

    const btnContinuar = document.getElementById('muralConfirmContinuarNex');
    if (btnContinuar) {
      btnContinuar.addEventListener('click', () => {
        const modal = document.getElementById('muralConfirmSairNex');
        if (modal) modal.style.display = 'none';
      });
    }

    const scrollMural = document.getElementById('muralScrollNex');
    if (scrollMural) {
      scrollMural.addEventListener('pointerdown', (e) => {
        if (
          !e.target.closest('.mural-texto-item-nex') &&
          !e.target.closest('.mural-foto-item-nex')
        ) {
          deselecionarTudoMuralNex();
        }
      });
    }

    atualizarBotaoSalvarNex();
  });

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.abrirMuralNex = abrirMuralNex;
  window.fecharMuralNex = fecharMuralNex;
  window.abrirConfirmLimparMuralNex = abrirConfirmLimparMuralNex;
  window.fecharConfirmLimparMuralNex = fecharConfirmLimparMuralNex;
  window.confirmarLimparMuralNex = confirmarLimparMuralNex;
  window.tentarFecharMuralNex = tentarFecharMuralNex;
  window.rolarMuralNex = rolarMuralNex;
  window.atualizarAvisosLimiteNex = atualizarAvisosLimiteNex;

  window.abrirModalTextoMuralNex = abrirModalTextoMuralNex;
  window.fecharModalTextoMuralNex = fecharModalTextoMuralNex;
  window.aplicarTextoMuralNex = aplicarTextoMuralNex;
  window.criarTextoNoMuralNex = criarTextoNoMuralNex;
  window.deselecionarTudoMuralNex = deselecionarTudoMuralNex;

  window.abrirSeletorFotoMuralNex = abrirSeletorFotoMuralNex;
  window.processarFotoMuralNex = processarFotoMuralNex;
  window.criarFotoNoMuralNex = criarFotoNoMuralNex;

  window.alternarCanetaNex = alternarCanetaNex;
  window.desativarCanetaNex = desativarCanetaNex;
  window.trocarCorCanetaNex = trocarCorCanetaNex;
  window.redesenharTracosNex = redesenharTracosNex;

  window.aumentarElementoNex = aumentarElementoNex;
  window.diminuirElementoNex = diminuirElementoNex;
  window.girarElementoNex = girarElementoNex;
  window.girarElementoInversoNex = girarElementoInversoNex;
  window.excluirElementoNex = excluirElementoNex;

  window.salvarMuralNex = salvarMuralNex;
  window.carregarMuralSalvoNex = carregarMuralSalvoNex;
  window.coletarEstadoMuralNex = coletarEstadoMuralNex;
  window.atualizarBotaoSalvarNex = atualizarBotaoSalvarNex;
  window.temPendentesNex = temPendentesNex;

  console.log('📌 19-mural.js carregado');

})();