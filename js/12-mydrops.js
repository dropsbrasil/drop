/* ============================================
   12-MYDROPS.JS
   Publicações do My Drops, viewer próprio, modal de duração
   
   Depende de: 00-config.js, 03-utils.js, 11-nearby.js
============================================ */

(function () {
  'use strict';

  // ============================================
// CARREGAR PUBLICAÇÕES
// ============================================
// Persistência: via window.MyDropsAdapterNex (17-adapters.js)

let publicacoesMyDropsNex = carregarPublicacoesMyDropsNex();

function carregarPublicacoesMyDropsNex() {
  return window.MyDropsAdapterNex.lerPublicacoes();
}

function salvarPublicacoesMyDropsNex() {
  window.MyDropsAdapterNex.salvarPublicacoes(publicacoesMyDropsNex);
}

// ============================================
// BUSCAR PUBLICAÇÕES DO SUPABASE E MESCLAR
// ============================================
async function sincronizarPublicacoesSupabase() {
  if (!window.buscarMinhasPublicacoesSupabase) return;

  try {
    const pubsSupabase = await window.buscarMinhasPublicacoesSupabase();

    if (!Array.isArray(pubsSupabase)) return;

    // Converte o formato do Supabase para o formato local
    const pubsConvertidas = pubsSupabase.map((p) => ({
      id: p.id,
      idSupabase: p.id,
      autorId: p.autor_username,
      origem: p.tipo === 'video' ? 'video' : 'foto',
      midiaTipo: p.tipo === 'video' ? 'video' : 'image',
      mediaUrl: p.media_url,
      legenda: p.legenda || '',
      loop: p.loop === true,
      criadoEm: new Date(p.criado_em).getTime(),
      expiraEm: p.expira_em,
      duracao: p.duracao,
      visualizacoes: [],
      reacoes: { heart: [], broken: [] }
    }));

    // Mescla: substitui tudo do Supabase, mantém locais não sincronizados
    const idsSupabase = new Set(pubsConvertidas.map((p) => p.idSupabase));

    const locaisNaoSincronizados = publicacoesMyDropsNex.filter(
      (p) => !p.idSupabase && !idsSupabase.has(p.id)
    );

    publicacoesMyDropsNex = [...pubsConvertidas, ...locaisNaoSincronizados];

    salvarPublicacoesMyDropsNex();
    renderizarPublicacoesMyDropsNex();

    console.log('☁️ Publicações sincronizadas:', pubsConvertidas.length);
  } catch (erro) {
    console.error('Erro ao sincronizar publicações:', erro);
  }
}

  // ============================================
  // REMOVER PUBLICAÇÕES EXPIRADAS
  // ============================================

  function removerPublicacoesExpiradasMyDropsNex() {
    const agora = Date.now();
    const quantidadeAntes = publicacoesMyDropsNex.length;

    publicacoesMyDropsNex = publicacoesMyDropsNex.filter((pub) => {
      if (!pub.expiraEm) return true; // permanente
      const expira = new Date(pub.expiraEm).getTime();
      return Number.isNaN(expira) ? true : expira > agora;
    });

    if (publicacoesMyDropsNex.length !== quantidadeAntes) {
      salvarPublicacoesMyDropsNex();
    }
  }

  // ============================================
  // OBTER PUBLICAÇÕES ORDENADAS
  // ============================================

  function obterPublicacoesOrdenadasMyDropsNex() {
    removerPublicacoesExpiradasMyDropsNex();

    return [...publicacoesMyDropsNex]
      .map((pub) => ({
        ...pub,
        visualizacoes: Array.isArray(pub.visualizacoes)
          ? pub.visualizacoes
          : [],
        reacoes: {
          heart: Array.isArray(pub?.reacoes?.heart) ? pub.reacoes.heart : [],
          broken: Array.isArray(pub?.reacoes?.broken)
            ? pub.reacoes.broken
            : []
        }
      }))
      .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  }

  // ============================================
  // MODAL DE DURAÇÃO
  // ============================================

  let publicacaoAtualMyDropsNex = null;

  function abrirModalDuracaoPublicacaoMyDropsNex(tipoPublicacao) {
    publicacaoAtualMyDropsNex = { tipo: tipoPublicacao };

    const modal = document.getElementById(
      'modalDuracaoPublicacaoMyDropsNex'
    );
    const input = document.getElementById('inputDuracaoDiasMyDropsNex');

    if (!modal) return;

    const radio24 = modal.querySelector(
      'input[name="duracaoPublicacaoMyDropsNex"][value="24h"]'
    );
    if (radio24) radio24.checked = true;

    if (input) input.value = '';

    atualizarCampoDuracaoPersonalizadaMyDropsNex();

    modal.classList.remove('hidden');
  }

  function fecharModalDuracaoPublicacaoMyDropsNex() {
    const modal = document.getElementById(
      'modalDuracaoPublicacaoMyDropsNex'
    );
    if (modal) modal.classList.add('hidden');
    publicacaoAtualMyDropsNex = null;
  }

  function atualizarCampoDuracaoPersonalizadaMyDropsNex() {
    const modal = document.getElementById(
      'modalDuracaoPublicacaoMyDropsNex'
    );
    const wrap = document.getElementById('duracaoPersonalizadaWrapMyDropsNex');
    const input = document.getElementById('inputDuracaoDiasMyDropsNex');

    const selecionado = modal?.querySelector(
      'input[name="duracaoPublicacaoMyDropsNex"]:checked'
    )?.value;

    const mostrar = selecionado === 'custom';

    if (wrap) wrap.style.display = mostrar ? 'flex' : 'none';

    if (input) {
      if (mostrar) {
        if (!input.value) input.value = '1';
      } else {
        input.value = '';
      }
    }
  }

  function calcularDuracaoPublicacaoMyDropsNex() {
    const modal = document.getElementById(
      'modalDuracaoPublicacaoMyDropsNex'
    );
    const input = document.getElementById('inputDuracaoDiasMyDropsNex');

    const selecionado =
      modal?.querySelector(
        'input[name="duracaoPublicacaoMyDropsNex"]:checked'
      )?.value || '24h';

    const agora = Date.now();

    if (selecionado === '12h') {
      return {
        modo: '12h',
        horas: 12,
        dias: null,
        expiraEm: new Date(agora + 12 * 60 * 60 * 1000).toISOString()
      };
    }

    if (selecionado === '24h') {
      return {
        modo: '24h',
        horas: 24,
        dias: null,
        expiraEm: new Date(agora + 24 * 60 * 60 * 1000).toISOString()
      };
    }

    if (selecionado === 'permanente') {
      return {
        modo: 'permanente',
        horas: null,
        dias: null,
        expiraEm: null
      };
    }

    const textoDias = (input?.value || '').trim();
    const dias = Number(textoDias);

    if (!textoDias) {
      alert('Digite a quantidade de dias');
      input?.focus();
      return null;
    }

    if (!Number.isFinite(dias)) {
      alert('Digite um número válido');
      input?.focus();
      return null;
    }

    if (dias < 1) {
      alert('Mínimo: 1 dia');
      input?.focus();
      return null;
    }

    if (dias > 365) {
      alert('Máximo: 365 dias');
      input?.focus();
      return null;
    }

    return {
      modo: 'personalizado',
      horas: null,
      dias,
      expiraEm: new Date(agora + dias * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  // ============================================
  // CONVERTER VÍDEO PARA DATAURL
  // ============================================

  function blobParaDataURLMyDropsNex(blob) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onloadend = () => resolve(String(leitor.result || ''));
      leitor.onerror = reject;
      leitor.readAsDataURL(blob);
    });
  }

  async function converterVideoParaDataURLMyDropsNex(src) {
    if (!src) return '';

    if (src.startsWith('data:')) return src;

    try {
      const resposta = await fetch(src);
      const blob = await resposta.blob();
      return await blobParaDataURLMyDropsNex(blob);
    } catch (erro) {
      console.error('Erro ao converter vídeo para DataURL:', erro);
      return '';
    }
  }

  // ============================================
  // CAPTURAR EDITOR COMO IMAGEM (html2canvas)
  // ============================================

  async function capturarEditorComoImagemMyDropsNex() {
    const stage = document.getElementById('fotoEditorStageMyDropsNex');

    if (!stage) return '';

    const canvas = await html2canvas(stage, {
      backgroundColor: '#000',
      useCORS: true,
      scale: Math.min(2, window.devicePixelRatio || 1)
    });

    return canvas.toDataURL('image/png', 1);
  }

  // ============================================
  // OBTER VÍDEO ATUAL (câmera ou drops)
  // ============================================

  function obterVideoAtualNoDropsMyDropsNex() {
    const item = document.querySelector(
      '#fotoEditorLayerMyDropsNex .video-editor-video-mydrops-nex'
    );

    const video = item?.querySelector('video');
    if (!item || !video) return null;

    return {
      src: video.currentSrc || video.src || '',
      loop: item.dataset.loop === '1' || video.loop === true
    };
  }

  function obterVideoAtualNaCameraMyDropsNex() {
    const overlay = document.getElementById('videoEditorMyDropsNex');
    const preview = document.getElementById('videoEditorPreviewMyDropsNex');

    if (!overlay || !preview) return null;
    if (getComputedStyle(overlay).display === 'none') return null;
    if (!preview.src) return null;

    return {
      src: preview.currentSrc || preview.src || '',
      loop: preview.loop === true
    };
  }
  // ============================================
// MODAL DE CONFIRMAÇÃO DE PUBLICAÇÃO
// ============================================

function mostrarModalPublicandoMyDrops() {
  const antigo = document.querySelector('.mydrops-publishing-modal');
  if (antigo) antigo.remove();

  const modal = document.createElement('div');
  modal.className = 'mydrops-publishing-modal';
  modal.id = 'mydropsPublishingModal';

  modal.innerHTML = `
    <div class="mydrops-publishing-card">
      <div class="mydrops-publishing-icon">📤</div>
      <div class="mydrops-publishing-title">Seu Drops está sendo publicado</div>
      <div class="mydrops-publishing-subtitle">Aguarde um momento...</div>
      <div class="mydrops-publishing-spinner"></div>
    </div>
  `;

  document.body.appendChild(modal);

  setTimeout(() => {
    fecharModalPublicandoMyDrops();
  }, 5000);
}

function fecharModalPublicandoMyDrops() {
  const modal = document.getElementById('mydropsPublishingModal');
  if (modal) modal.remove();
}

// ============================================
// LIMPAR CAMPOS DE LEGENDA
// ============================================

function limparCamposLegendaMyDrops() {
  if (typeof window.getLegendaTemporariaMyDropsNex === 'function') {
    // Não precisa fazer nada aqui — o editor limpa
  }

  const legendaFotoInput = document.getElementById('legendaMyDropsInput');
  if (legendaFotoInput) {
    legendaFotoInput.value = '';
    const contador = document.getElementById('legendaContadorMyDrops');
    if (contador) contador.textContent = '0/500';
  }

  const legendaVideoInput = document.getElementById(
    'legendaVideoMyDropsInput'
  );
  if (legendaVideoInput) {
    legendaVideoInput.value = '';
    const contador = document.getElementById(
      'legendaVideoContadorMyDrops'
    );
    if (contador) contador.textContent = '0/500';
  }

  console.log('🧹 Campos de legenda limpos');
}

// ============================================
// CONCLUIR PUBLICAÇÃO
// ============================================

async function concluirPublicacaoComDuracaoMyDropsNex() {
  if (!publicacaoAtualMyDropsNex?.tipo) return;

  const duracao = calcularDuracaoPublicacaoMyDropsNex();
  if (!duracao) return;

  const origem = publicacaoAtualMyDropsNex.tipo;
  const videoCamera = obterVideoAtualNaCameraMyDropsNex();
  const videoDrops = obterVideoAtualNoDropsMyDropsNex();

  // Pega legenda
  let legenda = '';

  const legendaFotoInput = document.getElementById('legendaMyDropsInput');
  const legendaVideoInput = document.getElementById(
    'legendaVideoMyDropsInput'
  );

  const fotoEditorVisivel =
    document.getElementById('fotoEditorMyDropsNex')?.style?.display !==
    'none';
  const videoEditorVisivel =
    document.getElementById('videoEditorMyDropsNex')?.style?.display !==
    'none';

  if (fotoEditorVisivel && legendaFotoInput) {
    legenda = legendaFotoInput.value.trim();
  } else if (videoEditorVisivel && legendaVideoInput) {
    legenda = legendaVideoInput.value.trim();
  }

  let videoInfo = null;

  if (origem === 'video') {
    videoInfo =
      videoCamera ||
      (window.urlVideoGravadoMyDropsNex
        ? {
            src: window.urlVideoGravadoMyDropsNex,
            loop: window.loopVideoMyDropsNex === true
          }
        : null);
  } else {
    videoInfo = videoDrops;
  }

  let publicacao = null;

  // ============================================
  // VÍDEO
  // ============================================

  if (videoInfo?.src) {
    const mediaUrl = await converterVideoParaDataURLMyDropsNex(
      videoInfo.src
    );

    if (!mediaUrl) {
      alert('Não foi possível salvar o vídeo.');
      return;
    }

    publicacao = {
      id: gerarIdPublicacaoMyDropsNex(),
      autorId: Drops.usernameAtual,
      origem,
      midiaTipo: 'video',
      mediaUrl,
      loop: !!videoInfo.loop,
      criadoEm: Date.now(),
      expiraEm: duracao.expiraEm,
      duracao: duracao.modo,
      legenda: legenda || ''
    };
  } else {
    // ============================================
    // IMAGEM
    // ============================================

    const mediaUrl = await capturarEditorComoImagemMyDropsNex();

    if (!mediaUrl) {
      alert('Não foi possível salvar a publicação.');
      return;
    }

    publicacao = {
      id: gerarIdPublicacaoMyDropsNex(),
      autorId: Drops.usernameAtual,
      origem,
      midiaTipo: 'image',
      mediaUrl,
      loop: false,
      criadoEm: Date.now(),
      expiraEm: duracao.expiraEm,
      duracao: duracao.modo,
      legenda: legenda || ''
    };
  }

  // ============================================
  // SALVA E LIMPA
  // ============================================

  mostrarModalPublicandoMyDrops();

// Salva localmente (feedback rápido)
publicacoesMyDropsNex.unshift(publicacao);
salvarPublicacoesMyDropsNex();

// Envia pro Supabase (em segundo plano)
try {
  alert('1. Função upload existe? ' + (window.uploadMidiaDropsSupabase ? 'SIM' : 'NÃO'));

  const urlMidia = await window.uploadMidiaDropsSupabase?.(publicacao.mediaUrl);

  alert('2. Upload retornou: ' + (urlMidia || 'FALHOU'));

  if (urlMidia) {
    const pubSupabase = await window.criarPublicacaoSupabase?.({
      tipo: publicacao.midiaTipo === 'video' ? 'video' : 'foto',
      mediaUrl: urlMidia,
      legenda: publicacao.legenda || '',
      loop: publicacao.loop === true,
      duracao: publicacao.duracao || '24h',
      expiraEm: publicacao.expiraEm || null
    });

    if (pubSupabase) {
      // Guarda o ID do Supabase pra poder apagar depois
      publicacao.idSupabase = pubSupabase.id;
      salvarPublicacoesMyDropsNex();
      console.log('☁️ Drop sincronizado com Supabase');
    }
  }
} catch (erro) {
  console.error('Erro ao sincronizar drop com Supabase:', erro);
}

  limparCamposLegendaMyDrops();
  fecharModalDuracaoPublicacaoMyDropsNex();

  // Fecha os editores
  if (origem === 'video') {
    if (typeof window.fecharEditorVideoMyDropsNex === 'function') {
      window.fecharEditorVideoMyDropsNex();
    }
  } else {
    const editorFoto = document.getElementById('fotoEditorMyDropsNex');
    if (editorFoto) editorFoto.style.display = 'none';
  }

  // Renderiza
  renderizarPublicacoesMyDropsNex();

  if (typeof renderizarPublicacoesNearbyNex === 'function') {
    renderizarPublicacoesNearbyNex();
  }

  // Volta pra tela My Drops
  setTimeout(() => {
    fecharModalPublicandoMyDrops();

    const myDropsScreen = document.getElementById('mydrops');
    if (myDropsScreen && typeof mostrarTela === 'function') {
      mostrarTela('mydrops', 0);
    }
  }, 1500);

  publicacaoAtualMyDropsNex = null;
}

// ============================================
// CRIAR CARD DE PUBLICAÇÃO NO GRID
// ============================================

function criarCardPublicacaoMyDropsNex(pub) {
  const card = document.createElement('article');
  card.className = 'mydrops-publication-card';
  card.dataset.pubId = pub.id;

  // ============================================
  // MÍDIA
  // ============================================

  const media = document.createElement('div');
  media.className = 'mydrops-publication-media';

  if (pub.midiaTipo === 'video') {
    const video = document.createElement('video');
    video.src = pub.mediaUrl;
    video.loop = !!pub.loop;
    video.muted = !!pub.loop;
    video.autoplay = !!pub.loop;
    video.playsInline = true;
    video.preload = 'metadata';
    video.controls = true;
    video.style.display = 'block';

    media.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = pub.mediaUrl;
    img.alt = 'Publicação My Drops';
    media.appendChild(img);
  }

// ⚠️ CORREÇÃO: legenda removida do card.
// O card mostra apenas mídia + overlay (data/hora/origem/duração).
  
  // ============================================
  // OVERLAY (metadados)
  // ============================================

  const overlay = document.createElement('div');
  overlay.className = 'mydrops-publication-overlay';

  const origem =
    String(pub.origem || 'drops').charAt(0).toUpperCase() +
    String(pub.origem || 'drops').slice(1);

  const duracao = formatarDuracaoPublicacaoMyDropsNex(pub.duracao);

  const dataObj = new Date(pub.criadoEm || Date.now());

  const hora = dataObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const data = dataObj.toLocaleDateString('pt-BR');

  overlay.innerHTML = `
    <div class="mydrops-publication-top">
      <span class="mydrops-publication-origem">${origem}</span>
      <span class="mydrops-publication-badge">${duracao}</span>
    </div>

    <div class="mydrops-publication-bottom">
      <small class="mydrops-publication-date">
        <span>${hora}</span>
        <span>${data}</span>
      </small>
      ${
        pub.midiaTipo === 'video' && pub.loop
          ? '<span class="mydrops-publication-badge loop">Loop</span>'
          : ''
      }
    </div>
  `;

  // ============================================
  // MONTAGEM FINAL
  // ============================================

  card.appendChild(media);
card.appendChild(overlay);

return card;
}

// ============================================
// RENDERIZAR PUBLICACOES NO GRID
// ============================================

function renderizarPublicacoesMyDropsNex() {
  const grid = document.querySelector('.mydrops-grid');
  if (!grid) return;

  const publicacoesOrdenadas = obterPublicacoesOrdenadasMyDropsNex();

  grid.innerHTML = '';

  if (!publicacoesOrdenadas.length) {
    const vazio = document.createElement('div');
    vazio.className = 'mydrops-empty-state';
    vazio.style.gridColumn = '1 / -1';
    vazio.textContent = 'Nenhuma publicação ainda.';
    grid.appendChild(vazio);
    return;
  }

  publicacoesOrdenadas.forEach((pub, index) => {
    const card = criarCardPublicacaoMyDropsNex(pub);

    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    card.addEventListener('click', () => {
      abrirVisualizadorPublicacaoMyDropsNex(publicacoesOrdenadas, index);
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        abrirVisualizadorPublicacaoMyDropsNex(publicacoesOrdenadas, index);
      }
    });

    grid.appendChild(card);
  });
}
    // ============================================
  // MODAL DE LISTA (VISUALIZAÇÕES/REAÇÕES)
  // ============================================

  function normalizarListaPublicacaoMyDropsNex(lista) {
    if (!Array.isArray(lista)) return [];

    return lista.map((item) => {
      if (typeof item === 'string') {
        return {
          nome: item,
          avatar: item.trim().charAt(0).toUpperCase()
        };
      }

      if (item && typeof item === 'object') {
        const nome = String(
          item.nome || item.name || item.usuario || 'Pessoa'
        ).trim();

        return {
          nome,
          avatar: String(item.avatar || nome.charAt(0).toUpperCase() || '?')
        };
      }

      const texto = String(item || 'Pessoa').trim();
      return {
        nome: texto,
        avatar: texto.charAt(0).toUpperCase()
      };
    });
  }

  function abrirModalListaPublicacaoMyDropsNex(titulo, lista) {
    const antigo = document.querySelector('.mydrops-list-modal');
    if (antigo) antigo.remove();

    const itens = normalizarListaPublicacaoMyDropsNex(lista);

    const modal = document.createElement('div');
    modal.className = 'mydrops-list-modal';
    modal.innerHTML = `
      <div class="mydrops-list-modal-card">
        <div class="mydrops-list-modal-head">
          <strong>${escapeHTML(titulo)}</strong>
          <button type="button" class="mydrops-list-modal-close">✕</button>
        </div>

        <div class="mydrops-list-modal-body">
          ${
            itens.length
              ? itens
                  .map(
                    (item) => `
              <div class="mydrops-list-modal-item">
                <div class="mydrops-list-modal-avatar">${escapeHTML(item.avatar)}</div>
                <div class="mydrops-list-modal-name">${escapeHTML(item.nome)}</div>
              </div>
            `
                  )
                  .join('')
              : '<div class="mydrops-list-modal-empty">Nenhum registro ainda.</div>'
          }
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.mydrops-list-modal-close').onclick = () => {
      modal.remove();
    };

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // ============================================
  // MODAL DE EXCLUIR PUBLICAÇÃO
  // ============================================

  function abrirModalExcluirPublicacaoMyDropsNex(onConfirmar) {
    const antigo = document.querySelector('.mydrops-delete-modal');
    if (antigo) antigo.remove();

    const modal = document.createElement('div');
    modal.className = 'mydrops-delete-modal';

    modal.innerHTML = `
      <div class="mydrops-delete-card">
        <div class="mydrops-delete-title">
          Deseja apagar esta publicação?
        </div>

        <div class="mydrops-delete-actions">
          <button type="button" class="mydrops-delete-cancel">
            Não
          </button>

          <button type="button" class="mydrops-delete-confirm">
            Sim
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.mydrops-delete-cancel').onclick = () => {
      modal.remove();
    };

    modal.querySelector('.mydrops-delete-confirm').onclick = () => {
      modal.remove();

      if (typeof onConfirmar === 'function') {
        onConfirmar();
      }
    };

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // ============================================
  // VISUALIZADOR DE PUBLICAÇÃO PRÓPRIA
  // ============================================

  let publicacoesViewerMyDropsNex = [];
  let publicacaoViewerIndexMyDropsNex = 0;

  function abrirVisualizadorPublicacaoMyDropsNex(lista, indexInicial = 0) {
    publicacoesViewerMyDropsNex = obterPublicacoesOrdenadasMyDropsNex().length
      ? lista.map((pub) => ({
          ...pub,
          visualizacoes: Array.isArray(pub.visualizacoes)
            ? pub.visualizacoes
            : [],
          reacoes: {
            heart: Array.isArray(pub?.reacoes?.heart) ? pub.reacoes.heart : [],
            broken: Array.isArray(pub?.reacoes?.broken)
              ? pub.reacoes.broken
              : []
          }
        }))
      : [];

    if (!publicacoesViewerMyDropsNex.length) return;

    publicacaoViewerIndexMyDropsNex = Math.max(
      0,
      Math.min(indexInicial, publicacoesViewerMyDropsNex.length - 1)
    );

    const antigo = document.querySelector('.mydrops-publication-viewer');
    if (antigo) antigo.remove();

    const viewer = document.createElement('div');
    viewer.className = 'mydrops-publication-viewer';

    viewer.innerHTML = `
      <div class="nearby-drop-bg"></div>

      <div class="nearby-drop-shell">
        <div class="nearby-drop-topbar">
          <div class="nearby-drop-top-left">
            <div class="nearby-drop-user">
              <div class="nearby-drop-avatar" id="mydropsPubAvatar"></div>

              <div class="nearby-drop-user-meta">
                <strong id="mydropsPubNome"></strong>
                <small id="mydropsPubInfo"></small>
              </div>
            </div>
          </div>

          <div class="nearby-drop-top-right">
            <button class="nearby-drop-close" type="button" aria-label="Voltar">➥</button>
            <div class="nearby-drop-counter" id="mydropsPubCounter"></div>
          </div>
        </div>

        <div class="nearby-drop-media-wrap">
          <div class="nearby-drop-media" id="mydropsPubMedia"></div>
        </div>

        <div class="mydrops-publication-footer">
          <div class="mydrops-publication-nav">
            <button type="button" class="mydrops-publication-nav-btn mydrops-publication-nav-left" aria-label="Anterior">
              ←
            </button>

            <button type="button" class="mydrops-publication-nav-btn mydrops-publication-nav-right" aria-label="Próxima">
              →
            </button>
          </div>

          <div class="mydrops-publication-bottom-row">
            <div class="mydrops-publication-stats">
              <button type="button" class="mydrops-publication-stat-btn" data-list="views">
                👁 <span id="mydropsPubViews">0</span>
              </button>

              <button type="button" class="mydrops-publication-stat-btn" data-list="heart">
                ❤️ <span id="mydropsPubHeart">0</span>
              </button>

              <button type="button" class="mydrops-publication-stat-btn" data-list="broken">
                💔 <span id="mydropsPubBroken">0</span>
              </button>
            </div>

            <button type="button" class="mydrops-publication-trash-btn" aria-label="Excluir publicação">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(viewer);
    document.body.style.overflow = 'hidden';

    const fechar = () => {
      viewer.remove();
      document.body.style.overflow = '';
    };

    // ============================================
    // RENDERIZAR
    // ============================================

    const renderizarViewer = () => {
      const pub =
        publicacoesViewerMyDropsNex[publicacaoViewerIndexMyDropsNex];
      if (!pub) {
        fechar();
        return;
      }

      const avatar = viewer.querySelector('#mydropsPubAvatar');
      const nome = viewer.querySelector('#mydropsPubNome');
      const info = viewer.querySelector('#mydropsPubInfo');
      const counter = viewer.querySelector('#mydropsPubCounter');
      const media = viewer.querySelector('#mydropsPubMedia');
      const viewsEl = viewer.querySelector('#mydropsPubViews');
      const heartEl = viewer.querySelector('#mydropsPubHeart');
      const brokenEl = viewer.querySelector('#mydropsPubBroken');

      const dataHora = formatarDataHoraPublicacaoMyDropsNex(pub.criadoEm);

      if (avatar) {
        avatar.textContent = (Drops.usernameAtual || '?')
          .charAt(0)
          .toUpperCase();
      }
      if (nome) nome.textContent = 'Minhas publicações';
      if (info) info.textContent = `${dataHora.data} • ${dataHora.hora}`;
      if (counter) {
        counter.textContent = `${publicacaoViewerIndexMyDropsNex + 1}/${
          publicacoesViewerMyDropsNex.length
        }`;
      }

      if (viewsEl) {
        viewsEl.textContent = Array.isArray(pub.visualizacoes)
          ? pub.visualizacoes.length
          : 0;
      }
      if (heartEl) {
        heartEl.textContent = Array.isArray(pub?.reacoes?.heart)
          ? pub.reacoes.heart.length
          : 0;
      }
      if (brokenEl) {
        brokenEl.textContent = Array.isArray(pub?.reacoes?.broken)
          ? pub.reacoes.broken.length
          : 0;
      }

      // MÍDIA
      if (media) {
        const url = String(pub.mediaUrl || '');
        const tipo = String(pub.midiaTipo || '').toLowerCase();
        const ehVideo =
          tipo === 'video' || /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

        media.innerHTML = '';

        if (ehVideo) {
          const video = document.createElement('video');
          video.src = url;
          video.controls = true;
          video.setAttribute('controls', '');
          video.autoplay = true;
          video.muted = !!pub.loop;
          video.loop = !!pub.loop;
          video.playsInline = true;
          video.preload = 'metadata';
          video.style.display = 'block';
          media.appendChild(video);
        } else {
          const img = document.createElement('img');
          img.src = url;
          img.alt = 'Publicação';
          media.appendChild(img);
        }
      }

      // LEGENDA
      const legendaAntiga = viewer.querySelector('.mydrops-viewer-legenda');
      if (legendaAntiga) legendaAntiga.remove();

      const temLegenda =
        pub.legenda &&
        typeof pub.legenda === 'string' &&
        pub.legenda.trim().length > 0;

      if (temLegenda) {
        const legendaDiv = document.createElement('div');
        legendaDiv.className = 'mydrops-viewer-legenda';

        const textoCompleto = pub.legenda;
        const textoLimitado =
          textoCompleto.length > 60
            ? textoCompleto.slice(0, 60) + '...'
            : textoCompleto;
        const precisaExpandir = textoCompleto.length > 60;

        const text = document.createElement('p');
        text.className = 'mydrops-viewer-legenda-texto';
        text.textContent = textoLimitado;
        text.dataset.completo = textoCompleto;
        text.dataset.limitado = textoLimitado;
        text.dataset.expandido = 'false';

        legendaDiv.appendChild(text);

        if (precisaExpandir) {
          const btnVerMais = document.createElement('button');
          btnVerMais.type = 'button';
          btnVerMais.className = 'mydrops-viewer-ver-mais';
          btnVerMais.textContent = 'Ver mais';
          btnVerMais.dataset.expandido = 'false';

          legendaDiv.appendChild(btnVerMais);
        }

        const footer = viewer.querySelector(
          '.mydrops-publication-footer'
        );
        const shell = viewer.querySelector('.nearby-drop-shell');

        if (footer && shell) {
          footer.parentNode.insertBefore(legendaDiv, footer.nextSibling);
        } else if (shell) {
          shell.appendChild(legendaDiv);
        }
      }
    };

    // ============================================
    // EVENTOS
    // ============================================

    viewer.querySelector('.nearby-drop-close').onclick = fechar;

    viewer.addEventListener('click', (e) => {
      if (e.target === viewer) fechar();
    });

    viewer.querySelector('.mydrops-publication-nav-left').onclick = () => {
      if (publicacaoViewerIndexMyDropsNex <= 0) return;
      publicacaoViewerIndexMyDropsNex -= 1;
      renderizarViewer();
    };

    viewer.querySelector('.mydrops-publication-nav-right').onclick = () => {
      if (
        publicacaoViewerIndexMyDropsNex >=
        publicacoesViewerMyDropsNex.length - 1
      ) {
        return;
      }
      publicacaoViewerIndexMyDropsNex += 1;
      renderizarViewer();
    };

    // Botões de stats (views, heart, broken)
    viewer.querySelectorAll('.mydrops-publication-stat-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pub =
          publicacoesViewerMyDropsNex[publicacaoViewerIndexMyDropsNex];
        if (!pub) return;

        const tipo = btn.getAttribute('data-list');

        if (tipo === 'views') {
          abrirModalListaPublicacaoMyDropsNex(
            'Visualizações',
            pub.visualizacoes || []
          );
        }

        if (tipo === 'heart') {
          abrirModalListaPublicacaoMyDropsNex(
            'Reações ❤️',
            pub.reacoes?.heart || []
          );
        }

        if (tipo === 'broken') {
          abrirModalListaPublicacaoMyDropsNex(
            'Reações 💔',
            pub.reacoes?.broken || []
          );
        }
      });
    });

    // Botão excluir
    const btnTrash = viewer.querySelector('.mydrops-publication-trash-btn');

    if (btnTrash) {
      btnTrash.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        abrirModalExcluirPublicacaoMyDropsNex(async () => {
  const pub =
    publicacoesViewerMyDropsNex[publicacaoViewerIndexMyDropsNex];
  if (!pub) return;

  // Apaga do Supabase (em segundo plano)
  if (pub.idSupabase) {
    try {
      await window.apagarPublicacaoSupabase?.(pub.idSupabase);
      console.log('🗑️ Drop apagado do Supabase');
    } catch (erro) {
      console.error('Erro ao apagar do Supabase:', erro);
    }
  }

  publicacoesMyDropsNex = publicacoesMyDropsNex.filter(
    (item) => item.id !== pub.id
  );

  salvarPublicacoesMyDropsNex();
  renderizarPublicacoesMyDropsNex();

          publicacoesViewerMyDropsNex =
            obterPublicacoesOrdenadasMyDropsNex();

          if (!publicacoesViewerMyDropsNex.length) {
            const viewerAtual = document.querySelector(
              '.mydrops-publication-viewer'
            );
            if (viewerAtual) viewerAtual.remove();
            return;
          }

          if (
            publicacaoViewerIndexMyDropsNex >=
            publicacoesViewerMyDropsNex.length
          ) {
            publicacaoViewerIndexMyDropsNex =
              publicacoesViewerMyDropsNex.length - 1;
          }

          renderizarViewer();
        });
      });
    }

    renderizarViewer();
  }

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.publicacoesMyDropsNex = publicacoesMyDropsNex;
  window.obterPublicacoesOrdenadasMyDropsNex =
    obterPublicacoesOrdenadasMyDropsNex;
  window.carregarPublicacoesMyDropsNex = carregarPublicacoesMyDropsNex;
  window.salvarPublicacoesMyDropsNex = salvarPublicacoesMyDropsNex;
  window.removerPublicacoesExpiradasMyDropsNex =
    removerPublicacoesExpiradasMyDropsNex;
  window.renderizarPublicacoesMyDropsNex = renderizarPublicacoesMyDropsNex;

  window.abrirModalDuracaoPublicacaoMyDropsNex =
    abrirModalDuracaoPublicacaoMyDropsNex;
  window.fecharModalDuracaoPublicacaoMyDropsNex =
    fecharModalDuracaoPublicacaoMyDropsNex;
  window.calcularDuracaoPublicacaoMyDropsNex =
    calcularDuracaoPublicacaoMyDropsNex;
  window.atualizarCampoDuracaoPersonalizadaMyDropsNex =
    atualizarCampoDuracaoPersonalizadaMyDropsNex;

  window.concluirPublicacaoComDuracaoMyDropsNex =
    concluirPublicacaoComDuracaoMyDropsNex;
  window.abrirVisualizadorPublicacaoMyDropsNex =
    abrirVisualizadorPublicacaoMyDropsNex;

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
  // Sincroniza publicações com o Supabase ao abrir
  setTimeout(() => {
    if (typeof sincronizarPublicacoesSupabase === 'function') {
      sincronizarPublicacoesSupabase();
    }
  }, 2000);

  // Radio buttons do modal de duração
  const modalDuracao = document.getElementById(
    'modalDuracaoPublicacaoMyDropsNex'
  );

    modalDuracao
      ?.querySelectorAll('input[name="duracaoPublicacaoMyDropsNex"]')
      .forEach((radio) => {
        radio.addEventListener(
          'change',
          atualizarCampoDuracaoPersonalizadaMyDropsNex
        );
      });

    // Botões do modal de duração
    const btnCancelarDuracao = document.getElementById(
      'cancelarDuracaoPublicacaoMyDropsNex'
    );
    if (btnCancelarDuracao) {
      btnCancelarDuracao.addEventListener(
        'click',
        fecharModalDuracaoPublicacaoMyDropsNex
      );
    }

    const btnConcluirDuracao = document.getElementById(
      'concluirDuracaoPublicacaoMyDropsNex'
    );
    if (btnConcluirDuracao) {
      btnConcluirDuracao.addEventListener(
        'click',
        concluirPublicacaoComDuracaoMyDropsNex
      );
    }

    // Input de dias personalizado
    const inputDuracao = document.getElementById('inputDuracaoDiasMyDropsNex');
    if (inputDuracao) {
      inputDuracao.addEventListener('input', () => {
        inputDuracao.value = inputDuracao.value.replace(/\D/g, '').slice(0, 3);
      });
    }
  });

  // ============================================
  // DEBUG
  // ============================================

  console.log('📝 12-mydrops.js carregado (via adapter)');

})();
