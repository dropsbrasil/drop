/* ============================================
   23-REACOES-SUPABASE.JS
   Reações (❤️ / 💔) sincronizadas com Supabase
   
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
  // BUSCAR REAÇÕES DE UMA PUBLICAÇÃO
  // ============================================
  async function buscarReacoesSupabase(publicacaoId) {
    if (!window.supabaseClient || !publicacaoId) {
      return { heart: 0, broken: 0, minhaReacao: '' };
    }

    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();

      const { data, error } = await window.supabaseClient
        .from('reacoes')
        .select('usuario_id, tipo')
        .eq('publicacao_id', publicacaoId);

      if (error) {
        console.error('Erro ao buscar reações:', error);
        return { heart: 0, broken: 0, minhaReacao: '' };
      }

      let heart = 0;
      let broken = 0;
      let minhaReacao = '';

      (data || []).forEach((r) => {
        if (r.tipo === 'heart') heart += 1;
        if (r.tipo === 'broken') broken += 1;

        if (user && r.usuario_id === user.id) {
          minhaReacao = r.tipo === 'heart' ? '❤️' : '💔';
        }
      });

      return { heart, broken, minhaReacao };
    } catch (erro) {
      console.error('Erro ao buscar reações:', erro);
      return { heart: 0, broken: 0, minhaReacao: '' };
    }
  }

  // ============================================
  // ALTERNAR REAÇÃO (toggle)
  // ============================================
  async function alternarReacaoSupabase(publicacaoId, emoji) {
  if (!window.supabaseClient || !publicacaoId || !emoji) return null;

  try {

    const { data: { user } } = await window.supabaseClient.auth.getUser();
if (!user) return null;

      const tipo = emoji === '💔' ? 'broken' : 'heart';

      // Busca se já existe reação desse usuário nessa publicação
      const { data: existente } = await window.supabaseClient
        .from('reacoes')
        .select('id, tipo')
        .eq('usuario_id', user.id)
        .eq('publicacao_id', publicacaoId);

      const listaExistente = existente || [];
      const mesmaReacao = listaExistente.find((r) => r.tipo === tipo);

      // Se já tem a mesma reação → remove (toggle)
      if (mesmaReacao) {
        const { error } = await window.supabaseClient
          .from('reacoes')
          .delete()
          .eq('id', mesmaReacao.id);

        if (error) {
          console.error('Erro ao remover reação:', error);
          return null;
        }
        return { acao: 'removida', tipo };
      }

      // Se tem outra reação → remove antes
if (listaExistente.length > 0) {
  await window.supabaseClient
    .from('reacoes')
    .delete()
    .eq('usuario_id', user.id)
    .eq('publicacao_id', publicacaoId);
}
    
      // Adiciona a nova reação
const { error: insertError } = await window.supabaseClient
  .from('reacoes')
  .insert({
    usuario_id: user.id,
    publicacao_id: publicacaoId,
    tipo
  });

if (insertError) {
  console.error('Erro ao inserir reação:', insertError);
  return null;
}

return { acao: 'adicionada', tipo };
    
    } catch (erro) {
      console.error('Erro ao alternar reação:', erro);
      return null;
    }
  }

// ============================================
// BUSCAR LISTA DE QUEM REAGIU (com nome/avatar)
// ============================================
async function buscarListaReacoesSupabase(publicacaoId, tipo) {
  if (!window.supabaseClient || !publicacaoId) return [];

  try {
    const { data, error } = await window.supabaseClient
      .from('reacoes')
      .select('usuario_id, tipo')
      .eq('publicacao_id', publicacaoId)
      .eq('tipo', tipo || 'heart');

    if (error) {
      console.error('Erro ao buscar lista de reações:', error);
      return [];
    }

    if (!data || !data.length) return [];

    // Busca perfis dos usuários
    const ids = data.map((r) => r.usuario_id);

    const { data: perfis } = await window.supabaseClient
      .from('profiles')
      .select('id, username, nome, avatar_url')
      .in('id', ids);

    const perfisMap = {};
    (perfis || []).forEach((p) => {
      perfisMap[p.id] = p;
    });

    return data.map((r) => {
      const p = perfisMap[r.usuario_id] || {};
      const nome = p.nome || p.username || 'Usuário';
      const avatar = p.avatar_url || nome.charAt(0).toUpperCase();

      return {
        nome,
        username: p.username || '',
        avatar
      };
    });
  } catch (erro) {
    console.error('Erro ao buscar lista de reações:', erro);
    return [];
  }
}

// ============================================
// EXPÕE GLOBALMENTE
// ============================================
window.buscarReacoesSupabase = buscarReacoesSupabase;
window.alternarReacaoSupabase = alternarReacaoSupabase;
window.buscarListaReacoesSupabase = buscarListaReacoesSupabase;
  
  document.addEventListener('DOMContentLoaded', async () => {
    await aguardarSupabase();
    console.log('☁️ 23-reacoes-supabase.js pronto');
  });

  console.log('❤️ 23-reacoes-supabase.js carregado');
})();