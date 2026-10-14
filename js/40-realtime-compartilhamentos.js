/* ============================================
   40-REALTIME-COMPARTILHAMENTOS.JS
   Escuta novos compartilhamentos em tempo real

   Quando alguém compartilha SEU drop:
   → Acende bolinha vermelha na tab MyDrops

   Depende de: 20-supabase.js, 32-notificacoes-tabs.js
============================================ */

(function () {
  'use strict';

  let canalRealtimeShareNex = null;
  let tentativaReconexaoNex = 0;
  let timerReconexaoNex = null;
  const MAX_TENTATIVAS_NEX = 10;

  let cacheMeusIdsNex = null;
  let cacheExpiraEmNex = 0;
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

  // ============================================
  // CACHE — IDs das minhas publicações
  // ============================================

  async function carregarMeusIdsNex() {
    const agora = Date.now();

    if (cacheMeusIdsNex && agora < cacheExpiraEmNex) {
      return cacheMeusIdsNex;
    }

    const usernameAtual = String(window.Drops?.usernameAtual || '')
      .replace(/^@/, '')
      .toLowerCase()
      .trim();

    if (!usernameAtual || !window.supabaseClient) return new Set();

    try {
      const { data, error } = await window.supabaseClient
        .from('publicacoes')
        .select('id')
        .eq('autor_username', usernameAtual);

      if (error) {
        console.warn('Erro ao buscar minhas publicações (share):', error);
        return new Set();
      }

      const ids = new Set((data || []).map((p) => p.id));

      cacheMeusIdsNex = ids;
      cacheExpiraEmNex = agora + CACHE_TTL_MS;

      return ids;
    } catch (err) {
      console.warn('Erro ao buscar minhas publicações (share):', err);
      return new Set();
    }
  }

  function invalidarCacheNex() {
    cacheMeusIdsNex = null;
    cacheExpiraEmNex = 0;
  }

  // ============================================
  // PROCESSAR COMPARTILHAMENTO NOVO
  // ============================================

  async function processarCompartilhamentoNex(registro) {
    if (!registro) return;

    const publicacaoOriginalId = registro.publicacao_original_id;
    if (!publicacaoOriginalId) return;

    try {
      const meusIds = await carregarMeusIdsNex();

      // Só acende se for um drop MEU
      if (!meusIds.has(publicacaoOriginalId)) return;

      console.log('🔁 Alguém compartilhou seu drop');

      // Acende bolinha vermelha na tab MyDrops
      if (typeof window.sinalizarNovidadeNex === 'function') {
        window.sinalizarNovidadeNex('mydrops');
      }

      // Feedback (vibração + som, se ligado)
      if (typeof window.feedbackNex?.reacaoRecebida === 'function') {
        window.feedbackNex.reacaoRecebida();
      }
    } catch (err) {
      console.warn('Erro ao processar compartilhamento realtime:', err);
    }
  }

  // ============================================
  // INICIAR REALTIME
  // ============================================

  async function iniciarRealtimeShareNex() {
    if (!window.supabaseClient) return;

    if (
      canalRealtimeShareNex &&
      canalRealtimeShareNex.state === 'joined'
    ) {
      return;
    }

    try {
      const { data: { user } } =
        await window.supabaseClient.auth.getUser();

      if (!user) return;

      if (canalRealtimeShareNex) {
        try {
          await window.supabaseClient.removeChannel(canalRealtimeShareNex);
        } catch (e) {}
        canalRealtimeShareNex = null;
      }

      console.log('📡 Iniciando Realtime de compartilhamentos...');

      canalRealtimeShareNex = window.supabaseClient
        .channel('drops-compartilhamentos-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'compartilhamentos'
          },
          (payload) => {
            const registro = payload.new;
            if (!registro) return;

            // Ignora se eu mesmo compartilhei
            if (registro.usuario_id === user.id) return;

            processarCompartilhamentoNex(registro);
          }
        )
        .subscribe((status) => {
          console.log('📡 Realtime share status:', status);

          if (status === 'SUBSCRIBED') {
            tentativaReconexaoNex = 0;

            if (timerReconexaoNex) {
              clearTimeout(timerReconexaoNex);
              timerReconexaoNex = null;
            }
          }

          if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            console.warn('⚠️ Realtime share caiu. Agendando reconexão...');
            agendarReconexaoNex();
          }
        });
    } catch (err) {
      console.warn('Erro ao iniciar Realtime share:', err);
      agendarReconexaoNex();
    }
  }

  function agendarReconexaoNex() {
    if (timerReconexaoNex) return;

    if (tentativaReconexaoNex >= MAX_TENTATIVAS_NEX) {
      console.warn('❌ Máximo de tentativas (share).');
      return;
    }

    tentativaReconexaoNex += 1;

    const delay = Math.min(
      2000 * Math.pow(2, tentativaReconexaoNex - 1),
      30000
    );

    timerReconexaoNex = setTimeout(() => {
      timerReconexaoNex = null;
      iniciarRealtimeShareNex();
    }, delay);
  }

  // ============================================
  // RECONEXÃO POR VISIBILIDADE / ONLINE
  // ============================================

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;

    if (
      !canalRealtimeShareNex ||
      canalRealtimeShareNex.state !== 'joined'
    ) {
      tentativaReconexaoNex = 0;
      iniciarRealtimeShareNex();
    }
  });

  window.addEventListener('online', () => {
    tentativaReconexaoNex = 0;
    iniciarRealtimeShareNex();
  });

  // ============================================
  // INIT
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(iniciarRealtimeShareNex, 1800);
  });

  // ============================================
  // EXPÕE
  // ============================================

  window.iniciarRealtimeShareNex = iniciarRealtimeShareNex;
  window.invalidarCacheShareNex = invalidarCacheNex;

  console.log('🔔 40-realtime-compartilhamentos.js carregado');

})();
