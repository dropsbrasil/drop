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

  window.sincronizarPerfilSupabase = sincronizar;
  window.atualizarPerfilSupabase = atualizarPerfilSupabase;

  document.addEventListener('DOMContentLoaded', async () => {
    await aguardarSupabase();
    await sincronizar();
  });

  console.log('☁️ 21-perfil-supabase.js carregado');

})();