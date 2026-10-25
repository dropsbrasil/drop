/* ============================================
   11-NEARBY.JS
   Tela Nearby, viewer de drops, reações em drops
   
   Depende de: 00-config.js, 03-utils.js, 08-perfil.js, 10-adeptos.js
============================================ */

(function () {
  'use strict';

    // ============================================
// MAPA: chave local → id uuid do Supabase
// ============================================
window.__dropsMapaIdsPublicacao = window.__dropsMapaIdsPublicacao || {};

  // ============================================
  // CACHE DO NEARBY (Economia de Cota)
  // ============================================
  
  let ultimaLatNearbyNex = null;
  let ultimaLngNearbyNex = null;
  let cachePerfisNearbyNex = null;
  let cacheRaioNearbyNex = 5000;
  let cacheTimeoutNex = null;
  const DISTANCIA_MINIMA_METROS = 500;

// ⚠️ DADOS FAKES REMOVIDOS. O Nearby busca 100% no Supabase.
const publicacoesNearbyNex = {
  conectados: {},
  nearby: {}
};

  // ============================================
  // BUSCAR PERFIL POR ID OU NOME
  // ============================================

  function buscarPerfilNearbyNex(perfilId, perfilNome) {
    const nomeBusca = String(perfilNome || '').trim().toLowerCase();
    const idBusca = String(perfilId || '').trim();

    const bases = [
      ['conectados', publicacoesNearbyNex?.conectados || {}],
      ['nearby', publicacoesNearbyNex?.nearby || {}]
    ];

    for (const [tipo, base] of bases) {
      if (idBusca && base[idBusca]) {
        return { perfil: base[idBusca], tipo, id: idBusca };
      }

      for (const [id, perfil] of Object.entries(base)) {
        const nome = String(perfil?.nome || '').trim().toLowerCase();

        if (nomeBusca && nome === nomeBusca) {
          return { perfil, tipo, id };
        }
      }
    }

    return null;
  }

  // ============================================
  // ABRIR DROP COMENTADO
  // ============================================

  async function abrirDropComentadoNex(perfilId, perfilNome, dropIndex = 0) {
  const achado = buscarPerfilNearbyNex(perfilId, perfilNome);

  if (achado) {
    abrirViewerPublicacaoNex(
      achado.perfil,
      achado.tipo,
      achado.id,
      dropIndex
    );
    return;
  }

  const usernameLimpo = String(perfilId || '')
    .replace(/^@/, '')
    .toLowerCase()
    .trim();

  if (!usernameLimpo) return;

  if (typeof window.buscarTodosOsDropsComAutor !== 'function') return;

  let drops = [];

  try {
    drops = await window.buscarTodosOsDropsComAutor(100);
  } catch (err) {
    console.warn('Erro ao buscar drops para abrir comentário:', err);
    return;
  }

  const dropsDoAutor = drops.filter((d) => {
    const autor = String(d.autorUsername || '')
      .replace(/^@/, '')
      .toLowerCase()
      .trim();
    return autor === usernameLimpo;
  });

  if (!dropsDoAutor.length) {
    window.mostrarToastNex?.('Drop não encontrado.', 'info');
    return;
  }

  if (typeof window.abrirDropRealNearbyNex === 'function') {
    const dropAlvo = dropsDoAutor[dropIndex] || dropsDoAutor[0];
    window.abrirDropRealNearbyNex(dropAlvo, drops);
  } else {
    window.mostrarToastNex?.('Viewer não disponível.', 'erro');
  }
  }
    // ============================================
  // REAÇÕES EM DROPS (Mapas em memória)
  // ============================================

  const reacoesDropsNex = new Map();
  const reacoesUsuarioDropNex = new Map();

  // ============================================
  // ESTATÍSTICAS DE REAÇÃO DE UM DROP
  // ============================================

  function obterStatsReacaoDropNex(perfilId, dropIndex, url) {
  if (
    typeof window.obterStatsReacaoNex === 'function' &&
    typeof window.chaveDropPerfilNex === 'function'
  ) {
    const chave = window.chaveDropPerfilNex(perfilId, dropIndex, url);
    return window.obterStatsReacaoNex(chave);
  }

  return (
    reacoesDropsNex.get(chaveReacaoDropNex(perfilId, dropIndex, url)) || {
      heart: 0,
      broken: 0
    }
  );
}

function obterReacaoUsuarioDropNex(perfilId, dropIndex, url, usuarioId) {
  if (
    typeof window.obterReacaoUsuarioNex === 'function' &&
    typeof window.chaveDropPerfilNex === 'function'
  ) {
    const chave = window.chaveDropPerfilNex(perfilId, dropIndex, url);
    return window.obterReacaoUsuarioNex(chave, usuarioId);
  }

  return (
    reacoesUsuarioDropNex.get(
      chaveUsuarioReacaoDropNex(perfilId, dropIndex, url, usuarioId)
    ) || ''
  );
}

  // ============================================
  // REGISTRAR REAÇÃO EM UM DROP
  // ============================================

    function registrarReacaoDropNex(
  perfilId,
  dropIndex,
  url,
  emoji,
  usuarioId = 'local'
) {
  const chaveDrop = window.chaveDropPerfilNex
    ? window.chaveDropPerfilNex(perfilId, dropIndex, url)
    : chaveReacaoDropNex(perfilId, dropIndex, url);

if (typeof window.alternarReacaoSupabase === 'function') {
  const publicacaoId =
    window.__dropsMapaIdsPublicacao &&
    window.__dropsMapaIdsPublicacao[chaveDrop];

  if (publicacaoId) {
    window
      .alternarReacaoSupabase(publicacaoId, emoji)
      .catch((err) => console.warn('Erro Supabase reação:', err));
  }
}

  if (typeof window.alternarReacaoNex === 'function') {
    const resultado = window.alternarReacaoNex(chaveDrop, usuarioId, emoji);

    const keyUser = chaveUsuarioReacaoDropNex(
      perfilId,
      dropIndex,
      url,
      usuarioId
    );
    reacoesDropsNex.set(chaveDrop, {
      heart: resultado.heart,
      broken: resultado.broken
    });
    reacoesUsuarioDropNex.set(keyUser, resultado.reacaoAtual);

    if (resultado.reacaoAtual) {
      registrarInteracaoNex(
        perfilId,
        resultado.reacaoAtual === '❤️' ? 'like' : 'deslike',
        `${perfilId}::${dropIndex}`
      );
    }

    return resultado;
  }

  const estatisticas = reacoesDropsNex.get(chaveDrop) || {
    heart: 0,
    broken: 0
  };
  const keyUser = chaveUsuarioReacaoDropNex(
    perfilId,
    dropIndex,
    url,
    usuarioId
  );
  const reacaoAnterior = reacoesUsuarioDropNex.get(keyUser) || '';

  if (reacaoAnterior === emoji) return;

  if (reacaoAnterior === '❤️') {
    estatisticas.heart = Math.max(0, estatisticas.heart - 1);
  }
  if (reacaoAnterior === '💔') {
    estatisticas.broken = Math.max(0, estatisticas.broken - 1);
  }

  if (emoji === '❤️') estatisticas.heart += 1;
  if (emoji === '💔') estatisticas.broken += 1;

  reacoesDropsNex.set(chaveDrop, estatisticas);
  reacoesUsuarioDropNex.set(keyUser, emoji);

  registrarInteracaoNex(
    perfilId,
    emoji === '❤️' ? 'like' : 'deslike',
    `${perfilId}::${dropIndex}`
  );
  }
  
// ============================================
// CALCULAR TEMPO DE EXPIRAÇÃO (texto amigável)
// ============================================
function calcularTempoExpiracaoNex(expiraEm) {
  if (!expiraEm) return 'Permanente';

  const ms = new Date(expiraEm).getTime() - Date.now();

  if (isNaN(ms)) return 'Permanente';
  if (ms <= 0) return 'Expirado';

  const seg = Math.floor(ms / 1000);
  const min = Math.floor(seg / 60);
  const h   = Math.floor(min / 60);
  const d   = Math.floor(h / 24);

  if (d >= 1)  return `Expira em ${d}d`;
  if (h >= 1)  return `Expira em ${h}h`;
  if (min >= 1) return `Expira em ${min}min`;

  return `Expira em ${seg}s`;
}

// ============================================
// CÁLCULO DE DISTÂNCIA (Haversine)
// ============================================
function calcularDistanciaMetrosNex(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (g) => (g * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================
// ANIMAÇÃO DE MÍDIA (Tinder + Scroll)
// ============================================

function animarMidiaNex(container, url, tipo, direcao) {
  if (!container || !url) return;

  const ehVideo =
    tipo === 'video' ||
    /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

  const novo = document.createElement('div');
  novo.className = 'nearby-pub-midia-item';

if (ehVideo) {
 const video = document.createElement('video');
 video.src = url;
 video.controls = true;
 video.setAttribute('controls', '');
 video.autoplay = false;
 video.muted = true;
 video.playsInline = true;
 video.preload = 'metadata';
 video.style.touchAction = 'pan-x';

 requestAnimationFrame(() => {
   requestAnimationFrame(() => {
     if (video.isConnected && video.paused) {
       video.play().catch(() => {});
     }
   });
 });

 novo.appendChild(video);

  const videoOverlay = document.createElement('div');
  videoOverlay.className = 'video-overlay-swipe-nex';
  videoOverlay.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 2;
    background: transparent;
    pointer-events: auto;
    cursor: pointer;
  `;

  videoOverlay.addEventListener('click', () => {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });

  novo.appendChild(videoOverlay);

} else {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    novo.appendChild(img);
 }

  let transformEntrada = 'translateX(100%)';
  let transformSaida = 'translateX(-100%)';

  if (direcao === 'left') {
    transformEntrada = 'translateX(100%)';
    transformSaida = 'translateX(-100%)';
  } else if (direcao === 'right') {
    transformEntrada = 'translateX(-100%)';
    transformSaida = 'translateX(100%)';
  } else if (direcao === 'down') {
    transformEntrada = 'translateY(100%)';
    transformSaida = 'translateY(-100%)';
  } else if (direcao === 'up') {
    transformEntrada = 'translateY(-100%)';
    transformSaida = 'translateY(100%)';
  }

  novo.style.transform = transformEntrada;
  novo.style.opacity = '0';

  const midiaAtual = container.querySelector('.nearby-pub-midia-item');

  container.appendChild(novo);

  void novo.offsetWidth;

  novo.style.transition =
  'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease';
novo.style.transform = 'translateX(0) translateY(0)';
novo.style.opacity = '1';

if (midiaAtual) {
  midiaAtual.style.transition =
    'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease';
  midiaAtual.style.transform = transformSaida;
  midiaAtual.style.opacity = '0';

      setTimeout(() => {
      if (midiaAtual.parentNode === container) {
        midiaAtual.remove();
      }
    }, 540);
  }
}

// ============================================
// OBTER DROPS DE UM PERFIL
// ============================================
  function obterDropsDoPerfil(perfil) {
    if (Array.isArray(perfil?.drops) && perfil.drops.length) {
      return perfil.drops;
    }

    return [
      {
        url: perfil?.imagem || '',
        type: 'image',
        views: perfil?.views || 128,
        expireText: perfil?.expireText || 'Expira em 4h'
      }
    ];
  }
    // ============================================
// ABRIR VIEWER DE PUBLICAÇÃO (TELA CHEIA)
// ============================================

function abrirViewerPublicacaoNex(
  post,
  tipo,
  id,
  dropIndexInicial = 0,
  baseOverride = null
) {
  if (!post) return;

  let base;

  if (baseOverride) {
    base = baseOverride;
  } else if (tipo === 'conectados') {
    base = {};
    lerConectadosMyDropsNex().forEach((perfil) => {
      const idPerfil = normalizarIdPerfilNex(perfil.id);
      if (!idPerfil) return;

      const dadosVisuais =
        publicacoesNearbyNex.conectados[idPerfil] ||
        publicacoesNearbyNex.nearby[idPerfil] ||
        {};

      base[idPerfil] = {
        id: idPerfil,
        nome: perfil.nome || dadosVisuais.nome || idPerfil,
        distancia: dadosVisuais.distancia || '',
        imagem: dadosVisuais.imagem || '',
        ...dadosVisuais
      };
    });
  } else {
    base = publicacoesNearbyNex.nearby;
  }

  const ids = Object.keys(base);

    let perfilAtualId = id && base[id] ? id : ids[0];
  let dropIndexAtual = Math.max(0, Number(dropIndexInicial) || 0);

let direcaoAnimacaoNex = 'left';
let primeiraRenderizacaoNex = true;

let swipeStartX = 0;
let swipeStartY = 0;
let swipeStartTime = 0;
let swipeAtivo = false;

const LIMITE_SWIPE = 35;
const TEMPO_MAX_SWIPE = 1500;
const TEMPO_GESTO_RAPIDO = 200;
const LIMITE_SWIPE_RAPIDO = 25;

const _midiasPreCarregadasNex = new Set();

function preCarregarDropsAdjacentesNex() {
  const perfil = base[perfilAtualId];
  if (!perfil) return;

  const drops = obterDropsDoPerfil(perfil);

  const alvos = [];
  if (dropIndexAtual > 0) alvos.push(drops[dropIndexAtual - 1]);
  if (dropIndexAtual < drops.length - 1) alvos.push(drops[dropIndexAtual + 1]);

  alvos.forEach((drop) => {
    if (!drop) return;

    const url = String(drop.url || drop.imagem || '');
    if (!url) return;
    if (_midiasPreCarregadasNex.has(url)) return;

    const tipo = String(drop.type || drop.tipo || '').toLowerCase();
    const ehVideo =
      tipo.includes('video') ||
      /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

    _midiasPreCarregadasNex.add(url);

    if (ehVideo) {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.playsInline = true;
      v.src = url;
    } else {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = url;
    }
  });
}
  
  const antigo = document.querySelector('.nearby-drop-viewer');
  if (antigo) antigo.remove();

  const viewer = document.createElement('div');
  viewer.className = 'nearby-drop-viewer';

  viewer.innerHTML = `
  <div class="nearby-drop-bg"></div>

  <div class="nearby-pub-shell">

    <div class="nearby-pub-topbar">
      <div class="nearby-pub-topbar-linha1">
        <div class="nearby-drop-user">
          <div class="nearby-drop-avatar" id="nearbyDropAvatar"></div>
          <div class="nearby-drop-user-meta">
            <strong id="nearbyDropNome"></strong>
            <span id="nearbyDropDistancia"></span>
            <small id="nearbyDropExpire"></small>
          </div>
        </div>

        <div class="nearby-pub-voltar-group">
          <span class="nearby-pub-counter" id="nearbyDropCounter">1/1</span>
          <button class="nearby-drop-close" type="button" aria-label="Voltar">➥</button>
        </div>
      </div>
    </div>

<div class="nearby-pub-palco">
  <div class="nearby-pub-papel" id="nearbyDropMedia"></div>

  <div class="nearby-pub-legenda" id="nearbyDropLegenda" style="display:none;">
    <p class="nearby-pub-legenda-texto" id="nearbyDropLegendaTexto"></p>
    <button type="button" class="nearby-pub-legenda-ver-mais" id="nearbyDropVerMais">Ver mais</button>
  </div>

  <div class="nearby-pub-barra-topo">
    <button type="button" class="nearby-drop-expandir" id="nearbyDropExpandir" aria-label="Expandir mídia">⤢</button>

    <div class="nearby-pub-capsula-autor" id="nearbyPubCapsulaAutor" style="display:none;">
      <div class="nearby-pub-capsula-autor-avatar"></div>
      <div class="nearby-pub-capsula-autor-texto">
        <span class="nearby-pub-capsula-autor-nome"></span>
        <span class="nearby-pub-capsula-autor-user"></span>
      </div>
      <svg class="nearby-pub-capsula-autor-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
    </div>
  </div>
</div>
    <div class="nearby-pub-rodape">
            <div class="nearby-drop-comment-box">
  <textarea class="nearby-drop-comment-input" placeholder="Comentar..." rows="1"></textarea>
  <button class="nearby-drop-reaction" type="button">❤️</button>
  <button class="nearby-drop-reaction" type="button">💔</button>
  <button class="nearby-drop-send" type="button" id="nearbyBtnAcaoRodapeNex" aria-label="Compartilhar ou enviar">
  <svg class="nearby-icone-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <polyline points="17 1 21 5 17 9"/>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
    <polyline points="7 23 3 19 7 15"/>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  </svg>
  <svg class="nearby-icone-share-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="17 1 21 5 17 9"/>
  <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
  <polyline points="7 23 3 19 7 15"/>
  <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
  <path class="nearby-check-azul" d="M9.5 13.5l2 2 3-3"/>
</svg>
  <svg class="nearby-icone-mudo-nex" id="nearbyIconeMudoNex" style="display: none;" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="1" y1="1" x2="23" y2="23"></line>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
  <span class="nearby-icone-send" aria-hidden="true">⌯⌲</span>
</button>
</div>
    </div>

    <div class="nearby-pub-stats-row">
      <div class="nearby-pub-stats-lista">
        <div class="nearby-drop-views">
          👁 <span id="nearbyDropViews">0</span>
        </div>
          <div class="nearby-drop-reactions" id="nearbyDropReactions"></div>
  <span class="nearby-drop-share-capsula" id="nearbyDropShareCapsula" style="display:none;"></span>
</div>

      <button class="nearby-drop-profile-btn" type="button">
        👣 Visitar perfil
      </button>
    </div>

  </div>
`;

            document.body.appendChild(viewer);

window.__nearbyScrollStateNex = {
  viewerRef: viewer,
  ids,
  base,
  obterDropsDoPerfil,
  getPerfilAtualId: () => perfilAtualId,
  getDropIndexAtual: () => dropIndexAtual,

  trocarPerfil: (novoIdx, direcao) => {
    if (novoIdx < 0 || novoIdx >= ids.length) return;

    perfilAtualId = ids[novoIdx];
    dropIndexAtual = 0;
    direcaoAnimacaoNex = direcao;

    primeiraRenderizacaoNex = true;

    renderizar();
  }
};

if (typeof window.mostrarOnboardingNearbyNex === 'function') {
  window.mostrarOnboardingNearbyNex();
}

 const btnVisitarPerfil = viewer.querySelector('.nearby-drop-profile-btn');

  if (tipo === 'perfil') {
    if (btnVisitarPerfil) btnVisitarPerfil.style.display = 'none';
  } else if (btnVisitarPerfil) {
btnVisitarPerfil.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();

  const perfil = base[perfilAtualId];
  if (!perfil) return;

  window.__dropsBloquearPopstate = true;

  abrirPerfilVisitadoNex(
  perfil.id || perfilAtualId || perfil.nome || '',
  perfil.nome || 'Perfil'
);

viewer.remove();
document.body.style.overflow = '';
document.body.classList.remove('viewer-aberto');

  setTimeout(() => {
    window.__dropsBloquearPopstate = false;
  }, 800);
});
  }

const btnExpandir = viewer.querySelector('#nearbyDropExpandir');

function entrarModoExpandidoNex() {
  if (!viewer) return;

  viewer.classList.add('modo-expandido');
  if (btnExpandir) btnExpandir.textContent = '⤡';
}

function sairModoExpandidoNex() {
  if (!viewer) return;

  viewer.classList.remove('modo-expandido');
  if (btnExpandir) btnExpandir.textContent = '⤢';
}

function toggleModoExpandidoNex() {
  if (!viewer) return;

  const estaExpandido = viewer.classList.contains('modo-expandido');

  if (estaExpandido) {
    sairModoExpandidoNex();
  } else {
    entrarModoExpandidoNex();
  }
}

if (btnExpandir) {
  btnExpandir.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleModoExpandidoNex();
  });
}

const inputComentario = viewer.querySelector('.nearby-drop-comment-input');
const botaoEnviar = viewer.querySelector('.nearby-drop-send');
const commentBox = viewer.querySelector('.nearby-drop-comment-box');
const setaEsquerda = viewer.querySelector('.nearby-drop-arrow-left');
const setaDireita = viewer.querySelector('.nearby-drop-arrow-right');

function atualizarEstadoEnviarNex() {
  const texto = (inputComentario?.value || '').trim();
  if (!botaoEnviar) return;

  const inputFocado = document.activeElement === inputComentario;
  const mostrarEnviar = !!texto || inputFocado;

  botaoEnviar.disabled = false;
  botaoEnviar.classList.toggle('is-active', !!texto);

  const commentBoxAtual = viewer.querySelector('.nearby-drop-comment-box');
  if (commentBoxAtual) {
    commentBoxAtual.classList.toggle('input-com-texto', mostrarEnviar);
  }
}

function entrarModoComentarioNex() {
  if (!commentBox) return;

  commentBox.classList.add('comentario-focado');

  if (setaEsquerda) setaEsquerda.style.display = 'none';
  if (setaDireita) setaDireita.style.display = 'none';

  viewer.querySelectorAll('.nearby-drop-reaction').forEach((btn) => {
    btn.style.display = 'none';
  });
}

function sairModoComentarioNex() {
  if (!commentBox) return;

  commentBox.classList.remove('comentario-focado');

  if (setaEsquerda) setaEsquerda.style.display = '';
  if (setaDireita) setaDireita.style.display = '';

  viewer.querySelectorAll('.nearby-drop-reaction').forEach((btn) => {
    btn.style.display = '';
  });
}

if (inputComentario) {
  atualizarEstadoEnviarNex();
  inputComentario.addEventListener('input', atualizarEstadoEnviarNex);

  inputComentario.addEventListener('focus', () => {
    entrarModoComentarioNex();
    atualizarEstadoEnviarNex();
  });

  inputComentario.addEventListener('blur', () => {
    const temTexto = (inputComentario.value || '').trim().length > 0;
    if (!temTexto) {
      sairModoComentarioNex();
    }
    atualizarEstadoEnviarNex();
  });
}

viewer.addEventListener('click', (e) => {
  if (e.target.closest('.nearby-drop-comment-box')) return;

  const temTexto = (inputComentario?.value || '').trim().length > 0;
  if (!temTexto) {
    sairModoComentarioNex();
  }
});
  
const btnVerMaisLegenda = viewer.querySelector('#nearbyDropVerMais');
const legendaTextoEl = viewer.querySelector('#nearbyDropLegendaTexto');

if (btnVerMaisLegenda && legendaTextoEl) {
  btnVerMaisLegenda.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const expandido = btnVerMaisLegenda.dataset.expandido === 'true';

    if (expandido) {
      legendaTextoEl.classList.remove('expandido');
      btnVerMaisLegenda.textContent = 'Ver mais';
      btnVerMaisLegenda.dataset.expandido = 'false';
    } else {
      legendaTextoEl.classList.add('expandido');
      btnVerMaisLegenda.textContent = 'Ver menos';
      btnVerMaisLegenda.dataset.expandido = 'true';
    }
  };
}

  viewer.querySelectorAll('.nearby-drop-reaction').forEach((btn) => {
  btn.addEventListener('click', () => {
    const perfil = base[perfilAtualId];
    const drops = obterDropsDoPerfil(perfil);
    const drop = drops[dropIndexAtual];

    if (!perfil || !drop) return;

    const perfilIdCalc = perfil.id || perfilAtualId || perfil.nome || '';
    const urlCalc = drop.url || drop.imagem || '';

    const autorLimpo = String(perfilIdCalc).toLowerCase();
    const meuUser = String(Drops.usernameAtual || '').toLowerCase();

    if (autorLimpo && autorLimpo === meuUser) {
      window.mostrarToastNex?.(
        'Você não pode reagir ao seu próprio drop.',
        'info'
      );
      return;
    }

    const usuarioId = Drops.usernameAtual || 'anonimo';

    registrarReacaoDropNex(
  perfilIdCalc,
  dropIndexAtual,
  urlCalc,
  btn.textContent.trim(),
  usuarioId
);

if (typeof window.feedbackNex?.reagiu === 'function') {
  window.feedbackNex.reagiu();
}

    btn.classList.remove('pop-anim');
    void btn.offsetWidth;
    btn.classList.add('pop-anim');
    setTimeout(() => btn.classList.remove('pop-anim'), 360);

    atualizarBotoesReacaoNex(viewer, perfilIdCalc, dropIndexAtual, urlCalc);

    const reacoesElAtual = viewer.querySelector('#nearbyDropReactions');

    if (reacoesElAtual) {
      const statsAtual = obterStatsReacaoDropNex(
        perfilIdCalc,
        dropIndexAtual,
        urlCalc
      );

      const totalAtual = statsAtual.heart + statsAtual.broken;

      if (totalAtual > 0) {
        reacoesElAtual.innerHTML = `
          <span class="nearby-drop-reaction-count">❤️${statsAtual.heart}</span>
          <span class="nearby-drop-reaction-count">💔${statsAtual.broken}</span>
        `;
        reacoesElAtual.style.display = 'inline-flex';
      } else {
        reacoesElAtual.innerHTML = '';
        reacoesElAtual.style.display = 'none';
      }
    }

    if (typeof renderChat === 'function') {
      renderChat(Drops.estado.conversaAtual);
    }
  });
});

  document.body.style.overflow = 'hidden';

    // ============================================
// GERAR FRAME DE VÍDEO (thumbnail como imagem)
// ============================================

function gerarFrameVideoNearbyNex(urlVideo) {
  return new Promise((resolve) => {
    if (!urlVideo) {
      resolve('');
      return;
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = urlVideo;

    let resolvido = false;

    const finalizar = (resultado) => {
      if (resolvido) return;
      resolvido = true;

      try {
        video.removeAttribute('src');
        video.load();
      } catch (e) {}

      resolve(resultado || '');
    };

    const timeout = setTimeout(() => finalizar(''), 6000);

    video.addEventListener('error', () => {
      clearTimeout(timeout);
      finalizar('');
    });

    video.addEventListener('loadeddata', () => {
      try {
        const alvo = Math.min(0.5, (video.duration || 1) / 2);
        video.currentTime = alvo;
      } catch (e) {
        tentarCapturar();
      }
    });

    video.addEventListener('seeked', () => {
      tentarCapturar();
    });

    function tentarCapturar() {
      try {
        const largura = video.videoWidth || 720;
        const altura = video.videoHeight || 1280;

        const canvas = document.createElement('canvas');
        canvas.width = largura;
        canvas.height = altura;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, largura, altura);

        const dataURL = canvas.toDataURL('image/jpeg', 0.8);

        clearTimeout(timeout);
        finalizar(dataURL);
      } catch (err) {
        console.warn('Falha ao gerar frame do vídeo:', err);
        clearTimeout(timeout);
        finalizar('');
      }
    }
  });
}

// ============================================
// ENVIAR COMENTÁRIO
// ============================================

async function enviarComentarioNearbyNex() {
  // ⚠️ Bloqueio de segurança: se estiver silenciado, não envia
  const perfil = base[perfilAtualId];
  if (perfil) {
    const perfilIdCalc = perfil.id || perfilAtualId || perfil.nome || '';
    const estouSilenciado = window.__quemMeSilenciouNex && window.__quemMeSilenciouNex.has(perfilIdCalc);
    if (estouSilenciado) {
      window.mostrarToastNex?.('Você está silenciado por este usuário.', 'erro');
      return;
    }
  }

  const texto = (inputComentario?.value || '').trim();
  if (!texto) return;
  
    const drops = obterDropsDoPerfil(perfil);
    const drop = drops[dropIndexAtual];

    if (!perfil || !drop) return;

    const nomeContato = perfil.nome || 'Perfil Nearby';
const chaveConversa = nomeContato;

const tipoDrop =
  drop.type === 'video' || drop.tipo === 'video' ? 'video' : 'imagem';

let urlAnexo = drop.url || drop.imagem || '';

if (tipoDrop === 'video' && urlAnexo) {
  const frame = await gerarFrameVideoNearbyNex(urlAnexo);

  if (frame) {
    urlAnexo = frame;
  }
}

const mensagemNearby = {
  id: gerarIdMensagemNex(),
  timestamp: Date.now(),
  side: 'right',
  nome: 'Eu',
  avatar: 'EU',
  ...obterDataHoraNex(),
  status: 'enviado',
  text: texto,
  anexo: {
    type: 'imagem',
    tipoOriginal: tipoDrop,
    url: urlAnexo,
    origem: 'nearby',
    perfilNome: nomeContato,
    perfilId: perfil.id || '',
    dropIndex: dropIndexAtual
  }
};

const usernameDestino =
  (window.__convUsernamesNex && window.__convUsernamesNex[nomeContato]) ||
  perfil.id ||
  nomeContato;

let convId = null;

if (typeof window.obterOuCriarConversaSupabase === 'function') {
  try {
    convId = await window.obterOuCriarConversaSupabase(usernameDestino);

    if (convId) {
      window.__convIdsNex = window.__convIdsNex || {};
      window.__convIdsNex[nomeContato] = convId;

      window.__convUsernamesNex = window.__convUsernamesNex || {};
      window.__convUsernamesNex[nomeContato] = usernameDestino;
    }
  } catch (err) {
    console.warn('Erro ao criar conversa no Supabase:', err);
  }
}

let msgSupabase = null;

if (
  convId &&
  typeof window.enviarMensagemSupabase === 'function'
) {
  try {
    msgSupabase = await window.enviarMensagemSupabase({
  conversa_id: convId,
  tipo: 'imagem',
  texto: texto,
  media_url: mensagemNearby.anexo?.url || null,
  media_meta: {
    origem: 'nearby',
    tipoOriginal: tipoDrop,
    perfilNome: nomeContato,
    perfilId: perfil.id || '',
    dropIndex: dropIndexAtual
  },
  resposta_a_id: null
});

    if (msgSupabase && msgSupabase.id) {
      mensagemNearby._supabaseId = msgSupabase.id;
    }
  } catch (err) {
    console.warn('Erro ao enviar comentário pro Supabase:', err);
  }
}

if (typeof registrarMensagemRecebidaNex === 'function') {
  registrarMensagemRecebidaNex(nomeContato, mensagemNearby, false);
} else {
  if (!conversas[chaveConversa]) {
    conversas[chaveConversa] = [];
  }
  conversas[chaveConversa].push(mensagemNearby);
}

if (
  typeof window.criarCardConversaNex === 'function' &&
  typeof window.obterCardConversaNex === 'function' &&
  !window.obterCardConversaNex(nomeContato)
) {
  window.criarCardConversaNex(
    nomeContato,
    false,
    { text: texto },
    'enviada'
  );
}

if (typeof marcarConversaComoNaoLidaNex === 'function') {
  marcarConversaComoNaoLidaNex(nomeContato, false);
}

if (
  typeof renderChat === 'function' &&
  Drops.estado.conversaAtual === chaveConversa
) {
  renderChat(chaveConversa);
}

        if (inputComentario) {
  inputComentario.value = 'Você enviou um comentário.';
  atualizarEstadoEnviarNex();

  sairModoComentarioNex();

  inputComentario.blur();

  setTimeout(() => {
    inputComentario.value = '';
    atualizarEstadoEnviarNex();
  }, 1200);
        }

if (typeof window.feedbackNex?.comentou === 'function') {
  window.feedbackNex.comentou();
}

registrarInteracaoNex(
  perfil.id || perfilAtualId || perfil.nome || '',
  'comment',
  `nearby::${dropIndexAtual}`
);
}
  if (botaoEnviar) {
  botaoEnviar.addEventListener('click', () => {
    const temTexto = (inputComentario?.value || '').trim().length > 0;

    if (temTexto) {
      enviarComentarioNearbyNex();
    } else {
      compartilharDropNearbyNex();
    }
  });
}

// ============================================
// COMPARTILHAR DROP
// ============================================

async function compartilharDropNearbyNex() {
  const perfil = base[perfilAtualId];
  const drops = obterDropsDoPerfil(perfil);
  const drop = drops[dropIndexAtual];

  if (!perfil || !drop) return;

  const perfilIdCalc = perfil.id || perfilAtualId || perfil.nome || '';
  const urlCalc = drop.url || drop.imagem || '';

  const meuUser = String(Drops.usernameAtual || '').toLowerCase().trim();
  const autorLimpo = String(perfilIdCalc).toLowerCase().trim();

  if (autorLimpo && autorLimpo === meuUser) {
    window.mostrarToastNex?.(
      'Você não pode compartilhar seu próprio drop.',
      'info'
    );
    return;
  }

  const chaveDrop = window.chaveDropPerfilNex
    ? window.chaveDropPerfilNex(perfilIdCalc, dropIndexAtual, urlCalc)
    : `${perfilIdCalc}::${dropIndexAtual}::${urlCalc}`;

  const publicacaoId =
    window.__dropsMapaIdsPublicacao &&
    window.__dropsMapaIdsPublicacao[chaveDrop];

  if (!publicacaoId) {
    window.mostrarToastNex?.(
      'Drop muito antigo. Não é possível compartilhar.',
      'info'
    );
    return;
  }

  if (typeof window.compartilharPublicacaoSupabase !== 'function') {
    window.mostrarToastNex?.('Sistema indisponível.', 'erro');
    return;
  }

  const btn = viewer.querySelector('#nearbyBtnAcaoRodapeNex');
  if (btn) btn.style.pointerEvents = 'none';

  try {
    const resultado = await window.compartilharPublicacaoSupabase(publicacaoId);

        if (resultado?.ok) {
  window.mostrarToastNex?.('Drop compartilhado!', 'sucesso');

  if (btn) btn.classList.add('ja-compartilhado');

  if (publicacaoId) {
    atualizarCapsulaShareNearbyNex(publicacaoId);
  }

  if (typeof window.feedbackNex?.comentou === 'function') {
    window.feedbackNex.comentou();
  }
  
} else if (resultado?.erro === 'ja_compartilhado') {
  if (btn) btn.classList.add('ja-compartilhado');
  window.mostrarToastNex?.('Você já compartilhou esse drop.', 'info');
} else if (resultado?.erro === 'proprio_drop') {
  window.mostrarToastNex?.('Você não pode compartilhar seu próprio drop.', 'info');
} else if (resultado?.erro === 'falha_insert') {
  window.mostrarToastNex?.(
    'E1: ' + (resultado?.codigo || '?') + ' - ' + (resultado?.detalhe || 'falha ao criar publicação.'),
    'erro',
    8000
  );
} else if (resultado?.erro === 'falha_registro') {
  window.mostrarToastNex?.(
    'E2: ' + (resultado?.codigo || '?') + ' - ' + (resultado?.detalhe || 'falha ao registrar.'),
    'erro',
    8000
  );
} else if (resultado?.erro === 'original_nao_encontrado') {
  window.mostrarToastNex?.('Erro 3: drop original não encontrado.', 'erro', 5000);
} else if (resultado?.erro === 'sem_usuario') {
  window.mostrarToastNex?.('Erro 4: usuário não autenticado.', 'erro', 5000);
} else {
  window.mostrarToastNex?.('Erro 5: ' + (resultado?.erro || 'desconhecido'), 'erro', 5000);
    }
  } catch (err) {
    console.warn('Erro ao compartilhar:', err);
    window.mostrarToastNex?.('Falha ao compartilhar.', 'erro');
  } finally {
    if (btn) btn.style.pointerEvents = '';
  }
}

window.compartilharDropNearbyNex = compartilharDropNearbyNex;

// ============================================
// RENDERIZAR O VIEWER
// ============================================

const dropsJaSincronizados = new Set();
const viewsJaRegistradas = new Set();

function renderizar() {
  const perfil = base[perfilAtualId];
  if (!perfil) return;

  const commentBoxAtual = viewer.querySelector('.nearby-drop-comment-box');

if (commentBoxAtual && commentBoxAtual.classList.contains('comentario-focado')) {
  const inputAtual = viewer.querySelector('.nearby-drop-comment-input');
  if (inputAtual) inputAtual.value = '';

  commentBoxAtual.classList.remove('comentario-focado');

  viewer.querySelectorAll('.nearby-drop-reaction').forEach((btn) => {
    btn.style.display = '';
  });

  const setaL = viewer.querySelector('.nearby-drop-arrow-left');
  const setaR = viewer.querySelector('.nearby-drop-arrow-right');
  if (setaL) setaL.style.display = '';
  if (setaR) setaR.style.display = '';
}

if (viewer.classList.contains('modo-expandido')) {
  viewer.classList.remove('modo-expandido');
  const btnExp = viewer.querySelector('#nearbyDropExpandir');
  if (btnExp) btnExp.textContent = '⤢';
}

      const drops = obterDropsDoPerfil(perfil);
      const drop = drops[dropIndexAtual] || drops[0];
      const avatar = viewer.querySelector('#nearbyDropAvatar');
      const nome = viewer.querySelector('#nearbyDropNome');
      const distancia = viewer.querySelector('#nearbyDropDistancia');
      const expire = viewer.querySelector('#nearbyDropExpire');
      const counter = viewer.querySelector('#nearbyDropCounter');
      const views = viewer.querySelector('#nearbyDropViews');
      const media = viewer.querySelector('#nearbyDropMedia');

      if (avatar) {
  const avatarUrl = perfil.avatar;

  if (
    avatarUrl &&
    typeof avatarUrl === 'string' &&
    (avatarUrl.startsWith('http') ||
      avatarUrl.startsWith('data:image'))
  ) {
    avatar.style.backgroundImage = `url('${avatarUrl}')`;
    avatar.style.backgroundSize = 'cover';
    avatar.style.backgroundPosition = 'center';
    avatar.textContent = '';
  } else {
    avatar.style.backgroundImage = 'none';
    avatar.textContent = (perfil.nome || '?')
      .charAt(0)
      .toUpperCase();
  }
}
if (nome) nome.textContent = perfil.nome || 'Perfil';
      if (distancia) distancia.textContent = perfil.distancia || '';
      if (expire) {
  expire.textContent = calcularTempoExpiracaoNex(drop.expiraEm);
      }

      const selosAntigosNearby = viewer.querySelector('.selos-origem');
      if (selosAntigosNearby) selosAntigosNearby.remove();

      if (drop.selos && typeof window.gerarHTMLSelos === 'function') {
        const metaWrapNearby = viewer.querySelector('.nearby-drop-user-meta');
        if (metaWrapNearby) {
          metaWrapNearby.insertAdjacentHTML('beforeend', window.gerarHTMLSelos(drop.selos));
        }
      }
      if (counter) {
  counter.textContent = `${dropIndexAtual + 1}/${drops.length}`;
}
if (views) views.textContent = drop.views || 0;

const capsulaAutorNearby = viewer.querySelector('#nearbyPubCapsulaAutor');

if (capsulaAutorNearby) {
  const temCompartilhamento = !!drop.compartilhado_de_id;

  if (!temCompartilhamento) {
    capsulaAutorNearby.style.display = 'none';
  } else {
    capsulaAutorNearby.style.display = 'inline-flex';

    const avatarEl = capsulaAutorNearby.querySelector('.nearby-pub-capsula-autor-avatar');
    const nomeEl = capsulaAutorNearby.querySelector('.nearby-pub-capsula-autor-nome');
    const userEl = capsulaAutorNearby.querySelector('.nearby-pub-capsula-autor-user');

    if (avatarEl) {
      if (drop.compartilhado_de_avatar) {
        avatarEl.innerHTML = `<img src="${escapeHTML(drop.compartilhado_de_avatar)}" alt="">`;
      } else {
        avatarEl.textContent = (drop.compartilhado_de_nome || '?')
          .charAt(0)
          .toUpperCase();
      }
    }

    if (nomeEl) {
      nomeEl.textContent = drop.compartilhado_de_nome || '';
    }

    if (userEl) {
      const userLimpo = String(drop.compartilhado_de_username || '')
        .replace(/^@/, '')
        .trim();
      userEl.textContent = userLimpo ? '@' + userLimpo : '';
    }
  }
}
  
const legendaEl = viewer.querySelector('#nearbyDropLegenda');
const legendaTextoEl = viewer.querySelector('#nearbyDropLegendaTexto');
const btnVerMaisLegenda = viewer.querySelector('#nearbyDropVerMais');

const temLegenda =
  drop.legenda &&
  typeof drop.legenda === 'string' &&
  drop.legenda.trim().length > 0;

if (legendaEl && legendaTextoEl && btnVerMaisLegenda) {
  if (temLegenda) {
    legendaEl.style.display = 'flex';
    legendaTextoEl.textContent = drop.legenda.trim();
    legendaTextoEl.classList.remove('expandido');
    btnVerMaisLegenda.classList.remove('visivel');
    btnVerMaisLegenda.dataset.expandido = 'false';
    btnVerMaisLegenda.textContent = 'Ver mais';

    setTimeout(() => {
      if (legendaTextoEl.scrollHeight > legendaTextoEl.clientHeight + 2) {
        btnVerMaisLegenda.classList.add('visivel');
      }
    }, 30);
  } else {
    legendaEl.style.display = 'none';
  }
}

      const reacoesEl = viewer.querySelector('#nearbyDropReactions');
const perfilIdCalc = perfil.id || perfilAtualId || perfil.nome || '';
const urlCalc = drop.url || drop.imagem || '';

const stats = obterStatsReacaoDropNex(
  perfilIdCalc,
  dropIndexAtual,
  urlCalc
);

const totalReacoes = stats.heart + stats.broken;

atualizarBotoesReacaoNex(viewer, perfilIdCalc, dropIndexAtual, urlCalc);

// ⚠️ VERIFICA SE FUI SILENCIADO PELO AUTOR DESTE DROP
const estouSilenciado = window.__quemMeSilenciouNex && window.__quemMeSilenciouNex.has(perfilIdCalc);

const commentInputAtual = viewer.querySelector('.nearby-drop-comment-input');
const btnEnviarAtual = viewer.querySelector('#nearbyBtnAcaoRodapeNex');
const iconeMudoAtual = viewer.querySelector('#nearbyIconeMudoNex');
const iconeShareAtual = viewer.querySelector('.nearby-icone-share');
const iconeShareCheckAtual = viewer.querySelector('.nearby-icone-share-check');
const iconeSendSpanAtual = viewer.querySelector('.nearby-icone-send');

if (estouSilenciado) {
  if (commentInputAtual) {
    commentInputAtual.disabled = true;
    commentInputAtual.placeholder = 'Você foi silenciado';
    commentInputAtual.style.background = 'rgba(255, 255, 255, 0.05)';
    commentInputAtual.style.color = '#64748b';
  }
  if (btnEnviarAtual) btnEnviarAtual.disabled = true;
  if (iconeMudoAtual) iconeMudoAtual.style.display = 'block';
  if (iconeShareAtual) iconeShareAtual.style.display = 'none';
  if (iconeShareCheckAtual) iconeShareCheckAtual.style.display = 'none';
  if (iconeSendSpanAtual) iconeSendSpanAtual.style.display = 'none';
} else {
  if (commentInputAtual) {
    commentInputAtual.disabled = false;
    commentInputAtual.placeholder = 'Comentar...';
    commentInputAtual.style.background = '';
    commentInputAtual.style.color = '';
  }
  if (btnEnviarAtual) btnEnviarAtual.disabled = false;
  if (iconeMudoAtual) iconeMudoAtual.style.display = 'none';
  if (iconeShareAtual) iconeShareAtual.style.display = '';
  if (iconeShareCheckAtual) iconeShareCheckAtual.style.display = '';
  if (iconeSendSpanAtual) iconeSendSpanAtual.style.display = '';
}

if (reacoesEl) {
  if (totalReacoes > 0) {
    reacoesEl.innerHTML = `
      <span class="nearby-drop-reaction-count">❤️${stats.heart}</span>
      <span class="nearby-drop-reaction-count">💔${stats.broken}</span>
    `;
    reacoesEl.style.display = 'inline-flex';
  } else {
    reacoesEl.innerHTML = '';
    reacoesEl.style.display = 'none';
  }
      }
  const chaveDropAtual = window.chaveDropPerfilNex
  ? window.chaveDropPerfilNex(perfilIdCalc, dropIndexAtual, urlCalc)
  : `${perfilIdCalc}::${dropIndexAtual}::${urlCalc}`;

const publicacaoIdAtual =
  window.__dropsMapaIdsPublicacao &&
  window.__dropsMapaIdsPublicacao[chaveDropAtual];

const ehTrocaHorizontal =
  !primeiraRenderizacaoNex &&
  (direcaoAnimacaoNex === 'left' || direcaoAnimacaoNex === 'right');

if (
  publicacaoIdAtual &&
  window.dropsVistosNex?.marcarVisto
) {
  window.dropsVistosNex.marcarVisto(publicacaoIdAtual);

  if (window.__limparCacheNaoVistoNex) {
    window.__limparCacheNaoVistoNex();
  }
}
  
if (
  publicacaoIdAtual &&
  typeof window.buscarReacoesSupabase === 'function' &&
  !dropsJaSincronizados.has(chaveDropAtual) &&
  !ehTrocaHorizontal
) {
  dropsJaSincronizados.add(chaveDropAtual);

  window
    .buscarReacoesSupabase(publicacaoIdAtual)
    .then((dadosSupabase) => {
      if (!dadosSupabase) return;

      const totalSupabase =
        dadosSupabase.heart + dadosSupabase.broken;

      if (reacoesEl) {
        if (totalSupabase > 0) {
          reacoesEl.innerHTML = `
            <span class="nearby-drop-reaction-count">❤️${dadosSupabase.heart}</span>
            <span class="nearby-drop-reaction-count">💔${dadosSupabase.broken}</span>
          `;
          reacoesEl.style.display = 'inline-flex';
        } else {
          reacoesEl.innerHTML = '';
          reacoesEl.style.display = 'none';
        }
      }

      viewer
        .querySelectorAll('.nearby-drop-reaction')
        .forEach((b) => {
          const emojiBtn = b.textContent.trim();
          b.classList.toggle(
            'ativo',
            emojiBtn === dadosSupabase.minhaReacao
          );
        });
    })
    .catch((err) =>
      console.warn('Erro ao buscar reações Supabase:', err)
    );
}

if (
  publicacaoIdAtual &&
  typeof window.registrarVisualizacaoSupabase === 'function' &&
  !viewsJaRegistradas.has(chaveDropAtual)
) {
  const eu = String(Drops.usernameAtual || '')
    .replace(/^@/, '')
    .toLowerCase()
    .trim();

  const autor = String(perfilIdCalc || '')
    .replace(/^@/, '')
    .toLowerCase()
    .trim();

  if (autor && autor !== eu) {
    viewsJaRegistradas.add(chaveDropAtual);

    window
      .registrarVisualizacaoSupabase(publicacaoIdAtual)
      .then(() => {
        if (views && typeof window.buscarVisualizacoesSupabase === 'function') {
          window.buscarVisualizacoesSupabase(publicacaoIdAtual)
            .then((total) => {
              if (views) views.textContent = String(total || 0);
            })
            .catch((err) => console.warn('Erro ao buscar views:', err));
        }
      })
      .catch((err) =>
        console.warn('Erro ao registrar view:', err)
      );
  }
}

if (
  publicacaoIdAtual &&
  typeof window.buscarVisualizacoesSupabase === 'function' &&
  views &&
  viewsJaRegistradas.has(chaveDropAtual)
) {
  window.buscarVisualizacoesSupabase(publicacaoIdAtual)
    .then((total) => {
      if (views) views.textContent = String(total || 0);
    })
    .catch((err) => console.warn('Erro ao buscar views:', err));
}

const btnRodapeNex = viewer.querySelector('#nearbyBtnAcaoRodapeNex');

if (btnRodapeNex) {
  btnRodapeNex.classList.remove('ja-compartilhado');

  if (
    publicacaoIdAtual &&
    typeof window.jaCompartilhouSupabase === 'function' &&
    !ehTrocaHorizontal
  ) {
    window.jaCompartilhouSupabase(publicacaoIdAtual)
      .then((ja) => {
        if (btnRodapeNex) {
          btnRodapeNex.classList.toggle('ja-compartilhado', !!ja);
        }
      })
      .catch(() => {});
  }
}

if (publicacaoIdAtual && !ehTrocaHorizontal) {
  atualizarCapsulaShareNearbyNex(publicacaoIdAtual);
} else {
  const capsulaEl = viewer.querySelector('#nearbyDropShareCapsula');
  if (capsulaEl) capsulaEl.style.display = 'none';
}  

if (media) {
  const url = String(drop.url || drop.imagem || '');
  const tipoDrop = String(drop.type || drop.tipo || '').toLowerCase();

  if (primeiraRenderizacaoNex) {
    primeiraRenderizacaoNex = false;

    const ehVideo =
      tipoDrop.includes('video') ||
      /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

    media.innerHTML = '';

    const novoInicial = document.createElement('div');
    novoInicial.className = 'nearby-pub-midia-item';

              if (ehVideo) {
const video = document.createElement('video');
video.src = url;
video.controls = true;
video.setAttribute('controls', '');
video.autoplay = false;
video.muted = true;
video.playsInline = true;
video.preload = 'metadata';
video.style.touchAction = 'pan-x';

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if (video.isConnected && video.paused) {
      video.play().catch(() => {});
    }
  });
});

novoInicial.appendChild(video);

  const videoOverlay = document.createElement('div');
  videoOverlay.className = 'video-overlay-swipe-nex';
  videoOverlay.style.cssText = `
    position: absolute;
    inset: 0;
    z-index: 2;
    background: transparent;
    pointer-events: auto;
    cursor: pointer;
  `;

  videoOverlay.addEventListener('click', () => {
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });

  novoInicial.appendChild(videoOverlay);
} else {
      const img = document.createElement('img');
      img.src = url;
      img.alt = perfil.nome || '';
      novoInicial.appendChild(img);
        }
    media.appendChild(novoInicial);
  } else {
    animarMidiaNex(media, url, tipoDrop, direcaoAnimacaoNex);
  }
}

}

viewer.querySelector('.nearby-drop-close').onclick = () => {
  if (inputComentario) inputComentario.value = '';
  viewer.classList.remove('modo-expandido');
  viewer.remove();
  document.body.style.overflow = '';
};

viewer.addEventListener('click', (e) => {
  if (e.target === viewer) {
    if (inputComentario) inputComentario.value = '';
    viewer.classList.remove('modo-expandido');
    viewer.remove();
    document.body.style.overflow = '';
  }
});

        viewer.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;

        const alvo = e.target;
        if (
  alvo.closest('.nearby-drop-close') ||
  alvo.closest('.nearby-drop-comment-box') ||
  alvo.closest('.nearby-drop-footer') ||
  alvo.closest('.nearby-drop-profile-btn') ||
  alvo.closest('.nearby-pub-stats-row') ||
  alvo.closest('.nearby-drop-expandir') ||
  alvo.closest('input')
) {
  swipeAtivo = false;
  return;
        }

        const videoAtual = viewer.querySelector('#nearbyDropMedia video');
        if (videoAtual && !videoAtual.paused) {
          videoAtual.pause();
          videoAtual.dataset.pausadoPeloSwipe = '1';
        }

        swipeAtivo = true;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swipeStartTime = Date.now();

        preCarregarDropsAdjacentesNex();
      }, { passive: true });

                viewer.addEventListener('touchend', (e) => {
if (!swipeAtivo) return;
swipeAtivo = false;

if (window.__nearbyScrollVerticalAtivo) {
  const videoAtual = viewer.querySelector('#nearbyDropMedia video');
  if (videoAtual && videoAtual.dataset.pausadoPeloSwipe === '1') {
    delete videoAtual.dataset.pausadoPeloSwipe;
    videoAtual.play().catch(() => {});
  }
  return;
}
if (document.querySelector('.nearby-scroll-preview-nex')) return;

if (!e.changedTouches || e.changedTouches.length === 0) return;
      const dx = e.changedTouches[0].clientX - swipeStartX;
      const dy = e.changedTouches[0].clientY - swipeStartY;
      const dt = Date.now() - swipeStartTime;

      if (dt > TEMPO_MAX_SWIPE) {
        const videoAtual = viewer.querySelector('#nearbyDropMedia video');
        if (videoAtual && videoAtual.dataset.pausadoPeloSwipe === '1') {
          delete videoAtual.dataset.pausadoPeloSwipe;
          videoAtual.play().catch(() => {});
        }
        return;
      }

        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        const limiteHorizontal =
          dt < TEMPO_GESTO_RAPIDO ? LIMITE_SWIPE_RAPIDO : LIMITE_SWIPE;

if (absX > limiteHorizontal && absX > absY * 1.3) {
  const videoAtual = viewer.querySelector('#nearbyDropMedia video');
  if (videoAtual) delete videoAtual.dataset.pausadoPeloSwipe;

  if (dx < 0) {
    const perfil = base[perfilAtualId];
    const drops = obterDropsDoPerfil(perfil);
    if (dropIndexAtual < drops.length - 1) {
      dropIndexAtual += 1;
      direcaoAnimacaoNex = 'left';

      if (typeof window.feedbackNex?.navegouDrop === 'function') {
        window.feedbackNex.navegouDrop();
      }

      renderizar();
    }
  } else {
    if (dropIndexAtual > 0) {
      dropIndexAtual -= 1;
      direcaoAnimacaoNex = 'right';

      if (typeof window.feedbackNex?.navegouDrop === 'function') {
        window.feedbackNex.navegouDrop();
      }

      renderizar();
    }
  }
  return;
}

const videoAtual = viewer.querySelector('#nearbyDropMedia video');
if (videoAtual && videoAtual.dataset.pausadoPeloSwipe === '1') {
  delete videoAtual.dataset.pausadoPeloSwipe;
  videoAtual.play().catch(() => {});
}

if (absY > LIMITE_SWIPE && absY > absX * 1.3) {
  const idx = ids.indexOf(perfilAtualId);

  if (dy < 0) {
    if (idx < ids.length - 1) {
      perfilAtualId = ids[idx + 1];
      dropIndexAtual = 0;
      direcaoAnimacaoNex = 'down';

      if (typeof window.feedbackNex?.trocouPerfil === 'function') {
        window.feedbackNex.trocouPerfil();
      }

      renderizar();
    }
  } else {
    if (idx > 0) {
      perfilAtualId = ids[idx - 1];
      dropIndexAtual = 0;
      direcaoAnimacaoNex = 'up';

      if (typeof window.feedbackNex?.trocouPerfil === 'function') {
        window.feedbackNex.trocouPerfil();
      }

      renderizar();
    }
  }
}
          }, { passive: true });

    viewer.addEventListener('touchcancel', () => {
      swipeAtivo = false;
    }, { passive: true });

renderizar();

  document.body.style.overflow = 'hidden';
  document.body.style.touchAction = '';
}

async function atualizarCapsulaShareNearbyNex(publicacaoId) {
  const capsulaEl = document.querySelector('#nearbyDropShareCapsula');
  if (!capsulaEl) return;

  if (!publicacaoId) {
    capsulaEl.style.display = 'none';
    return;
  }

  if (typeof window.jaCompartilhouSupabase !== 'function') {
    capsulaEl.style.display = 'none';
    return;
  }

  try {
    const ja = await window.jaCompartilhouSupabase(publicacaoId);

    if (!ja) {
      capsulaEl.style.display = 'none';
      return;
    }

    let total = 0;

    if (typeof window.contarCompartilhamentosSupabase === 'function') {
      total = Number(await window.contarCompartilhamentosSupabase(publicacaoId)) || 0;
    }

    capsulaEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
      <span>${total}</span>
    `;
    capsulaEl.style.display = 'inline-flex';
  } catch (err) {
    capsulaEl.style.display = 'none';
  }
}

function atualizarBotoesReacaoNex(
  viewerEl,
  perfilId,
  dropIndex,
  url
) {
  if (!viewerEl) return;

  const usuarioId = Drops.usernameAtual || 'anonimo';

  let reacaoAtual = '';

  if (typeof window.obterReacaoUsuarioNex === 'function') {
    const chave = window.chaveDropPerfilNex
      ? window.chaveDropPerfilNex(perfilId, dropIndex, url)
      : chaveReacaoDropNex(perfilId, dropIndex, url);

    reacaoAtual = window.obterReacaoUsuarioNex(chave, usuarioId);
  } else {
    reacaoAtual = obterReacaoUsuarioDropNex(
      perfilId,
      dropIndex,
      url,
      usuarioId
    );
  }

  viewerEl.querySelectorAll('.nearby-drop-reaction').forEach((b) => {
    const emoji = b.textContent.trim();
    b.classList.toggle('ativo', emoji === reacaoAtual);
  });
}

  function abrirPublicacaoConectadaNex(id) {
    const conectadosReais = lerConectadosMyDropsNex();

    const baseDinamica = {};

    conectadosReais.forEach((perfil) => {
      const idPerfil = normalizarIdPerfilNex(perfil.id);
      if (!idPerfil) return;

      const dadosVisuais =
        publicacoesNearbyNex.conectados[idPerfil] ||
        publicacoesNearbyNex.nearby[idPerfil] ||
        {};

      baseDinamica[idPerfil] = {
        id: idPerfil,
        nome: perfil.nome || dadosVisuais.nome || idPerfil,
        distancia: dadosVisuais.distancia || '',
        imagem: dadosVisuais.imagem || '',
        ...dadosVisuais
      };
    });

    const perfil = baseDinamica[id];
    if (!perfil) return;

    abrirViewerPublicacaoNex(perfil, 'conectados', id, 0, baseDinamica);
  }

  function abrirPublicacaoNearbyNex(id) {
    abrirViewerPublicacaoNex(publicacoesNearbyNex.nearby[id], 'nearby', id);
  }

  function abrirMinhasPublicacoesNearby() {
    const publicacoesOrdenadas = obterPublicacoesOrdenadasMyDropsNex();

    if (!publicacoesOrdenadas.length) {
      alert(
        'Você ainda não publicou nenhum Drop.\n\nVá em My Drops e toque em Notas, Foto ou Vídeo pra criar um.'
      );
      return;
    }

    abrirVisualizadorPublicacaoMyDropsNex(publicacoesOrdenadas, 0);
  }
    // ============================================
  // RENDERIZAR PUBLICACOES DO NEARBY
  // ============================================
async function renderizarPublicacoesNearbyNex() {
  const stories = document.querySelector('.nearby-stories');
  const grid = document.querySelector('.nearby-grid');

  if (!stories || !grid) return;

  const storyFixa = stories.querySelector('.my-story');
  stories.innerHTML = '';
  if (storyFixa) stories.appendChild(storyFixa);

  if (typeof window.buscarPerfisComDropsProximosSupabase !== 'function') {
    console.warn('buscarPerfisComDropsProximosSupabase não disponível');
    return;
  }

  const minhaLat = window.minhaLatitudeAtual;
const minhaLng = window.minhaLongitudeAtual;

const TOTAL_MINIMO = 20;
let perfisEncontrados = [];

const temLocalizacaoValida = 
  typeof minhaLat === 'number' && 
  typeof minhaLng === 'number';

let usuarioSeMoveu = false;

if (temLocalizacaoValida && ultimaLatNearbyNex !== null && ultimaLngNearbyNex !== null) {
  const distancia = calcularDistanciaMetrosNex(
    ultimaLatNearbyNex, 
    ultimaLngNearbyNex, 
    minhaLat, 
    minhaLng
  );
  
  if (distancia > DISTANCIA_MINIMA_METROS) {
    usuarioSeMoveu = true;
    console.log(`📍 Usuário se moveu ${Math.round(distancia)}m. Limpando cache.`);
  }
}

if (
  !usuarioSeMoveu &&
  cachePerfisNearbyNex !== null &&
  cachePerfisNearbyNex.length > 0
) {
  perfisEncontrados = cachePerfisNearbyNex;
  console.log(`📦 Nearby: usando cache (${perfisEncontrados.length} perfis)`);
} else {
  try {
    perfisEncontrados =
      await window.buscarPerfisComDropsProximosSupabase(
        temLocalizacaoValida ? minhaLat : null,
        temLocalizacaoValida ? minhaLng : null,
        cacheRaioNearbyNex,
        TOTAL_MINIMO
      );
  } catch (e) {
    console.warn('Erro na busca do Nearby:', e);
    perfisEncontrados = [];
  }

  cachePerfisNearbyNex = perfisEncontrados;
  ultimaLatNearbyNex = minhaLat;
  ultimaLngNearbyNex = minhaLng;

  console.log(
    `📡 Nearby: ${perfisEncontrados.length} perfis encontrados (busca única de ${cacheRaioNearbyNex} km)`
  );
}

  grid.innerHTML = '';

  if (!Array.isArray(perfisEncontrados) || perfisEncontrados.length === 0) {
    const vazio = document.createElement('div');
    vazio.style.cssText = `
      grid-column: 1 / -1;
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
      font-size: 14px;
      font-weight: 600;
    `;
    vazio.textContent = 'Nenhuma publicação por perto ainda.';
    grid.appendChild(vazio);
    return;
  }

  const drops = [];

  perfisEncontrados.forEach((perfil) => {
    const dropsDoPerfil = Array.isArray(perfil.drops)
      ? perfil.drops
      : [];

    dropsDoPerfil.forEach((drop) => {
  drops.push({
    id: drop.id,
    mediaUrl: drop.mediaUrl,
    tipo: drop.tipo === 'video' ? 'video' : 'image',
    legenda: drop.legenda || '',
    expiraEm: drop.expiraEm || null,
    criadoEm: drop.criadoEm ? new Date(drop.criadoEm).getTime() : null,
    selos: drop.selos || null,

    compartilhado_de_id: drop.compartilhado_de_id || null,
    compartilhado_de_username: drop.compartilhado_de_username || '',
    compartilhado_de_nome: drop.compartilhado_de_nome || '',
    compartilhado_de_avatar: drop.compartilhado_de_avatar || '',

    autorUsername: perfil.username,
    autorNome: perfil.nome,
    autorAvatar: perfil.avatar_url || null,
    autorUltimaAtividade: perfil.ultima_atividade || null,
    autorLat: perfil.lat,
    autorLng: perfil.lng,
    distanciaMetros: perfil.distancia_metros
  });
});
  });

  const conectadosLista = lerConectadosMyDropsNex();
  const idsConectados = new Set(
    conectadosLista.map((c) =>
      String(c.id || '').replace(/^@/, '').toLowerCase().trim()
    )
  );

  const dropsPorAutor = {};

  drops.forEach((drop) => {
    const autorId = String(drop.autorUsername || 'usuario')
      .replace(/^@/, '')
      .toLowerCase()
      .trim();

    if (!dropsPorAutor[autorId]) {
      dropsPorAutor[autorId] = [];
    }
    dropsPorAutor[autorId].push(drop);
  });

  const autoresOrdenados = perfisEncontrados.map((p) =>
    String(p.username || '').replace(/^@/, '').toLowerCase().trim()
  );

  const autoresConectados = [];
  const autoresNaoConectados = [];

  autoresOrdenados.forEach((autorId) => {
    const lista = dropsPorAutor[autorId];
    if (!lista || !lista.length) return;

    if (idsConectados.has(autorId)) {
      autoresConectados.push({ autorId, drops: lista });
    } else {
      autoresNaoConectados.push({ autorId, drops: lista });
    }
  });

  function formatarDistanciaNex(metros) {
    if (metros == null || !Number.isFinite(metros)) return '';
    if (metros < 1000) return `${Math.round(metros)} m`;
    if (metros < 10000) return `${(metros / 1000).toFixed(1)} km`;
    return `${Math.round(metros / 1000)} km`;
  }

  function obterDistanciaDropNex(dropPrincipal) {
    const minhaLat = window.minhaLatitudeAtual;
    const minhaLng = window.minhaLongitudeAtual;

    const autorLat = dropPrincipal?.autorLat;
    const autorLng = dropPrincipal?.autorLng;

    if (
      typeof minhaLat !== 'number' ||
      typeof minhaLng !== 'number' ||
      typeof autorLat !== 'number' ||
      typeof autorLng !== 'number'
    ) {
      return '';
    }

    const metros = calcularDistanciaMetrosNex(
      minhaLat,
      minhaLng,
      autorLat,
      autorLng
    );

    return formatarDistanciaNex(metros);
  }

  autoresConectados.forEach(({ autorId, drops: dropsDoAutor }) => {
  const dropPrincipal = dropsDoAutor[0];

  const card = document.createElement('div');
  card.className = 'story-card my-story';
  card.dataset.autorId = autorId;
    const avatar = document.createElement('div');
    avatar.className = 'story-avatar';

    if (dropPrincipal.autorAvatar) {
      avatar.style.backgroundImage = `url('${dropPrincipal.autorAvatar}')`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
      avatar.textContent = '';
    } else {
      avatar.textContent = (dropPrincipal.autorUsername || '?')
        .charAt(0)
        .toUpperCase();
    }

    const status = document.createElement('div');
    const ultimaAtiv = dropPrincipal.autorUltimaAtividade;
    const LIMITE_ONLINE_MS = 5 * 60 * 1000;

    const estaOnline =
      ultimaAtiv &&
      Date.now() - new Date(ultimaAtiv).getTime() < LIMITE_ONLINE_MS;

    status.className = estaOnline ? 'story-online' : 'story-offline';

    const nome = document.createElement('h4');
    nome.textContent = '@' + (dropPrincipal.autorUsername || 'usuario');

    const dist = document.createElement('span');
    dist.textContent = obterDistanciaDropNex(dropPrincipal) || '—';

    card.appendChild(avatar);
    card.appendChild(status);
    card.appendChild(nome);
    card.appendChild(dist);

  card.addEventListener('click', () => {
    abrirDropRealNearbyNex(dropPrincipal, drops, 'conectados');
  });

  stories.appendChild(card);
});

  // ============================================
  // RENDERIZA NÃO-CONECTADOS (no grid) + EXPIRAÇÃO
  // ============================================
  autoresNaoConectados.forEach(({ autorId, drops: dropsDoAutor }) => {
    const dropPrincipal = dropsDoAutor[0];

    const card = document.createElement('div');
    card.className = 'near-card';

    const ultimaAtiv = dropPrincipal.autorUltimaAtividade;
    const LIMITE_ONLINE_MS = 5 * 60 * 1000;

    const estaOnline =
      ultimaAtiv &&
      Date.now() - new Date(ultimaAtiv).getTime() < LIMITE_ONLINE_MS;

    if (!estaOnline) {
      card.classList.add('offline');
    }

    if (dropPrincipal.mediaUrl) {
  const isVideo = dropPrincipal.tipo === 'video' || /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(dropPrincipal.mediaUrl);
  
  if (isVideo) {
    const videoFundo = document.createElement('video');
    videoFundo.src = dropPrincipal.mediaUrl;
    videoFundo.muted = true;
    videoFundo.playsInline = true;
    videoFundo.preload = 'metadata'; // Baixa só a capa, não o vídeo todo
    videoFundo.style.position = 'absolute';
    videoFundo.style.inset = '0';
    videoFundo.style.width = '100%';
    videoFundo.style.height = '100%';
    videoFundo.style.objectFit = 'cover';
    videoFundo.style.zIndex = '0';
    videoFundo.style.pointerEvents = 'none';

    card.style.position = 'relative';
    card.style.overflow = 'hidden';

    card.appendChild(videoFundo);
  } else {
    const imgFundo = document.createElement('img');
    imgFundo.src = dropPrincipal.mediaUrl;
    imgFundo.alt = '';
    imgFundo.loading = 'lazy';
    imgFundo.decoding = 'async';
    imgFundo.style.position = 'absolute';
    imgFundo.style.inset = '0';
    imgFundo.style.width = '100%';
    imgFundo.style.height = '100%';
    imgFundo.style.objectFit = 'cover';
    imgFundo.style.zIndex = '0';
    imgFundo.style.pointerEvents = 'none';

    card.style.position = 'relative';
    card.style.overflow = 'hidden';

    card.appendChild(imgFundo);
  }
    }

    const avatar = document.createElement('div');
    avatar.className = 'near-avatar';

    if (dropPrincipal.autorAvatar) {
      avatar.style.backgroundImage = `url('${dropPrincipal.autorAvatar}')`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
      avatar.textContent = '';
    } else {
      avatar.textContent = (dropPrincipal.autorUsername || '?')
        .charAt(0)
        .toUpperCase();
    }

    const nome = document.createElement('h3');
    nome.textContent = '@' + (dropPrincipal.autorUsername || 'usuario');

    const dist = document.createElement('span');
    dist.textContent = obterDistanciaDropNex(dropPrincipal) || '—';

    card.append(avatar, nome, dist);
    grid.appendChild(card);

    card.addEventListener('click', () => {
      abrirDropRealNearbyNex(dropPrincipal, drops, 'nearby');
    });

    if (dropPrincipal.expiraEm) {
      const agora = Date.now();
      const expira = new Date(dropPrincipal.expiraEm).getTime();
      const tempoRestante = expira - agora;

      if (tempoRestante > 0) {
        setTimeout(() => {
          console.log(`⏳ Drop de @${autorId} expirou. Removendo card e buscando substituto.`);
          
          card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
          card.style.opacity = '0';
          card.style.transform = 'scale(0.8)';

          setTimeout(() => {
            if (card.parentNode) card.remove();
          }, 400);

          cachePerfisNearbyNex = null;

          setTimeout(() => {
            if (typeof renderizarPublicacoesNearbyNex === 'function') {
              renderizarPublicacoesNearbyNex();
            }
          }, 500);

        }, tempoRestante);
      }
    }
  });
}
  
// ============================================
// RECEBER AVISO DO REALTIME (Sem gastar cota)
// ============================================
// ⚠️ Essa função é chamada pelo 33-notificacoes-realtime.js
// quando alguém posta algo novo. Ela decide localmente se
// o drop deve aparecer no Nearby.

function receberAvisoNearbyNex(pub) {
  if (!pub || !pub.autor_username) return;

  // 1. Verifica se o drop já expirou
  if (pub.expira_em) {
    const agora = Date.now();
    const expira = new Date(pub.expira_em).getTime();
    if (expira <= agora) {
      console.log('⏳ Aviso ignorado (drop já expirou):', pub.id);
      return;
    }
  }

  // 2. Verifica a minha localização
  const minhaLat = window.minhaLatitudeAtual;
  const minhaLng = window.minhaLongitudeAtual;

  if (typeof minhaLat !== 'number' || typeof minhaLng !== 'number') return;

  // 3. As coordenadas JÁ VÊM no aviso do Realtime (não precisa buscar)
  const autorLat = pub.autor_lat;
  const autorLng = pub.autor_lng;

  if (typeof autorLat !== 'number' || typeof autorLng !== 'number') {
    console.warn('Aviso sem coordenadas do autor. Ignorando.');
    return;
  }

  // 4. Calcula a distância
  const distancia = calcularDistanciaMetrosNex(
    minhaLat,
    minhaLng,
    autorLat,
    autorLng
  );

  const RAIO_MAXIMO = 5000 * 1000; // 5.000 km em metros

  if (distancia > RAIO_MAXIMO) {
    console.log(`📡 Aviso de @${pub.autor_username} ignorado (distância: ${Math.round(distancia / 1000)} km)`);
    return;
  }

  // 5. Está dentro do raio e não expirou → atualiza a tela
  console.log(`📡 Aviso válido de @${pub.autor_username}. Atualizando Nearby.`);

  // ⚠️ Limpa o cache para forçar uma nova busca
  cachePerfisNearbyNex = null;
  ultimaLatNearbyNex = null;
  ultimaLngNearbyNex = null;

  // ⚠️ Re-renderiza o Nearby
  if (typeof renderizarPublicacoesNearbyNex === 'function') {
    renderizarPublicacoesNearbyNex();
  }
}

// ============================================
// EXPÕE GLOBALMENTE
// ============================================

window.publicacoesNearbyNex = publicacoesNearbyNex;
window.receberAvisoNearbyNex = receberAvisoNearbyNex;
  window.buscarPerfilNearbyNex = buscarPerfilNearbyNex;
  window.abrirDropComentadoNex = abrirDropComentadoNex;
  window.abrirViewerPublicacaoNex = abrirViewerPublicacaoNex;
  window.abrirPublicacaoConectadaNex = abrirPublicacaoConectadaNex;
  window.abrirPublicacaoNearbyNex = abrirPublicacaoNearbyNex;
  window.abrirMinhasPublicacoesNearby = abrirMinhasPublicacoesNearby;
  window.renderizarPublicacoesNearbyNex = renderizarPublicacoesNearbyNex;

  // Reações
  window.obterStatsReacaoDropNex = obterStatsReacaoDropNex;
  window.obterReacaoUsuarioDropNex = obterReacaoUsuarioDropNex;
  window.registrarReacaoDropNex = registrarReacaoDropNex;

  // Helpers
  window.obterDropsDoPerfil = obterDropsDoPerfil;

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    // Botão "Minhas publicações"
    const btnMinhasPublicacoes = document.getElementById(
      'btnMinhasPublicacoesNearby'
    );

    if (btnMinhasPublicacoes) {
      btnMinhasPublicacoes.addEventListener('click', () => {
        abrirMinhasPublicacoesNearby();
      });
    }

    // Listener global de clique em drop/mídia na conversa
    if (!window.__listenerMidiaNex) {
      window.__listenerMidiaNex = true;

      document.addEventListener('click', (e) => {
  // ⚠️ Botão "Ver Drop" no comentário do Nearby
  const btnComentario = e.target.closest('.msg-nearby-comment-btn');
  if (btnComentario) {
    e.preventDefault();
    e.stopPropagation();

    const perfilId = btnComentario.dataset.perfilId || '';
    const perfilNome = btnComentario.dataset.perfilNome || '';
    const dropIndex = Number(btnComentario.dataset.dropIndex || 0);

    if (typeof window.abrirDropComentadoNex === 'function') {
      window.abrirDropComentadoNex(perfilId, perfilNome, dropIndex);
    }
    return;
  }

  // Botão "Visitar perfil" no card de drop
  const btnPerfil = e.target.closest('.msg-drop-profile-btn');
  if (btnPerfil) {
    e.preventDefault();
    e.stopPropagation();

    abrirPerfilVisitadoNex(
      btnPerfil.dataset.perfilId || '',
      btnPerfil.dataset.perfilNome || ''
    );
    return;
  }

        // Clique no card do drop
        const dropPreview = e.target.closest('.msg-drop-preview-open');
        if (dropPreview) {
          e.preventDefault();
          abrirDropComentadoNex(
            dropPreview.dataset.perfilId || '',
            dropPreview.dataset.perfilNome || '',
            Number(dropPreview.dataset.dropIndex || 0)
          );
          return;
        }

        // Clique em mídia
        const el = e.target.closest('.msg-midia-open');
        if (!el) return;

        e.preventDefault();
        e.stopPropagation();

        const url = el.dataset.url;
        const tipo = el.dataset.tipo || 'image';

        if (url) {
          abrirMidiaChatNex(url, tipo);
        }
      });
    }
  });

// ============================================
// ABRIR DROP REAL (novo sistema)
// ============================================
function abrirDropRealNearbyNex(dropClicado, listaDeDrops, tipoOrigem = null) {
  if (!dropClicado) return;

  let lista = Array.isArray(listaDeDrops) ? listaDeDrops : [];

  if (tipoOrigem === 'conectados' || tipoOrigem === 'nearby') {
    const conectados = typeof lerConectadosMyDropsNex === 'function'
      ? lerConectadosMyDropsNex()
      : [];

    const idsConectados = new Set(
      conectados.map((c) =>
        String(c.id || '')
          .replace(/^@/, '')
          .toLowerCase()
          .trim()
      )
    );

    lista = lista.filter((d) => {
      const autor = String(d.autorUsername || '')
        .replace(/^@/, '')
        .toLowerCase()
        .trim();

      const ehConectado = idsConectados.has(autor);

      return tipoOrigem === 'conectados'
        ? ehConectado
        : !ehConectado;
    });

    if (!lista.length) {
      lista = [dropClicado];
    }
  }

  const dropsPorAutor = {};

  lista.forEach((d) => {
    const id = d.autorUsername || 'usuario';
    if (!dropsPorAutor[id]) dropsPorAutor[id] = [];
    dropsPorAutor[id].push(d);
  });

  const base = {};

  Object.entries(dropsPorAutor).forEach(([autorId, drops]) => {
    const primeiro = drops[0];

    base[autorId] = {
  id: autorId,
  nome: primeiro.autorNome || autorId,
  avatar: primeiro.autorAvatar || null,
  distancia: '',
  drops: drops.map((d, idxDentro) => {
    const chaveLocal =
      typeof window.chaveDropPerfilNex === 'function'
        ? window.chaveDropPerfilNex(autorId, idxDentro, d.mediaUrl)
        : `${autorId}::${idxDentro}::${d.mediaUrl}`;

    window.__dropsMapaIdsPublicacao[chaveLocal] = d.id;

                                return {
  url: d.mediaUrl,
  type: d.tipo === 'video' ? 'video' : 'image',
  autorId: d.autorUsername,
  autorNome: d.autorNome,
  dropIndex: d.id,
  publicacaoIdSupabase: d.id,
  expiraEm: d.expiraEm || null,
  selos: d.selos || null,
  legenda: d.legenda || '',

  compartilhado_de_id: d.compartilhado_de_id || null,
  compartilhado_de_username: d.compartilhado_de_username || '',
  compartilhado_de_nome: d.compartilhado_de_nome || '',
  compartilhado_de_avatar: d.compartilhado_de_avatar || ''
};
  })
  };
  });

  const autorClicado = dropClicado.autorUsername || 'usuario';
const perfilClicado = base[autorClicado];

if (!perfilClicado) return;

window.limparNovidadePostConectado?.(autorClicado);
window.atualizarBordasCardsNex?.();

  const indexClicado = perfilClicado.drops.findIndex(
    (d) => d.dropIndex === dropClicado.id
  );

  const dropIndexFinal = indexClicado >= 0 ? indexClicado : 0;

  if (typeof window.abrirViewerPublicacaoNex === 'function') {
    window.abrirViewerPublicacaoNex(
      perfilClicado,
      'nearby',
      autorClicado,
      dropIndexFinal,
      base
    );
  } else {
    console.warn('abrirViewerPublicacaoNex não disponível');
  }
}

window.abrirDropRealNearbyNex = abrirDropRealNearbyNex;
  
// ============================================
// DEBUG
// ============================================

console.log('🗺️ 11-nearby.js carregado');
})();

