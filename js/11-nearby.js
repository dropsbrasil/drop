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
  // DADOS DOS PERFIS NEARBY (fixos por enquanto)
  // ============================================
  // Serão substituídos por consultas ao backend.

  const publicacoesNearbyNex = {
    conectados: {
      julia: {
        nome: 'Julia',
        distancia: '120 m',
        imagem: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200'
      },
      lucas: {
        nome: 'Lucas',
        distancia: '350 m',
        imagem: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200'
      },
      ana: {
        nome: 'Ana',
        distancia: '620 m',
        imagem: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200'
      },
      rafael: {
        nome: 'Rafael',
        distancia: '1.2 km',
        imagem: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200'
      }
    },
    nearby: {
      julia: {
        nome: 'Julia',
        distancia: '120 m',
        imagem: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200'
      },
      lucas: {
        nome: 'Lucas',
        distancia: '350 m',
        imagem: 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1200'
      },
      ana: {
        nome: 'Ana',
        distancia: '620 m',
        imagem: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200'
      },
      rafael: {
        nome: 'Rafael',
        distancia: '1.2 km',
        imagem: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200'
      },
      camila: {
        nome: 'Camila',
        distancia: '1.8 km',
        imagem: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200'
      },
      mateus: {
        nome: 'Mateus',
        distancia: '2.4 km',
        imagem: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200'
      },
      beatriz: {
        nome: 'Beatriz',
        distancia: '3.1 km',
        imagem: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200'
      },
      pedro: {
        nome: 'Pedro',
        distancia: '4.6 km',
        imagem: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200'
      },
      larissa: {
        nome: 'Larissa',
        distancia: '5.2 km',
        imagem: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200'
      }
    }
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
  // ABRIR DROP COMENTADO (usado quando clica
  // num drop recebido no chat)
  // ============================================

  function abrirDropComentadoNex(perfilId, perfilNome, dropIndex = 0) {
    const achado = buscarPerfilNearbyNex(perfilId, perfilNome);
    if (!achado) return;

    abrirViewerPublicacaoNex(
      achado.perfil,
      achado.tipo,
      achado.id,
      dropIndex
    );
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
  // ⚠️ Se o sistema novo está disponível, delega pra ele
  if (
    typeof window.obterStatsReacaoNex === 'function' &&
    typeof window.chaveDropPerfilNex === 'function'
  ) {
    const chave = window.chaveDropPerfilNex(perfilId, dropIndex, url);
    return window.obterStatsReacaoNex(chave);
  }

  // Fallback: comportamento antigo (Map em memória)
  return (
    reacoesDropsNex.get(chaveReacaoDropNex(perfilId, dropIndex, url)) || {
      heart: 0,
      broken: 0
    }
  );
}

function obterReacaoUsuarioDropNex(perfilId, dropIndex, url, usuarioId) {
  // ⚠️ Se o sistema novo está disponível, delega pra ele
  if (
    typeof window.obterReacaoUsuarioNex === 'function' &&
    typeof window.chaveDropPerfilNex === 'function'
  ) {
    const chave = window.chaveDropPerfilNex(perfilId, dropIndex, url);
    return window.obterReacaoUsuarioNex(chave, usuarioId);
  }

  // Fallback: comportamento antigo (Map em memória)
  return (
    reacoesUsuarioDropNex.get(
      chaveUsuarioReacaoDropNex(perfilId, dropIndex, url, usuarioId)
    ) || ''
  );
}

  // ============================================
  // REGISTRAR REAÇÃO EM UM DROP
  // ============================================
  // Quando você reage (❤️ ou 💔) num drop:
  // - Atualiza o contador
  // - Registra a interação no sistema de adeptos

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

// ⚠️ FASE 5: salva no Supabase (backend) além do localStorage
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
  // ⚠️ Se o sistema de reações está disponível, usa ele
  if (typeof window.alternarReacaoNex === 'function') {
    const resultado = window.alternarReacaoNex(chaveDrop, usuarioId, emoji);

    // Atualiza Map antigo pra manter compatibilidade com quem lê dele
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

    // Registra interação só quando ADICIONOU (não no toggle de remoção)
    if (resultado.reacaoAtual) {
      registrarInteracaoNex(
        perfilId,
        resultado.reacaoAtual === '❤️' ? 'like' : 'deslike',
        `${perfilId}::${dropIndex}`
      );
    }

    return resultado;
  }

  // Fallback: comportamento antigo em memória (caso 15-reacoes não carregue)
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

  // ============================================
  // DEFINE A BASE DE PERFIS
  // ============================================

  let base;

  if (baseOverride) {
    base = baseOverride;
  } else if (tipo === 'conectados') {
    // Monta base dinâmica a partir dos conectados reais
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

  // ============================================
  // REMOVE VIEWER ANTIGO
  // ============================================

  const antigo = document.querySelector('.nearby-drop-viewer');
  if (antigo) antigo.remove();

  // ============================================
  // MONTA HTML DO VIEWER
  // ============================================

  const viewer = document.createElement('div');
  viewer.className = 'nearby-drop-viewer';

  viewer.innerHTML = `
    <div class="nearby-drop-bg"></div>

    <div class="nearby-drop-shell">
      <div class="nearby-drop-topbar">
        <div class="nearby-drop-top-left">
          <div class="nearby-drop-user">
            <div class="nearby-drop-avatar" id="nearbyDropAvatar"></div>

            <div class="nearby-drop-user-meta">
              <strong id="nearbyDropNome"></strong>
              <span id="nearbyDropDistancia"></span>
              <small id="nearbyDropExpire"></small>
            </div>
          </div>
        </div>

        <div class="nearby-drop-top-right">
          <button class="nearby-drop-close" type="button" aria-label="Voltar">➥</button>
          <div class="nearby-drop-counter" id="nearbyDropCounter"></div>
        </div>
      </div>

      <button class="nearby-drop-nav nearby-drop-nav-up" type="button" aria-label="Perfil anterior">
        ⌃
      </button>

      <button class="nearby-drop-arrow nearby-drop-arrow-left" type="button" aria-label="Anterior">
        ‹
      </button>

      <div class="nearby-drop-media-wrap">
        <div class="nearby-drop-media" id="nearbyDropMedia"></div>
      </div>

      <button class="nearby-drop-arrow nearby-drop-arrow-right" type="button" aria-label="Próxima">
        ›
      </button>

      <button class="nearby-drop-nav nearby-drop-nav-down" type="button" aria-label="Próximo perfil">
        ⌄
      </button>

      <div class="nearby-drop-footer">
        <div class="nearby-drop-footer-top">
          <div class="nearby-drop-left-stats">
            <div class="nearby-drop-views">
              👁️‍🗨️ <span id="nearbyDropViews">0</span>
            </div>

            <div class="nearby-drop-reactions" id="nearbyDropReactions"></div>
          </div>

          <button class="nearby-drop-profile-btn" type="button">
            👣 Visitar perfil
          </button>
        </div>

        <div class="nearby-drop-comment-box">
          <input class="nearby-drop-comment-input" placeholder="Comentar...">
          <button class="nearby-drop-reaction" type="button">❤️</button>
          <button class="nearby-drop-reaction" type="button">💔</button>
          <button class="nearby-drop-send" type="button">⌯⌲</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(viewer);

  // ============================================
  // BOTÃO VISITAR PERFIL
  // ============================================

  const btnVisitarPerfil = viewer.querySelector('.nearby-drop-profile-btn');

  if (tipo === 'perfil') {
    if (btnVisitarPerfil) btnVisitarPerfil.style.display = 'none';
  } else if (btnVisitarPerfil) {
  btnVisitarPerfil.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const perfil = base[perfilAtualId];
    if (!perfil) return;

    // ⚠️ CORREÇÃO: Fecha o viewer ANTES de abrir o perfil
    viewer.remove();
    document.body.style.overflow = '';
    document.body.classList.remove('viewer-aberto');

    // ⚠️ CORREÇÃO: Chama a função (ela mesma fecha outros viewers e mostra a tela)
    abrirPerfilVisitadoNex(
      perfil.id || perfilAtualId || perfil.nome || '',
      perfil.nome || 'Perfil'
    );
  });
  }

  // ============================================
  // INPUT DE COMENTÁRIO
  // ============================================

  const inputComentario = viewer.querySelector('.nearby-drop-comment-input');
  const botaoEnviar = viewer.querySelector('.nearby-drop-send');

  function atualizarEstadoEnviarNex() {
    const texto = (inputComentario?.value || '').trim();
    if (!botaoEnviar) return;

    botaoEnviar.disabled = !texto;
    botaoEnviar.classList.toggle('is-active', !!texto);
  }

  if (inputComentario) {
    atualizarEstadoEnviarNex();
    inputComentario.addEventListener('input', atualizarEstadoEnviarNex);
  }

  // ============================================
  // BOTÕES DE REAÇÃO
  // ============================================

  viewer.querySelectorAll('.nearby-drop-reaction').forEach((btn) => {
  btn.addEventListener('click', () => {
    const perfil = base[perfilAtualId];
    const drops = obterDropsDoPerfil(perfil);
    const drop = drops[dropIndexAtual];

    if (!perfil || !drop) return;

    const perfilIdCalc = perfil.id || perfilAtualId || perfil.nome || '';
    const urlCalc = drop.url || drop.imagem || '';

    // ⚠️ Bloqueia auto-reação
    const autorLimpo = String(perfilIdCalc).toLowerCase();
    const meuUser = String(Drops.usernameAtual || '').toLowerCase();

    if (autorLimpo && autorLimpo === meuUser) {
      window.mostrarToastNex?.(
        'Você não pode reagir ao seu próprio drop.',
        'info'
      );
      return;
    }

    // ⚠️ Usa o @username real, não 'local'
    const usuarioId = Drops.usernameAtual || 'anonimo';

    registrarReacaoDropNex(
      perfilIdCalc,
      dropIndexAtual,
      urlCalc,
      btn.textContent.trim(),
      usuarioId
    );

    // ⚠️ Pop visual
    btn.classList.remove('pop-anim');
    void btn.offsetWidth;
    btn.classList.add('pop-anim');
    setTimeout(() => btn.classList.remove('pop-anim'), 360);

    // ⚠️ Atualiza estado ativo dos botões
    atualizarBotoesReacaoNex(viewer, perfilIdCalc, dropIndexAtual, urlCalc);

    // Re-renderiza contador
    renderizar();

    if (typeof renderChat === 'function') {
      renderChat(Drops.estado.conversaAtual);
    }
  });
});

  document.body.style.overflow = 'hidden';

  // ============================================
  // ENVIAR COMENTÁRIO
  // ============================================

  function enviarComentarioNearbyNex() {
    const texto = (inputComentario?.value || '').trim();
    if (!texto) return;

    const perfil = base[perfilAtualId];
    const drops = obterDropsDoPerfil(perfil);
    const drop = drops[dropIndexAtual];

    if (!perfil || !drop) return;

    const nomeContato = perfil.nome || 'Perfil Nearby';
    const chaveConversa = nomeContato;

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
        type: drop.type === 'video' ? 'video' : 'imagem',
        url: drop.url || drop.imagem || '',
        origem: 'nearby',
        perfilNome: nomeContato,
        perfilId: perfil.id || '',
        dropIndex: dropIndexAtual
      }
    };

    if (typeof registrarMensagemRecebidaNex === 'function') {
      registrarMensagemRecebidaNex(nomeContato, mensagemNearby, false);
    } else {
      if (!conversas[chaveConversa]) {
        conversas[chaveConversa] = [];
      }
      conversas[chaveConversa].push(mensagemNearby);
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

      setTimeout(() => {
        inputComentario.value = '';
        atualizarEstadoEnviarNex();
      }, 1200);
    }

    // Registra comentário como interação pro sistema de adeptos
    registrarInteracaoNex(
      perfil.id || perfilAtualId || perfil.nome || '',
      'comment',
      `nearby::${dropIndexAtual}`
    );
  }

  if (botaoEnviar) {
    botaoEnviar.addEventListener('click', enviarComentarioNearbyNex);
  }
     // ============================================
// RENDERIZAR O VIEWER
// ============================================

// ⚠️ FASE 5: garante que só busca do Supabase 1x por drop
const dropsJaSincronizados = new Set();

// ⚠️ FASE 5.2: evita registrar view 2x do mesmo drop
const viewsJaRegistradas = new Set();
  
function renderizar() {
  const perfil = base[perfilAtualId];
  if (!perfil) return;

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
      if (counter) {
        counter.textContent = `${dropIndexAtual + 1}/${drops.length}`;
      }
      if (views) views.textContent = drop.views || 0;

      // ============================================
      // REAÇÕES
      // ============================================

      const reacoesEl = viewer.querySelector('#nearbyDropReactions');
const perfilIdCalc = perfil.id || perfilAtualId || perfil.nome || '';
const urlCalc = drop.url || drop.imagem || '';

const stats = obterStatsReacaoDropNex(
  perfilIdCalc,
  dropIndexAtual,
  urlCalc
);

const totalReacoes = stats.heart + stats.broken;

// ⚠️ Marca os botões que o usuário já reagiu
atualizarBotoesReacaoNex(viewer, perfilIdCalc, dropIndexAtual, urlCalc);

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

// ⚠️ FASE 5: Busca reações reais do Supabase (sincronização)
// Só busca UMA VEZ por drop, pra não competir com o clique
const chaveDropAtual = window.chaveDropPerfilNex
  ? window.chaveDropPerfilNex(perfilIdCalc, dropIndexAtual, urlCalc)
  : `${perfilIdCalc}::${dropIndexAtual}::${urlCalc}`;

const publicacaoIdAtual =
  window.__dropsMapaIdsPublicacao &&
  window.__dropsMapaIdsPublicacao[chaveDropAtual];

if (
  publicacaoIdAtual &&
  typeof window.buscarReacoesSupabase === 'function' &&
  !dropsJaSincronizados.has(chaveDropAtual)
) {
  dropsJaSincronizados.add(chaveDropAtual);

  window
    .buscarReacoesSupabase(publicacaoIdAtual)
    .then((dadosSupabase) => {
      if (!dadosSupabase) return;

      const totalSupabase =
        dadosSupabase.heart + dadosSupabase.broken;

      // Atualiza o contador com dados reais
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

            // Atualiza os botões ativos
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

// ⚠️ FASE 5.2: registra visualização (só se não for o próprio autor)
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

  // Só conta se NÃO for o próprio drop
  if (autor && autor !== eu) {
    viewsJaRegistradas.add(chaveDropAtual);

    window
      .registrarVisualizacaoSupabase(publicacaoIdAtual)
      .catch((err) =>
        console.warn('Erro ao registrar view:', err)
      );
  }
}

      // ============================================
      // MÍDIA (imagem ou vídeo)
      // ============================================

      if (media) {
        const url = String(drop.url || drop.imagem || '');
        const tipoDrop = String(drop.type || drop.tipo || '').toLowerCase();

        const ehVideo =
          tipoDrop.includes('video') ||
          /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

        media.innerHTML = '';

        if (ehVideo) {
          const video = document.createElement('video');
          video.src = url;
          video.controls = true;
          video.autoplay = true;
          video.muted = true;
          video.playsInline = true;
          video.preload = 'metadata';
          media.appendChild(video);
        } else {
          const img = document.createElement('img');
          img.src = url;
          img.alt = perfil.nome || '';
          media.appendChild(img);
        }
      }

      // ============================================
      // NAVEGAÇÃO (setas desabilitadas nos extremos)
      // ============================================

      const profileIndex = ids.indexOf(perfilAtualId);

      const upBtn = viewer.querySelector('.nearby-drop-nav-up');
      const downBtn = viewer.querySelector('.nearby-drop-nav-down');
      const leftBtn = viewer.querySelector('.nearby-drop-arrow-left');
      const rightBtn = viewer.querySelector('.nearby-drop-arrow-right');

      if (upBtn) upBtn.disabled = profileIndex <= 0;
      if (downBtn) downBtn.disabled = profileIndex >= ids.length - 1;
      if (leftBtn) leftBtn.disabled = dropIndexAtual <= 0;
      if (rightBtn) rightBtn.disabled = dropIndexAtual >= drops.length - 1;
    }

    // ============================================
    // EVENTOS DE FECHAR
    // ============================================

    viewer.querySelector('.nearby-drop-close').onclick = () => {
      viewer.remove();
      document.body.style.overflow = '';
    };

    viewer.addEventListener('click', (e) => {
      if (e.target === viewer) {
        viewer.remove();
        document.body.style.overflow = '';
      }
    });

    // ============================================
    // NAVEGAÇÃO ENTRE DROPS (setas laterais)
    // ============================================

    viewer.querySelector('.nearby-drop-arrow-left').onclick = () => {
      if (dropIndexAtual <= 0) return;
      dropIndexAtual -= 1;
      renderizar();
    };

    viewer.querySelector('.nearby-drop-arrow-right').onclick = () => {
      const perfil = base[perfilAtualId];
      const drops = obterDropsDoPerfil(perfil);
      if (dropIndexAtual >= drops.length - 1) return;
      dropIndexAtual += 1;
      renderizar();
    };

    // ============================================
    // NAVEGAÇÃO ENTRE PERFIS (setas verticais)
    // ============================================

    viewer.querySelector('.nearby-drop-nav-up').onclick = () => {
      const idx = ids.indexOf(perfilAtualId);
      if (idx <= 0) return;
      perfilAtualId = ids[idx - 1];
      dropIndexAtual = 0;
      renderizar();
    };

    viewer.querySelector('.nearby-drop-nav-down').onclick = () => {
      const idx = ids.indexOf(perfilAtualId);
      if (idx >= ids.length - 1) return;
      perfilAtualId = ids[idx + 1];
      dropIndexAtual = 0;
      renderizar();
    };

      // ============================================
      // SWIPE (ARRASTAR) — horizontal = troca drop
      //                 — vertical   = troca perfil
      // ============================================

      let swipeStartX = 0;
      let swipeStartY = 0;
      let swipeStartTime = 0;
      let swipeAtivo = false;

      const LIMITE_SWIPE = 50;
      const TEMPO_MAX_SWIPE = 800;

      viewer.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;

        const alvo = e.target;
        if (
          alvo.closest('.nearby-drop-arrow') ||
          alvo.closest('.nearby-drop-nav') ||
          alvo.closest('.nearby-drop-close') ||
          alvo.closest('.nearby-drop-comment-box') ||
          alvo.closest('.nearby-drop-footer') ||
          alvo.closest('.nearby-drop-profile-btn') ||
          alvo.closest('input') ||
          alvo.closest('video')
        ) {
          swipeAtivo = false;
          return;
        }

        swipeAtivo = true;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
        swipeStartTime = Date.now();
      }, { passive: true });

      viewer.addEventListener('touchend', (e) => {
        if (!swipeAtivo) return;
        swipeAtivo = false;

        if (!e.changedTouches || e.changedTouches.length === 0) return;

        const dx = e.changedTouches[0].clientX - swipeStartX;
        const dy = e.changedTouches[0].clientY - swipeStartY;
        const dt = Date.now() - swipeStartTime;

        if (dt > TEMPO_MAX_SWIPE) return;

        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        // Horizontal dominante
        if (absX > LIMITE_SWIPE && absX > absY * 1.3) {
          if (dx < 0) {
            // arrastou para a ESQUERDA → próximo drop
            const perfil = base[perfilAtualId];
            const drops = obterDropsDoPerfil(perfil);
            if (dropIndexAtual < drops.length - 1) {
              dropIndexAtual += 1;
              renderizar();
            }
          } else {
            // arrastou para a DIREITA → drop anterior
            if (dropIndexAtual > 0) {
              dropIndexAtual -= 1;
              renderizar();
            }
          }
          return;
        }

        // Vertical dominante
        if (absY > LIMITE_SWIPE && absY > absX * 1.3) {
          const idx = ids.indexOf(perfilAtualId);

          if (dy < 0) {
            // arrastou para CIMA → próximo perfil
            if (idx < ids.length - 1) {
              perfilAtualId = ids[idx + 1];
              dropIndexAtual = 0;
              renderizar();
            }
          } else {
            // arrastou para BAIXO → perfil anterior
            if (idx > 0) {
              perfilAtualId = ids[idx - 1];
              dropIndexAtual = 0;
              renderizar();
            }
          }
        }
      }, { passive: true });

      // Renderiza primeira vez
  renderizar();
}

// ============================================
// MARCA BOTÕES DE REAÇÃO COM ESTADO ATIVO
// ============================================

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

  // ============================================
  // ABRIR PUBLICAÇÃO DE CONECTADO
  // ============================================

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

  // ============================================
  // ABRIR PUBLICAÇÃO DE PERFIL NEARBY
  // ============================================

  function abrirPublicacaoNearbyNex(id) {
    abrirViewerPublicacaoNex(publicacoesNearbyNex.nearby[id], 'nearby', id);
  }

  // ============================================
  // ABRIR MINHAS PUBLICAÇÕES
  // ============================================

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

  // Mantém o story fixo "Minhas publicações"
  const storyFixa = stories.querySelector('.my-story');
  stories.innerHTML = '';
  if (storyFixa) stories.appendChild(storyFixa);

  // ============================================
  // BUSCA DADOS REAIS DO SUPABASE
  // ============================================
  if (typeof window.buscarTodosOsDropsComAutor !== 'function') {
    console.warn('buscarTodosOsDropsComAutor não disponível ainda');
    return;
  }

  let drops = [];

try {
  drops = await window.buscarTodosOsDropsComAutor(50);
} catch (e) {
  console.warn('Erro ao buscar drops do Nearby:', e);
  return;
}

// ⚠️ Remove as MINHAS publicações do Nearby
const meuUsername = String(Drops.usernameAtual || '')
  .replace(/^@/, '')
  .toLowerCase()
  .trim();

if (meuUsername) {
  drops = drops.filter((d) => {
    const autor = String(d.autorUsername || '')
      .replace(/^@/, '')
      .toLowerCase()
      .trim();
    return autor !== meuUsername;
  });
}

  grid.innerHTML = '';

  if (!Array.isArray(drops) || drops.length === 0) {
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

  // ============================================
  // DISTÂNCIAS FAKE (por enquanto)
  // ============================================
  const distanciasFake = [
    '120 m', '350 m', '620 m', '1.2 km', '1.8 km',
    '2.4 km', '3.1 km', '4.6 km', '5.2 km', '8.3 km',
    '12 km', '25 km', '50 km', '120 km', '350 km',
    '800 km', '1.500 km', '3.000 km', '5.000 km'
  ];

// ============================================
// AGRUPA DROPS POR AUTOR (1 card por perfil)
// ============================================
const dropsPorAutor = {};

drops.forEach((drop) => {
  const autorId = drop.autorUsername || 'usuario';
  if (!dropsPorAutor[autorId]) {
    dropsPorAutor[autorId] = [];
  }
  dropsPorAutor[autorId].push(drop);
});

// ============================================
// CRIA UM CARTÃO POR AUTOR
// ============================================
Object.entries(dropsPorAutor).forEach(([autorId, dropsDoAutor], index) => {
  const dropPrincipal = dropsDoAutor[0];

  const card = document.createElement('div');
  card.className = 'near-card';

  // ⚠️ Status online/offline (últimos 5 min = online)
  const ultimaAtiv = dropPrincipal.autorUltimaAtividade;
  const LIMITE_ONLINE_MS = 5 * 60 * 1000;

  const estaOnline =
    ultimaAtiv &&
    Date.now() - new Date(ultimaAtiv).getTime() < LIMITE_ONLINE_MS;

  if (!estaOnline) {
    card.classList.add('offline');
  }

  // Imagem do drop mais recente como fundo
  if (dropPrincipal.mediaUrl) {
    card.style.backgroundImage = `url('${dropPrincipal.mediaUrl}')`;
    card.style.backgroundSize = 'cover';
    card.style.backgroundPosition = 'center';
  }

  // Avatar do autor
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

  // @username do autor
  const nome = document.createElement('h3');
  nome.textContent = '@' + (dropPrincipal.autorUsername || 'usuario');

  // Distância fake
  const dist = document.createElement('span');
  dist.textContent = distanciasFake[index % distanciasFake.length];

  card.append(avatar, nome, dist);
  grid.appendChild(card);

  // Clique abre o viewer com os drops DESSE autor
  card.addEventListener('click', () => {
    abrirDropRealNearbyNex(dropPrincipal, drops);
  });
});
  }
  
  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.publicacoesNearbyNex = publicacoesNearbyNex;

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
function abrirDropRealNearbyNex(dropClicado, listaDeDrops) {
  if (!dropClicado) return;

  const lista = Array.isArray(listaDeDrops) ? listaDeDrops : [];

  // ============================================
  // AGRUPA DROPS POR AUTOR
  // ============================================
  const dropsPorAutor = {};

  lista.forEach((d) => {
    const id = d.autorUsername || 'usuario';
    if (!dropsPorAutor[id]) dropsPorAutor[id] = [];
    dropsPorAutor[id].push(d);
  });

  // ============================================
  // MONTA A BASE DE PERFIS (compatível com viewer)
  // ============================================
  const base = {};

  Object.entries(dropsPorAutor).forEach(([autorId, drops]) => {
    const primeiro = drops[0];

    base[autorId] = {
  id: autorId,
  nome: primeiro.autorNome || autorId,
  avatar: primeiro.autorAvatar || null,
  distancia: '',
  drops: drops.map((d, idxDentro) => {
    // ⚠️ FASE 5: guarda o id do Supabase pra ligar a reação
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
  expiraEm: d.expiraEm || null
};
  })
  };
  });

  // ============================================
  // IDENTIFICA O AUTOR CLICADO E O ÍNDICE DO DROP
  // ============================================
  const autorClicado = dropClicado.autorUsername || 'usuario';
  const perfilClicado = base[autorClicado];

  if (!perfilClicado) return;

  // Acha o índice do drop clicado dentro do perfil dele
  const indexClicado = perfilClicado.drops.findIndex(
    (d) => d.dropIndex === dropClicado.id
  );

  const dropIndexFinal = indexClicado >= 0 ? indexClicado : 0;

  // ============================================
  // ABRE O VIEWER COM TIPO 'nearby'
  // ============================================
  if (typeof window.abrirViewerPublicacaoNex === 'function') {
    window.abrirViewerPublicacaoNex(
      perfilClicado,
      'nearby',       // <- tipo 'nearby' faz o botão "Visitar perfil" aparecer
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
