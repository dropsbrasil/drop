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
        <div class="viewer-top-left">
          <div class="viewer-title">Mídias compartilhadas no NEX</div>
          ${mostrarContador ? `<div class="viewer-counter" id="viewerCounterNex"></div>` : ''}
        </div>

        <button class="viewer-close" type="button" aria-label="Voltar">➥</button>
      </div>

      ${
        mostrarContador
          ? `
        <button class="viewer-arrow viewer-arrow-left" type="button" aria-label="Anterior">‹</button>
        <button class="viewer-arrow viewer-arrow-right" type="button" aria-label="Próxima">›</button>
      `
          : ''
      }

      <div class="viewer-card">
        <div class="viewer-media" id="viewerMediaNex"></div>

        <div class="viewer-reaction-badge" id="viewerReactionBadgeNex" style="display:none;">
          <span id="viewerReactionEmojiNex"></span>
          <span id="viewerReactionCountNex"></span>
        </div>

        ${
          mostrarComentario
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
      </div>
    `;

    document.body.appendChild(viewer);

    // Botão fechar
    viewer.querySelector('.viewer-close').onclick = () => {
      viewer.remove();
      viewerContextoNex = null;
    };

    // Setas
    const leftBtn = viewer.querySelector('.viewer-arrow-left');
    const rightBtn = viewer.querySelector('.viewer-arrow-right');

    if (leftBtn) leftBtn.onclick = () => navegarMidiaViewerNex(-1);
    if (rightBtn) rightBtn.onclick = () => navegarMidiaViewerNex(1);

    // Botões de reação
    viewer.querySelectorAll('.viewer-reaction').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tipo = btn.dataset.reacao;
        acaoReagirMidiaNex(tipo);
      });
    });

    // Input de comentário — botão cinza/azul
    const inputComentario = viewer.querySelector('#viewerCommentInputNex');
    const btnEnviar = viewer.querySelector('#viewerCommentSendNex');

    if (inputComentario && btnEnviar) {
  const atualizarBotao = () => {
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
    if (btnEnviar.disabled) return;
    acaoEnviarComentarioMidiaNex();
  });

  // Enter envia
  inputComentario.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!btnEnviar.disabled) acaoEnviarComentarioMidiaNex();
    }
  });
    }

    // Swipe
    configurarSwipeViewerNex(viewer);

    renderMidiaViewerNex();
  }

  // ============================================
  // SWIPE
  // ============================================

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
  // NAVEGAR NO VIEWER
  // ============================================

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
  // RENDERIZAR VIEWER
  // ============================================

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

async function acaoReagirMidiaNex(tipo) {
  if (!viewerContextoNex || !viewerContextoNex.mensagemId) {
    window.mostrarToastNex?.('Mídia sem ID. Envie uma nova.', 'info');
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

  function abrirMidiaChatNex(url, tipo, contexto = null) {
    abrirVisualizadorMidiasNex(
      [{ url, type: tipo === 'video' ? 'video' : 'imagem' }],
      0,
      true,
      contexto
    );
  }

  // ============================================
  // ABRIR ÁLBUM
  // ============================================

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

  async function acaoEnviarComentarioMidiaNex() {
    const viewer = document.querySelector('.nex-midia-viewer');
    if (!viewer || !Drops.estado.conversaAtual) return;

    const input = viewer.querySelector('#viewerCommentInputNex');
    const texto = input ? input.value.trim() : '';
    const midia = midiasViewerAtualNex[midiaViewerIndexNex];

    if (!texto || !midia) return;

    const conversaAtual = Drops.estado.conversaAtual;

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

    if (typeof window.mostrarToastNex === 'function') {
      window.mostrarToastNex('Comentário enviado!', 'sucesso');
    }
  }

  // ============================================
  // EXPÕE
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

  console.log('🖼️ 07-nex-album.js carregado');
})();