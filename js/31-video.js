/* ============================================
   31-VIDEO.JS
   Editor de Vídeo do Drops — exclusivo

   Não compartilha estado com o 13-editor.js.
   Reaproveita apenas funções utilitárias.

   Depende de: 00-config.js, 03-utils.js, 12-mydrops.js, 13-editor.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // ESTADO
  // ============================================

  let videoLoopAtivo = false;
  let videoPausado = false;

  // ============================================
  // HELPERS
  // ============================================

  function videoAberto() {
    const editor = document.getElementById('videoEditorNex');
    return editor && editor.classList.contains('aberto');
  }

  function videoPalco() {
    return document.getElementById('videoPalcoNex');
  }

  function videoPapel() {
    return document.getElementById('videoPapelNex');
  }

  function videoPreview() {
    return document.getElementById('videoPreviewNex');
  }

  // ============================================
  // ABRIR
  // ============================================

  function abrirVideoNex() {
    const editor = document.getElementById('videoEditorNex');
    const preview = videoPreview();
    const urlVideo = window.urlVideoGravadoMyDropsNex;

    if (!editor || !preview || !urlVideo) {
      console.warn('⚠️ abrirVideoNex: dados faltando');
      return;
    }

    // Configura o vídeo
    preview.src = urlVideo;
    preview.loop = false;
    preview.muted = false;
    preview.controls = false;
    preview.playsInline = true;
    preview.removeAttribute('controls');

    // Reset estado
    videoLoopAtivo = false;
    videoPausado = false;
    window.loopVideoMyDropsNex = false;

    // Limpa legenda
    const inputLegenda = document.getElementById('legendaVideoMyDropsInput');
    if (inputLegenda) {
      inputLegenda.value = '';
      inputLegenda.style.height = 'auto';
    }

    const contador = document.getElementById('legendaVideoContadorMyDrops');
    if (contador) {
      contador.textContent = '0/500';
      contador.classList.remove('visivel');
    }

    // Abre
    editor.classList.add('aberto');
    document.body.classList.add('video-aberto');

    // Atualiza UI
    atualizarBtnPlayVideoNex();
    atualizarBtnLoopVideoNex();

    // Configura legenda
    configurarLegendaVideoNex();

    // Play automático
    preview.play().catch(() => {});
  }

  // ============================================
  // FECHAR
  // ============================================

  function fecharVideoNex() {
    const editor = document.getElementById('videoEditorNex');
    const preview = videoPreview();

    if (preview) {
      preview.pause();
      preview.removeAttribute('src');
      preview.load();
    }

    if (editor) editor.classList.remove('aberto');
    document.body.classList.remove('video-aberto');

    videoLoopAtivo = false;
    videoPausado = false;
    window.loopVideoMyDropsNex = false;

    atualizarBtnLoopVideoNex();
  }

  // ============================================
  // PLAY / PAUSE
  // ============================================

  function togglePlayVideoNex() {
    const preview = videoPreview();
    if (!preview) return;

    if (preview.paused) {
      preview.play().catch(() => {});
      videoPausado = false;
    } else {
      preview.pause();
      videoPausado = true;
    }

    atualizarBtnPlayVideoNex();
  }

  function atualizarBtnPlayVideoNex() {
    const preview = videoPreview();
    const btn = document.getElementById('videoBtnPlayNex');
    if (!preview || !btn) return;

    btn.textContent = preview.paused ? '▶' : '❚❚';
  }

  // ============================================
  // LOOP
  // ============================================

  function toggleLoopVideoNex() {
    const preview = videoPreview();
    if (!preview) return;

    videoLoopAtivo = !videoLoopAtivo;
    preview.loop = videoLoopAtivo;

    if (videoLoopAtivo) {
      preview.muted = true;
      preview.volume = 0;
      preview.setAttribute('muted', '');
    } else {
      preview.muted = false;
      preview.volume = 1;
      preview.removeAttribute('muted');
    }

    window.loopVideoMyDropsNex = videoLoopAtivo;

    atualizarBtnLoopVideoNex();

    preview.play().catch(() => {});
  }

  function atualizarBtnLoopVideoNex() {
    const btn = document.getElementById('videoBtnLoopNex');
    if (!btn) return;

    btn.classList.toggle('ativo', videoLoopAtivo);
  }

    // ============================================
  // PROGRESSO (tempo + barra)
  // ============================================

  function configurarProgressoVideoNex() {
  const preview = videoPreview();
  const barra = document.getElementById('videoProgressoNex');
  if (!preview || !barra) return;

  if (preview.__videoProgressoListener) return;
  preview.__videoProgressoListener = true;

  const tempo = document.getElementById('videoTempoNex');
  const fill = document.getElementById('videoProgressoFillNex');

  // ============================================
  // Cria a bolinha (scrubber) dentro da barra
  // ============================================

  let scrub = document.getElementById('videoProgressoScrubNex');
  if (!scrub) {
    scrub = document.createElement('div');
    scrub.id = 'videoProgressoScrubNex';
    barra.appendChild(scrub);
  }

  const formatarTempo = (segundos) => {
    const s = Math.floor(segundos || 0);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // ============================================
  // Atualiza fill + scrubber na posição atual
  // ============================================

  const atualizarVisualProgresso = () => {
    if (!preview.duration) return;

    const pct = (preview.currentTime / preview.duration) * 100;

    if (fill) fill.style.width = pct + '%';
    if (scrub) scrub.style.left = pct + '%';
  };

  // ============================================
  // Sincroniza com o vídeo
  // ============================================

  preview.addEventListener('timeupdate', () => {
    if (tempo) tempo.textContent = formatarTempo(preview.currentTime);
    atualizarVisualProgresso();
  });

  preview.addEventListener('loadedmetadata', () => {
    if (tempo) tempo.textContent = formatarTempo(preview.currentTime);
    atualizarVisualProgresso();
  });

  preview.addEventListener('play', () => {
    atualizarBtnPlayVideoNex();
  });

  preview.addEventListener('pause', () => {
    atualizarBtnPlayVideoNex();
  });

  preview.addEventListener('ended', () => {
    if (fill) fill.style.width = '0%';
    if (scrub) scrub.style.left = '0%';
    if (tempo) tempo.textContent = '00:00';
    atualizarBtnPlayVideoNex();
  });

  // ============================================
  // SCRUBBER — clique + arraste
  // ============================================

  let scrubando = false;
  let estavaTocando = false;

  const calcularTempoDoPointer = (clientX) => {
    const rect = barra.getBoundingClientRect();
    let pct = (clientX - rect.left) / rect.width;

    // Clampa entre 0 e 1
    if (pct < 0) pct = 0;
    if (pct > 1) pct = 1;

    return {
      pct,
      tempo: pct * (preview.duration || 0)
    };
  };

  const aplicarScrub = (clientX) => {
    if (!preview.duration) return;

    const { pct, tempo: novoTempo } = calcularTempoDoPointer(clientX);

    preview.currentTime = novoTempo;

    if (fill) fill.style.width = (pct * 100) + '%';
    if (scrub) scrub.style.left = (pct * 100) + '%';
    if (tempo) tempo.textContent = formatarTempo(novoTempo);
  };

  const onPointerDown = (e) => {
    if (!preview.duration) return;

    e.preventDefault();
    e.stopPropagation();

    scrubando = true;
    estavaTocando = !preview.paused;

    // Pausa durante o drag
    if (estavaTocando) preview.pause();

    barra.classList.add('scrubando');
    barra.setPointerCapture(e.pointerId);

    aplicarScrub(e.clientX);
  };

  const onPointerMove = (e) => {
    if (!scrubando) return;

    e.preventDefault();
    e.stopPropagation();

    aplicarScrub(e.clientX);
  };

  const onPointerUp = (e) => {
    if (!scrubando) return;

    e.preventDefault();
    e.stopPropagation();

    scrubando = false;
    barra.classList.remove('scrubando');

    try { barra.releasePointerCapture(e.pointerId); } catch (_) {}

    // Retoma o vídeo se estava tocando antes
    if (estavaTocando) {
      preview.play().catch(() => {});
    }

    estavaTocando = false;
  };

  const onPointerCancel = (e) => {
    if (!scrubando) return;

    scrubando = false;
    barra.classList.remove('scrubando');

    try { barra.releasePointerCapture(e.pointerId); } catch (_) {}

    if (estavaTocando) {
      preview.play().catch(() => {});
    }

    estavaTocando = false;
  };

  // Remove listeners antigos, se existirem
  if (barra.__scrubDown) {
    barra.removeEventListener('pointerdown', barra.__scrubDown);
    barra.removeEventListener('pointermove', barra.__scrubMove);
    barra.removeEventListener('pointerup', barra.__scrubUp);
    barra.removeEventListener('pointercancel', barra.__scrubCancel);
  }

  barra.__scrubDown = onPointerDown;
  barra.__scrubMove = onPointerMove;
  barra.__scrubUp = onPointerUp;
  barra.__scrubCancel = onPointerCancel;

  barra.addEventListener('pointerdown', onPointerDown);
  barra.addEventListener('pointermove', onPointerMove);
  barra.addEventListener('pointerup', onPointerUp);
  barra.addEventListener('pointercancel', onPointerCancel);
  }

  // ============================================
  // LEGENDA
  // ============================================

  function configurarLegendaVideoNex() {
    const textarea = document.getElementById('legendaVideoMyDropsInput');
    if (!textarea) return;

    const contador = document.getElementById('legendaVideoContadorMyDrops');

    if (textarea.__videoInputListener) {
      textarea.removeEventListener('input', textarea.__videoInputListener);
    }

    const ajustar = () => {
      textarea.style.height = 'auto';
      const altura = Math.min(textarea.scrollHeight, 60);
      textarea.style.height = altura + 'px';

      if (contador) {
        const len = textarea.value.length;
        contador.textContent = `${len}/500`;
        contador.classList.toggle('visivel', len >= 400);
      }
    };

    textarea.__videoInputListener = ajustar;
    textarea.addEventListener('input', ajustar);
    ajustar();
  }

  // ============================================
  // PUBLICAR
  // ============================================

  function publicarVideoNex() {
    const inputLegenda = document.getElementById('legendaVideoMyDropsInput');
    const legenda = (inputLegenda?.value || '').trim();

    window.__videoLegendaTemporaria = legenda;

    // Pausa o vídeo antes de publicar
    const preview = videoPreview();
    if (preview && !preview.paused) {
      preview.pause();
    }

    if (typeof window.abrirModalDuracaoPublicacaoMyDropsNex === 'function') {
      window.abrirModalDuracaoPublicacaoMyDropsNex('video');
    }
  }

  // ============================================
  // SAIR
  // ============================================

  function sairVideoNex() {
    const preview = videoPreview();

    // Pausa antes de sair
    if (preview && !preview.paused) {
      preview.pause();
    }

    // Se tem vídeo gravado, exclui tudo
    if (window.urlVideoGravadoMyDropsNex) {
      if (typeof window.excluirVideoMyDropsNex === 'function') {
        window.excluirVideoMyDropsNex();
      }
    }

    // Fecha o editor
    fecharVideoNex();
  }

  // ============================================
  // BARRA TOPO — DELEGAÇÃO DE EVENTOS
  // ============================================

  function configurarBarraVideoNex() {
    const barra = document.getElementById('videoBarraTopoNex');

    if (!barra) {
      console.warn('⚠️ Barra de Vídeo não encontrada');
      return;
    }

    if (barra.__videoListenerAtivo) return;
    barra.__videoListenerAtivo = true;

    barra.addEventListener('click', (e) => {
      const btn = e.target.closest('.video-btn-topo');
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const id = btn.id;

      if (id === 'videoBtnLoopNex') {
        toggleLoopVideoNex();
      } else if (id === 'videoBtnSairNex') {
        sairVideoNex();
      }
    });
  }

  // ============================================
  // BOTÃO PLAY (delegação)
  // ============================================

  function configurarBotaoPlayVideoNex() {
    const btn = document.getElementById('videoBtnPlayNex');
    if (!btn) return;

    if (btn.__videoListenerAtivo) return;
    btn.__videoListenerAtivo = true;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePlayVideoNex();
    });
  }

  // ============================================
  // BOTÃO PUBLICAR
  // ============================================

  function configurarBotaoPublicarVideoNex() {
    const btn = document.getElementById('videoBtnPublicarNex');
    if (!btn) return;

    if (btn.__videoListenerAtivo) return;
    btn.__videoListenerAtivo = true;

    btn.addEventListener('click', publicarVideoNex);
  }

  // ============================================
  // TECLADO — AJUSTA PALCO
  // ============================================

  function configurarTecladoVideoNex() {
  if (!window.visualViewport) return;
  if (window.__videoTecladoConfigurado) return;
  window.__videoTecladoConfigurado = true;

  const ajustar = () => {
    const editor = document.getElementById('videoEditorNex');
    if (!editor || !editor.classList.contains('aberto')) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const alturaVisivel = vv.height;
    const topoVisivel = vv.offsetTop;
    const alturaJanela = window.innerHeight;

    const tecladoAberto = alturaJanela - alturaVisivel > 150;

    if (tecladoAberto) {
      // ⚠️ Encolhe o editor inteiro pra caber na área visível
      editor.style.setProperty('top', topoVisivel + 'px', 'important');
      editor.style.setProperty('height', alturaVisivel + 'px', 'important');
      editor.style.setProperty('bottom', 'auto', 'important');
    } else {
      // Volta ao normal (viewport cheio)
      editor.style.removeProperty('top');
      editor.style.removeProperty('height');
      editor.style.removeProperty('bottom');
    }
  };

  window.visualViewport.addEventListener('resize', ajustar);
  window.visualViewport.addEventListener('scroll', ajustar);
  }

    // ============================================
  // INICIALIZAÇÃO
  // ============================================

  function inicializarVideoNex() {
    configurarBarraVideoNex();
    configurarBotaoPlayVideoNex();
    configurarBotaoPublicarVideoNex();
    configurarProgressoVideoNex();
    configurarTecladoVideoNex();

    console.log('🎥 31-video.js inicializado');
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(inicializarVideoNex, 400);
  });

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.abrirVideoNex = abrirVideoNex;
  window.fecharVideoNex = fecharVideoNex;
  window.togglePlayVideoNex = togglePlayVideoNex;
  window.toggleLoopVideoNex = toggleLoopVideoNex;
  window.publicarVideoNex = publicarVideoNex;
  window.sairVideoNex = sairVideoNex;

  // ============================================
  // INTERCEPTA AS FUNÇÕES DO EDITOR ANTIGO
  // Tudo que chamava abrirEditorVideoMyDropsNex
  // passa a usar o novo abrirVideoNex
  // ============================================

  window.abrirEditorVideoMyDropsNex = abrirVideoNex;
  window.fecharEditorVideoMyDropsNex = fecharVideoNex;

  // ============================================
  // DEBUG
  // ============================================

  console.log('🎥 31-video.js carregado');

})();