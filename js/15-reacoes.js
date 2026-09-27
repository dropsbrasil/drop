/* ============================================
   15-REACOES.JS
   Sistema de reações e métrica de interações
   
   Estrutura preparada para backend.
   Para plugar o backend, troque APENAS o
   objeto ReacoesAdapterNex (final do arquivo).
   
   Depende de: 00-config.js, 03-utils.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // CONFIGURAÇÃO
  // ============================================

  const JANELA_INTERACOES_DIAS = 30;
  const JANELA_INTERACOES_MS =
    JANELA_INTERACOES_DIAS * 24 * 60 * 60 * 1000;

  const CHAVE_STORAGE = 'mydropsReacoesNex';

  // ============================================
  // ADAPTADOR DE PERSISTÊNCIA
  // ============================================
  // Hoje: localStorage síncrono
  // Amanhã: trocar por fetch/axios async
  //
  // Formato esperado dos dados:
  // {
  //   "chaveQualquer": {
  //     heart:  [ { usuarioId, timestamp } ],
  //     broken: [ { usuarioId, timestamp } ]
  //   }
  // }

  const ReacoesAdapterNex = {
    ler() {
      try {
        const bruto = localStorage.getItem(CHAVE_STORAGE);
        const dados = bruto ? JSON.parse(bruto) : {};
        return dados && typeof dados === 'object' ? dados : {};
      } catch (erro) {
        console.warn('Erro ao ler reações:', erro);
        return {};
      }
    },

    salvar(dados) {
      try {
        localStorage.setItem(CHAVE_STORAGE, JSON.stringify(dados || {}));
        return true;
      } catch (erro) {
        console.warn('Erro ao salvar reações:', erro);
        return false;
      }
    }
  };

  // ============================================
  // HELPERS INTERNOS
  // ============================================

  function garantirEstruturaChaveNex(dados, chave) {
    if (!dados[chave]) {
      dados[chave] = { heart: [], broken: [] };
    }
    if (!Array.isArray(dados[chave].heart)) dados[chave].heart = [];
    if (!Array.isArray(dados[chave].broken)) dados[chave].broken = [];
    return dados[chave];
  }

  function emojiParaListaNex(emoji) {
    return emoji === '💔' ? 'broken' : 'heart';
  }

  // ============================================
  // API PRINCIPAL
  // ============================================

  /**
   * Retorna a reação de um usuário específico numa chave.
   * @returns '❤️' | '💔' | ''
   */
  function obterReacaoUsuarioNex(chave, usuarioId) {
    if (!chave || !usuarioId) return '';

    const dados = ReacoesAdapterNex.ler();
    const item = dados[chave];
    if (!item) return '';

    const id = String(usuarioId).toLowerCase();

    if (item.heart?.some((r) => String(r.usuarioId).toLowerCase() === id)) {
      return '❤️';
    }
    if (item.broken?.some((r) => String(r.usuarioId).toLowerCase() === id)) {
      return '💔';
    }
    return '';
  }

  /**
   * Aplica toggle de reação.
   * Clicar ❤️ tendo ❤️ remove. Clicar 💔 tendo ❤️ troca. Etc.
   * @returns { heart: number, broken: number, reacaoAtual: '❤️'|'💔'|'' }
   */
  function alternarReacaoNex(chave, usuarioId, emoji) {
    if (!chave || !usuarioId || !emoji) {
      return { heart: 0, broken: 0, reacaoAtual: '' };
    }

    const dados = ReacoesAdapterNex.ler();
    const item = garantirEstruturaChaveNex(dados, chave);

    const id = String(usuarioId).toLowerCase();
    const listaAlvo = emojiParaListaNex(emoji);
    const listaOposta = listaAlvo === 'heart' ? 'broken' : 'heart';

    // Remove de qualquer lista (garante 1 reação por user)
    item.heart = item.heart.filter(
      (r) => String(r.usuarioId).toLowerCase() !== id
    );
    item.broken = item.broken.filter(
      (r) => String(r.usuarioId).toLowerCase() !== id
    );

    // Verifica se era a mesma reação (toggle)
    const dadosAntes = JSON.parse(
      JSON.stringify({ heart: item.heart, broken: item.broken })
    );

    const tinhaAlvoAntes = dadosAntes[listaAlvo].some(
      (r) => String(r.usuarioId).toLowerCase() === id
    );

    let reacaoFinal = '';

    if (!tinhaAlvoAntes) {
      item[listaAlvo].push({
        usuarioId: id,
        timestamp: Date.now()
      });
      reacaoFinal = emoji;
    }

    ReacoesAdapterNex.salvar(dados);

    return {
      heart: item.heart.length,
      broken: item.broken.length,
      reacaoAtual: reacaoFinal
    };
  }

  /**
   * Retorna contadores de uma chave (filtrados pela janela de validade).
   */
  function obterStatsReacaoNex(chave) {
    const dados = ReacoesAdapterNex.ler();
    const item = dados[chave];

    if (!item) return { heart: 0, broken: 0 };

    const limite = Date.now() - JANELA_INTERACOES_MS;

    const filtrar = (lista) =>
      (lista || []).filter((r) => (r.timestamp || 0) > limite).length;

    return {
      heart: filtrar(item.heart),
      broken: filtrar(item.broken)
    };
  }

  /**
   * Calcula total de interações do usuário (soma heart + broken na janela).
   * @param {string} autorId - @username do dono dos drops
   * @param {string[]} chavesDosDrops - lista de chaves dos drops dele
   */
  function calcularInteracoesPerfilNex(autorId, chavesDosDrops = []) {
    if (!Array.isArray(chavesDosDrops)) return 0;

    const dados = ReacoesAdapterNex.ler();
    const limite = Date.now() - JANELA_INTERACOES_MS;
    const autorLimpo = String(autorId || '').toLowerCase();

    let total = 0;

    chavesDosDrops.forEach((chave) => {
      const item = dados[chave];
      if (!item) return;

      const contar = (lista) =>
        (lista || []).filter((r) => {
          if ((r.timestamp || 0) <= limite) return false;
          // Ignora auto-reação do próprio autor
          if (String(r.usuarioId).toLowerCase() === autorLimpo) return false;
          return true;
        }).length;

      total += contar(item.heart);
      total += contar(item.broken);
    });

    return total;
  }

  /**
   * Remove reações mais antigas que a janela.
   * Retorna quantidade removida.
   */
  function limparReacoesExpiradasNex() {
    const dados = ReacoesAdapterNex.ler();
    const limite = Date.now() - JANELA_INTERACOES_MS;

    let removidas = 0;

    Object.keys(dados).forEach((chave) => {
      const item = dados[chave];
      if (!item) return;

      const antes =
        (item.heart?.length || 0) + (item.broken?.length || 0);

      item.heart = (item.heart || []).filter(
        (r) => (r.timestamp || 0) > limite
      );
      item.broken = (item.broken || []).filter(
        (r) => (r.timestamp || 0) > limite
      );

      const depois = item.heart.length + item.broken.length;
      removidas += antes - depois;

      if (depois === 0) {
        delete dados[chave];
      }
    });

    if (removidas > 0) {
      ReacoesAdapterNex.salvar(dados);
    }

    return removidas;
  }

  // ============================================
  // HELPERS DE CHAVE
  // ============================================

  /**
   * Gera chave estável pra um drop de publicação própria.
   * @param {string} publicacaoId - pub.id
   */
  function chavePublicacaoNex(publicacaoId) {
    return `pub::${String(publicacaoId || '').trim()}`;
  }

  /**
   * Gera chave estável pra um drop de perfil visitado/nearby.
   * Formato: perfilId::dropIndex::url
   */
  function chaveDropPerfilNex(perfilId, dropIndex, url) {
    return `${String(perfilId || '').trim()}::${Number(
      dropIndex || 0
    )}::${String(url || '').trim()}`;
  }

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.ReacoesAdapterNex = ReacoesAdapterNex;

  window.obterReacaoUsuarioNex = obterReacaoUsuarioNex;
  window.alternarReacaoNex = alternarReacaoNex;
  window.obterStatsReacaoNex = obterStatsReacaoNex;
  window.calcularInteracoesPerfilNex = calcularInteracoesPerfilNex;
  window.limparReacoesExpiradasNex = limparReacoesExpiradasNex;

  window.chavePublicacaoNex = chavePublicacaoNex;
  window.chaveDropPerfilNex = chaveDropPerfilNex;

  window.JANELA_INTERACOES_DIAS = JANELA_INTERACOES_DIAS;

  // ============================================
  // DEBUG
  // ============================================

  console.log(
    `❤️ 15-reacoes.js carregado (janela: ${JANELA_INTERACOES_DIAS} dias)`
  );

})();