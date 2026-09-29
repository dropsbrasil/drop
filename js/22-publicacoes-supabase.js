/* ============================================
   22-PUBLICACOES-SUPABASE.JS
   Publicações (drops) no Supabase

   - Upload de mídia pro Storage
   - Criar / buscar / apagar publicações no banco
   
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
  // UPLOAD DE MÍDIA (foto ou vídeo)
  // ============================================
  async function uploadMidiaDropsSupabase(dataUrl) {
    if (!window.supabaseClient || !dataUrl) return null;

    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return null;

      const resposta = await fetch(dataUrl);
      const blob = await resposta.blob();

      const extensao = blob.type.includes('video') ? 'mp4'
                    : blob.type.includes('png') ? 'png'
                    : 'jpg';

      const nomeArquivo = `${user.id}/${Date.now()}.${extensao}`;

      const { error: uploadError } = await window.supabaseClient.storage
        .from('drops')
        .upload(nomeArquivo, blob, {
          contentType: blob.type,
          upsert: true
        });

      if (uploadError) {
        console.error('Erro no upload do drop:', uploadError);
        return null;
      }

      const { data: urlData } = window.supabaseClient.storage
        .from('drops')
        .getPublicUrl(nomeArquivo);

      console.log('☁️ Drop enviado:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (erro) {
      console.error('Erro no upload do drop:', erro);
      return null;
    }
  }

  // ============================================
  // CRIAR PUBLICAÇÃO NO BANCO
  // ============================================
  async function criarPublicacaoSupabase(publicacao) {
    if (!window.supabaseClient) return null;

    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return null;

      const username = localStorage.getItem('drops_username') || '';

      const { data, error } = await window.supabaseClient
        .from('publicacoes')
        .insert({
          autor_id: user.id,
          autor_username: username,
          tipo: publicacao.tipo || 'foto',
          media_url: publicacao.mediaUrl || '',
          legenda: publicacao.legenda || '',
          loop: publicacao.loop === true,
          duracao: publicacao.duracao || '24h',
          expira_em: publicacao.expiraEm || null
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar publicação:', error);
        return null;
      }

      console.log('✅ Publicação criada:', data.id);
      return data;
    } catch (erro) {
      console.error('Erro ao criar publicação:', erro);
      return null;
    }
  }

  // ============================================
  // BUSCAR PUBLICAÇÕES DO USUÁRIO
  // ============================================
  async function buscarMinhasPublicacoesSupabase() {
    if (!window.supabaseClient) return [];

    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return [];

      const { data, error } = await window.supabaseClient
        .from('publicacoes')
        .select('*')
        .eq('autor_id', user.id)
        .order('criado_em', { ascending: false });

      if (error) {
        console.error('Erro ao buscar publicações:', error);
        return [];
      }

      // Filtra expiradas
      const agora = Date.now();
      return (data || []).filter((p) => {
        if (!p.expira_em) return true;
        return new Date(p.expira_em).getTime() > agora;
      });
    } catch (erro) {
      console.error('Erro ao buscar publicações:', erro);
      return [];
    }
  }

  // ============================================
  // BUSCAR PUBLICAÇÕES DE TODOS (para Nearby)
  // ============================================
  async function buscarTodasPublicacoesSupabase(limite = 50) {
    if (!window.supabaseClient) return [];

    try {
      const { data, error } = await window.supabaseClient
        .from('publicacoes')
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(limite);

      if (error) {
        console.error('Erro ao buscar publicações gerais:', error);
        return [];
      }

      const agora = Date.now();
      return (data || []).filter((p) => {
        if (!p.expira_em) return true;
        return new Date(p.expira_em).getTime() > agora;
      });
    } catch (erro) {
      console.error('Erro ao buscar publicações gerais:', erro);
      return [];
    }
  }

  // ============================================
  // APAGAR PUBLICAÇÃO
  // ============================================
  async function apagarPublicacaoSupabase(id) {
    if (!window.supabaseClient || !id) return false;

    try {
      const { error } = await window.supabaseClient
        .from('publicacoes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao apagar publicação:', error);
        return false;
      }

      console.log('🗑️ Publicação apagada:', id);
      return true;
    } catch (erro) {
      console.error('Erro ao apagar publicação:', erro);
      return false;
    }
  }

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================
  window.uploadMidiaDropsSupabase = uploadMidiaDropsSupabase;
  window.criarPublicacaoSupabase = criarPublicacaoSupabase;
  window.buscarMinhasPublicacoesSupabase = buscarMinhasPublicacoesSupabase;
  window.buscarTodasPublicacoesSupabase = buscarTodasPublicacoesSupabase;
  window.apagarPublicacaoSupabase = apagarPublicacaoSupabase;

  document.addEventListener('DOMContentLoaded', async () => {
    await aguardarSupabase();
    console.log('☁️ 22-publicacoes-supabase.js pronto');
  });

  console.log('📸 22-publicacoes-supabase.js carregado');

})();