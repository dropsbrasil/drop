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
  if (!window.supabaseClient) return;

  const cards = document.querySelectorAll('.nex-chat');
  if (!cards.length) return;

  const usernames = new Set();
  cards.forEach(card => {
    const dotEl = card.querySelector('.nex-status-dot');
    if (dotEl && dotEl.dataset.statusUser) {
      usernames.add(dotEl.dataset.statusUser);
    }
  });

  const listaUsernames = Array.from(usernames);
  if (!listaUsernames.length) return;

  try {
    // ⚠️ OTIMIZAÇÃO N+1: 1 query única para todos os usuários
    const { data, error } = await window.supabaseClient
      .from('profiles')
      .select('username, ultima_atividade')
      .in('username', listaUsernames);

    if (error) return;

    const agora = Date.now();
    const LIMITE_ONLINE_MS = 30 * 1000;
    
    const mapaOnline = {};
    (data || []).forEach(p => {
      const ultima = p.ultima_atividade;
      mapaOnline[p.username] = ultima && (agora - new Date(ultima).getTime() < LIMITE_ONLINE_MS);
    });

    cards.forEach(card => {
      const dotEl = card.querySelector('.nex-status-dot');
      if (!dotEl) return;
      const u = dotEl.dataset.statusUser;
      if (!u) return;

      const online = mapaOnline[u];
      dotEl.classList.toggle('online', !!online);
      dotEl.classList.toggle('offline', !online);
    });
  } catch (err) {
    console.warn('Erro ao buscar status em lote:', err);
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

    // ⚠️ Resolve o username real pra buscar/criar o card corretamente
const usernameReal =
  (window.__convUsernamesNex && window.__convUsernamesNex[nome]) ||
  String(nome || '').toLowerCase().replace(/^@/, '').trim();

let card = obterCardConversaNex(usernameReal);
if (!card) card = obterCardConversaNex(nome);

if (card) {
  card.classList.add('unread-chat');
  moverCardConversaNex(
    (card.dataset.chat || '').trim(),
    'nex-naolidas',
    true
  );
} else {
  // ⚠️ Card não existe → cria
  const ultimaMsg = (window.conversas && window.conversas[nome])
    ? window.conversas[nome][window.conversas[nome].length - 1]
    : null;

  if (typeof window.criarCardConversaNex === 'function') {
    window.criarCardConversaNex(
      nome,
      connected,
      ultimaMsg || { text: 'Nova mensagem' },
      'recebida'
    );
  }
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

  // ⚠️ Atualiza timestamp + hora
  if (mensagem) {
    const tsNovo =
      mensagem.timestamp ||
      mensagem.criadoEm ||
      (mensagem.criado_em ? new Date(mensagem.criado_em).getTime() : null);

    if (tsNovo) {
      cardExistente.dataset.timestamp = String(tsNovo);

      const smallEl = cardExistente.querySelector('.nex-right small');
      if (smallEl && typeof formatarHoraCardNex === 'function') {
        smallEl.textContent = formatarHoraCardNex(tsNovo);
      }
    }
  }

  // ⚠️ Reordena (pra subir pro topo se for a mais recente)
  setTimeout(() => {
    if (typeof reordenarCardsNex === 'function') {
      reordenarCardsNex();
    }
  }, 100);

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

  // ⚠️ Pega timestamp REAL da mensagem (não a hora atual)
const timestampMensagem =
  mensagem?.timestamp ||
  mensagem?.criadoEm ||
  (mensagem?.criado_em ? new Date(mensagem.criado_em).getTime() : null) ||
  Date.now();

const hora = formatarHoraCardNex(timestampMensagem);

  const inicial = (nome || '?').charAt(0).toUpperCase();

  const card = document.createElement('div');
  card.className =
    'nex-chat' + (tipoMensagem === 'recebida' ? ' unread-chat' : '');

// ⚠️ A CHAVE É O @USERNAME REAL
card.dataset.chat = chaveCard;
card.dataset.nomeExibido = nome;
card.dataset.username = chaveCard;
card.dataset.connected = conectado ? 'yes' : 'no';

// ⚠️ Timestamp real da mensagem (pra ordenar depois)
card.dataset.timestamp = String(timestampMensagem);
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

  // ⚠️ Reordena depois de adicionar (mais recente no topo)
  setTimeout(() => {
    if (typeof reordenarCardsNex === 'function') {
      reordenarCardsNex();
    }
  }, 250);
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
// FORMATAR HORA ESTILO WHATSAPP
// ============================================

function formatarHoraCardNex(timestamp) {
  if (!timestamp) return '';

  const agora = new Date();
  const data = new Date(timestamp);

  if (isNaN(data.getTime())) return '';

  // Diferença em dias
  const umDia = 24 * 60 * 60 * 1000;
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const diaMsg = new Date(data.getFullYear(), data.getMonth(), data.getDate());

  const diffDias = Math.floor((hoje - diaMsg) / umDia);

  // Hoje → HH:MM
  if (diffDias === 0) {
    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Ontem → "ontem"
  if (diffDias === 1) {
    return 'ontem';
  }

  // Últimos 7 dias → dia da semana (seg, ter, ...)
  if (diffDias < 7) {
    const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    return dias[data.getDay()];
  }

  // Mais antigo → DD/MM
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
}

window.formatarHoraCardNex = formatarHoraCardNex;

// ============================================
// REORDENAR CARDS POR ÚLTIMA MENSAGEM
// ============================================

function reordenarCardsNex() {
  // Pega todas as listas (não lidas, geral, conectados)
  const listas = [
    document.getElementById('nex-naolidas'),
    document.getElementById('nex-geral'),
    document.getElementById('nex-conectados')
  ].filter(Boolean);

  listas.forEach((lista) => {
    const cards = Array.from(lista.querySelectorAll('.nex-chat'));

    // Ordena: mais recente no topo
    cards.sort((a, b) => {
      const tsA = Number(a.dataset.timestamp || 0);
      const tsB = Number(b.dataset.timestamp || 0);
      return tsB - tsA;
    });

    // Reinsere na ordem
    cards.forEach((card) => lista.appendChild(card));
  });
}

window.reordenarCardsNex = reordenarCardsNex;

  
window.reordenarCardsNex = reordenarCardsNex;

// ⚠️ ESCUTA O AVISO DO REALTIME DE PRESENÇA NOS CARDS (0 requisições extras)
document.addEventListener('drops_presenca_atualizada', (e) => {
  const { username, online } = e.detail || {};
  if (!username) return;

  // Procura a bolinha em todos os cards e atualiza se for da pessoa certa
  document.querySelectorAll('.nex-chat').forEach((card) => {
    const dotEl = card.querySelector('.nex-status-dot');
    if (dotEl && dotEl.dataset.statusUser === username) {
      dotEl.classList.toggle('online', !!online);
      dotEl.classList.toggle('offline', !online);
    }
  });
});
  
  // ============================================
  // DEBUG
  // ============================================

  console.log('💬 04-conversas.js carregado');
  })();
