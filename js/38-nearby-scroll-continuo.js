/* ============================================
   38-NEARBY-SCROLL-CONTINUO.JS
   Efeito de rolagem vertical contínua no viewer do Nearby.
   ⚠️ Este arquivo cuida APENAS do vertical (perfis).
   ⚠️ O horizontal (drops) é cuidado pelo 11-nearby.js.
============================================ */

(function () {
  'use strict';

  const LIMITE_DIRECAO_PX = 8;
  const ENCAIXE_PCT = 0.25;
  const DURACAO_ANIM_MS = 420;
  const CURVA_ENCAIXE = 'cubic-bezier(0.34, 1.15, 0.64, 1)';
  const CURVA_BOUNCE = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

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

  let _idxProxCache = -1;
  let _idxAntCache = -1;

  function alturaTela() {
    if (shell && shell.offsetHeight > 0) return shell.offsetHeight;
    if (window.visualViewport && window.visualViewport.height > 0) return window.visualViewport.height;
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

  function viewerNearbyVisivel() {
    const v = document.querySelector('.nearby-drop-viewer');
    if (!v) return false;
    const seletores = [
      '.modal-msg-nex[style*="display: flex"]',
      '.mural-overlay-nex[style*="display: flex"]',
      '#modalDuracaoPublicacaoMyDropsNex:not(.hidden)',
      '.mydrops-publication-viewer',
      '#chatNex.active'
    ];
    for (const sel of seletores) {
      if (document.querySelector(sel)) return false;
    }
    return true;
  }

  function criarPreviewPerfilNex(perfil, posicao) {
    const drops = window.obterDropsDoPerfil?.(perfil) || [];
    const drop = drops[0];
    if (!drop) return null;

    let expiraTexto = 'Permanente';
    if (drop.expiraEm) {
      const ms = new Date(drop.expiraEm).getTime() - Date.now();
      if (!isNaN(ms) && ms > 0) {
        const seg = Math.floor(ms / 1000);
        const min = Math.floor(seg / 60);
        const h = Math.floor(min / 60);
        const d = Math.floor(h / 24);
        if (d >= 1) expiraTexto = `Expira em ${d}d`;
        else if (h >= 1) expiraTexto = `Expira em ${h}h`;
        else if (min >= 1) expiraTexto = `Expira em ${min}min`;
        else expiraTexto = `Expira em ${seg}s`;
      } else if (!isNaN(ms)) expiraTexto = 'Expirado';
    }

    const url = String(drop.url || drop.imagem || '');
    const tipo = String(drop.type || drop.tipo || '').toLowerCase();
    const ehVideo = tipo.includes('video') || /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

    const preview = document.createElement('div');
    preview.className = 'nearby-scroll-preview-nex';
    preview.style.cssText = `
      position: absolute; inset: 0; z-index: 1; background: #050b18;
      overflow: hidden; will-change: transform; pointer-events: none;
      box-sizing: border-box; display: flex; flex-direction: column;
      padding: 12px; gap: 8px; contain: paint; transform: translateZ(0);
      backface-visibility: hidden;
    `;

    const topbar = document.createElement('div');
    topbar.style.cssText = 'flex-shrink: 0; padding: 2px 2px 4px; display: flex; align-items: center; gap: 10px;';

    const avatar = document.createElement('div');
    avatar.style.cssText = 'width: 44px; height: 44px; min-width: 44px; border-radius: 50%; background: #1f2937; color: #fff; font-size: 18px; font-weight: 900; display: flex; align-items: center; justify-content: center; overflow: hidden; background-size: cover; background-position: center;';
    if (perfil.avatar && typeof perfil.avatar === 'string' && perfil.avatar.startsWith('http')) {
      avatar.style.backgroundImage = `url('${perfil.avatar}')`;
    } else {
      avatar.textContent = (perfil.nome || '?').charAt(0).toUpperCase();
    }

    const meta = document.createElement('div');
    meta.style.cssText = 'display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0;';
    const nome = document.createElement('strong');
    nome.style.cssText = 'color: #fff; font-size: 16px; font-weight: 800; line-height: 1.1;';
    nome.textContent = perfil.nome || 'Perfil';
    const dist = document.createElement('span');
    dist.style.cssText = 'color: rgba(255,255,255,0.86); font-size: 12px; font-weight: 700;';
    dist.textContent = expiraTexto;

    meta.appendChild(nome); meta.appendChild(dist);
    topbar.appendChild(avatar); topbar.appendChild(meta);
    preview.appendChild(topbar);

    const palco = document.createElement('div');
    palco.style.cssText = 'flex: 1; min-height: 0; position: relative; display: flex; align-items: center; justify-content: center;';
    const papel = document.createElement('div');
    papel.style.cssText = 'position: relative; aspect-ratio: 3 / 4; width: auto; height: 100%; max-width: 100%; max-height: 100%; background: #000; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.45);';

    if (ehVideo) {
      const video = document.createElement('video');
      video.src = url; video.muted = true; video.playsInline = true; video.preload = 'none';
      video.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;';
      papel.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.src = url; img.alt = '';
      img.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;';
      papel.appendChild(img);
    }

    palco.appendChild(papel);
    preview.appendChild(palco);

    if (posicao === 'prox') preview.style.transform = `translateY(${alturaTela()}px)`;
    else preview.style.transform = `translateY(-${alturaTela()}px)`;

    return preview;
  }

  const cacheNaoVisto = new Map();
  window.__limparCacheNaoVistoNex = () => cacheNaoVisto.clear();

  function perfilTemNaoVisto(perfilId) {
    if (cacheNaoVisto.has(perfilId)) return cacheNaoVisto.get(perfilId);
    const estado = obterEstado();
    if (!estado) return false;
    const perfil = estado.base[perfilId];
    if (!perfil) return false;
    const drops = window.obterDropsDoPerfil?.(perfil) || [];
    if (!drops.length) return false;
    const vistos = window.dropsVistosNex;
    if (!vistos) return true;

    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      const urlDrop = d.url || d.imagem || d.mediaUrl || '';
      const chaveLocal = window.chaveDropPerfilNex ? window.chaveDropPerfilNex(perfilId, i, urlDrop) : `${perfilId}::${i}::${urlDrop}`;
      const pubId = window.__dropsMapaIdsPublicacao && window.__dropsMapaIdsPublicacao[chaveLocal];
      if (!pubId) { cacheNaoVisto.set(perfilId, true); return true; }
      if (!vistos.foiVisto(pubId)) { cacheNaoVisto.set(perfilId, true); return true; }
    }
    cacheNaoVisto.set(perfilId, false);
    return false;
  }

  function proximoPerfilComNaoVisto(estado, idxAtual) {
    for (let i = idxAtual + 1; i < estado.ids.length; i++) {
      if (perfilTemNaoVisto(estado.ids[i])) return i;
    }
    if (idxAtual < estado.ids.length - 1) return idxAtual + 1;
    return -1;
  }

  function anteriorPerfilComNaoVisto(estado, idxAtual) {
    for (let i = idxAtual - 1; i >= 0; i--) {
      if (perfilTemNaoVisto(estado.ids[i])) return i;
    }
    if (idxAtual > 0) return idxAtual - 1;
    return -1;
  }

  function prepararPreviews() {
    const estado = obterEstado();
    if (!estado || !viewer) return;
    const idxAtual = estado.ids.indexOf(estado.getPerfilAtualId());
    const idxProx = _idxProxCache >= 0 ? _idxProxCache : proximoPerfilComNaoVisto(estado, idxAtual);
    const idxAnt = _idxAntCache >= 0 ? _idxAntCache : anteriorPerfilComNaoVisto(estado, idxAtual);

    if (idxProx >= 0 && !previewProx) {
      const perfilProx = estado.base[estado.ids[idxProx]];
      if (perfilProx) {
        previewProx = criarPreviewPerfilNex(perfilProx, 'prox');
        if (previewProx) viewer.appendChild(previewProx);
      }
    }
    if (idxAnt >= 0 && !previewAnt) {
      const perfilAnt = estado.base[estado.ids[idxAnt]];
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

  function iniciarDrag(e) {
    if (animando) return;
    if (!e.touches || e.touches.length !== 1) return;

    const alvo = e.target;
    if (
      alvo.closest('.nearby-drop-close') ||
      alvo.closest('.nearby-drop-comment-box') ||
      alvo.closest('.nearby-drop-profile-btn') ||
      alvo.closest('.nearby-pub-stats-row') ||
      alvo.closest('.nearby-drop-expandir') ||
      alvo.closest('.nearby-pub-capsula-autor') ||
      alvo.closest('.controles-inferiores-nex') ||
alvo.closest('.btn-mute-custom-nex') ||
// ⚠️ NÃO bloqueia o vídeo aqui, deixando o swipe horizontal passar
alvo.closest('input') ||
alvo.closest('textarea') ||
alvo.closest('button')
    ) {
      return;
    }

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

    window.__nearbyScrollVerticalAtivo = false;
    document.body.style.overflow = 'hidden';

    if (!previewProx || !previewAnt) {
      setTimeout(prepararPreviews, 0);
    }

    const idxAtual = estado.ids.indexOf(estado.getPerfilAtualId());
    _idxProxCache = proximoPerfilComNaoVisto(estado, idxAtual);
    _idxAntCache = anteriorPerfilComNaoVisto(estado, idxAtual);
  }

  function moverDrag(e) {
    if (!swipeAtivo || animando) return;
    if (!e.touches || e.touches.length !== 1) return;

    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;

    if (!direcao) {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (absX < LIMITE_DIRECAO_PX && absY < LIMITE_DIRECAO_PX) return;

      if (absY >= absX * 1.2) {
  direcao = 'vertical';
} else if (absX >= absY * 1.2) {
  direcao = 'horizontal';
  // ⚠️ Devolve o controle pro 11-nearby.js fazer o swipe
  window.__nearbyScrollVerticalAtivo = false;
  return;
} else {
  return;
      }

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      window.__nearbyScrollVerticalAtivo = true;
      prepararPreviews();
      if (shell) shell.style.transition = 'none';
    }

    if (direcao !== 'vertical') return;

    try {
      if (e.cancelable) e.preventDefault();
    } catch (_) {}

    aplicarMovimentoVertical(e, dy);
  }

  function aplicarMovimentoVertical(e, dy) {
    const altura = alturaTela();
    let podeProx = _idxProxCache >= 0;
    let podeAnt  = _idxAntCache  >= 0;

    if (_idxProxCache === -1 && _idxAntCache === -1) {
      const estado = obterEstado();
      if (estado) {
        const idxAtual = estado.ids.indexOf(estado.getPerfilAtualId());
        _idxProxCache = proximoPerfilComNaoVisto(estado, idxAtual);
        _idxAntCache  = anteriorPerfilComNaoVisto(estado, idxAtual);
        podeProx = _idxProxCache >= 0;
        podeAnt  = _idxAntCache  >= 0;
      }
    }

    let yFinal = dy;
    if (dy < 0 && !podeProx) yFinal = dy * 0.12;
    else if (dy > 0 && !podeAnt) yFinal = dy * 0.12;

    if (yFinal < -altura) yFinal = -altura + (yFinal + altura) * 0.3;
    if (yFinal > altura) yFinal = altura + (yFinal - altura) * 0.3;

    deltaY = dy;
    shell.style.transform = `translateY(${yFinal}px)`;

    if (yFinal < 0 && previewProx) {
      previewProx.style.transform = `translateY(${altura + yFinal}px)`;
    }
    if (yFinal > 0 && previewAnt) {
      previewAnt.style.transform = `translateY(${-altura + yFinal}px)`;
    }
  }

  function soltarDrag() {
    if (!swipeAtivo) return;
    swipeAtivo = false;

    document.body.style.overflow = '';
    _idxProxCache = -1;
    _idxAntCache = -1;

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
    const idxProx = proximoPerfilComNaoVisto(estado, idxAtual);
    const idxAnt = anteriorPerfilComNaoVisto(estado, idxAtual);

    if (deltaY < -limiar && idxProx === -1) {
      if (typeof window.mostrarToastNex === 'function') window.mostrarToastNex('🎉 Você já viu tudo por aqui', 'info', 2200);
      voltarAoInicio();
      return;
    }
    if (deltaY > limiar && idxAnt === -1) {
      if (typeof window.mostrarToastNex === 'function') window.mostrarToastNex('🏁 Você já está no início', 'info', 2200);
      voltarAoInicio();
      return;
    }

    if (deltaY < -limiar && idxProx >= 0) encaixarNoProximo(estado, idxProx);
    else if (deltaY > limiar && idxAnt >= 0) encaixarNoAnterior(estado, idxAnt);
    else voltarAoInicio();
  }

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
      estado.trocarPerfil(novoIdx, 'down');
      resetarShell();
      limparPreviews();
      animando = false;
      window.__nearbyScrollVerticalAtivo = false;
    }, DURACAO_ANIM_MS);
  }

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

  function voltarAoInicio() {
    animando = true;
    const curva = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
    shell.style.transition = `transform ${DURACAO_ANIM_MS}ms ${curva}`;
    shell.style.transform = 'translateY(0)';

    if (previewProx) {
      previewProx.style.transition = `transform ${DURACAO_ANIM_MS}ms ${curva}`;
      previewProx.style.transform = `translateY(${alturaTela()}px)`;
    }
    if (previewAnt) {
      previewAnt.style.transition = `transform ${DURACAO_ANIM_MS}ms ${curva}`;
      previewAnt.style.transform = `translateY(-${alturaTela()}px)`;
    }

    setTimeout(() => {
      resetarShell();
      limparPreviews();
      animando = false;
      window.__nearbyScrollVerticalAtivo = false;
    }, DURACAO_ANIM_MS);
  }

  function registrar() {
    document.addEventListener('touchstart', (e) => {
      if (!viewerNearbyVisivel()) return;
      if (!e.target.closest('.nearby-drop-viewer')) return;
      iniciarDrag(e);
    }, { passive: true, capture: true });

    document.addEventListener('touchmove', (e) => {
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
    }, { passive: false, capture: true });

    document.addEventListener('touchend', () => {
      if (!swipeAtivo) return;
      soltarDrag();
    }, { passive: true, capture: true });

    document.addEventListener('touchcancel', () => {
      swipeAtivo = false;
      direcao = null;
      limparPreviews();
      resetarShell();
      window.__nearbyScrollVerticalAtivo = false;
      document.body.style.overflow = '';
      _idxProxCache = -1;
      _idxAntCache = -1;
    }, { passive: true, capture: true });
  }

  document.addEventListener('DOMContentLoaded', registrar);
  console.log('🌀 38-nearby-scroll-continuo.js carregado (Apenas Vertical)');

})();
