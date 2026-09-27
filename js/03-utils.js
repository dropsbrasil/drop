/* ============================================
   03-UTILS.JS
   Funções utilitárias (formatação, IDs, chaves)
   
   Depende de: 00-config.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // ESCAPE HTML
  // ============================================

  function escapeHTML(value = '') {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[ch]);
  }

  // ============================================
  // FORMATAÇÃO DE TEMPO
  // ============================================

  function formatarTempo(segundos) {
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    return `${min}:${String(sec).padStart(2, '0')}`;
  }

  function formatarTempoAudioNex(segundos) {
    const min = String(Math.floor(segundos / 60)).padStart(2, '0');
    const sec = String(segundos % 60).padStart(2, '0');
    return `${min}:${sec}`;
  }

  function formatarTempoMyDropsNex(segundos) {
    const min = String(Math.floor(segundos / 60)).padStart(2, '0');
    const seg = String(segundos % 60).padStart(2, '0');
    return `${min}:${seg}`;
  }

  // ============================================
  // FORMATAÇÃO DE ARQUIVO
  // ============================================

  function formatarTamanhoArquivoNex(bytes) {
    if (!bytes && bytes !== 0) return '';

    const unidades = ['B', 'KB', 'MB', 'GB'];
    let valor = Number(bytes);
    let i = 0;

    while (valor >= 1024 && i < unidades.length - 1) {
      valor /= 1024;
      i++;
    }

    return `${valor.toFixed(valor >= 10 || i === 0 ? 0 : 1)} ${unidades[i]}`;
  }

  // ============================================
  // FORMATAÇÃO DE DATA
  // ============================================

  function formatarDataPublicacaoMyDropsNex(valor) {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return '';

    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatarDataHoraPublicacaoMyDropsNex(valor) {
    const dataObj = new Date(valor || Date.now());

    const hora = dataObj.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const data = dataObj.toLocaleDateString('pt-BR');

    return { hora, data };
  }

  function formatarDuracaoPublicacaoMyDropsNex(duracao) {
    if (!duracao) return '';
    if (duracao === 'permanente') return 'Permanente';
    if (duracao === '12h') return '12h';
    if (duracao === '24h') return '24h';
    if (duracao === 'personalizado') return 'Personalizado';
    return String(duracao).toUpperCase();
  }

  function obterDataHoraNex() {
    const agora = new Date();

    return {
      data: agora.toLocaleDateString('pt-BR'),
      hora: agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  }

  // ============================================
  // GERADORES DE ID
  // ============================================

  function gerarIdMensagemNex() {
    return (
      'msg_' +
      Date.now() +
      '_' +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function gerarIdPublicacaoMyDropsNex() {
    return `pub_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  // ============================================
  // STATUS DA MENSAGEM
  // ============================================

  function statusIconeNex(status) {
    if (status === 'entregue') return '✓✓';
    if (status === 'aberto' || status === 'visto') return '👁️‍🗨️';
    return '✓';
  }

  // ============================================
  // NORMALIZAÇÃO DE PERFIL
  // ============================================

  function normalizarIdPerfilNex(valor) {
    return String(valor || '').trim().toLowerCase();
  }

  // ============================================
  // CHAVES PARA MAPAS DE REAÇÃO
  // ============================================

  function chaveMidiaReacaoNex(midia) {
    const url = String(midia?.url || '');
    const tipo = String(midia?.type || midia?.tipo || '').toLowerCase();
    return `${tipo}::${url}`;
  }

  function chaveReacaoDropNex(perfilId, dropIndex, url) {
    return `${String(perfilId || '').trim()}::${Number(dropIndex || 0)}::${String(url || '').trim()}`;
  }

  function chaveUsuarioReacaoDropNex(perfilId, dropIndex, url, usuarioId) {
    return `${chaveReacaoDropNex(perfilId, dropIndex, url)}::${String(usuarioId || 'local').trim()}`;
  }

  // ============================================
  // NORMALIZAÇÃO DE ÁLBUM (imagens/vídeos)
  // ============================================

  function normalizarAlbumNex(lista) {
    return (Array.isArray(lista) ? lista : [])
      .map((item) => {
        if (typeof item === 'string') {
          const url = item;
          const ehVideo = /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);
          return { type: ehVideo ? 'video' : 'imagem', url };
        }

        const url = item?.url || item?.src || '';
        const tipo = String(item?.type || item?.mimeType || '').toLowerCase();
        const ehVideo =
          tipo.includes('video') ||
          /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

        return {
          type: ehVideo ? 'video' : 'imagem',
          url
        };
      })
      .filter((item) => item.url);
  }

  // ============================================
// TOAST GLOBAL (FEEDBACK DE AÇÕES)
// ============================================

let toastTimerNex = null;

function mostrarToastNex(mensagem, tipo = 'sucesso', duracaoMs = 2600) {
  const texto = String(mensagem || '').trim();
  if (!texto) return;

  const tipoLimpo = ['sucesso', 'erro', 'info'].includes(tipo)
    ? tipo
    : 'sucesso';

  const icone =
    tipoLimpo === 'sucesso' ? '✅' :
    tipoLimpo === 'erro' ? '⚠️' :
    'ℹ️';

  let toast = document.getElementById('toastGlobalNex');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastGlobalNex';
    document.body.appendChild(toast);
  }

  toast.className = tipoLimpo;
  toast.innerHTML = `
    <span class="toast-icone-nex">${icone}</span>
    <span class="toast-texto-nex">${escapeHTML(texto)}</span>
  `;

  // força reflow pra reiniciar a animação
  void toast.offsetWidth;
  toast.classList.add('visivel');

  if (toastTimerNex) clearTimeout(toastTimerNex);

  toastTimerNex = setTimeout(() => {
    toast.classList.remove('visivel');
    toastTimerNex = null;
  }, duracaoMs);
}

// ============================================
// EXPÕE GLOBALMENTE
// ============================================

window.mostrarToastNex = mostrarToastNex;

window.escapeHTML = escapeHTML;
  window.formatarTempo = formatarTempo;
  window.formatarTempoAudioNex = formatarTempoAudioNex;
  window.formatarTempoMyDropsNex = formatarTempoMyDropsNex;
  window.formatarTamanhoArquivoNex = formatarTamanhoArquivoNex;
  window.formatarDataPublicacaoMyDropsNex = formatarDataPublicacaoMyDropsNex;
  window.formatarDataHoraPublicacaoMyDropsNex = formatarDataHoraPublicacaoMyDropsNex;
  window.formatarDuracaoPublicacaoMyDropsNex = formatarDuracaoPublicacaoMyDropsNex;
  window.obterDataHoraNex = obterDataHoraNex;
  window.gerarIdMensagemNex = gerarIdMensagemNex;
  window.gerarIdPublicacaoMyDropsNex = gerarIdPublicacaoMyDropsNex;
  window.statusIconeNex = statusIconeNex;
  window.normalizarIdPerfilNex = normalizarIdPerfilNex;
  window.chaveMidiaReacaoNex = chaveMidiaReacaoNex;
  window.chaveReacaoDropNex = chaveReacaoDropNex;
  window.chaveUsuarioReacaoDropNex = chaveUsuarioReacaoDropNex;
  window.normalizarAlbumNex = normalizarAlbumNex;

  // ============================================
  // DEBUG
  // ============================================

  console.log('🧰 03-utils.js carregado');

})();