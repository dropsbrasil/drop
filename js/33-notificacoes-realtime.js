/* ============================================
   33-NOTIFICACOES-REALTIME.JS
   Realtime que detecta novidades e sinaliza bolinhas

   FASE 6 — Parte 1: Reações nos meus drops
   → sinalizaNovidadeNex('mydrops')

   Depende de: 20-supabase.js, 32-notificacoes-tabs.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // ESTADO
  // ============================================

  let canalRealtimeReacoesNex = null;
let tentativaReconexaoReacoesNex = 0;
let timerReconexaoReacoesNex = null;
const MAX_TENTATIVAS_REACOES_NEX = 10;

// ⚠️ Fase 6 Parte 2 — conectado postou algo novo
let canalRealtimePublicacoesNex = null;
let tentativaReconexaoPublicacoesNex = 0;
let timerReconexaoPublicacoesNex = null;
const MAX_TENTATIVAS_PUBLICACOES_NEX = 10;

  // Cache dos IDs das minhas publicações
  let cacheMinhasPublicacoesNex = null;
  let cacheExpiraEmNex = 0;
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

  // ============================================
  // CACHE — minhas publicações
  // ============================================

  async function carregarMinhasPublicacoesNex() {
    const agora = Date.now();

    if (cacheMinhasPublicacoesNex && agora < cacheExpiraEmNex) {
      return cacheMinhasPublicacoesNex;
    }

    const usernameAtual = String(window.Drops?.usernameAtual || '')
      .replace(/^@/, '')
      .toLowerCase()
      .trim();

    if (!usernameAtual || !window.supabaseClient) {
      return new Set();
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('publicacoes')
        .select('id')
        .eq('autor_username', usernameAtual);

      if (error) {
        console.warn('Erro ao buscar minhas publicações:', error);
        return new Set();
      }

      const ids = new Set((data || []).map((p) => p.id));

      cacheMinhasPublicacoesNex = ids;
      cacheExpiraEmNex = agora + CACHE_TTL_MS;

      console.log(`📦 Cache de publicações: ${ids.size} itens`);

      return ids;
    } catch (err) {
      console.warn('Erro ao buscar minhas publicações:', err);
      return new Set();
    }
  }

  function invalidarCacheMinhasPublicacoesNex() {
    cacheMinhasPublicacoesNex = null;
    cacheExpiraEmNex = 0;
  }

  // ============================================
  // PROCESSAR REAÇÃO NOVA
  // ============================================

  async function processarReacaoRealtimeNex(reacao) {
    if (!reacao?.publicacao_id) return;

    try {
      const minhasPublicacoes = await carregarMinhasPublicacoesNex();

      if (!minhasPublicacoes.has(reacao.publicacao_id)) {
        // Reação em publicação de outro — ignora
        return;
      }

      console.log('❤️ Nova reação nos meus drops');
      window.sinalizarNovidadeNex?.('mydrops');
    } catch (err) {
      console.warn('Erro ao processar reação realtime:', err);
    }
  }

 // ============================================
// PROCESSAR PUBLICAÇÃO NOVA (conectado postou)
// ============================================

function processarPublicacaoRealtimeNex(pub) {
  if (!pub?.autor_username) return;

  const meuUsername = String(window.Drops?.usernameAtual || '')
    .replace(/^@/, '')
    .toLowerCase()
    .trim();

  const autorLimpo = String(pub.autor_username)
    .replace(/^@/, '')
    .toLowerCase()
    .trim();

  if (!autorLimpo) return;

  // Ignora minha própria publicação
  if (autorLimpo === meuUsername) return;

  // Só sinaliza se for um dos MEUS conectados
  const conectados = window.lerConectadosMyDropsNex?.() || [];

  const idsConectados = new Set(
    conectados.map((c) =>
      String(c.id || '').replace(/^@/, '').toLowerCase().trim()
    )
  );

  if (!idsConectados.has(autorLimpo)) return;

  console.log('📸 Conectado postou algo novo:', autorLimpo);
  window.sinalizarNovidadeNex?.('nearby');
}

// ============================================
// INICIAR REALTIME
// ============================================

async function iniciarRealtimeReacoesNex() {
    if (!window.supabaseClient) return;

    if (
      canalRealtimeReacoesNex &&
      canalRealtimeReacoesNex.state === 'joined'
    ) {
      return;
    }

    try {
      const { data: { user } } =
        await window.supabaseClient.auth.getUser();

      if (!user) return;

      if (canalRealtimeReacoesNex) {
        try {
          await window.supabaseClient.removeChannel(canalRealtimeReacoesNex);
        } catch (e) {}
        canalRealtimeReacoesNex = null;
      }

      console.log('📡 Iniciando Realtime de reações...');

      canalRealtimeReacoesNex = window.supabaseClient
        .channel('drops-reacoes-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'reacoes'
          },
          (payload) => {
            const reacao = payload.new;
            if (!reacao) return;

            // Ignora reações que eu mesmo fiz
            if (reacao.usuario_id === user.id) return;

            processarReacaoRealtimeNex(reacao);
          }
        )
        .subscribe((status) => {
          console.log('📡 Realtime reações status:', status);

          if (status === 'SUBSCRIBED') {
            tentativaReconexaoReacoesNex = 0;

            if (timerReconexaoReacoesNex) {
              clearTimeout(timerReconexaoReacoesNex);
              timerReconexaoReacoesNex = null;
            }
          }

          if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            console.warn('⚠️ Realtime reações caiu. Agendando reconexão...');
            agendarReconexaoReacoesNex();
          }
        });
    } catch (err) {
      console.warn('Erro ao iniciar Realtime de reações:', err);
      agendarReconexaoReacoesNex();
    }
  }

  function agendarReconexaoReacoesNex() {
  if (timerReconexaoReacoesNex) return;

  if (tentativaReconexaoReacoesNex >= MAX_TENTATIVAS_REACOES_NEX) {
    console.warn('❌ Máximo de tentativas de reconexão (reações).');
    return;
  }

  tentativaReconexaoReacoesNex += 1;

  const delay = Math.min(
    2000 * Math.pow(2, tentativaReconexaoReacoesNex - 1),
    30000
  );

  timerReconexaoReacoesNex = setTimeout(() => {
    timerReconexaoReacoesNex = null;
    iniciarRealtimeReacoesNex();
  }, delay);
}

// ============================================
// INICIAR REALTIME DE PUBLICAÇÕES
// ============================================

async function iniciarRealtimePublicacoesNex() {
  if (!window.supabaseClient) return;

  if (
    canalRealtimePublicacoesNex &&
    canalRealtimePublicacoesNex.state === 'joined'
  ) {
    return;
  }

  try {
    const { data: { user } } =
      await window.supabaseClient.auth.getUser();

    if (!user) return;

    if (canalRealtimePublicacoesNex) {
      try {
        await window.supabaseClient.removeChannel(
          canalRealtimePublicacoesNex
        );
      } catch (e) {}
      canalRealtimePublicacoesNex = null;
    }

    console.log('📡 Iniciando Realtime de publicações...');

    canalRealtimePublicacoesNex = window.supabaseClient
      .channel('drops-publicacoes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'publicacoes'
        },
        (payload) => {
          const pub = payload.new;
          if (!pub) return;
          processarPublicacaoRealtimeNex(pub);
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime publicações status:', status);

        if (status === 'SUBSCRIBED') {
          tentativaReconexaoPublicacoesNex = 0;

          if (timerReconexaoPublicacoesNex) {
            clearTimeout(timerReconexaoPublicacoesNex);
            timerReconexaoPublicacoesNex = null;
          }
        }

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          console.warn('⚠️ Realtime publicações caiu. Agendando reconexão...');
          agendarReconexaoPublicacoesNex();
        }
      });
  } catch (err) {
    console.warn('Erro ao iniciar Realtime de publicações:', err);
    agendarReconexaoPublicacoesNex();
  }
}

function agendarReconexaoPublicacoesNex() {
  if (timerReconexaoPublicacoesNex) return;

  if (tentativaReconexaoPublicacoesNex >= MAX_TENTATIVAS_PUBLICACOES_NEX) {
    console.warn('❌ Máximo de tentativas de reconexão (publicações).');
    return;
  }

  tentativaReconexaoPublicacoesNex += 1;

  const delay = Math.min(
    2000 * Math.pow(2, tentativaReconexaoPublicacoesNex - 1),
    30000
  );

  timerReconexaoPublicacoesNex = setTimeout(() => {
    timerReconexaoPublicacoesNex = null;
    iniciarRealtimePublicacoesNex();
  }, delay);
}

  // ============================================
  // RECONEXÃO POR VISIBILIDADE / ONLINE
  // ============================================

  document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;

  if (
    !canalRealtimeReacoesNex ||
    canalRealtimeReacoesNex.state !== 'joined'
  ) {
    tentativaReconexaoReacoesNex = 0;
    iniciarRealtimeReacoesNex();
  }

  if (
    !canalRealtimePublicacoesNex ||
    canalRealtimePublicacoesNex.state !== 'joined'
  ) {
    tentativaReconexaoPublicacoesNex = 0;
    iniciarRealtimePublicacoesNex();
  }
});

window.addEventListener('online', () => {
  tentativaReconexaoReacoesNex = 0;
  iniciarRealtimeReacoesNex();

  tentativaReconexaoPublicacoesNex = 0;
  iniciarRealtimePublicacoesNex();
});

  // ============================================
  // INIT — espera Supabase ficar pronto
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    iniciarRealtimeReacoesNex();
    iniciarRealtimePublicacoesNex();
  }, 1500);
});

  // ============================================
  // EXPÕE
  // ============================================

  window.iniciarRealtimeReacoesNex = iniciarRealtimeReacoesNex;
window.carregarMinhasPublicacoesNex = carregarMinhasPublicacoesNex;
window.invalidarCacheMinhasPublicacoesNex = invalidarCacheMinhasPublicacoesNex;
window.iniciarRealtimePublicacoesNex = iniciarRealtimePublicacoesNex;
  
  console.log('🔔 33-notificacoes-realtime.js carregado');

})();