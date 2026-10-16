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

  // ============================================
  // HELPERS
  // ============================================

  function alturaTela() {
  // ⚠️ Usa a altura REAL do shell (100dvh) — window.innerHeight
  //    pode ser diferente no mobile, causando desalinhamento entre
  //    o shell e o preview (some o rodapé durante o arrasto).
  if (shell && shell.offsetHeight) return shell.offsetHeight;
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

// ⚠️ Ignora toques em botões/controles — senão o "soltar" do drag
//    vira um clique fantasma (ex: botão expandir)
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
}

// ============================================
// GUARDA: só age se o viewer do Nearby estiver visível
// ============================================
// Se por algum motivo o viewer saiu da tela (modal aberto,
// outra tela em cima), ignora o swipe e RESETA o estado.

function viewerNearbyVisivel() {
  const v = document.querySelector('.nearby-drop-viewer');
  if (!v) {
    // Sem viewer no DOM = não é problema, é só outra tela.
    // Não mostra toast.
    return false;
  }

  // Se algum modal ou tela estiver por cima, considera invisível
const seletores = [
  '.modal-msg-nex[style*="display: flex"]',
  '.mural-overlay-nex[style*="display: flex"]',
  '.onb-viewer-overlay-nex.visivel',
  '#modalDuracaoPublicacaoMyDropsNex:not(.hidden)',
  '.mydrops-publication-viewer',
  '.chatNex.active',
  '#chatNex.active'
];

    for (const sel of seletores) {
    if (document.querySelector(sel)) {
      return false;
    }
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

  // ⚠️ Se já tá em vertical, trava. Não deixa "virar" pro lado
  //    no meio do gesto (dá briga com o 11-nearby.js)
  if (direcao === 'vertical') {
    if (e.cancelable) e.preventDefault();
    aplicarMovimentoVertical(e, dy);
    return;
  }

  if (!direcao) {
  direcao = detectarDirecao(dx, dy);

  if (direcao === 'vertical') {
    // ⚠️ REANCORA no ponto atual. Sem isso, os primeiros 8px
    //    de detecção somem e o shell "pula" pra posição errada.
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;

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

  aplicarMovimentoVertical(e, dy);
}

// ⚠️ Extraído pra função própria — assim fica reutilizável
//    tanto quando detecta direção nova quanto quando já tá travado
function aplicarMovimentoVertical(e, dy) {
  const altura = alturaTela();
  const estado = obterEstado();
  if (!estado) return;

    const idxAtual = estado.ids.indexOf(estado.getPerfilAtualId());
    const podeProx = idxAtual < estado.ids.length - 1;
    const podeAnt = idxAtual > 0;

    // ⚠️ Resistência progressiva: quanto mais puxa, mais "pesado" fica.
//    Fórmula: yFinal = dy * (fatorBase / (1 + excesso/altura))
//    No começo da puxada resiste pouco; no fim, quase não anda.
let yFinal = dy;
if (dy < 0 && !podeProx) {
  const excesso = Math.abs(dy);
  const fatorDinamico = FATOR_RESISTENCIA / (1 + excesso / altura);
  yFinal = dy * fatorDinamico;
} else if (dy > 0 && !podeAnt) {
  const excesso = Math.abs(dy);
  const fatorDinamico = FATOR_RESISTENCIA / (1 + excesso / altura);
  yFinal = dy * fatorDinamico;
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

    // ⚠️ Bloqueia o scroll nativo JÁ na primeira chamada,
    //    antes de detectar a direção. Senão os primeiros ~8px
    //    "pulam" porque o navegador move a página antes do JS assumir.
    if (e.cancelable) e.preventDefault();

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

