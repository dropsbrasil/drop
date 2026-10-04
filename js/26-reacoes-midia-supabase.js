/* ============================================
   26-REACOES-MIDIA-SUPABASE.JS
   Reações ❤️/💔 em mídias do chat NEX
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

  // Cache local: 'msgId::index' → { heart, broken, minhaReacao }
  window.__reacoesMidiaCacheNex = window.__reacoesMidiaCacheNex || {};

  // ============================================
  // BUSCAR REAÇÕES DE UMA MÍDIA
  // ============================================
  async function buscarReacoesMidiaNex(mensagemId, midiaIndex = 0) {
    const vazio = { heart: 0, broken: 0, minhaReacao: '' };

    if (!window.supabaseClient || !mensagemId) return vazio;

    try {
      const { data: { user } } =
        await window.supabaseClient.auth.getUser();

      const { data, error } = await window.supabaseClient
        .from('reacoes_midia')
        .select('usuario_id, tipo')
        .eq('mensagem_id', mensagemId)
        .eq('midia_index', midiaIndex);

      if (error) {
        console.warn('Erro ao buscar reações de mídia:', error);
        return vazio;
      }

      let heart = 0;
      let broken = 0;
      let minhaReacao = '';

      (data || []).forEach((r) => {
        if (r.tipo === 'heart') heart += 1;
        if (r.tipo === 'broken') broken += 1;

        if (user && r.usuario_id === user.id) {
          minhaReacao = r.tipo === 'heart' ? 'heart' : 'broken';
        }
      });

      const resultado = { heart, broken, minhaReacao };

      window.__reacoesMidiaCacheNex[
        `${mensagemId}::${midiaIndex}`
      ] = resultado;

      return resultado;
    } catch (err) {
      console.warn('Erro ao buscar reações de mídia:', err);
      return vazio;
    }
  }

  // ============================================
  // ALTERNAR REAÇÃO (toggle)
  // ============================================
  async function alternarReacaoMidiaNex(mensagemId, midiaIndex, tipo) {
  if (!window.supabaseClient) {
    console.warn('❌ supabaseClient não existe');
    return null;
  }

  if (!mensagemId) {
    console.warn('❌ mensagemId vazio');
    return null;
  }

  if (!tipo) {
    console.warn('❌ tipo vazio');
    return null;
  }

  try {
    const { data: { user } } =
      await window.supabaseClient.auth.getUser();

    if (!user) {
      console.warn('❌ usuário não logado');
      return null;
    }

    const tipoLimpo = tipo === 'broken' ? 'broken' : 'heart';
    const indexLimpo = Number(midiaIndex) || 0;

    console.log('🎯 Tentando reagir:', {
      mensagemId,
      midiaIndex: indexLimpo,
      tipo: tipoLimpo,
      usuario: user.id
    });

    // Busca reação existente
    const { data: existente, error: erroSelect } = await window.supabaseClient
      .from('reacoes_midia')
      .select('id, tipo')
      .eq('mensagem_id', mensagemId)
      .eq('midia_index', indexLimpo)
      .eq('usuario_id', user.id);

    if (erroSelect) {
      console.error('❌ Erro no SELECT:', erroSelect);
      window.mostrarToastNex?.('Erro SELECT: ' + erroSelect.message, 'erro');
      return null;
    }

    const lista = existente || [];
    const mesma = lista.find((r) => r.tipo === tipoLimpo);

    // Toggle: remove
    if (mesma) {
      const { error: erroDel } = await window.supabaseClient
        .from('reacoes_midia')
        .delete()
        .eq('id', mesma.id);

      if (erroDel) {
        console.error('❌ Erro DELETE:', erroDel);
        window.mostrarToastNex?.('Erro DELETE: ' + erroDel.message, 'erro');
        return null;
      }

      console.log('✅ Reação removida');
      return { acao: 'removida', tipo: tipoLimpo };
    }

    // Remove outras
    if (lista.length > 0) {
      await window.supabaseClient
        .from('reacoes_midia')
        .delete()
        .eq('mensagem_id', mensagemId)
        .eq('midia_index', indexLimpo)
        .eq('usuario_id', user.id);
    }

    // Insere
    const { error: erroInsert } = await window.supabaseClient
      .from('reacoes_midia')
      .insert({
        mensagem_id: mensagemId,
        midia_index: indexLimpo,
        usuario_id: user.id,
        tipo: tipoLimpo
      });

    if (erroInsert) {
      console.error('❌ Erro INSERT:', erroInsert);
      window.mostrarToastNex?.('Erro: ' + erroInsert.message, 'erro');
      return null;
    }

    console.log('✅ Reação adicionada');
    return { acao: 'adicionada', tipo: tipoLimpo };
  } catch (err) {
    console.error('❌ Erro catch:', err);
    window.mostrarToastNex?.('Erro: ' + (err.message || 'desconhecido'), 'erro');
    return null;
  }
  }
  // ============================================
  // REALTIME
  // ============================================
  let canalReacoesMidiaNex = null;

  async function iniciarRealtimeReacoesMidiaNex() {
    if (!window.supabaseClient || canalReacoesMidiaNex) return;

    try {
      const { data: { user } } =
        await window.supabaseClient.auth.getUser();
      if (!user) return;

      canalReacoesMidiaNex = window.supabaseClient
        .channel('nex-reacoes-midia')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reacoes_midia'
          },
          async (payload) => {
            const registro = payload.new || payload.old;
            if (!registro) return;

            const msgId = registro.mensagem_id;
            const idx = registro.midia_index || 0;
            const chave = `${msgId}::${idx}`;

            // Limpa do cache
            delete window.__reacoesMidiaCacheNex[chave];

            // Rebusca e atualiza UI
            await buscarReacoesMidiaNex(msgId, idx);

            // Atualiza o badge no chat
            if (typeof window.atualizarBadgeReacaoMidiaNex === 'function') {
              window.atualizarBadgeReacaoMidiaNex(msgId, idx);
            }

            // Atualiza o viewer se estiver aberto
            if (typeof window.atualizarBotoesReacaoViewerNex === 'function') {
              window.atualizarBotoesReacaoViewerNex();
            }
          }
        )
        .subscribe((status) => {
          console.log('📡 Realtime reações mídia:', status);
        });
    } catch (err) {
      console.warn('Erro ao iniciar Realtime de reações de mídia:', err);
    }
  }

  // ============================================
  // EXPÕE
  // ============================================
  window.buscarReacoesMidiaNex = buscarReacoesMidiaNex;
  window.alternarReacaoMidiaNex = alternarReacaoMidiaNex;
  window.iniciarRealtimeReacoesMidiaNex = iniciarRealtimeReacoesMidiaNex;

  document.addEventListener('DOMContentLoaded', async () => {
    await aguardarSupabase();
    console.log('❤️ 26-reacoes-midia-supabase.js pronto');
  });

  console.log('❤️ 26-reacoes-midia-supabase.js carregado');
})();