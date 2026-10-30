/* ============================================
   11-NEARBY.JS
   Tela Nearby, viewer de drops, reações em drops
============================================ */

(function () {
  'use strict';

  window.__dropsMapaIdsPublicacao = window.__dropsMapaIdsPublicacao || {};

  let ultimaLatNearbyNex = null;
  let ultimaLngNearbyNex = null;
  let cachePerfisNearbyNex = null;
  let cacheRaioNearbyNex = 5000;
  const DISTANCIA_MINIMA_METROS = 500;

  const publicacoesNearbyNex = {
    conectados: {},
    nearby: {}
  };

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

  async function abrirDropComentadoNex(perfilId, perfilNome, dropIndex = 0) {
    const achado = buscarPerfilNearbyNex(perfilId, perfilNome);

    if (achado) {
      abrirViewerPublicacaoNex(achado.perfil, achado.tipo, achado.id, dropIndex);
      return;
    }

    const usernameLimpo = String(perfilId || '').replace(/^@/, '').toLowerCase().trim();
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
      const autor = String(d.autorUsername || '').replace(/^@/, '').toLowerCase().trim();
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

  const reacoesDropsNex = new Map();
  const reacoesUsuarioDropNex = new Map();

  function obterStatsReacaoDropNex(perfilId, dropIndex, url) {
    if (typeof window.obterStatsReacaoNex === 'function' && typeof window.chaveDropPerfilNex === 'function') {
      const chave = window.chaveDropPerfilNex(perfilId, dropIndex, url);
      return window.obterStatsReacaoNex(chave);
    }
    return reacoesDropsNex.get(chaveReacaoDropNex(perfilId, dropIndex, url)) || { heart: 0, broken: 0 };
  }

  function obterReacaoUsuarioDropNex(perfilId, dropIndex, url, usuarioId) {
    if (typeof window.obterReacaoUsuarioNex === 'function' && typeof window.chaveDropPerfilNex === 'function') {
      const chave = window.chaveDropPerfilNex(perfilId, dropIndex, url);
      return window.obterReacaoUsuarioNex(chave, usuarioId);
    }
    return reacoesUsuarioDropNex.get(chaveUsuarioReacaoDropNex(perfilId, dropIndex, url, usuarioId)) || '';
  }

  function registrarReacaoDropNex(perfilId, dropIndex, url, emoji, usuarioId = 'local') {
    const chaveDrop = window.chaveDropPerfilNex
      ? window.chaveDropPerfilNex(perfilId, dropIndex, url)
      : chaveReacaoDropNex(perfilId, dropIndex, url);

    if (typeof window.alternarReacaoSupabase === 'function') {
      const publicacaoId = window.__dropsMapaIdsPublicacao && window.__dropsMapaIdsPublicacao[chaveDrop];
      if (publicacaoId) {
        window.alternarReacaoSupabase(publicacaoId, emoji).catch((err) => console.warn('Erro Supabase reação:', err));
      }
    }

    if (typeof window.alternarReacaoNex === 'function') {
      const resultado = window.alternarReacaoNex(chaveDrop, usuarioId, emoji);
      const keyUser = chaveUsuarioReacaoDropNex(perfilId, dropIndex, url, usuarioId);
      reacoesDropsNex.set(chaveDrop, { heart: resultado.heart, broken: resultado.broken });
      reacoesUsuarioDropNex.set(keyUser, resultado.reacaoAtual);

      if (resultado.reacaoAtual) {
        registrarInteracaoNex(perfilId, resultado.reacaoAtual === '❤️' ? 'like' : 'deslike', `${perfilId}::${dropIndex}`);
      }
      return resultado;
    }

    const estatisticas = reacoesDropsNex.get(chaveDrop) || { heart: 0, broken: 0 };
    const keyUser = chaveUsuarioReacaoDropNex(perfilId, dropIndex, url, usuarioId);
    const reacaoAnterior = reacoesUsuarioDropNex.get(keyUser) || '';

    if (reacaoAnterior === emoji) return;
    if (reacaoAnterior === '❤️') estatisticas.heart = Math.max(0, estatisticas.heart - 1);
    if (reacaoAnterior === '💔') estatisticas.broken = Math.max(0, estatisticas.broken - 1);
    if (emoji === '❤️') estatisticas.heart += 1;
    if (emoji === '💔') estatisticas.broken += 1;

    reacoesDropsNex.set(chaveDrop, estatisticas);
    reacoesUsuarioDropNex.set(keyUser, emoji);

    registrarInteracaoNex(perfilId, emoji === '❤️' ? 'like' : 'deslike', `${perfilId}::${dropIndex}`);
  }
  function calcularTempoExpiracaoNex(expiraEm) {
  if (!expiraEm) return 'Permanente';
  const ms = new Date(expiraEm).getTime() - Date.now();
  if (isNaN(ms)) return 'Permanente';
  if (ms <= 0) return 'Expirado';
  const seg = Math.floor(ms / 1000);
  const min = Math.floor(seg / 60);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (d >= 1) return `Expira em ${d}d`;
  if (h >= 1) return `Expira em ${h}h`;
  if (min >= 1) return `Expira em ${min}min`;
  return `Expira em ${seg}s`;
}

function calcularDistanciaMetrosNex(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (g) => (g * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function animarMidiaNex(container, url, tipo, direcao) {
  if (!container || !url) return;

  const ehVideo = tipo === 'video' || /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
  const novo = document.createElement('div');
  novo.className = 'nearby-pub-midia-item';

  if (ehVideo) {
    const playerWrapper = document.createElement('div');
    playerWrapper.className = 'player-custom-nex';
    playerWrapper.innerHTML = `
      <video id="videoPlayerNearbyNex" src="${url}" autoplay playsinline muted></video>
      <div class="video-overlay-swipe-nex"></div>
      <button type="button" class="btn-mute-custom-nex" onclick="toggleMuteNearbyNex(this)">
        <svg class="icone-mudo-nearby" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
          <line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      </button>
      <div class="controles-inferiores-nex">
        <button type="button" class="btn-play-pause-custom-nex" onclick="togglePlayNearbyNex(this)">
          <svg class="icone-play-nearby" viewBox="0 0 24 24" style="display:none;"><path d="M8 5v14l11-7z"/></svg>
          <svg class="icone-pause-nearby" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
        </button>
        <div class="barra-tempo-custom-nex" onclick="seekNearbyNex(event, this)"><div class="barra-tempo-fundo-nex"><div class="barra-tempo-progresso-nex progresso-nearby"></div></div></div>
        <div class="tempo-texto-nex"><span class="tempo-atual-nearby">0:00</span> / <span class="tempo-total-nearby">0:00</span></div>
      </div>
    `;
    novo.appendChild(playerWrapper);
  } else {
    const img = document.createElement('img');
    img.src = url;
    img.alt = '';
    novo.appendChild(img);
  }

  let transformEntrada = 'translateX(100%)';
  let transformSaida = 'translateX(-100%)';
  if (direcao === 'left') { transformEntrada = 'translateX(100%)'; transformSaida = 'translateX(-100%)'; }
  else if (direcao === 'right') { transformEntrada = 'translateX(-100%)'; transformSaida = 'translateX(100%)'; }
  else if (direcao === 'down') { transformEntrada = 'translateY(100%)'; transformSaida = 'translateY(-100%)'; }
  else if (direcao === 'up') { transformEntrada = 'translateY(-100%)'; transformSaida = 'translateY(100%)'; }

  novo.style.transform = transformEntrada;
  novo.style.opacity = '0';

  const midiaAtual = container.querySelector('.nearby-pub-midia-item');
  container.appendChild(novo);
  void novo.offsetWidth;

  novo.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease';
  novo.style.transform = 'translateX(0) translateY(0)';
  novo.style.opacity = '1';

  if (midiaAtual) {
    midiaAtual.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease';
    midiaAtual.style.transform = transformSaida;
    midiaAtual.style.opacity = '0';
    setTimeout(() => { if (midiaAtual.parentNode === container) midiaAtual.remove(); }, 540);
  }
}

function obterDropsDoPerfil(perfil) {
  if (Array.isArray(perfil?.drops) && perfil.drops.length) return perfil.drops;
  return [{ url: perfil?.imagem || '', type: 'image', views: perfil?.views || 128, expireText: perfil?.expireText || 'Expira em 4h' }];
}
    function abrirViewerPublicacaoNex(post, tipo, id, dropIndexInicial = 0, baseOverride = null) {
    if (!post) return;

    let base;
    if (baseOverride) {
      base = baseOverride;
    } else if (tipo === 'conectados') {
      base = {};
      lerConectadosMyDropsNex().forEach((perfil) => {
        const idPerfil = normalizarIdPerfilNex(perfil.id);
        if (!idPerfil) return;
        const dadosVisuais = publicacoesNearbyNex.conectados[idPerfil] || publicacoesNearbyNex.nearby[idPerfil] || {};
        base[idPerfil] = { id: idPerfil, nome: perfil.nome || dadosVisuais.nome || idPerfil, distancia: dadosVisuais.distancia || '', imagem: dadosVisuais.imagem || '', ...dadosVisuais };
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
        const ehVideo = tipo.includes('video') || /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
        _midiasPreCarregadasNex.add(url);
        if (ehVideo) {
          const v = document.createElement('video');
          v.preload = 'metadata'; v.muted = true; v.playsInline = true; v.src = url;
        } else {
          const img = new Image();
          img.decoding = 'async'; img.loading = 'eager'; img.src = url;
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
            <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
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
          <svg class="nearby-icone-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          <svg class="nearby-icone-share-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/><path class="nearby-check-azul" d="M9.5 13.5l2 2 3-3"/></svg>
          <span class="nearby-icone-send" aria-hidden="true">⌯⌲</span>
        </button>
      </div>
    </div>
    <div class="nearby-pub-stats-row">
      <div class="nearby-pub-stats-lista">
        <div class="nearby-drop-views">👁 <span id="nearbyDropViews">0</span></div>
        <div class="nearby-drop-reactions" id="nearbyDropReactions"></div>
        <span class="nearby-drop-share-capsula" id="nearbyDropShareCapsula" style="display:none;"></span>
      </div>
      <button class="nearby-drop-profile-btn" type="button">👣 Visitar perfil</button>
    </div>
  </div>
`;

    document.body.appendChild(viewer);
      window.__nearbyScrollStateNex = {
  viewerRef: viewer,
  ids, base, obterDropsDoPerfil,
  getPerfilAtualId: () => perfilAtualId,
  getDropIndexAtual: () => dropIndexAtual,
  trocarPerfil: (novoIdx, direcao) => {
    if (novoIdx < 0 || novoIdx >= ids.length) return;
    perfilAtualId = ids[novoIdx];
    dropIndexAtual = 0;
    direcaoAnimacaoNex = direcao;
    primeiraRenderizacaoNex = true;
    renderizar();
  },
  avancarDrop: (direcao) => {
    const perfil = base[perfilAtualId];
    const drops = obterDropsDoPerfil(perfil);
    if (!perfil || !drops.length) return;
    if (direcao === 1) {
      if (dropIndexAtual < drops.length - 1) {
        dropIndexAtual += 1;
        direcaoAnimacaoNex = 'left';
        if (typeof window.feedbackNex?.navegouDrop === 'function') window.feedbackNex.navegouDrop();
        renderizar();
      }
    } else if (direcao === -1) {
      if (dropIndexAtual > 0) {
        dropIndexAtual -= 1;
        direcaoAnimacaoNex = 'right';
        if (typeof window.feedbackNex?.navegouDrop === 'function') window.feedbackNex.navegouDrop();
        renderizar();
      }
    }
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
    abrirPerfilVisitadoNex(perfil.id || perfilAtualId || perfil.nome || '', perfil.nome || 'Perfil');
    viewer.remove();
    document.body.style.overflow = '';
    document.body.classList.remove('viewer-aberto');
    setTimeout(() => { window.__dropsBloquearPopstate = false; }, 800);
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
  if (viewer.classList.contains('modo-expandido')) sairModoExpandidoNex();
  else entrarModoExpandidoNex();
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

function atualizarEstadoEnviarNex() {
  const texto = (inputComentario?.value || '').trim();
  if (!botaoEnviar) return;
  const inputFocado = document.activeElement === inputComentario;
  const mostrarEnviar = !!texto || inputFocado;
  botaoEnviar.disabled = false;
  botaoEnviar.classList.toggle('is-active', !!texto);
  if (commentBox) commentBox.classList.toggle('input-com-texto', mostrarEnviar);
}

function entrarModoComentarioNex() {
  if (!commentBox) return;
  commentBox.classList.add('comentario-focado');
  viewer.querySelectorAll('.nearby-drop-reaction').forEach((btn) => btn.style.display = 'none');
}
function sairModoComentarioNex() {
  if (!commentBox) return;
  commentBox.classList.remove('comentario-focado');
  viewer.querySelectorAll('.nearby-drop-reaction').forEach((btn) => btn.style.display = '');
}

if (inputComentario) {
  atualizarEstadoEnviarNex();
  inputComentario.addEventListener('input', atualizarEstadoEnviarNex);
  inputComentario.addEventListener('focus', () => { entrarModoComentarioNex(); atualizarEstadoEnviarNex(); });
  inputComentario.addEventListener('blur', () => {
    if (!(inputComentario.value || '').trim().length) sairModoComentarioNex();
    atualizarEstadoEnviarNex();
  });
}

viewer.addEventListener('click', (e) => {
  if (e.target.closest('.nearby-drop-comment-box')) return;
  const temTexto = (inputComentario?.value || '').trim().length > 0;
  if (!temTexto) sairModoComentarioNex();
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
      window.mostrarToastNex?.('Você não pode reagir ao seu próprio drop.', 'info');
      return;
    }
    const usuarioId = Drops.usernameAtual || 'anonimo';
    registrarReacaoDropNex(perfilIdCalc, dropIndexAtual, urlCalc, btn.textContent.trim(), usuarioId);
    if (typeof window.feedbackNex?.reagiu === 'function') window.feedbackNex.reagiu();
    btn.classList.remove('pop-anim'); void btn.offsetWidth; btn.classList.add('pop-anim');
    setTimeout(() => btn.classList.remove('pop-anim'), 360);
    atualizarBotoesReacaoNex(viewer, perfilIdCalc, dropIndexAtual, urlCalc);
    const reacoesElAtual = viewer.querySelector('#nearbyDropReactions');
    if (reacoesElAtual) {
      const statsAtual = obterStatsReacaoDropNex(perfilIdCalc, dropIndexAtual, urlCalc);
      const totalAtual = statsAtual.heart + statsAtual.broken;
      if (totalAtual > 0) {
        reacoesElAtual.innerHTML = `<span class="nearby-drop-reaction-count">❤️${statsAtual.heart}</span><span class="nearby-drop-reaction-count">💔${statsAtual.broken}</span>`;
        reacoesElAtual.style.display = 'inline-flex';
      } else {
        reacoesElAtual.innerHTML = '';
        reacoesElAtual.style.display = 'none';
      }
    }
    if (typeof renderChat === 'function') renderChat(Drops.estado.conversaAtual);
  });
});

document.body.style.overflow = 'hidden';
function gerarFrameVideoNearbyNex(urlVideo) {
  return new Promise((resolve) => {
    if (!urlVideo) { resolve(''); return; }
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous'; video.muted = true; video.playsInline = true; video.preload = 'metadata'; video.src = urlVideo;
    let resolvido = false;
    const finalizar = (resultado) => {
      if (resolvido) return; resolvido = true;
      try { video.removeAttribute('src'); video.load(); } catch (e) {}
      resolve(resultado || '');
    };
    const timeout = setTimeout(() => finalizar(''), 6000);
    video.addEventListener('error', () => { clearTimeout(timeout); finalizar(''); });
    video.addEventListener('loadeddata', () => {
      try { const alvo = Math.min(0.5, (video.duration || 1) / 2); video.currentTime = alvo; }
      catch (e) { tentarCapturar(); }
    });
    video.addEventListener('seeked', () => tentarCapturar());
    function tentarCapturar() {
      try {
        const largura = video.videoWidth || 720;
        const altura = video.videoHeight || 1280;
        const canvas = document.createElement('canvas');
        canvas.width = largura; canvas.height = altura;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, largura, altura);
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        clearTimeout(timeout); finalizar(dataURL);
      } catch (err) { clearTimeout(timeout); finalizar(''); }
    }
  });
}

async function enviarComentarioNearbyNex() {
  const perfil = base[perfilAtualId];
  if (perfil) {
    const perfilIdCalc = perfil.id || perfilAtualId || perfil.nome || '';
    const estouSilenciado = window.__quemMeSilenciouNex && window.__quemMeSilenciouNex.has(perfilIdCalc);
    if (estouSilenciado) { window.mostrarToastNex?.('Você está silenciado por este usuário.', 'erro'); return; }
  }
  const texto = (inputComentario?.value || '').trim();
  if (!texto) return;
  const drops = obterDropsDoPerfil(perfil);
  const drop = drops[dropIndexAtual];
  if (!perfil || !drop) return;
  const nomeContato = perfil.nome || 'Perfil Nearby';
  const chaveConversa = nomeContato;
  const tipoDrop = drop.type === 'video' || drop.tipo === 'video' ? 'video' : 'imagem';
  let urlAnexo = drop.url || drop.imagem || '';
  if (tipoDrop === 'video' && urlAnexo) {
    const frame = await gerarFrameVideoNearbyNex(urlAnexo);
    if (frame) urlAnexo = frame;
  }
  const mensagemNearby = {
    id: gerarIdMensagemNex(), timestamp: Date.now(), side: 'right', nome: 'Eu', avatar: 'EU',
    ...obterDataHoraNex(), status: 'enviado', text: texto,
    anexo: { type: 'imagem', tipoOriginal: tipoDrop, url: urlAnexo, origem: 'nearby', perfilNome: nomeContato, perfilId: perfil.id || '', dropIndex: dropIndexAtual }
  };
  const usernameDestino = (window.__convUsernamesNex && window.__convUsernamesNex[nomeContato]) || perfil.id || nomeContato;
  let convId = null;
  if (typeof window.obterOuCriarConversaSupabase === 'function') {
    try {
      convId = await window.obterOuCriarConversaSupabase(usernameDestino);
      if (convId) {
        window.__convIdsNex = window.__convIdsNex || {}; window.__convIdsNex[nomeContato] = convId;
        window.__convUsernamesNex = window.__convUsernamesNex || {}; window.__convUsernamesNex[nomeContato] = usernameDestino;
      }
    } catch (err) {}
  }
  if (convId && typeof window.enviarMensagemSupabase === 'function') {
    try {
      const msgSupabase = await window.enviarMensagemSupabase({
        conversa_id: convId, tipo: 'imagem', texto: texto, media_url: mensagemNearby.anexo?.url || null,
        media_meta: { origem: 'nearby', tipoOriginal: tipoDrop, perfilNome: nomeContato, perfilId: perfil.id || '', dropIndex: dropIndexAtual },
        resposta_a_id: null
      });
      if (msgSupabase && msgSupabase.id) mensagemNearby._supabaseId = msgSupabase.id;
    } catch (err) {}
  }
  if (typeof registrarMensagemRecebidaNex === 'function') registrarMensagemRecebidaNex(nomeContato, mensagemNearby, false);
  else { if (!conversas[chaveConversa]) conversas[chaveConversa] = []; conversas[chaveConversa].push(mensagemNearby); }
  if (typeof window.criarCardConversaNex === 'function' && typeof window.obterCardConversaNex === 'function' && !window.obterCardConversaNex(nomeContato)) {
    window.criarCardConversaNex(nomeContato, false, { text: texto }, 'enviada');
  }
  if (typeof marcarConversaComoNaoLidaNex === 'function') marcarConversaComoNaoLidaNex(nomeContato, false);
  if (typeof renderChat === 'function' && Drops.estado.conversaAtual === chaveConversa) renderChat(chaveConversa);
  if (inputComentario) {
    inputComentario.value = 'Você enviou um comentário.';
    atualizarEstadoEnviarNex(); sairModoComentarioNex(); inputComentario.blur();
    setTimeout(() => { inputComentario.value = ''; atualizarEstadoEnviarNex(); }, 1200);
  }
  if (typeof window.feedbackNex?.comentou === 'function') window.feedbackNex.comentou();
  registrarInteracaoNex(perfil.id || perfilAtualId || perfil.nome || '', 'comment', `nearby::${dropIndexAtual}`);
}

if (botaoEnviar) {
  botaoEnviar.addEventListener('click', () => {
    const temTexto = (inputComentario?.value || '').trim().length > 0;
    if (temTexto) enviarComentarioNearbyNex();
    else compartilharDropNearbyNex();
  });
}
async function compartilharDropNearbyNex() {
  const perfil = base[perfilAtualId];
  const drops = obterDropsDoPerfil(perfil);
  const drop = drops[dropIndexAtual];
  if (!perfil || !drop) return;
  const perfilIdCalc = perfil.id || perfilAtualId || perfil.nome || '';
  const urlCalc = drop.url || drop.imagem || '';
  const meuUser = String(Drops.usernameAtual || '').toLowerCase().trim();
  const autorLimpo = String(perfilIdCalc).toLowerCase().trim();
  if (autorLimpo && autorLimpo === meuUser) { window.mostrarToastNex?.('Você não pode compartilhar seu próprio drop.', 'info'); return; }
  const chaveDrop = window.chaveDropPerfilNex ? window.chaveDropPerfilNex(perfilIdCalc, dropIndexAtual, urlCalc) : `${perfilIdCalc}::${dropIndexAtual}::${urlCalc}`;
  const publicacaoId = window.__dropsMapaIdsPublicacao && window.__dropsMapaIdsPublicacao[chaveDrop];
  if (!publicacaoId) { window.mostrarToastNex?.('Drop muito antigo. Não é possível compartilhar.', 'info'); return; }
  if (typeof window.compartilharPublicacaoSupabase !== 'function') { window.mostrarToastNex?.('Sistema indisponível.', 'erro'); return; }
  const btn = viewer.querySelector('#nearbyBtnAcaoRodapeNex');
  if (btn) btn.style.pointerEvents = 'none';
  try {
    const resultado = await window.compartilharPublicacaoSupabase(publicacaoId);
    if (resultado?.ok) {
      window.mostrarToastNex?.('Drop compartilhado!', 'sucesso');
      if (btn) btn.classList.add('ja-compartilhado');
      if (publicacaoId) atualizarCapsulaShareNearbyNex(publicacaoId);
      if (typeof window.feedbackNex?.comentou === 'function') window.feedbackNex.comentou();
    } else if (resultado?.erro === 'ja_compartilhado') {
      if (btn) btn.classList.add('ja-compartilhado');
      window.mostrarToastNex?.('Você já compartilhou esse drop.', 'info');
    } else {
      window.mostrarToastNex?.('Falha ao compartilhar.', 'erro');
    }
  } catch (err) {
    window.mostrarToastNex?.('Falha ao compartilhar.', 'erro');
  } finally { if (btn) btn.style.pointerEvents = ''; }
}
window.compartilharDropNearbyNex = compartilharDropNearbyNex;

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
    viewer.querySelectorAll('.nearby-drop-reaction').forEach((btn) => btn.style.display = '');
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
    if (avatarUrl && typeof avatarUrl === 'string' && (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:image'))) {
      avatar.style.backgroundImage = `url('${avatarUrl}')`;
      avatar.style.backgroundSize = 'cover'; avatar.style.backgroundPosition = 'center'; avatar.textContent = '';
    } else {
      avatar.style.backgroundImage = 'none'; avatar.textContent = (perfil.nome || '?').charAt(0).toUpperCase();
    }
  }
  if (nome) nome.textContent = perfil.nome || 'Perfil';
  if (distancia) distancia.textContent = perfil.distancia || '';
  if (expire) expire.textContent = calcularTempoExpiracaoNex(drop.expiraEm);

  const selosAntigosNearby = viewer.querySelector('.selos-origem');
  if (selosAntigosNearby) selosAntigosNearby.remove();
  if (drop.selos && typeof window.gerarHTMLSelos === 'function') {
    const metaWrapNearby = viewer.querySelector('.nearby-drop-user-meta');
    if (metaWrapNearby) metaWrapNearby.insertAdjacentHTML('beforeend', window.gerarHTMLSelos(drop.selos));
  }
  if (counter) counter.textContent = `${dropIndexAtual + 1}/${drops.length}`;
  if (views) views.textContent = drop.views || 0;

  const perfilIdCalc = perfil.id || perfilAtualId || perfil.nome || '';
  const urlCalc = drop.url || drop.imagem || '';

  const stats = obterStatsReacaoDropNex(perfilIdCalc, dropIndexAtual, urlCalc);
  const totalReacoes = stats.heart + stats.broken;
  atualizarBotoesReacaoNex(viewer, perfilIdCalc, dropIndexAtual, urlCalc);

  const estouSilenciado = window.__quemMeSilenciouNex && window.__quemMeSilenciouNex.has(perfilIdCalc);
  const commentInputAtual = viewer.querySelector('.nearby-drop-comment-input');
  if (estouSilenciado && commentInputAtual) {
    commentInputAtual.disabled = true;
    commentInputAtual.placeholder = 'Você foi silenciado';
  } else if (commentInputAtual) {
    commentInputAtual.disabled = false;
    commentInputAtual.placeholder = 'Comentar...';
  }

  if (media) {
    const url = String(drop.url || drop.imagem || '');
    const tipoDrop = String(drop.type || drop.tipo || '').toLowerCase();

    if (primeiraRenderizacaoNex) {
      primeiraRenderizacaoNex = false;
      const ehVideo = tipoDrop.includes('video') || /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

      media.innerHTML = '';
      const novoInicial = document.createElement('div');
      novoInicial.className = 'nearby-pub-midia-item';

      if (ehVideo) {
        const playerWrapper = document.createElement('div');
        playerWrapper.className = 'player-custom-nex';
        playerWrapper.innerHTML = `
          <video id="videoPlayerNearbyNex" src="${url}" autoplay playsinline loop="${drop.loop ? 'true' : 'false'}" muted></video>
          <div class="video-overlay-swipe-nex"></div>
          <button type="button" class="btn-mute-custom-nex" onclick="toggleMuteNearbyNex(this)">
            <svg class="icone-mudo-nearby" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
              <line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
          </button>
          <div class="controles-inferiores-nex">
            <button type="button" class="btn-play-pause-custom-nex" onclick="togglePlayNearbyNex(this)">
              <svg class="icone-play-nearby" viewBox="0 0 24 24" style="display:none;"><path d="M8 5v14l11-7z"/></svg>
              <svg class="icone-pause-nearby" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>
            <div class="barra-tempo-custom-nex" onclick="seekNearbyNex(event, this)">
              <div class="barra-tempo-fundo-nex"><div class="barra-tempo-progresso-nex progresso-nearby"></div></div>
            </div>
            <div class="tempo-texto-nex"><span class="tempo-atual-nearby">0:00</span> / <span class="tempo-total-nearby">0:00</span></div>
          </div>
        `;
        novoInicial.appendChild(playerWrapper);

        const videoEl = playerWrapper.querySelector('video');
        const progressoEl = playerWrapper.querySelector('.progresso-nearby');
        const tempoAtualEl = playerWrapper.querySelector('.tempo-atual-nearby');
        const tempoTotalEl = playerWrapper.querySelector('.tempo-total-nearby');

        const formatarTempo = (s) => {
          if (isNaN(s)) return '0:00';
          const m = Math.floor(s / 60); const seg = Math.floor(s % 60);
          return `${m}:${seg.toString().padStart(2, '0')}`;
        };

        videoEl.addEventListener('loadedmetadata', () => tempoTotalEl.textContent = formatarTempo(videoEl.duration));
        videoEl.addEventListener('timeupdate', () => {
          if (!videoEl.duration) return;
          const pct = (videoEl.currentTime / videoEl.duration) * 100;
          progressoEl.style.width = `${pct}%`;
          tempoAtualEl.textContent = formatarTempo(videoEl.currentTime);
        });
        videoEl.addEventListener('play', () => {
          playerWrapper.querySelector('.icone-play-nearby').style.display = 'none';
          playerWrapper.querySelector('.icone-pause-nearby').style.display = 'block';
        });
        videoEl.addEventListener('pause', () => {
          playerWrapper.querySelector('.icone-play-nearby').style.display = 'block';
          playerWrapper.querySelector('.icone-pause-nearby').style.display = 'none';
        });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (videoEl.isConnected && videoEl.paused) videoEl.play().catch(() => {});
          });
        });
      } else {
        const img = document.createElement('img');
        img.src = url; img.alt = perfil.nome || '';
        novoInicial.appendChild(img);
      }
      media.appendChild(novoInicial);
    } else {
      animarMidiaNex(media, url, tipoDrop, direcaoAnimacaoNex);
    }
  }      
      viewer.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const alvo = e.target;
      if (alvo.closest('.nearby-drop-close') || alvo.closest('.nearby-drop-comment-box') ||
          alvo.closest('.nearby-drop-footer') || alvo.closest('.nearby-drop-profile-btn') ||
          alvo.closest('.nearby-pub-stats-row') || alvo.closest('.nearby-drop-expandir') ||
          alvo.closest('.controles-inferiores-nex') || alvo.closest('.btn-mute-custom-nex') ||
          alvo.closest('input')) {
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
      const absX = Math.abs(dx); const absY = Math.abs(dy);
      const limiteHorizontal = dt < TEMPO_GESTO_RAPIDO ? LIMITE_SWIPE_RAPIDO : LIMITE_SWIPE;

      if (absX > limiteHorizontal && absX > absY * 1.3) {
        const videoAtual = viewer.querySelector('#nearbyDropMedia video');
        if (videoAtual) delete videoAtual.dataset.pausadoPeloSwipe;
        if (dx < 0) {
          const perfil = base[perfilAtualId];
          const drops = obterDropsDoPerfil(perfil);
          if (dropIndexAtual < drops.length - 1) {
            dropIndexAtual += 1; direcaoAnimacaoNex = 'left';
            if (typeof window.feedbackNex?.navegouDrop === 'function') window.feedbackNex.navegouDrop();
            renderizar();
          }
        } else {
          if (dropIndexAtual > 0) {
            dropIndexAtual -= 1; direcaoAnimacaoNex = 'right';
            if (typeof window.feedbackNex?.navegouDrop === 'function') window.feedbackNex.navegouDrop();
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
            perfilAtualId = ids[idx + 1]; dropIndexAtual = 0; direcaoAnimacaoNex = 'down';
            if (typeof window.feedbackNex?.trocouPerfil === 'function') window.feedbackNex.trocouPerfil();
            renderizar();
          }
        } else {
          if (idx > 0) {
            perfilAtualId = ids[idx - 1]; dropIndexAtual = 0; direcaoAnimacaoNex = 'up';
            if (typeof window.feedbackNex?.trocouPerfil === 'function') window.feedbackNex.trocouPerfil();
            renderizar();
          }
        }
      }
    }, { passive: true });

    viewer.addEventListener('touchcancel', () => { swipeAtivo = false; }, { passive: true });
  } // FECHA renderizar()

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

  renderizar();
  document.body.style.overflow = 'hidden';
} // FECHA abrirViewerPublicacaoNex

async function atualizarCapsulaShareNearbyNex(publicacaoId) {
  const capsulaEl = document.querySelector('#nearbyDropShareCapsula');
  if (!capsulaEl) return;
  if (!publicacaoId || typeof window.jaCompartilhouSupabase !== 'function') { capsulaEl.style.display = 'none'; return; }
  try {
    const ja = await window.jaCompartilhouSupabase(publicacaoId);
    if (!ja) { capsulaEl.style.display = 'none'; return; }
    let total = 0;
    if (typeof window.contarCompartilhamentosSupabase === 'function') total = Number(await window.contarCompartilhamentosSupabase(publicacaoId)) || 0;
    capsulaEl.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg><span>${total}</span>`;
    capsulaEl.style.display = 'inline-flex';
  } catch (err) { capsulaEl.style.display = 'none'; }
}

function atualizarBotoesReacaoNex(viewerEl, perfilId, dropIndex, url) {
  if (!viewerEl) return;
  const usuarioId = Drops.usernameAtual || 'anonimo';
  let reacaoAtual = '';
  if (typeof window.obterReacaoUsuarioNex === 'function') {
    const chave = window.chaveDropPerfilNex ? window.chaveDropPerfilNex(perfilId, dropIndex, url) : chaveReacaoDropNex(perfilId, dropIndex, url);
    reacaoAtual = window.obterReacaoUsuarioNex(chave, usuarioId);
  } else {
    reacaoAtual = obterReacaoUsuarioDropNex(perfilId, dropIndex, url, usuarioId);
  }
  viewerEl.querySelectorAll('.nearby-drop-reaction').forEach((b) => {
    b.classList.toggle('ativo', b.textContent.trim() === reacaoAtual);
  });
}

function abrirPublicacaoConectadaNex(id) {
  const conectadosReais = lerConectadosMyDropsNex();
  const baseDinamica = {};
  conectadosReais.forEach((perfil) => {
    const idPerfil = normalizarIdPerfilNex(perfil.id);
    if (!idPerfil) return;
    const dadosVisuais = publicacoesNearbyNex.conectados[idPerfil] || publicacoesNearbyNex.nearby[idPerfil] || {};
    baseDinamica[idPerfil] = { id: idPerfil, nome: perfil.nome || dadosVisuais.nome || idPerfil, distancia: dadosVisuais.distancia || '', imagem: dadosVisuais.imagem || '', ...dadosVisuais };
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
    alert('Você ainda não publicou nenhum Drop.\n\nVá em My Drops e toque em Notas, Foto ou Vídeo pra criar um.');
    return;
  }
  abrirVisualizadorPublicacaoMyDropsNex(publicacoesOrdenadas, 0);
}
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
  const temLocalizacaoValida = typeof minhaLat === 'number' && typeof minhaLng === 'number';
  let usuarioSeMoveu = false;

  if (temLocalizacaoValida && ultimaLatNearbyNex !== null && ultimaLngNearbyNex !== null) {
    const distancia = calcularDistanciaMetrosNex(ultimaLatNearbyNex, ultimaLngNearbyNex, minhaLat, minhaLng);
    if (distancia > DISTANCIA_MINIMA_METROS) {
      usuarioSeMoveu = true;
      console.log(`📍 Usuário se moveu ${Math.round(distancia)}m. Limpando cache.`);
    }
  }

  if (!usuarioSeMoveu && cachePerfisNearbyNex !== null && cachePerfisNearbyNex.length > 0) {
    perfisEncontrados = cachePerfisNearbyNex;
    console.log(`📦 Nearby: usando cache (${perfisEncontrados.length} perfis)`);
  } else {
    try {
      perfisEncontrados = await window.buscarPerfisComDropsProximosSupabase(
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
    console.log(`📡 Nearby: ${perfisEncontrados.length} perfis encontrados (busca única de ${cacheRaioNearbyNex} km)`);
  }

  grid.innerHTML = '';
  if (!Array.isArray(perfisEncontrados) || perfisEncontrados.length === 0) {
    const vazio = document.createElement('div');
    vazio.style.cssText = `grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #94a3b8; font-size: 14px; font-weight: 600;`;
    vazio.textContent = 'Nenhuma publicação por perto ainda.';
    grid.appendChild(vazio);
    return;
  }

  const drops = [];
  perfisEncontrados.forEach((perfil) => {
    const dropsDoPerfil = Array.isArray(perfil.drops) ? perfil.drops : [];
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
  const idsConectados = new Set(conectadosLista.map((c) => String(c.id || '').replace(/^@/, '').toLowerCase().trim()));
  const dropsPorAutor = {};

  drops.forEach((drop) => {
    const autorId = String(drop.autorUsername || 'usuario').replace(/^@/, '').toLowerCase().trim();
    if (!dropsPorAutor[autorId]) dropsPorAutor[autorId] = [];
    dropsPorAutor[autorId].push(drop);
  });

  const autoresOrdenados = perfisEncontrados.map((p) => String(p.username || '').replace(/^@/, '').toLowerCase().trim());
  const autoresConectados = [];
  const autoresNaoConectados = [];

  autoresOrdenados.forEach((autorId) => {
    const lista = dropsPorAutor[autorId];
    if (!lista || !lista.length) return;
    if (idsConectados.has(autorId)) autoresConectados.push({ autorId, drops: lista });
    else autoresNaoConectados.push({ autorId, drops: lista });
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
    if (typeof minhaLat !== 'number' || typeof minhaLng !== 'number' || typeof autorLat !== 'number' || typeof autorLng !== 'number') return '';
    const metros = calcularDistanciaMetrosNex(minhaLat, minhaLng, autorLat, autorLng);
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
      avatar.textContent = (dropPrincipal.autorUsername || '?').charAt(0).toUpperCase();
    }

    const status = document.createElement('div');
    const ultimaAtiv = dropPrincipal.autorUltimaAtividade;
    const LIMITE_ONLINE_MS = 5 * 60 * 1000;
    const estaOnline = ultimaAtiv && Date.now() - new Date(ultimaAtiv).getTime() < LIMITE_ONLINE_MS;
    status.className = estaOnline ? 'story-online' : 'story-offline';

    const nome = document.createElement('h4');
    nome.textContent = '@' + (dropPrincipal.autorUsername || 'usuario');

    const dist = document.createElement('span');
    dist.textContent = obterDistanciaDropNex(dropPrincipal) || '—';

    card.appendChild(avatar);
    card.appendChild(status);
    card.appendChild(nome);
    card.appendChild(dist);
    card.addEventListener('click', () => abrirDropRealNearbyNex(dropPrincipal, drops, 'conectados'));
    stories.appendChild(card);
  });

  autoresNaoConectados.forEach(({ autorId, drops: dropsDoAutor }) => {
    const dropPrincipal = dropsDoAutor[0];
    const card = document.createElement('div');
    card.className = 'near-card';

    const ultimaAtiv = dropPrincipal.autorUltimaAtividade;
    const LIMITE_ONLINE_MS = 5 * 60 * 1000;
    const estaOnline = ultimaAtiv && Date.now() - new Date(ultimaAtiv).getTime() < LIMITE_ONLINE_MS;
    if (!estaOnline) card.classList.add('offline');

    if (dropPrincipal.mediaUrl) {
      const isVideo = dropPrincipal.tipo === 'video' || /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(dropPrincipal.mediaUrl);
      if (isVideo) {
        const videoFundo = document.createElement('video');
        videoFundo.src = dropPrincipal.mediaUrl;
        videoFundo.muted = true;
        videoFundo.playsInline = true;
        videoFundo.preload = 'metadata';
        videoFundo.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; pointer-events: none;';
        card.style.position = 'relative';
        card.style.overflow = 'hidden';
        card.appendChild(videoFundo);
      } else {
        const imgFundo = document.createElement('img');
        imgFundo.src = dropPrincipal.mediaUrl;
        imgFundo.alt = '';
        imgFundo.loading = 'lazy';
        imgFundo.decoding = 'async';
        imgFundo.style.cssText = 'position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; pointer-events: none;';
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
      avatar.textContent = (dropPrincipal.autorUsername || '?').charAt(0).toUpperCase();
    }

    const nome = document.createElement('h3');
    nome.textContent = '@' + (dropPrincipal.autorUsername || 'usuario');
    const dist = document.createElement('span');
    dist.textContent = obterDistanciaDropNex(dropPrincipal) || '—';

    card.append(avatar, nome, dist);
    grid.appendChild(card);

    card.addEventListener('click', () => abrirDropRealNearbyNex(dropPrincipal, drops, 'nearby'));

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
          setTimeout(() => { if (card.parentNode) card.remove(); }, 400);
          cachePerfisNearbyNex = null;
          setTimeout(() => { if (typeof renderizarPublicacoesNearbyNex === 'function') renderizarPublicacoesNearbyNex(); }, 500);
        }, tempoRestante);
      }
    }
  });
}
  function receberAvisoNearbyNex(pub) {
  if (!pub || !pub.autor_username) return;
  if (pub.expira_em) {
    const agora = Date.now();
    const expira = new Date(pub.expira_em).getTime();
    if (expira <= agora) { console.log('⏳ Aviso ignorado (drop já expirou):', pub.id); return; }
  }
  const minhaLat = window.minhaLatitudeAtual;
  const minhaLng = window.minhaLongitudeAtual;
  if (typeof minhaLat !== 'number' || typeof minhaLng !== 'number') return;
  const autorLat = pub.autor_lat;
  const autorLng = pub.autor_lng;
  if (typeof autorLat !== 'number' || typeof autorLng !== 'number') { console.warn('Aviso sem coordenadas do autor. Ignorando.'); return; }
  const distancia = calcularDistanciaMetrosNex(minhaLat, minhaLng, autorLat, autorLng);
  const RAIO_MAXIMO = 5000 * 1000;
  if (distancia > RAIO_MAXIMO) { console.log(`📡 Aviso de @${pub.autor_username} ignorado (distância: ${Math.round(distancia / 1000)} km)`); return; }
  console.log(`📡 Aviso válido de @${pub.autor_username}. Atualizando Nearby.`);
  cachePerfisNearbyNex = null;
  ultimaLatNearbyNex = null;
  ultimaLngNearbyNex = null;
  if (typeof renderizarPublicacoesNearbyNex === 'function') renderizarPublicacoesNearbyNex();
}

window.publicacoesNearbyNex = publicacoesNearbyNex;
window.receberAvisoNearbyNex = receberAvisoNearbyNex;
window.buscarPerfilNearbyNex = buscarPerfilNearbyNex;
window.abrirDropComentadoNex = abrirDropComentadoNex;
window.abrirViewerPublicacaoNex = abrirViewerPublicacaoNex;
window.abrirPublicacaoConectadaNex = abrirPublicacaoConectadaNex;
window.abrirPublicacaoNearbyNex = abrirPublicacaoNearbyNex;
window.abrirMinhasPublicacoesNearby = abrirMinhasPublicacoesNearby;
window.renderizarPublicacoesNearbyNex = renderizarPublicacoesNearbyNex;
window.obterStatsReacaoDropNex = obterStatsReacaoDropNex;
window.obterReacaoUsuarioDropNex = obterReacaoUsuarioDropNex;
window.registrarReacaoDropNex = registrarReacaoDropNex;
window.obterDropsDoPerfil = obterDropsDoPerfil;

window.togglePlayNearbyNex = function(btn) {
  const wrapper = btn.closest('.player-custom-nex');
  if (!wrapper) return;
  const video = wrapper.querySelector('video');
  if (video.paused) video.play();
  else video.pause();
};

window.toggleMuteNearbyNex = function(btn) {
  const wrapper = btn.closest('.player-custom-nex');
  if (!wrapper) return;
  const video = wrapper.querySelector('video');
  const icone = btn.querySelector('svg');
  video.muted = !video.muted;
  if (video.muted) {
    icone.innerHTML = `<line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line>`;
  } else {
    icone.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>`;
  }
};

window.seekNearbyNex = function(e, barra) {
  const wrapper = barra.closest('.player-custom-nex');
  if (!wrapper) return;
  const video = wrapper.querySelector('video');
  const rect = barra.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  video.currentTime = pct * video.duration;
};
    function abrirDropRealNearbyNex(dropClicado, listaDeDrops, tipoOrigem = null) {
    if (!dropClicado) return;
    let lista = Array.isArray(listaDeDrops) ? listaDeDrops : [];

    if (tipoOrigem === 'conectados' || tipoOrigem === 'nearby') {
      const conectados = typeof lerConectadosMyDropsNex === 'function' ? lerConectadosMyDropsNex() : [];
      const idsConectados = new Set(conectados.map((c) => String(c.id || '').replace(/^@/, '').toLowerCase().trim()));
      lista = lista.filter((d) => {
        const autor = String(d.autorUsername || '').replace(/^@/, '').toLowerCase().trim();
        const ehConectado = idsConectados.has(autor);
        return tipoOrigem === 'conectados' ? ehConectado : !ehConectado;
      });
      if (!lista.length) lista = [dropClicado];
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
          const chaveLocal = typeof window.chaveDropPerfilNex === 'function'
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

    const indexClicado = perfilClicado.drops.findIndex((d) => d.dropIndex === dropClicado.id);
    const dropIndexFinal = indexClicado >= 0 ? indexClicado : 0;

    if (typeof window.abrirViewerPublicacaoNex === 'function') {
      window.abrirViewerPublicacaoNex(perfilClicado, 'nearby', autorClicado, dropIndexFinal, base);
    } else {
      console.warn('abrirViewerPublicacaoNex não disponível');
    }
  }

  window.abrirDropRealNearbyNex = abrirDropRealNearbyNex;

  document.addEventListener('DOMContentLoaded', () => {
    const btnMinhasPublicacoes = document.getElementById('btnMinhasPublicacoesNearby');
    if (btnMinhasPublicacoes) {
      btnMinhasPublicacoes.addEventListener('click', () => {
        abrirMinhasPublicacoesNearby();
      });
    }

    if (!window.__listenerMidiaNex) {
      window.__listenerMidiaNex = true;
      document.addEventListener('click', (e) => {
        const btnComentario = e.target.closest('.msg-nearby-comment-btn');
        if (btnComentario) {
          e.preventDefault(); e.stopPropagation();
          const perfilId = btnComentario.dataset.perfilId || '';
          const perfilNome = btnComentario.dataset.perfilNome || '';
          const dropIndex = Number(btnComentario.dataset.dropIndex || 0);
          if (typeof window.abrirDropComentadoNex === 'function') window.abrirDropComentadoNex(perfilId, perfilNome, dropIndex);
          return;
        }
        const btnPerfil = e.target.closest('.msg-drop-profile-btn');
        if (btnPerfil) {
          e.preventDefault(); e.stopPropagation();
          abrirPerfilVisitadoNex(btnPerfil.dataset.perfilId || '', btnPerfil.dataset.perfilNome || '');
          return;
        }
        const dropPreview = e.target.closest('.msg-drop-preview-open');
        if (dropPreview) {
          e.preventDefault();
          abrirDropComentadoNex(dropPreview.dataset.perfilId || '', dropPreview.dataset.perfilNome || '', Number(dropPreview.dataset.dropIndex || 0));
          return;
        }
        const el = e.target.closest('.msg-midia-open');
        if (!el) return;
        e.preventDefault(); e.stopPropagation();
        const url = el.dataset.url;
        const tipo = el.dataset.tipo || 'image';
        if (url) abrirMidiaChatNex(url, tipo);
      });
    }
  });

    // ============================================
  // FORÇAR ATUALIZAÇÃO DO NEARBY (BOTÃO)
  // ============================================
  async function forcarAtualizacaoNearbyNex() {
    const btn = document.getElementById('btnAtualizarNearbyNex');
    const icone = document.getElementById('iconeAtualizarNearbyNex');

    if (!btn || !icone) return;

    btn.disabled = true;
    icone.classList.add('girando');

    // Limpa o cache para forçar a busca no banco
    cachePerfisNearbyNex = null;
    ultimaLatNearbyNex = null;
    ultimaLngNearbyNex = null;

    if (typeof window.limparCacheNaoVistoNex === 'function') {
      window.limparCacheNaoVistoNex();
    }

    // Tenta pegar a localização exata AGORA
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          window.minhaLatitudeAtual = pos.coords.latitude;
          window.minhaLongitudeAtual = pos.coords.longitude;
          
          renderizarPublicacoesNearbyNex();
          
          finalizarAtualizacaoNex(btn, icone);
        },
        (err) => {
          console.warn('Erro ao pegar GPS para atualizar:', err);
          renderizarPublicacoesNearbyNex();
          finalizarAtualizacaoNex(btn, icone);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      renderizarPublicacoesNearbyNex();
      finalizarAtualizacaoNex(btn, icone);
    }
  }

  function finalizarAtualizacaoNex(btn, icone) {
    setTimeout(() => {
      icone.classList.remove('girando');
      btn.disabled = false;
      
      if (typeof window.mostrarToastNex === 'function') {
        window.mostrarToastNex('Nearby atualizado!', 'sucesso');
      }
    }, 800);
  }

  window.forcarAtualizacaoNearbyNex = forcarAtualizacaoNearbyNex;

  console.log('🗺️ 11-nearby.js carregado');

})();
