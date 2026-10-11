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
  // ⚠️ Vai ser preenchida na Parte 3
  // (quando gerar o par de chaves VAPID)
  
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
      if (VAPID_PUBLIC_KEY === 'COLE_AQUI_DEPOIS') {
        console.warn('⚠️ VAPID key não configurada ainda');
        return null;
      }

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
  // EXPÕE GLOBALMENTE
  // ============================================

  window.ativarPush = ativarPush;
  window.suportaPush = suportaPush;

  // ============================================
  // INICIALIZAÇÃO (aguarda login)
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    // Aguarda 5s pra ter certeza que o usuário tá logado
    setTimeout(() => {
      if (!suportaPush()) return;

      // Se já tem permissão, ativa direto
      if (Notification.permission === 'granted') {
        ativarPush();
      }
    }, 5000);
  });

  console.log('🔔 32-push.js carregado');

})();