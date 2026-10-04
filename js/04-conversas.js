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
  // Nota: este objeto será substituído por dados do backend
  // futuramente. Por enquanto, mantemos os dados iniciais fixos.

  const conversas = {
    Julia: [
      {
        side: 'left',
        text: 'oi sumido 👀',
        data: '12/05/2026',
        hora: '08:12'
      }
    ],

    Lucas: [
      {
        side: 'left',
        text: 'vi seu drop',
        data: '12/05/2026',
        hora: '09:04'
      }
    ],

    Ana: [
      {
        side: 'left',
        text: 'kk gostei',
        data: 'Ontem',
        hora: '10:20'
      }
    ],

    Rafael: [
      {
        side: 'left',
        text: 'bora sair hoje?',
        data: '12/05/2026',
        hora: '07:55'
      }
    ]
  };

  // Expõe globalmente
  window.conversas = conversas;

  // ============================================
  // ESTADO DAS CONVERSAS (unread, replied, etc)
  // ============================================

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

    // Mensagem ainda não lida
    if (estado.unread || card.classList.contains('unread-chat')) {
      card.classList.add('unread-chat');
      moverCardConversaNex(nome, 'nex-naolidas', true);
      return;
    }

    // Mensagem já lida
    card.classList.remove('unread-chat');

    moverCardConversaNex(
      nome,
      conectado ? 'nex-conectados' : 'nex-geral',
      true
    );
  });

  // ⚠️ Atualiza status online/offline de todos os cards
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

  // ⚠️ Garante que a aba apareça
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
  // EXPÕE GLOBALMENTE (parte 1)
  // ============================================

  window.obterEstadoConversaNex = obterEstadoConversaNex;
  window.sincronizarConversasComConectadosMyDropsNex =
    sincronizarConversasComConectadosMyDropsNex;
  window.obterCardConversaNex = obterCardConversaNex;
  window.moverCardConversaNex = moverCardConversaNex;
  window.marcarConversaComoNaoLidaNex = marcarConversaComoNaoLidaNex;

    // ============================================
  // CRIAR CARD DE CONVERSA NO NEX
  // ============================================

  function criarCardConversaNex(
    nome,
    connected = null,
    mensagem = null,
    tipoMensagem = 'recebida'
  ) {
    // Não cria card de perfil bloqueado
    if (window.perfisBloqueadosNex && window.perfisBloqueadosNex.has(String(nome || '').toLowerCase())) return;

    const conectado =
      typeof connected === 'boolean'
        ? connected
        : window.estaConectadoNoMyDropsNex(nome);

    const destino =
      tipoMensagem === 'recebida'
        ? 'nex-naolidas'
        : (conectado ? 'nex-conectados' : 'nex-geral');

    const lista = document.getElementById(destino);
    if (!lista || obterCardConversaNex(nome)) return;

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
    card.dataset.chat = nome;
    card.dataset.connected = conectado ? 'yes' : 'no';

    // ⚠️ Pega o username real (do mapa) ou o nome
const usernameReal =
  (window.__convUsernamesNex && window.__convUsernamesNex[nome]) ||
  nome.toLowerCase().replace(/^@/, '').trim();

card.innerHTML = `
  <div class="nex-left">
    <div class="nex-avatar ${conectado ? 'ring-blue' : ''}"
         data-avatar-user="${escapeHTML(usernameReal)}"
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
         data-status-user="${escapeHTML(usernameReal)}"></div>
    <small>${escapeHTML(hora)}</small>
  </div>
`;

// ⚠️ Busca avatar real (se a função estiver disponível)
if (typeof window.buscarAvatarNex === 'function') {
  window.buscarAvatarNex(usernameReal).then((url) => {
    if (!url) return;
    const avatarEl = card.querySelector('.nex-avatar');
    if (avatarEl) {
      avatarEl.innerHTML = `<img src="${escapeHTML(url)}" alt="">`;
    }
  });
}

// ⚠️ Busca status real
if (typeof window.buscarStatusNex === 'function') {
  window.buscarStatusNex(usernameReal).then((online) => {
    const dotEl = card.querySelector('.nex-status-dot');
    if (!dotEl) return;
    dotEl.classList.toggle('online', !!online);
    dotEl.classList.toggle('offline', !online);
  });
}

    card.addEventListener('click', function () {
  if (typeof window.abrirChatNex === 'function') {
    window.abrirChatNex(card);
  } else {
    console.error('❌ abrirChatNex ainda não foi carregado!');
  }
});

    lista.prepend(card);

  // ⚠️ Atualiza visibilidade da aba "Não lidas"
  if (typeof atualizarAbaNaoLidasNex === 'function') {
    atualizarAbaNaoLidasNex();
  }
}

// ============================================
// ATUALIZAR VISIBILIDADE DA ABA "NÃO LIDAS"
// ============================================

function atualizarAbaNaoLidasNex() {
  const tabsEl = document.querySelector('.nex-tabs');
  const listaNaoLidas = document.getElementById('nex-naolidas');

  if (!tabsEl || !listaNaoLidas) return;

  // ⚠️ Tem alguma conversa na aba "Não lidas"?
  const temNaoLidas = listaNaoLidas.querySelectorAll('.nex-chat').length > 0;

  if (temNaoLidas) {
    tabsEl.classList.remove('sem-naolidas');
  } else {
    tabsEl.classList.add('sem-naolidas');

    // ⚠️ Se a aba ativa era "Não lidas", muda pra "Geral"
    if (Drops.estado.abaNex === 'naolidas') {
      if (typeof window.mostrarNexTab === 'function') {
        window.mostrarNexTab('geral');
      }
    }
  }

  // ⚠️ Atualiza a bolinha na tabbar
  if (typeof window.atualizarNotificacaoTabbarNex === 'function') {
    window.atualizarNotificacaoTabbarNex();
  }
}

  // ============================================
  // MARCAR COMO LIDA
  // ============================================

  function marcarConversaComoLidaNex(nome, el) {
    const conectado =
      el?.dataset?.connected === 'yes' || window.estaConectadoNoMyDropsNex(nome);

    const estado = obterEstadoConversaNex(nome, conectado);

    estado.connected = conectado;
    estado.origemAbertura = el?.closest('.nex-page')?.id || '';
    estado.unread = false;

    if (!estado.replied && !estado.permanente) {
      if (!estado.openedAt) {
        estado.openedAt = Date.now();
      }

      if (!estado.expiresAt) {
        estado.expiresAt =
          estado.openedAt + Drops.LIMITES.AUTO_LIMPEZA_MS;
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

  // ⚠️ Verifica se a aba "Não lidas" ainda tem itens
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

  // ⚠️ CORREÇÃO: restaura a tabbar via classe
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
  
  // ============================================
  // DEBUG
  // ============================================

  console.log('💬 04-conversas.js carregado');

})();