/* ============================================
   16-VISITAS.JS
   Métrica de visitas ao perfil (Supabase)
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
  // REGISTRAR VISITA
  // ============================================
  async function registrarVisitaPerfil(perfilId, visitanteId) {
    if (!perfilId || !visitanteId) return;
    if (String(perfilId).toLowerCase() === String(visitanteId).toLowerCase()) {
      return;
    }

    try {
      if (!window.supabaseClient) return;

      await window.supabaseClient.rpc('registrar_visita', {
        username_alvo: String(perfilId).replace(/^@/, '').trim()
      });
    } catch (erro) {
      console.warn('Erro ao registrar visita:', erro);
    }
  }

  // ============================================
  // OBTER TOTAL DE VISITAS (últimas 24h)
  // ============================================
  async function obterVisitasPerfil(perfilId) {
    if (!perfilId) return 0;

    try {
      if (!window.supabaseClient) return 0;

      const { data, error } = await window.supabaseClient.rpc('contar_visitas', {
        username_alvo: String(perfilId).replace(/^@/, '').trim()
      });

      if (error) {
        console.warn('Erro ao contar visitas:', error);
        return 0;
      }

      return Number(data) || 0;
    } catch (erro) {
      console.warn('Erro ao contar visitas:', erro);
      return 0;
    }
  }

  // ============================================
  // ATUALIZA O CONTADOR NA TELA
  // ============================================
  async function atualizarContadorVisitasNex() {
    const el = document.getElementById('mydropsVisitasContador');
    if (!el) return;

    const total = await obterVisitasPerfil(Drops.usernameAtual);
    el.textContent = String(total);
  }

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================
  window.registrarVisitaPerfil = registrarVisitaPerfil;
  window.obterVisitasPerfil = obterVisitasPerfil;
  window.atualizarContadorVisitasNex = atualizarContadorVisitasNex;

  document.addEventListener('DOMContentLoaded', async () => {
    await aguardarSupabase();
    atualizarContadorVisitasNex();
  });

  console.log('👣 16-visitas.js carregado (Supabase)');
})();