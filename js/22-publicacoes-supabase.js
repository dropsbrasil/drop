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
  expira_em: publicacao.expiraEm || null,
  selos: publicacao.selos || null
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
// BUSCAR PUBLICAÇÕES DE UM USUÁRIO ESPECÍFICO
// ============================================
async function buscarDropsDoUsuarioSupabase(usuarioId) {
  if (!window.supabaseClient || !usuarioId) return [];

  try {
    const { data, error } = await window.supabaseClient
      .from('publicacoes')
      .select('*')
      .eq('autor_id', usuarioId)
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('Erro ao buscar drops do usuário:', error);
      return [];
    }

    // Filtra expiradas e converte pro formato usado no perfil
    const agora = Date.now();

    return (data || [])
      .filter((p) => {
        if (!p.expira_em) return true;
        return new Date(p.expira_em).getTime() > agora;
      })
      .map((p) => ({
  id: p.id,
  type: p.tipo === 'video' ? 'video' : 'image',
  url: p.media_url,
  legenda: p.legenda || '',
  criadoEm: new Date(p.criado_em).getTime(),
  expiraEm: p.expira_em,
  duracao: p.duracao,
  selos: p.selos || null
}));
  } catch (erro) {
    console.error('Erro ao buscar drops do usuário:', erro);
    return [];
  }
}

// ============================================
// BUSCAR TODOS OS DROPS COM DADOS DO AUTOR
// ============================================
async function buscarTodosOsDropsComAutor(limite = 50) {
  if (!window.supabaseClient) return [];

  try {
    const { data, error } = await window.supabaseClient
      .from('publicacoes')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(limite);

    if (error) {
      console.error('Erro ao buscar drops:', error);
      return [];
    }

    const agora = Date.now();

    // Filtra expiradas e converte pro formato de cartão
    const dropsValidos = (data || []).filter((p) => {
      if (!p.expira_em) return true;
      return new Date(p.expira_em).getTime() > agora;
    });

    // Busca os perfis dos autores de uma vez
    const idsAutores = [...new Set(dropsValidos.map((p) => p.autor_id))];

    let perfisMap = {};

    if (idsAutores.length) {
      const { data: perfis } = await window.supabaseClient
  .from('profiles')
  .select('id, nome, username, avatar_url, ultima_atividade, lat, lng')
  .in('id', idsAutores);

      (perfis || []).forEach((p) => {
        perfisMap[p.id] = p;
      });
    }

    // Monta lista final
    return dropsValidos.map((drop) => {
      const autor = perfisMap[drop.autor_id] || {};

      return {
        id: drop.id,
        mediaUrl: drop.media_url,
        tipo: drop.tipo === 'video' ? 'video' : 'image',
        legenda: drop.legenda || '',
        criadoEm: new Date(drop.criado_em).getTime(),
        expiraEm: drop.expira_em,
        duracao: drop.duracao,

            autorId: drop.autor_id,
  autorUsername: autor.username || drop.autor_username || 'usuario',
  autorNome: autor.nome || 'Usuário',
  autorAvatar: autor.avatar_url || null,
  autorUltimaAtividade: autor.ultima_atividade || null,
      autorLat: autor.lat || null,
    autorLng: autor.lng || null,
    selos: drop.selos || null
  };
});
  } catch (erro) {
    console.error('Erro ao buscar drops com autor:', erro);
    return [];
  }
}

// ============================================
// EXPÕE GLOBALMENTE
// ============================================
window.uploadMidiaDropsSupabase = uploadMidiaDropsSupabase;
window.criarPublicacaoSupabase = criarPublicacaoSupabase;
window.buscarMinhasPublicacoesSupabase = buscarMinhasPublicacoesSupabase;
window.buscarTodasPublicacoesSupabase = buscarTodasPublicacoesSupabase;
window.buscarDropsDoUsuarioSupabase = buscarDropsDoUsuarioSupabase;
window.buscarTodosOsDropsComAutor = buscarTodosOsDropsComAutor;
window.apagarPublicacaoSupabase = apagarPublicacaoSupabase;

  document.addEventListener('DOMContentLoaded', async () => {
    await aguardarSupabase();
    console.log('☁️ 22-publicacoes-supabase.js pronto');
  });

  console.log('📸 22-publicacoes-supabase.js carregado');

})();