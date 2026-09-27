/* ============================================
   07-NEX-ALBUM.JS
   Visualizador de mídia, reações e comentários em mídia
   
   Depende de: 00-config.js, 03-utils.js, 05-nex-chat.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // ESTADO DO VIEWER
  // ============================================

  let midiasViewerAtualNex = [];
  let midiaViewerIndexNex = 0;

  // ============================================
  // REAÇÕES EM MÍDIA (armazenamento em memória)
  // ============================================

  const reacoesMidiasNex = new Map();

  function obterReacaoMidiaNex(midia) {
    return reacoesMidiasNex.get(chaveMidiaReacaoNex(midia)) || '';
  }

  function registrarReacaoMidiaNex(emoji) {
    const midia = midiasViewerAtualNex[midiaViewerIndexNex];
    if (!midia) return;

    reacoesMidiasNex.set(chaveMidiaReacaoNex(midia), emoji);
    renderMidiaViewerNex();

    // Atualiza o chat
    if (typeof renderChat === 'function' && Drops.estado.conversaAtual) {
      renderChat(Drops.estado.conversaAtual);
    }
  }

  // ============================================
  // ABRIR VIEWER DE MÍDIAS
  // ============================================

  function abrirVisualizadorMidiasNex(
    lista,
    indexInicial = 0,
    mostrarComentario = true
  ) {
    midiasViewerAtualNex = Array.isArray(lista) ? lista : [];

    midiaViewerIndexNex = Math.max(
      0,
      Math.min(indexInicial, midiasViewerAtualNex.length - 1)
    );

    // Remove viewer antigo se existir
    const antigo = document.querySelector('.nex-midia-viewer');
    if (antigo) antigo.remove();

    if (!midiasViewerAtualNex.length) return;

    const viewer = document.createElement('div');
    viewer.className = 'nex-midia-viewer';

    viewer.innerHTML = `
      <div class="viewer-bg" id="viewerBgNex"></div>

      <div class="viewer-topbar">
        <div class="viewer-top-left">
          <div class="viewer-title">Mídias compartilhadas no NEX</div>
          <div class="viewer-counter" id="viewerCounterNex"></div>
        </div>

        <button class="viewer-close" type="button" aria-label="Voltar">➥</button>
      </div>

      <button class="viewer-arrow viewer-arrow-left" type="button" aria-label="Anterior">
        ‹
      </button>

      <div class="viewer-card">
        <div class="viewer-media" id="viewerMediaNex"></div>

        ${
          mostrarComentario
            ? `
          <div class="viewer-comment-box">
            <textarea
              class="viewer-comment-input"
              id="viewerCommentInputNex"
              placeholder="Escreva um comentário..."></textarea>

            <button type="button" class="viewer-reaction" aria-label="Reagir com coração">❤️</button>
            <button type="button" class="viewer-reaction" aria-label="Reagir com coração partido">💔</button>

            <button
              type="button"
              class="viewer-comment-send"
              onclick="enviarComentarioMidiaNex()">
              ᯓ➤
            </button>
          </div>
        `
            : ''
        }
      </div>

      <button class="viewer-arrow viewer-arrow-right" type="button" aria-label="Próxima">
        ›
      </button>
    `;

    document.body.appendChild(viewer);

    // Botão fechar
    viewer.querySelector('.viewer-close').onclick = () => {
      viewer.remove();
    };

    // Setas
    viewer.querySelector('.viewer-arrow-left').onclick = () => {
      navegarMidiaViewerNex(-1);
    };

    viewer.querySelector('.viewer-arrow-right').onclick = () => {
      navegarMidiaViewerNex(1);
    };

    // Reações
    viewer.querySelectorAll('.viewer-reaction').forEach((btn) => {
      btn.addEventListener('click', () => {
        registrarReacaoMidiaNex(btn.textContent.trim());
      });
    });

    renderMidiaViewerNex();
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
    renderMidiaViewerNex();
  }

  // ============================================
  // RENDERIZAR VIEWER
  // ============================================

  function renderMidiaViewerNex() {
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
      counter.innerText = `${midiaViewerIndexNex + 1} / ${
        midiasViewerAtualNex.length
      }`;
    }

    if (media) {
      const url = String(midia.url || '');
      const tipo = String(
        midia.type || midia.tipo || midia.mimeType || ''
      ).toLowerCase();

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

    // Preview de reação
    const reacaoAtual = obterReacaoMidiaNex(midia);
    let previewReacao = viewer.querySelector('.viewer-reaction-preview');

    if (!previewReacao) {
      previewReacao = document.createElement('div');
      previewReacao.className = 'viewer-reaction-preview';
      viewer.appendChild(previewReacao);
    }

    previewReacao.textContent = reacaoAtual;
    previewReacao.style.display = reacaoAtual ? 'flex' : 'none';

    // Estado das setas
    if (leftBtn) {
      leftBtn.disabled = midiaViewerIndexNex === 0;
    }

    if (rightBtn) {
      rightBtn.disabled =
        midiaViewerIndexNex >= midiasViewerAtualNex.length - 1;
    }
  }

  // ============================================
  // ABRIR MÍDIA ÚNICA
  // ============================================

  function abrirMidiaChatNex(url, tipo) {
    abrirVisualizadorMidiasNex(
      [
        {
          url,
          type: tipo === 'video' ? 'video' : 'imagem'
        }
      ],
      0,
      true
    );
  }

  // ============================================
  // ABRIR ÁLBUM / MÚLTIPLAS MÍDIAS
  // ============================================

  function abrirFotosViewerNex(listaEncoded) {
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

    abrirVisualizadorMidiasNex(midias, 0, true);
  }

  function abrirMidiasChatNex(listaEncoded) {
    abrirFotosViewerNex(listaEncoded);
  }

  // ============================================
  // COMENTAR MÍDIA
  // ============================================

  function enviarComentarioMidiaNex() {
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

    conversas[conversaAtual].push({
      id: gerarIdMensagemNex(),
      timestamp: Date.now(),
      side: 'right',
      nome: 'Eu',
      avatar: 'EU',
      ...obterDataHoraNex(),
      status: 'enviado',
      text: texto,
      anexo: {
        type: midia.type === 'video' ? 'video' : 'imagem',
        url: midia.url
      }
    });

    input.value = '';
    renderChat(conversaAtual);
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
  window.enviarComentarioMidiaNex = enviarComentarioMidiaNex;
  window.registrarReacaoMidiaNex = registrarReacaoMidiaNex;
  window.obterReacaoMidiaNex = obterReacaoMidiaNex;

  // ============================================
  // DEBUG
  // ============================================

  console.log('🖼️ 07-nex-album.js carregado');

})();