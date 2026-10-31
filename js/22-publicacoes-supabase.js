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
// UPLOAD DE MÍDIA (foto ou vídeo) — AGORA NO CLOUDFLARE R2
// ============================================
async function uploadMidiaDropsSupabase(dataUrl) {
  if (!window.supabaseClient || !dataUrl) return null;

  try {
    // 1) Pega a sessão atual (o JWT é usado pela Edge Function pra validar)
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (!session || !session.access_token) {
      console.warn('uploadMidiaDropsSupabase: sem sessão ativa');
      return null;
    }

    // 2) Transforma a fonte em Blob (aceita File, Blob, blob: URL ou dataURL)
    let blob = null;

    if (dataUrl instanceof File || dataUrl instanceof Blob) {
      blob = dataUrl;
    } else if (typeof dataUrl === 'string') {
      const resposta = await fetch(dataUrl);
      blob = await resposta.blob();
    }

    if (!blob || blob.size === 0) {
      console.warn('uploadMidiaDropsSupabase: blob inválido');
      return null;
    }

    const contentType = blob.type || 'application/octet-stream';
    const size = blob.size;

    // 3) Pede a URL assinada pra Edge Function
    const supabaseUrl = 'https://sldiecaaplwgjxvfsdnq.supabase.co';
    const endpoint = `${supabaseUrl}/functions/v1/Gerar-url-r2`;

    const respostaAssinatura = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        folder: 'drops',
        contentType: contentType,
        size: size
      })
    });

    if (!respostaAssinatura.ok) {
  const textoErro = await respostaAssinatura.text().catch(() => '');
  console.error('Erro ao pedir URL assinada:', respostaAssinatura.status, textoErro);
  return null;
    }

    const dados = await respostaAssinatura.json();

    if (!dados || !dados.uploadUrl || !dados.publicUrl) {
      console.error('Edge Function não devolveu uploadUrl/publicUrl:', dados);
      return null;
    }

    // 4) Faz o PUT direto no Cloudflare R2
    const uploadR2 = await fetch(dados.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob
    });

    if (!uploadR2.ok) {
      const textoErro = await uploadR2.text().catch(() => '');
      console.error('Erro no PUT pro R2:', uploadR2.status, textoErro);
      return null;
    }

    console.log('☁️ Drop enviado pro R2:', dados.publicUrl);
    return dados.publicUrl;
  } catch (erro) {
    console.error('Erro no upload do drop pro R2:', erro);
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

            // ⚠️ Pega a localização atual do autor no momento do post
      const autorLat = typeof window.minhaLatitudeAtual === 'number' 
        ? window.minhaLatitudeAtual 
        : null;
      const autorLng = typeof window.minhaLongitudeAtual === 'number' 
        ? window.minhaLongitudeAtual 
        : null;

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
  selos: publicacao.selos || null,
  autor_lat: autorLat,
  autor_lng: autorLng
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
  selos: p.selos || null,

  // ⚠️ AJUSTE 1 — dados do autor original (drop compartilhado)
  compartilhado_de_id: p.compartilhado_de_id || null,
  compartilhado_de_username: p.compartilhado_de_username || '',
  compartilhado_de_nome: p.compartilhado_de_nome || '',
  compartilhado_de_avatar: p.compartilhado_de_avatar || ''
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
// BUSCAR PERFIS COM DROPS (Nearby otimizado)
// ============================================

async function buscarPerfisComDropsProximosSupabase(
  minhaLat,
  minhaLng,
  raioKm,
  limite = 50
) {
  if (!window.supabaseClient) return [];

  try {
    const { data, error } = await window.supabaseClient.rpc(
      'buscar_perfis_com_drops_proximos',
      {
        minha_lat: minhaLat,
        minha_lng: minhaLng,
        raio_km: raioKm,
        limite: limite
      }
    );

    if (error) {
      console.warn('Erro ao buscar perfis próximos:', error);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Erro ao buscar perfis próximos:', err);
    return [];
  }
}

// ============================================
// COMPARTILHAR PUBLICAÇÃO
// ============================================
// Cria uma nova publicação apontando pra original.
// Regras:
//   - 1 compartilhamento por usuário por publicação
//   - Não pode compartilhar próprio drop
//   - Mesma URL do Storage (sem duplicar)
//   - Mesma validade (expira_em) do original
// ============================================

async function compartilharPublicacaoSupabase(publicacaoOriginalId) {
  if (!window.supabaseClient || !publicacaoOriginalId) {
    return { erro: 'sem_dados' };
  }

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return { erro: 'sem_usuario' };

    // 1) Já compartilhou?
    const { data: existente } = await window.supabaseClient
      .from('compartilhamentos')
      .select('id')
      .eq('publicacao_original_id', publicacaoOriginalId)
      .eq('usuario_id', user.id)
      .maybeSingle();

    if (existente) return { erro: 'ja_compartilhado' };

    // 2) Busca a original
    const { data: original, error: erroOriginal } = await window.supabaseClient
      .from('publicacoes')
      .select('*')
      .eq('id', publicacaoOriginalId)
      .maybeSingle();

    if (erroOriginal || !original) return { erro: 'original_nao_encontrado' };

    // 3) Não pode ser o próprio drop
    if (original.autor_id === user.id) return { erro: 'proprio_drop' };

    // 4) Autor original
    const { data: autorOriginal } = await window.supabaseClient
      .from('profiles')
      .select('username, nome, avatar_url')
      .eq('id', original.autor_id)
      .maybeSingle();

    const usernameAtual = localStorage.getItem('drops_username') || '';

    // 5) Cria a nova publicação (compartilhada)
    const { data: nova, error: erroInsert } = await window.supabaseClient
      .from('publicacoes')
      .insert({
        autor_id: user.id,
        autor_username: usernameAtual,
        tipo: original.tipo,
        media_url: original.media_url,
        legenda: original.legenda || '',
        loop: original.loop === true,
        duracao: original.duracao || '24h',
        expira_em: original.expira_em,
        selos: null,
        compartilhado_de_id: original.id,
        compartilhado_de_username: autorOriginal?.username || '',
        compartilhado_de_nome: autorOriginal?.nome || '',
        compartilhado_de_avatar: autorOriginal?.avatar_url || ''
      })
      .select()
      .single();

    if (erroInsert || !nova) {
  console.warn('Erro ao criar compartilhamento:', erroInsert);
  return {
    erro: 'falha_insert',
    detalhe: erroInsert?.message || 'sem detalhe',
    codigo: erroInsert?.code || 'sem codigo'
  };
    }

    // 6) Registra na tabela de compartilhamentos
    const { error: erroReg } = await window.supabaseClient
      .from('compartilhamentos')
      .insert({
        publicacao_original_id: original.id,
        publicacao_compartilhada_id: nova.id,
        usuario_id: user.id
      });

    if (erroReg) {
  // Rollback
  await window.supabaseClient.from('publicacoes').delete().eq('id', nova.id);
  return {
    erro: 'falha_registro',
    detalhe: erroReg.message || 'sem detalhe',
    codigo: erroReg.code || 'sem codigo'
  };
    }

    console.log('🔁 Drop compartilhado com sucesso:', nova.id);
    return { ok: true, publicacao: nova };
  } catch (err) {
    console.warn('Erro ao compartilhar (catch):', err);
    return { erro: 'erro_desconhecido' };
  }
}

async function jaCompartilhouSupabase(publicacaoOriginalId) {
  if (!window.supabaseClient || !publicacaoOriginalId) return false;

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return false;

    const { data } = await window.supabaseClient
      .from('compartilhamentos')
      .select('id')
      .eq('publicacao_original_id', publicacaoOriginalId)
      .eq('usuario_id', user.id)
      .maybeSingle();

    return !!data;
  } catch (err) {
    return false;
  }
}

// ============================================
// FASE 3 — CONTAR COMPARTILHAMENTOS
// ============================================
// Retorna o total de compartilhamentos de uma publicação.
// Como cada usuário só compartilha 1x, o total = pessoas únicas.

async function contarCompartilhamentosSupabase(publicacaoId) {
  if (!window.supabaseClient || !publicacaoId) return 0;

  try {
    const { count, error } = await window.supabaseClient
      .from('compartilhamentos')
      .select('id', { count: 'exact', head: true })
      .eq('publicacao_original_id', publicacaoId);

    if (error) {
      console.warn('Erro ao contar compartilhamentos:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.warn('Erro ao contar compartilhamentos:', err);
    return 0;
  }
}

// ============================================
// EXPÕE GLOBALMENTE
// ============================================

window.uploadMidiaDropsSupabase = uploadMidiaDropsSupabase;
window.buscarPerfisComDropsProximosSupabase =
  buscarPerfisComDropsProximosSupabase;
window.criarPublicacaoSupabase = criarPublicacaoSupabase;
window.buscarMinhasPublicacoesSupabase = buscarMinhasPublicacoesSupabase;
window.buscarTodasPublicacoesSupabase = buscarTodasPublicacoesSupabase;
window.buscarDropsDoUsuarioSupabase = buscarDropsDoUsuarioSupabase;
window.buscarTodosOsDropsComAutor = buscarTodosOsDropsComAutor;
window.apagarPublicacaoSupabase = apagarPublicacaoSupabase;
window.compartilharPublicacaoSupabase = compartilharPublicacaoSupabase;
window.jaCompartilhouSupabase = jaCompartilhouSupabase;
window.contarCompartilhamentosSupabase = contarCompartilhamentosSupabase;
  
  document.addEventListener('DOMContentLoaded', async () => {
    await aguardarSupabase();
    console.log('☁️ 22-publicacoes-supabase.js pronto');
  });

  console.log('📸 22-publicacoes-supabase.js carregado');

})();