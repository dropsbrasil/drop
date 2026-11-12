/* ============================================
   32-PUSH.JS
   Web Push — permissão + subscription
   
   Depende de: 00-config.js, 20-supabase.js, 25-nex-supabase.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // CHAVE PÚBLICA VAPID
  // ============================================
  const VAPID_PUBLIC_KEY = 'BHFrRdKWoVcnKvxrrdFgNPSBE4QSacMP91zAiG0FW3psKRHp1R2kZPDr0Xu0vvq7jl9ooG736ofwuuT1iXTOAl8';

  // ============================================
  // HELPERS
  // ============================================

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  // ============================================
  // VERIFICAR SUPORTE
  // ============================================

  function suportaPush() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  // ============================================
  // PEDIR PERMISSÃO
  // ============================================

  async function pedirPermissaoPush() {
    if (!suportaPush()) {
      console.warn('⚠️ Push não é suportado neste navegador');
      return false;
    }

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      console.warn('⚠️ Push bloqueado pelo usuário');
      return false;
    }

    try {
      const resultado = await Notification.requestPermission();
      return resultado === 'granted';
    } catch (err) {
      console.warn('Erro ao pedir permissão:', err);
      return false;
    }
  }

  // ============================================
  // CRIAR SUBSCRIPTION
  // ============================================

  async function criarSubscription() {
    if (!suportaPush()) return null;

    try {
      const registration = await navigator.serviceWorker.ready;

      // Verifica se já existe subscription ativa
      let subscription = await registration.pushManager.getSubscription();

      if (subscription) return subscription;

      // Cria uma nova
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      console.log('✅ Subscription criada:', subscription);
      return subscription;
    } catch (err) {
      console.warn('Erro ao criar subscription:', err);
      return null;
    }
  }

  // ============================================
  // SALVAR SUBSCRIPTION NO SUPABASE
  // ============================================

  async function salvarSubscriptionSupabase(subscription) {
    if (!window.supabaseClient || !subscription) return false;

    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return false;

      const json = subscription.toJSON();

      const payload = {
        usuario_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh || '',
        auth: json.keys?.auth || '',
        user_agent: navigator.userAgent || '',
        atualizado_em: new Date().toISOString()
      };

      // Upsert (substitui se já existir com mesmo endpoint)
      const { error } = await window.supabaseClient
        .from('push_subscriptions')
        .upsert(payload, { onConflict: 'endpoint' });

      if (error) {
        console.warn('Erro ao salvar subscription:', error);
        return false;
      }

      console.log('☁️ Subscription salva no Supabase');
      return true;
    } catch (err) {
      console.warn('Erro ao salvar subscription:', err);
      return false;
    }
  }

  // ============================================
  // FLUXO COMPLETO
  // ============================================

  async function ativarPush() {
    console.log('🔔 Ativando push...');

    const permitido = await pedirPermissaoPush();
    if (!permitido) {
      console.warn('🔕 Permissão não concedida');
      return false;
    }

    const subscription = await criarSubscription();
    if (!subscription) {
      console.warn('🔕 Não foi possível criar subscription');
      return false;
    }

    const salvo = await salvarSubscriptionSupabase(subscription);
    if (!salvo) {
      console.warn('🔕 Não foi possível salvar no Supabase');
      return false;
    }

    console.log('🔔 Push ativado com sucesso!');
    return true;
  }

  // ============================================
  // DESATIVAR PUSH (NOVO)
  // ============================================
  // Chamado no logout para limpar o banco e o navegador.

  async function desativarPush() {
    if (!suportaPush()) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) return;

      // 1. Remove do banco de dados
      if (window.supabaseClient) {
        await window.supabaseClient
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);
      }

      // 2. Cancela no navegador
      await subscription.unsubscribe();
      console.log('🔕 Push desativado com sucesso');
    } catch (err) {
      console.warn('Erro ao desativar push:', err);
    }
  }

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.ativarPush = ativarPush;
  window.suportaPush = suportaPush;
  window.desativarPush = desativarPush;

  // ============================================
  // INICIALIZAÇÃO (aguarda login)
  // ============================================

  // ============================================
// ATUALIZAR VISUAL DO BOTÃO
// ============================================
function atualizarBotaoPushNex() {
  const btn = document.getElementById('btnAtivarPushNex');
  if (!btn) return;

  if (!suportaPush()) {
    btn.textContent = '🔕 Push não suportado';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    return;
  }

  if (Notification.permission === 'granted') {
    btn.textContent = '✅ Notificações Ativadas';
    btn.disabled = true;
    btn.style.opacity = '0.7';
  } else if (Notification.permission === 'denied') {
    btn.textContent = '🚫 Bloqueado pelo navegador';
    btn.disabled = true;
    btn.style.opacity = '0.5';
  } else {
    btn.textContent = '🔔 Ativar notificações';
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Atualiza o botão sempre que o menu (☰) for clicado
  const btnMenuGlobal = document.querySelector('.btn-menu-global');
  if (btnMenuGlobal) {
    btnMenuGlobal.addEventListener('click', () => {
      setTimeout(atualizarBotaoPushNex, 100);
    });
  }

  // 2. Ação do botão de ativar push
  const btnPush = document.getElementById('btnAtivarPushNex');
  if (btnPush) {
    btnPush.addEventListener('click', async () => {
      const sucesso = await ativarPush();
      if (sucesso) {
        window.mostrarToastNex?.('Notificações ativadas com sucesso!', 'sucesso');
      } else {
        window.mostrarToastNex?.('Não foi possível ativar as notificações.', 'erro');
      }
      atualizarBotaoPushNex();
    });
  }

  // 3. Ativação em background se já estiver permitido
  setTimeout(() => {
    if (suportaPush() && Notification.permission === 'granted') {
      ativarPush();
    }
    atualizarBotaoPushNex();
  }, 5000);
});

  console.log('🔔 32-push.js carregado (com desativarPush)');

})();
