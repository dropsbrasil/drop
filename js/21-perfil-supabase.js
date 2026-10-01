/* ============================================
   21-PERFIL-SUPABASE.JS
   Sincroniza o perfil do usuário com o Supabase
   
   - Se o perfil NÃO existe no Supabase, cria.
   - Se JÁ existe, traz os dados de volta pro localStorage.
   
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

  async function sincronizar() {
    if (!window.supabaseClient) return;

    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return;

      const { data: perfil, error } = await window.supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
  console.error('Erro ao buscar perfil no Supabase:', error);
  return;
      }

      const username = localStorage.getItem('drops_username') || '';
      const userKey = username;

      if (perfil) {
  console.log('☁️ Perfil encontrado no Supabase. Sincronizando para o localStorage...');

  if (perfil.username) localStorage.setItem('drops_username', perfil.username);
  if (perfil.nome) localStorage.setItem('drops_nome', perfil.nome);

  const u = perfil.username || username;
  if (perfil.bio) localStorage.setItem('mydropsBio_' + u, perfil.bio);
  if (perfil.avatar_url) localStorage.setItem('mydropsAvatar_' + u, perfil.avatar_url);
  if (perfil.capa_url) localStorage.setItem('mydropsCover_' + u, perfil.capa_url);
  if (perfil.social_instagram) localStorage.setItem('mydropsSocialInstagram_' + u, perfil.social_instagram);
  if (perfil.social_tiktok) localStorage.setItem('mydropsSocialTiktok_' + u, perfil.social_tiktok);
  if (perfil.social_whatsapp) localStorage.setItem('mydropsSocialWhatsapp_' + u, perfil.social_whatsapp);

  // ============================================
  // ⚠️ CORREÇÃO: Se o avatar/capa do localStorage for base64
  // e o do Supabase estiver vazio, envia pro Supabase
  // ============================================

  const avatarLocal = localStorage.getItem('mydropsAvatar_' + u);
  if (
    avatarLocal &&
    avatarLocal.startsWith('data:image') &&
    !perfil.avatar_url
  ) {
    console.log('📤 Enviando avatar base64 para o Supabase...');
    try {
      const urlPublica = await window.uploadImagemSupabase?.('avatars', avatarLocal);
      if (urlPublica) {
        await window.supabaseClient
          .from('profiles')
          .update({ avatar_url: urlPublica })
          .eq('id', user.id);

        localStorage.setItem('mydropsAvatar_' + u, urlPublica);
        console.log('✅ Avatar enviado para o Supabase:', urlPublica);
      }
    } catch (err) {
      console.warn('Falha ao enviar avatar base64:', err);
    }
  }

  const capaLocal = localStorage.getItem('mydropsCover_' + u);
  if (
    capaLocal &&
    capaLocal.startsWith('data:image') &&
    !perfil.capa_url
  ) {
    console.log('📤 Enviando capa base64 para o Supabase...');
    try {
      const urlPublica = await window.uploadImagemSupabase?.('capas', capaLocal);
      if (urlPublica) {
        await window.supabaseClient
          .from('profiles')
          .update({ capa_url: urlPublica })
          .eq('id', user.id);

        localStorage.setItem('mydropsCover_' + u, urlPublica);
        console.log('✅ Capa enviada para o Supabase:', urlPublica);
      }
    } catch (err) {
      console.warn('Falha ao enviar capa base64:', err);
    }
  }

  if (typeof window.carregarDadosUsuarioMyDrops === 'function') {
    window.carregarDadosUsuarioMyDrops();
  }

  // Força atualização da capa no MyDrops
  const capaSalva = localStorage.getItem('mydropsCover_' + u);
  if (capaSalva) {
    const capaEl = document.querySelector('.mydrops-cover');
    if (capaEl) {
      capaEl.style.backgroundImage =
        `linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.70)), url('${capaSalva}')`;
      capaEl.style.backgroundSize = 'cover';
      capaEl.style.backgroundPosition = 'center';
    }
  }
} else {
        console.log('☁️ Perfil não existe. Criando no Supabase...');

        const { error: insertError } = await window.supabaseClient
          .from('profiles')
          .insert({
            id: user.id,
            username: username,
            nome: localStorage.getItem('drops_nome') || '',
            bio: localStorage.getItem('mydropsBio_' + userKey) || '',
            avatar_url: localStorage.getItem('mydropsAvatar_' + userKey) || '',
            capa_url: localStorage.getItem('mydropsCover_' + userKey) || '',
            social_instagram: localStorage.getItem('mydropsSocialInstagram_' + userKey) || '',
            social_tiktok: localStorage.getItem('mydropsSocialTiktok_' + userKey) || '',
            social_whatsapp: localStorage.getItem('mydropsSocialWhatsapp_' + userKey) || ''
          });

        if (insertError) {
  console.error('Erro ao criar perfil no Supabase:', insertError);
} else {
  console.log('✅ Perfil criado no Supabase!');
        }
      }
    } catch (erro) {
      console.error('Erro na sincronização com o Supabase:', erro);
    }
  }

async function uploadImagemSupabase(bucket, dataUrl) {
  if (!window.supabaseClient) return null;
  if (!dataUrl) return null;

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return null;

    // Converte base64 em Blob
    const resposta = await fetch(dataUrl);
    const blob = await resposta.blob();

    // Nome do arquivo: pasta_do_user/timestamp.png
    const extensao = blob.type.includes('png') ? 'png' : 'jpg';
    const nomeArquivo = `${user.id}/${Date.now()}.${extensao}`;

    // Faz upload (upsert = substitui se já existir)
    const { error: uploadError } = await window.supabaseClient.storage
      .from(bucket)
      .upload(nomeArquivo, blob, {
        contentType: blob.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      return null;
    }

    // Pega a URL pública
    const { data: urlData } = window.supabaseClient.storage
      .from(bucket)
      .getPublicUrl(nomeArquivo);

    console.log('☁️ Upload OK:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (erro) {
    console.error('Erro no upload da imagem:', erro);
    return null;
  }
}

    async function atualizarPerfilSupabase() {
    if (!window.supabaseClient) return;

    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return;

      const username = localStorage.getItem('drops_username') || '';
      const userKey = username;

      const { error } = await window.supabaseClient
        .from('profiles')
        .update({
          username: username,
          nome: localStorage.getItem('drops_nome') || '',
          bio: localStorage.getItem('mydropsBio_' + userKey) || '',
          avatar_url: localStorage.getItem('mydropsAvatar_' + userKey) || '',
          capa_url: localStorage.getItem('mydropsCover_' + userKey) || '',
          social_instagram: localStorage.getItem('mydropsSocialInstagram_' + userKey) || '',
          social_tiktok: localStorage.getItem('mydropsSocialTiktok_' + userKey) || '',
          social_whatsapp: localStorage.getItem('mydropsSocialWhatsapp_' + userKey) || '',
          atualizado_em: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao atualizar perfil no Supabase:', error);
      } else {
        console.log('☁️ Perfil atualizado no Supabase!');
      }
    } catch (erro) {
      console.error('Erro na atualização do perfil:', erro);
    }
  }

    // ============================================
  // BUSCAR PERFIL PÚBLICO DE OUTRO USUÁRIO
  // ============================================
  async function buscarPerfilPublicoSupabase(username) {
    if (!window.supabaseClient) return null;
    if (!username) return null;

    try {
      const { data, error } = await window.supabaseClient
        .rpc('buscar_perfil_por_username', {
          username_busca: String(username).replace(/^@/, '').trim()
        });

      if (error) {
        console.error('Erro ao buscar perfil público:', error);
        return null;
      }

      if (!data || !data.length) return null;

      return data[0];
    } catch (erro) {
      console.error('Erro ao buscar perfil público:', erro);
      return null;
    }
  }

  // ============================================
// HEARTBEAT: atualiza ultima_atividade
// ============================================
let heartbeatIntervaloNex = null;

async function enviarHeartbeatNex() {
  if (!window.supabaseClient) return;

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    const { error } = await window.supabaseClient
      .from('profiles')
      .update({ ultima_atividade: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.warn('Erro no heartbeat:', error);
    }
  } catch (err) {
    console.warn('Erro no heartbeat:', err);
  }
}

function iniciarHeartbeatNex() {
  if (heartbeatIntervaloNex) return;

  // Envia 1x imediatamente
  enviarHeartbeatNex();

  // Repete a cada 2 minutos
  heartbeatIntervaloNex = setInterval(enviarHeartbeatNex, 2 * 60 * 1000);

  // Atualiza também quando volta pro app
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      enviarHeartbeatNex();
    }
  });

  console.log('💓 Heartbeat iniciado');
}

window.sincronizarPerfilSupabase = sincronizar;
window.atualizarPerfilSupabase = atualizarPerfilSupabase;
window.uploadImagemSupabase = uploadImagemSupabase;
window.buscarPerfilPublicoSupabase = buscarPerfilPublicoSupabase;
window.enviarHeartbeatNex = enviarHeartbeatNex;
window.iniciarHeartbeatNex = iniciarHeartbeatNex;
  
  document.addEventListener('DOMContentLoaded', async () => {
  await aguardarSupabase();
  await sincronizar();
  iniciarHeartbeatNex();
});

  console.log('☁️ 21-perfil-supabase.js carregado');

})();