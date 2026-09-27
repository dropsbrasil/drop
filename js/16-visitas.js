/* ============================================
   16-VISITAS.JS
   Estrutura da métrica de visitas ao perfil
   
   Hoje: funções vazias (só esqueleto).
   Amanhã: basta trocar o corpo das funções
   para chamar o backend — a assinatura não muda.
   
   Assinatura:
     perfilId   → @username (hoje) | ID interno (futuro)
     visitanteId → Drops.usernameAtual
============================================ */

(function () {
  'use strict';

  // ============================================
  // REGISTRAR VISITA
  // ============================================
  // Chamado quando alguém abre o perfil de outra pessoa.
  //
  // Regras (a serem aplicadas pelo backend):
  //   - Não registra se perfilId === visitanteId
  //   - 1 visita por par (perfil, visitante) a cada 24h
  //   - Visita expira após 24h

  function registrarVisitaPerfil(perfilId, visitanteId) {
    // Bloqueio defensivo: próprio usuário não gera visita
    if (!perfilId || !visitanteId) return;
    if (String(perfilId).toLowerCase() === String(visitanteId).toLowerCase()) {
      return;
    }

    // Backend será conectado posteriormente
  }

  // ============================================
  // OBTER TOTAL DE VISITAS DO PERFIL
  // ============================================
  // Chamado quando o MyDrops carrega, pra exibir o contador.
  // Retorna apenas visitas válidas (últimas 24h).

  function obterVisitasPerfil(perfilId) {
    if (!perfilId) return 0;

    // Backend será conectado posteriormente
    return 0;
  }

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.registrarVisitaPerfil = registrarVisitaPerfil;
  window.obterVisitasPerfil = obterVisitasPerfil;

  // ============================================
  // DEBUG
  // ============================================

  console.log('👣 16-visitas.js carregado');

})();
