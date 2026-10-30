/* ============================================
   05-NEX-CHAT.JS
   Chat do NEX: abrir, renderizar, enviar mensagens

   ⚠️ REGRA DE OURO:
   - Chave interna (data-chat) = @username (usado no Supabase)
   - Nome exibido (data-nomeExibido) = nome bonito (usado na UI)
============================================ */

(function () {
  'use strict';

  // ============================================
  // SKELETON DE CARREGAMENTO DO CHAT
  // ============================================

  function ativarSkeletonChatNex() {
    const avatar = document.getElementById('chatAvatar');
    const nome = document.getElementById('chatName');
    const bio = document.getElementById('chatBio');
    const status = document.getElementById('chatStatus');

    if (avatar) {
      avatar.classList.add('is-loading');
      avatar.innerHTML = '';
      avatar.textContent = '';
    }

    if (nome) {
      nome.classList.add('is-loading');
      nome.textContent = 'Carregando...';
    }

    if (bio) {
      bio.classList.add('is-loading');
      bio.textContent = 'Carregando...';
    }

    if (status) {
      status.classList.add('is-loading');
      status.classList.remove('online', 'offline');
      status.textContent = 'Carregando...';
    }
  }

  function desativarSkeletonChatNex() {
    const avatar = document.getElementById('chatAvatar');
    const nome = document.getElementById('chatName');
    const bio = document.getElementById('chatBio');
    const status = document.getElementById('chatStatus');

    if (nome && nome.textContent === 'Carregando...') nome.textContent = '';
    if (bio && bio.textContent === 'Carregando...') bio.textContent = '';
    if (status && status.textContent === 'Carregando...') status.textContent = '';

    if (avatar) avatar.classList.remove('is-loading');
    if (nome) nome.classList.remove('is-loading');
    if (bio) bio.classList.remove('is-loading');
    if (status) status.classList.remove('is-loading');
  }

  // ============================================
  // VARIÁVEIS DE ESTADO
  // ============================================

  let respostaSelecionadaNex = null;
  let mensagemSelecionadaNex = null;
  let mensagemParaApagarNex = null;
  let mensagemEmEdicaoNex = null;
  let textoOriginalEdicaoNex = '';
  let msgDestacadaNex = null;

  const cacheAvataresNex = {};
  const avataresEmBuscaNex = new Set();
    // ============================================
  // MENU DO CHAT (3 pontinhos)
  // ============================================

  let chatMenuAbertoNex = false;

  function abrirMenuChatNex() {
    let menu = document.getElementById('chatMenuDropdownNex');

    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'chatMenuDropdownNex';
      menu.className = 'chat-menu-dropdown';
      document.body.appendChild(menu);
    }

    const usernameAtual = Drops.estado.conversaAtual;
    const silenciado = estaSilenciadoNex(usernameAtual);

    menu.innerHTML = `
  <button type="button" class="chat-menu-item" data-acao="midias">
    <span class="chat-menu-item-icone">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    </span>
    <span class="chat-menu-item-texto">Ver mídias compartilhadas</span>
  </button>

  <div class="chat-menu-divisor"></div>

  <button type="button" class="chat-menu-item" data-acao="silenciar">
    <span class="chat-menu-item-icone">
      ${silenciado ? `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      ` : `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true">
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          <path d="M18.63 13A17.888 17.888 0 0 1 18 8"></path>
          <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"></path>
          <path d="M18 8a6 6 0 0 0-9.33-5"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      `}
    </span>
    <span class="chat-menu-item-texto">${silenciado ? 'Reativar notificações' : 'Silenciar conversa'}</span>
  </button>

  <div class="chat-menu-divisor"></div>

  <button type="button" class="chat-menu-item danger" data-acao="apagar">
    <span class="chat-menu-item-icone">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    </span>
    <span class="chat-menu-item-texto">Apagar conversa</span>
  </button>
`;

    menu.querySelectorAll('.chat-menu-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const acao = btn.dataset.acao;

        fecharMenuChatNex();

        if (acao === 'midias') {
          abrirMidiasCompartilhadasNex(usernameAtual);
        } else if (acao === 'silenciar') {
          alternarSilenciarChatNex(usernameAtual);
        } else if (acao === 'apagar') {
          abrirConfirmApagarChatNex(usernameAtual);
        }
      });
    });

    menu.classList.add('aberto');
    chatMenuAbertoNex = true;
  }

  function fecharMenuChatNex() {
    const menu = document.getElementById('chatMenuDropdownNex');
    if (menu) menu.classList.remove('aberto');
    chatMenuAbertoNex = false;
  }

  document.addEventListener('click', (e) => {
    if (!chatMenuAbertoNex) return;

    const menu = document.getElementById('chatMenuDropdownNex');
    const btn = document.getElementById('chatMenuBtnNex');

    if (menu && menu.contains(e.target)) return;
    if (btn && btn.contains(e.target)) return;

    fecharMenuChatNex();
  });

  // ============================================
  // SILENCIAR
  // ============================================

  function estaSilenciadoNex(username) {
    if (!username) return false;
    try {
      const lista = JSON.parse(
        localStorage.getItem('dropsChatsSilenciadosNex') || '[]'
      );
      return Array.isArray(lista) && lista.includes(username);
    } catch (e) {
      return false;
    }
  }

  function salvarSilenciadosNex(lista) {
    try {
      localStorage.setItem(
        'dropsChatsSilenciadosNex',
        JSON.stringify(Array.isArray(lista) ? lista : [])
      );
    } catch (e) {}
  }

  async function alternarSilenciarChatNex(username) {
    if (!username) return;

    const lista = (() => {
      try {
        return JSON.parse(
          localStorage.getItem('dropsChatsSilenciadosNex') || '[]'
        );
      } catch (e) {
        return [];
      }
    })();

    const index = lista.indexOf(username);
    let ativouSilencio = false;

    if (index === -1) {
      lista.push(username);
      ativouSilencio = true;
    } else {
      lista.splice(index, 1);
    }

    salvarSilenciadosNex(lista);

    if (!window.__euSilencieiNex) window.__euSilencieiNex = new Set();
    if (ativouSilencio) {
      window.__euSilencieiNex.add(username);
    } else {
      window.__euSilencieiNex.delete(username);
    }

    if (typeof window.alternarSilenciarSupabase === 'function') {
      await window.alternarSilenciarSupabase(
        username,
        ativouSilencio ? 'silenciar' : 'dessilenciar'
      );
    }

    atualizarSilenciadoNoCardNex(username);

    window.mostrarToastNex?.(
      ativouSilencio ? 'Conversa silenciada' : 'Notificações reativadas',
      'info'
    );
  }

  function atualizarSilenciadoNoCardNex(username) {
    if (!username) return;

    const card =
      typeof window.obterCardConversaNex === 'function'
        ? window.obterCardConversaNex(username)
        : document.querySelector(`.nex-chat[data-chat="${username}"]`);

    if (!card) return;

    card.classList.toggle('silenciado', estaSilenciadoNex(username));

    if (estaSilenciadoNex(username)) {
      const listaNaoLidas = document.getElementById('nex-naolidas');
      if (listaNaoLidas && listaNaoLidas.contains(card)) {
        const destino = document.getElementById('nex-geral');
        if (destino) destino.prepend(card);
      }
    }
  }

  // ============================================
  // APAGAR CONVERSA
  // ============================================

  function abrirConfirmApagarChatNex(username) {
    if (!username) return;

    let modal = document.getElementById('confirmApagarChatNex');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'confirmApagarChatNex';
      modal.className = 'modal-msg-nex';
      document.body.appendChild(modal);
    }

    modal.style.display = 'flex';

    modal.innerHTML = `
      <div class="modal-msg-box">
        <div class="modal-confirm-delete-title">
          Apagar esta conversa?<br>
          <small style="font-weight:500;opacity:.7;font-size:13px;">
            Vai apagar para todos e limpar este chat.
          </small>
        </div>

        <div class="modal-confirm-delete-actions">
          <button
            type="button"
            class="btn-delete-cancel-nex"
            id="btnCancelarApagarChatNex">
            Cancelar
          </button>

          <button
            type="button"
            class="btn-delete-confirm-nex"
            id="btnConfirmarApagarChatNex">
            Apagar
          </button>
        </div>
      </div>
    `;

    document.getElementById('btnCancelarApagarChatNex').onclick = () => {
      modal.style.display = 'none';
    };

    document.getElementById('btnConfirmarApagarChatNex').onclick = async () => {
      modal.style.display = 'none';
      await apagarChatNex(username);
    };

    modal.onclick = (e) => {
      if (e.target === modal) modal.style.display = 'none';
    };
  }

  async function apagarChatNex(username) {
    if (!username) return;

    window.mostrarToastNex?.('Apagando conversa...', 'info');

    try {
      if (window.supabaseClient) {
        try {
          const { data: { user } } =
            await window.supabaseClient.auth.getUser();

          if (user) {
            const { data: perfilOutro } = await window.supabaseClient
              .from('profiles')
              .select('id')
              .eq('username', username)
              .maybeSingle();

            if (perfilOutro?.id) {
              const { data: conversas } = await window.supabaseClient
                .from('conversas')
                .select('id')
                .or(
                  `and(user_a_id.eq.${user.id},user_b_id.eq.${perfilOutro.id}),and(user_a_id.eq.${perfilOutro.id},user_b_id.eq.${user.id})`
                );

              if (Array.isArray(conversas) && conversas.length) {
                const idsConversas = conversas.map((c) => c.id);

                await window.supabaseClient
                  .from('mensagens')
                  .delete()
                  .in('conversa_id', idsConversas);

                await window.supabaseClient
                  .from('conversas')
                  .delete()
                  .in('id', idsConversas);

                console.log(
                  `🗑️ ${idsConversas.length} conversa(s) apagada(s)`
                );
              }
            }
          }
        } catch (err) {
          console.warn('Erro ao apagar no Supabase:', err);
        }
      }

      if (window.conversas && window.conversas[username]) {
        delete window.conversas[username];
      }

      if (window.__convIdsNex) delete window.__convIdsNex[username];

      const card =
        typeof window.obterCardConversaNex === 'function'
          ? window.obterCardConversaNex(username)
          : document.querySelector(`.nex-chat[data-chat="${username}"]`);

      if (card) card.remove();

      if (typeof window.voltarChatNex === 'function') {
        window.voltarChatNex();
      }

      if (typeof window.atualizarAbaNaoLidasNex === 'function') {
        window.atualizarAbaNaoLidasNex();
      }

      window.mostrarToastNex?.('Conversa apagada.', 'sucesso');
    } catch (err) {
      console.error('Erro ao apagar chat:', err);
      window.mostrarToastNex?.('Erro ao apagar conversa.', 'erro');
    }
  }
  // ============================================
// VER MÍDIAS COMPARTILHADAS
// ============================================

function abrirMidiasCompartilhadasNex(username) {
  if (!username) return;

  const mensagens = (window.conversas && window.conversas[username]) || [];

  const midias = [];

  mensagens.forEach((msg) => {
    if (msg.anexo) {
      if (
        msg.anexo.type === 'imagem' ||
        msg.anexo.type === 'image' ||
        msg.anexo.type === 'video'
      ) {
        if (msg.anexo.url) {
          midias.push({
            url: msg.anexo.url,
            type: msg.anexo.type === 'video' ? 'video' : 'imagem'
          });
        }
      }

      if (
        msg.anexo.type === 'album' ||
        msg.anexo.type === 'multi-imagem'
      ) {
        const lista = msg.anexo.midias || msg.anexo.urls || [];
        lista.forEach((m) => {
          const url = typeof m === 'string' ? m : m.url;
          const tipo =
            typeof m === 'object' && m.type === 'video'
              ? 'video'
              : 'imagem';
          if (url) midias.push({ url, type: tipo });
        });
      }
    }

    if (Array.isArray(msg.midias)) {
      msg.midias.forEach((m) => {
        if (m.url) {
          midias.push({
            url: m.url,
            type: m.type === 'video' ? 'video' : 'imagem'
          });
        }
      });
    }
  });

  let modal = document.getElementById('midiasCompartilhadasNex');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'midiasCompartilhadasNex';
    modal.className = 'midias-compartilhadas-modal-nex';
    document.body.appendChild(modal);
  }

  modal.style.display = 'flex';

  if (!midias.length) {
    modal.innerHTML = `
      <div class="midias-compartilhadas-box-nex">
        <div class="midias-compartilhadas-topo-nex">
          <h3>Mídias compartilhadas</h3>
          <button type="button" class="midias-compartilhadas-fechar-nex">✕</button>
        </div>
        <div class="midias-compartilhadas-vazio-nex">
          Nenhuma mídia compartilhada ainda.
        </div>
      </div>
    `;

    modal.querySelector('.midias-compartilhadas-fechar-nex').onclick = () => {
      modal.style.display = 'none';
    };

    modal.onclick = (e) => {
      if (e.target === modal) modal.style.display = 'none';
    };

    return;
  }

  const gridHTML = midias
    .map(
      (m, i) => `
    <div class="midia-compartilhada-item-nex" data-index="${i}">
      ${
        m.type === 'video'
          ? `
        <video src="${m.url}" muted playsinline></video>
        <div class="midia-compartilhada-play-nex">▶</div>
      `
          : `<img src="${m.url}" alt="">`
      }
    </div>
  `
    )
    .join('');

  modal.innerHTML = `
    <div class="midias-compartilhadas-box-nex">
      <div class="midias-compartilhadas-topo-nex">
        <h3>Mídias compartilhadas (${midias.length})</h3>
        <button type="button" class="midias-compartilhadas-fechar-nex">✕</button>
      </div>

      <div class="midias-compartilhadas-grid-nex">
        ${gridHTML}
      </div>
    </div>
  `;

  modal.querySelector('.midias-compartilhadas-fechar-nex').onclick = () => {
    modal.style.display = 'none';
  };

  modal.onclick = (e) => {
    if (e.target === modal) modal.style.display = 'none';
  };

  modal.querySelectorAll('.midia-compartilhada-item-nex').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = Number(el.dataset.index);
      if (typeof window.abrirVisualizadorMidiasNex === 'function') {
        window.abrirVisualizadorMidiasNex(midias, idx, false);
      }
    });
  });
}

// ============================================
// RESOLVER USERNAME REAL (@) A PARTIR DE UMA CHAVE
// ============================================

async function resolverUsernameRealNex(chave, card = null) {
  if (!chave) return '';

  if (!window.__convUsernamesNex) {
    window.__convUsernamesNex = {};
  }

  // 1. Cache
  if (window.__convUsernamesNex[chave]) {
    return window.__convUsernamesNex[chave];
  }

  // 2. data-username do card
  const usernameDoCard = card?.dataset?.username;
  if (usernameDoCard) {
    const limpo = String(usernameDoCard)
      .replace(/^@/, '')
      .trim()
      .toLowerCase();

    if (limpo) {
      window.__convUsernamesNex[chave] = limpo;
      return limpo;
    }
  }

  // 3. Se já é um @username válido, usa direto
  const chaveLimpa = String(chave).replace(/^@/, '').trim().toLowerCase();

  if (/^[a-z0-9]+$/.test(chaveLimpa)) {
    window.__convUsernamesNex[chave] = chaveLimpa;
    return chaveLimpa;
  }

  // 4. Busca no Supabase pelo nome exibido
  if (window.supabaseClient) {
    try {
      const { data: perfil } = await window.supabaseClient
        .from('profiles')
        .select('username')
        .ilike('nome', String(chave).trim())
        .maybeSingle();

      if (perfil?.username) {
        const limpo = String(perfil.username)
          .replace(/^@/, '')
          .trim()
          .toLowerCase();

        window.__convUsernamesNex[chave] = limpo;
        console.log('🔍 Username resolvido no Supabase:', limpo);
        return limpo;
      }
    } catch (err) {
      console.warn('Erro ao buscar username no Supabase:', err);
    }
  }

  // Fallback final
  const fallback = String(chave)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (fallback) {
    window.__convUsernamesNex[chave] = fallback;
  }

  return fallback;
}

// ============================================
// BUSCAR AVATAR (cache em memória)
// ============================================
// ⚠️ NOVO: Cache com TTL (Time To Live) de 10 minutos
const CACHE_AVATAR_TTL_MS = 10 * 60 * 1000;

async function buscarAvatarNex(username) {
  if (!username) return null;

  // ⚠️ Verifica se está no cache E se ainda é válido
  const emCache = cacheAvataresNex[username];
  if (emCache && typeof emCache === 'object') {
    if (Date.now() - emCache.timestamp < CACHE_AVATAR_TTL_MS) {
      return emCache.url;
    }
  } else if (emCache && typeof emCache === 'string') {
    // Compatibilidade com cache antigo (string pura)
    return emCache;
  }

  if (avataresEmBuscaNex.has(username)) return null;
  avataresEmBuscaNex.add(username);

  try {
    const meuUser = String(Drops.usernameAtual || '').toLowerCase().trim();
    const userLimpo = String(username).toLowerCase().replace(/^@/, '').trim();

    if (meuUser && userLimpo === meuUser && window.supabaseClient) {
      const { data: { user } } = await window.supabaseClient.auth.getUser();

      if (user) {
        const { data: perfil } = await window.supabaseClient
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (perfil?.avatar_url) {
          cacheAvataresNex[username] = {
            url: perfil.avatar_url,
            timestamp: Date.now()
          };
          return perfil.avatar_url;
        }
      }
    }

    if (typeof window.buscarPerfilPublicoSupabase === 'function') {
      const perfil = await window.buscarPerfilPublicoSupabase(username);
      const url = perfil?.avatar_url || null;
      cacheAvataresNex[username] = {
        url,
        timestamp: Date.now()
      };
      return url;
    }
  } catch (err) {
    console.warn('Erro ao buscar avatar:', err);
  } finally {
    avataresEmBuscaNex.delete(username);
  }

  return null;
}
  
  // ============================================
// ABRIR CHAT (versão definitiva)
// ============================================
// Aceita DUAS formas:
//   1. Um Card do DOM (vem da aba NEX)
//   2. Um objeto { username, nome } (vem do perfil visitado)
//
// Fluxo idêntico nos dois casos:
//   a) Descobre o @username
//   b) Pinta o cabeçalho direto do Supabase
//   c) Desativa o Skeleton
//   d) Carrega o histórico e renderiza
// ============================================

async function abrirChatNex(el) {
  // --------------------------------------------
  // 1. ATIVA O SKELETON IMEDIATAMENTE
  // --------------------------------------------
  ativarSkeletonChatNex();

  // --------------------------------------------
  // 2. IDENTIFICA A ORIGEM E PEGA O @USERNAME
  // --------------------------------------------
  const ehObjetoDireto =
    el &&
    typeof el === 'object' &&
    !el.closest &&
    !el.querySelector &&
    (el.username || el.chave);

  let card = null;
  let chaveBruta = '';
  let nomeSugerido = '';

  if (ehObjetoDireto) {
    chaveBruta = String(el.username || el.chave || '')
      .replace(/^@/, '')
      .trim()
      .toLowerCase();
    nomeSugerido = el.nome || chaveBruta;
  } else {
    card = el?.closest?.('.nex-chat') || el;
    chaveBruta = String(
      card?.dataset?.chat ||
        card?.querySelector('h3')?.innerText ||
        ''
    ).trim();
    nomeSugerido =
      card?.dataset?.nomeExibido ||
      card?.querySelector('h3')?.innerText?.trim() ||
      chaveBruta;
  }

  if (!chaveBruta) {
    console.warn('⚠️ abrirChatNex: chave vazia');
    desativarSkeletonChatNex();
    return;
  }

  // Resolve o @username real (pode ter que buscar no banco se veio um nome solto)
  const usernameReal = await resolverUsernameRealNex(chaveBruta, card);

  if (!usernameReal) {
    console.warn('⚠️ abrirChatNex: não foi possível resolver username');
    window.mostrarToastNex?.('Não foi possível abrir a conversa.', 'erro');
    desativarSkeletonChatNex();
    return;
  }

  // --------------------------------------------
// 3. ATUALIZA O ESTADO GLOBAL E LIMPA A TELA
// --------------------------------------------
// ⚠️ Força a chave para o usuário novo ANTES de qualquer render
Drops.estado.conversaAtual = usernameReal;
window.setConversaAbertaNex(usernameReal);
window.setCardAbertoNex(card || null);

// ⚠️ Limpa a área de mensagens para não mostrar histórico do perfil anterior
const areaMsgs = document.getElementById('chatMsgs');
if (areaMsgs) areaMsgs.innerHTML = '';

  if (typeof window.dropsEmpilharEstado === 'function') {
    window.dropsEmpilharEstado('chat', { username: usernameReal });
  }

  // --------------------------------------------
  // 4. TROCA DE TELA (mostra o chat, esconde o NEX)
  // --------------------------------------------
  const chat = document.getElementById('chatNex');
  const nex = document.getElementById('nex');

  if (nex) {
    nex.style.display = 'none';
    nex.classList.remove('active');
  }

  if (chat) {
    chat.style.display = 'block';
    chat.classList.add('active');
  }

  document.body.classList.add('chat-aberto');

  // --------------------------------------------
  // 5. BUSCA OS DADOS DO PERFIL (nome, bio, avatar, status)
  // --------------------------------------------
  // Faz uma única query e usa para pintar o cabeçalho.
  // Se falhar, ainda tenta pintar com o que tem (nomeSugerido).
  let perfilReal = null;

  if (window.supabaseClient) {
    try {
      const { data } = await window.supabaseClient
        .from('profiles')
        .select('nome, bio, avatar_url, ultima_atividade')
        .eq('username', usernameReal)
        .maybeSingle();

      perfilReal = data || null;
    } catch (err) {
      console.warn('Erro ao buscar dados do perfil:', err);
    }
  }

  // Nome final: banco > card > chave crua
  const nomeExibido =
    perfilReal?.nome ||
    nomeSugerido ||
    usernameReal;

  // Salva o nome exibido no cache global (para o histórico usar depois)
  window.__convNomesExibidosNex = window.__convNomesExibidosNex || {};
  window.__convNomesExibidosNex[usernameReal] = nomeExibido;

  // --------------------------------------------
  // 6. PREENCHE O CABEÇALHO
  // --------------------------------------------
  const chatName = document.getElementById('chatName');
  const chatBio = document.getElementById('chatBio');
  const chatStatus = document.getElementById('chatStatus');
  const chatAvatar = document.getElementById('chatAvatar');

  // Nome
  if (chatName) {
    chatName.innerText = nomeExibido;
    chatName.style.cursor = 'pointer';

    if (chatName.__clickPerfilHandler) {
      chatName.removeEventListener('click', chatName.__clickPerfilHandler);
    }

    chatName.__clickPerfilHandler = () => {
      if (typeof window.abrirPerfilVisitadoNex === 'function') {
        window.abrirPerfilVisitadoNex(usernameReal, nomeExibido);
      }
    };

    chatName.addEventListener('click', chatName.__clickPerfilHandler);
  }

  // Bio
  if (chatBio) {
    const bioReal = (perfilReal?.bio || '').trim();
    const textoBio = bioReal || 'Sem bio ainda.';

    chatBio.innerText = textoBio;
    chatBio.setAttribute('data-texto', textoBio);
    chatBio.classList.remove('marquee-ativo');

    setTimeout(() => {
      if (chatBio.scrollWidth > chatBio.clientWidth + 2) {
        chatBio.classList.add('marquee-ativo');
      }
    }, 100);
  }

  // Status
  if (chatStatus) {
    const ultima = perfilReal?.ultima_atividade;
    const LIMITE_ONLINE_MS = 30 * 1000;

    const estaOnline =
      ultima &&
      Date.now() - new Date(ultima).getTime() < LIMITE_ONLINE_MS;

    chatStatus.innerText = estaOnline ? 'online' : 'offline';
    chatStatus.classList.toggle('online', !!estaOnline);
    chatStatus.classList.toggle('offline', !estaOnline);
  }

  // Avatar
  if (chatAvatar) {
    chatAvatar.innerText = nomeExibido.charAt(0).toUpperCase();
    chatAvatar.style.backgroundImage = 'none';
    chatAvatar.style.cursor = 'pointer';

    if (perfilReal?.avatar_url) {
      chatAvatar.innerHTML = `<img src="${perfilReal.avatar_url}" alt="${nomeExibido}" style="width:100%;height:100%;object-fit:cover;border-radius:32px;display:block;">`;
    }

    if (chatAvatar.__clickPerfilHandler) {
      chatAvatar.removeEventListener('click', chatAvatar.__clickPerfilHandler);
    }

    chatAvatar.__clickPerfilHandler = () => {
      if (typeof window.abrirPerfilVisitadoNex === 'function') {
        window.abrirPerfilVisitadoNex(usernameReal, nomeExibido);
      }
    };

    chatAvatar.addEventListener('click', chatAvatar.__clickPerfilHandler);
  }

  // --------------------------------------------
  // 7. CABEÇALHO PRONTO → MATA O SKELETON
  // --------------------------------------------
  desativarSkeletonChatNex();

  // --------------------------------------------
  // 8. VERIFICA SE ESTOU SILENCIADO POR ESSA PESSOA
  // --------------------------------------------
  const chatBottom = document.querySelector('.chat-bottom');
  const toastSilenciado = document.getElementById('toastSilenciadoNex');
  const iconeEnviar = document.getElementById('iconeEnviarChatNex');
  const iconeMudo = document.getElementById('iconeMudoChatNex');

  const listaQuemMeSilenciou = window.__quemMeSilenciouNex || new Set();
  const estouSilenciado = listaQuemMeSilenciou.has(usernameReal);

  if (estouSilenciado) {
    if (chatBottom) chatBottom.classList.add('silenciado');
    if (toastSilenciado) toastSilenciado.style.display = 'flex';
    if (iconeEnviar) iconeEnviar.style.display = 'none';
    if (iconeMudo) iconeMudo.style.display = 'block';
  } else {
    if (chatBottom) chatBottom.classList.remove('silenciado');
    if (toastSilenciado) toastSilenciado.style.display = 'none';
    if (iconeEnviar) iconeEnviar.style.display = 'block';
    if (iconeMudo) iconeMudo.style.display = 'none';
  }

  // --------------------------------------------
  // 9. CARREGA O HISTÓRICO DO BANCO
  // --------------------------------------------
  if (typeof window.carregarConversaSupabase === 'function') {
    try {
      await window.carregarConversaSupabase(usernameReal);
    } catch (err) {
      console.warn('Erro ao carregar histórico:', err);
    }
  }

  if (!conversas[usernameReal]) {
    conversas[usernameReal] = [];
  }

  // --------------------------------------------
  // 10. MARCA MENSAGENS COMO VISUALIZADAS
  // --------------------------------------------
  const convIdParaMarcarVisto =
    window.__convIdsNex && window.__convIdsNex[usernameReal];

  if (
    convIdParaMarcarVisto &&
    typeof window.marcarMensagensComoVisualizadasSupabase === 'function'
  ) {
    window
      .marcarMensagensComoVisualizadasSupabase(convIdParaMarcarVisto)
      .catch((err) =>
        console.warn('Falha ao marcar visualizadas:', err)
      );
  }

  // Atualiza o card (se existir) para tirar o "silenciado"
  atualizarSilenciadoNoCardNex(usernameReal);

  // --------------------------------------------
  // 11. RENDERIZA AS MENSAGENS NA TELA
  // --------------------------------------------
  renderChat(usernameReal);

  document.getElementById('chatInput')?.focus();

  // --------------------------------------------
  // 12. LIMPA O PRESENÇA POLLING ANTIGO
  // --------------------------------------------
  if (window.__statusPollingNex) {
    clearInterval(window.__statusPollingNex);
    window.__statusPollingNex = null;
  }
}
  // ============================================
// FECHAR CHAT
// ============================================

function voltarChatNex() {
  if (window.__presencaIntervalNex) {
    clearInterval(window.__presencaIntervalNex);
    window.__presencaIntervalNex = null;
  }

  if (window.__statusPollingNex) {
    clearInterval(window.__statusPollingNex);
    window.__statusPollingNex = null;
  }

  fecharMenuChatNex();

  const chat = document.getElementById('chatNex');
  const nex = document.getElementById('nex');

  if (chat) {
    chat.style.display = 'none';
    chat.classList.remove('active');
  }

  if (!window.__chatVeioDoPerfil) {
    if (nex) {
      nex.style.display = 'block';
      nex.classList.add('active');
    }
  } else {
    window.__chatVeioDoPerfil = false;
  }

  mostrarNexTab(Drops.estado.abaNex);

  window.setConversaAbertaNex('');
  window.setOrigemAberturaNex('');
  window.setCardAbertoNex(null);

  Drops.estado.conversaAtual = '';

  document.body.classList.remove('chat-aberto');
  document.body.classList.remove('chat-open');

  const chatBottom = document.querySelector('.chat-bottom');
  if (chatBottom) chatBottom.classList.remove('silenciado');

  const toastSilenciado = document.getElementById('toastSilenciadoNex');
  if (toastSilenciado) toastSilenciado.style.display = 'none';

  const iconeEnviar = document.getElementById('iconeEnviarChatNex');
  if (iconeEnviar) iconeEnviar.style.display = 'block';

  const iconeMudo = document.getElementById('iconeMudoChatNex');
  if (iconeMudo) iconeMudo.style.display = 'none';

  if (typeof window.sincronizarCardsNexSupabase === 'function') {
    setTimeout(() => {
      window.sincronizarCardsNexSupabase();
    }, 300);
  }
}

// ============================================
// ATUALIZAR NOTIFICAÇÃO DA TABBAR
// ============================================

function atualizarNotificacaoTabbarNex() {
  const tabNex = document.querySelector('.tab.tab-nex');
  if (!tabNex) return;

  const listaNaoLidas = document.getElementById('nex-naolidas');
  if (!listaNaoLidas) return;

  const cardsNaoLidos = Array.from(
    listaNaoLidas.querySelectorAll('.nex-chat')
  );

  const temNaoLidasVisiveis = cardsNaoLidos.some((card) => {
    const username = card.dataset.chat;
    return !estaSilenciadoNex(username);
  });

  tabNex.classList.toggle('tem-notificacao', temNaoLidasVisiveis);
}

// ============================================
// BADGE DE REAÇÃO EM MÍDIA
// ============================================

async function atualizarBadgeReacaoMidiaNex(msgId, midiaIndex) {
  if (!msgId) return;

  const seletor = `.msg-midia-badge-slot[data-badge-msg-id="${msgId}"][data-badge-midia-index="${midiaIndex}"]`;
  const slot = document.querySelector(seletor);
  if (!slot) return;

  if (typeof window.buscarReacoesMidiaNex !== 'function') return;

  const reacoes = await window.buscarReacoesMidiaNex(msgId, midiaIndex);
  const total = (reacoes.heart || 0) + (reacoes.broken || 0);

  if (total === 0) {
    slot.classList.remove('visivel', 'minha-reacao');
    slot.innerHTML = '';
    return;
  }

  let emojiMostrar = '';
  let countMostrar = 0;

  if (reacoes.minhaReacao) {
    emojiMostrar = reacoes.minhaReacao === 'heart' ? '❤️' : '💔';
    countMostrar =
      reacoes.minhaReacao === 'heart' ? reacoes.heart : reacoes.broken;
  } else if (reacoes.heart >= reacoes.broken) {
    emojiMostrar = '❤️';
    countMostrar = reacoes.heart;
  } else {
    emojiMostrar = '💔';
    countMostrar = reacoes.broken;
  }

  slot.innerHTML = `
    <span class="badge-emoji">${emojiMostrar}</span>
    <span class="badge-count">${countMostrar}</span>
  `;

  slot.classList.add('visivel');
  slot.classList.toggle('minha-reacao', !!reacoes.minhaReacao);
}

async function atualizarTodosBadgesReacaoMidiaNex() {
  const area = document.getElementById('chatMsgs');
  if (!area) return;

  const slots = area.querySelectorAll('.msg-midia-badge-slot');

  for (const slot of slots) {
    const msgId = slot.dataset.badgeMsgId;
    const midiaIndex = Number(slot.dataset.badgeMidiaIndex || 0);

    if (!msgId) continue;

    await atualizarBadgeReacaoMidiaNex(msgId, midiaIndex);
  }
}
  // ============================================
// RENDERIZAR CHAT
// ============================================

function renderChat(nome) {
  const area = document.getElementById('chatMsgs');
  if (!area) return;

  area.innerHTML = '';

  const chaveUnica =
    typeof window.resolverChaveNex === 'function'
      ? window.resolverChaveNex(nome)
      : String(nome || '').replace(/^@/, '').toLowerCase().trim();

  const msgs = conversas[chaveUnica] || conversas[nome] || [];

  msgs.forEach((msg) => {
    if (!msg.id) msg.id = gerarIdMensagemNex();
    if (!msg.timestamp) msg.timestamp = Date.now();
  });

  const respostasPorOriginalNex = new Map();

  msgs.forEach((msg) => {
    const originalId = msg.resposta?.id;
    if (!originalId) return;

    const chaveOriginal = String(originalId);
    const lista = respostasPorOriginalNex.get(chaveOriginal) || [];
    lista.push(msg);
    respostasPorOriginalNex.set(chaveOriginal, lista);
  });

  const qtdCitacoesPorOriginalNex = new Map();
  const ordemRespostaPorMsgIdNex = new Map();

  for (const [originalId, lista] of respostasPorOriginalNex.entries()) {
    qtdCitacoesPorOriginalNex.set(originalId, lista.length);

    lista.forEach((msg, index) => {
      ordemRespostaPorMsgIdNex.set(String(msg.id), index + 1);
      if (msg._supabaseId) {
        ordemRespostaPorMsgIdNex.set(String(msg._supabaseId), index + 1);
      }
    });
  }

  msgs.forEach((msg) => {
    if (msg.deleted && msg.deletedAt) {
      const passou5s = Date.now() - msg.deletedAt > 5000;
      if (passou5s) return;
    }

    const lado = msg.side === 'right' ? 'right' : 'left';

    let nomeExibido;

    if (lado === 'right') {
      nomeExibido = 'Eu';
    } else {
      const usernameContato =
        typeof window.resolverChaveNex === 'function'
          ? window.resolverChaveNex(nome)
          : String(nome || '').replace(/^@/, '').toLowerCase().trim();

      nomeExibido =
        (window.__convNomesExibidosNex &&
          window.__convNomesExibidosNex[usernameContato]) ||
        msg.nome ||
        usernameContato;
    }

    const avatarTexto = (msg.avatar || nomeExibido || 'U')
      .toString()
      .slice(0, 2)
      .toUpperCase();

    let usernameAvatarMsg = '';

    if (lado === 'right') {
      usernameAvatarMsg = String(Drops.usernameAtual || '').trim();
    } else {
      usernameAvatarMsg =
        (window.__convUsernamesNex && window.__convUsernamesNex[nome]) || nome;
    }

    const avatarUrlCache = cacheAvataresNex[usernameAvatarMsg] || null;

    const dataExibida = msg.data || 'Hoje';
    const horaExibida = msg.hora || msg.time || '';
    const statusExibido =
      lado === 'right' ? statusIconeNex(msg.status || 'enviado') : '';

    const statusClasse =
      msg.status === 'enviando'
        ? 'status-enviando'
        : msg.status === 'erro'
          ? 'status-erro'
          : '';

    const row = document.createElement('div');
    row.className = `msg-row ${lado}`;
    row.dataset.msgId = msg.id;

    const card = document.createElement('div');
    const classeSistema = msg.sistema ? ' msg-sistema' : '';
    card.className = `msg-card ${lado}${
      msg.deleted ? ' msg-card-apagada' : ''
    }${classeSistema}`;

    const idLocal = String(msg.id);
    const idSupabase = String(msg._supabaseId || '');

    const qtdCitacoesLocal = qtdCitacoesPorOriginalNex.get(idLocal) || 0;
    const qtdCitacoesSupabase = idSupabase
      ? (qtdCitacoesPorOriginalNex.get(idSupabase) || 0)
      : 0;

    const qtdCitacoes = Math.max(qtdCitacoesLocal, qtdCitacoesSupabase);
    const ordemResposta =
      ordemRespostaPorMsgIdNex.get(String(msg.id)) ||
      ordemRespostaPorMsgIdNex.get(String(msg._supabaseId || '')) ||
      0;
    const totalRespostasDaOriginal = msg.resposta
      ? (respostasPorOriginalNex.get(msg.resposta.id) || []).length
      : 0;

    let anexosHTML = '';

    if (typeof window.montarAnexosHTMLNex === 'function') {
      try {
        anexosHTML = window.montarAnexosHTMLNex(msg, dataExibida, horaExibida);
      } catch (errAnexo) {
        console.error('❌ Erro ao montar anexo da msg:', msg.id, errAnexo, msg);
        anexosHTML =
          '<div style="padding:8px;font-size:12px;color:#94a3b8;font-style:italic;">📎 Anexo indisponível</div>';
      }
    }

    const statusOnclick =
      lado === 'right' && msg.status === 'erro'
        ? `onclick="event.stopPropagation(); window.reenviarMensagemNex('${msg.id}')"`
        : '';

    card.innerHTML = msg.deleted
      ? `
      <div class="msg-apagada-wrapper">
        <div class="msg-apagada-nex">
          ${escapeHTML(msg.deletedText || 'Mensagem apagada')}
        </div>
      </div>
    `
      : `
      <div class="msg-layer${msg.sistema ? ' msg-sistema' : ''}">

        <div class="msg-header ${lado}">
          ${
            lado === 'left'
              ? `<div class="msg-avatar" data-avatar-user="${escapeHTML(usernameAvatarMsg)}" data-avatar-fallback="${escapeHTML(avatarTexto)}">${
                  avatarUrlCache
                    ? `<img src="${escapeHTML(avatarUrlCache)}" alt="">`
                    : escapeHTML(avatarTexto)
                }</div>`
              : ''
          }

          ${
            lado === 'right'
              ? `<button
                  type="button"
                  class="msg-menu-btn"
                  aria-label="Mais opções"
                  onclick="event.stopPropagation(); window.abrirMenuMsgNex(this, '${msg.id}')">
                  ⋮
                </button>
                <div class="msg-status ${statusClasse}" ${statusOnclick}>${escapeHTML(statusExibido)}</div>`
              : ''
          }

          <div class="msg-meta">
            <b>${escapeHTML(nomeExibido)}</b>
            <span>
              ${escapeHTML(dataExibida)}
              ${horaExibida ? ' • ' : ''}
              ${escapeHTML(horaExibida)}
              ${msg.edited ? ' • editada' : ''}
            </span>
          </div>

          ${
            lado === 'left'
              ? `<button
                  type="button"
                  class="msg-menu-btn"
                  aria-label="Mais opções"
                  onclick="event.stopPropagation(); window.abrirMenuMsgNex(this, '${msg.id}')">
                  ⋮
                </button>`
              : `<div class="msg-avatar" data-avatar-user="${escapeHTML(usernameAvatarMsg)}" data-avatar-fallback="${escapeHTML(avatarTexto)}">${
                  avatarUrlCache
                    ? `<img src="${escapeHTML(avatarUrlCache)}" alt="">`
                    : escapeHTML(avatarTexto)
                }</div>`
          }
        </div>

        ${
          msg.resposta
            ? `
        <div style="display:flex;align-items:center;margin-top:8px;gap:8px;">
          <div
            class="reply-linked-top"
            style="background: #10b981 !important; color: #ffffff !important; border: none !important; border-radius: 999px !important; padding: 6px 12px !important; display: inline-flex !important; align-items: center !important; gap: 8px !important; cursor: pointer; width: fit-content;"
            onclick="irParaMensagemNex('${msg.resposta.id}', '${msg.id}', '${msg._supabaseId || ''}')">
            <span class="reply-arrow" style="color: #ffffff !important; font-size: 16px !important; margin: 0 !important;">↖</span>
            <span class="reply-count-pill" style="background: #ffffff !important; color: #10b981 !important; padding: 2px 8px !important; border-radius: 99px !important; font-size: 12px !important; font-weight: 900 !important; margin: 0 !important;">
              ${ordemResposta}/${totalRespostasDaOriginal}
            </span>
          </div>

          ${
            lado === 'right' && ordemResposta < totalRespostasDaOriginal
              ? `
            <button
              type="button"
              class="reply-next-btn"
              style="background: #10b981 !important; color: #ffffff !important; border: none !important; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900;"
              onclick="event.stopPropagation(); irParaProximaRespostaNex('${msg.resposta.id}', ${ordemResposta})">
              ⬇
            </button>
          `
              : ''
          }
        </div>
      `
            : ''
        }

        <div class="msg-content">
          ${
            msg.text
              ? `<div class="msg-text">${escapeHTML(msg.text)}</div>`
              : ''
          }

          ${
            anexosHTML
              ? `<div class="msg-media-wrapper ${msg._supabaseId ? 'media-cacheada' : ''}" data-media-url="${escapeHTML(msg.anexo?.url || msg.audio || '')}">${anexosHTML}</div>`
              : ''
          }
        </div>

        ${
          qtdCitacoes > 0
            ? `
          <button
            type="button"
            class="reply-cited-bottom"
            style="background: #facc15 !important; color: #1a1a1a !important; border: none !important; border-radius: 999px !important; padding: 6px 12px !important; display: inline-flex !important; align-items: center !important; gap: 8px !important; cursor: pointer; width: fit-content; margin-top: 4px;"
            onclick="irParaRespostaFilhaNex('${msg.id}', '${msg._supabaseId || ''}')">
            ${
              qtdCitacoes > 1
                ? `<span class="reply-count-pill" style="background: #ffffff !important; color: #1a1a1a !important; padding: 2px 8px !important; border-radius: 99px !important; font-size: 12px !important; font-weight: 900 !important; margin: 0 !important;">${qtdCitacoes}x</span>`
                : `<span class="reply-count-pill" style="background: #ffffff !important; color: #1a1a1a !important; padding: 2px 8px !important; border-radius: 99px !important; font-size: 12px !important; font-weight: 900 !important; margin: 0 !important;">1x</span>`
            }
            <span class="reply-arrow" style="color: #1a1a1a !important; font-size: 16px !important; margin: 0 !important;">↘</span>
          </button>
        `
            : ''
        }

      </div>
    `;

    row.appendChild(card);
    area.appendChild(row);
  });

  area.scrollTop = area.scrollHeight;

  atualizarTodosBadgesReacaoMidiaNex();

  area.querySelectorAll('.msg-avatar[data-avatar-user]').forEach(async (el) => {
    const username = el.dataset.avatarUser;
    const fallback = el.dataset.avatarFallback || '?';

    if (!username) return;
    if (cacheAvataresNex[username]) {
      el.innerHTML = `<img src="${escapeHTML(cacheAvataresNex[username])}" alt="">`;
      return;
    }

    const url = await buscarAvatarNex(username);

    if (url && el.isConnected) {
      el.innerHTML = `<img src="${escapeHTML(url)}" alt="">`;
    } else if (el.isConnected && !el.querySelector('img')) {
      el.textContent = fallback;
    }
  });

  area.querySelectorAll('.msg-location-avatar[data-avatar-user]').forEach(async (el) => {
    const username = el.dataset.avatarUser;
    const fallback = el.dataset.avatarFallback || '?';

    if (!username) return;

    if (cacheAvataresNex[username]) {
      el.innerHTML = `<img src="${escapeHTML(cacheAvataresNex[username])}" alt="">`;
      return;
    }

    const url = await buscarAvatarNex(username);

    if (url && el.isConnected) {
      el.innerHTML = `<img src="${escapeHTML(url)}" alt="">`;
    } else if (el.isConnected && !el.querySelector('img')) {
      el.textContent = fallback;
    }
  });

  document.querySelectorAll('.btn-fotos-open').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window.abrirFotosViewerNex === 'function') {
        window.abrirFotosViewerNex(btn.dataset.list);
      }
    });
  });
}

  // ============================================
// ENVIAR MENSAGEM
// ============================================

async function enviarMsgNex() {
  const chatBottom = document.querySelector('.chat-bottom');
  if (chatBottom && chatBottom.classList.contains('silenciado')) {
    window.mostrarToastNex?.('Você está silenciado nesta conversa.', 'erro');
    return;
  }

  const input = document.getElementById('chatInput');
  const texto = input ? input.value.trim() : '';

  const temAudio =
    typeof window.temAudioNex === 'function' ? window.temAudioNex() : false;
  const temMidia =
    typeof window.temMidiasNex === 'function' ? window.temMidiasNex() : false;
  const temMidiaUnica =
    typeof window.getPreviewMidiaNex === 'function'
      ? !!window.getPreviewMidiaNex()
      : false;
  const temDocumento =
    typeof window.temDocumentoNex === 'function'
      ? window.temDocumentoNex()
      : false;
  const temLocalizacao =
    typeof window.temLocalizacaoNex === 'function'
      ? window.temLocalizacaoNex()
      : false;

  if (
    !texto &&
    !temAudio &&
    !temMidia &&
    !temMidiaUnica &&
    !temDocumento &&
    !temLocalizacao
  ) {
    return;
  }

  const conversaAtual = Drops.estado.conversaAtual;

  if (!conversas[conversaAtual]) {
    conversas[conversaAtual] = [];
  }

  const midiaUnicaLocal =
    typeof window.getPreviewMidiaNex === 'function'
      ? window.getPreviewMidiaNex()
      : null;

  const midiasLocais =
    typeof window.getPreviewMidiasNex === 'function'
      ? window.getPreviewMidiasNex()
      : null;

  const documentoLocal =
    typeof window.getDocumentoPreviewNex === 'function'
      ? window.getDocumentoPreviewNex()
      : null;

  const localizacaoLocal =
    typeof window.getLocalizacaoPreviaNex === 'function'
      ? window.getLocalizacaoPreviaNex()
      : null;

  const audioLocal =
    typeof window.getAudioUrlNex === 'function'
      ? window.getAudioUrlNex()
      : '';

  const audioBlobLocal =
    typeof window.getAudioBlobNex === 'function'
      ? window.getAudioBlobNex()
      : null;

  const mensagem = {
    id: gerarIdMensagemNex(),
    timestamp: Date.now(),
    side: 'right',
    nome: 'Eu',
    avatar: 'EU',
    data: new Date().toLocaleDateString('pt-BR'),
    hora: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    status: 'enviando'
  };

  if (respostaSelecionadaNex) {
    const idParaResposta =
      respostaSelecionadaNex._supabaseId || respostaSelecionadaNex.id;

    mensagem.resposta = {
      id: idParaResposta,
      nome: respostaSelecionadaNex.nome || '',
      texto: respostaSelecionadaNex.text || '',
      side: respostaSelecionadaNex.side || 'left'
    };
  }

  if (texto) mensagem.text = texto;

  if (midiaUnicaLocal && midiaUnicaLocal.url) {
    mensagem.anexo = {
      type: midiaUnicaLocal.type === 'video' ? 'video' : 'imagem',
      url: midiaUnicaLocal.url,
      _file: midiaUnicaLocal._file || null
    };
  }

  if (Array.isArray(midiasLocais) && midiasLocais.length) {
    mensagem.midias = midiasLocais.map((m) => ({
      url: m.url,
      type: m.type === 'video' ? 'video' : 'imagem',
      _file: m._file || null
    }));
  }

  if (documentoLocal && documentoLocal.url && !mensagem.anexo) {
    mensagem.anexo = {
      type: 'pdf',
      url: documentoLocal.url,
      name: documentoLocal.name || 'Documento PDF',
      documento: {
        url: documentoLocal.url,
        name: documentoLocal.name || 'Documento PDF',
        thumbnail: documentoLocal.thumbnail || '',
        size: documentoLocal.size || 0
      }
    };
  }

  if (localizacaoLocal && localizacaoLocal.lat != null && !mensagem.anexo) {
    mensagem.anexo = {
      type: 'location',
      lat: Number(localizacaoLocal.lat),
      lng: Number(localizacaoLocal.lng),
      address: localizacaoLocal.address || 'Localização',
      localizacao: {
        lat: Number(localizacaoLocal.lat),
        lng: Number(localizacaoLocal.lng),
        address: localizacaoLocal.address || 'Localização'
      }
    };
  }

  if (audioLocal) {
    mensagem.audio = audioLocal;
  }

  conversas[conversaAtual].push(mensagem);

  if (input) input.value = '';

  renderChat(conversaAtual);

  if (respostaSelecionadaNex) {
    cancelarRespostaNex();
  }

  (async () => {
    try {
      const msgLocal = conversas[conversaAtual].find(
        (m) => m.id === mensagem.id
      );

      if (!msgLocal) return;

      if (midiaUnicaLocal && midiaUnicaLocal.url) {
        const fonteUpload = midiaUnicaLocal._file || midiaUnicaLocal.url;

        console.log('📤 Enviando mídia única:', {
          temFile: !!midiaUnicaLocal._file,
          tipo: midiaUnicaLocal.type
        });

        const urlStorage = await window.uploadMidiaNexSupabase(
          fonteUpload,
          midiaUnicaLocal.type
        );

        if (urlStorage && /^https?:\/\//i.test(urlStorage)) {
          msgLocal.anexo.url = urlStorage;
          if (msgLocal.anexo._file) delete msgLocal.anexo._file;
        } else {
          throw new Error('Falha no upload da mídia única');
        }
      }

      if (Array.isArray(midiasLocais) && midiasLocais.length) {
        const enviadas = [];

        for (const m of midiasLocais) {
          const fonteUpload = m._file || m.url;

          const urlStorage = await window.uploadMidiaNexSupabase(
            fonteUpload,
            m.type
          );

          if (urlStorage && /^https?:\/\//i.test(urlStorage)) {
            enviadas.push({
              url: urlStorage,
              type: m.type === 'video' ? 'video' : 'imagem'
            });
          } else {
            console.warn('⚠️ Falha no upload de uma mídia do álbum:', m);
          }
        }

        if (!enviadas.length) {
          throw new Error('Falha no upload das mídias');
        }

        msgLocal.midias = enviadas;
      }

      if (documentoLocal && documentoLocal.url && !midiaUnicaLocal) {
        const urlStorage = await window.uploadMidiaNexSupabase(
          documentoLocal.url,
          'pdf'
        );

        if (urlStorage && /^https?:\/\//i.test(urlStorage)) {
          msgLocal.anexo.url = urlStorage;
          if (msgLocal.anexo.documento) {
            msgLocal.anexo.documento.url = urlStorage;
          }
        } else {
          throw new Error('Falha no upload do PDF');
        }
      }

      if (audioLocal) {
        const fonteAudio = audioBlobLocal || audioLocal;

        console.log('📤 Enviando áudio:', {
          temBlob: !!audioBlobLocal,
          tipoBlob: audioBlobLocal?.type
        });

        const urlStorage = await window.uploadMidiaNexSupabase(
          fonteAudio,
          'audio'
        );

        if (urlStorage && /^https?:\/\//i.test(urlStorage)) {
          msgLocal.audio = urlStorage;
        } else {
          throw new Error('Falha no upload do áudio');
        }
      }

      let convId =
        window.__convIdsNex && window.__convIdsNex[conversaAtual];

      if (
        !convId &&
        typeof window.obterOuCriarConversaSupabase === 'function'
      ) {
        const usernameReal =
          (window.__convUsernamesNex &&
            window.__convUsernamesNex[conversaAtual]) ||
          String(conversaAtual || '')
            .toLowerCase()
            .replace(/^@/, '')
            .trim();

        try {
          convId = await window.obterOuCriarConversaSupabase(usernameReal);

          if (convId) {
            window.__convIdsNex = window.__convIdsNex || {};
            window.__convIdsNex[conversaAtual] = convId;

            window.__convUsernamesNex = window.__convUsernamesNex || {};
            window.__convUsernamesNex[conversaAtual] = usernameReal;
          }
        } catch (err) {
          console.warn('Erro ao criar conversa antes de enviar:', err);
        }
      }

      if (
        typeof window.enviarMensagemSupabase === 'function' &&
        convId
      ) {
        let tipo = 'texto';
        let mediaUrl = null;
        let mediaMeta = null;

        if (msgLocal.audio) {
          tipo = 'audio';
          mediaUrl = msgLocal.audio;
        } else if (msgLocal.anexo) {
          if (msgLocal.anexo.type === 'location') {
            tipo = 'location';

            const latLoc = Number(msgLocal.anexo.lat);
            const lngLoc = Number(msgLocal.anexo.lng);
            const endLoc = msgLocal.anexo.address || 'Localização';

            mediaMeta = {
              lat: latLoc,
              lng: lngLoc,
              address: endLoc,
              localizacao: { lat: latLoc, lng: lngLoc, address: endLoc }
            };
          } else if (msgLocal.anexo.type === 'pdf') {
            tipo = 'pdf';
            mediaUrl = msgLocal.anexo.url || null;
            mediaMeta = {
              documento: msgLocal.anexo.documento || null,
              name: msgLocal.anexo.name || 'Documento PDF'
            };
          } else {
            tipo = msgLocal.anexo.type === 'video' ? 'video' : 'imagem';
            mediaUrl = msgLocal.anexo.url || null;
          }
        } else if (msgLocal.midias && msgLocal.midias.length) {
          tipo = 'album';
          mediaUrl = msgLocal.midias[0].url || null;
          mediaMeta = { midias: msgLocal.midias };
        }

        let metaCompleta = mediaMeta || {};

        if (msgLocal.resposta) {
          metaCompleta = {
            ...metaCompleta,
            resposta_info: {
              id: msgLocal.resposta.id,
              nome: msgLocal.resposta.nome || '',
              texto: msgLocal.resposta.texto || '',
              side: msgLocal.resposta.side || 'left'
            }
          };
        }

        const msgSupabase = await window.enviarMensagemSupabase({
          conversa_id: convId,
          tipo,
          texto: msgLocal.text || null,
          media_url: mediaUrl,
          media_meta: Object.keys(metaCompleta).length
            ? metaCompleta
            : null,
          resposta_a_id: msgLocal.resposta?.id || null
        });

        if (msgSupabase && msgSupabase.id) {
          msgLocal._supabaseId = msgSupabase.id;
        }
      }

      if (!convId) {
        throw new Error('Conversa não pôde ser criada (username inválido?)');
      }

      if (!msgLocal._supabaseId) {
        throw new Error('Mensagem não foi salva no servidor');
      }

      msgLocal.status = 'enviado';

      renderChat(conversaAtual);

      marcarConversaRespondidaNex(conversaAtual);

      if (typeof window.feedbackNex?.enviouMsg === 'function') {
        window.feedbackNex.enviouMsg();
      }

      if (typeof window.limparTodosPreviewsNex === 'function') {
        window.limparTodosPreviewsNex();
      }
    } catch (err) {
      console.error('❌ Erro no envio:', err);

      const msgErro = conversas[conversaAtual].find(
        (m) => m.id === mensagem.id
      );

      if (msgErro) {
        msgErro.status = 'erro';
        renderChat(conversaAtual);
      }

      window.mostrarToastNex?.(
        'Erro: ' + (err.message || 'desconhecido'),
        'erro',
        6000
      );
    }
  })();
}

// ============================================
// REENVIAR MENSAGEM
// ============================================

async function reenviarMensagemNex(msgId) {
  const conversaAtual = Drops.estado.conversaAtual;
  if (!conversaAtual) return;

  const lista = conversas[conversaAtual] || [];
  const msgOriginal = lista.find((m) => m.id === msgId);

  if (!msgOriginal) return;
  if (msgOriginal.status !== 'erro') return;

  const index = lista.indexOf(msgOriginal);
  if (index > -1) lista.splice(index, 1);

  const novaMensagem = {
    ...msgOriginal,
    id: gerarIdMensagemNex(),
    timestamp: Date.now(),
    status: 'enviando'
  };

  lista.push(novaMensagem);
  renderChat(conversaAtual);

  try {
    let convId =
      window.__convIdsNex && window.__convIdsNex[conversaAtual];

    if (
      !convId &&
      typeof window.obterOuCriarConversaSupabase === 'function'
    ) {
      const usernameReal =
        (window.__convUsernamesNex &&
          window.__convUsernamesNex[conversaAtual]) ||
        String(conversaAtual || '')
          .toLowerCase()
          .replace(/^@/, '')
          .trim();

      convId = await window.obterOuCriarConversaSupabase(usernameReal);

      if (convId) {
        window.__convIdsNex = window.__convIdsNex || {};
        window.__convIdsNex[conversaAtual] = convId;

        window.__convUsernamesNex = window.__convUsernamesNex || {};
        window.__convUsernamesNex[conversaAtual] = usernameReal;
      }
    }

    if (typeof window.enviarMensagemSupabase === 'function' && convId) {
      let tipo = 'texto';
      let mediaUrl = null;
      let mediaMeta = null;

      if (novaMensagem.audio) {
        tipo = 'audio';
        mediaUrl = novaMensagem.audio;
      } else if (novaMensagem.anexo) {
        if (novaMensagem.anexo.type === 'location') {
          tipo = 'location';

          const latLoc = Number(novaMensagem.anexo.lat);
          const lngLoc = Number(novaMensagem.anexo.lng);
          const endLoc = novaMensagem.anexo.address || 'Localização';

          mediaMeta = {
            lat: latLoc,
            lng: lngLoc,
            address: endLoc,
            localizacao: { lat: latLoc, lng: lngLoc, address: endLoc }
          };
        } else if (novaMensagem.anexo.type === 'pdf') {
          tipo = 'pdf';
          mediaUrl = novaMensagem.anexo.url || null;
          mediaMeta = {
            documento: novaMensagem.anexo.documento || null,
            name: novaMensagem.anexo.name || 'Documento PDF'
          };
        } else {
          tipo =
            novaMensagem.anexo.type === 'video' ? 'video' : 'imagem';
          mediaUrl = novaMensagem.anexo.url || null;
        }
      } else if (novaMensagem.midias && novaMensagem.midias.length) {
        tipo = 'album';
        mediaUrl = novaMensagem.midias[0].url || null;
        mediaMeta = { midias: novaMensagem.midias };
      }

      let metaCompleta = mediaMeta || {};

      if (novaMensagem.resposta) {
        metaCompleta = {
          ...metaCompleta,
          resposta_info: {
            id: novaMensagem.resposta.id,
            nome: novaMensagem.resposta.nome || '',
            texto: novaMensagem.resposta.texto || '',
            side: novaMensagem.resposta.side || 'left'
          }
        };
      }

      const msgSupabase = await window.enviarMensagemSupabase({
        conversa_id: convId,
        tipo,
        texto: novaMensagem.text || null,
        media_url: mediaUrl,
        media_meta: Object.keys(metaCompleta).length ? metaCompleta : null,
        resposta_a_id: novaMensagem.resposta?.id || null
      });

      if (msgSupabase && msgSupabase.id) {
        novaMensagem._supabaseId = msgSupabase.id;
      }
    }

    if (!convId) throw new Error('Conversa não pôde ser criada');
    if (!novaMensagem._supabaseId) {
      throw new Error('Mensagem não foi salva no servidor');
    }

    novaMensagem.status = 'enviado';

    renderChat(conversaAtual);
  } catch (err) {
    console.warn('Erro no reenvio:', err);
    novaMensagem.status = 'erro';
    renderChat(conversaAtual);
    window.mostrarToastNex?.(
      'Falha ao reenviar: ' + (err.message || 'desconhecido'),
      'erro',
      6000
    );
  }
}

window.reenviarMensagemNex = reenviarMensagemNex;

// ============================================
// CANCELAR RESPOSTA
// ============================================

function cancelarRespostaNex() {
  respostaSelecionadaNex = null;

  const preview = document.getElementById('previewRespostaNex');
  if (!preview) return;

  preview.style.display = 'none';
  preview.classList.remove('ativo');
  preview.innerHTML = '';

  if (typeof window.atualizarPreviewStackNex === 'function') {
    window.atualizarPreviewStackNex();
  }
}

function atualizarPreviewStackNex() {
  const stack = document.getElementById('previewStackNex');
  if (!stack) return;

  const filhos = [
    'previewRespostaNex',
    'previewMidiasNex',
    'previewLocalizacaoNex',
    'audioInlineNex'
  ];

  let temAlgo = false;

  filhos.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const temHTML = el.innerHTML.trim().length > 0;
    const visivelForcado =
      el.style.display && el.style.display !== 'none';

    const ativo = temHTML || visivelForcado;

    el.classList.toggle('ativo', ativo);

    if (ativo) temAlgo = true;
  });

  stack.classList.toggle('tem-conteudo', temAlgo);
}
  
    // ============================================
  // MENU DE MENSAGEM
  // ============================================

  function abrirMenuMsgNex(botao, msgId) {
    const conversaAtual = Drops.estado.conversaAtual;
    const lista = conversas[conversaAtual] || [];
    const msg = lista.find((m) => m.id === msgId);

    if (!msg) return;

    mensagemSelecionadaNex = msg;

    const menu = document.getElementById('msgMenuNex');
    if (!menu) return;

    const lado = msg.side === 'right' ? 'right' : 'left';

    menu.innerHTML =
      lado === 'left'
        ? `
      <button type="button" onclick="acaoResponderNex()" style="display:flex; align-items:center; gap:10px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        Responder
      </button>
      <button type="button" class="danger" onclick="window.acaoApagarPraMimNex()" style="display:flex; align-items:center; gap:10px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        Apagar pra mim
      </button>
      <button type="button" class="cancelar" onclick="fecharMenuMsgNex()">Cancelar</button>
    `
        : `
      <button type="button" onclick="window.acaoResponderNex()" style="display:flex; align-items:center; gap:10px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        Responder
      </button>
      <button type="button" onclick="window.acaoReeditarNex()" style="display:flex; align-items:center; gap:10px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
        Reeditar
      </button>
      <button type="button" class="danger" onclick="window.acaoApagarMsgNex()" style="display:flex; align-items:center; gap:10px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        Apagar para todos
      </button>
      <button type="button" class="cancelar" onclick="window.fecharMenuMsgNex()">Cancelar</button>
    `;

    menu.style.display = 'flex';
    menu.style.visibility = 'visible';
    menu.style.opacity = '1';
    menu.style.pointerEvents = 'auto';
    menu.style.left = '50%';
    menu.style.top = '50%';
    menu.style.transform = 'translate(-50%, -50%)';
  }

  function fecharMenuMsgNex() {
    const menu = document.getElementById('msgMenuNex');
    if (menu) {
      menu.style.display = 'none';
      menu.style.visibility = 'hidden';
      menu.style.opacity = '0';
      menu.style.pointerEvents = 'none';
      menu.innerHTML = '';
      menu.style.left = '';
      menu.style.top = '';
      menu.style.transform = '';
    }
    mensagemSelecionadaNex = null;
  }

  function acaoResponderNex() {
    if (!mensagemSelecionadaNex) return;
    respostaSelecionadaNex = mensagemSelecionadaNex;
    mostrarPreviewRespostaNex();
    fecharMenuMsgNex();
  }

  function acaoReeditarNex() {
    if (!mensagemSelecionadaNex) return;
    const msg = mensagemSelecionadaNex;
    const temTexto = typeof msg.text === 'string' && msg.text.trim().length > 0;
    if (!temTexto) {
      fecharMenuMsgNex();
      return;
    }
    mensagemEmEdicaoNex = msg;
    textoOriginalEdicaoNex = msg.text || '';
    abrirModalEdicaoNex(msg.text || '');
    fecharMenuMsgNex();
  }

  function acaoApagarPraMimNex() {
    if (!mensagemSelecionadaNex) return;
    mensagemParaApagarNex = mensagemSelecionadaNex;
    const modal = document.getElementById('confirmDeleteMeModalNex');
    if (!modal) return;
    modal.style.display = 'flex';
    fecharMenuMsgNex();
  }

  function fecharConfirmDeleteMeNex() {
    const modal = document.getElementById('confirmDeleteMeModalNex');
    if (modal) modal.style.display = 'none';
    mensagemParaApagarNex = null;
  }

  async function confirmarApagarPraMimNex() {
    if (!mensagemParaApagarNex) return;
    const msg = mensagemParaApagarNex;
    const idMsg = typeof msg === 'string' ? msg : msg.id;
    const idSupabase =
      typeof msg === 'object' ? msg._supabaseId || msg.id : msg;

    if (typeof window.apagarPraMimSupabase === 'function' && idSupabase) {
      try {
        await window.apagarPraMimSupabase(idSupabase);
      } catch (err) {
        console.warn('Erro ao ocultar no Supabase:', err);
      }
    }

    const conversaAtual = Drops.estado.conversaAtual;
    const lista = conversas[conversaAtual] || [];
    const index = lista.findIndex((m) => m.id === idMsg);
    if (index !== -1) lista.splice(index, 1);

    fecharConfirmDeleteMeNex();
    renderChat(conversaAtual);
    mensagemParaApagarNex = null;
  }

  function acaoApagarMsgNex() {
    if (!mensagemSelecionadaNex) return;
    mensagemParaApagarNex = mensagemSelecionadaNex;
    const modal = document.getElementById('confirmDeleteModalNex');
    if (!modal) return;
    modal.style.display = 'flex';
    fecharMenuMsgNex();
  }

  function fecharConfirmDeleteNex() {
    const modal = document.getElementById('confirmDeleteModalNex');
    if (!modal) return;
    modal.style.display = 'none';
    mensagemParaApagarNex = null;
  }

  async function confirmarApagarMsgNex() {
    if (!mensagemParaApagarNex) return;
    const msg = mensagemParaApagarNex;
    const nomePessoa = msg.nome || 'usuário';

    fecharConfirmDeleteNex();

    const idSupabase = msg._supabaseId || msg.id;
    if (typeof window.apagarPraTodosSupabase === 'function' && idSupabase) {
      try {
        await window.apagarPraTodosSupabase(idSupabase);
      } catch (err) {
        console.warn('Erro ao apagar no Supabase:', err);
      }
    }

    msg.deleted = true;
    msg.deletedAt = Date.now();
    msg.deletedText = msg.eu
      ? '🗑️ Mensagem apagada'
      : `⚠️ Mensagem apagada pelo ${nomePessoa}`;

    renderChat(Drops.estado.conversaAtual);

    setTimeout(() => {
      const lista = conversas[Drops.estado.conversaAtual];
      if (!Array.isArray(lista)) return;
      const index = lista.indexOf(msg);
      if (index !== -1) {
        lista.splice(index, 1);
        renderChat(Drops.estado.conversaAtual);
      }
    }, msg.eu ? 5000 : 10000);

    mensagemParaApagarNex = null;
  }

  function abrirModalEdicaoNex(texto) {
    const modal = document.getElementById('editarMsgModalNex');
    const input = document.getElementById('editarMsgInputNex');
    const btn = document.getElementById('btnConcluirEdicaoNex');
    if (!modal || !input || !btn) return;
    input.value = texto || '';
    modal.style.display = 'flex';
    modal.style.zIndex = '999999999';
    btn.disabled = true;
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }, 50);
  }

  function fecharModalEdicaoNex() {
    const modal = document.getElementById('editarMsgModalNex');
    const input = document.getElementById('editarMsgInputNex');
    const btn = document.getElementById('btnConcluirEdicaoNex');
    if (input) {
      input.blur();
      input.value = '';
    }
    if (btn) btn.disabled = true;
    if (modal) modal.style.display = 'none';
    mensagemEmEdicaoNex = null;
    textoOriginalEdicaoNex = '';
  }

  function atualizarBotaoEdicaoNex() {
    const input = document.getElementById('editarMsgInputNex');
    const btn = document.getElementById('btnConcluirEdicaoNex');
    if (!input || !btn) return;
    btn.disabled = input.value.trim() === textoOriginalEdicaoNex.trim();
  }

  async function concluirEdicaoNex() {
    if (!mensagemEmEdicaoNex) return;
    const input = document.getElementById('editarMsgInputNex');
    if (!input) return;
    const novoTexto = input.value;
    if (novoTexto.trim() === textoOriginalEdicaoNex.trim()) return;

    const idSupabase = mensagemEmEdicaoNex._supabaseId || mensagemEmEdicaoNex.id;
    if (typeof window.editarMensagemSupabase === 'function' && idSupabase) {
      try {
        await window.editarMensagemSupabase(idSupabase, novoTexto);
      } catch (err) {
        console.warn('Erro ao editar no Supabase:', err);
      }
    }

    mensagemEmEdicaoNex.text = novoTexto;
    mensagemEmEdicaoNex.edited = true;
    fecharModalEdicaoNex();
    renderChat(Drops.estado.conversaAtual);
  }

  function mostrarPreviewRespostaNex() {
    const preview = document.getElementById('previewRespostaNex');
    if (!preview || !respostaSelecionadaNex) return;
    preview.innerHTML = `
      <div class="reply-preview-box">
        <div class="reply-preview-text">Você está respondendo uma Msg específica.</div>
        <button type="button" id="btnCancelarRespostaNex" class="reply-preview-close">✕</button>
      </div>
    `;
    preview.style.display = 'block';
    const btnCancelar = document.getElementById('btnCancelarRespostaNex');
    if (btnCancelar) btnCancelar.addEventListener('click', cancelarRespostaNex);
    atualizarPreviewStackNex();
  }

  // ============================================
  // NAVEGAÇÃO ENTRE MENSAGENS
  // ============================================

  function obterCardMensagemNex(msgId) {
    const alvo = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (!alvo) return null;
    return (
      alvo.querySelector('.msg-layer') ||
      alvo.querySelector('.msg-card') ||
      alvo.firstElementChild ||
      alvo
    );
  }

  function limparDestaqueMensagemNex() {
    if (!msgDestacadaNex) return;
    msgDestacadaNex.classList.remove(
      'msg-destaque-verde-nex',
      'msg-destaque-amarelo-nex'
    );
    msgDestacadaNex = null;
  }

  function destacarMensagemNex(msgId, tipo) {
    const card = obterCardMensagemNex(msgId);
    if (!card) return;
    limparDestaqueMensagemNex();
    card.classList.add(
      tipo === 'amarelo' ? 'msg-destaque-amarelo-nex' : 'msg-destaque-verde-nex'
    );
    msgDestacadaNex = card;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function irParaMensagemNex(msgId, msgIdLocal, msgIdSupabase) {
    let alvo = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (!alvo && msgIdLocal)
      alvo = document.querySelector(`[data-msg-id="${msgIdLocal}"]`);
    if (!alvo) {
      const msgs = conversas[Drops.estado.conversaAtual] || [];
      const msgEncontrada = msgs.find(
        (m) =>
          String(m.id) === String(msgId) ||
          String(m._supabaseId) === String(msgId) ||
          (msgIdSupabase && String(m._supabaseId) === String(msgIdSupabase))
      );
      if (msgEncontrada)
        alvo = document.querySelector(
          `[data-msg-id="${msgEncontrada.id || msgEncontrada._supabaseId}"]`
        );
    }
    if (!alvo) return;
    const card =
      alvo.querySelector('.msg-layer') ||
      alvo.querySelector('.msg-card') ||
      alvo.firstElementChild ||
      alvo;
    limparDestaqueMensagemNex();
    card.classList.add('msg-destaque-verde-nex');
    msgDestacadaNex = card;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function irParaRespostaFilhaNex(msgIdOriginal, msgIdSupabaseOriginal) {
    const msgs = conversas[Drops.estado.conversaAtual] || [];
    const idsValidos = [
      String(msgIdOriginal || ''),
      String(msgIdSupabaseOriginal || '')
    ].filter(Boolean);
    const respostas = msgs.filter(
      (m) => m.resposta && idsValidos.includes(String(m.resposta.id || ''))
    );
    if (!respostas.length) return;
    const primeira = respostas[0];
    destacarMensagemNex(primeira.id || primeira._supabaseId, 'amarelo');
  }

  function irParaProximaRespostaNex(originalId, ordemAtual) {
    const msgs = conversas[Drops.estado.conversaAtual] || [];
    const respostas = msgs.filter(
      (m) => m.resposta && m.resposta.id === originalId
    );
    const proxima = respostas[ordemAtual];
    if (!proxima) return;
    destacarMensagemNex(proxima.id, 'amarelo');
  }

  // ============================================
  // EVENTOS GLOBAIS
  // ============================================

  document.addEventListener('click', (e) => {
    const menu = document.getElementById('msgMenuNex');
    if (
      menu &&
      menu.style.display !== 'none' &&
      !menu.contains(e.target) &&
      !e.target.closest('.msg-menu-btn')
    ) {
      fecharMenuMsgNex();
    }
    const modal = document.getElementById('editarMsgModalNex');
    if (
      modal &&
      getComputedStyle(modal).display !== 'none' &&
      e.target.id === 'editarMsgModalNex'
    ) {
      fecharModalEdicaoNex();
    }
    const deleteModal = document.getElementById('confirmDeleteModalNex');
    if (
      deleteModal &&
      getComputedStyle(deleteModal).display !== 'none' &&
      e.target.id === 'confirmDeleteModalNex'
    ) {
      fecharConfirmDeleteNex();
    }
  });

  document.addEventListener(
    'click',
    (e) => {
      if (
        e.target.closest('.msg-card') ||
        e.target.closest('.msg-layer') ||
        e.target.closest('.reply-linked-top') ||
        e.target.closest('.reply-cited-bottom') ||
        e.target.closest('.reply-next-btn')
      )
        return;
      limparDestaqueMensagemNex();
    },
    true
  );

  document.addEventListener('DOMContentLoaded', () => {
    const btnConcluir = document.getElementById('btnConcluirEdicaoNex');
    if (btnConcluir) btnConcluir.addEventListener('click', concluirEdicaoNex);

    const inputEdicao = document.getElementById('editarMsgInputNex');
    if (inputEdicao)
      inputEdicao.addEventListener('input', atualizarBotaoEdicaoNex);

    const btnFecharEdicao = document.querySelector('.modal-edicao-fechar');
    if (btnFecharEdicao)
      btnFecharEdicao.addEventListener('click', fecharModalEdicaoNex);

    document.addEventListener('drops_presenca_atualizada', (e) => {
      const { username, online } = e.detail || {};
      if (!username) return;

      const conversaAberta = Drops.estado.conversaAtual;
      if (
        String(username).toLowerCase() ===
        String(conversaAberta).toLowerCase()
      ) {
        const chatStatus = document.getElementById('chatStatus');
        if (chatStatus) {
          chatStatus.innerText = online ? 'online' : 'offline';
          chatStatus.classList.toggle('online', !!online);
          chatStatus.classList.toggle('offline', !online);
        }
      }
    });
  });

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.abrirMenuMsgNex = abrirMenuMsgNex;
  window.fecharMenuMsgNex = fecharMenuMsgNex;
  window.acaoResponderNex = acaoResponderNex;
  window.acaoReeditarNex = acaoReeditarNex;
  window.acaoApagarMsgNex = acaoApagarMsgNex;
  window.acaoApagarPraMimNex = acaoApagarPraMimNex;
  window.fecharConfirmDeleteNex = fecharConfirmDeleteNex;
  window.confirmarApagarMsgNex = confirmarApagarMsgNex;
  window.fecharConfirmDeleteMeNex = fecharConfirmDeleteMeNex;
  window.confirmarApagarPraMimNex = confirmarApagarPraMimNex;
  window.abrirModalEdicaoNex = abrirModalEdicaoNex;
  window.fecharModalEdicaoNex = fecharModalEdicaoNex;
  window.atualizarBotaoEdicaoNex = atualizarBotaoEdicaoNex;
  window.concluirEdicaoNex = concluirEdicaoNex;
  window.irParaMensagemNex = irParaMensagemNex;
  window.irParaRespostaFilhaNex = irParaRespostaFilhaNex;
  window.irParaProximaRespostaNex = irParaProximaRespostaNex;
  window.abrirChatNex = abrirChatNex;
  window.voltarChatNex = voltarChatNex;
  window.renderChat = renderChat;
  window.atualizarBadgeReacaoMidiaNex = atualizarBadgeReacaoMidiaNex;
  window.atualizarNotificacaoTabbarNex = atualizarNotificacaoTabbarNex;
  window.atualizarTodosBadgesReacaoMidiaNex = atualizarTodosBadgesReacaoMidiaNex;
  window.enviarMsgNex = enviarMsgNex;
  window.cancelarRespostaNex = cancelarRespostaNex;
  window.atualizarPreviewStackNex = atualizarPreviewStackNex;
  window.buscarAvatarNex = buscarAvatarNex;

  window.abrirMenuChatNex = abrirMenuChatNex;
  window.fecharMenuChatNex = fecharMenuChatNex;

  window.toggleMenuChatNex = function () {
    if (chatMenuAbertoNex) {
      fecharMenuChatNex();
    } else {
      abrirMenuChatNex();
    }
  };

  window.estaSilenciadoNex = estaSilenciadoNex;
  window.alternarSilenciarChatNex = alternarSilenciarChatNex;
  window.abrirMidiasCompartilhadasNex = abrirMidiasCompartilhadasNex;
  window.apagarChatNex = apagarChatNex;
  window.atualizarSilenciadoNoCardNex = atualizarSilenciadoNoCardNex;

  window.buscarStatusNex = async function (username) {
    if (!username || !window.supabaseClient) return false;
    try {
      const { data: perfil } = await window.supabaseClient
        .from('profiles')
        .select('ultima_atividade')
        .eq(
          'username',
          String(username).toLowerCase().replace(/^@/, '').trim()
        )
        .maybeSingle();
      const ultima = perfil?.ultima_atividade;
      const LIMITE_ONLINE_MS = 30 * 1000;
      return !!(
        ultima &&
        Date.now() - new Date(ultima).getTime() < LIMITE_ONLINE_MS
      );
    } catch (err) {
      console.warn('Erro ao buscar status:', err);
      return false;
    }
  };

  console.log('💬 05-nex-chat.js completo (versão definitiva)');

})();