/* ============================================
   38-NEARBY-SCROLL-CONTINUO.JS
   Efeito de rolagem vertical contínua no viewer do Nearby.

   - Ao arrastar na vertical, o shell desliza junto com o dedo
   - O próximo (ou anterior) perfil aparece por baixo acompanhando
   - Solta:
       * > 25% da tela → encaixa no próximo/anterior
       * senão → volta ao lugar (com bounce)
   - Bounce também quando tenta passar do primeiro/último perfil
   - Swipe horizontal continua sendo tratado pelo 11-nearby.js

   Depende de: 11-nearby.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // CONFIG
  // ============================================

  const LIMITE_DIRECAO_PX = 8;    // px mínimos pra decidir direção
  const ENCAIXE_PCT = 0.25;       // 25% da tela pra encaixar no próximo
  const DURACAO_ANIM_MS = 320;
  const CURVA_ENCAIXE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const CURVA_BOUNCE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
  const FATOR_RESISTENCIA = 0.35; // quanto "trava" ao passar do limite

  // ============================================
  // ESTADO
  // ============================================

  let viewer = null;
  let shell = null;
  let previewProx = null;
  let previewAnt = null;

  let swipeAtivo = false;
  let direcao = null;
  let startX = 0;
  let startY = 0;
  let deltaY = 0;
  let animando = false;

  // ============================================
  // HELPERS
  // ============================================

  function alturaTela() {
    return window.innerHeight || 800;
  }

  function obterEstado() {
    const estado = window.__nearbyScrollStateNex;
    if (!estado) return null;
    if (!estado.viewerRef || !estado.viewerRef.isConnected) {
      window.__nearbyScrollStateNex = null;
      return null;
    }
    return estado;
  }

  function detectarDirecao(dx, dy) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < LIMITE_DIRECAO_PX && absY < LIMITE_DIRECAO_PX) {
      return null;
    }

    if (absY > absX * 1.3) return 'vertical';
    if (absX > absY * 1.3) return 'horizontal';
    return null;
  }

  // ============================================
  // CRIAR PREVIEW (perfil anterior/próximo)
  // ============================================

  function criarPreviewPerfilNex(perfil, posicao) {
    const drops = window.obterDropsDoPerfil?.(perfil) || [];
    const drop = drops[0];
    if (!drop) return null;

    const url = String(drop.url || drop.imagem || '');
    const tipo = String(drop.type || drop.tipo || '').toLowerCase();
    const ehVideo = tipo.includes('video') ||
      /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

    const preview = document.createElement('div');
    preview.className = 'nearby-scroll-preview-nex';
    preview.style.position = 'absolute';
    preview.style.inset = '0';
    preview.style.zIndex = '1';
    preview.style.background = '#000';
    preview.style.overflow = 'hidden';
    preview.style.willChange = 'transform';
    preview.style.pointerEvents = 'none';

    if (ehVideo) {
      const video = document.createElement('video');
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.style.display = 'block';
      preview.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.display = 'block';
      preview.appendChild(img);
    }

    if (posicao === 'prox') {
      preview.style.transform = `translateY(${alturaTela()}px)`;
    } else {
      preview.style.transform = `translateY(-${alturaTela()}px)`;
    }

    return preview;
  }

  // ============================================
  // PREPARAR / LIMPAR
  // ============================================

  function prepararPreviews() {
    const estado = obterEstado();
    if (!estado || !viewer) return;

    const idxAtual = estado.ids.indexOf(estado.getPerfilAtualId());

    // Próximo perfil
    if (idxAtual < estado.ids.length - 1) {
      const idProx = estado.ids[idxAtual + 1];
      const perfilProx = estado.base[idProx];
      if (perfilProx) {
        previewProx = criarPreviewPerfilNex(perfilProx, 'prox');
        if (previewProx) viewer.appendChild(previewProx);
      }
    }

    // Perfil anterior
    if (idxAtual > 0) {
      const idAnt = estado.ids[idxAtual - 1];
      const perfilAnt = estado.base[idAnt];
      if (perfilAnt) {
        previewAnt = criarPreviewPerfilNex(perfilAnt, 'ant');
        if (previewAnt) viewer.appendChild(previewAnt);
      }
    }
  }

  function limparPreviews() {
    if (previewProx?.parentNode) previewProx.parentNode.removeChild(previewProx);
    if (previewAnt?.parentNode) previewAnt.parentNode.removeChild(previewAnt);
    previewProx = null;
    previewAnt = null;
  }

  function resetarShell() {
    if (!shell) return;
    shell.style.transition = 'none';
    shell.style.transform = 'translateY(0)';
  }

  // ============================================
  // INÍCIO DO DRAG
  // ============================================

  function iniciarDrag(e) {
  if (animando) return;
  if (!e.touches || e.touches.length !== 1) return;

  const estado = obterEstado();
  if (!estado) return;

  viewer = estado.viewerRef;
  shell = viewer.querySelector('.nearby-pub-shell');
  if (!shell) return;

  swipeAtivo = true;
  direcao = null;
  deltaY = 0;
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
}

// ============================================
// GUARDA: só age se o viewer do Nearby estiver visível
// ============================================
// Se por algum motivo o viewer saiu da tela (modal aberto,
// outra tela em cima), ignora o swipe e RESETA o estado.

function viewerNearbyVisivel() {
  const v = document.querySelector('.nearby-drop-viewer');
  if (!v) return false;

  // Se algum modal ou tela estiver por cima, considera invisível
  const modalAberto = document.querySelector(
    '.modal-msg-nex[style*="display: flex"], ' +
    '.modal-fundo-box, ' +
    '.mural-overlay-nex[style*="display: flex"], ' +
    '.onb-viewer-overlay-nex.visivel, ' +
    '#modalDuracaoPublicacaoMyDropsNex:not(.hidden), ' +
    '.mydrops-publication-viewer, ' +
    '.chatNex.active, ' +
    '#chatNex.active'
  );

  if (modalAberto) return false;

  return true;
}

  // ============================================
  // MOVIMENTO
  // ============================================

  function moverDrag(e) {
    if (!swipeAtivo || animando) return;
    if (!e.touches || e.touches.length !== 1) return;

    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    if (!direcao) {
      direcao = detectarDirecao(dx, dy);

      if (direcao === 'vertical') {
        // ⚠️ Avisa o 11-nearby.js pra ignorar o swipe dele
        window.__nearbyScrollVerticalAtivo = true;
        prepararPreviews();
        if (shell) shell.style.transition = 'none';
      } else if (direcao === 'horizontal') {
        // Libera pro 11-nearby.js tratar
        swipeAtivo = false;
        return;
      } else {
        return;
      }
    }

    if (direcao !== 'vertical') return;

    if (e.cancelable) e.preventDefault();

    const altura = alturaTela();
    const estado = obterEstado();
    if (!estado) return;

    const idxAtual = estado.ids.indexOf(estado.getPerfilAtualId());
    const podeProx = idxAtual < estado.ids.length - 1;
    const podeAnt = idxAtual > 0;

    // Aplica resistência quando passa do limite
    let yFinal = dy;
    if (dy < 0 && !podeProx) {
      yFinal = dy * FATOR_RESISTENCIA;
    } else if (dy > 0 && !podeAnt) {
      yFinal = dy * FATOR_RESISTENCIA;
    }

    // Limita o arrasto a uma tela (com resistência além)
    if (yFinal < -altura) yFinal = -altura + (yFinal + altura) * 0.3;
    if (yFinal > altura) yFinal = altura + (yFinal - altura) * 0.3;

    deltaY = dy;

    // Transladar o shell atual
    shell.style.transform = `translateY(${yFinal}px)`;

    // Transladar o preview (se tiver)
    if (yFinal < 0 && previewProx) {
      previewProx.style.transform = `translateY(${altura + yFinal}px)`;
    }
    if (yFinal > 0 && previewAnt) {
      previewAnt.style.transform = `translateY(${-altura + yFinal}px)`;
    }
  }

  // ============================================
  // FIM DO DRAG
  // ============================================

  function soltarDrag() {
    if (!swipeAtivo) return;
    swipeAtivo = false;

    if (direcao !== 'vertical') {
      window.__nearbyScrollVerticalAtivo = false;
      limparPreviews();
      resetarShell();
      return;
    }

    const estado = obterEstado();
    if (!estado) {
      limparPreviews();
      resetarShell();
      window.__nearbyScrollVerticalAtivo = false;
      return;
    }

    const altura = alturaTela();
    const limiar = altura * ENCAIXE_PCT;

    const idxAtual = estado.ids.indexOf(estado.getPerfilAtualId());

    if (deltaY < -limiar && idxAtual < estado.ids.length - 1) {
      encaixarNoProximo(estado, idxAtual + 1);
    } else if (deltaY > limiar && idxAtual > 0) {
      encaixarNoAnterior(estado, idxAtual - 1);
    } else {
      voltarAoInicio();
    }
  }

  // ============================================
  // ENCAIXAR NO PRÓXIMO
  // ============================================

  function encaixarNoProximo(estado, novoIdx) {
    animando = true;

    const altura = alturaTela();

    shell.style.transition = `transform ${DURACAO_ANIM_MS}ms ${CURVA_ENCAIXE}`;
    shell.style.transform = `translateY(-${altura}px)`;

    if (previewProx) {
      previewProx.style.transition = `transform ${DURACAO_ANIM_MS}ms ${CURVA_ENCAIXE}`;
      previewProx.style.transform = 'translateY(0)';
    }

    setTimeout(() => {
      // ⚠️ Chama o renderizar do 11-nearby.js
      estado.trocarPerfil(novoIdx, 'down');

      // Reseta o shell sem animação (conteúdo já foi trocado)
      resetarShell();
      limparPreviews();

      animando = false;
      window.__nearbyScrollVerticalAtivo = false;
    }, DURACAO_ANIM_MS);
  }

  // ============================================
  // ENCAIXAR NO ANTERIOR
  // ============================================

  function encaixarNoAnterior(estado, novoIdx) {
    animando = true;

    const altura = alturaTela();

    shell.style.transition = `transform ${DURACAO_ANIM_MS}ms ${CURVA_ENCAIXE}`;
    shell.style.transform = `translateY(${altura}px)`;

    if (previewAnt) {
      previewAnt.style.transition = `transform ${DURACAO_ANIM_MS}ms ${CURVA_ENCAIXE}`;
      previewAnt.style.transform = 'translateY(0)';
    }

    setTimeout(() => {
      estado.trocarPerfil(novoIdx, 'up');

      resetarShell();
      limparPreviews();

      animando = false;
      window.__nearbyScrollVerticalAtivo = false;
    }, DURACAO_ANIM_MS);
  }

  // ============================================
  // VOLTAR AO INÍCIO (com bounce)
  // ============================================

  function voltarAoInicio() {
    animando = true;

    shell.style.transition = `transform ${DURACAO_ANIM_MS}ms ${CURVA_BOUNCE}`;
    shell.style.transform = 'translateY(0)';

    if (previewProx) {
      previewProx.style.transition = `transform ${DURACAO_ANIM_MS}ms ${CURVA_BOUNCE}`;
      previewProx.style.transform = `translateY(${alturaTela()}px)`;
    }
    if (previewAnt) {
      previewAnt.style.transition = `transform ${DURACAO_ANIM_MS}ms ${CURVA_BOUNCE}`;
      previewAnt.style.transform = `translateY(-${alturaTela()}px)`;
    }

    setTimeout(() => {
      resetarShell();
      limparPreviews();

      animando = false;
      window.__nearbyScrollVerticalAtivo = false;
    }, DURACAO_ANIM_MS);
  }

  // ============================================
  // REGISTRAR LISTENERS
  // ============================================

  function registrar() {
  // ⚠️ Usa capture: true pra rodar ANTES do 11-nearby.js
  document.addEventListener(
    'touchstart',
    (e) => {
      // ⚠️ GUARDA: só age se o viewer do Nearby estiver realmente visível
      if (!viewerNearbyVisivel()) return;
      if (!e.target.closest('.nearby-drop-viewer')) return;
      iniciarDrag(e);
    },
    { passive: true, capture: true }
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      // ⚠️ GUARDA: se o viewer saiu da tela, reseta o estado
      if (!viewerNearbyVisivel()) {
        if (swipeAtivo) {
          swipeAtivo = false;
          direcao = null;
          limparPreviews();
          resetarShell();
          window.__nearbyScrollVerticalAtivo = false;
        }
        return;
      }

      if (!swipeAtivo) return;
      moverDrag(e);
    },
    { passive: false, capture: true }
  );

  document.addEventListener(
    'touchend',
    () => {
      if (!swipeAtivo) return;
      soltarDrag();
    },
    { passive: true, capture: true }
  );

  document.addEventListener(
    'touchcancel',
    () => {
      if (!swipeAtivo) return;
      swipeAtivo = false;
      direcao = null;
      limparPreviews();
      resetarShell();
      window.__nearbyScrollVerticalAtivo = false;
    },
    { passive: true, capture: true }
  );
  }

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  document.addEventListener('DOMContentLoaded', registrar);

  console.log('🌀 38-nearby-scroll-continuo.js carregado');

})();

