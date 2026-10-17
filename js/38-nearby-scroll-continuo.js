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
  const DURACAO_ANIM_MS = 420;
  // ⚠️ y > 1 no 2º ponto = overshoot sutil (passa e volta)
const CURVA_ENCAIXE = 'cubic-bezier(0.34, 1.15, 0.64, 1)';
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

  // ⚠️ Cache de índices — evita recalcular no touchmove (60x/s)
let _idxProxCache = -1;
let _idxAntCache = -1;

  // ============================================
  // HELPERS
  // ============================================

  function alturaTela() {
// ⚠️ Usa a altura REAL do shell (100dvh). Se o shell ainda não
//    estiver renderizado (offsetHeight = 0), cai pro visualViewport
//    (que é o mesmo que 100dvh no Chrome mobile).
if (shell && shell.offsetHeight > 0) return shell.offsetHeight;

if (window.visualViewport && window.visualViewport.height > 0) {
  return window.visualViewport.height;
}

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

const totalDrops = drops.length;

// ⚠️ Calcula texto de expiração (mesma lógica do 11-nearby.js)
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
  } else if (!isNaN(ms)) {
    expiraTexto = 'Expirado';
  }
}

  const url = String(drop.url || drop.imagem || '');
  const tipo = String(drop.type || drop.tipo || '').toLowerCase();
  const ehVideo = tipo.includes('video') ||
    /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

  // ============================================
  // WRAPPER — mesmo layout do shell real
  // ============================================
  const preview = document.createElement('div');
preview.className = 'nearby-scroll-preview-nex';
preview.style.position = 'absolute';
preview.style.inset = '0';
preview.style.zIndex = '1';
preview.style.background = '#050b18';
preview.style.overflow = 'hidden';
preview.style.willChange = 'transform';
preview.style.pointerEvents = 'none';
preview.style.boxSizing = 'border-box';
preview.style.display = 'flex';
preview.style.flexDirection = 'column';
preview.style.padding = '12px';
preview.style.gap = '8px';

// ⚠️ CORREÇÃO CHROME MOBILE:
//    'paint' evita que o Chrome recalcule o layout interno
//    do preview a cada frame durante o drag.
preview.style.contain = 'paint';
preview.style.transform = 'translateZ(0)';
preview.style.backfaceVisibility = 'hidden';
preview.style.webkitBackfaceVisibility = 'hidden';
  // ============================================
  // TOPBAR
  // ============================================
  const topbar = document.createElement('div');
  topbar.style.flexShrink = '0';
  topbar.style.padding = '2px 2px 4px';
  topbar.style.display = 'flex';
  topbar.style.alignItems = 'center';
  topbar.style.gap = '10px';

  const avatar = document.createElement('div');
  avatar.style.width = '44px';
  avatar.style.height = '44px';
  avatar.style.minWidth = '44px';
  avatar.style.borderRadius = '50%';
  avatar.style.background = '#1f2937';
  avatar.style.color = '#fff';
  avatar.style.fontSize = '18px';
  avatar.style.fontWeight = '900';
  avatar.style.display = 'flex';
  avatar.style.alignItems = 'center';
  avatar.style.justifyContent = 'center';
  avatar.style.overflow = 'hidden';
  avatar.style.backgroundSize = 'cover';
  avatar.style.backgroundPosition = 'center';

  if (perfil.avatar && typeof perfil.avatar === 'string' &&
      perfil.avatar.startsWith('http')) {
    avatar.style.backgroundImage = `url('${perfil.avatar}')`;
  } else {
    avatar.textContent = (perfil.nome || '?').charAt(0).toUpperCase();
  }

  const meta = document.createElement('div');
  meta.style.display = 'flex';
  meta.style.flexDirection = 'column';
  meta.style.gap = '2px';
  meta.style.flex = '1';
  meta.style.minWidth = '0';

  const nome = document.createElement('strong');
  nome.style.color = '#fff';
  nome.style.fontSize = '16px';
  nome.style.fontWeight = '800';
  nome.style.lineHeight = '1.1';
  nome.style.whiteSpace = 'nowrap';
  nome.style.overflow = 'hidden';
  nome.style.textOverflow = 'ellipsis';
  nome.textContent = perfil.nome || 'Perfil';

  const dist = document.createElement('span');
dist.style.color = 'rgba(255,255,255,0.86)';
dist.style.fontSize = '12px';
dist.style.fontWeight = '700';
dist.style.lineHeight = '1.1';
dist.textContent = expiraTexto;

meta.appendChild(nome);
meta.appendChild(dist);
topbar.appendChild(avatar);
topbar.appendChild(meta);

// ============================================
// CONTADOR (canto direito do topbar)
// ============================================
const counterGroup = document.createElement('div');
counterGroup.style.display = 'flex';
counterGroup.style.alignItems = 'center';
counterGroup.style.gap = '8px';
counterGroup.style.flexShrink = '0';

const counter = document.createElement('span');
counter.style.color = '#cbd5e1';
counter.style.fontSize = '13px';
counter.style.fontWeight = '800';
counter.style.letterSpacing = '0.3px';
counter.textContent = `1/${totalDrops}`;

counterGroup.appendChild(counter);
topbar.appendChild(counterGroup);

preview.appendChild(topbar);

  // ============================================
  // PALCO + PAPEL
  // ============================================
  const palco = document.createElement('div');
  palco.style.flex = '1';
  palco.style.minHeight = '0';
  palco.style.position = 'relative';
  palco.style.display = 'flex';
  palco.style.alignItems = 'center';
  palco.style.justifyContent = 'center';

  const papel = document.createElement('div');
  papel.style.position = 'relative';
  papel.style.aspectRatio = '3 / 4';
  papel.style.width = 'auto';
  papel.style.height = '100%';
  papel.style.maxWidth = '100%';
  papel.style.maxHeight = '100%';
  papel.style.background = '#000';
  papel.style.borderRadius = '20px';
  papel.style.overflow = 'hidden';
  papel.style.boxShadow = '0 20px 60px rgba(0,0,0,0.45)';

  if (ehVideo) {
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.style.position = 'absolute';
    video.style.inset = '0';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.display = 'block';
    papel.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    img.style.position = 'absolute';
    img.style.inset = '0';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.style.display = 'block';
    papel.appendChild(img);
  }

  palco.appendChild(papel);
  preview.appendChild(palco);

// ============================================
// RODAPÉ — comment box + reações + share
// ============================================
const rodape = document.createElement('div');
rodape.style.flexShrink = '0';
rodape.style.display = 'flex';
rodape.style.alignItems = 'center';
rodape.style.gap = '8px';

// Comment box (pílula escura com input branco dentro)
const commentBox = document.createElement('div');
commentBox.style.flex = '1';
commentBox.style.minWidth = '0';
commentBox.style.display = 'flex';
commentBox.style.alignItems = 'center';
commentBox.style.gap = '6px';
commentBox.style.padding = '6px 8px';
commentBox.style.borderRadius = '22px';
commentBox.style.background = 'rgba(13, 20, 36, 0.92)';
commentBox.style.border = '1px solid rgba(255, 255, 255, 0.14)';
commentBox.style.boxSizing = 'border-box';

const inputFake = document.createElement('div');
inputFake.style.flex = '1';
inputFake.style.minWidth = '0';
inputFake.style.height = '38px';
inputFake.style.borderRadius = '14px';
inputFake.style.background = '#ffffff';
inputFake.style.display = 'flex';
inputFake.style.alignItems = 'center';
inputFake.style.padding = '0 12px';
inputFake.style.color = 'rgba(0,0,0,0.45)';
inputFake.style.fontSize = '14px';
inputFake.style.fontWeight = '500';
inputFake.textContent = 'Comentar...';

// Botão ❤️
const btnHeart = document.createElement('div');
btnHeart.style.width = '38px';
btnHeart.style.height = '38px';
btnHeart.style.minWidth = '38px';
btnHeart.style.borderRadius = '50%';
btnHeart.style.background = 'rgba(255, 255, 255, 0.08)';
btnHeart.style.display = 'flex';
btnHeart.style.alignItems = 'center';
btnHeart.style.justifyContent = 'center';
btnHeart.style.fontSize = '18px';
btnHeart.textContent = '❤️';

// Botão 💔
const btnBroken = document.createElement('div');
btnBroken.style.width = '38px';
btnBroken.style.height = '38px';
btnBroken.style.minWidth = '38px';
btnBroken.style.borderRadius = '50%';
btnBroken.style.background = 'rgba(255, 255, 255, 0.08)';
btnBroken.style.display = 'flex';
btnBroken.style.alignItems = 'center';
btnBroken.style.justifyContent = 'center';
btnBroken.style.fontSize = '18px';
btnBroken.textContent = '💔';

// Botão share azul
const btnShare = document.createElement('div');
btnShare.style.width = '38px';
btnShare.style.height = '38px';
btnShare.style.minWidth = '38px';
btnShare.style.borderRadius = '50%';
btnShare.style.background = '#2563eb';
btnShare.style.display = 'flex';
btnShare.style.alignItems = 'center';
btnShare.style.justifyContent = 'center';
btnShare.style.color = '#ffffff';
btnShare.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';

commentBox.appendChild(inputFake);
commentBox.appendChild(btnHeart);
commentBox.appendChild(btnBroken);
commentBox.appendChild(btnShare);
rodape.appendChild(commentBox);
preview.appendChild(rodape);

// ============================================
// STATS ROW — views + reações + visitar perfil
// ============================================
const statsRow = document.createElement('div');
statsRow.style.flexShrink = '0';
statsRow.style.display = 'flex';
statsRow.style.alignItems = 'center';
statsRow.style.justifyContent = 'space-between';
statsRow.style.gap = '8px';
statsRow.style.padding = '2px 4px 0';

const statsLista = document.createElement('div');
statsLista.style.display = 'flex';
statsLista.style.alignItems = 'center';
statsLista.style.gap = '8px';

const viewsPill = document.createElement('div');
viewsPill.style.display = 'inline-flex';
viewsPill.style.alignItems = 'center';
viewsPill.style.gap = '5px';
viewsPill.style.padding = '8px 14px';
viewsPill.style.borderRadius = '999px';
viewsPill.style.background = 'rgba(255, 255, 255, 0.12)';
viewsPill.style.color = '#ffffff';
viewsPill.style.fontSize = '14px';
viewsPill.style.fontWeight = '800';
viewsPill.textContent = '👁 ' + (drop.views || 0);

statsLista.appendChild(viewsPill);

// ⚠️ Selos de origem (macOS / Noite / Safari etc)
if (drop.selos && typeof window.gerarHTMLSelos === 'function') {
  const selosWrap = document.createElement('div');
  selosWrap.innerHTML = window.gerarHTMLSelos(drop.selos);
  const selosHtml = selosWrap.firstElementChild;
  if (selosHtml) {
    selosHtml.style.display = 'inline-flex';
    selosHtml.style.alignItems = 'center';
    selosHtml.style.gap = '4px';
    meta.appendChild(selosHtml);
  }
}

const btnVisitar = document.createElement('div');
btnVisitar.style.borderRadius = '14px';
btnVisitar.style.background = '#ffffff';
btnVisitar.style.color = '#111827';
btnVisitar.style.fontSize = '13px';
btnVisitar.style.fontWeight = '800';
btnVisitar.style.padding = '10px 14px';
btnVisitar.style.flexShrink = '0';
btnVisitar.textContent = '👣 Visitar perfil';

statsRow.appendChild(statsLista);
statsRow.appendChild(btnVisitar);
preview.appendChild(statsRow);

  // ============================================
  // POSIÇÃO INICIAL
  // ============================================
  if (posicao === 'prox') {
    preview.style.transform = `translateY(${alturaTela()}px)`;
  } else {
    preview.style.transform = `translateY(-${alturaTela()}px)`;
  }

  return preview;
  }

  // ============================================
// HELPERS — PERFIL TEM DROPS NÃO VISTOS?
// ============================================

const cacheNaoVisto = new Map(); // perfilId → true/false

function limparCacheNaoVisto() {
  cacheNaoVisto.clear();
}

function perfilTemNaoVisto(perfilId) {
  if (cacheNaoVisto.has(perfilId)) return cacheNaoVisto.get(perfilId);

  const estado = obterEstado();
  if (!estado) {
    cacheNaoVisto.set(perfilId, false);
    return false;
  }

  const perfil = estado.base[perfilId];
  if (!perfil) {
    cacheNaoVisto.set(perfilId, false);
    return false;
  }

  const drops = window.obterDropsDoPerfil?.(perfil) || [];
  if (!drops.length) return false;

  const vistos = window.dropsVistosNex;
  if (!vistos) return true; // sem sistema de visto, considera todos como não vistos

  for (let i = 0; i < drops.length; i++) {
    const d = drops[i];
    const urlDrop = d.url || d.imagem || d.mediaUrl || '';

    const chaveLocal = window.chaveDropPerfilNex
      ? window.chaveDropPerfilNex(perfilId, i, urlDrop)
      : `${perfilId}::${i}::${urlDrop}`;

    const pubId =
      window.__dropsMapaIdsPublicacao &&
      window.__dropsMapaIdsPublicacao[chaveLocal];

        if (!pubId) {
      cacheNaoVisto.set(perfilId, true);
      return true;
    }
    if (!vistos.foiVisto(pubId)) {
      cacheNaoVisto.set(perfilId, true);
      return true;
    }
  }

  cacheNaoVisto.set(perfilId, false);
  return false;
}
  
// Próximo perfil: prioriza não-visto, mas se todos já foram vistos,
// usa o adjacente (índice + 1) pra navegação continuar funcionando.
function proximoPerfilComNaoVisto(estado, idxAtual) {
  // Tenta primeiro um não-visto
  for (let i = idxAtual + 1; i < estado.ids.length; i++) {
    if (perfilTemNaoVisto(estado.ids[i])) return i;
  }

  // ⚠️ CORREÇÃO: se não achou não-visto, retorna o próximo adjacente.
  //    Sem isso, o scroll vertical morre quando todos os perfis
  //    vizinhos já foram vistos (o usuário vê "não tem mais perfil").
  if (idxAtual < estado.ids.length - 1) return idxAtual + 1;

  return -1;
}

// Perfil anterior: prioriza não-visto, mas se todos já foram vistos,
// usa o adjacente (índice - 1) pra navegação continuar funcionando.
function anteriorPerfilComNaoVisto(estado, idxAtual) {
  // Tenta primeiro um não-visto
  for (let i = idxAtual - 1; i >= 0; i--) {
    if (perfilTemNaoVisto(estado.ids[i])) return i;
  }

  // ⚠️ CORREÇÃO: se não achou não-visto, retorna o anterior adjacente.
  if (idxAtual > 0) return idxAtual - 1;

  return -1;
}

// ============================================
// PREPARAR / LIMPAR
// ============================================

function prepararPreviews() {
  const estado = obterEstado();
  if (!estado || !viewer) return;

  const idxAtual = estado.ids.indexOf(estado.getPerfilAtualId());

  // ⚠️ CORREÇÃO DE FLUIDEZ:
  //    Não recria se já existe (evita 2x criação).
  //    Se o cache de índices já bateu, usa ele.
  const idxProx = _idxProxCache >= 0
    ? _idxProxCache
    : proximoPerfilComNaoVisto(estado, idxAtual);

  const idxAnt = _idxAntCache >= 0
    ? _idxAntCache
    : anteriorPerfilComNaoVisto(estado, idxAtual);

  // Próximo
  if (idxProx >= 0 && !previewProx) {
    const perfilProx = estado.base[estado.ids[idxProx]];
    if (perfilProx) {
      previewProx = criarPreviewPerfilNex(perfilProx, 'prox');
      if (previewProx) viewer.appendChild(previewProx);
    }
  }

  // Anterior
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

  // ============================================
  // INÍCIO DO DRAG
  // ============================================

  function iniciarDrag(e) {
if (animando) return;
if (!e.touches || e.touches.length !== 1) return;

// ⚠️ Ignora toques em botões/controles
const alvo = e.target;
if (
  alvo.closest('.nearby-drop-close') ||
  alvo.closest('.nearby-drop-comment-box') ||
  alvo.closest('.nearby-drop-profile-btn') ||
  alvo.closest('.nearby-pub-stats-row') ||
  alvo.closest('.nearby-drop-expandir') ||
  alvo.closest('.nearby-pub-capsula-autor') ||
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

// ⚠️ CORREÇÃO DEFINITIVA:
//    Sempre reseta o flag vertical no início do gesto.
//    Se um gesto anterior falhou (touchcancel, etc.), esse flag
//    pode ter ficado travado em true e bloqueado o swipe horizontal
//    do 11-nearby.js pra sempre.
window.__nearbyScrollVerticalAtivo = false;

// ⚠️ Trava o scroll do body JÁ no touchstart.
//    'pan-x' (em vez de 'none') preserva a inércia nativa
//    do Chrome e evita a sensação de "peso morto".
document.body.style.overflow = 'hidden';
document.body.style.touchAction = 'pan-x';

// ⚠️ CORREÇÃO DE FLUIDEZ:
//    Pré-cria os previews AGORA (fora do touchmove).
//    Sem isso, o Chrome trava ~200ms no primeiro move
//    porque cria ~50 nós DOM de uma vez.
if (!previewProx || !previewAnt) {
  // Agenda pra próxima frame livre (não bloqueia o touchstart)
  setTimeout(prepararPreviews, 0);
}

// ⚠️ Cacheia os índices (evita recalcular 60x/s no touchmove)
const idxAtual = estado.ids.indexOf(estado.getPerfilAtualId());
_idxProxCache = proximoPerfilComNaoVisto(estado, idxAtual);
_idxAntCache = anteriorPerfilComNaoVisto(estado, idxAtual);
  }
  
// ============================================
// GUARDA: só age se o viewer do Nearby estiver visível
// ============================================
// Se algum modal estiver por cima, ignora o swipe.
//
// ⚠️ O overlay do onboarding NÃO bloqueia — ele fica por cima
//    do viewer por alguns segundos, mas o usuário PRECISA
//    conseguir arrastar durante ele.

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

  // ============================================
  // MOVIMENTO
  // ============================================

function moverDrag(e) {
  if (!swipeAtivo || animando) return;
  if (!e.touches || e.touches.length !== 1) return;

  const dx = e.touches[0].clientX - startX;
  const dy = e.touches[0].clientY - startY;

  // ============================================
  // AINDA NÃO DEFINIU DIREÇÃO
  // ============================================
  if (!direcao) {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // ⚠️ Threshold menor (4px) — o Chrome mobile perde os primeiros px
    if (absX < 4 && absY < 4) return;

    // ⚠️ Vertical tem prioridade (1.2 em vez de 1.3)
if (absY >= absX * 1.2) {
  direcao = 'vertical';
  // (body continua travado com pan-x — só limpa no soltar)
} else if (absX >= absY * 1.2) {
  direcao = 'horizontal';
  swipeAtivo = false;

  // ⚠️ CORREÇÃO DEFINITIVA:
  //    No horizontal, o 38-*.js ABDICA do gesto. Precisa limpar
  //    TUDO pra o 11-nearby.js pegar o touchend normalmente.
  window.__nearbyScrollVerticalAtivo = false;
  document.body.style.overflow = '';
  document.body.style.touchAction = '';

  return;
} else {
  return; // diagonal — aguarda próximo move
}

    // Reancora no ponto atual (evita "pulo" de 4px)
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

    // ⚠️ Avisa o 11-nearby.js ANTES de qualquer coisa
    window.__nearbyScrollVerticalAtivo = true;

    prepararPreviews();

    if (shell) shell.style.transition = 'none';
  }

  if (direcao !== 'vertical') return;

  // ⚠️ CORREÇÃO CHROME MOBILE:
  //    preventDefault SEMPRE no vertical, sem checar 'cancelable'
  //    (o Chrome às vezes marca como não-cancelable mesmo podendo
  //    ser prevenido — o try/catch protege).
  try {
    if (e.cancelable) e.preventDefault();
  } catch (_) {}

  aplicarMovimentoVertical(e, dy);
}


  // ⚠️ Extraído pra função própria — assim fica reutilizável
//    tanto quando detecta direção nova quanto quando já tá travado
function aplicarMovimentoVertical(e, dy) {
  const altura = alturaTela();

  // ⚠️ CORREÇÃO DE FLUIDEZ:
  //    Usa os índices cacheados no iniciarDrag (evita iterar
  //    todos os drops de todos os perfis a cada frame).
  //    Se o cache falhou por algum motivo, refaz 1x só.
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

  // ⚠️ Resistência progressiva (quanto mais puxa, mais "pesado" fica)
  let yFinal = dy;
  if (dy < 0 && !podeProx) {
    yFinal = dy * 0.12;
  } else if (dy > 0 && !podeAnt) {
    yFinal = dy * 0.12;
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

  // ⚠️ Sempre limpa o body, independente do que aconteceu.
  document.body.style.overflow = '';
  document.body.style.touchAction = '';

  // ⚠️ Limpa o cache de índices
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

// ============================================
// TENTOU PASSAR DO ÚLTIMO PERFIL?
// ============================================
// ⚠️ idxProx === -1 só acontece quando já está no ÚLTIMO perfil.
//    Mostra o balão "Você já viu tudo" + bounce de volta.
if (deltaY < -limiar && idxProx === -1) {
  mostrarBalaoLimiteNex('final');
  voltarAoInicio();
  return;
}

// ============================================
// TENTOU PASSAR DO PRIMEIRO PERFIL?
// ============================================
// ⚠️ idxAnt === -1 só acontece quando já está no PRIMEIRO perfil.
if (deltaY > limiar && idxAnt === -1) {
  mostrarBalaoLimiteNex('inicio');
  voltarAoInicio();
  return;
}

// ============================================
// NAVEGAÇÃO NORMAL
// ============================================

if (deltaY < -limiar && idxProx >= 0) {
  encaixarNoProximo(estado, idxProx);
} else if (deltaY > limiar && idxAnt >= 0) {
  encaixarNoAnterior(estado, idxAnt);
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

// ⚠️ CORREÇÃO DE FLUIDEZ:
//    No "voltar" (cancelou o gesto), overshoot fica parecendo
//    tremedeira. Usa curva sem overshoot (ease-out clássico).
//    O overshoot fica reservado pro "encaixe" (parece natural lá).
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

// ============================================
// BALÃO DE LIMITE — "Você já viu tudo por aqui"
// ============================================
// direcao: 'final' (tentou passar do último)
//        | 'inicio' (tentou passar do primeiro)

function mostrarBalaoLimiteNex(direcao) {
  // ⚠️ Usa o toast padrão do app (mesmo visual do resto do sistema)
  if (typeof window.mostrarToastNex !== 'function') return;

  const ehFinal = direcao === 'final';

  const mensagem = ehFinal
    ? '🎉 Você já viu tudo por aqui'
    : '🏁 Você já está no início';

  window.mostrarToastNex(mensagem, 'info', 2200);
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

    // ⚠️ CORREÇÃO CRÍTICA:
    //    NÃO damos preventDefault aqui. O preventDefault só deve
    //    rodar dentro do moverDrag, DEPOIS que a direção for
    //    confirmada como VERTICAL.
    //
    //    Se dermos preventDefault no horizontal, o Chrome cancela
    //    o gesto e dispara touchcancel em vez de touchend — o
    //    swipe horizontal do 11-nearby.js nunca dispara, e o
    //    vídeo fica "travado".
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
    // ⚠️ CORREÇÃO DEFINITIVA:
    //    Não usa early-return aqui. Mesmo que swipeAtivo seja
    //    false, precisamos limpar o flag vertical e o body.
    //    Isso cobre o caso onde o Chrome dispara touchcancel
    //    depois de já termos detectado horizontal (caso raro,
    //    mas possível em vídeos).
    swipeAtivo = false;
    direcao = null;
    limparPreviews();
    resetarShell();
    window.__nearbyScrollVerticalAtivo = false;

    document.body.style.overflow = '';
    document.body.style.touchAction = '';

    _idxProxCache = -1;
    _idxAntCache = -1;
  },
  { passive: true, capture: true }
 );
}

  // ============================================
// EXPOE LIMPEZA GLOBAL
// ============================================

window.__limparCacheNaoVistoNex = limparCacheNaoVisto;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', registrar);
  
    console.log('🌀 38-nearby-scroll-continuo.js carregado');

})();
