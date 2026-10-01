/* ============================================
   24-VISUALIZACOES-SUPABASE.JS
   Visualizações sincronizadas com Supabase
   
   Regra: 1 visualização por usuário por publicação
   
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
  // REGISTRAR VISUALIZAÇÃO
  // ============================================
  // Se já existe, ignora (unique constraint + upsert)
  async function registrarVisualizacaoSupabase(publicacaoId) {
    if (!window.supabaseClient || !publicacaoId) return null;

    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return null;

      const { error } = await window.supabaseClient
        .from('visualizacoes')
        .insert({
          usuario_id: user.id,
          publicacao_id: publicacaoId
        });

      // Se já existe, ignora (não é erro real)
      if (error && error.code !== '23505') {
        console.warn('Erro ao registrar visualização:', error);
        return null;
      }

      return { ok: true };
    } catch (erro) {
      console.warn('Erro ao registrar visualização:', erro);
      return null;
    }
  }

  // ============================================
  // BUSCAR CONTAGEM DE VISUALIZAÇÕES
  // ============================================
  async function buscarVisualizacoesSupabase(publicacaoId) {
    if (!window.supabaseClient || !publicacaoId) return 0;

    try {
      const { count, error } = await window.supabaseClient
        .from('visualizacoes')
        .select('id', { count: 'exact', head: true })
        .eq('publicacao_id', publicacaoId);

      if (error) {
        console.error('Erro ao contar visualizações:', error);
        return 0;
      }

      return count || 0;
    } catch (erro) {
      console.error('Erro ao contar visualizações:', erro);
      return 0;
    }
  }

  // ============================================
  // BUSCAR LISTA DE QUEM VIU (com nome/avatar)
  // ============================================
  async function buscarListaVisualizacoesSupabase(publicacaoId) {
    if (!window.supabaseClient || !publicacaoId) return [];

    try {
      const { data, error } = await window.supabaseClient
        .from('visualizacoes')
        .select('usuario_id, criado_em')
        .eq('publicacao_id', publicacaoId)
        .order('criado_em', { ascending: false });

      if (error) {
        console.error('Erro ao buscar lista de visualizações:', error);
        return [];
      }

      if (!data || !data.length) return [];

      const ids = data.map((v) => v.usuario_id);

      const { data: perfis } = await window.supabaseClient
        .from('profiles')
        .select('id, username, nome, avatar_url')
        .in('id', ids);

      const perfisMap = {};
      (perfis || []).forEach((p) => {
        perfisMap[p.id] = p;
      });

      return data.map((v) => {
        const p = perfisMap[v.usuario_id] || {};
        const nome = p.nome || p.username || 'Usuário';
        const avatar = p.avatar_url || nome.charAt(0).toUpperCase();

        return {
          nome,
          username: p.username || '',
          avatar
        };
      });
    } catch (erro) {
      console.error('Erro ao buscar lista de visualizações:', erro);
      return [];
    }
  }

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================
  window.registrarVisualizacaoSupabase = registrarVisualizacaoSupabase;
  window.buscarVisualizacoesSupabase = buscarVisualizacoesSupabase;
  window.buscarListaVisualizacoesSupabase = buscarListaVisualizacoesSupabase;

  document.addEventListener('DOMContentLoaded', async () => {
    await aguardarSupabase();
    console.log('☁️ 24-visualizacoes-supabase.js pronto');
  });

  console.log('👁️ 24-visualizacoes-supabase.js carregado');
})();