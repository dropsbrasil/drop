/* ============================================
   13-EDITOR.JS
   Editor de foto/vídeo, câmera, texto, fundo
   
   Depende de: 00-config.js, 03-utils.js, 12-mydrops.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // ESTADO DO EDITOR
  // ============================================

  let contadorTextoMyDropsNex = 0;

  let textoSelecionadoMyDropsNex = null;
  let itemSelecionadoMyDropsNex = null;

  let ultimoToqueTextoMyDropsNex = {
    el: null,
    tempo: 0
  };

  let loopVideoMyDropsNex = false;

  let fotoAtualMyDropsNex = null;
  let legendaTemporariaMyDropsNex = '';
  let modoEditorMyDropsNex = 'foto';

  // ============================================
  // TEMAS DE TEXTO
  // ============================================

  const temasTextoMyDropsNex = [
    '',                // 0 - Sem tema
    'tema-branco',     // 1 - Cartão branco (padrão)
    'tema-escuro',     // 2 - Fundo escuro
    'tema-azul',       // 3 - Fundo azul
    'tema-verde',      // 4 - Fundo verde
    'tema-amarelo',    // 5 - Fundo amarelo
    'tema-rosa',       // 6 - Fundo rosa
    'tema-roxo',       // 7 - Fundo roxo
    'tema-neon',       // 8 - Neon
    'tema-papel',      // 9 - Papel
    'tema-vidro'       // 10 - Vidro
  ];

  // ============================================
  // OBTER CAMADA ATIVA (foto ou vídeo)
  // ============================================

  function obterCamadaTextoAtivaMyDropsNex() {
    const fotoEditor = document.getElementById('fotoEditorMyDropsNex');

    if (fotoEditor && getComputedStyle(fotoEditor).display !== 'none') {
      return document.getElementById('fotoEditorLayerMyDropsNex');
    }

    return document.getElementById('videoEditorLayerMyDropsNex');
  }

  // ============================================
  // LIMPAR CAMADAS DE TEXTO
  // ============================================

  function limparCamadasTextoMyDropsNex() {
    const layer = obterCamadaTextoAtivaMyDropsNex();
    if (layer) layer.innerHTML = '';

    contadorTextoMyDropsNex = 0;
    desselecionarTextoMyDropsNex();
  }

  // ============================================
  // TRANSFORMAÇÃO DE ITEM (scale + rotation)
  // ============================================

  function atualizarTransformacaoItemMyDropsNex(alvo) {
    const scale = Number(alvo.dataset.scale || 1);
    const rotation = Number(alvo.dataset.rotation || 0);
    alvo.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;
  }

  // ============================================
  // CRIAR TEXTO EDITÁVEL
  // ============================================

  function criarTextoMyDropsNex() {
    const layer = obterCamadaTextoAtivaMyDropsNex();
    if (!layer) return;

    contadorTextoMyDropsNex += 1;

    const el = document.createElement('div');
    el.className = 'video-editor-text-mydrops-nex';

    const body = document.createElement('div');
    body.className = 'video-editor-text-body-mydrops-nex';
    body.textContent = '2 toque para editar';
    body.style.textAlign = 'center';
    body.style.color = '#000000';
    body.style.fontSize = '24px';
    body.style.fontWeight = '500';
    el.dataset.align = 'center';

    el.appendChild(body);

    el.dataset.id = String(contadorTextoMyDropsNex);
    el.dataset.temaIndex = '1';
    el.dataset.scale = '1';
    el.dataset.rotation = '0';

    el.style.left = '50%';
    el.style.top = '50%';
    el.style.transformOrigin = 'center center';
    el.style.transform = 'translate(-50%, -50%) rotate(0deg) scale(1)';

    aplicarTemaTextoMyDropsNex(el, 1);
    layer.appendChild(el);

    garantirLixeiraMyDropsNex();
    selecionarTextoMyDropsNex(el);

    ativarArrasteTextoMyDropsNex(el);
  }

  // ============================================
  // ARRASTAR TEXTO
  // ============================================

  function ativarArrasteTextoMyDropsNex(el) {
    const layer = obterCamadaTextoAtivaMyDropsNex();
    if (!layer) return;

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    let moved = false;

    el.addEventListener('pointerdown', (e) => {
      // Ignora se está em modo edição
      const body = el.querySelector('.video-editor-text-body-mydrops-nex');
      if (body && body.contentEditable === 'true') return;

      // Ignora cliques nas alças
      if (e.target.closest('.notas-alca-nex')) return;
      if (e.target.closest('.editor-alca-nex')) return;

      if (e.button !== undefined && e.button !== 0) return;

      e.preventDefault();
      selecionarTextoMyDropsNex(el);
      pointerId = e.pointerId;
      moved = false;

      const layerRect = layer.getBoundingClientRect();
      const rect = el.getBoundingClientRect();

      startX = e.clientX;
      startY = e.clientY;
      originLeft = rect.left - layerRect.left + rect.width / 2;
      originTop = rect.top - layerRect.top + rect.height / 2;

      try {
        el.setPointerCapture(pointerId);
      } catch (_) {}

      const onMove = (ev) => {
        if (ev.pointerId !== pointerId) return;

        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;

        el.style.left = `${originLeft + dx}px`;
        el.style.top = `${originTop + dy}px`;

        atualizarTransformacaoItemMyDropsNex(el);
      };

      const onUp = (ev) => {
        if (ev.pointerId !== pointerId) return;

        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);

        try {
          el.releasePointerCapture(pointerId);
        } catch (_) {}

        if (!moved) {
          tratarDuploToqueTextoMyDropsNex(el);
        }
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });
  }

  // ============================================
  // DUPLO TOQUE EM TEXTO → EDIÇÃO INLINE
  // ============================================

  function tratarDuploToqueTextoMyDropsNex(el) {
    const agora = Date.now();

    if (
      ultimoToqueTextoMyDropsNex.el === el &&
      agora - ultimoToqueTextoMyDropsNex.tempo < 350
    ) {
      ultimoToqueTextoMyDropsNex.el = null;
      ultimoToqueTextoMyDropsNex.tempo = 0;

      editarTextoInlineMyDropsNex(el);
      return;
    }

    ultimoToqueTextoMyDropsNex.el = el;
    ultimoToqueTextoMyDropsNex.tempo = agora;
  }

  // ============================================
// APLICAR / LIMPAR TEMA DE TEXTO
// ============================================

function limparTemaTextoMyDropsNex(el) {
  const body = el.querySelector('.video-editor-text-body-mydrops-nex');
  if (!body) return;

  temasTextoMyDropsNex.forEach((tema) => {
    if (tema) body.classList.remove(tema);
  });
}

function aplicarTemaTextoMyDropsNex(el, temaIndex) {
  if (!el) return;

  const body = el.querySelector('.video-editor-text-body-mydrops-nex');
  if (!body) return;

  limparTemaTextoMyDropsNex(el);

  const tema = temasTextoMyDropsNex[temaIndex] || '';
  if (tema) body.classList.add(tema);

  el.dataset.temaIndex = String(temaIndex);
}

function aplicarTemaNoTextoSelecionadoMyDropsNex() {
  const el = textoSelecionadoMyDropsNex;
  if (!el) return;

  const body = el.querySelector('.video-editor-text-body-mydrops-nex');
  if (!body) return;

  const temaAtual = Number(el.dataset.temaIndex || 0);
  const proximoTema = (temaAtual + 1) % temasTextoMyDropsNex.length;

  aplicarTemaTextoMyDropsNex(el, proximoTema);
}

// ============================================
// ALÇAS DE TRANSFORMAÇÃO (➕ e ↻)
// ============================================

function removerAlcasMyDropsNex(el) {
  if (!el) return;
  el.querySelectorAll(':scope > .editor-alca-nex').forEach((a) => a.remove());
}

function criarAlcasMyDropsNex(el) {
  if (!el) return;
  removerAlcasMyDropsNex(el);

  const alcaRot = document.createElement('button');
  alcaRot.type = 'button';
  alcaRot.className = 'editor-alca-nex editor-alca-rotacionar-nex';
  alcaRot.textContent = '↻';
  alcaRot.setAttribute('aria-label', 'Rotacionar');

  const alcaRes = document.createElement('button');
  alcaRes.type = 'button';
  alcaRes.className = 'editor-alca-nex editor-alca-redimensionar-nex';
  alcaRes.textContent = '➕';
  alcaRes.setAttribute('aria-label', 'Redimensionar');

  el.appendChild(alcaRot);
  el.appendChild(alcaRes);

  ativarAlcaRotacionarMyDropsNex(el, alcaRot);
  ativarAlcaRedimensionarMyDropsNex(el, alcaRes);
}

function ativarAlcaRotacionarMyDropsNex(el, alca) {
  let pointerId = null;
  let centroX = 0;
  let centroY = 0;
  let anguloInicial = 0;
  let rotacaoInicial = 0;

  alca.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const rect = el.getBoundingClientRect();
    centroX = rect.left + rect.width / 2;
    centroY = rect.top + rect.height / 2;

    const dx = e.clientX - centroX;
    const dy = e.clientY - centroY;
    anguloInicial = Math.atan2(dy, dx) * (180 / Math.PI);
    rotacaoInicial = Number(el.dataset.rotation || 0);

    pointerId = e.pointerId;
    try { alca.setPointerCapture(pointerId); } catch (_) {}

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;

      const dx2 = ev.clientX - centroX;
      const dy2 = ev.clientY - centroY;
      const anguloAtual = Math.atan2(dy2, dx2) * (180 / Math.PI);

      let delta = anguloAtual - anguloInicial;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      const novaRot = rotacaoInicial + delta;
      el.dataset.rotation = String(novaRot);

      atualizarTransformacaoItemMyDropsNex(el);
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      alca.removeEventListener('pointermove', onMove);
      alca.removeEventListener('pointerup', onUp);
      alca.removeEventListener('pointercancel', onUp);
      try { alca.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;
    };

    alca.addEventListener('pointermove', onMove);
    alca.addEventListener('pointerup', onUp);
    alca.addEventListener('pointercancel', onUp);
  });
}

function ativarAlcaRedimensionarMyDropsNex(el, alca) {
  let pointerId = null;
  let centroX = 0;
  let centroY = 0;
  let distInicial = 0;
  let escalaInicial = 1;

  alca.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const rect = el.getBoundingClientRect();
    centroX = rect.left + rect.width / 2;
    centroY = rect.top + rect.height / 2;

    distInicial = Math.hypot(e.clientX - centroX, e.clientY - centroY) || 1;
    escalaInicial = Number(el.dataset.scale || 1);

    pointerId = e.pointerId;
    try { alca.setPointerCapture(pointerId); } catch (_) {}

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;

      const dist = Math.hypot(ev.clientX - centroX, ev.clientY - centroY);
      const fator = dist / distInicial;
      const nova = Math.max(0.3, Math.min(4, escalaInicial * fator));

      el.dataset.scale = String(nova);
      atualizarTransformacaoItemMyDropsNex(el);
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      alca.removeEventListener('pointermove', onMove);
      alca.removeEventListener('pointerup', onUp);
      alca.removeEventListener('pointercancel', onUp);
      try { alca.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;
    };

    alca.addEventListener('pointermove', onMove);
    alca.addEventListener('pointerup', onUp);
    alca.addEventListener('pointercancel', onUp);
  });
}

// ============================================
// SELECIONAR / DESELECIONAR
// ============================================

function limparSelecaoEditavelMyDropsNex() {
  // Remove alças do item selecionado
  if (itemSelecionadoMyDropsNex) {
    removerAlcasMyDropsNex(itemSelecionadoMyDropsNex);
  }

  itemSelecionadoMyDropsNex = null;
  textoSelecionadoMyDropsNex = null;

  document
    .querySelectorAll(
      '.video-editor-text-mydrops-nex, .video-editor-photo-mydrops-nex, .video-editor-video-mydrops-nex'
    )
    .forEach((item) => {
      item.classList.remove('is-selected');
      item.style.outline = 'none';
    });

  const floatingTrash = document.getElementById(
    'videoEditorTrashFloatingMyDropsNex'
  );
  if (floatingTrash) {
    floatingTrash.classList.remove('active');
  }

  loopVideoMyDropsNex = false;

  const btnLoopDrops = document.getElementById('fotoEditorLoopMyDropsNex');
  if (btnLoopDrops) {
    btnLoopDrops.style.display = 'none';
    btnLoopDrops.classList.remove('is-active');
  }
}

function selecionarTextoMyDropsNex(el) {
  garantirLixeiraMyDropsNex();
  limparSelecaoEditavelMyDropsNex();

  textoSelecionadoMyDropsNex = el;
  itemSelecionadoMyDropsNex = el;

  el.classList.add('is-selected');
  el.style.outline = '2px solid rgba(255,255,255,.65)';

  // Cria as alças ➕ e ↻
  criarAlcasMyDropsNex(el);

  const floatingTrash = document.getElementById(
    'videoEditorTrashFloatingMyDropsNex'
  );
  if (floatingTrash) {
    floatingTrash.style.display = 'flex';
    floatingTrash.classList.add('active');
  }
}

function desselecionarTextoMyDropsNex() {
  if (itemSelecionadoMyDropsNex) {
    removerAlcasMyDropsNex(itemSelecionadoMyDropsNex);
  }

  document
    .querySelectorAll(
      '.video-editor-text-mydrops-nex, .video-editor-photo-mydrops-nex, .video-editor-video-mydrops-nex'
    )
    .forEach((item) => {
      item.classList.remove('is-selected');
      item.style.outline = 'none';
    });

  textoSelecionadoMyDropsNex = null;
  itemSelecionadoMyDropsNex = null;

  const floatingTrash = document.getElementById(
    'videoEditorTrashFloatingMyDropsNex'
  );
  if (floatingTrash) {
    floatingTrash.classList.remove('active');
  }

  loopVideoMyDropsNex = false;

  const btnLoopDrops = document.getElementById('fotoEditorLoopMyDropsNex');
  if (btnLoopDrops) {
    btnLoopDrops.style.display = 'none';
    btnLoopDrops.classList.remove('is-active');
  }
}

// ============================================
// EDIÇÃO INLINE (substitui o modal)
// ============================================

function editarTextoInlineMyDropsNex(el) {
  if (!el) return;

  const body = el.querySelector('.video-editor-text-body-mydrops-nex');
  if (!body) return;

  // Placeholder não entra em edição — limpa
  const textoAtual = (body.textContent || '').trim();
  const ehPlaceholder =
    textoAtual === '2 toque para editar' ||
    textoAtual === '✍️ Escreva sua nota aqui...' ||
    textoAtual === '2 toque para Escreva sua nota aqui...';

  if (ehPlaceholder) {
    body.textContent = '';
  }

  // Marca como editando
  el.dataset.editando = '1';
  body.contentEditable = 'true';

  // Remove alças e lixeira durante a edição
  removerAlcasMyDropsNex(el);

  const floatingTrash = document.getElementById(
    'videoEditorTrashFloatingMyDropsNex'
  );
  if (floatingTrash) {
    floatingTrash.classList.remove('active');
  }

  // Foca e coloca o cursor no fim
  setTimeout(() => {
    body.focus();

    const range = document.createRange();
    const sel = window.getSelection();

    if (body.childNodes.length > 0) {
      range.selectNodeContents(body);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, 50);

  // Finaliza quando perde o foco
  const onBlur = () => {
    body.removeEventListener('blur', onBlur);
    finalizarEdicaoInlineMyDropsNex(el);
  };

  body.addEventListener('blur', onBlur);
}

function finalizarEdicaoInlineMyDropsNex(el) {
  if (!el) return;

  const body = el.querySelector('.video-editor-text-body-mydrops-nex');
  if (!body) return;

  body.contentEditable = 'false';
  delete el.dataset.editando;

  const textoFinal = (body.textContent || '').trim();

  // Se ficou vazio, restaura o placeholder
  if (!textoFinal) {
    body.textContent = '2 toque para editar';
  }

  // Re-seleciona pra voltar as alças e a lixeira
  selecionarTextoMyDropsNex(el);
}

  // ============================================
// LIXEIRA FLUTUANTE
// ============================================

function garantirLixeiraMyDropsNex() {
  let btnDelete = document.getElementById(
    'videoEditorTrashFloatingMyDropsNex'
  );

  if (!btnDelete) {
    btnDelete = document.createElement('button');
    btnDelete.type = 'button';
    btnDelete.id = 'videoEditorTrashFloatingMyDropsNex';
    btnDelete.className =
      'video-editor-trash-floating-mydrops-nex foto-editor-top-btn';
    btnDelete.textContent = '🗑️';

    btnDelete.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const alvo = itemSelecionadoMyDropsNex;
      if (!alvo) return;

      // Remove alças antes de apagar
      removerAlcasMyDropsNex(alvo);

      alvo.remove();

      itemSelecionadoMyDropsNex = null;
      textoSelecionadoMyDropsNex = null;
      limparSelecaoEditavelMyDropsNex();
    });

    let container = document.querySelector('.foto-editor-top-buttons');

    if (!container) {
      container = document.createElement('div');
      container.className = 'foto-editor-top-buttons';
      container.style.position = 'absolute';
      container.style.top = '16px';
      container.style.left = '16px';
      container.style.zIndex = '10';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.gap = '6px';
      container.style.flexWrap = 'wrap';

      const fotoEditor = document.getElementById('fotoEditorMyDropsNex');
      if (fotoEditor) {
        fotoEditor.appendChild(container);
      } else {
        document.body.appendChild(container);
      }
    }

    container.appendChild(btnDelete);
  }

  const temSelecao = !!(
    itemSelecionadoMyDropsNex || textoSelecionadoMyDropsNex
  );

  if (temSelecao) {
    btnDelete.classList.add('active');
  } else {
    btnDelete.classList.remove('active');
  }

  return btnDelete;
}

// ============================================
// SELECIONAR FOTO / VÍDEO
// ============================================

function selecionarFotoMyDropsNex(el) {
  limparSelecaoEditavelMyDropsNex();

  itemSelecionadoMyDropsNex = el;
  textoSelecionadoMyDropsNex = null;

  el.classList.add('is-selected');
  el.style.outline = '2px solid rgba(255,255,255,.65)';

  criarAlcasMyDropsNex(el);

  garantirLixeiraMyDropsNex();

  const floatingTrash = document.getElementById(
    'videoEditorTrashFloatingMyDropsNex'
  );
  if (floatingTrash) {
    floatingTrash.classList.add('active');
  }
}

function selecionarVideoMyDropsNex(el) {
  limparSelecaoEditavelMyDropsNex();

  itemSelecionadoMyDropsNex = el;
  textoSelecionadoMyDropsNex = null;

  el.classList.add('is-selected');
  el.style.outline = '2px solid rgba(255,255,255,.65)';

  criarAlcasMyDropsNex(el);

  loopVideoMyDropsNex = el.dataset.loop === '1';

  const btnLoopDrops = document.getElementById('fotoEditorLoopMyDropsNex');
  if (btnLoopDrops) {
    btnLoopDrops.style.display = 'block';
    btnLoopDrops.classList.toggle('is-active', el.dataset.loop === '1');
  }

  garantirLixeiraMyDropsNex();

  const floatingTrash = document.getElementById(
    'videoEditorTrashFloatingMyDropsNex'
  );
  if (floatingTrash) {
    floatingTrash.classList.add('active');
  }
}

// ============================================
// CRIAR FOTO EDITÁVEL
// ============================================

function criarFotoEditavelMyDropsNex(dataURL) {
  const layer = document.getElementById('fotoEditorLayerMyDropsNex');
  if (!layer) return;

  garantirLixeiraMyDropsNex();

  const item = document.createElement('div');
  item.className = 'video-editor-photo-mydrops-nex';
  item.dataset.scale = '1';
  item.dataset.rotation = '0';
  item.style.left = '50%';
  item.style.top = '50%';
  item.style.transform = 'translate(-50%, -50%) rotate(0deg) scale(1)';
  item.style.transformOrigin = 'center center';

  item.innerHTML = `
    <div class="video-editor-photo-body-mydrops-nex">
      <img src="${dataURL}" alt="Foto do Drops">
    </div>
  `;

  layer.appendChild(item);
  selecionarFotoMyDropsNex(item);
  ativarArrasteFotoMyDropsNex(item);
}

// ============================================
// CRIAR VÍDEO EDITÁVEL
// ============================================

function limparVideoEditavelMyDropsNex() {
  const layer = document.getElementById('fotoEditorLayerMyDropsNex');
  if (!layer) return;

  const antigo = layer.querySelector('.video-editor-video-mydrops-nex');
  if (!antigo) return;

  const urlAntiga = antigo.dataset.videoUrl;
  if (urlAntiga) {
    URL.revokeObjectURL(urlAntiga);
  }

  if (itemSelecionadoMyDropsNex === antigo) {
    limparSelecaoEditavelMyDropsNex();
  }

  antigo.remove();
}

function criarVideoEditavelMyDropsNex(videoURL) {
  const layer = document.getElementById('fotoEditorLayerMyDropsNex');
  if (!layer) return;

  limparVideoEditavelMyDropsNex();

  const item = document.createElement('div');
  item.className = 'video-editor-video-mydrops-nex';
  item.dataset.scale = '1';
  item.dataset.rotation = '0';
  item.dataset.videoUrl = videoURL;
  item.dataset.loop = '0';
  item.style.left = '50%';
  item.style.top = '50%';
  item.style.transform = 'translate(-50%, -50%) rotate(0deg) scale(1)';
  item.style.transformOrigin = 'center center';

  item.innerHTML = `
    <div class="video-editor-video-body-mydrops-nex">
      <div class="video-editor-video-time-mydrops-nex">
        00:00
      </div>

      <div class="video-editor-video-progress-mydrops-nex">
        <div class="video-editor-video-progress-fill-mydrops-nex"></div>
      </div>

      <video src="${videoURL}" autoplay playsinline></video>

      <button
        type="button"
        class="video-editor-video-play-mydrops-nex">
        ▶
      </button>
    </div>
  `;

  layer.appendChild(item);
  selecionarVideoMyDropsNex(item);
  ativarArrasteVideoMyDropsNex(item);

  const video = item.querySelector('video');
  const btnPlay = item.querySelector('.video-editor-video-play-mydrops-nex');
  const barra = item.querySelector(
    '.video-editor-video-progress-fill-mydrops-nex'
  );
  const tempo = item.querySelector('.video-editor-video-time-mydrops-nex');

  if (video) {
    video.loop = false;
    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1;
    video.playsInline = true;
    video.preload = 'auto';
    video.removeAttribute('muted');

    video.play().catch(() => {});

    video.addEventListener('timeupdate', () => {
      if (!video.duration) return;

      const percentual = (video.currentTime / video.duration) * 100;

      if (barra) {
        barra.style.height = percentual + '%';
      }

      if (tempo) {
        const atual = Math.floor(video.currentTime);
        const minutos = String(Math.floor(atual / 60)).padStart(2, '0');
        const segundos = String(atual % 60).padStart(2, '0');
        tempo.textContent = `${minutos}:${segundos}`;
      }
    });
  }

  if (btnPlay) {
    btnPlay.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    btnPlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!video) return;

      if (video.paused) {
        video.play().catch(() => {});
        btnPlay.textContent = '❚❚';
      } else {
        video.pause();
        btnPlay.textContent = '▶';
      }
    });
  }
}

// ============================================
// ARRASTAR FOTO
// ============================================

function ativarArrasteFotoMyDropsNex(el) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let moved = false;

  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.editor-alca-nex')) return;
    if (e.button !== undefined && e.button !== 0) return;

    e.preventDefault();
    selecionarFotoMyDropsNex(el);

    pointerId = e.pointerId;
    moved = false;

    const layer = document.getElementById('fotoEditorLayerMyDropsNex');
    if (!layer) return;

    const layerRect = layer.getBoundingClientRect();
    const rect = el.getBoundingClientRect();

    startX = e.clientX;
    startY = e.clientY;
    originLeft = rect.left - layerRect.left + rect.width / 2;
    originTop = rect.top - layerRect.top + rect.height / 2;

    el.setPointerCapture(pointerId);

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;

      el.style.left = `${originLeft + dx}px`;
      el.style.top = `${originTop + dy}px`;
      atualizarTransformacaoItemMyDropsNex(el);
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;

      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);

      try {
        el.releasePointerCapture(pointerId);
      } catch (_) {}

      if (!moved) {
        selecionarFotoMyDropsNex(el);
      }
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  });
}

// ============================================
// ARRASTAR VÍDEO
// ============================================

function ativarArrasteVideoMyDropsNex(el) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let moved = false;

  el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.editor-alca-nex')) return;
    if (e.button !== undefined && e.button !== 0) return;

    e.preventDefault();
    selecionarVideoMyDropsNex(el);

    pointerId = e.pointerId;
    moved = false;

    const layer = document.getElementById('fotoEditorLayerMyDropsNex');
    if (!layer) return;

    const layerRect = layer.getBoundingClientRect();
    const rect = el.getBoundingClientRect();

    startX = e.clientX;
    startY = e.clientY;
    originLeft = rect.left - layerRect.left + rect.width / 2;
    originTop = rect.top - layerRect.top + rect.height / 2;

    try {
      el.setPointerCapture(pointerId);
    } catch (_) {}

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;

      el.style.left = `${originLeft + dx}px`;
      el.style.top = `${originTop + dy}px`;

      atualizarTransformacaoItemMyDropsNex(el);
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;

      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);

      try {
        el.releasePointerCapture(pointerId);
      } catch (_) {}

      if (!moved) {
        selecionarVideoMyDropsNex(el);
      }
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  });
}

  // ============================================
// ABRIR EDITOR DE FOTO
// ============================================

function abrirEditorFotoMyDropsNex(dataURL = null) {
  legendaTemporariaMyDropsNex = '';

  fotoAtualMyDropsNex = dataURL;

  // Cria o editor se ainda não existir
  if (!document.getElementById('fotoEditorMyDropsNex')) {
    const editor = document.createElement('div');
    editor.id = 'fotoEditorMyDropsNex';
    editor.className = 'video-editor-mydrops-nex';
    editor.style.display = 'none';

    editor.innerHTML = `
      <div id="fotoEditorStageMyDropsNex" class="foto-editor-stage-mydrops-nex">
        <div id="fotoEditorPreviewMyDropsNex"></div>
        <div id="fotoEditorLayerMyDropsNex" class="video-editor-layer-mydrops-nex"></div>
      </div>

      <div class="foto-editor-top-buttons">
        <button type="button" id="fotoEditorAddTextMyDropsNex" class="foto-editor-top-btn">𝐓/🙂</button>
        <button type="button" id="fotoEditorThemeMyDropsNex" class="foto-editor-top-btn">🎨</button>
        <button type="button" id="dropsFotoMyDropsNex" class="foto-editor-top-btn">📷 Foto</button>
        <button type="button" id="dropsFundoMyDropsNex" class="foto-editor-top-btn">🖼️ Fundo</button>
        <button type="button" id="fotoEditorAjustarMyDropsNex" class="foto-editor-top-btn ajustar-btn">⬛ Ajustar</button>
        <button type="button" id="fotoEditorDeleteMyDropsNex" class="foto-editor-top-btn">Sair ➜</button>
      </div>

      <input type="file" id="dropsFotoPickerMyDropsNex" accept="image/*" multiple hidden>
      <input type="file" id="dropsVideoPickerMyDropsNex" accept="video/*" hidden>
    `;

    document.body.appendChild(editor);

    // Botão Fundo
    setTimeout(function () {
      const btnFundo = document.getElementById('dropsFundoMyDropsNex');
      if (btnFundo) {
        const novoBtn = btnFundo.cloneNode(true);
        btnFundo.parentNode.replaceChild(novoBtn, btnFundo);
        novoBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          abrirModalFundoMyDropsNex();
        });
      }

      conectarBotaoAjustar();
    }, 50);

    // ============================================
    // CAMPO LEGENDA + PUBLICAR
    // ============================================

    const legendaRow = document.createElement('div');
    legendaRow.id = 'fotoEditorLegendaRowMyDropsNex';
    legendaRow.className = 'foto-editor-legenda-row-mydrops-nex';

    const legendaInput = document.createElement('div');
    legendaInput.id = 'fotoEditorLegendaMyDropsNex';
    legendaInput.className = 'foto-editor-legenda-mydrops-nex';
    legendaInput.innerHTML = `
      <textarea
        id="legendaMyDropsInput"
        class="foto-editor-legenda-input"
        maxlength="500"
        placeholder="✍🏼 Escreva uma legenda (máx. 500 caracteres)..."
      ></textarea>
      <span id="legendaContadorMyDrops" class="foto-editor-legenda-contador">0/500</span>
    `;

    const btnPublicarFoto = document.createElement('button');
    btnPublicarFoto.type = 'button';
    btnPublicarFoto.id = 'fotoEditorPublishMyDropsNex';
    btnPublicarFoto.className = 'video-editor-publish-mydrops-nex';
    btnPublicarFoto.textContent = 'Publicar';

    btnPublicarFoto.addEventListener('click', () => {
      const legenda = document.getElementById('legendaMyDropsInput')?.value || '';
      legendaTemporariaMyDropsNex = legenda;
      abrirModalDuracaoPublicacaoMyDropsNex('foto');
    });

    legendaRow.appendChild(legendaInput);
    legendaRow.appendChild(btnPublicarFoto);
    editor.appendChild(legendaRow);

    // Contador
    const textarea = legendaInput.querySelector('#legendaMyDropsInput');
    const contador = document.getElementById('legendaContadorMyDrops');
    if (textarea && contador) {
      textarea.addEventListener('input', () => {
        const len = textarea.value.length;
        contador.textContent = `${len}/500`;
        legendaTemporariaMyDropsNex = textarea.value;
      });
    }

    // Eventos dos botões topo
    editor.querySelector('#fotoEditorDeleteMyDropsNex')?.addEventListener('click', () => {
      fotoAtualMyDropsNex = null;

      const layer = document.getElementById('fotoEditorLayerMyDropsNex');
      if (layer) layer.innerHTML = '';

      editor.style.display = 'none';
      legendaTemporariaMyDropsNex = '';
    });

    editor.querySelector('#fotoEditorAddTextMyDropsNex')?.addEventListener('click', criarTextoMyDropsNex);
    editor.querySelector('#fotoEditorThemeMyDropsNex')?.addEventListener('click', aplicarTemaNoTextoSelecionadoMyDropsNex);

    editor.querySelector('#dropsFotoMyDropsNex')?.addEventListener('click', () => {
      const picker = document.getElementById('dropsFotoPickerMyDropsNex');
      if (picker) picker.click();
    });

    document.getElementById('dropsFotoPickerMyDropsNex')?.addEventListener('change', (e) => {
      const arquivos = Array.from(e.target.files || []).slice(0, 5);

      arquivos.forEach((arquivo) => {
        const leitor = new FileReader();

        leitor.onload = function (evt) {
          const dataURL = evt.target.result;
          criarFotoEditavelMyDropsNex(dataURL);
        };

        leitor.readAsDataURL(arquivo);
      });

      e.target.value = '';
    });

    document.getElementById('dropsVideoPickerMyDropsNex')?.addEventListener('change', (e) => {
      const arquivo = (e.target.files || [])[0];
      if (!arquivo) return;

      if (!arquivo.type.startsWith('video/')) {
        e.target.value = '';
        return;
      }

      const urlVideo = URL.createObjectURL(arquivo);
      criarVideoEditavelMyDropsNex(urlVideo);

      e.target.value = '';
    });
  }

  // ============================================
  // MOSTRA O EDITOR E PREPARA ESTADO
  // ============================================

  const editor = document.getElementById('fotoEditorMyDropsNex');
  const preview = document.getElementById('fotoEditorPreviewMyDropsNex');
  const layer = document.getElementById('fotoEditorLayerMyDropsNex');

  if (layer) layer.innerHTML = '';
  contadorTextoMyDropsNex = 0;
  textoSelecionadoMyDropsNex = null;

  // Reseta o stage
  const stage = document.getElementById('fotoEditorStageMyDropsNex');
  if (stage) {
    stage.style.backgroundColor = '';
    stage.style.backgroundImage = '';
    stage.style.backgroundSize = '';
    stage.style.backgroundPosition = '';
    stage.style.backgroundRepeat = '';
  }

  if (dataURL) {
    preview.style.backgroundImage = `url('${dataURL}')`;
    preview.style.backgroundSize = 'contain';
    preview.style.backgroundPosition = 'center';
    preview.style.backgroundColor = '#000';
  } else {
    preview.style.backgroundImage = 'none';
    preview.style.backgroundSize = 'contain';
    preview.style.backgroundPosition = 'center';
    preview.style.backgroundColor = '#08111f';
  }

  // Preenche legenda se existir
  const legendaInput = document.getElementById('legendaMyDropsInput');
  if (legendaInput && legendaTemporariaMyDropsNex) {
    legendaInput.value = legendaTemporariaMyDropsNex;
    const contador = document.getElementById('legendaContadorMyDrops');
    if (contador) {
      contador.textContent = `${legendaTemporariaMyDropsNex.length}/500`;
    }
  }

  editor.style.display = 'flex';
}

// ============================================
// CÂMERA DE VÍDEO (MyDrops)
// ============================================

let streamCameraMyDropsNex = null;
let mediaRecorderMyDropsNex = null;
let chunksCameraMyDropsNex = [];
let timerCameraMyDropsNex = null;
let tempoCameraMyDropsNex = 0;
let gravandoCameraMyDropsNex = false;
let cameraFrontalMyDropsNex = false;
let acaoAoPararGravacaoMyDropsNex = 'editor';

function atualizarUICameraMyDropsNex() {
  const timer = document.getElementById('cameraMyDropsTimerNex');
  const recordBtn = document.getElementById('cameraMyDropsRecordNex');

  if (timer) {
    timer.textContent = formatarTempoMyDropsNex(tempoCameraMyDropsNex);
    timer.classList.toggle('gravando', gravandoCameraMyDropsNex);
  }

  if (recordBtn) {
    recordBtn.textContent = '';
    recordBtn.classList.toggle('gravando', gravandoCameraMyDropsNex);
  }
}

function pararStreamCameraMyDropsNex() {
  if (streamCameraMyDropsNex) {
    streamCameraMyDropsNex.getTracks().forEach((track) => track.stop());
    streamCameraMyDropsNex = null;
  }

  const video = document.getElementById('cameraMyDropsPreviewNex');
  if (video) video.srcObject = null;
}

async function abrirStreamCameraMyDropsNex() {
  const overlay = document.getElementById('cameraMyDropsOverlayNex');
  const video = document.getElementById('cameraMyDropsPreviewNex');
  const timer = document.getElementById('cameraMyDropsTimerNex');

  if (!overlay || !video || !timer) return false;

  overlay.style.display = 'flex';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    overlay.style.display = 'none';
    alert('Seu aparelho não suporta câmera.');
    return false;
  }

  try {
    pararStreamCameraMyDropsNex();

    streamCameraMyDropsNex = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: {
        facingMode: {
          ideal: cameraFrontalMyDropsNex ? 'user' : 'environment'
        },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 }
      }
    });

    video.srcObject = streamCameraMyDropsNex;
    await video.play();

    return true;
  } catch (erro) {
    console.error('Erro ao abrir câmera My Drops:', erro);
    overlay.style.display = 'none';
    alert('Não foi possível abrir a câmera.');
    return false;
  }
}

function obterMimeTypeVideoMyDropsNex() {
  if (typeof MediaRecorder === 'undefined') return '';

  const tipos = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];

  return (
    tipos.find(
      (tipo) =>
        typeof MediaRecorder.isTypeSupported === 'function' &&
        MediaRecorder.isTypeSupported(tipo)
    ) || ''
  );
}

async function iniciarGravacaoMyDropsNex() {
  if (gravandoCameraMyDropsNex) return;

  if (!streamCameraMyDropsNex) {
    const abriu = await abrirStreamCameraMyDropsNex();
    if (!abriu) return;
  }

  if (typeof MediaRecorder === 'undefined') {
    alert('Seu aparelho não suporta gravação de vídeo.');
    return;
  }

  try {
    const mimeType = obterMimeTypeVideoMyDropsNex();

    chunksCameraMyDropsNex = [];
    tempoCameraMyDropsNex = 0;
    gravandoCameraMyDropsNex = true;
    acaoAoPararGravacaoMyDropsNex = 'editor';
    atualizarUICameraMyDropsNex();

    mediaRecorderMyDropsNex = mimeType
      ? new MediaRecorder(streamCameraMyDropsNex, {
          mimeType,
          videoBitsPerSecond: 4000000,
          audioBitsPerSecond: 128000
        })
      : new MediaRecorder(streamCameraMyDropsNex, {
          videoBitsPerSecond: 4000000,
          audioBitsPerSecond: 128000
        });

    mediaRecorderMyDropsNex.ondataavailable = (evento) => {
      if (evento.data && evento.data.size > 0) {
        chunksCameraMyDropsNex.push(evento.data);
      }
    };

    mediaRecorderMyDropsNex.onstop = () => {
      if (timerCameraMyDropsNex) {
        clearInterval(timerCameraMyDropsNex);
        timerCameraMyDropsNex = null;
      }

      gravandoCameraMyDropsNex = false;
      atualizarUICameraMyDropsNex();

      if (acaoAoPararGravacaoMyDropsNex !== 'editor') {
        acaoAoPararGravacaoMyDropsNex = 'editor';
        chunksCameraMyDropsNex = [];
        return;
      }

      const blob = new Blob(chunksCameraMyDropsNex, {
        type: mediaRecorderMyDropsNex?.mimeType || 'video/webm'
      });

      if (window.urlVideoGravadoMyDropsNex) {
        URL.revokeObjectURL(window.urlVideoGravadoMyDropsNex);
      }

      window.videoGravadoMyDropsNex = blob;
      window.urlVideoGravadoMyDropsNex = URL.createObjectURL(blob);

      chunksCameraMyDropsNex = [];

      pararStreamCameraMyDropsNex();

      const overlay = document.getElementById('cameraMyDropsOverlayNex');
      if (overlay) overlay.style.display = 'none';

      abrirEditorVideoMyDropsNex();
    };

    mediaRecorderMyDropsNex.start();

    timerCameraMyDropsNex = setInterval(() => {
      tempoCameraMyDropsNex += 1;
      atualizarUICameraMyDropsNex();

      if (tempoCameraMyDropsNex >= Drops.LIMITES.CAMERA_VIDEO) {
        pararGravacaoMyDropsNex('editor');
      }
    }, 1000);
  } catch (erro) {
    console.error('Erro ao iniciar gravação:', erro);
    gravandoCameraMyDropsNex = false;
    atualizarUICameraMyDropsNex();
    alert('Não foi possível iniciar a gravação.');
  }
}

function pararGravacaoMyDropsNex(acao = 'editor') {
  if (!gravandoCameraMyDropsNex || !mediaRecorderMyDropsNex) return;

  acaoAoPararGravacaoMyDropsNex = acao;
  gravandoCameraMyDropsNex = false;
  atualizarUICameraMyDropsNex();

  if (timerCameraMyDropsNex) {
    clearInterval(timerCameraMyDropsNex);
    timerCameraMyDropsNex = null;
  }

  if (mediaRecorderMyDropsNex.state !== 'inactive') {
    mediaRecorderMyDropsNex.stop();
  }
}

async function alternarCameraMyDropsNex() {
  const estavaGravando = gravandoCameraMyDropsNex;

  if (estavaGravando) {
    pararGravacaoMyDropsNex('switch');

    setTimeout(async () => {
      cameraFrontalMyDropsNex = !cameraFrontalMyDropsNex;
      await abrirStreamCameraMyDropsNex();
    }, 250);

    return;
  }

  cameraFrontalMyDropsNex = !cameraFrontalMyDropsNex;
  await abrirStreamCameraMyDropsNex();
}

function fecharCameraMyDrops() {
  if (gravandoCameraMyDropsNex) {
    pararGravacaoMyDropsNex('close');
  }

  pararStreamCameraMyDropsNex();

  const overlay = document.getElementById('cameraMyDropsOverlayNex');
  if (overlay) overlay.style.display = 'none';

  tempoCameraMyDropsNex = 0;
  atualizarUICameraMyDropsNex();
}

async function abrirCameraMyDrops() {
  limparCamadasTextoMyDropsNex();

  if (typeof window.fecharEditorVideoMyDropsNex === 'function') {
    window.fecharEditorVideoMyDropsNex();
  }

  const abriu = await abrirStreamCameraMyDropsNex();
  if (!abriu) return;

  tempoCameraMyDropsNex = 0;
  atualizarUICameraMyDropsNex();
}

// ============================================
// CÂMERA DE FOTO
// ============================================

let streamFotoMyDropsNex = null;
let cameraFrontalFotoMyDropsNex = false;

function pararStreamFotoMyDropsNex() {
  if (streamFotoMyDropsNex) {
    streamFotoMyDropsNex.getTracks().forEach((track) => track.stop());
    streamFotoMyDropsNex = null;
  }

  const video = document.getElementById('cameraFotoMyDropsPreviewNex');
  if (video) video.srcObject = null;
}

function criarOverlayFotoMyDropsNex() {
  if (document.getElementById('cameraFotoMyDropsOverlayNex')) return;

  const overlay = document.createElement('div');
  overlay.id = 'cameraFotoMyDropsOverlayNex';

  overlay.innerHTML = `
    <video id="cameraFotoMyDropsPreviewNex" autoplay playsinline muted></video>

    <button type="button" id="cameraFotoMyDropsSwitchNex">🔄</button>

    <button type="button" id="cameraFotoMyDropsCaptureNex"></button>

    <button type="button" id="cameraFotoMyDropsCloseNex">Sair ➜</button>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#cameraFotoMyDropsSwitchNex')?.addEventListener('click', alternarCameraFotoMyDropsNex);
  overlay.querySelector('#cameraFotoMyDropsCaptureNex')?.addEventListener('click', capturarFotoMyDropsNex);
  overlay.querySelector('#cameraFotoMyDropsCloseNex')?.addEventListener('click', fecharCameraFotoMyDropsNex);
}

async function abrirStreamFotoMyDropsNex() {
  criarOverlayFotoMyDropsNex();

  const overlay = document.getElementById('cameraFotoMyDropsOverlayNex');
  const video = document.getElementById('cameraFotoMyDropsPreviewNex');

  if (!overlay || !video) return false;

  overlay.style.display = 'flex';

  if (!navigator.mediaDevices?.getUserMedia) {
    alert('Seu aparelho não suporta câmera.');
    overlay.style.display = 'none';
    return false;
  }

  try {
    pararStreamFotoMyDropsNex();

    streamFotoMyDropsNex = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: {
          ideal: cameraFrontalFotoMyDropsNex ? 'user' : 'environment'
        },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 30 }
      },
      audio: false
    });

    video.srcObject = streamFotoMyDropsNex;
    await video.play();
    return true;
  } catch (erro) {
    console.error('Erro ao abrir câmera de foto:', erro);
    overlay.style.display = 'none';
    alert('Não foi possível abrir a câmera.');
    return false;
  }
}

async function abrirCameraFotoMyDropsNex() {
  await abrirStreamFotoMyDropsNex();
}

async function alternarCameraFotoMyDropsNex() {
  cameraFrontalFotoMyDropsNex = !cameraFrontalFotoMyDropsNex;
  await abrirStreamFotoMyDropsNex();
}

function fecharCameraFotoMyDropsNex() {
  pararStreamFotoMyDropsNex();

  const overlay = document.getElementById('cameraFotoMyDropsOverlayNex');
  if (overlay) overlay.style.display = 'none';
}

function capturarFotoMyDropsNex() {
  const video = document.getElementById('cameraFotoMyDropsPreviewNex');
  if (!video || !video.videoWidth || !video.videoHeight) return;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  const dataURL = canvas.toDataURL('image/jpeg', 1.0);

  pararStreamFotoMyDropsNex();

  const overlay = document.getElementById('cameraFotoMyDropsOverlayNex');
  if (overlay) overlay.style.display = 'none';

  abrirEditorFotoMyDropsNex(dataURL);
}

    // ============================================
  // EDITOR DE VÍDEO (gravado)
  // ============================================

  function abrirEditorVideoMyDropsNex() {
    const legendaVideoInput = document.getElementById('legendaVideoMyDropsInput');
    if (legendaVideoInput) {
      legendaVideoInput.value = '';
      const contador = document.getElementById('legendaVideoContadorMyDrops');
      if (contador) contador.textContent = '0/500';
    }
    legendaTemporariaMyDropsNex = '';

    const overlay = document.getElementById('videoEditorMyDropsNex');
    const preview = document.getElementById('videoEditorPreviewMyDropsNex');
    const btnLoop = document.getElementById('videoEditorLoopMyDropsNex');

    if (!overlay || !preview || !window.urlVideoGravadoMyDropsNex) return;

    preview.src = window.urlVideoGravadoMyDropsNex;
    preview.loop = false;
    preview.muted = false;
    preview.controls = true;

    loopVideoMyDropsNex = false;

    if (btnLoop) btnLoop.classList.remove('is-active');

    overlay.style.display = 'flex';

    const btnSairNovo = document.getElementById('videoEditorSairMyDropsNex');
    if (btnSairNovo) btnSairNovo.style.display = 'flex';

    preview.play().catch(() => {});
  }

  function fecharEditorVideoMyDropsNex() {
    const overlay = document.getElementById('videoEditorMyDropsNex');
    const preview = document.getElementById('videoEditorPreviewMyDropsNex');
    const btnLoop = document.getElementById('videoEditorLoopMyDropsNex');

    if (preview) {
      preview.pause();
      preview.removeAttribute('src');
      preview.load();
    }

    loopVideoMyDropsNex = false;

    if (btnLoop) btnLoop.classList.remove('is-active');
    if (overlay) overlay.style.display = 'none';

    const btnSairNovo = document.getElementById('videoEditorSairMyDropsNex');
    if (btnSairNovo) btnSairNovo.style.display = 'none';
  }

  function excluirVideoMyDropsNex() {
    if (window.urlVideoGravadoMyDropsNex) {
      URL.revokeObjectURL(window.urlVideoGravadoMyDropsNex);
    }

    window.videoGravadoMyDropsNex = null;
    window.urlVideoGravadoMyDropsNex = null;

    limparCamadasTextoMyDropsNex();
    fecharEditorVideoMyDropsNex();
  }

  // ============================================
  // LOOP DO VÍDEO NO EDITOR
  // ============================================

  function atualizarLoopVideoEditorMyDropsNex(ativo) {
    loopVideoMyDropsNex = ativo;

    const overlay = document.getElementById('videoEditorMyDropsNex');
    const preview = document.getElementById('videoEditorPreviewMyDropsNex');
    const btnLoopDrops = document.getElementById('fotoEditorLoopMyDropsNex');
    const btnLoopPreview = document.getElementById('videoEditorLoopMyDropsNex');

    const editorVideoAberto =
      !!overlay && getComputedStyle(overlay).display !== 'none' && !!preview;

    if (editorVideoAberto) {
      if (btnLoopPreview) {
        btnLoopPreview.classList.toggle('is-active', ativo);
      }

      if (btnLoopDrops) {
        btnLoopDrops.classList.remove('is-active');
        btnLoopDrops.style.display = 'none';
      }

      preview.loop = ativo;

      if (ativo) {
        preview.muted = true;
        preview.defaultMuted = true;
        preview.volume = 0;
        preview.controls = true;
        preview.play().catch(() => {});
      } else {
        preview.muted = false;
        preview.defaultMuted = false;
        preview.volume = 1;
        preview.controls = true;
        preview.play().catch(() => {});
      }

      return;
    }

    const item = itemSelecionadoMyDropsNex;
    const videoSelecionado = !!(
      item && item.classList.contains('video-editor-video-mydrops-nex')
    );

    if (videoSelecionado) {
      if (btnLoopDrops) {
        btnLoopDrops.style.display = 'block';
        btnLoopDrops.classList.toggle('is-active', ativo);
      }

      if (btnLoopPreview) {
        btnLoopPreview.classList.remove('is-active');
      }

      item.dataset.loop = ativo ? '1' : '0';

      const video = item.querySelector('video');
      const barra = item.querySelector('.video-editor-video-progress-mydrops-nex');
      const tempo = item.querySelector('.video-editor-video-time-mydrops-nex');
      const play = item.querySelector('.video-editor-video-play-mydrops-nex');

      if (video) {
        video.loop = ativo;

        if (barra) barra.style.display = ativo ? 'none' : '';
        if (tempo) tempo.style.display = ativo ? 'none' : '';
        if (play) play.style.display = ativo ? 'none' : '';

        video.muted = ativo;
        video.defaultMuted = ativo;
        video.volume = ativo ? 0 : 1;

        if (ativo) {
          video.setAttribute('muted', '');
        } else {
          video.removeAttribute('muted');
        }

        video.play().catch(() => {});
      }

      return;
    }

    if (btnLoopDrops) {
      btnLoopDrops.style.display = 'none';
      btnLoopDrops.classList.remove('is-active');
    }

    if (btnLoopPreview) {
      btnLoopPreview.classList.toggle('is-active', ativo);
    }
  }

  // ============================================
  // MODAL DE FUNDO
  // ============================================

  let fundoSelecionadoMyDropsNex = null;
  let fundoTipoMyDropsNex = null;

  function abrirModalFundoMyDropsNex() {
    const modal = document.getElementById('modalFundoMyDropsNex');
    if (!modal) return;

    fundoSelecionadoMyDropsNex = null;
    fundoTipoMyDropsNex = null;

    document.getElementById('fundoPaletaCores').style.display = 'none';
    document.getElementById('fundoGaleriaPreview').style.display = 'none';

    document.getElementById('fundoGaleriaVazio').style.display = 'block';
    document.getElementById('fundoGaleriaPreviewImg').style.display = 'none';
    document.getElementById('fundoPreviewImagem').src = '';

    document.querySelectorAll('.fundo-cor').forEach((el) => {
      el.classList.remove('selecionada');
    });

    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }

  function fecharModalFundoMyDropsNex() {
    const modal = document.getElementById('modalFundoMyDropsNex');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
    fundoSelecionadoMyDropsNex = null;
    fundoTipoMyDropsNex = null;
  }

  function aplicarFundoMyDropsNex() {
    const preview = document.getElementById('fotoEditorPreviewMyDropsNex');
    const stage = document.getElementById('fotoEditorStageMyDropsNex');

    if (!preview || !stage) return;

    if (fundoTipoMyDropsNex === 'cor' && fundoSelecionadoMyDropsNex) {
      preview.style.setProperty('background-color', fundoSelecionadoMyDropsNex, 'important');
      preview.style.setProperty('background-image', 'none', 'important');
      preview.style.backgroundSize = 'cover';
      preview.style.backgroundPosition = 'center';
      preview.style.backgroundRepeat = 'no-repeat';

      stage.style.setProperty('background-color', fundoSelecionadoMyDropsNex, 'important');
      stage.style.setProperty('background-image', 'none', 'important');
    } else if (fundoTipoMyDropsNex === 'imagem' && fundoSelecionadoMyDropsNex) {
      preview.style.setProperty('background-image', `url('${fundoSelecionadoMyDropsNex}')`, 'important');
      preview.style.backgroundSize = 'cover';
      preview.style.backgroundPosition = 'center';
      preview.style.backgroundRepeat = 'no-repeat';
      preview.style.setProperty('background-color', '#000', 'important');

      stage.style.setProperty('background-image', `url('${fundoSelecionadoMyDropsNex}')`, 'important');
      stage.style.backgroundSize = 'cover';
      stage.style.backgroundPosition = 'center';
      stage.style.backgroundRepeat = 'no-repeat';
      stage.style.setProperty('background-color', '#000', 'important');
    } else {
      return;
    }

    fecharModalFundoMyDropsNex();
  }

  // ============================================
  // BOTÃO AJUSTAR (toggle cover/contain)
  // ============================================

  let ajustarAtivo = false;

  function toggleAjustarFoto() {
    const preview = document.getElementById('fotoEditorPreviewMyDropsNex');
    const btn = document.getElementById('fotoEditorAjustarMyDropsNex');

    if (!preview || !btn) return;

    ajustarAtivo = !ajustarAtivo;

    if (ajustarAtivo) {
      preview.style.backgroundSize = 'cover';
      btn.classList.remove('inativo');
      btn.classList.add('ativo');
    } else {
      preview.style.backgroundSize = 'contain';
      btn.classList.remove('ativo');
      btn.classList.add('inativo');
    }
  }

  function setupAjustarDrag() {
    const btn = document.getElementById('fotoEditorAjustarMyDropsNex');
    if (!btn) return;

    let startX = 0;
    let isDragging = false;

    btn.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      isDragging = true;
      btn.setPointerCapture(e.pointerId);
    });

    btn.addEventListener('pointermove', (e) => {
      if (!isDragging) return;

      const diff = e.clientX - startX;

      if (diff > 30 && !ajustarAtivo) {
        toggleAjustarFoto();
        isDragging = false;
        btn.releasePointerCapture(e.pointerId);
        return;
      }

      if (diff < -30 && ajustarAtivo) {
        toggleAjustarFoto();
        isDragging = false;
        btn.releasePointerCapture(e.pointerId);
        return;
      }
    });

    btn.addEventListener('pointerup', (e) => {
      isDragging = false;
      try { btn.releasePointerCapture(e.pointerId); } catch (_) {}
    });

    btn.addEventListener('pointercancel', (e) => {
      isDragging = false;
      try { btn.releasePointerCapture(e.pointerId); } catch (_) {}
    });

    btn.addEventListener('click', () => {
      if (isDragging) return;
      toggleAjustarFoto();
    });
  }

  function conectarBotaoAjustar() {
    const btn = document.getElementById('fotoEditorAjustarMyDropsNex');
    if (!btn) return;

    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);

    ajustarAtivo = false;
    novoBtn.classList.add('inativo');
    novoBtn.classList.remove('ativo');

    novoBtn.innerHTML = 'Ajustar';

    const toggle = document.createElement('span');
    toggle.className = 'ajustar-toggle';
    novoBtn.appendChild(toggle);

    setupAjustarDrag();
  }

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  // Editor foto
  window.abrirEditorFotoMyDropsNex = abrirEditorFotoMyDropsNex;

  // Textos
  window.criarTextoMyDropsNex = criarTextoMyDropsNex;
  window.aplicarTemaTextoMyDropsNex = aplicarTemaTextoMyDropsNex;
  window.aplicarTemaNoTextoSelecionadoMyDropsNex =
    aplicarTemaNoTextoSelecionadoMyDropsNex;
  window.limparTemaTextoMyDropsNex = limparTemaTextoMyDropsNex;
  window.selecionarTextoMyDropsNex = selecionarTextoMyDropsNex;
  window.desselecionarTextoMyDropsNex = desselecionarTextoMyDropsNex;
  window.limparSelecaoEditavelMyDropsNex = limparSelecaoEditavelMyDropsNex;
  window.editarTextoInlineMyDropsNex = editarTextoInlineMyDropsNex;
  window.finalizarEdicaoInlineMyDropsNex = finalizarEdicaoInlineMyDropsNex;

  // Fotos/vídeos
  window.selecionarFotoMyDropsNex = selecionarFotoMyDropsNex;
  window.selecionarVideoMyDropsNex = selecionarVideoMyDropsNex;
  window.criarFotoEditavelMyDropsNex = criarFotoEditavelMyDropsNex;
  window.criarVideoEditavelMyDropsNex = criarVideoEditavelMyDropsNex;
  window.limparVideoEditavelMyDropsNex = limparVideoEditavelMyDropsNex;
  window.atualizarTransformacaoItemMyDropsNex =
    atualizarTransformacaoItemMyDropsNex;
  window.limparCamadasTextoMyDropsNex = limparCamadasTextoMyDropsNex;
  window.obterCamadaTextoAtivaMyDropsNex = obterCamadaTextoAtivaMyDropsNex;

  // Controles
  window.garantirLixeiraMyDropsNex = garantirLixeiraMyDropsNex;
  window.criarAlcasMyDropsNex = criarAlcasMyDropsNex;
  window.removerAlcasMyDropsNex = removerAlcasMyDropsNex;

  // Modal de fundo
  window.abrirModalFundoMyDropsNex = abrirModalFundoMyDropsNex;
  window.fecharModalFundoMyDropsNex = fecharModalFundoMyDropsNex;
  window.aplicarFundoMyDropsNex = aplicarFundoMyDropsNex;

  // Ajustar
  window.toggleAjustarFoto = toggleAjustarFoto;
  window.conectarBotaoAjustar = conectarBotaoAjustar;

  // Câmera de vídeo
  window.abrirCameraMyDrops = abrirCameraMyDrops;
  window.fecharCameraMyDrops = fecharCameraMyDrops;
  window.alternarCameraMyDropsNex = alternarCameraMyDropsNex;
  window.iniciarGravacaoMyDropsNex = iniciarGravacaoMyDropsNex;
  window.pararGravacaoMyDropsNex = pararGravacaoMyDropsNex;
  window.atualizarUICameraMyDropsNex = atualizarUICameraMyDropsNex;
  window.pararStreamCameraMyDropsNex = pararStreamCameraMyDropsNex;
  window.abrirStreamCameraMyDropsNex = abrirStreamCameraMyDropsNex;
  window.obterMimeTypeVideoMyDropsNex = obterMimeTypeVideoMyDropsNex;

  // Câmera de foto
  window.abrirCameraFotoMyDropsNex = abrirCameraFotoMyDropsNex;
  window.fecharCameraFotoMyDropsNex = fecharCameraFotoMyDropsNex;
  window.alternarCameraFotoMyDropsNex = alternarCameraFotoMyDropsNex;
  window.capturarFotoMyDropsNex = capturarFotoMyDropsNex;
  window.abrirStreamFotoMyDropsNex = abrirStreamFotoMyDropsNex;
  window.pararStreamFotoMyDropsNex = pararStreamFotoMyDropsNex;

  // Editor de vídeo
  window.abrirEditorVideoMyDropsNex = abrirEditorVideoMyDropsNex;
  window.fecharEditorVideoMyDropsNex = fecharEditorVideoMyDropsNex;
  window.excluirVideoMyDropsNex = excluirVideoMyDropsNex;
  window.atualizarLoopVideoEditorMyDropsNex = atualizarLoopVideoEditorMyDropsNex;

  // ============================================
  // INICIALIZAÇÃO (DOMContentLoaded)
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    // Botões da câmera
    document.getElementById('cameraMyDropsRecordNex')?.addEventListener('click', async () => {
      if (gravandoCameraMyDropsNex) {
        pararGravacaoMyDropsNex('editor');
      } else {
        await iniciarGravacaoMyDropsNex();
      }
    });

    document.getElementById('cameraMyDropsSwitchNex')?.addEventListener('click', alternarCameraMyDropsNex);

    // Botão sair no editor de vídeo
    document.getElementById('videoEditorSairMyDropsNex')?.addEventListener('click', () => {
      if (window.urlVideoGravadoMyDropsNex) {
        excluirVideoMyDropsNex();
      } else {
        fecharCameraMyDrops();
      }

      const myDropsScreen = document.getElementById('mydrops');
      if (myDropsScreen) mostrarTela('mydrops', 0);
    });

    // Publicar vídeo
    document.getElementById('videoEditorPublishMyDropsNex')?.addEventListener('click', () => {
      const legendaVideoInput = document.getElementById('legendaVideoMyDropsInput');
      if (legendaVideoInput) {
        legendaTemporariaMyDropsNex = legendaVideoInput.value.trim();
      }
      abrirModalDuracaoPublicacaoMyDropsNex('video');
    });

    // Loop no editor de vídeo
    document.getElementById('videoEditorLoopMyDropsNex')?.addEventListener('click', () => {
      atualizarLoopVideoEditorMyDropsNex(!loopVideoMyDropsNex);
    });

    // ============================================
    // MODAL DE FUNDO — EVENTOS
    // ============================================

    document.getElementById('fundoCoresBtn')?.addEventListener('click', () => {
      document.getElementById('fundoPaletaCores').style.display = 'block';
      document.getElementById('fundoGaleriaPreview').style.display = 'none';
    });

    document.getElementById('fundoGaleriaBtn')?.addEventListener('click', () => {
      document.getElementById('fundoGaleriaPreview').style.display = 'block';
      document.getElementById('fundoPaletaCores').style.display = 'none';
      document.getElementById('fundoGaleriaInput')?.click();
    });

    document.querySelectorAll('.fundo-cor').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.fundo-cor').forEach((el) => {
          el.classList.remove('selecionada');
        });
        btn.classList.add('selecionada');
        fundoSelecionadoMyDropsNex = btn.dataset.cor;
        fundoTipoMyDropsNex = 'cor';
      });
    });

    document.getElementById('fundoColorPicker')?.addEventListener('input', (e) => {
      const cor = e.target.value;
      document.querySelectorAll('.fundo-cor').forEach((el) => {
        el.classList.remove('selecionada');
      });
      fundoSelecionadoMyDropsNex = cor;
      fundoTipoMyDropsNex = 'cor';
    });

    document.getElementById('fundoGaleriaInput')?.addEventListener('change', (e) => {
      const arquivo = (e.target.files || [])[0];
      if (!arquivo) return;

      const leitor = new FileReader();
      leitor.onload = function (evt) {
        const dataURL = evt.target.result;
        fundoSelecionadoMyDropsNex = dataURL;
        fundoTipoMyDropsNex = 'imagem';

        document.getElementById('fundoGaleriaVazio').style.display = 'none';
        document.getElementById('fundoGaleriaPreviewImg').style.display = 'block';
        document.getElementById('fundoPreviewImagem').src = dataURL;
      };
      leitor.readAsDataURL(arquivo);
      e.target.value = '';
    });

    document.getElementById('fundoRemoverImagem')?.addEventListener('click', () => {
      fundoSelecionadoMyDropsNex = null;
      fundoTipoMyDropsNex = null;
      document.getElementById('fundoGaleriaVazio').style.display = 'block';
      document.getElementById('fundoGaleriaPreviewImg').style.display = 'none';
      document.getElementById('fundoPreviewImagem').src = '';
    });

    document.getElementById('fundoCancelarBtn')?.addEventListener('click', fecharModalFundoMyDropsNex);
    document.getElementById('fundoAplicarBtn')?.addEventListener('click', aplicarFundoMyDropsNex);

    document.getElementById('modalFundoMyDropsNex')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) fecharModalFundoMyDropsNex();
    });

    // Botão Ver Mais do visualizador
    document.addEventListener(
      'click',
      (e) => {
        const btnVerMais = e.target.closest('.mydrops-viewer-ver-mais');
        if (!btnVerMais) return;

        e.preventDefault();
        e.stopPropagation();

        const legendaDiv = btnVerMais.closest('.mydrops-viewer-legenda');
        if (!legendaDiv) return;

        const textoEl = legendaDiv.querySelector(
          '.mydrops-viewer-legenda-texto'
        );
        if (!textoEl) return;

        const estaExpandido = btnVerMais.dataset.expandido === 'true';
        const textoCompleto = textoEl.dataset.completo || '';
        const textoLimitado = textoEl.dataset.limitado || '';

        if (estaExpandido) {
          textoEl.textContent = textoLimitado;
          btnVerMais.textContent = 'Ver mais';
          btnVerMais.dataset.expandido = 'false';
          textoEl.dataset.expandido = 'false';
        } else {
          textoEl.textContent = textoCompleto;
          btnVerMais.textContent = 'Ver menos';
          btnVerMais.dataset.expandido = 'true';
          textoEl.dataset.expandido = 'true';
        }
      },
      true
    );
  });
  

  // ============================================
  // DEBUG
  // ============================================

  console.log('🎬 13-editor.js carregado');

})();

