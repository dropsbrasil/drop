/* ============================================
   41-DROPS-VISTOS.JS
   Sistema de "visto" para drops do Nearby.

   - buscarVistos() — busca todos os do usuário
   - marcarVisto(uuid) — registra no Supabase
   - foiVisto(uuid) — consulta cache local

   Depende de: 20-supabase.js
============================================ */

(function () {
  'use strict';

  let cacheVistos = null;
  let carregando = false;
  let pendentesCarregar = [];
  
  // ⚠️ CORREÇÃO: Tempo de vida do cache (12 horas)
  let cacheExpiraEm = 0;
  const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

  // ============================================
  // BUSCAR VISTOS (com cache)
  // ============================================

  async function buscarVistos(forceRecarregar = false) {
    const agora = Date.now();

    // Se tem cache E não expirou E não forçou, usa o cache
    if (cacheVistos && agora < cacheExpiraEm && !forceRecarregar) {
      return cacheVistos;
    }

    if (carregando) {
      return new Promise((resolve) => {
        pendentesCarregar.push(resolve);
      });
    }

    carregando = true;

    try {
      if (!window.supabaseClient) {
        cacheVistos = new Set();
        return cacheVistos;
      }

      const { data, error } = await window.supabaseClient.rpc(
        'listar_drops_vistos'
      );

      if (error) {
        console.warn('Erro ao buscar drops vistos:', error);
        cacheVistos = new Set();
        return cacheVistos;
      }

      cacheVistos = new Set(
        (data || []).map((item) => String(item.publicacao_id))
      );
      
      // Atualiza o tempo de expiração
      cacheExpiraEm = agora + CACHE_TTL_MS;

      return cacheVistos;
    } catch (err) {
      console.warn('Erro ao buscar drops vistos:', err);
      cacheVistos = new Set();
      return cacheVistos;
    } finally {
      carregando = false;
      const callbacks = pendentesCarregar;
      pendentesCarregar = [];
      callbacks.forEach((cb) => cb(cacheVistos));
    }
  }

  // ============================================
  // MARCAR COMO VISTO
  // ============================================

  async function marcarVisto(publicacaoId) {
    if (!publicacaoId) return;

    const id = String(publicacaoId);

    // Já tá no cache, não faz nada
    if (cacheVistos && cacheVistos.has(id)) return;

    // Atualiza cache primeiro (feedback otimista)
    if (!cacheVistos) cacheVistos = new Set();
    cacheVistos.add(id);

    try {
      if (!window.supabaseClient) return;

      await window.supabaseClient.rpc('marcar_drop_visto', {
        publicacao_id_arg: id
      });
    } catch (err) {
      console.warn('Erro ao marcar drop como visto:', err);
    }
  }

  // ============================================
  // CONSULTAR (síncrono, usa cache)
  // ============================================

  function foiVisto(publicacaoId) {
    if (!publicacaoId) return false;
    if (!cacheVistos) return false;
    return cacheVistos.has(String(publicacaoId));
  }

  // ============================================
  // LIMPAR CACHE
  // ============================================

  function limparCacheVistos() {
    cacheVistos = null;
    cacheExpiraEm = 0;
  }

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.dropsVistosNex = {
    buscarVistos,
    marcarVisto,
    foiVisto,
    limparCacheVistos
  };

  // ============================================
  // CARREGA CACHE AO ABRIR O APP
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
      try {
        await buscarVistos(true);
        console.log(
          `👁️ Drops vistos carregados: ${cacheVistos?.size || 0}`
        );
      } catch (err) {
        console.warn('Erro ao carregar drops vistos no boot:', err);
      }
    }, 2500);
  });

  console.log('👁️ 41-drops-vistos.js carregado (com TTL de 12h)');

})();