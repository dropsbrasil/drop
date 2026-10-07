/* ============================================
   25-NEX-SUPABASE.JS
   NEX — conversas e mensagens no Supabase

   Depende de: 00-config.js, 20-supabase.js
============================================ */

(function () {
  'use strict';

  async function aguardarSupabase() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.supabaseClient && window.Drops) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }

  // ============================================
// MARCAR CONVERSA COMO LIDA (no banco)
// ============================================
async function marcarConversaLidaSupabase(conversaId) {
  if (!window.supabaseClient || !conversaId) return false;

  try {
    const { error } = await window.supabaseClient.rpc('marcar_conversa_lida', {
      conversa_id_param: conversaId
    });

    if (error) {
      console.warn('Erro ao marcar conversa lida:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Erro ao marcar conversa lida:', err);
    return false;
  }
}

// ============================================
// OBTER OU CRIAR CONVERSA
// ============================================
async function obterOuCriarConversaSupabase(usernameOutro) {
    if (!window.supabaseClient || !usernameOutro) return null;

    try {
      const { data, error } = await window.supabaseClient
        .rpc('obter_ou_criar_conversa', {
          username_outro: String(usernameOutro).replace(/^@/, '').trim()
        });

      if (error) {
        console.warn('Erro ao obter/criar conversa:', error);
        return null;
      }

      return data || null;
    } catch (err) {
      console.warn('Erro ao obter/criar conversa:', err);
      return null;
    }
  }

  // ============================================
  // LISTAR MINHAS CONVERSAS
  // ============================================
  async function listarMinhasConversasSupabase() {
    if (!window.supabaseClient) return [];

    try {
      const { data, error } = await window.supabaseClient
        .rpc('listar_minhas_conversas');

      if (error) {
        console.warn('Erro ao listar conversas:', error);
        return [];
      }

      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('Erro ao listar conversas:', err);
      return [];
    }
  }

  // ============================================
  // BUSCAR MENSAGENS DE UMA CONVERSA
  // ============================================
  async function buscarMensagensSupabase(conversaId) {
    if (!window.supabaseClient || !conversaId) return [];

    try {
      const { data: mensagens, error } = await window.supabaseClient
        .from('mensagens')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('criado_em', { ascending: true });

      if (error) {
        console.warn('Erro ao buscar mensagens:', error);
        return [];
      }

      if (!Array.isArray(mensagens) || !mensagens.length) return [];

      const { data: ocultas } = await window.supabaseClient
        .from('mensagens_ocultas')
        .select('mensagem_id');

      const idsOcultas = new Set(
        (ocultas || []).map((o) => o.mensagem_id)
      );

      return mensagens.filter((m) => !idsOcultas.has(m.id));
    } catch (err) {
      console.warn('Erro ao buscar mensagens:', err);
      return [];
    }
  }

  // ============================================
  // ENVIAR MENSAGEM
  // ============================================
  async function enviarMensagemSupabase(payload) {
    if (!window.supabaseClient || !payload) return null;
    if (!payload.conversa_id) return null;

    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return null;

      const { data, error } = await window.supabaseClient
        .from('mensagens')
        .insert({
          conversa_id: payload.conversa_id,
          autor_id: user.id,
          tipo: payload.tipo || 'texto',
          texto: payload.texto || null,
          media_url: payload.media_url || null,
          media_meta: payload.media_meta || null,
          resposta_a_id: payload.resposta_a_id || null
        })
        .select()
        .single();

      if (error) {
        console.warn('Erro ao enviar mensagem:', error);
        return null;
      }

      await window.supabaseClient
        .from('conversas')
        .update({ atualizado_em: new Date().toISOString() })
        .eq('id', payload.conversa_id);

      return data;
    } catch (err) {
      console.warn('Erro ao enviar mensagem:', err);
      return null;
    }
  }

  // ============================================
  // EDITAR MENSAGEM
  // ============================================
  async function editarMensagemSupabase(mensagemId, novoTexto) {
    if (!window.supabaseClient || !mensagemId) return false;

    try {
      const { error } = await window.supabaseClient
        .from('mensagens')
        .update({
          texto: String(novoTexto || ''),
          editada: true
        })
        .eq('id', mensagemId);

      if (error) {
        console.warn('Erro ao editar mensagem:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('Erro ao editar mensagem:', err);
      return false;
    }
  }

  // ============================================
  // APAGAR PRA MIM (só oculta pra mim)
  // ============================================
  async function apagarPraMimSupabase(mensagemId) {
    if (!window.supabaseClient || !mensagemId) return false;

    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return false;

      const { error } = await window.supabaseClient
        .from('mensagens_ocultas')
        .insert({
          mensagem_id: mensagemId,
          usuario_id: user.id
        });

      if (error && error.code !== '23505') {
        console.warn('Erro ao ocultar mensagem:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('Erro ao ocultar mensagem:', err);
      return false;
    }
  }

  // ============================================
  // APAGAR PRA TODOS
  // ============================================
  async function apagarPraTodosSupabase(mensagemId) {
    if (!window.supabaseClient || !mensagemId) return false;

    try {
      const { error } = await window.supabaseClient
        .from('mensagens')
        .update({
          apagada_para_todos: true,
          texto: null,
          media_url: null,
          media_meta: null
        })
        .eq('id', mensagemId);

      if (error) {
        console.warn('Erro ao apagar mensagem:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('Erro ao apagar mensagem:', err);
      return false;
    }
  }
  // ============================================
// CARREGAR CONVERSA COMPLETA (para o chat)
// ============================================
async function carregarConversaSupabase(nome) {
  // ⚠️ Usa o username real, SEMPRE em lowercase
  const usernameReal =
    (window.__convUsernamesNex && window.__convUsernamesNex[nome]) ||
    String(nome || '').toLowerCase().replace(/^@/, '').trim();

  const convId = await obterOuCriarConversaSupabase(usernameReal);

  window.__convIdsNex = window.__convIdsNex || {};
  window.__convIdsNex[nome] = convId;

  const mensagens = await buscarMensagensSupabase(convId);

  const { data: { user } } = await window.supabaseClient.auth.getUser();
  const meuId = user?.id || null;

  const convertidas = (mensagens || []).map((m) => {
    const dataObj = new Date(m.criado_em);
    const ehMinha = m.autor_id === meuId;

    // Reconstrói o anexo com base no tipo
let anexo = null;
const meta = m.media_meta || {};

if (m.tipo === 'location') {
  // ⚠️ Valida se os dados de location existem
  const loc = meta.localizacao || (
    (typeof meta.lat === 'number' && typeof meta.lng === 'number')
      ? { lat: meta.lat, lng: meta.lng, address: meta.address }
      : null
  );

  if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    anexo = {
      type: 'location',
      lat: loc.lat,
      lng: loc.lng,
      address: loc.address || 'Localização',
      localizacao: loc
    };
  } else {
    // ⚠️ Não tem dados válidos — cria um anexo seguro
    anexo = {
      type: 'location',
      lat: 0,
      lng: 0,
      address: 'Localização indisponível',
      localizacao: { lat: 0, lng: 0, address: 'Localização indisponível' },
      _quebrado: true
    };
  }

} else if (m.tipo === 'pdf') {
      anexo = {
        type: 'pdf',
        url: m.media_url,
        name: meta.name || 'Documento PDF',
        documento: meta.documento || {
          url: m.media_url,
          name: meta.name || 'Documento PDF',
          thumbnail: '',
          size: 0
        }
      };
    } else if (m.tipo === 'album') {
  const midias = meta.midias || meta.urls || [];

  // ⚠️ Se só tem 1 mídia, trata como imagem/vídeo normal
  if (midias.length === 1) {
    const unica = midias[0];
    const url = typeof unica === 'string' ? unica : unica.url;
    const tipoUnica = (typeof unica === 'object' && unica.type) || 'imagem';
    anexo = {
      type: tipoUnica === 'video' ? 'video' : 'imagem',
      url: url
    };
  } else {
    anexo = {
      type: 'album',
      midias: midias,
      urls: midias.map((x) => (typeof x === 'string' ? x : x.url))
    };
  }
} else if (m.media_url && m.tipo !== 'audio') {
  // ⚠️ Comentário do Nearby vira um tipo especial
  if (meta.origem === 'nearby') {
    anexo = {
      type: 'nearby-comment',
      url: m.media_url,
      perfilNome: meta.perfilNome || '',
      perfilId: meta.perfilId || '',
      dropIndex: meta.dropIndex || 0
    };
  } else {
    anexo = {
      type: m.tipo === 'video' ? 'video' : 'imagem',
      url: m.media_url
    };
  }
    }

    // ⚠️ Reconstrói a resposta com texto e nome
    let respostaCompleta = null;

    if (m.resposta_a_id) {
      const infoResposta = meta.resposta_info || {};
      respostaCompleta = {
        id: m.resposta_a_id,
        nome: infoResposta.nome || '',
        texto: infoResposta.texto || '',
        side: infoResposta.side || 'left'
      };
    }

    return {
      id: m.id,
      timestamp: dataObj.getTime(),
      side: ehMinha ? 'right' : 'left',
      nome: ehMinha ? 'Eu' : nome,
      avatar: ehMinha ? 'EU' : (nome || '?').charAt(0).toUpperCase(),
      data: dataObj.toLocaleDateString('pt-BR'),
      hora: dataObj.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: 'enviado',
      text: m.texto || '',
      audio: m.tipo === 'audio' ? m.media_url : null,
      anexo,
      resposta: respostaCompleta,
      edited: m.editada === true,
      deleted: m.apagada_para_todos === true,
      _supabaseId: m.id
    };
  });

  if (typeof window.conversas === 'object') {
    window.conversas[nome] = convertidas;
  }

  // ⚠️ Se essa é a conversa aberta agora, marca como lida no banco
  // (cobre o caso onde o convId só foi criado agora)
  if (
    convId &&
    Drops.estado.conversaAtual === nome &&
    typeof window.marcarConversaLidaSupabase === 'function'
  ) {
    window.marcarConversaLidaSupabase(convId).catch((err) =>
      console.warn('Falha ao marcar lida após carregar:', err)
    );
  }

  return convertidas;
}

// ============================================
// SINCRONIZAR CARDS DO NEX
// ============================================
async function sincronizarCardsNexSupabase() {
  if (!window.supabaseClient) return;

  if (window.__sincronizandoCardsNex) return;
  window.__sincronizandoCardsNex = true;

  try {
    const lista = await listarMinhasConversasSupabase();

    if (!Array.isArray(lista) || !lista.length) {
      window.__sincronizandoCardsNex = false;
      return;
    }

    const meuUser = String(Drops.usernameAtual || '').toLowerCase().trim();

    // Pega o ID do usuário logado 1x (pra saber se a última msg é minha)
    const { data: { user: usuarioLogado } } =
      await window.supabaseClient.auth.getUser();
    const meuId = usuarioLogado?.id || null;

    for (const conv of lista) {
      const usernameOutro = String(conv.outro_username || '')
        .toLowerCase()
        .trim();
      if (!usernameOutro) continue;
      if (usernameOutro === meuUser) continue;

      const nomeExibicao =
        conv.outro_nome || conv.outro_username || 'Usuário';

      if (
        typeof window.conversas === 'object' &&
        !window.conversas[nomeExibicao]
      ) {
        window.conversas[nomeExibicao] = [];
      }

      // Guarda ID + username real
      window.__convIdsNex = window.__convIdsNex || {};
      window.__convIdsNex[nomeExibicao] = conv.conversa_id;

      window.__convUsernamesNex = window.__convUsernamesNex || {};
      window.__convUsernamesNex[nomeExibicao] = usernameOutro;

      // Cria o card se não existir
const cardExistente =
  typeof window.obterCardConversaNex === 'function'
    ? window.obterCardConversaNex(nomeExibicao)
    : document.querySelector(
        `.nex-chat[data-chat="${nomeExibicao}"]`
      );

// ⚠️ Calcula o `conectado` UMA VEZ, antes do if
const conectado =
  typeof window.estaConectadoNoMyDropsNex === 'function'
    ? window.estaConectadoNoMyDropsNex(usernameOutro)
    : false;

if (cardExistente) {
  
  // Atualiza preview
  if (conv.ultima_msg_texto) {
    const p = cardExistente.querySelector('.nex-info p');
    if (p) p.textContent = conv.ultima_msg_texto;
  }

  // ⚠️ Sincroniza o estado de "não lida" com o banco
  const naoLida = conv.nao_lida === true;
  const jaEstaMarcadoNaoLida = cardExistente.classList.contains('unread-chat');

  if (naoLida && !jaEstaMarcadoNaoLida) {
    cardExistente.classList.add('unread-chat');
    if (typeof window.moverCardConversaNex === 'function') {
      window.moverCardConversaNex(nomeExibicao, 'nex-naolidas', true);
    }
  } else if (!naoLida && jaEstaMarcadoNaoLida) {
    cardExistente.classList.remove('unread-chat');
    if (typeof window.moverCardConversaNex === 'function') {
      window.moverCardConversaNex(
        nomeExibicao,
        conectado ? 'nex-conectados' : 'nex-geral',
        true
      );
    }
  }

  continue;
      }

              // Cria o card novo
if (typeof window.criarCardConversaNex === 'function') {
  const preview = conv.ultima_msg_texto || 'Nova conversa';

  // ⚠️ FONTE DE VERDADE: o banco diz se está não lida
  const naoLida = conv.nao_lida === true;

  const tipoCard = naoLida ? 'recebida' : 'enviada';

  window.criarCardConversaNex(
    nomeExibicao,
    conectado,
    { text: preview },
    tipoCard
  );
}
    }
  } catch (err) {
    console.warn('Erro ao sincronizar cards:', err);
  } finally {
    window.__sincronizandoCardsNex = false;
  }
}
  // ============================================
// REALTIME — escuta mensagens novas
// ============================================
let canalRealtimeNex = null;
let tentativaReconexaoNex = 0;
let timerReconexaoNex = null;
const MAX_TENTATIVAS_NEX = 10;

async function iniciarRealtimeNexSupabase() {
  if (!window.supabaseClient) return;

  // Se já tem canal e ele está conectado, não cria outro
  if (canalRealtimeNex && canalRealtimeNex.state === 'joined') {
    console.log('📡 Realtime já está ativo');
    return;
  }

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    // ⚠️ Remove canal antigo se existir
    if (canalRealtimeNex) {
      try {
        await window.supabaseClient.removeChannel(canalRealtimeNex);
      } catch (e) {}
      canalRealtimeNex = null;
    }

    console.log('📡 Iniciando Realtime do NEX...');

    canalRealtimeNex = window.supabaseClient
      .channel('nex-mensagens-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens'
        },
        (payload) => {
          const msg = payload.new;
          if (!msg) return;
          if (msg.autor_id === user.id) return;

          console.log('📩 Nova mensagem recebida via Realtime:', msg);
          processarMensagemRealtimeNex(msg);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mensagens'
        },
        (payload) => {
          const msg = payload.new;
          if (!msg) return;
          if (msg.autor_id === user.id) return;

          console.log('✏️ Mensagem atualizada via Realtime:', msg);
          processarAtualizacaoMensagemNex(msg);
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime status:', status);

        if (status === 'SUBSCRIBED') {
          // ✅ Conectado — reseta tentativas
          tentativaReconexaoNex = 0;

          if (timerReconexaoNex) {
            clearTimeout(timerReconexaoNex);
            timerReconexaoNex = null;
          }

          // ⚠️ Reconectou: re-sincroniza os cards
          setTimeout(() => {
            if (typeof window.sincronizarCardsNexSupabase === 'function') {
              window.sincronizarCardsNexSupabase();
            }
          }, 500);
        }

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          console.warn('⚠️ Realtime caiu. Agendando reconexão...');
          agendarReconexaoNex();
        }
      });
  } catch (err) {
    console.warn('Erro ao iniciar Realtime:', err);
    agendarReconexaoNex();
  }
}

function agendarReconexaoNex() {
  if (timerReconexaoNex) return; // já tem uma agendada

  if (tentativaReconexaoNex >= MAX_TENTATIVAS_NEX) {
    console.warn('❌ Máximo de tentativas de reconexão atingido.');
    return;
  }

  tentativaReconexaoNex += 1;

  // Backoff exponencial: 2s, 4s, 8s, 16s... máx 30s
  const delay = Math.min(
    2000 * Math.pow(2, tentativaReconexaoNex - 1),
    30000
  );

  console.log(
    `🔄 Tentando reconectar em ${delay / 1000}s (tentativa ${tentativaReconexaoNex}/${MAX_TENTATIVAS_NEX})`
  );

  timerReconexaoNex = setTimeout(() => {
    timerReconexaoNex = null;
    iniciarRealtimeNexSupabase();
  }, delay);
}

// ⚠️ Reconecta quando o usuário volta pra aba
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;

  if (!canalRealtimeNex || canalRealtimeNex.state !== 'joined') {
    console.log('👁️ Aba voltou ao foco. Verificando Realtime...');
    tentativaReconexaoNex = 0;
    iniciarRealtimeNexSupabase();
  }
});

// ⚠️ Reconecta quando a internet volta
window.addEventListener('online', () => {
  console.log('🌐 Internet voltou. Reconectando Realtime...');
  tentativaReconexaoNex = 0;
  iniciarRealtimeNexSupabase();
});
  
// ============================================
// PROCESSA UPDATE (edição / apagar pra todos)
// ============================================
async function processarAtualizacaoMensagemNex(msg) {
  if (!msg || !msg.id) return;

  // Descobre em qual conversa
  let nomeContato = null;

  if (window.__convIdsNex) {
    for (const [nome, id] of Object.entries(window.__convIdsNex)) {
      if (id === msg.conversa_id) {
        nomeContato = nome;
        break;
      }
    }
  }

  if (!nomeContato) return;

  const lista = window.conversas[nomeContato] || [];
  const local = lista.find(
    (m) => m._supabaseId === msg.id || m.id === msg.id
  );

  if (!local) return;

  // Atualiza os campos que mudaram
  if (msg.apagada_para_todos) {
    local.deleted = true;
    local.deletedAt = Date.now();

    // ⚠️ Mensagem é minha ou do outro?
    const ehMinha = local.side === 'right';

    if (ehMinha) {
      local.deletedText = '🗑️ Mensagem apagada';
    } else {
      local.deletedText = `⚠️ Mensagem apagada pelo ${nomeContato}`;
    }

    local.text = '';

    // ⚠️ Remove do banco local depois de 5-10s (igual quem apagou)
    setTimeout(() => {
      const listaAtual = window.conversas[nomeContato];
      if (!Array.isArray(listaAtual)) return;

      const index = listaAtual.indexOf(local);
      if (index !== -1) {
        listaAtual.splice(index, 1);

        if (Drops.estado.conversaAtual === nomeContato) {
          if (typeof window.renderChat === 'function') {
            window.renderChat(nomeContato);
          }
        }
      }
    }, ehMinha ? 5000 : 10000);
  } else {
    // ⚠️ Sempre atualiza texto E edited
    if (typeof msg.texto === 'string' && msg.texto.length > 0) {
      local.text = msg.texto;
    }
    local.edited = msg.editada === true;
  }

  // Re-renderiza se o chat estiver aberto
  if (Drops.estado.conversaAtual === nomeContato) {
    if (typeof window.renderChat === 'function') {
      window.renderChat(nomeContato);
    }
  }
}

async function processarMensagemRealtimeNex(msg) {
  if (!msg || !msg.conversa_id) return;

  // Descobre qual é o nome de exibição dessa conversa
  let nomeContato = null;

  if (window.__convIdsNex) {
    for (const [nome, id] of Object.entries(window.__convIdsNex)) {
      if (id === msg.conversa_id) {
        nomeContato = nome;
        break;
      }
    }
  }

  // Se não achou, precisa sincronizar cards pra descobrir
  if (!nomeContato) {
    await sincronizarCardsNexSupabase();

    if (window.__convIdsNex) {
      for (const [nome, id] of Object.entries(window.__convIdsNex)) {
        if (id === msg.conversa_id) {
          nomeContato = nome;
          break;
        }
      }
    }
  }

  if (!nomeContato) return;

  // Adiciona em memória
  if (!window.conversas[nomeContato]) {
    window.conversas[nomeContato] = [];
  }

  // Evita duplicação
  const jaExiste = window.conversas[nomeContato].some(
    (m) => m.id === msg.id || m._supabaseId === msg.id
  );
  if (jaExiste) return;

  const dataObj = new Date(msg.criado_em);

  // Reconstrói o anexo com base no tipo
  let anexoNova = null;
  const metaNova = msg.media_meta || {};

  if (msg.tipo === 'location') {
  const loc = metaNova.localizacao || (
    (typeof metaNova.lat === 'number' && typeof metaNova.lng === 'number')
      ? { lat: metaNova.lat, lng: metaNova.lng, address: metaNova.address }
      : null
  );

  if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    anexoNova = {
      type: 'location',
      lat: loc.lat,
      lng: loc.lng,
      address: loc.address || 'Localização',
      localizacao: loc
    };
  } else {
    anexoNova = {
      type: 'location',
      lat: 0,
      lng: 0,
      address: 'Localização indisponível',
      localizacao: { lat: 0, lng: 0, address: 'Localização indisponível' },
      _quebrado: true
    };
  }
} else if (msg.tipo === 'pdf') {
    anexoNova = {
      type: 'pdf',
      url: msg.media_url,
      name: metaNova.name || 'Documento PDF',
      documento: metaNova.documento || {
        url: msg.media_url,
        name: metaNova.name || 'Documento PDF',
        thumbnail: '',
        size: 0
      }
    };
} else if (msg.tipo === 'album') {
  const midiasNova = metaNova.midias || metaNova.urls || [];

  if (midiasNova.length === 1) {
    const unica = midiasNova[0];
    const url = typeof unica === 'string' ? unica : unica.url;
    const tipoUnica = (typeof unica === 'object' && unica.type) || 'imagem';
    anexoNova = {
      type: tipoUnica === 'video' ? 'video' : 'imagem',
      url: url
    };
  } else {
    anexoNova = {
      type: 'album',
      midias: midiasNova,
      urls: midiasNova.map((x) => (typeof x === 'string' ? x : x.url))
    };
  }
} else if (msg.media_url && msg.tipo !== 'audio') {
  // ⚠️ Comentário do Nearby vira um tipo especial
  if (metaNova.origem === 'nearby') {
    anexoNova = {
      type: 'nearby-comment',
      url: msg.media_url,
      perfilNome: metaNova.perfilNome || '',
      perfilId: metaNova.perfilId || '',
      dropIndex: metaNova.dropIndex || 0
    };
  } else {
    anexoNova = {
      type: msg.tipo === 'video' ? 'video' : 'imagem',
      url: msg.media_url
    };
  }
  }

  // ⚠️ Reconstrói a resposta com texto e nome
  let respostaNova = null;

  if (msg.resposta_a_id) {
    const infoResposta = metaNova.resposta_info || {};
    respostaNova = {
      id: msg.resposta_a_id,
      nome: infoResposta.nome || '',
      texto: infoResposta.texto || '',
      side: infoResposta.side || 'left'
    };
  }

  const nova = {
    id: msg.id,
    timestamp: dataObj.getTime(),
    side: 'left',
    nome: nomeContato,
    avatar: (nomeContato || '?').charAt(0).toUpperCase(),
    data: dataObj.toLocaleDateString('pt-BR'),
    hora: dataObj.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    status: 'recebido',
    text: msg.texto || '',
    audio: msg.tipo === 'audio' ? msg.media_url : null,
    anexo: anexoNova,
    resposta: respostaNova,
    edited: msg.editada === true,
    deleted: msg.apagada_para_todos === true,
    _supabaseId: msg.id
  };

  // ⚠️ Se tem resposta_a_id e a msg original não está local, carrega tudo
  if (msg.resposta_a_id) {
    const jaTemOriginal = window.conversas[nomeContato].some(
      (m) => m._supabaseId === msg.resposta_a_id || m.id === msg.resposta_a_id
    );

    if (!jaTemOriginal) {
      // Recarrega a conversa do Supabase pra ter a msg original
      try {
        const convId = window.__convIdsNex[nomeContato];
        if (
          convId &&
          typeof window.buscarMensagensSupabase === 'function'
        ) {
          const todas = await window.buscarMensagensSupabase(convId);
          const { data: { user } } = await window.supabaseClient.auth.getUser();
          const meuId = user?.id || null;

          window.conversas[nomeContato] = (todas || []).map((m) => {
            const d = new Date(m.criado_em);
            const ehMinha = m.autor_id === meuId;

            let metaRecarga = m.media_meta || {};
            let anexoRecarga = null;

            if (m.tipo === 'location') {
  const loc = metaRecarga.localizacao || (
    (typeof metaRecarga.lat === 'number' && typeof metaRecarga.lng === 'number')
      ? { lat: metaRecarga.lat, lng: metaRecarga.lng, address: metaRecarga.address }
      : null
  );

  if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
    anexoRecarga = {
      type: 'location',
      lat: loc.lat,
      lng: loc.lng,
      address: loc.address || 'Localização',
      localizacao: loc
    };
  } else {
    anexoRecarga = {
      type: 'location',
      lat: 0,
      lng: 0,
      address: 'Localização indisponível',
      localizacao: { lat: 0, lng: 0, address: 'Localização indisponível' },
      _quebrado: true
    };
  }
} else if (m.tipo === 'pdf') {
              anexoRecarga = {
                type: 'pdf',
                url: m.media_url,
                name: metaRecarga.name || 'Documento PDF',
                documento: metaRecarga.documento || {
                  url: m.media_url,
                  name: metaRecarga.name || 'Documento PDF',
                  thumbnail: '',
                  size: 0
                }
              };
            } else if (m.tipo === 'album') {
              const mids = metaRecarga.midias || metaRecarga.urls || [];
              if (mids.length === 1) {
                const u = typeof mids[0] === 'string' ? mids[0] : mids[0].url;
                const t = (typeof mids[0] === 'object' && mids[0].type) || 'imagem';
                anexoRecarga = { type: t === 'video' ? 'video' : 'imagem', url: u };
              } else {
                anexoRecarga = {
                  type: 'album',
                  midias: mids,
                  urls: mids.map((x) => (typeof x === 'string' ? x : x.url))
                };
              }
            } else if (m.media_url && m.tipo !== 'audio') {
  if (metaRecarga.origem === 'nearby') {
    anexoRecarga = {
      type: 'nearby-comment',
      url: m.media_url,
      perfilNome: metaRecarga.perfilNome || '',
      perfilId: metaRecarga.perfilId || '',
      dropIndex: metaRecarga.dropIndex || 0
    };
  } else {
    anexoRecarga = {
      type: m.tipo === 'video' ? 'video' : 'imagem',
      url: m.media_url
    };
  }
            }

            let respostaRecarga = null;
            if (m.resposta_a_id) {
              const info = metaRecarga.resposta_info || {};
              respostaRecarga = {
                id: m.resposta_a_id,
                nome: info.nome || '',
                texto: info.texto || '',
                side: info.side || 'left'
              };
            }

            return {
              id: m.id,
              timestamp: d.getTime(),
              side: ehMinha ? 'right' : 'left',
              nome: ehMinha ? 'Eu' : nomeContato,
              avatar: ehMinha ? 'EU' : (nomeContato || '?').charAt(0).toUpperCase(),
              data: d.toLocaleDateString('pt-BR'),
              hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              status: 'enviado',
              text: m.texto || '',
              audio: m.tipo === 'audio' ? m.media_url : null,
              anexo: anexoRecarga,
              resposta: respostaRecarga,
              edited: m.editada === true,
              deleted: m.apagada_para_todos === true,
              _supabaseId: m.id
            };
          });

          // Sai daqui — a lista já foi toda recarregada
          if (Drops.estado.conversaAtual === nomeContato) {
            if (typeof window.renderChat === 'function') {
              window.renderChat(nomeContato);
            }
          }
          return;
        }
      } catch (err) {
        console.warn('Erro ao recarregar conversa:', err);
      }
    }
  }

  window.conversas[nomeContato].push(nova);

// ⚠️ Verifica se o chat está aberto — só compara o estado e a conversa
const chatEl = document.getElementById('chatNex');
const chatEstaVisivel =
  chatEl && getComputedStyle(chatEl).display !== 'none';

const conversaAberta = Drops.estado.conversaAtual;
const chatDaPessoaEstaAberto =
  chatEstaVisivel && conversaAberta === nomeContato;
  
if (chatDaPessoaEstaAberto) {
  if (typeof window.renderChat === 'function') {
    window.renderChat(nomeContato);

    requestAnimationFrame(() => {
      window.renderChat(nomeContato);
    });
  }

  // ⚠️ Chat está aberto → mensagem foi lida → marca no banco
  const convIdAberto = window.__convIdsNex && window.__convIdsNex[nomeContato];
  if (convIdAberto && typeof window.marcarConversaLidaSupabase === 'function') {
    window.marcarConversaLidaSupabase(convIdAberto).catch((err) =>
      console.warn('Falha ao marcar lida (realtime):', err)
    );
  }
} else {
  // ⚠️ Marca como não lida
  if (typeof window.marcarConversaComoNaoLidaNex === 'function') {
    window.marcarConversaComoNaoLidaNex(nomeContato);
  }

  // ⚠️ Notifica
  if (typeof window.notificarMensagemNovaNex === 'function') {
    window.notificarMensagemNovaNex(nomeContato, nova);
  }
}

  // Atualiza preview do card
  const card = typeof window.obterCardConversaNex === 'function'
    ? window.obterCardConversaNex(nomeContato)
    : null;

  if (card) {
    const p = card.querySelector('.nex-info p');
    if (p) p.textContent = nova.text || '📎 Mídia';
  } else {
    // Card não existe, cria
    await sincronizarCardsNexSupabase();
  }
}
    // ============================================
  // UPLOAD DE MÍDIA DO NEX
  // ============================================
  // Aceita: URL blob (camera/galeria), data URL, ou File
  // Retorna: URL pública do Supabase Storage
  async function uploadMidiaNexSupabase(arquivo, tipo) {
    if (!window.supabaseClient || !arquivo) return null;

    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return null;

let blob = null;
let extensao = 'bin';

// ⚠️ Helper: detecta extensão por MIME com fallback
function detectarExtensaoPorMime(mime, nomeArquivo) {
  const m = String(mime || '').toLowerCase();
  const nome = String(nomeArquivo || '').toLowerCase();

  // Vídeo
  if (m.includes('video/mp4')) return 'mp4';
  if (m.includes('video/webm')) return 'webm';
  if (m.includes('video/quicktime')) return 'mov';
  if (m.includes('video/ogg')) return 'ogv';
  if (m.includes('video')) return 'mp4';

  // Áudio
  if (m.includes('audio/webm')) return 'weba';
  if (m.includes('audio/mpeg') || m.includes('audio/mp3')) return 'mp3';
  if (m.includes('audio/ogg')) return 'ogg';
  if (m.includes('audio/wav')) return 'wav';
  if (m.includes('audio')) return 'weba';

  // Imagem
  if (m.includes('image/png')) return 'png';
  if (m.includes('image/jpeg') || m.includes('image/jpg')) return 'jpg';
  if (m.includes('image/webp')) return 'webp';
  if (m.includes('image/gif')) return 'gif';
  if (m.includes('image')) return 'jpg';

  // Documento
  if (m.includes('pdf')) return 'pdf';

  // Fallback: tenta pela extensão do nome do arquivo
  if (nome.includes('.')) {
    const ext = nome.split('.').pop();
    if (ext && ext.length <= 5) return ext;
  }

  return 'bin';
}

// --- Caso 1: File/Blob direto (câmera, MediaRecorder, input file) ---
if (arquivo instanceof File || arquivo instanceof Blob) {
  blob = arquivo;
  extensao = detectarExtensaoPorMime(blob.type, arquivo.name);

  console.log('📤 Upload via File/Blob:', {
    mime: blob.type,
    size: blob.size,
    extensao
  });

// --- Caso 2: URL (blob:, http:, https:) ---
} else if (typeof arquivo === 'string' && /^(blob:|https?:)/.test(arquivo)) {
  let res;

  try {
    res = await fetch(arquivo);
  } catch (fetchErr) {
    console.error('❌ fetch falhou (blob URL revogada?):', arquivo.slice(0, 80), fetchErr);
    return null;
  }

  if (!res.ok) {
    console.error('❌ fetch status', res.status, 'para', arquivo.slice(0, 80));
    return null;
  }

  blob = await res.blob();
  extensao = detectarExtensaoPorMime(blob.type, '');

  console.log('📤 Upload via URL:', {
    url: arquivo.slice(0, 80),
    mime: blob.type,
    size: blob.size,
    extensao
  });

// --- Caso 3: Data URL (base64) ---
} else if (typeof arquivo === 'string' && arquivo.startsWith('data:')) {
  const res = await fetch(arquivo);
  blob = await res.blob();
  extensao = detectarExtensaoPorMime(blob.type, '');

  console.log('📤 Upload via DataURL:', {
    mime: blob.type,
    size: blob.size,
    extensao
  });
}

if (!blob) {
  console.warn('⚠️ Tipo de arquivo não suportado:', arquivo);
  return null;
}

if (blob.size === 0) {
  console.error('❌ Blob vazio — nada pra enviar');
  return null;
}

      // Nome único
      const nomeArquivo = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extensao}`;

      // Detecta contentType correto pela extensão
let contentType = blob.type;

if (!contentType || contentType === 'application/octet-stream' || contentType === '') {
  if (extensao === 'jpg' || extensao === 'jpeg') {
    contentType = 'image/jpeg';
  } else if (extensao === 'png') {
    contentType = 'image/png';
  } else if (extensao === 'webp') {
    contentType = 'image/webp';
  } else if (extensao === 'gif') {
    contentType = 'image/gif';
  } else if (extensao === 'mp4') {
    contentType = 'video/mp4';
  } else if (extensao === 'mov') {
    contentType = 'video/quicktime';
  } else if (extensao === 'webm') {
    contentType = 'video/webm';
  } else if (extensao === 'weba') {
    contentType = 'audio/webm';
  } else if (extensao === 'mp3') {
    contentType = 'audio/mpeg';
  } else if (extensao === 'ogg') {
    contentType = 'audio/ogg';
  } else if (extensao === 'wav') {
    contentType = 'audio/wav';
  } else if (extensao === 'pdf') {
    contentType = 'application/pdf';
  } else {
    contentType = 'application/octet-stream';
  }
}

          // Upload
    const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
      .from('nex')
      .upload(nomeArquivo, blob, {
        contentType: contentType,
        upsert: false,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ Erro no upload do NEX:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        bucket: 'nex',
        nomeArquivo,
        contentType,
        extensao,
        tamanhoBlob: blob.size
      });

      // ⚠️ Mostra o erro real pro usuário
      if (typeof window.mostrarToastNex === 'function') {
        window.mostrarToastNex(
          'Erro no upload: ' + (uploadError.message || 'desconhecido'),
          'erro',
          6000
        );
      }

      return null;
    }

    // URL pública
    const { data: urlData } = window.supabaseClient.storage
      .from('nex')
      .getPublicUrl(nomeArquivo);

    console.log('☁️ Upload NEX OK:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err) {
    console.error('❌ Erro no upload (catch):', err);
    return null;
  }
  }

  // ============================================
// NOTIFICAÇÃO DE MENSAGEM NOVA
// ============================================

function notificarMensagemNovaNex(nomeContato, mensagem) {
  if (!mensagem) return;

  // ⚠️ Vibra o celular (funciona em Android)
  if (navigator.vibrate) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (e) {}
  }

  // ⚠️ Mostra notificação do sistema (funciona em Android e iOS)
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const titulo = String(nomeContato || 'Nova mensagem');
  let corpo = '📎 Mídia';

  if (mensagem.text) {
    corpo = String(mensagem.text).slice(0, 80);
  } else if (mensagem.audio) {
    corpo = '🎙️ Áudio';
  } else if (mensagem.anexo?.type === 'imagem' || mensagem.anexo?.type === 'image') {
    corpo = '📷 Foto';
  } else if (mensagem.anexo?.type === 'video') {
    corpo = '🎥 Vídeo';
  } else if (mensagem.anexo?.type === 'pdf') {
    corpo = '📄 PDF';
  } else if (mensagem.anexo?.type === 'location') {
    corpo = '📍 Localização';
  } else if (mensagem.anexo?.type === 'album') {
    corpo = '🎴 Álbum';
  }

  try {
    const notif = new Notification(titulo, {
      body: corpo,
      icon: './assets/drops-icon.png',
      badge: './assets/drops-icon.png',
      tag: 'nex-' + nomeContato,
      renotify: true
    });

    // Ao clicar na notificação, abre o chat
    notif.onclick = () => {
      window.focus();
      if (typeof window.abrirChatNex === 'function') {
        const card = document.querySelector(
          `.nex-chat[data-chat="${nomeContato}"]`
        );
        if (card) window.abrirChatNex(card);
      }
      notif.close();
    };

    // Fecha automaticamente depois de 6s
    setTimeout(() => notif.close(), 6000);
  } catch (e) {
    console.warn('Erro ao mostrar notificação:', e);
  }
}

// ============================================
// PEDIR PERMISSÃO DE NOTIFICAÇÃO
// ============================================

async function pedirPermissaoNotificacaoNex() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  try {
    const resultado = await Notification.requestPermission();
    return resultado === 'granted';
  } catch (e) {
    return false;
  }
}

// ============================================
// EXPÕE GLOBALMENTE
// ============================================
window.carregarConversaSupabase = carregarConversaSupabase;
  window.marcarConversaLidaSupabase = marcarConversaLidaSupabase;
  window.obterOuCriarConversaSupabase = obterOuCriarConversaSupabase;
  window.listarMinhasConversasSupabase = listarMinhasConversasSupabase;
  window.buscarMensagensSupabase = buscarMensagensSupabase;
  window.enviarMensagemSupabase = enviarMensagemSupabase;
  window.editarMensagemSupabase = editarMensagemSupabase;
  window.apagarPraMimSupabase = apagarPraMimSupabase;
  window.apagarPraTodosSupabase = apagarPraTodosSupabase;
  window.sincronizarCardsNexSupabase = sincronizarCardsNexSupabase;
window.iniciarRealtimeNexSupabase = iniciarRealtimeNexSupabase;
window.agendarReconexaoNex = agendarReconexaoNex;
  window.uploadMidiaNexSupabase = uploadMidiaNexSupabase;
window.notificarMensagemNovaNex = notificarMensagemNovaNex;
window.pedirPermissaoNotificacaoNex = pedirPermissaoNotificacaoNex;
  
  document.addEventListener('DOMContentLoaded', async () => {
    await aguardarSupabase();
    console.log('☁️ 25-nex-supabase.js pronto');
  });

  console.log('💬 25-nex-supabase.js carregado');

})();