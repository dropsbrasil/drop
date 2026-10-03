/* ============================================
   05-NEX-CHAT.JS
   Chat do NEX: abrir, renderizar, enviar mensagens
   
   Depende de: 00-config.js, 02-ui.js, 03-utils.js, 04-conversas.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // ESTADO DO CHAT
  // ============================================

  let respostaSelecionadaNex = null;
  let mensagemSelecionadaNex = null;
  let mensagemParaApagarNex = null;
  let mensagemEmEdicaoNex = null;
  let textoOriginalEdicaoNex = '';
  let msgDestacadaNex = null;

// ⚠️ Cache de avatares por username
const cacheAvataresNex = {};
const avataresEmBuscaNex = new Set();

async function buscarAvatarNex(username) {
  if (!username) return null;
  if (cacheAvataresNex[username]) return cacheAvataresNex[username];
  if (avataresEmBuscaNex.has(username)) return null;

  avataresEmBuscaNex.add(username);

  try {
    // ⚠️ Se for o MEU username, busca direto do Supabase Auth
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

    // Para outros, usa a RPC pública
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
  // ============================================
  // ABRIR CHAT
  // ============================================

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

// ⚠️ Função que calcula presença real pelo ultima_atividade
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

// Atualiza na hora que abre
atualizarPresencaChatNex();

// ⚠️ Atualiza a cada 30s enquanto o chat estiver aberto
if (window.__presencaIntervalNex) {
  clearInterval(window.__presencaIntervalNex);
}
window.__presencaIntervalNex = setInterval(atualizarPresencaChatNex, 30000);

    if (chatName) {
  chatName.innerText = nome;
  chatName.style.cursor = 'pointer';

  // ⚠️ Remove listener antigo antes de adicionar (evita duplicar)
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
  // ⚠️ Busca a bio real no Supabase
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
      
      // ⚠️ Verifica se precisa rolar (depois do texto entrar no DOM)
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
// ⚠️ O status real é preenchido por atualizarPresencaChatNex()
if (chatStatus) {
  chatStatus.innerText = '';
  chatStatus.classList.remove('online', 'offline');
}

// Avatar: mostra inicial primeiro (feedback rápido)
if (chatAvatar) {
  chatAvatar.innerText = nome.charAt(0).toUpperCase();
  chatAvatar.style.backgroundImage = 'none';
  chatAvatar.style.cursor = 'pointer';
}

// ⚠️ Busca o avatar real no Supabase e substitui
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

// ⚠️ Avatar também abre o perfil
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
    
    // Carrega conversa + mensagens do Supabase
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

  // ============================================
  // VOLTAR DO CHAT
  // ============================================

  function voltarChatNex() {
  // ⚠️ Para o timer de presença
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

    document.body.classList.remove('chat-aberto');
    document.body.classList.remove('chat-open');

    // Sincroniza cards do Supabase ao voltar
    if (typeof window.sincronizarCardsNexSupabase === 'function') {
      setTimeout(() => {
        window.sincronizarCardsNexSupabase();
      }, 300);
    }
  }

  // ============================================
  // RENDERIZAR CHAT
  // ============================================

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

      const lista = respostasPorOriginalNex.get(originalId) || [];
      lista.push(msg);
      respostasPorOriginalNex.set(originalId, lista);
    });

    const qtdCitacoesPorOriginalNex = new Map();
    const ordemRespostaPorMsgIdNex = new Map();

    for (const [originalId, lista] of respostasPorOriginalNex.entries()) {
      qtdCitacoesPorOriginalNex.set(originalId, lista.length);

      lista.forEach((msg, index) => {
        ordemRespostaPorMsgIdNex.set(msg.id, index + 1);
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

// ⚠️ Determina o username real pra buscar o avatar
let usernameAvatarMsg = '';

if (lado === 'right') {
  usernameAvatarMsg = String(Drops.usernameAtual || '').trim();
} else {
  usernameAvatarMsg =
    (window.__convUsernamesNex && window.__convUsernamesNex[nome]) || nome;
}

const avatarUrlCache = cacheAvataresNex[usernameAvatarMsg] || null;
const msgIdUnico = msg.id || gerarIdMensagemNex();

      const dataExibida = msg.data || 'Hoje';
      const horaExibida = msg.hora || msg.time || '';
      const statusExibido =
        lado === 'right' ? statusIconeNex(msg.status || 'enviado') : '';

      const row = document.createElement('div');
      row.className = `msg-row ${lado}`;
      row.dataset.msgId = msg.id;

      const card = document.createElement('div');
      const classeSistema = msg.sistema ? ' msg-sistema' : '';
      card.className = `msg-card ${lado}${
        msg.deleted ? ' msg-card-apagada' : ''
      }${classeSistema}`;

      const qtdCitacoes = qtdCitacoesPorOriginalNex.get(msg.id) || 0;
      const ordemResposta = ordemRespostaPorMsgIdNex.get(msg.id) || 0;
      const totalRespostasDaOriginal = msg.resposta
        ? (respostasPorOriginalNex.get(msg.resposta.id) || []).length
        : 0;

      let anexosHTML = '';

      if (typeof window.montarAnexosHTMLNex === 'function') {
        anexosHTML = window.montarAnexosHTMLNex(msg, dataExibida, horaExibida);
      }

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
                  <div class="msg-status">${escapeHTML(statusExibido)}</div>`
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
            lado === 'right' && msg.resposta
              ? `
            <div style="display:flex;align-items:center;margin-top:8px;">
              <div
                class="reply-linked-top"
                onclick="irParaMensagemNex('${msg.resposta.id}')">
                <span class="reply-arrow">↖</span>
                <span>Resposta Vinculada</span>
                <span class="reply-count-pill">
                  ${ordemResposta}/${totalRespostasDaOriginal}
                </span>
              </div>

              ${
                ordemResposta < totalRespostasDaOriginal
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
              onclick="irParaRespostaFilhaNex('${msg.id}')">
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

// ⚠️ Busca os avatares reais de quem ainda não está no cache
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

  // ============================================
  // ENVIAR MENSAGEM
  // ============================================

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
      status: 'enviado'
    };

    // Resposta
    if (respostaSelecionadaNex) {
      // ⚠️ Usa o ID do Supabase se existir (não o local)
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

// --- Mídia única (câmera/galeria) ---
const midiaUnica =
  typeof window.getPreviewMidiaNex === 'function'
    ? window.getPreviewMidiaNex()
    : null;

if (midiaUnica && midiaUnica.url) {
  let urlFinal = null;

  if (typeof window.uploadMidiaNexSupabase === 'function') {
    window.mostrarToastNex?.('Enviando mídia...', 'info');
    const urlStorage = await window.uploadMidiaNexSupabase(midiaUnica.url);
    if (urlStorage) {
      urlFinal = urlStorage;
    }
  }

  // ⚠️ Só envia se conseguiu uma URL pública de verdade
  if (urlFinal && /^https?:\/\//i.test(urlFinal)) {
    mensagem.anexo = {
      type: midiaUnica.type === 'video' ? 'video' : 'imagem',
      url: urlFinal
    };
  } else {
    window.mostrarToastNex?.('Falha ao enviar mídia. Tente novamente.', 'erro');

    if (typeof window.limparTodosPreviewsNex === 'function') {
      window.limparTodosPreviewsNex();
    }
    return; // aborta o envio
  }
}

    // --- Múltiplas mídias (álbum/galeria) ---
const midias =
  typeof window.getPreviewMidiasNex === 'function'
    ? window.getPreviewMidiasNex()
    : null;

if (Array.isArray(midias) && midias.length) {
  const midiasEnviadas = [];

  if (typeof window.uploadMidiaNexSupabase === 'function') {
    window.mostrarToastNex?.('Enviando mídias...', 'info');

    for (const m of midias) {
      const urlStorage = await window.uploadMidiaNexSupabase(m.url);
      if (urlStorage && /^https?:\/\//i.test(urlStorage)) {
        midiasEnviadas.push({
          url: urlStorage,
          type: m.type === 'video' ? 'video' : 'imagem'
        });
      }
    }
  }

  // ⚠️ Se nenhuma subiu, aborta o envio
  if (!midiasEnviadas.length) {
    window.mostrarToastNex?.('Falha ao enviar mídias. Tente novamente.', 'erro');

    if (typeof window.limparTodosPreviewsNex === 'function') {
      window.limparTodosPreviewsNex();
    }
    return;
  }

  mensagem.midias = midiasEnviadas;
}

    // --- Documento (PDF) ---
const documento =
  typeof window.getDocumentoPreviewNex === 'function'
    ? window.getDocumentoPreviewNex()
    : null;

if (documento && documento.url && !mensagem.anexo) {
  let urlPdf = null;

  if (typeof window.uploadMidiaNexSupabase === 'function') {
    window.mostrarToastNex?.('Enviando PDF...', 'info');
    const urlStorage = await window.uploadMidiaNexSupabase(documento.url);
    if (urlStorage) {
      urlPdf = urlStorage;
    }
  }

  // ⚠️ Só envia se conseguiu uma URL pública de verdade
  if (urlPdf && /^https?:\/\//i.test(urlPdf)) {
    mensagem.anexo = {
      type: 'pdf',
      url: urlPdf,
      name: documento.name || 'Documento PDF',
      documento: {
        url: urlPdf,
        name: documento.name || 'Documento PDF',
        thumbnail: documento.thumbnail || '',
        size: documento.size || 0
      }
    };
  } else {
    window.mostrarToastNex?.('Falha ao enviar PDF. Tente novamente.', 'erro');

    if (typeof window.limparTodosPreviewsNex === 'function') {
      window.limparTodosPreviewsNex();
    }
    return;
  }
}

    // --- Localização ---
    const localizacao =
      typeof window.getLocalizacaoPreviaNex === 'function'
        ? window.getLocalizacaoPreviaNex()
        : null;

if (localizacao && localizacao.lat != null && !mensagem.anexo) {
  mensagem.anexo = {
    type: 'location',
    lat: Number(localizacao.lat),
    lng: Number(localizacao.lng),
    address: localizacao.address || 'Localização',
    localizacao: {
      lat: Number(localizacao.lat),
      lng: Number(localizacao.lng),
      address: localizacao.address || 'Localização'
    }
  };
}
    // --- Áudio ---
const audioUrl =
  typeof window.getAudioUrlNex === 'function'
    ? window.getAudioUrlNex()
    : '';

if (audioUrl) {
  let urlAudio = null;

  if (typeof window.uploadMidiaNexSupabase === 'function') {
    window.mostrarToastNex?.('Enviando áudio...', 'info');
    const urlStorage = await window.uploadMidiaNexSupabase(audioUrl);
    if (urlStorage) {
      urlAudio = urlStorage;
    }
  }

  if (urlAudio && /^https?:\/\//i.test(urlAudio)) {
    mensagem.audio = urlAudio;
  } else {
    window.mostrarToastNex?.('Falha ao enviar áudio. Tente novamente.', 'erro');

    if (typeof window.limparTodosPreviewsNex === 'function') {
      window.limparTodosPreviewsNex();
    }
    return;
  }
}

    // ⚠️ Envia pro Supabase primeiro
    let msgSupabase = null;

    if (
      typeof window.enviarMensagemSupabase === 'function' &&
      window.__convIdsNex &&
      window.__convIdsNex[conversaAtual]
    ) {
      const convId = window.__convIdsNex[conversaAtual];

      let tipo = 'texto';
let mediaUrl = null;
let mediaMeta = null;

if (mensagem.audio) {
  tipo = 'audio';
  mediaUrl = mensagem.audio;
} else if (mensagem.anexo) {
  // ⚠️ Detecta o tipo real do anexo
  if (mensagem.anexo.type === 'location') {
    tipo = 'location';
    mediaUrl = null;
    mediaMeta = {
      lat: mensagem.anexo.lat,
      lng: mensagem.anexo.lng,
      address: mensagem.anexo.address || 'Localização',
      localizacao: mensagem.anexo.localizacao || null
    };
  } else if (mensagem.anexo.type === 'pdf') {
    tipo = 'pdf';
    mediaUrl = mensagem.anexo.url || null;
    mediaMeta = {
      documento: mensagem.anexo.documento || null,
      name: mensagem.anexo.name || 'Documento PDF'
    };
  } else if (mensagem.anexo.type === 'album') {
    tipo = 'album';
    mediaUrl = (mensagem.anexo.midias && mensagem.anexo.midias[0]?.url) || null;
    mediaMeta = {
      midias: mensagem.anexo.midias || [],
      urls: mensagem.anexo.urls || []
    };
  } else {
    // imagem ou vídeo normal
    tipo = mensagem.anexo.type === 'video' ? 'video' : 'imagem';
    mediaUrl = mensagem.anexo.url || null;
  }
} else if (mensagem.midias && mensagem.midias.length) {
  tipo = 'album';
  mediaUrl = mensagem.midias[0].url || null;
  mediaMeta = { midias: mensagem.midias };
} else if (mensagem.text) {
  tipo = 'texto';
}

try {
  msgSupabase = await window.enviarMensagemSupabase({
    conversa_id: convId,
    tipo,
    texto: mensagem.text || null,
    media_url: mediaUrl,
    media_meta: mediaMeta,
    resposta_a_id: mensagem.resposta?.id || null
  });

        if (msgSupabase && msgSupabase.id) {
          mensagem._supabaseId = msgSupabase.id;
        }
      } catch (err) {
        console.warn('Erro ao enviar pro Supabase:', err);
      }
    }

    conversas[conversaAtual].push(mensagem);

    if (input) input.value = '';

    if (typeof window.limparTodosPreviewsNex === 'function') {
      window.limparTodosPreviewsNex();
    }

    if (respostaSelecionadaNex) {
      cancelarRespostaNex();
    }

    marcarConversaRespondidaNex(conversaAtual);
    renderChat(conversaAtual);
  }

  // ============================================
  // CANCELAR RESPOSTA
  // ============================================

  function cancelarRespostaNex() {
    respostaSelecionadaNex = null;

    const preview = document.getElementById('previewRespostaNex');
    if (!preview) return;

    preview.style.display = 'none';
    preview.innerHTML = '';
  }
  
// ============================================
// ABRIR MENU DE MENSAGEM
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
    <button type="button" onclick="acaoResponderNex()">💬 Responder</button>

    <button
      type="button"
      class="danger"
      onclick="window.acaoApagarPraMimNex()">
      🗑️ Apagar pra mim
    </button>

    <button
      type="button"
      class="cancelar"
      onclick="fecharMenuMsgNex()">
      Cancelar
    </button>
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

// ============================================
// FECHAR MENU
// ============================================

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

// ============================================
// RESPONDER MENSAGEM
// ============================================

function acaoResponderNex() {
  if (!mensagemSelecionadaNex) return;

  respostaSelecionadaNex = mensagemSelecionadaNex;

  mostrarPreviewRespostaNex();
  fecharMenuMsgNex();
}

// ============================================
// REEDITAR MENSAGEM
// ============================================

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

// ============================================
// APAGAR PRA MIM
// ============================================

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

  // ⚠️ Pega o ID do Supabase
  const idSupabase =
    typeof msg === 'object'
      ? (msg._supabaseId || msg.id)
      : msg;

  // ⚠️ Salva no Supabase (oculta)
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

// ============================================
// APAGAR PARA TODOS
// ============================================

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

  // ⚠️ Salva no Supabase (marca pra todos)
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

// ============================================
// MODAL DE EDIÇÃO
// ============================================

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

  // ⚠️ Salva no Supabase
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

// ============================================
// PREVIEW DE RESPOSTA
// ============================================

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
}

// ============================================
// DESTAQUE DE MENSAGEM
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

function irParaMensagemNex(msgId) {
  destacarMensagemNex(msgId, 'verde');
}

function irParaRespostaFilhaNex(msgIdOriginal) {
  const msgs = conversas[Drops.estado.conversaAtual] || [];

  const respostas = msgs.filter(
    (m) => m.resposta && m.resposta.id === msgIdOriginal
  );

  if (!respostas.length) return;

  destacarMensagemNex(respostas[0].id, 'amarelo');
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
  // EVENTOS GLOBAIS DE CLIQUE (FECHAR MENUS)
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

  // ============================================
  // LIMPAR DESTAQUE AO CLICAR FORA
  // ============================================

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

  // ============================================
  // EVENTOS DO CHAT (DOMContentLoaded)
  // ============================================

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

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  // Funções principais
  window.abrirMenuMsgNex = abrirMenuMsgNex;
  window.fecharMenuMsgNex = fecharMenuMsgNex;
  window.acaoResponderNex = acaoResponderNex;
  window.acaoReeditarNex = acaoReeditarNex;
  window.acaoApagarMsgNex = acaoApagarMsgNex;
  window.acaoApagarPraMimNex = acaoApagarPraMimNex;

  // Confirmar exclusões
  window.fecharConfirmDeleteNex = fecharConfirmDeleteNex;
  window.confirmarApagarMsgNex = confirmarApagarMsgNex;
  window.fecharConfirmDeleteMeNex = fecharConfirmDeleteMeNex;
  window.confirmarApagarPraMimNex = confirmarApagarPraMimNex;

  // Modal de edição
  window.abrirModalEdicaoNex = abrirModalEdicaoNex;
  window.fecharModalEdicaoNex = fecharModalEdicaoNex;
  window.atualizarBotaoEdicaoNex = atualizarBotaoEdicaoNex;
  window.concluirEdicaoNex = concluirEdicaoNex;

  // Destaque
  window.irParaMensagemNex = irParaMensagemNex;
  window.irParaRespostaFilhaNex = irParaRespostaFilhaNex;
  window.irParaProximaRespostaNex = irParaProximaRespostaNex;

  // Funções principais do chat
  window.abrirChatNex = abrirChatNex;
  window.voltarChatNex = voltarChatNex;
  window.renderChat = renderChat;
  window.enviarMsgNex = enviarMsgNex;
  window.cancelarRespostaNex = cancelarRespostaNex;

  // ============================================
  // DEBUG
  // ============================================

  console.log('💬 05-nex-chat.js completo');

})();