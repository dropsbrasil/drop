/* ============================================
   07-NEX-ALBUM.JS
   Visualizador de mídia, reações e comentários em mídia
============================================ */

(function () {
  'use strict';

  // ============================================
  // ESTADO DO VIEWER
  // ============================================

  let midiasViewerAtualNex = [];
  let midiaViewerIndexNex = 0;
  let viewerContextoNex = null; // { mensagemId, midiaIndex }

  // ============================================
  // ABRIR VIEWER DE MÍDIAS
  // ============================================

  function abrirVisualizadorMidiasNex(
    lista,
    indexInicial = 0,
    mostrarComentario = true,
    contexto = null
  ) {
    midiasViewerAtualNex = Array.isArray(lista) ? lista : [];
    viewerContextoNex = contexto || null;

    midiaViewerIndexNex = Math.max(
      0,
      Math.min(indexInicial, midiasViewerAtualNex.length - 1)
    );

    const antigo = document.querySelector('.nex-midia-viewer');
    if (antigo) antigo.remove();

    if (!midiasViewerAtualNex.length) return;

    const totalMidias = midiasViewerAtualNex.length;
    const mostrarContador = totalMidias > 1;

    const viewer = document.createElement('div');
    viewer.className = 'nex-midia-viewer';

    viewer.innerHTML = `
      <div class="viewer-bg" id="viewerBgNex"></div>

      <div class="viewer-topbar">
  <button class="viewer-close" type="button" aria-label="Fechar">✕</button>
</div>

<div class="viewer-media" id="viewerMediaNex"></div>

<div class="viewer-reaction-badge" id="viewerReactionBadgeNex" style="display:none;">
  <span id="viewerReactionEmojiNex"></span>
  <span id="viewerReactionCountNex"></span>
</div>

<button type="button" class="viewer-save-btn" id="viewerSaveBtnNex" style="display: none;">
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
  Salvar
</button>

<div class="toast-expira-nex" id="toastExpiraNex">
  ⏳ Esta mídia expira em 24h. Salve na galeria se quiser guardar.
</div>

      ${mostrarContador
        ? `
        <button class="viewer-arrow viewer-arrow-left" type="button" aria-label="Anterior">‹</button>
        <button class="viewer-arrow viewer-arrow-right" type="button" aria-label="Próxima">›</button>
      `
        : ''
      }
      
     ${mostrarComentario
        ? `
  <div class="viewer-comment-box">
    <textarea
      class="viewer-comment-input"
      id="viewerCommentInputNex"
      placeholder="Escreva um comentário..."></textarea>

    <button
      type="button"
      class="viewer-reaction viewer-reaction-heart"
      data-reacao="heart"
      aria-label="Reagir com coração">❤️</button>

    <button
      type="button"
      class="viewer-reaction viewer-reaction-broken"
      data-reacao="broken"
      aria-label="Reagir com coração partido">💔</button>

    <button
      type="button"
      class="viewer-comment-send"
      id="viewerCommentSendNex"
      disabled>
      ᯓ➤
    </button>
  </div>
`
        : ''
      } 
    `;

    document.body.appendChild(viewer);

    if (typeof window.dropsEmpilharEstado === 'function') {
      window.dropsEmpilharEstado('viewer-midia', null);
    }
    // ============================================
// BOTÃO FECHAR
// ============================================

viewer.querySelector('.viewer-close').onclick = () => {
  viewer.remove();
  viewerContextoNex = null;
};

// ============================================
// BOTÃO SALVAR + TOAST
// ============================================
// (Sem bloqueio — salvar é download, não comunicação)

const btnSalvar = viewer.querySelector('#viewerSaveBtnNex');
const toastExpira = viewer.querySelector('#toastExpiraNex');

const midiaAtual = midiasViewerAtualNex[midiaViewerIndexNex];

if (midiaAtual && midiaAtual.url && btnSalvar && toastExpira) {
  // Chave única para esta mídia específica
  const chaveSalvo = `drop_salvo_${midiaAtual.url}`;
  const jaFoiSalvo = localStorage.getItem(chaveSalvo) === 'true';

  if (!jaFoiSalvo) {
    // Se NUNCA foi salvo, mostra o toast e depois o botão
    toastExpira.classList.add('visivel');

    setTimeout(() => {
      toastExpira.classList.remove('visivel');

      setTimeout(() => {
        btnSalvar.style.display = 'flex';
      }, 300);

    }, 3000);
  } else {
    // Se JÁ FOI SALVO, não mostra nada (nem toast, nem botão)
    toastExpira.classList.remove('visivel');
    btnSalvar.style.display = 'none';
  }

  // Ação de salvar na galeria
  btnSalvar.onclick = (e) => {
    e.stopPropagation();

    // Cria o link para download
    const a = document.createElement('a');
    a.href = midiaAtual.url;
    a.download = `Drop_midia_${Date.now()}.${midiaAtual.type === 'video' ? 'mp4' : 'jpg'}`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Marca como salvo no localStorage
    localStorage.setItem(chaveSalvo, 'true');

    // Remove o botão suavemente sem quebrar o layout
    btnSalvar.style.opacity = '0';
    setTimeout(() => {
      btnSalvar.style.display = 'none';
    }, 200);

    window.mostrarToastNex?.('Mídia salva na galeria!', 'sucesso');
  };
}
      // ============================================
  // SETAS DE NAVEGAÇÃO (leitura — sem bloqueio)
  // ============================================

  const leftBtn = viewer.querySelector('.viewer-arrow-left');
  const rightBtn = viewer.querySelector('.viewer-arrow-right');

  if (leftBtn) leftBtn.onclick = () => navegarMidiaViewerNex(-1);
  if (rightBtn) rightBtn.onclick = () => navegarMidiaViewerNex(1);

  // ============================================
  // VERIFICA SE B FOI SILENCIADO POR A
  // ============================================
  // ⚠️ REGRA: mídia do chat NÃO é "publicação". Portanto, se B
  //    foi silenciado por A, B NÃO pode reagir nem comentar
  //    mídias que A mandou no chat direto.

  const conversaAtualViewer = Drops.estado.conversaAtual;

  const estouSilenciadoNoViewer =
    typeof window.checarSeFuiSilenciadoNex === 'function' &&
    window.checarSeFuiSilenciadoNex(conversaAtualViewer);

  // ============================================
  // BOTÕES DE REAÇÃO ❤️/💔
  // ============================================

  viewer.querySelectorAll('.viewer-reaction').forEach((btn) => {
    // ⚠️ Defesa visual: desabilita e deixa opaco se silenciado
    if (estouSilenciadoNoViewer) {
      btn.disabled = true;
      btn.style.opacity = '0.4';
      btn.style.pointerEvents = 'none';
    }

    btn.addEventListener('click', () => {
      // ⚠️ Defesa em profundidade: mesmo que o CSS seja burlado,
      //    não chama a ação
      if (estouSilenciadoNoViewer) {
        window.mostrarToastNex?.(
          'Você está silenciado por este usuário.',
          'erro'
        );
        return;
      }

      const tipo = btn.dataset.reacao;
      acaoReagirMidiaNex(tipo);
    });
  });

  // ============================================
  // INPUT DE COMENTÁRIO + BOTÃO DE ENVIAR
  // ============================================

  const inputComentario = viewer.querySelector('#viewerCommentInputNex');
  const btnEnviar = viewer.querySelector('#viewerCommentSendNex');

  if (inputComentario && btnEnviar) {
    // ⚠️ Se silenciado, bloqueia o input IMEDIATAMENTE
    if (estouSilenciadoNoViewer) {
      inputComentario.disabled = true;
      inputComentario.placeholder = 'Você foi silenciado por este usuário.';
      inputComentario.style.background = '#e2e8f0';
      inputComentario.style.color = '#94a3b8';
      inputComentario.style.cursor = 'not-allowed';

      btnEnviar.disabled = true;
      btnEnviar.style.opacity = '0.4';
      btnEnviar.style.pointerEvents = 'none';
    }

    const atualizarBotao = () => {
      // ⚠️ Se silenciado, mantém sempre desabilitado
      if (estouSilenciadoNoViewer) {
        btnEnviar.disabled = true;
        btnEnviar.classList.remove('is-active');
        return;
      }

      const tem = inputComentario.value.trim().length > 0;
      btnEnviar.disabled = !tem;
      btnEnviar.classList.toggle('is-active', tem);
    };

    inputComentario.addEventListener('input', atualizarBotao);
    atualizarBotao();

    // ⚠️ BOTÃO DE ENVIAR — CLIQUE
    btnEnviar.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // ⚠️ Defesa em profundidade
      if (estouSilenciadoNoViewer) {
        window.mostrarToastNex?.(
          'Você está silenciado por este usuário.',
          'erro'
        );
        return;
      }

      if (btnEnviar.disabled) return;
      acaoEnviarComentarioMidiaNex();
    });

    // Enter envia
    inputComentario.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();

        // ⚠️ Defesa em profundidade
        if (estouSilenciadoNoViewer) {
          window.mostrarToastNex?.(
            'Você está silenciado por este usuário.',
            'erro'
          );
          return;
        }

        if (!btnEnviar.disabled) acaoEnviarComentarioMidiaNex();
      }
    });
  }

  // ============================================
  // SWIPE + RENDER INICIAL (sem bloqueio)
  // ============================================

  configurarSwipeViewerNex(viewer);

  renderMidiaViewerNex();
  }
  // ============================================
// SWIPE (trocar de mídia arrastando)
// ============================================
// (Sem bloqueio — é leitura/navegação)

function configurarSwipeViewerNex(viewer) {
  let startX = 0, startY = 0, startTime = 0, ativo = false;
  const LIMITE = 50;
  const TEMPO = 800;

  viewer.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;

    const alvo = e.target;
    if (
      alvo.closest('.viewer-comment-box') ||
      alvo.closest('.viewer-close') ||
      alvo.closest('.viewer-arrow') ||
      alvo.closest('input') ||
      alvo.closest('textarea') ||
      alvo.closest('video')
    ) {
      ativo = false;
      return;
    }

    ativo = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });

  viewer.addEventListener('touchend', (e) => {
    if (!ativo) return;
    ativo = false;
    if (!e.changedTouches || !e.changedTouches.length) return;

    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    const dt = Date.now() - startTime;

    if (dt > TEMPO) return;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX > LIMITE && absX > absY * 1.3) {
      if (dx < 0) navegarMidiaViewerNex(1);
      else navegarMidiaViewerNex(-1);
    }
  }, { passive: true });
}

// ============================================
// NAVEGAR ENTRE MÍDIAS DO ÁLBUM
// ============================================
// (Sem bloqueio — é leitura/navegação)

function navegarMidiaViewerNex(direcao) {
  if (!Array.isArray(midiasViewerAtualNex) || !midiasViewerAtualNex.length) {
    return;
  }

  const novoIndice = midiaViewerIndexNex + direcao;

  if (novoIndice < 0 || novoIndice >= midiasViewerAtualNex.length) return;

  midiaViewerIndexNex = novoIndice;

  // Atualiza contexto do viewer
  if (viewerContextoNex) {
    viewerContextoNex.midiaIndex = novoIndice;
  }

  renderMidiaViewerNex();
}

// ============================================
// RENDERIZAR MÍDIA ATUAL NO VIEWER
// ============================================
// (Sem bloqueio — é leitura/renderização)

async function renderMidiaViewerNex() {
  const viewer = document.querySelector('.nex-midia-viewer');
  if (!viewer) return;

  const midia = midiasViewerAtualNex[midiaViewerIndexNex];
  if (!midia) {
    viewer.remove();
    return;
  }

  const counter = viewer.querySelector('#viewerCounterNex');
  const media = viewer.querySelector('#viewerMediaNex');
  const leftBtn = viewer.querySelector('.viewer-arrow-left');
  const rightBtn = viewer.querySelector('.viewer-arrow-right');

  if (counter) {
    counter.innerText = `${midiaViewerIndexNex + 1} / ${midiasViewerAtualNex.length}`;
  }

  if (media) {
    const url = String(midia.url || '');
    const tipo = String(midia.type || midia.tipo || '').toLowerCase();

    const ehVideo =
      tipo.includes('video') ||
      /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

    const bg = viewer.querySelector('#viewerBgNex');
    if (bg) {
      bg.style.backgroundImage = ehVideo ? 'none' : `url("${url}")`;
    }

    // ⚠️ Garante que a área da mídia ocupe a tela toda e centralize a foto
    const mediaContainer = viewer.querySelector('#viewerMediaNex');
    if (mediaContainer) {
      mediaContainer.style.paddingBottom = '0';
      mediaContainer.style.height = '100vh';
      mediaContainer.style.display = 'flex';
      mediaContainer.style.alignItems = 'center';
      mediaContainer.style.justifyContent = 'center';
    }

    media.innerHTML = '';

    if (ehVideo) {
      const video = document.createElement('video');
      video.src = url;
      video.controls = true;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.className = 'viewer-element';

      video.onerror = () => {
        media.innerHTML =
          '<div class="viewer-erro">Não foi possível abrir este vídeo.</div>';
      };

      media.appendChild(video);
      video.load();
    } else {
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.className = 'viewer-element';

      img.onerror = () => {
        media.innerHTML =
          '<div class="viewer-erro">Não foi possível abrir esta mídia.</div>';
      };

      media.appendChild(img);
    }
  }
    // Atualiza botões de reação
  await atualizarBotoesReacaoViewerNex();

  // Atualiza setas
  if (leftBtn) leftBtn.disabled = midiaViewerIndexNex === 0;
  if (rightBtn) {
    rightBtn.disabled = midiaViewerIndexNex >= midiasViewerAtualNex.length - 1;
  }
}

// ============================================
// ATUALIZAR BOTÕES DE REAÇÃO NO VIEWER
// ============================================
// (Sem bloqueio — apenas busca as reações e atualiza o visual)

async function atualizarBotoesReacaoViewerNex() {
  const viewer = document.querySelector('.nex-midia-viewer');
  if (!viewer) return;

  if (!viewerContextoNex || !viewerContextoNex.mensagemId) return;

  const { mensagemId, midiaIndex } = viewerContextoNex;

  if (typeof window.buscarReacoesMidiaNex !== 'function') return;

  const reacoes = await window.buscarReacoesMidiaNex(mensagemId, midiaIndex);

  // Atualiza botões
  viewer.querySelectorAll('.viewer-reaction').forEach((btn) => {
    const tipo = btn.dataset.reacao;
    const ativo = reacoes.minhaReacao === tipo;
    btn.classList.toggle('ativo', ativo);

    // Remove contador antigo
    const contAntigo = btn.querySelector('.viewer-reaction-count');
    if (contAntigo) contAntigo.remove();

    // Adiciona contador se > 0
    const total = tipo === 'heart' ? reacoes.heart : reacoes.broken;
    if (total > 0) {
      const span = document.createElement('span');
      span.className = 'viewer-reaction-count';
      span.textContent = String(total);
      btn.appendChild(span);
    }
  });

  // Badge no centro (canto inferior da mídia)
  const badge = viewer.querySelector('#viewerReactionBadgeNex');
  const badgeEmoji = viewer.querySelector('#viewerReactionEmojiNex');
  const badgeCount = viewer.querySelector('#viewerReactionCountNex');

  if (badge && badgeEmoji && badgeCount) {
    const temAlguma = (reacoes.heart + reacoes.broken) > 0;

    if (temAlguma && reacoes.minhaReacao) {
      badgeEmoji.textContent = reacoes.minhaReacao === 'heart' ? '❤️' : '💔';
      badgeCount.textContent = String(
        reacoes.minhaReacao === 'heart' ? reacoes.heart : reacoes.broken
      );
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

// ============================================
// AÇÃO: REAGIR
// ============================================
// ⚠️ BLOQUEIO DE SILENCIAMENTO: mídia do chat NÃO é "publicação".
//    Se B foi silenciado por A, B NÃO pode reagir em mídias que
//    A mandou no chat direto.
//
//    ⚠️ Esse bloqueio NÃO afeta reação em mídia de DROP (isso
//    está no 11-nearby.js e continua liberado).

async function acaoReagirMidiaNex(tipo) {
  if (!viewerContextoNex || !viewerContextoNex.mensagemId) {
    window.mostrarToastNex?.('Mídia sem ID. Envie uma nova.', 'info');
    return;
  }

  // ⚠️ DEFESA EM PROFUNDIDADE: bloqueia se silenciado
  const conversaAtual = Drops.estado.conversaAtual;
  if (
    typeof window.checarSeFuiSilenciadoNex === 'function' &&
    window.checarSeFuiSilenciadoNex(conversaAtual)
  ) {
    window.mostrarToastNex?.(
      'Você está silenciado por este usuário.',
      'erro'
    );
    return;
  }

  const { mensagemId, midiaIndex } = viewerContextoNex;

  // ⚠️ Só funciona com UUID do Supabase
  const ehUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mensagemId);

  if (!ehUUID) {
    window.mostrarToastNex?.('Mídia antiga. Envie uma nova pra reagir.', 'info');
    return;
  }

  if (typeof window.alternarReacaoMidiaNex !== 'function') {
    window.mostrarToastNex?.('Sistema indisponível.', 'erro');
    return;
  }

  // ⚠️ FEEDBACK: vibra + toca ao reagir
  if (typeof window.feedbackNex?.reagiu === 'function') {
    window.feedbackNex.reagiu();
  }

  // ⚠️ Não mostra toast — deixa o 26-reacoes-midia mostrar o erro real
  await window.alternarReacaoMidiaNex(mensagemId, midiaIndex, tipo);

  await atualizarBotoesReacaoViewerNex();

  if (typeof window.atualizarBadgeReacaoMidiaNex === 'function') {
    window.atualizarBadgeReacaoMidiaNex(mensagemId, midiaIndex);
  }
}
    // ============================================
// ABRIR MÍDIA ÚNICA
// ============================================
// (Sem bloqueio — é leitura/visualização)

function abrirMidiaChatNex(url, tipo, contexto = null) {
  abrirVisualizadorMidiasNex(
    [{ url, type: tipo === 'video' ? 'video' : 'imagem' }],
    0,
    true,
    contexto
  );
}

// ============================================
// ABRIR ÁLBUM DE FOTOS
// ============================================
// (Sem bloqueio — é leitura/visualização)

function abrirFotosViewerNex(listaEncoded, contexto = null) {
  let lista = [];

  try {
    lista = Array.isArray(listaEncoded)
      ? listaEncoded
      : JSON.parse(decodeURIComponent(listaEncoded || '[]'));
  } catch (erro) {
    console.warn('Erro ao abrir álbum:', erro);
    return;
  }

  const midias = normalizarAlbumNex(lista);
  if (!midias.length) return;

  abrirVisualizadorMidiasNex(midias, 0, true, contexto);
}

function abrirMidiasChatNex(listaEncoded) {
  abrirFotosViewerNex(listaEncoded);
}

// ============================================
// ENVIAR COMENTÁRIO (vira reply da mídia)
// ============================================
// ⚠️ BLOQUEIO DE SILENCIAMENTO: comentar dentro do viewer é
//    mandar mensagem de texto pra A. Se B foi silenciado por A,
//    B NÃO pode comentar mídia do chat.

async function acaoEnviarComentarioMidiaNex() {
  const viewer = document.querySelector('.nex-midia-viewer');
  if (!viewer || !Drops.estado.conversaAtual) return;

  // ⚠️ DEFESA EM PROFUNDIDADE: bloqueia se silenciado
  const conversaAtual = Drops.estado.conversaAtual;

  if (
    typeof window.checarSeFuiSilenciadoNex === 'function' &&
    window.checarSeFuiSilenciadoNex(conversaAtual)
  ) {
    window.mostrarToastNex?.(
      'Você está silenciado por este usuário.',
      'erro'
    );
    return;
  }

  const input = viewer.querySelector('#viewerCommentInputNex');
  const texto = input ? input.value.trim() : '';
  const midia = midiasViewerAtualNex[midiaViewerIndexNex];

  if (!texto || !midia) return;

  if (!conversas[conversaAtual]) {
    conversas[conversaAtual] = [];
  }

  // ⚠️ Monta o reply apontando pra mídia original
  let resposta = null;

  if (viewerContextoNex && viewerContextoNex.mensagemId) {
    const msgs = conversas[conversaAtual] || [];
    const msgOriginal = msgs.find(
      (m) =>
        String(m.id) === String(viewerContextoNex.mensagemId) ||
        String(m._supabaseId) === String(viewerContextoNex.mensagemId)
    );

    if (msgOriginal) {
      resposta = {
        id: msgOriginal._supabaseId || msgOriginal.id,
        nome: msgOriginal.nome || 'Eu',
        texto: msgOriginal.text || '📎 Mídia',
        side: msgOriginal.side || 'left'
      };
    }
  }

  const hora = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const mensagem = {
    id: gerarIdMensagemNex(),
    timestamp: Date.now(),
    side: 'right',
    nome: 'Eu',
    avatar: 'EU',
    data: new Date().toLocaleDateString('pt-BR'),
    hora,
    status: 'enviado',
    text: texto
  };

  if (resposta) mensagem.resposta = resposta;

  // ⚠️ Envia pro Supabase
  const convId =
    window.__convIdsNex && window.__convIdsNex[conversaAtual];

  if (
    convId &&
    typeof window.enviarMensagemSupabase === 'function'
  ) {
    let meta = {};

    if (resposta) {
      meta.resposta_info = {
        id: resposta.id,
        nome: resposta.nome,
        texto: resposta.texto,
        side: resposta.side
      };
    }

    try {
      const msgSupabase = await window.enviarMensagemSupabase({
        conversa_id: convId,
        tipo: 'texto',
        texto: texto,
        media_url: null,
        media_meta: Object.keys(meta).length ? meta : null,
        resposta_a_id: resposta?.id || null
      });

      if (msgSupabase && msgSupabase.id) {
        mensagem._supabaseId = msgSupabase.id;
      }
    } catch (err) {
      console.warn('Erro ao enviar comentário pro Supabase:', err);
    }
  }
    conversas[conversaAtual].push(mensagem);

  input.value = '';
  const btnEnviar = viewer.querySelector('#viewerCommentSendNex');
  if (btnEnviar) {
    btnEnviar.disabled = true;
    btnEnviar.classList.remove('is-active');
  }

  if (typeof window.renderChat === 'function') {
    window.renderChat(conversaAtual);
  }

  // ⚠️ FEEDBACK: só toca (sem vibração) ao comentar
  if (typeof window.feedbackNex?.comentou === 'function') {
    window.feedbackNex.comentou();
  }

  if (typeof window.mostrarToastNex === 'function') {
    window.mostrarToastNex('Comentário enviado!', 'sucesso');
  }
}
    // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.abrirVisualizadorMidiasNex = abrirVisualizadorMidiasNex;
  window.navegarMidiaViewerNex = navegarMidiaViewerNex;
  window.renderMidiaViewerNex = renderMidiaViewerNex;
  window.abrirMidiaChatNex = abrirMidiaChatNex;
  window.abrirFotosViewerNex = abrirFotosViewerNex;
  window.abrirMidiasChatNex = abrirMidiasChatNex;
  window.enviarComentarioMidiaNex = acaoEnviarComentarioMidiaNex;
  window.atualizarBotoesReacaoViewerNex = atualizarBotoesReacaoViewerNex;
  window.acaoReagirMidiaNex = acaoReagirMidiaNex;

  console.log('🖼️ 07-nex-album.js carregado (silenciamento aplicado em reação/comentário de mídia do chat)');

})();