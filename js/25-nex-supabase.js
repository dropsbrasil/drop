/* ============================================
   25-NEX-SUPABASE.JS
   NEX — conversas e mensagens no Supabase

   Depende de: 00-config.js, 20-supabase.js

   ⚠️ REGRA DE OURO:
   A CHAVE ÚNICA de tudo é o USERNAME REAL (@).
   Nome exibido é só rótulo visual.
============================================ */

(function () {
  'use strict';

  const __carregandoConversaNex = new Set();
  const __bufferRealtimeNex = new Map();
  const __debounceLidaNex = { timer: null, pendente: null };

  function normalizarUsernameNex(valor) {
    return String(valor || '')
      .replace(/^@/, '')
      .toLowerCase()
      .trim();
  }

  // ⚠️ Garante que a chave é SEMPRE o username real
  function resolverChaveNex(nome) {
    if (!nome) return '';
    const cache = window.__convUsernamesNex || {};
    if (cache[nome]) return normalizarUsernameNex(cache[nome]);
    return normalizarUsernameNex(nome);
  }

  async function aguardarSupabase() {
    return new Promise((resolve) => {
      const inicio = Date.now();
      const TIMEOUT_MS = 15000;
      const check = () => {
        if (window.supabaseClient && window.Drops) return resolve(true);
        if (Date.now() - inicio > TIMEOUT_MS) {
          console.warn('⚠️ aguardarSupabase: timeout após 15s');
          return resolve(false);
        }
        setTimeout(check, 100);
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
// DEBOUNCE — marcar conversa como lida
// ============================================
function marcarConversaLidaDebounced(conversaId) {
  if (!conversaId) return;
  __debounceLidaNex.pendente = conversaId;
  if (__debounceLidaNex.timer) clearTimeout(__debounceLidaNex.timer);
  __debounceLidaNex.timer = setTimeout(() => {
    const id = __debounceLidaNex.pendente;
    __debounceLidaNex.pendente = null;
    __debounceLidaNex.timer = null;
    if (id) {
      marcarConversaLidaSupabase(id).catch((err) =>
        console.warn('Falha ao marcar lida (debounce):', err)
      );
    }
  }, 600);
}

// ============================================
// MARCAR MENSAGENS COMO ENTREGUES
// ============================================
async function marcarMensagensComoEntreguesSupabase(conversaId) {
  if (!window.supabaseClient || !conversaId) return false;

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return false;

    const { error } = await window.supabaseClient
      .from('mensagens')
      .update({ entregue_em: new Date().toISOString() })
      .eq('conversa_id', conversaId)
      .neq('autor_id', user.id)
      .is('entregue_em', null);

    if (error) {
      console.warn('Erro ao marcar entregue:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Erro ao marcar entregue:', err);
    return false;
  }
}

// ============================================
// MARCAR MENSAGENS COMO VISUALIZADAS
// ============================================
async function marcarMensagensComoVisualizadasSupabase(conversaId) {
  if (!window.supabaseClient || !conversaId) return false;

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return false;

    const agora = new Date().toISOString();

    const { error } = await window.supabaseClient
      .from('mensagens')
      .update({
        visualizado_em: agora,
        entregue_em: agora
      })
      .eq('conversa_id', conversaId)
      .neq('autor_id', user.id)
      .is('visualizado_em', null);

    if (error) {
      console.warn('Erro ao marcar visualizado:', error);
      return false;
    }

    const { error: errEntrega } = await window.supabaseClient
      .from('mensagens')
      .update({ entregue_em: agora })
      .eq('conversa_id', conversaId)
      .neq('autor_id', user.id)
      .is('entregue_em', null);

    if (errEntrega) {
      console.warn('Erro ao completar entregue_em:', errEntrega);
    }

    return true;
  } catch (err) {
    console.warn('Erro ao marcar visualizado:', err);
    return false;
  }
}

// ============================================
// BUSCAR STATUS DAS MENSAGENS (entregue/visualizado)
// ============================================
async function buscarStatusMensagensSupabase(conversaId) {
  if (!window.supabaseClient || !conversaId) return {};

  try {
    const { data, error } = await window.supabaseClient
      .from('mensagens')
      .select('id, entregue_em, visualizado_em')
      .eq('conversa_id', conversaId);

    if (error) {
      console.warn('Erro ao buscar status:', error);
      return {};
    }

    const mapa = {};
    (data || []).forEach((m) => {
      mapa[m.id] = {
        entregue_em: m.entregue_em,
        visualizado_em: m.visualizado_em
      };
    });

    return mapa;
  } catch (err) {
    console.warn('Erro ao buscar status:', err);
    return {};
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
          username_outro: normalizarUsernameNex(usernameOutro)
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

      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return mensagens;

      const idsMensagens = mensagens.map((m) => m.id);

      const { data: ocultas } = await window.supabaseClient
        .from('mensagens_ocultas')
        .select('mensagem_id')
        .eq('usuario_id', user.id)
        .in('mensagem_id', idsMensagens);

      const idsOcultas = new Set((ocultas || []).map((o) => o.mensagem_id));

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

    const { error: updErr } = await window.supabaseClient
      .from('conversas')
      .update({ atualizado_em: new Date().toISOString() })
      .eq('id', payload.conversa_id);

    if (updErr) {
      console.warn('Aviso: falha ao atualizar atualizado_em:', updErr);
    }

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
  // ⚠️ Resolve pro username real (chave única)
  const chave = resolverChaveNex(nome);

  const convId = await obterOuCriarConversaSupabase(chave);

  window.__convIdsNex = window.__convIdsNex || {};
  window.__convIdsNex[chave] = convId;

  if (convId) __carregandoConversaNex.add(convId);

  let mensagens;
  try {
    mensagens = await buscarMensagensSupabase(convId);
  } finally {
    if (convId) __carregandoConversaNex.delete(convId);
  }

  if (convId && __bufferRealtimeNex.has(convId)) {
    const pendentes = __bufferRealtimeNex.get(convId);
    __bufferRealtimeNex.delete(convId);
    for (const msgPendente of pendentes) {
      const jaTem = (mensagens || []).some(
        (m) => m.id === msgPendente.id || m._supabaseId === msgPendente.id
      );
      if (!jaTem) mensagens.push(msgPendente);
    }
    mensagens.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
  }

  const { data: { user } } = await window.supabaseClient.auth.getUser();
  const meuId = user?.id || null;

  const convertidas = (mensagens || []).map((m) => {
    const dataObj = new Date(m.criado_em);
    const ehMinha = m.autor_id === meuId;

    let anexo = null;
    const meta = m.media_meta || {};

    if (m.tipo === 'location') {
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

    let statusMsg = 'enviado';

if (ehMinha) {
  if (m.visualizado_em) statusMsg = 'visualizado';
  else if (m.entregue_em) statusMsg = 'entregue';
}

return {
  id: m.id,
  timestamp: dataObj.getTime(),
  side: ehMinha ? 'right' : 'left',
  nome: ehMinha ? 'Eu' : chave,
  avatar: ehMinha ? 'EU' : (chave || '?').charAt(0).toUpperCase(),
  data: dataObj.toLocaleDateString('pt-BR'),
  hora: dataObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }),
  status: statusMsg,
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
    // ⚠️ Salva SEMPRE na chave do username real
    window.conversas[chave] = convertidas;

    // ⚠️ Se veio por outro nome, aponta pra MESMA referência
    if (nome && nome !== chave) {
      window.conversas[nome] = convertidas;
    }
  }

  if (
    convId &&
    (resolverChaveNex(Drops.estado.conversaAtual) === chave)
  ) {
    marcarConversaLidaDebounced(convId);
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

    const meuUser = normalizarUsernameNex(Drops.usernameAtual || '');

    for (const conv of lista) {
      const usernameOutro = normalizarUsernameNex(conv.outro_username || '');
      if (!usernameOutro) continue;
      if (usernameOutro === meuUser) continue;

      const nomeExibicao =
        conv.outro_nome || conv.outro_username || 'Usuário';

      // ⚠️ Conversa sempre indexada pelo username real
      if (
        typeof window.conversas === 'object' &&
        !window.conversas[usernameOutro]
      ) {
        window.conversas[usernameOutro] = [];
      }

      // ⚠️ Aponta o nome exibido pra MESMA lista
      if (
        typeof window.conversas === 'object' &&
        nomeExibicao !== usernameOutro
      ) {
        window.conversas[nomeExibicao] = window.conversas[usernameOutro];
      }

      window.__convIdsNex = window.__convIdsNex || {};
      window.__convIdsNex[usernameOutro] = conv.conversa_id;

      window.__convUsernamesNex = window.__convUsernamesNex || {};
window.__convUsernamesNex[usernameOutro] = usernameOutro;
window.__convUsernamesNex[nomeExibicao] = usernameOutro;

window.__convNomesExibidosNex = window.__convNomesExibidosNex || {};
window.__convNomesExibidosNex[usernameOutro] = nomeExibicao;

      const cardExistente =
        typeof window.obterCardConversaNex === 'function'
          ? window.obterCardConversaNex(usernameOutro)
          : document.querySelector(
              `.nex-chat[data-chat="${usernameOutro}"]`
            );

      const conectado =
        typeof window.estaConectadoNoMyDropsNex === 'function'
          ? window.estaConectadoNoMyDropsNex(usernameOutro)
          : false;

      if (cardExistente) {
        if (conv.ultima_msg_texto) {
          const p = cardExistente.querySelector('.nex-info p');
          if (p) p.textContent = conv.ultima_msg_texto;
        }

        const naoLida = conv.nao_lida === true;
        const jaEstaMarcadoNaoLida =
          cardExistente.classList.contains('unread-chat');

        if (naoLida && !jaEstaMarcadoNaoLida) {
          cardExistente.classList.add('unread-chat');
          if (typeof window.moverCardConversaNex === 'function') {
            window.moverCardConversaNex(
              cardExistente.dataset.chat || usernameOutro,
              'nex-naolidas',
              true
            );
          }
        } else if (!naoLida && jaEstaMarcadoNaoLida) {
          cardExistente.classList.remove('unread-chat');
          if (typeof window.moverCardConversaNex === 'function') {
            window.moverCardConversaNex(
              cardExistente.dataset.chat || usernameOutro,
              conectado ? 'nex-conectados' : 'nex-geral',
              true
            );
          }
        }

        continue;
      }

      if (typeof window.criarCardConversaNex === 'function') {
        const preview = conv.ultima_msg_texto || 'Nova conversa';
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

  if (canalRealtimeNex && canalRealtimeNex.state === 'joined') {
    console.log('📡 Realtime já está ativo');
    return;
  }

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

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

  // ⚠️ Se é MINHA mensagem e mudou status (entregue/visto),
  //    atualiza o objeto local pra refletir ✓✓ e 👁️
  if (msg.autor_id === user.id) {
    processarStatusMinhaMensagemNex(msg);
    return;
  }

  console.log('✏️ Mensagem atualizada via Realtime:', msg);
  processarAtualizacaoMensagemNex(msg);
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime status:', status);

        if (status === 'SUBSCRIBED') {
          tentativaReconexaoNex = 0;

          if (timerReconexaoNex) {
            clearTimeout(timerReconexaoNex);
            timerReconexaoNex = null;
          }

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
  if (timerReconexaoNex) return;

  if (tentativaReconexaoNex >= MAX_TENTATIVAS_NEX) {
    console.warn('❌ Máximo de tentativas de reconexão atingido.');
    return;
  }

  tentativaReconexaoNex += 1;

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

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;

  if (!canalRealtimeNex || canalRealtimeNex.state !== 'joined') {
    console.log('👁️ Aba voltou ao foco. Verificando Realtime...');
    tentativaReconexaoNex = 0;
    iniciarRealtimeNexSupabase();
  }
});

window.addEventListener('online', () => {
  console.log('🌐 Internet voltou. Reconectando Realtime...');
  tentativaReconexaoNex = 0;
  iniciarRealtimeNexSupabase();
});

// ============================================
// ATUALIZA STATUS DE MENSAGEM MINHA (entregue/visto)
// ============================================
function processarStatusMinhaMensagemNex(msg) {
  if (!msg || !msg.id) return;

  let chaveContato = null;

  if (window.__convIdsNex) {
    for (const [nome, id] of Object.entries(window.__convIdsNex)) {
      if (id === msg.conversa_id) {
        chaveContato = resolverChaveNex(nome);
        break;
      }
    }
  }

  if (!chaveContato) return;

  const lista = window.conversas[chaveContato] || [];
  const local = lista.find(
    (m) => m._supabaseId === msg.id || m.id === msg.id
  );

  if (!local) return;

  let novoStatus = 'enviado';

  if (msg.visualizado_em) {
    novoStatus = 'visualizado';
  } else if (msg.entregue_em) {
    novoStatus = 'entregue';
  }

  if (local.status === novoStatus) return;

  local.status = novoStatus;

  if (resolverChaveNex(Drops.estado.conversaAtual) === chaveContato) {
    if (typeof window.renderChat === 'function') {
      window.renderChat(chaveContato);
    }
  }
}

// ============================================
// PROCESSA UPDATE (edição / apagar pra todos)
// ============================================
async function processarAtualizacaoMensagemNex(msg) {
  if (!msg || !msg.id) return;

  // ⚠️ Descobre a chave (username real) da conversa
  let chaveContato = null;

  if (window.__convIdsNex) {
    for (const [nome, id] of Object.entries(window.__convIdsNex)) {
      if (id === msg.conversa_id) {
        chaveContato = resolverChaveNex(nome);
        break;
      }
    }
  }

  if (!chaveContato) return;

  const lista = window.conversas[chaveContato] || [];
  const local = lista.find(
    (m) => m._supabaseId === msg.id || m.id === msg.id
  );

  if (!local) return;

  if (msg.apagada_para_todos) {
    local.deleted = true;
    local.deletedAt = Date.now();

    const ehMinha = local.side === 'right';

    if (ehMinha) {
      local.deletedText = '🗑️ Mensagem apagada';
    } else {
      local.deletedText = `⚠️ Mensagem apagada pelo ${chaveContato}`;
    }

    local.text = '';

    setTimeout(() => {
      const listaAtual = window.conversas[chaveContato];
      if (!Array.isArray(listaAtual)) return;

      const index = listaAtual.indexOf(local);
      if (index !== -1) {
        listaAtual.splice(index, 1);

        if (resolverChaveNex(Drops.estado.conversaAtual) === chaveContato) {
          if (typeof window.renderChat === 'function') {
            window.renderChat(chaveContato);
          }
        }
      }
    }, ehMinha ? 5000 : 10000);
  } else {
    local.deleted = false;
    local.deletedAt = null;
    local.deletedText = null;

    if (typeof msg.texto === 'string' && msg.texto.length > 0) {
      local.text = msg.texto;
    }
    local.edited = msg.editada === true;
  }

  if (resolverChaveNex(Drops.estado.conversaAtual) === chaveContato) {
    if (typeof window.renderChat === 'function') {
      window.renderChat(chaveContato);
    }
  }
}

// ============================================
// PROCESSA MENSAGEM NOVA (INSERT)
// ============================================
async function processarMensagemRealtimeNex(msg) {
  if (!msg || !msg.conversa_id) return;

  // ⚠️ Descobre a chave (username real) da conversa
  let chaveContato = null;

  if (window.__convIdsNex) {
    for (const [nome, id] of Object.entries(window.__convIdsNex)) {
      if (id === msg.conversa_id) {
        chaveContato = resolverChaveNex(nome);
        break;
      }
    }
  }

  if (!chaveContato) {
    await sincronizarCardsNexSupabase();

    if (window.__convIdsNex) {
      for (const [nome, id] of Object.entries(window.__convIdsNex)) {
        if (id === msg.conversa_id) {
          chaveContato = resolverChaveNex(nome);
          break;
        }
      }
    }
  }

  if (!chaveContato) return;

// ⚠️ Marca as mensagens dessa conversa como ENTREGUES
marcarMensagensComoEntreguesSupabase(msg.conversa_id).catch((err) =>
  console.warn('Falha ao marcar entregues (realtime):', err)
);

// ⚠️ Conversa carregando? Guarda no buffer
if (msg.conversa_id && __carregandoConversaNex.has(msg.conversa_id)) {
    if (!__bufferRealtimeNex.has(msg.conversa_id)) {
      __bufferRealtimeNex.set(msg.conversa_id, []);
    }
    __bufferRealtimeNex.get(msg.conversa_id).push(msg);
    console.log('⏸️ Mensagem bufferizada (conversa carregando):', msg.id);
    return;
  }

  // ⚠️ Garante a lista na chave única
  if (!window.conversas[chaveContato]) {
    window.conversas[chaveContato] = [];
  }

  // ⚠️ Evita duplicata
  const jaExiste = window.conversas[chaveContato].some(
    (m) => m.id === msg.id || m._supabaseId === msg.id
  );
  if (jaExiste) return;

  const dataObj = new Date(msg.criado_em);

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
    nome: chaveContato,
    avatar: (chaveContato || '?').charAt(0).toUpperCase(),
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

  // ⚠️ Se tem resposta, e a original não está carregada, recarrega tudo
  if (msg.resposta_a_id) {
    const jaTemOriginal = window.conversas[chaveContato].some(
      (m) => m._supabaseId === msg.resposta_a_id || m.id === msg.resposta_a_id
    );

    if (!jaTemOriginal) {
      try {
        const convId = window.__convIdsNex[chaveContato];
        if (convId && typeof window.buscarMensagensSupabase === 'function') {
          const todas = await window.buscarMensagensSupabase(convId);
          const { data: { user } } =
            await window.supabaseClient.auth.getUser();
          const meuId = user?.id || null;

          window.conversas[chaveContato] = (todas || []).map((m) => {
            const d = new Date(m.criado_em);
            const ehMinha = m.autor_id === meuId;

            let metaRecarga = m.media_meta || {};
            let anexoRecarga = null;

            if (m.tipo === 'location') {
              const loc = metaRecarga.localizacao || (
                (typeof metaRecarga.lat === 'number' &&
                 typeof metaRecarga.lng === 'number')
                  ? {
                      lat: metaRecarga.lat,
                      lng: metaRecarga.lng,
                      address: metaRecarga.address
                    }
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
                  localizacao: {
                    lat: 0,
                    lng: 0,
                    address: 'Localização indisponível'
                  },
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
                const t =
                  (typeof mids[0] === 'object' && mids[0].type) || 'imagem';
                anexoRecarga = {
                  type: t === 'video' ? 'video' : 'imagem',
                  url: u
                };
              } else {
                anexoRecarga = {
                  type: 'album',
                  midias: mids,
                  urls: mids.map((x) =>
                    typeof x === 'string' ? x : x.url
                  )
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

            let statusMsgR = 'enviado';

if (ehMinha) {
  if (m.visualizado_em) statusMsgR = 'visualizado';
  else if (m.entregue_em) statusMsgR = 'entregue';
}

return {
  id: m.id,
  timestamp: d.getTime(),
  side: ehMinha ? 'right' : 'left',
  nome: ehMinha ? 'Eu' : chaveContato,
  avatar: ehMinha ? 'EU' : (chaveContato || '?').charAt(0).toUpperCase(),
  data: d.toLocaleDateString('pt-BR'),
  hora: d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }),
  status: statusMsgR,
  text: m.texto || '',
  audio: m.tipo === 'audio' ? m.media_url : null,
  anexo: anexoRecarga,
  resposta: respostaRecarga,
  edited: m.editada === true,
  deleted: m.apagada_para_todos === true,
  _supabaseId: m.id
};
          });

          if (resolverChaveNex(Drops.estado.conversaAtual) === chaveContato) {
            if (typeof window.renderChat === 'function') {
              window.renderChat(chaveContato);
            }
          }
          return;
        }
      } catch (err) {
        console.warn('Erro ao recarregar conversa:', err);
      }
    }
  }

  // ⚠️ Insere na chave única
  window.conversas[chaveContato].push(nova);

  // ⚠️ Chat aberto = compara pelo username real
  const chatEl = document.getElementById('chatNex');
  const chatEstaVisivel =
    chatEl && getComputedStyle(chatEl).display !== 'none';

  const chaveAberta = resolverChaveNex(Drops.estado.conversaAtual);

  const chatDaPessoaEstaAberto =
    chatEstaVisivel && chaveAberta === chaveContato;

  if (chatDaPessoaEstaAberto) {
  if (typeof window.renderChat === 'function') {
    window.renderChat(chaveContato);
  }

  const convIdAberto =
    window.__convIdsNex && window.__convIdsNex[chaveContato];
  if (convIdAberto) {
    marcarConversaLidaDebounced(convIdAberto);

    // ⚠️ Se o chat está aberto e chegou mensagem nova,
    //    marca as mensagens dessa conversa como VISUALIZADAS
    marcarMensagensComoVisualizadasSupabase(convIdAberto).catch((err) =>
      console.warn('Falha ao marcar visualizadas (realtime):', err)
    );
  }
} else {
    if (typeof window.marcarConversaComoNaoLidaNex === 'function') {
      window.marcarConversaComoNaoLidaNex(chaveContato);
    }

    if (typeof window.notificarMensagemNovaNex === 'function') {
      window.notificarMensagemNovaNex(chaveContato, nova);
    }
  }

  // ⚠️ Atualiza preview do card
  const card = typeof window.obterCardConversaNex === 'function'
    ? window.obterCardConversaNex(chaveContato)
    : null;

  if (card) {
    const p = card.querySelector('.nex-info p');
    if (p) p.textContent = nova.text || '📎 Mídia';
  } else {
    await sincronizarCardsNexSupabase();
  }
}

  // ============================================
// UPLOAD DE MÍDIA DO NEX
// ============================================
async function uploadMidiaNexSupabase(arquivo, tipo) {
  if (!window.supabaseClient || !arquivo) return null;

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return null;

    let blob = null;
    let extensao = 'bin';

    function detectarExtensaoPorMime(mime, nomeArquivo) {
      const m = String(mime || '').toLowerCase();
      const nome = String(nomeArquivo || '').toLowerCase();

      if (m.includes('video/mp4')) return 'mp4';
      if (m.includes('video/webm')) return 'webm';
      if (m.includes('video/quicktime')) return 'mov';
      if (m.includes('video/ogg')) return 'ogv';
      if (m.includes('video')) return 'mp4';

      if (m.includes('audio/webm')) return 'weba';
      if (m.includes('audio/mpeg') || m.includes('audio/mp3')) return 'mp3';
      if (m.includes('audio/ogg')) return 'ogg';
      if (m.includes('audio/wav')) return 'wav';
      if (m.includes('audio')) return 'weba';

      if (m.includes('image/png')) return 'png';
      if (m.includes('image/jpeg') || m.includes('image/jpg')) return 'jpg';
      if (m.includes('image/webp')) return 'webp';
      if (m.includes('image/gif')) return 'gif';
      if (m.includes('image')) return 'jpg';

      if (m.includes('pdf')) return 'pdf';

      if (nome.includes('.')) {
        const ext = nome.split('.').pop();
        if (ext && ext.length <= 5) return ext;
      }

      return 'bin';
    }

    if (arquivo instanceof File || arquivo instanceof Blob) {
      blob = arquivo;
      extensao = detectarExtensaoPorMime(blob.type, arquivo.name);

      console.log('📤 Upload via File/Blob:', {
        mime: blob.type,
        size: blob.size,
        extensao
      });
    } else if (
      typeof arquivo === 'string' &&
      /^(blob:|https?:)/.test(arquivo)
    ) {
      let res;

      try {
        res = await fetch(arquivo);
      } catch (fetchErr) {
        console.error(
          '❌ fetch falhou (blob URL revogada?):',
          arquivo.slice(0, 80),
          fetchErr
        );
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

    const nomeArquivo = `${user.id}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${extensao}`;

    let contentType = blob.type;

    if (
      !contentType ||
      contentType === 'application/octet-stream' ||
      contentType === ''
    ) {
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

    const { data: uploadData, error: uploadError } =
      await window.supabaseClient.storage
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

      if (typeof window.mostrarToastNex === 'function') {
        window.mostrarToastNex(
          'Erro no upload: ' + (uploadError.message || 'desconhecido'),
          'erro',
          6000
        );
      }

      return null;
    }

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

  if (navigator.vibrate) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch (e) {}
  }

  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const titulo = String(nomeContato || 'Nova mensagem');
  let corpo = '📎 Mídia';

  if (mensagem.text) {
    corpo = String(mensagem.text).slice(0, 80);
  } else if (mensagem.audio) {
    corpo = '🎙️ Áudio';
  } else if (
    mensagem.anexo?.type === 'imagem' ||
    mensagem.anexo?.type === 'image'
  ) {
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
  window.marcarConversaLidaDebounced = marcarConversaLidaDebounced;
window.marcarMensagensComoEntreguesSupabase = marcarMensagensComoEntreguesSupabase;
window.marcarMensagensComoVisualizadasSupabase = marcarMensagensComoVisualizadasSupabase;
window.buscarStatusMensagensSupabase = buscarStatusMensagensSupabase;
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
  window.normalizarUsernameNex = normalizarUsernameNex;
  window.resolverChaveNex = resolverChaveNex;

  document.addEventListener('DOMContentLoaded', async () => {
    await aguardarSupabase();
    console.log('☁️ 25-nex-supabase.js pronto');
  });

  console.log('💬 25-nex-supabase.js carregado');

})();
