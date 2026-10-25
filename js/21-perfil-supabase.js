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

async function uploadImagemSupabase(bucket, fonte) {
  if (!window.supabaseClient || !fonte) return null;

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return null;

    // Aceita File, Blob ou dataURL
    let blob = null;
    if (fonte instanceof File || fonte instanceof Blob) {
      blob = fonte;
    } else if (typeof fonte === 'string' && fonte.startsWith('data:')) {
      const resp = await fetch(fonte);
      blob = await resp.blob();
    } else {
      console.warn('uploadImagemSupabase: tipo de fonte não suportado');
      return null;
    }

    // ⚠️ NOME FIXO — sobrescreve ao trocar (sem acumular)
    const nomeBase = bucket === 'avatars' ? 'avatar' : 'capa';
    const nomeArquivo = `${user.id}/${nomeBase}.jpg`;

    const { error: uploadError } = await window.supabaseClient.storage
      .from(bucket)
      .upload(nomeArquivo, blob, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '31536000'
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      return null;
    }

    const configTransform = bucket === 'avatars'
      ? { width: 200, height: 200, resize: 'cover', quality: 75 }
      : { width: 800, quality: 75 };

    const { data: urlData } = window.supabaseClient.storage
      .from(bucket)
      .getPublicUrl(nomeArquivo, { transform: configTransform });

    // ⚠️ Cache buster — força o navegador a buscar versão nova
    const urlFinal =
      urlData.publicUrl +
      (urlData.publicUrl.includes('?') ? '&' : '?') +
      'v=' + Date.now();

    console.log('☁️ Upload OK:', urlFinal);
    return urlFinal;
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
        
        // ⚠️ Novos campos de estilo da Bio
        bio_fonte: localStorage.getItem('mydropsBioFont_' + userKey) || '',
        bio_cor: localStorage.getItem('mydropsBioColor_' + userKey) || '',
        bio_alinhamento: localStorage.getItem('mydropsBioAlign_' + userKey) || '',
        
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

  // ⚠️ OTIMIZAÇÃO DE COTA: 5 minutos em vez de 60s
heartbeatIntervaloNex = setInterval(enviarHeartbeatNex, 5 * 60 * 1000);

// ⚠️ Pausa quando o app vai para segundo plano e retoma ao voltar
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInterval(heartbeatIntervaloNex);
    heartbeatIntervaloNex = null;
  } else {
    enviarHeartbeatNex();
    if (!heartbeatIntervaloNex) {
      heartbeatIntervaloNex = setInterval(enviarHeartbeatNex, 5 * 60 * 1000);
    }
  }
});

// ⚠️ Cooldown de 5 minutos na interação
let ultimoEnvioInteracao = 0;
const handlerInteracao = () => {
  const agora = Date.now();
  if (agora - ultimoEnvioInteracao < 5 * 60 * 1000) return;
  ultimoEnvioInteracao = agora;
  if (!document.hidden) enviarHeartbeatNex();
};

  ['click', 'keydown', 'touchstart'].forEach((evt) => {
    document.addEventListener(evt, handlerInteracao, { passive: true });
  });

  console.log('💓 Heartbeat iniciado (60s, com pausa em background)');
}

// ============================================
// SALVAR LOCALIZAÇÃO (lat/lng) no Supabase
// ============================================
async function salvarLocalizacaoSupabase(lat, lng) {
  if (!window.supabaseClient) return false;
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return false;

    const { error } = await window.supabaseClient
      .from('profiles')
      .update({
        lat,
        lng,
        localizacao_atualizada_em: new Date().toISOString()
      })
      .eq('id', user.id);

    if (error) {
      console.warn('Erro ao salvar localização:', error);
      return false;
    }

    console.log('📍 Localização salva:', lat, lng);
    return true;
  } catch (err) {
    console.warn('Erro ao salvar localização:', err);
    return false;
  }
}

window.sincronizarPerfilSupabase = sincronizar;
window.atualizarPerfilSupabase = atualizarPerfilSupabase;
window.uploadImagemSupabase = uploadImagemSupabase;
window.buscarPerfilPublicoSupabase = buscarPerfilPublicoSupabase;
window.enviarHeartbeatNex = enviarHeartbeatNex;
window.iniciarHeartbeatNex = iniciarHeartbeatNex;
window.salvarLocalizacaoSupabase = salvarLocalizacaoSupabase;

// ============================================
// MURAL — salvar e buscar no Supabase
// ============================================
// ============================================
// MURAL — contribuir, buscar e limpar
// ============================================

// Salva uma contribuição no mural de alguém
async function salvarMuralSupabase(usernameDono, dados) {
  if (!window.supabaseClient) return false;
  if (!dados || typeof dados !== 'object') return false;
  if (!usernameDono) return false;

  try {
    const { error } = await window.supabaseClient
      .rpc('contribuir_mural', {
        username_dono: String(usernameDono).replace(/^@/, '').trim(),
        dados_novos: dados
      });

    if (error) {
      console.warn('Erro ao contribuir no mural:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Erro ao contribuir no mural:', err);
    return false;
  }
}

// Busca TODAS as contribuições do mural de alguém
async function buscarMuralSupabase(username) {
  if (!window.supabaseClient || !username) return [];

  try {
    const { data, error } = await window.supabaseClient
      .rpc('ler_mural_completo', {
        username_dono: String(username).replace(/^@/, '').trim()
      });

    if (error) {
      console.warn('Erro ao buscar mural:', error);
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Erro ao buscar mural:', err);
    return [];
  }
}

// Limpa o mural inteiro (só o dono pode)
async function limparMuralSupabase(usernameDono) {
  if (!window.supabaseClient || !usernameDono) return false;

  try {
    const { error } = await window.supabaseClient
      .rpc('limpar_mural_completo', {
        username_dono: String(usernameDono).replace(/^@/, '').trim()
      });

    if (error) {
      console.warn('Erro ao limpar mural:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Erro ao limpar mural:', err);
    return false;
  }
}

window.salvarMuralSupabase = salvarMuralSupabase;
window.buscarMuralSupabase = buscarMuralSupabase;
window.limparMuralSupabase = limparMuralSupabase;
  
  // ============================================
// SYNC ABSOLUTO NO BOOT (Zero Cache)
// ============================================
async function sincronizarTudoNoBootNex() {
  if (!window.supabaseClient) return;

  // 1. Mostra um Loader Global para o usuário saber que está buscando
  let loader = document.getElementById('bootLoaderNex');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'bootLoaderNex';
    loader.style.cssText = 'position:fixed;inset:0;background:#050b18;z-index:999999;display:flex;align-items:center;justify-content:center;color:#2f8cff;font-weight:900;font-size:16px;flex-direction:column;gap:16px;';
    loader.innerHTML = `
      <svg class="spin" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
      </svg>
      <style>@keyframes spin { 100% { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }</style>
      Sincronizando dados...
    `;
    document.body.appendChild(loader);
  }

  try {
    // 2. Busca a sessão real do usuário
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    // 3. Puxa Perfil do banco e sobrescreve o localStorage
    await sincronizar(); 

    // 4. Puxa Publicações do banco (MyDrops e Nearby)
    if (typeof window.sincronizarPublicacoesSupabase === 'function') {
      await window.sincronizarPublicacoesSupabase();
    }

    // 5. Puxa Conectados do banco
    if (window.ConectadosAdapterNex?.carregarConectadosSupabase) {
      await window.ConectadosAdapterNex.carregarConectadosSupabase();
    }

    // 6. Puxa Cards do NEX (Histórico de conversas)
    if (typeof window.sincronizarCardsNexSupabase === 'function') {
      await window.sincronizarCardsNexSupabase();
    }

    // 7. Puxa Bloqueados
    if (window.BloqueadosAdapterNex?.carregarBloqueadosSupabase) {
      await window.BloqueadosAdapterNex.carregarBloqueadosSupabase();
    }

    console.log('✅ Sync Absoluto concluído. Dados 100% do Supabase.');

  } catch (err) {
    console.error('Erro no Sync Absoluto:', err);
  } finally {
    // 8. Remove o loader e libera o app
    if (loader) loader.remove();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await aguardarSupabase();
  
  // Executa o Sync Absoluto antes de liberar o app
  await sincronizarTudoNoBootNex();
  
  // Inicia batimentos e realtime
  iniciarHeartbeatNex();
  
  if (typeof window.iniciarRealtimeNexSupabase === 'function') {
    window.iniciarRealtimeNexSupabase();
  }
});

  console.log('☁️ 21-perfil-supabase.js carregado');

})();