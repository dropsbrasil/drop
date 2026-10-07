/* ============================================
   04-CONVERSAS.JS
   Estado das conversas do NEX + gerenciamento de cards
   
   Depende de: 00-config.js, 02-ui.js, 03-utils.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // ESTADO DAS CONVERSAS
  // ============================================

  const conversas = {};
  window.conversas = conversas;

  const estadoConversasNex = {};
  window.estadoConversasNex = estadoConversasNex;

  let conversaAbertaNex = '';
  let cardAbertoNex = null;

  // ============================================
  // ESTADO DAS ABAS DO NEX
  // ============================================

  let origemAberturaNex = '';
  window.getConversaAbertaNex = () => conversaAbertaNex;
  window.setConversaAbertaNex = (v) => { conversaAbertaNex = v; };
  window.getCardAbertoNex = () => cardAbertoNex;
  window.setCardAbertoNex = (v) => { cardAbertoNex = v; };
  window.getOrigemAberturaNex = () => origemAberturaNex;
  window.setOrigemAberturaNex = (v) => { origemAberturaNex = v; };

  // ============================================
  // OBTER ESTADO DE UMA CONVERSA
  // ============================================

  function obterEstadoConversaNex(nome, connected = null) {
    const conectadoAtual =
      typeof connected === 'boolean'
        ? connected
        : window.estaConectadoNoMyDropsNex(nome);

    if (!estadoConversasNex[nome]) {
      estadoConversasNex[nome] = {
        unread: false,
        connected: conectadoAtual,
        replied: false,
        permanente: false,
        lastMessageAt: Date.now(),
        openedAt: null,
        expiresAt: null,
        origemAbertura: ''
      };
    } else {
      estadoConversasNex[nome].connected = conectadoAtual;
    }

    return estadoConversasNex[nome];
  }

  // ============================================
  // SINCRONIZAR CONVERSAS COM CONECTADOS
  // ============================================

  function sincronizarConversasComConectadosMyDropsNex() {
    Object.entries(estadoConversasNex).forEach(([nome, estado]) => {
      const conectado = window.estaConectadoNoMyDropsNex(nome);
      estado.connected = conectado;

      const card = obterCardConversaNex(nome);
      if (!card) return;

      card.dataset.connected = conectado ? 'yes' : 'no';

      if (estado.unread || card.classList.contains('unread-chat')) {
        card.classList.add('unread-chat');
        moverCardConversaNex(nome, 'nex-naolidas', true);
        return;
      }

      card.classList.remove('unread-chat');

      moverCardConversaNex(
        nome,
        conectado ? 'nex-conectados' : 'nex-geral',
        true
      );
    });

    atualizarStatusTodosCardsNex();
  }

  // ⚠️ Atualiza o status de todos os cards visíveis
  async function atualizarStatusTodosCardsNex() {
    if (typeof window.buscarStatusNex !== 'function') return;

    const cards = document.querySelectorAll('.nex-chat');

    for (const card of cards) {
      const dotEl = card.querySelector('.nex-status-dot');
      if (!dotEl) continue;

      const username = dotEl.dataset.statusUser;
      if (!username) continue;

      try {
        const online = await window.buscarStatusNex(username);
        dotEl.classList.toggle('online', !!online);
        dotEl.classList.toggle('offline', !online);
      } catch (err) {
        // silencioso
      }
    }
  }

  // ============================================
  // OBTER CARD DE UMA CONVERSA
  // ============================================

  function obterCardConversaNex(nome) {
    return (
      Array.from(document.querySelectorAll('.nex-chat')).find(
        (card) => (card.dataset.chat || '').trim() === nome
      ) || null
    );
  }

  // ============================================
  // MOVER CARD ENTRE ABAS
  // ============================================

  function moverCardConversaNex(nome, destinoId, paraTopo = true) {
    const card = obterCardConversaNex(nome);
    const destino = document.getElementById(destinoId);

    if (!card || !destino) return;

    if (paraTopo) {
      destino.prepend(card);
    } else {
      destino.appendChild(card);
    }
  }

  // ============================================
  // MARCAR COMO NÃO LIDA
  // ============================================

  function marcarConversaComoNaoLidaNex(nome, connected = null) {
    const estado = obterEstadoConversaNex(nome, connected);

    estado.unread = true;
    estado.lastMessageAt = Date.now();
    estado.replied = false;
    estado.expiresAt = null;
    estado.origemAbertura = '';

    const card = obterCardConversaNex(nome);

    if (card) {
      card.classList.add('unread-chat');
      moverCardConversaNex(nome, 'nex-naolidas', true);
    }

    if (typeof atualizarAbaNaoLidasNex === 'function') {
      atualizarAbaNaoLidasNex();
    }
  }

  // ============================================
  // REGISTRAR MENSAGEM RECEBIDA
  // ============================================

  function registrarMensagemRecebidaNex(nome, mensagem, connected = null) {
    if (!conversas[nome]) {
      conversas[nome] = [];
    }

    conversas[nome].push(mensagem);

    if (!obterCardConversaNex(nome)) {
      criarCardConversaNex(nome, connected, mensagem, 'recebida');
    }

    marcarConversaComoNaoLidaNex(nome, connected);
  }

  // ============================================
  // LIMPAR CARDS DUPLICADOS
  // ============================================

  function limparCardsDuplicadosNex() {
    const cards = Array.from(document.querySelectorAll('.nex-chat'));
    const porUsername = new Map();

    cards.forEach((card) => {
      const chave = (card.dataset.chat || '').trim();
      if (!chave) {
        card.remove();
        return;
      }

      let usernameReal =
        (window.__convUsernamesNex && window.__convUsernamesNex[chave]) || '';

      if (!usernameReal) {
        usernameReal = chave.toLowerCase().replace(/[^a-z0-9]/g, '');
      }

      if (!usernameReal) {
        card.remove();
        return;
      }

      if (porUsername.has(usernameReal)) {
        const cardAntigo = porUsername.get(usernameReal);
        const chaveAntiga = (cardAntigo.dataset.chat || '').trim();
        const chaveAtual = chave;

        const antigoEhUsername = !/\s/.test(chaveAntiga);
        const atualEhUsername = !/\s/.test(chaveAtual);

        if (atualEhUsername && !antigoEhUsername) {
          cardAntigo.remove();
          porUsername.set(usernameReal, card);
        } else if (!atualEhUsername && antigoEhUsername) {
          card.remove();
        } else {
          card.remove();
        }
      } else {
        porUsername.set(usernameReal, card);
      }
    });
  }

  // ============================================
  // EXPÕE GLOBALMENTE (parte 1)
  // ============================================

  window.obterEstadoConversaNex = obterEstadoConversaNex;
  window.sincronizarConversasComConectadosMyDropsNex =
    sincronizarConversasComConectadosMyDropsNex;
  window.obterCardConversaNex = obterCardConversaNex;
  window.moverCardConversaNex = moverCardConversaNex;
  window.marcarConversaComoNaoLidaNex = marcarConversaComoNaoLidaNex;
  window.limparCardsDuplicadosNex = limparCardsDuplicadosNex;
  // ============================================
// CRIAR CARD DE CONVERSA NO NEX
// ============================================

async function criarCardConversaNex(
  nome,
  connected = null,
  mensagem = null,
  tipoMensagem = 'recebida'
) {
  // Não cria card de perfil bloqueado
  if (
    window.perfisBloqueadosNex &&
    window.perfisBloqueadosNex.has(String(nome || '').toLowerCase())
  ) {
    return;
  }

  const conectado =
    typeof connected === 'boolean'
      ? connected
      : window.estaConectadoNoMyDropsNex(nome);

  const destino =
    tipoMensagem === 'recebida'
      ? 'nex-naolidas'
      : (conectado ? 'nex-conectados' : 'nex-geral');

  const lista = document.getElementById(destino);
  if (!lista) return;

  // ============================================
  // ⚠️ RESOLVE O USERNAME REAL (@) ANTES DE CRIAR
  // ============================================

  if (!window.__convUsernamesNex) {
    window.__convUsernamesNex = {};
  }

  let chaveCard = '';

  // 1. Tenta pegar do cache reverso
  if (window.__convUsernamesNex[nome]) {
    chaveCard = String(window.__convUsernamesNex[nome])
      .replace(/^@/, '')
      .trim()
      .toLowerCase();
  }

  // 2. Tenta pegar do próprio nome (se já for um username válido)
  if (!chaveCard && /^[a-z0-9]+$/.test(String(nome || '').trim())) {
    chaveCard = String(nome).trim().toLowerCase();
  }

  // 3. Tenta resolver no Supabase (só se o nome tem espaço/maiúscula)
  if (!chaveCard && /\s/.test(String(nome || '').trim()) && window.supabaseClient) {
    try {
      const { data: perfil } = await window.supabaseClient
        .from('profiles')
        .select('username')
        .ilike('nome', String(nome).trim())
        .maybeSingle();

      if (perfil?.username) {
        chaveCard = String(perfil.username)
          .replace(/^@/, '')
          .trim()
          .toLowerCase();

        window.__convUsernamesNex[nome] = chaveCard;
      }
    } catch (err) {
      console.warn('Erro ao resolver username no card:', err);
    }
  }

  // 4. Fallback final: limpa o nome (sem espaços/acentos)
  if (!chaveCard) {
    chaveCard = String(nome || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  if (!chaveCard) return;

  // Salva no cache (as duas direções)
  window.__convUsernamesNex[nome] = chaveCard;
  window.__convUsernamesNex[chaveCard] = chaveCard;

  // ============================================
  // VERIFICA SE JÁ EXISTE CARD COM ESSA CHAVE
  // ============================================

  const cardExistente = Array.from(
    document.querySelectorAll('.nex-chat')
  ).find((c) => c.dataset.chat === chaveCard);

  if (cardExistente) {
    // Atualiza o preview do card existente
    const p = cardExistente.querySelector('.nex-info p');
    if (p && mensagem) {
      const preview =
        mensagem.text ||
        mensagem.anexo?.perfilNome ||
        mensagem.anexo?.url ||
        'Nova mensagem';
      p.textContent = preview;
    }

    // Atualiza o nome exibido (caso tenha mudado)
    const h3 = cardExistente.querySelector('.nex-info h3');
    if (h3) h3.textContent = nome;
    cardExistente.dataset.nomeExibido = nome;

    return;
  }

  // ============================================
  // MONTA O CARD
  // ============================================

  const textoPreview =
    mensagem?.text ||
    mensagem?.anexo?.perfilNome ||
    mensagem?.anexo?.url ||
    'Novo comentário';

  const hora =
    mensagem?.hora ||
    new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

  const inicial = (nome || '?').charAt(0).toUpperCase();

  const card = document.createElement('div');
  card.className =
    'nex-chat' + (tipoMensagem === 'recebida' ? ' unread-chat' : '');

  // ⚠️ A CHAVE É O @USERNAME REAL
  card.dataset.chat = chaveCard;
  card.dataset.nomeExibido = nome;
  card.dataset.username = chaveCard;
  card.dataset.connected = conectado ? 'yes' : 'no';

  card.innerHTML = `
    <div class="nex-left">
      <div class="nex-avatar ${conectado ? 'ring-blue' : ''}"
           data-avatar-user="${escapeHTML(chaveCard)}"
           data-avatar-fallback="${escapeHTML(inicial)}">
        ${inicial}
      </div>

      <div class="nex-info">
        <h3>${escapeHTML(nome)}</h3>
        <p>${escapeHTML(textoPreview)}</p>
      </div>
    </div>

    <div class="nex-right">
      <div class="nex-status-dot offline"
           data-status-user="${escapeHTML(chaveCard)}"></div>
      <small>${escapeHTML(hora)}</small>
    </div>
  `;

  // Busca avatar real
  if (typeof window.buscarAvatarNex === 'function') {
    window.buscarAvatarNex(chaveCard).then((url) => {
      if (!url) return;
      const avatarEl = card.querySelector('.nex-avatar');
      if (avatarEl) {
        avatarEl.innerHTML = `<img src="${escapeHTML(url)}" alt="">`;
      }
    });
  }

  // Busca status real
  if (typeof window.buscarStatusNex === 'function') {
    window.buscarStatusNex(chaveCard).then((online) => {
      const dotEl = card.querySelector('.nex-status-dot');
      if (!dotEl) return;
      dotEl.classList.toggle('online', !!online);
      dotEl.classList.toggle('offline', !online);
    });
  }

  // Clique abre o chat
  card.addEventListener('click', function () {
    if (typeof window.abrirChatNex === 'function') {
      window.abrirChatNex(card);
    } else {
      console.error('❌ abrirChatNex ainda não foi carregado!');
    }
  });

  lista.prepend(card);

  // Atualiza visibilidade da aba "Não lidas"
  if (typeof atualizarAbaNaoLidasNex === 'function') {
    atualizarAbaNaoLidasNex();
  }

  // ⚠️ Garante que não exista duplicado
  if (typeof limparCardsDuplicadosNex === 'function') {
    setTimeout(limparCardsDuplicadosNex, 200);
  }
}

// ============================================
// ATUALIZAR VISIBILIDADE DA ABA "NÃO LIDAS"
// ============================================

function atualizarAbaNaoLidasNex() {
  const tabsEl = document.querySelector('.nex-tabs');
  const listaNaoLidas = document.getElementById('nex-naolidas');

  if (!tabsEl || !listaNaoLidas) return;

  const temNaoLidas =
    listaNaoLidas.querySelectorAll('.nex-chat').length > 0;

  if (temNaoLidas) {
    tabsEl.classList.remove('sem-naolidas');
  } else {
    tabsEl.classList.add('sem-naolidas');

    if (Drops.estado.abaNex === 'naolidas') {
      if (typeof window.mostrarNexTab === 'function') {
        window.mostrarNexTab('geral');
      }
    }
  }

  if (typeof window.atualizarNotificacaoTabbarNex === 'function') {
    window.atualizarNotificacaoTabbarNex();
  }
}
    // ============================================
  // MARCAR COMO LIDA
  // ============================================

  function marcarConversaComoLidaNex(nome, el) {
    const conectado =
      el?.dataset?.connected === 'yes' ||
      window.estaConectadoNoMyDropsNex(nome);

    const estado = obterEstadoConversaNex(nome, conectado);

    estado.connected = conectado;
    estado.origemAbertura = el?.closest('.nex-page')?.id || '';
    estado.unread = false;

    // Persiste no banco
    const convId = window.__convIdsNex && window.__convIdsNex[nome];

    if (convId && typeof window.marcarConversaLidaSupabase === 'function') {
      window.marcarConversaLidaSupabase(convId).catch((err) =>
        console.warn('Falha ao marcar lida no banco:', err)
      );
    }

    if (!estado.replied && !estado.permanente) {
      if (!estado.openedAt) {
        estado.openedAt = Date.now();
      }

      if (!estado.expiresAt) {
        estado.expiresAt = estado.openedAt + Drops.LIMITES.AUTO_LIMPEZA_MS;
      }
    }

    if (el) {
      el.classList.remove('unread-chat');
      el.dataset.connected = conectado ? 'yes' : 'no';
    }

    moverCardConversaNex(
      nome,
      conectado ? 'nex-conectados' : 'nex-geral',
      true
    );

    if (typeof atualizarAbaNaoLidasNex === 'function') {
      atualizarAbaNaoLidasNex();
    }
  }

  // ============================================
  // MARCAR COMO RESPONDIDA
  // ============================================

  function marcarConversaRespondidaNex(nome) {
    const estado = obterEstadoConversaNex(nome);
    estado.replied = true;
    estado.permanente = true;
    estado.expiresAt = null;
  }

  // ============================================
  // REMOVER CONVERSA EXPIRADA
  // ============================================

  function removerConversaExpiradaNex(nome) {
    const card = obterCardConversaNex(nome);

    delete conversas[nome];
    delete estadoConversasNex[nome];

    if (card) card.remove();

    if (conversaAbertaNex === nome || Drops.estado.conversaAtual === nome) {
      conversaAbertaNex = '';
      cardAbertoNex = null;

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

      document.body.classList.remove('chat-aberto');

      if (typeof window.mostrarNexTab === 'function') {
        window.mostrarNexTab('naolidas');
      }
    }
  }

  // ============================================
  // AUTO-LIMPEZA (30 dias)
  // ============================================

  function executarAutoLimpezaNex() {
    const agora = Date.now();

    Object.entries(estadoConversasNex).forEach(([nome, estado]) => {
      if (estado.permanente || estado.replied) return;
      if (!estado.expiresAt) return;
      if (agora < estado.expiresAt) return;

      removerConversaExpiradaNex(nome);
    });
  }

  // ============================================
  // EXPÕE GLOBALMENTE (parte 2)
  // ============================================

  window.criarCardConversaNex = criarCardConversaNex;
  window.atualizarAbaNaoLidasNex = atualizarAbaNaoLidasNex;
  window.marcarConversaComoLidaNex = marcarConversaComoLidaNex;
  window.marcarConversaRespondidaNex = marcarConversaRespondidaNex;
  window.removerConversaExpiradaNex = removerConversaExpiradaNex;
  window.executarAutoLimpezaNex = executarAutoLimpezaNex;
  window.atualizarStatusTodosCardsNex = atualizarStatusTodosCardsNex;
  window.limparCardsDuplicadosNex = limparCardsDuplicadosNex;

  // ============================================
  // DEBUG
  // ============================================

  console.log('💬 04-conversas.js carregado');

})();