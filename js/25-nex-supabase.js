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
    // Usa o username real, não o nome de exibição
    const usernameReal =
      (window.__convUsernamesNex && window.__convUsernamesNex[nome]) || nome;

    const convId = await obterOuCriarConversaSupabase(usernameReal);
    if (!convId) return null;

    window.__convIdsNex = window.__convIdsNex || {};
    window.__convIdsNex[nome] = convId;

    const mensagens = await buscarMensagensSupabase(convId);

    const { data: { user } } = await window.supabaseClient.auth.getUser();
    const meuId = user?.id || null;

    const convertidas = (mensagens || []).map((m) => {
      const dataObj = new Date(m.criado_em);
      const ehMinha = m.autor_id === meuId;

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
        anexo: m.media_url
          ? { type: m.tipo === 'video' ? 'video' : 'imagem', url: m.media_url }
          : null,
        resposta: m.resposta_a_id ? { id: m.resposta_a_id } : null,
        edited: m.editada === true,
        deleted: m.apagada_para_todos === true,
        _supabaseId: m.id
      };
    });

    if (typeof window.conversas === 'object') {
      window.conversas[nome] = convertidas;
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

        if (cardExistente) {
          if (conv.ultima_msg_texto) {
            const p = cardExistente.querySelector('.nex-info p');
            if (p) p.textContent = conv.ultima_msg_texto;
          }
          continue;
        }

        // Cria o card novo
        if (typeof window.criarCardConversaNex === 'function') {
          const conectado =
            typeof window.estaConectadoNoMyDropsNex === 'function'
              ? window.estaConectadoNoMyDropsNex(usernameOutro)
              : false;

          const preview = conv.ultima_msg_texto || 'Nova conversa';

          const ehMinhaUltimaMsg =
            conv.ultima_msg_autor_id &&
            meuId &&
            conv.ultima_msg_autor_id === meuId;

          window.criarCardConversaNex(
            nomeExibicao,
            conectado,
            { text: preview },
            ehMinhaUltimaMsg ? 'enviada' : 'recebida'
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
  // EXPÕE GLOBALMENTE
  // ============================================
  window.carregarConversaSupabase = carregarConversaSupabase;
  window.obterOuCriarConversaSupabase = obterOuCriarConversaSupabase;
  window.listarMinhasConversasSupabase = listarMinhasConversasSupabase;
  window.buscarMensagensSupabase = buscarMensagensSupabase;
  window.enviarMensagemSupabase = enviarMensagemSupabase;
  window.editarMensagemSupabase = editarMensagemSupabase;
  window.apagarPraMimSupabase = apagarPraMimSupabase;
  window.apagarPraTodosSupabase = apagarPraTodosSupabase;
  window.sincronizarCardsNexSupabase = sincronizarCardsNexSupabase;

  document.addEventListener('DOMContentLoaded', async () => {
    await aguardarSupabase();
    console.log('☁️ 25-nex-supabase.js pronto');
  });

  console.log('💬 25-nex-supabase.js carregado');

})();