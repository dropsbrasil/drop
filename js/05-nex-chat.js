/* ============================================
   05-NEX-CHAT.JS
   Chat do NEX: abrir, renderizar, enviar mensagens
============================================ */

(function () {
  'use strict';

  let respostaSelecionadaNex = null;
  let mensagemSelecionadaNex = null;
  let mensagemParaApagarNex = null;
  let mensagemEmEdicaoNex = null;
  let textoOriginalEdicaoNex = '';
  let msgDestacadaNex = null;

  const cacheAvataresNex = {};
  const avataresEmBuscaNex = new Set();

  async function buscarAvatarNex(username) {
    if (!username) return null;
    if (cacheAvataresNex[username]) return cacheAvataresNex[username];
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
            cacheAvataresNex[username] = perfil.avatar_url;
            return perfil.avatar_url;
          }
        }
      }

      if (typeof window.buscarPerfilPublicoSupabase === 'function') {
        const perfil = await window.buscarPerfilPublicoSupabase(username);
        const url = perfil?.avatar_url || null;
        cacheAvataresNex[username] = url;
        return url;
      }
    } catch (err) {
      console.warn('Erro ao buscar avatar:', err);
    } finally {
      avataresEmBuscaNex.delete(username);
    }

    return null;
  }

  async function abrirChatNex(el) {
    const card = el?.closest?.('.nex-chat') || el;
    const nome =
      card?.dataset?.chat || card?.querySelector('h3')?.innerText?.trim();

    if (!nome) return;

    Drops.estado.conversaAtual = nome;
    window.setConversaAbertaNex(nome);
    window.setCardAbertoNex(card);

    const connected =
      card?.dataset?.connected === 'yes' || estaConectadoNoMyDropsNex(nome);

    obterEstadoConversaNex(nome, connected);
    card.dataset.connected = connected ? 'yes' : 'no';

    marcarConversaComoLidaNex(nome, card);

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

    const bio =
      el?.dataset?.bio || el?.querySelector('p')?.innerText?.trim() || '';

    const chatName = document.getElementById('chatName');
    const chatBio = document.getElementById('chatBio');
    const chatStatus = document.getElementById('chatStatus');
    const chatAvatar = document.getElementById('chatAvatar');
      async function atualizarPresencaChatNex() {
    const usernameReal =
      (window.__convUsernamesNex && window.__convUsernamesNex[nome]) || nome;

    if (!usernameReal || !window.supabaseClient) return;

    try {
      const { data: perfil } = await window.supabaseClient
        .from('profiles')
        .select('ultima_atividade')
        .eq(
          'username',
          String(usernameReal).toLowerCase().replace(/^@/, '').trim()
        )
        .maybeSingle();

      const ultima = perfil?.ultima_atividade;
      const LIMITE_ONLINE_MS = 30 * 1000;

      const estaOnline =
        ultima &&
        Date.now() - new Date(ultima).getTime() < LIMITE_ONLINE_MS;

      if (chatStatus) {
        chatStatus.innerText = estaOnline ? 'online' : 'offline';
        chatStatus.classList.toggle('online', !!estaOnline);
        chatStatus.classList.toggle('offline', !estaOnline);
      }
    } catch (err) {
      console.warn('Erro ao buscar presença:', err);
      if (chatStatus) {
        chatStatus.innerText = 'offline';
        chatStatus.classList.add('offline');
        chatStatus.classList.remove('online');
      }
    }
  }

  atualizarPresencaChatNex();

  if (window.__presencaIntervalNex) {
    clearInterval(window.__presencaIntervalNex);
  }
  window.__presencaIntervalNex = setInterval(atualizarPresencaChatNex, 30000);

  if (chatName) {
    chatName.innerText = nome;
    chatName.style.cursor = 'pointer';

    if (chatName.__clickPerfilHandler) {
      chatName.removeEventListener('click', chatName.__clickPerfilHandler);
    }

    chatName.__clickPerfilHandler = () => {
      const usernameReal =
        (window.__convUsernamesNex && window.__convUsernamesNex[nome]) || nome;
      if (typeof window.abrirPerfilVisitadoNex === 'function') {
        window.abrirPerfilVisitadoNex(usernameReal, nome);
      }
    };

    chatName.addEventListener('click', chatName.__clickPerfilHandler);
  }

  if (chatBio) {
    const usernameBio =
      (window.__convUsernamesNex && window.__convUsernamesNex[nome]) || nome;

    chatBio.textContent = 'Carregando...';
    chatBio.classList.remove('marquee-ativo');

    if (usernameBio && window.supabaseClient) {
      try {
        const { data: perfil } = await window.supabaseClient
          .from('profiles')
          .select('bio')
          .eq(
            'username',
            String(usernameBio).toLowerCase().replace(/^@/, '').trim()
          )
          .maybeSingle();

        const bioReal = (perfil?.bio || '').trim();
        const textoBio = bioReal || 'Sem bio ainda.';
        chatBio.textContent = textoBio;
        chatBio.setAttribute('data-texto', textoBio);

        setTimeout(() => {
          if (chatBio.scrollWidth > chatBio.clientWidth + 2) {
            chatBio.classList.add('marquee-ativo');
          }
        }, 100);
      } catch (err) {
        console.warn('Erro ao buscar bio no chat:', err);
        chatBio.textContent = bio || 'Sem bio ainda.';
        chatBio.setAttribute('data-texto', bio || 'Sem bio ainda.');
      }
    } else {
      chatBio.textContent = bio || 'Sem bio ainda.';
      chatBio.setAttribute('data-texto', bio || 'Sem bio ainda.');
    }
  }

  if (chatStatus) {
    chatStatus.innerText = '';
    chatStatus.classList.remove('online', 'offline');
  }

  if (chatAvatar) {
    chatAvatar.innerText = nome.charAt(0).toUpperCase();
    chatAvatar.style.backgroundImage = 'none';
    chatAvatar.style.cursor = 'pointer';
  }

  const usernameAvatar =
    (window.__convUsernamesNex && window.__convUsernamesNex[nome]) || nome;

  if (
    usernameAvatar &&
    typeof window.buscarPerfilPublicoSupabase === 'function'
  ) {
    try {
      const perfil = await window.buscarPerfilPublicoSupabase(usernameAvatar);

      if (perfil && perfil.avatar_url && chatAvatar) {
        chatAvatar.innerHTML = `<img src="${perfil.avatar_url}" alt="${nome}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;
        chatAvatar.style.backgroundImage = 'none';
      }
    } catch (err) {
      console.warn('Erro ao buscar avatar no chat:', err);
    }
  }

  if (chatAvatar) {
    if (chatAvatar.__clickPerfilHandler) {
      chatAvatar.removeEventListener('click', chatAvatar.__clickPerfilHandler);
    }

    chatAvatar.__clickPerfilHandler = () => {
      const usernameReal =
        (window.__convUsernamesNex && window.__convUsernamesNex[nome]) || nome;
      if (typeof window.abrirPerfilVisitadoNex === 'function') {
        window.abrirPerfilVisitadoNex(usernameReal, nome);
      }
    };

    chatAvatar.addEventListener('click', chatAvatar.__clickPerfilHandler);
  }

  if (typeof window.carregarConversaSupabase === 'function') {
    try {
      await window.carregarConversaSupabase(nome);
    } catch (err) {
      console.warn('Erro ao carregar conversa do Supabase:', err);
    }
  }

  if (!conversas[nome]) {
    conversas[nome] = [];
  }

  renderChat(nome);
  document.getElementById('chatInput')?.focus();
}

function voltarChatNex() {
  if (window.__presencaIntervalNex) {
    clearInterval(window.__presencaIntervalNex);
    window.__presencaIntervalNex = null;
  }

  const chat = document.getElementById('chatNex');
  const nex = document.getElementById('nex');

  if (chat) {
    chat.style.display = 'none';
    chat.classList.remove('active');
  }

  if (nex) {
    nex.style.display = 'block';
    nex.classList.add('active');
  }

  mostrarNexTab(Drops.estado.abaNex);

  window.setConversaAbertaNex('');
  window.setOrigemAberturaNex('');
  window.setCardAbertoNex(null);

  Drops.estado.conversaAtual = '';

  document.body.classList.remove('chat-aberto');
  document.body.classList.remove('chat-open');

  if (typeof window.sincronizarCardsNexSupabase === 'function') {
    setTimeout(() => {
      window.sincronizarCardsNexSupabase();
    }, 300);
  }
}

function atualizarNotificacaoTabbarNex() {
  const tabNex = document.querySelector('.tab.tab-nex');
  if (!tabNex) return;

  const listaNaoLidas = document.getElementById('nex-naolidas');
  const temNaoLidas =
    listaNaoLidas &&
    listaNaoLidas.querySelectorAll('.nex-chat').length > 0;

  tabNex.classList.toggle('tem-notificacao', !!temNaoLidas);
}
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

function renderChat(nome) {
  const area = document.getElementById('chatMsgs');
  if (!area) return;

  area.innerHTML = '';

  const msgs = conversas[nome] || [];

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
    const nomeExibido = msg.nome || (lado === 'right' ? 'Eu' : nome);
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
      anexosHTML = window.montarAnexosHTMLNex(msg, dataExibida, horaExibida);
    }

    // ⚠️ Ajuste: onclick do status — só reenvia se estiver com erro
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
        <div style="display:flex;align-items:center;margin-top:8px;">
          <div
            class="reply-linked-top"
            onclick="irParaMensagemNex('${msg.resposta.id}', '${msg.id}', '${msg._supabaseId || ''}')">
            <span class="reply-arrow">↖</span>
            <span>Resposta</span>
            <span class="reply-count-pill">
              ${ordemResposta}/${totalRespostasDaOriginal}
            </span>
          </div>

          ${
            lado === 'right' && ordemResposta < totalRespostasDaOriginal
              ? `
            <button
              type="button"
              class="reply-next-btn"
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

          ${anexosHTML}
        </div>

        ${
          qtdCitacoes > 0
            ? `
          <button
            type="button"
            class="reply-cited-bottom"
            onclick="irParaRespostaFilhaNex('${msg.id}', '${msg._supabaseId || ''}')">
            <span>Msg foi citada</span>
            <span class="reply-cited-meta">
              ${
                qtdCitacoes > 1
                  ? `<span class="reply-count-pill">${qtdCitacoes}x</span>`
                  : ''
              }
              <span class="reply-arrow">↘</span>
            </span>
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
    if (cacheAvataresNex[username]) return;

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
  async function enviarMsgNex() {
  const input = document.getElementById('chatInput');
  const texto = input ? input.value.trim() : '';

  const temAudio = typeof window.temAudioNex === 'function'
    ? window.temAudioNex()
    : false;
  const temMidia = typeof window.temMidiasNex === 'function'
    ? window.temMidiasNex()
    : false;
  const temMidiaUnica = typeof window.getPreviewMidiaNex === 'function'
    ? !!window.getPreviewMidiaNex()
    : false;
  const temDocumento = typeof window.temDocumentoNex === 'function'
    ? window.temDocumentoNex()
    : false;
  const temLocalizacao = typeof window.temLocalizacaoNex === 'function'
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
      url: midiaUnicaLocal.url
    };
  }

  if (Array.isArray(midiasLocais) && midiasLocais.length) {
    mensagem.midias = midiasLocais.map((m) => ({
      url: m.url,
      type: m.type === 'video' ? 'video' : 'imagem'
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

  // ⚠️ AJUSTE 1: Limpa a prévia IMEDIATAMENTE após enviar
  if (typeof window.limparTodosPreviewsNex === 'function') {
    window.limparTodosPreviewsNex();
  }

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
        const urlStorage = await window.uploadMidiaNexSupabase(
          midiaUnicaLocal.url
        );

        if (urlStorage && /^https?:\/\//i.test(urlStorage)) {
          msgLocal.anexo.url = urlStorage;
        } else {
          throw new Error('Falha no upload da mídia única');
        }
      }

      if (Array.isArray(midiasLocais) && midiasLocais.length) {
        const enviadas = [];

        for (const m of midiasLocais) {
          const urlStorage = await window.uploadMidiaNexSupabase(m.url);

          if (urlStorage && /^https?:\/\//i.test(urlStorage)) {
            enviadas.push({
              url: urlStorage,
              type: m.type === 'video' ? 'video' : 'imagem'
            });
          }
        }

        if (!enviadas.length) {
          throw new Error('Falha no upload das mídias');
        }

        msgLocal.midias = enviadas;
      }

      if (documentoLocal && documentoLocal.url && !midiaUnicaLocal) {
        const urlStorage = await window.uploadMidiaNexSupabase(
          documentoLocal.url
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
        const urlStorage = await window.uploadMidiaNexSupabase(audioLocal);

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
            mediaMeta = {
              lat: msgLocal.anexo.lat,
              lng: msgLocal.anexo.lng,
              address: msgLocal.anexo.address || 'Localização',
              localizacao: msgLocal.anexo.localizacao || null
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
          media_meta: Object.keys(metaCompleta).length ? metaCompleta : null,
          resposta_a_id: msgLocal.resposta?.id || null
        });

        if (msgSupabase && msgSupabase.id) {
          msgLocal._supabaseId = msgSupabase.id;
        }
      }

      // ⚠️ AJUSTE 2: Status atualizado para 'entregue' / 'visualizado'
      msgLocal.status = 'entregue';

      if (Drops.estado.conversaAtual === conversaAtual) {
        msgLocal.status = 'visualizado';
      }

      renderChat(conversaAtual);

      marcarConversaRespondidaNex(conversaAtual);
    } catch (err) {
      console.warn('Erro no envio:', err);

      const msgErro = conversas[conversaAtual].find(
        (m) => m.id === mensagem.id
      );

      if (msgErro) {
        msgErro.status = 'erro';
        renderChat(conversaAtual);
      }

      window.mostrarToastNex?.(
        'Falha ao enviar. Toque em 📤 para tentar de novo.',
        'erro'
      );
    }
  })();
  }
  // ============================================
// REENVIAR MENSAGEM (após erro)
// ============================================

async function reenviarMensagemNex(msgId) {
  const conversaAtual = Drops.estado.conversaAtual;
  if (!conversaAtual) return;

  const lista = conversas[conversaAtual] || [];
  const msgOriginal = lista.find((m) => m.id === msgId);

  if (!msgOriginal) return;
  if (msgOriginal.status !== 'erro') return;

  // Remove a original com erro
  const index = lista.indexOf(msgOriginal);
  if (index > -1) lista.splice(index, 1);

  // Cria uma nova mensagem clonando os dados da original
  const novaMensagem = {
    ...msgOriginal,
    id: gerarIdMensagemNex(),
    timestamp: Date.now(),
    status: 'enviando'
  };

  lista.push(novaMensagem);
  renderChat(conversaAtual);

  // Processa o reenvio (mesma lógica do enviar, mas pra mensagem específica)
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
          mediaMeta = {
            lat: novaMensagem.anexo.lat,
            lng: novaMensagem.anexo.lng,
            address: novaMensagem.anexo.address || 'Localização',
            localizacao: novaMensagem.anexo.localizacao || null
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
      } else if (
        novaMensagem.midias &&
        novaMensagem.midias.length
      ) {
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

    novaMensagem.status = 'entregue';

    if (Drops.estado.conversaAtual === conversaAtual) {
      novaMensagem.status = 'visualizado';
    }

    renderChat(conversaAtual);
  } catch (err) {
    console.warn('Erro no reenvio:', err);
    novaMensagem.status = 'erro';
    renderChat(conversaAtual);
    window.mostrarToastNex?.('Falha ao reenviar.', 'erro');
  }
}

window.reenviarMensagemNex = reenviarMensagemNex;

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
    <button type="button" onclick="acaoResponderNex()">💬 Responder</button>
    <button type="button" class="danger" onclick="window.acaoApagarPraMimNex()">🗑️ Apagar pra mim</button>
    <button type="button" class="cancelar" onclick="fecharMenuMsgNex()">Cancelar</button>
  `
      : `
    <button type="button" onclick="window.acaoResponderNex()">💬 Responder</button>
    <button type="button" onclick="window.acaoReeditarNex()">✍🏼 Reeditar</button>
    <button type="button" class="danger" onclick="window.acaoApagarMsgNex()">🗑️ Apagar para todos</button>
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
    typeof msg === 'object'
      ? (msg._supabaseId || msg.id)
      : msg;

  if (
    typeof window.apagarPraMimSupabase === 'function' &&
    idSupabase
  ) {
    try {
      await window.apagarPraMimSupabase(idSupabase);
    } catch (err) {
      console.warn('Erro ao ocultar no Supabase:', err);
    }
  }

  const conversaAtual = Drops.estado.conversaAtual;
  const lista = conversas[conversaAtual] || [];
  const index = lista.findIndex((m) => m.id === idMsg);

  if (index !== -1) {
    lista.splice(index, 1);
  }

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

    if (
      typeof window.apagarPraTodosSupabase === 'function' &&
      idSupabase
    ) {
      try {
        await window.apagarPraTodosSupabase(idSupabase);
      } catch (err) {
        console.warn('Erro ao apagar no Supabase:', err);
      }
    }

    msg.deleted = true;
    msg.deletedAt = Date.now();

    if (msg.eu) {
      msg.deletedText = '🗑️ Mensagem apagada';
    } else {
      msg.deletedText = `⚠️ Mensagem apagada pelo ${nomePessoa}`;
    }

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

    const mudou = input.value.trim() !== textoOriginalEdicaoNex.trim();
    btn.disabled = !mudou;
  }

  async function concluirEdicaoNex() {
    if (!mensagemEmEdicaoNex) return;

    const input = document.getElementById('editarMsgInputNex');
    if (!input) return;

    const novoTexto = input.value;
    const textoOriginal = textoOriginalEdicaoNex;

    if (novoTexto.trim() === textoOriginal.trim()) return;

    const idSupabase =
      mensagemEmEdicaoNex._supabaseId || mensagemEmEdicaoNex.id;

    if (
      typeof window.editarMensagemSupabase === 'function' &&
      idSupabase
    ) {
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
        <div class="reply-preview-text">
          Você está respondendo uma Msg específica.
        </div>

        <button
          type="button"
          id="btnCancelarRespostaNex"
          class="reply-preview-close">
          ✕
        </button>
      </div>
    `;

    preview.style.display = 'block';

    const btnCancelar = document.getElementById('btnCancelarRespostaNex');
    if (btnCancelar) {
      btnCancelar.addEventListener('click', cancelarRespostaNex);
    }

    atualizarPreviewStackNex();
  }

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
      tipo === 'amarelo'
        ? 'msg-destaque-amarelo-nex'
        : 'msg-destaque-verde-nex'
    );

    msgDestacadaNex = card;

    card.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  function irParaMensagemNex(msgId, msgIdLocal, msgIdSupabase) {
    let alvo = document.querySelector(`[data-msg-id="${msgId}"]`);

    if (!alvo && msgIdLocal) {
      alvo = document.querySelector(`[data-msg-id="${msgIdLocal}"]`);
    }

    if (!alvo) {
      const msgs = conversas[Drops.estado.conversaAtual] || [];
      const msgEncontrada = msgs.find(
        (m) =>
          String(m.id) === String(msgId) ||
          String(m._supabaseId) === String(msgId) ||
          (msgIdSupabase && String(m._supabaseId) === String(msgIdSupabase))
      );

      if (msgEncontrada) {
        const idFinal = msgEncontrada.id || msgEncontrada._supabaseId;
        alvo = document.querySelector(`[data-msg-id="${idFinal}"]`);
      }
    }

    if (!alvo) {
      console.warn('Não achou a mensagem original:', msgId);
      return;
    }

    const card = alvo.querySelector('.msg-layer') ||
      alvo.querySelector('.msg-card') ||
      alvo.firstElementChild ||
      alvo;

    limparDestaqueMensagemNex();

    card.classList.add('msg-destaque-verde-nex');
    msgDestacadaNex = card;

    card.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  function irParaRespostaFilhaNex(msgIdOriginal, msgIdSupabaseOriginal) {
    const msgs = conversas[Drops.estado.conversaAtual] || [];

    const idsValidos = [
      String(msgIdOriginal || ''),
      String(msgIdSupabaseOriginal || '')
    ].filter(Boolean);

    const respostas = msgs.filter((m) => {
      if (!m.resposta) return false;

      const idResposta = String(m.resposta.id || '');
      return idsValidos.includes(idResposta);
    });

    if (!respostas.length) return;

    const primeiraResposta = respostas[0];
    const idParaDestacar = primeiraResposta.id || primeiraResposta._supabaseId;

    destacarMensagemNex(idParaDestacar, 'amarelo');
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
      ) {
        return;
      }

      limparDestaqueMensagemNex();
    },
    true
  );

  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('chatInput');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          enviarMsgNex();
        }
      });
    }

    const btnConcluir = document.getElementById('btnConcluirEdicaoNex');
    if (btnConcluir) {
      btnConcluir.addEventListener('click', concluirEdicaoNex);
    }

    const inputEdicao = document.getElementById('editarMsgInputNex');
    if (inputEdicao) {
      inputEdicao.addEventListener('input', atualizarBotaoEdicaoNex);
    }

    const btnFecharEdicao = document.querySelector('.modal-edicao-fechar');
    if (btnFecharEdicao) {
      btnFecharEdicao.addEventListener('click', fecharModalEdicaoNex);
    }
  });

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

      return !!(ultima &&
        Date.now() - new Date(ultima).getTime() < LIMITE_ONLINE_MS);
    } catch (err) {
      console.warn('Erro ao buscar status:', err);
      return false;
    }
  };

  console.log('💬 05-nex-chat.js completo (com ajustes de prévia, status e reenvio)');

})();
