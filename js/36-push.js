/* ============================================
   36-PUSH.JS
   Web Push — permissão + subscription + toggle
============================================ */

(function () {
  'use strict';

  const VAPID_PUBLIC_KEY = 'BHFrRdKWoVcnKvxrrdFgNPSBE4QSacMP91zAiG0FW3psKRHp1R2kZPDr0Xu0vvq7jl9ooG736ofwuuT1iXTOAl8';

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function suportaPush() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  async function pedirPermissaoPush() {
    if (!suportaPush()) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    try {
      const resultado = await Notification.requestPermission();
      return resultado === 'granted';
    } catch (err) {
      return false;
    }
  }

  async function criarSubscription() {
    if (!suportaPush()) return null;
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) return subscription;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      return subscription;
    } catch (err) {
      console.warn('Erro ao criar subscription:', err);
      return null;
    }
  }

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
      
      const { error } = await window.supabaseClient
        .from('push_subscriptions')
        .upsert(payload, { onConflict: 'endpoint' });
        
      if (error) {
        console.warn('Erro ao salvar subscription:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Erro ao salvar subscription:', err);
      return false;
    }
  }

  async function ativarPush() {
    const permitido = await pedirPermissaoPush();
    if (!permitido) return false;
    
    const subscription = await criarSubscription();
    if (!subscription) return false;
    
    const salvo = await salvarSubscriptionSupabase(subscription);
    if (!salvo) return false;
    
    return true;
  }

  async function desativarPush() {
    if (!suportaPush()) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return;
      
      if (window.supabaseClient) {
        await window.supabaseClient
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);
      }
      
      await subscription.unsubscribe();
    } catch (err) {
      console.warn('Erro ao desativar push:', err);
    }
  }

  async function atualizarBotaoPushNex() {
    const btn = document.getElementById('btnAtivarPushNex');
    if (!btn) return;

    if (!suportaPush()) {
      btn.textContent = '🔕 Push não suportado';
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.dataset.acao = 'indisponivel';
      return;
    }

    if (Notification.permission === 'denied') {
      btn.textContent = '🚫 Bloqueado pelo navegador';
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.dataset.acao = 'bloqueado';
      return;
    }

    let temSubscription = false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      temSubscription = !!sub;
    } catch (e) {}

    if (Notification.permission === 'granted' && temSubscription) {
      btn.textContent = '🔕 Desativar notificações';
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.dataset.acao = 'desativar';
    } else {
      btn.textContent = '🔔 Ativar notificações';
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.dataset.acao = 'ativar';
    }
  }

  // Expõe globalmente para ser usado no logout e em outros lugares
  window.ativarPush = ativarPush;
  window.suportaPush = suportaPush;
  window.desativarPush = desativarPush;
  window.atualizarBotaoPushNex = atualizarBotaoPushNex;

  document.addEventListener('DOMContentLoaded', () => {
    const btnMenuGlobal = document.querySelector('.btn-menu-global');
    if (btnMenuGlobal) {
      btnMenuGlobal.addEventListener('click', () => {
        setTimeout(atualizarBotaoPushNex, 100);
      });
    }

    const btnPush = document.getElementById('btnAtivarPushNex');
    if (btnPush) {
      btnPush.addEventListener('click', async () => {
        const acao = btnPush.dataset.acao || 'ativar';

        if (acao === 'bloqueado') {
          window.mostrarToastNex?.('Libere as notificações nas configurações do navegador.', 'info');
          return;
        }
        if (acao === 'indisponivel') return;

        btnPush.disabled = true;

        try {
          if (acao === 'desativar') {
            await desativarPush();
            window.mostrarToastNex?.('Notificações desativadas.', 'info');
          } else {
            const sucesso = await ativarPush();
            if (sucesso) {
              window.mostrarToastNex?.('Notificações ativadas!', 'sucesso');
            } else {
              window.mostrarToastNex?.('Não foi possível ativar. Verifique a permissão do navegador.', 'erro');
            }
          }
        } finally {
          await atualizarBotaoPushNex();
        }
      });
    }

    setTimeout(async () => {
      if (suportaPush() && Notification.permission === 'granted') {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (!sub) await ativarPush();
        } catch (e) {}
      }
      atualizarBotaoPushNex();
    }, 5000);
  });

  console.log('🔔 36-push.js carregado (sistema de toggle ativado)');

})();