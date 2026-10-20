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
  selos: p.selos || null,

  // ⚠️ FASE 2 — dados do autor original (drop compartilhado)
  compartilhado_de_id: p.compartilhado_de_id || null,
  compartilhado_de_username: p.compartilhado_de_username || '',
  compartilhado_de_nome: p.compartilhado_de_nome || '',
  compartilhado_de_avatar: p.compartilhado_de_avatar || '',

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
// CAPTURA NATIVA (sem html2canvas)
// ⚠️ iOS/WebKit: html2canvas TRAVA com box-shadow +
//    overflow hidden + background-image grande.
//    Essa versão desenha manualmente num <canvas>
//    nativo — nunca trava, é 10x mais rápida.
// ============================================
async function capturarEditorComoImagemMyDropsNex() {
  const notasAberto =
    document.getElementById('notasEditorNex')?.classList.contains('aberto');

  const fotoNovoAberto =
    document.getElementById('fotoEditorNex')?.classList.contains('aberto');

  const fotoAntigoAberto =
    document.getElementById('fotoEditorMyDropsNex')?.style?.display === 'flex';

  let papel = null;
  let camada = null;
  let corFundo = '#ffffff';

  if (notasAberto) {
    papel = document.getElementById('notasPapelNex');
    camada = document.getElementById('notasCamadaNex');
    corFundo = '#fffef8';
  } else if (fotoNovoAberto) {
    papel = document.getElementById('fotoPapelNex');
    camada = document.getElementById('fotoCamadaNex');
    corFundo = '#000000';
  } else if (fotoAntigoAberto) {
    papel = document.getElementById('fotoEditorStageMyDropsNex');
    camada = document.getElementById('fotoEditorLayerMyDropsNex');
    corFundo = '#000000';
  }

  if (!papel) {
    console.warn('⚠️ Papel do editor não encontrado');
    return '';
  }

  // ============================================
  // 1. Dimensões do papel
  // ============================================
  const rect = papel.getBoundingClientRect();
  const largura = Math.round(rect.width);
  const altura = Math.round(rect.height);

  if (!largura || !altura) {
    console.warn('⚠️ Papel sem dimensão');
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // ============================================
  // 2. Fundo (cor ou imagem)
  // ============================================
  const bgImageRaw = papel.style.backgroundImage || '';
  const temBgImage =
    bgImageRaw && bgImageRaw !== 'none' && bgImageRaw.includes('url(');

  if (temBgImage) {
    const bgUrl = bgImageRaw
      .replace(/^url\(["']?/, '')
      .replace(/["']?\)$/, '');

    await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const ratioImg = img.width / img.height;
        const ratioPapel = largura / altura;

        let sw, sh, sx, sy;

        if (ratioImg > ratioPapel) {
          sh = img.height;
          sw = sh * ratioPapel;
          sx = (img.width - sw) / 2;
          sy = 0;
        } else {
          sw = img.width;
          sh = sw / ratioPapel;
          sx = 0;
          sy = (img.height - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, largura, altura);
        resolve();
      };
      img.onerror = () => {
        ctx.fillStyle = corFundo;
        ctx.fillRect(0, 0, largura, altura);
        resolve();
      };
      img.src = bgUrl;
    });
  } else {
    const cor = papel.style.backgroundColor || corFundo;
    ctx.fillStyle = cor || corFundo;
    ctx.fillRect(0, 0, largura, altura);
  }

  // ============================================
  // 3. Foto principal (só pro editor de Foto novo)
  // ============================================
  if (fotoNovoAberto) {
    const fotoDataURL =
      typeof window.getFotoAtualDataURL === 'function'
        ? window.getFotoAtualDataURL()
        : null;

    if (fotoDataURL) {
      await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const ratioImg = img.width / img.height;
          const ratioPapel = largura / altura;

          let sw, sh, sx, sy;

          if (ratioImg > ratioPapel) {
            sh = img.height;
            sw = sh * ratioPapel;
            sx = (img.width - sw) / 2;
            sy = 0;
          } else {
            sw = img.width;
            sh = sw / ratioPapel;
            sx = 0;
            sy = (img.height - sh) / 2;
          }

          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, largura, altura);
          resolve();
        };
        img.onerror = resolve;
        img.src = fotoDataURL;
      });
    }
  }

  // ============================================
  // 4. Elementos (textos + stickers)
  // ============================================
  if (camada) {
    const elementos = camada.querySelectorAll(
      '.video-editor-text-mydrops-nex, .video-editor-photo-mydrops-nex'
    );

    for (const el of elementos) {
      if (el.classList.contains('editor-alca-nex')) continue;
      if (el.id === 'notasLixeiraNex') continue;
      if (el.id === 'fotoLixeiraNex') continue;

      const elRect = el.getBoundingClientRect();
      const x = elRect.left - rect.left;
      const y = elRect.top - rect.top;

      // ============================================
      // TEXTO
      // ============================================
      if (el.classList.contains('video-editor-text-mydrops-nex')) {
        const body = el.querySelector('.video-editor-text-body-mydrops-nex');
        if (!body) continue;

        const texto = (body.textContent || '').trim();
        if (!texto) continue;
        if (texto === '2 toque para editar') continue;

        const fontSize = parseFloat(body.style.fontSize) || 28;
        const fontWeight = body.style.fontWeight || '500';
        const fontStyle = body.style.fontStyle || 'normal';
        const fontFamily = body.style.fontFamily || 'Arial, sans-serif';
        const cor = body.style.color || '#1a1a1a';
        const align = body.style.textAlign || 'center';
        const scale = Number(el.dataset.scale) || 1;
        const rotation = Number(el.dataset.rotation) || 0;

        let bgTema = null;
        const temas = body.className.match(/tema-([a-z]+)/);
        if (temas) {
          const mapa = {
            branco: '#ffffff',
            escuro: '#1a1a1a',
            azul: '#60a5fa',
            verde: '#4ade80',
            amarelo: '#facc15',
            rosa: '#f472b6',
            roxo: '#a78bfa',
            neon: '#0a0a0a',
            papel: '#fffef5',
            vidro: 'rgba(200,220,255,0.5)'
          };
          bgTema = mapa[temas[1]] || null;
        }

        ctx.save();
        ctx.translate(x + elRect.width / 2, y + elRect.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale, scale);

        if (bgTema) {
          ctx.fillStyle = bgTema;
          ctx.fillRect(
            -elRect.width / 2 / scale,
            -elRect.height / 2 / scale,
            elRect.width / scale,
            elRect.height / scale
          );
        }

        ctx.fillStyle = cor;
        ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';

        const linhas = texto.split('\n');
        const alturaLinha = fontSize * 1.2;
        const total = linhas.length * alturaLinha;
        const yInicial = -total / 2 + alturaLinha / 2;

        const xTexto =
          align === 'center'
            ? 0
            : align === 'right'
              ? elRect.width / 2 / scale
              : -elRect.width / 2 / scale;

        linhas.forEach((linha, i) => {
          ctx.fillText(linha, xTexto, yInicial + i * alturaLinha);
        });

        ctx.restore();
      }

      // ============================================
      // STICKER (foto por cima)
      // ============================================
      else if (el.classList.contains('video-editor-photo-mydrops-nex')) {
        const img = el.querySelector(
          '.video-editor-photo-body-mydrops-nex img'
        );
        if (!img || !img.src) continue;

        const scale = Number(el.dataset.scale) || 1;
        const rotation = Number(el.dataset.rotation) || 0;

        await new Promise((resolve) => {
          const imgCarregada = new Image();
          imgCarregada.crossOrigin = 'anonymous';
          imgCarregada.onload = () => {
            ctx.save();
            ctx.translate(x + elRect.width / 2, y + elRect.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(scale, scale);

            ctx.drawImage(
              imgCarregada,
              -elRect.width / 2 / scale,
              -elRect.height / 2 / scale,
              elRect.width / scale,
              elRect.height / scale
            );

            ctx.restore();
            resolve();
          };
          imgCarregada.onerror = resolve;
          imgCarregada.src = img.src;
        });
      }
    }
  }

  // ============================================
  // 5. Retorna DataURL
  // ============================================
  try {
    const dataUrl = canvas.toDataURL('image/png', 0.92);
    return dataUrl;
  } catch (err) {
    console.error('❌ toDataURL falhou:', err);
    return '';
  }
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

  // ⚠️ iOS: se por algum motivo publicacaoAtualMyDropsNex virou null,
  if (!publicacaoAtualMyDropsNex?.tipo) {
    const modal = document.getElementById('modalDuracaoPublicacaoMyDropsNex');
    const modalAberto = modal && !modal.classList.contains('hidden');

    if (modalAberto) {
      // Descobre o tipo pelo editor que está aberto
      const notasAberto =
        document.getElementById('notasEditorNex')?.classList.contains('aberto');
      const fotoAberto =
        document.getElementById('fotoEditorNex')?.classList.contains('aberto');
      const videoAberto =
        document.getElementById('videoEditorNex')?.classList.contains('aberto');

      publicacaoAtualMyDropsNex = {
        tipo: notasAberto ? 'notas' : fotoAberto ? 'foto' : videoAberto ? 'video' : 'foto'
      };

      console.log('🔧 iOS fallback: recuperado tipo', publicacaoAtualMyDropsNex.tipo);
    } else {
      return;
    }
  }
  
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

  // ⚠️ Foto ANTIGO: precisa existir E estar visível
const fotoAntigoEl = document.getElementById('fotoEditorMyDropsNex');
const fotoAntigoVisivel =
  !!fotoAntigoEl && fotoAntigoEl.style.display === 'flex';

// ⚠️ Foto NOVO (30-foto.js)
const fotoNovoVisivel =
  document.getElementById('fotoEditorNex')?.classList.contains('aberto');

// ⚠️ Vídeo (31-video.js)
const videoNovoVisivel =
  document.getElementById('videoEditorNex')?.classList.contains('aberto');

// ⚠️ Vídeo ANTIGO (13-editor.js) — legado
const videoAntigoEl = document.getElementById('videoEditorMyDropsNex');
const videoAntigoVisivel =
  !!videoAntigoEl && videoAntigoEl.style.display === 'flex';

// ⚠️ Notas (29-notas.js)
const notasVisivel =
  document.getElementById('notasEditorNex')?.classList.contains('aberto');

// ============================================
// ORDEM DE PRIORIDADE (primeiro que bater, usa)
// ============================================

if (notasVisivel) {
  const legendaNotasInput = document.getElementById('notasLegendaInputNex');
  legenda = (legendaNotasInput?.value || '').trim();
} else if (fotoNovoVisivel) {
  const input = document.getElementById('legendaMyDropsInput');
  legenda = (input?.value || '').trim();
} else if (fotoAntigoVisivel) {
  const input = document.getElementById('legendaMyDropsInput');
  legenda = (input?.value || '').trim();
} else if (videoNovoVisivel || videoAntigoVisivel) {
  const input = document.getElementById('legendaVideoMyDropsInput');
  legenda = (input?.value || '').trim();
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
  legenda: legenda || '',
  selos: window.obterSelosAtuais?.() || null
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
  legenda: legenda || '',
  selos: window.obterSelosAtuais?.() || null
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
  const urlMidia = await window.uploadMidiaDropsSupabase?.(publicacao.mediaUrl);

  if (urlMidia) {
    const pubSupabase = await window.criarPublicacaoSupabase?.({
  tipo: publicacao.midiaTipo === 'video' ? 'video' : 'foto',
  mediaUrl: urlMidia,
  legenda: publicacao.legenda || '',
  loop: publicacao.loop === true,
  duracao: publicacao.duracao || '24h',
  expiraEm: publicacao.expiraEm || null,
  selos: publicacao.selos || window.obterSelosAtuais?.() || null
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
  // ⚠️ Fecha o editor de Foto NOVO (30-foto.js)
  if (typeof window.fecharFotoNex === 'function') {
    const editorNovo = document.getElementById('fotoEditorNex');
    if (editorNovo && editorNovo.classList.contains('aberto')) {
      window.fecharFotoNex();
    }
  }

  // ⚠️ Fecha o editor de Foto ANTIGO (13-editor.js)
  const editorFoto = document.getElementById('fotoEditorMyDropsNex');
  if (editorFoto) editorFoto.style.display = 'none';

  // ⚠️ Fecha o editor de Notas (29-notas.js)
  if (typeof window.fecharNotasNex === 'function') {
    const editorNotas = document.getElementById('notasEditorNex');
    if (editorNotas && editorNotas.classList.contains('aberto')) {
      window.fecharNotasNex();
    }
  }
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
  card.dataset.novidadeId = pub.idSupabase || pub.id || '';
  
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
  video.playsInline = true;
  
  // ⚠️ Só baixa o vídeo se o usuário interagir
  video.preload = 'none';
  
  // ⚠️ Não dá play automático no card (economia de dados)
  video.autoplay = false; 
  
  // ⚠️ Mostra o botão nativo de play
  video.controls = true; 
  
  video.style.display = 'block';
  media.appendChild(video);
}else {
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.decoding = 'async';
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
  // CÁPSULA DE REAÇÕES
  // ============================================

  const capsulaReacao = document.createElement('div');
  capsulaReacao.className = 'mydrops-pub-reacao-capsula';
  capsulaReacao.style.display = 'none';
  capsulaReacao.dataset.pubId = pub.idSupabase || pub.id || '';
  media.appendChild(capsulaReacao);

// ⚠️ Busca reações + compartilhamentos do Supabase (async)
(async () => {
  const pubId = pub.idSupabase || pub.id;
  if (!pubId) return;

  // ============================================
  // 1. REAÇÕES ❤️ / 💔
  // ============================================

  let totalHeart = 0;
  let totalBroken = 0;

  if (typeof window.buscarReacoesSupabase === 'function') {
    try {
      const dados = await window.buscarReacoesSupabase(pubId);
      if (dados) {
        totalHeart = dados.heart || 0;
        totalBroken = dados.broken || 0;
      }
    } catch (err) {
      console.warn('Erro ao buscar reações do drop:', err);
    }
  }

  // ============================================
  // 2. COMPARTILHAMENTOS 🔁
  // ============================================

  let totalShare = 0;

  if (typeof window.contarCompartilhamentosSupabase === 'function') {
    try {
      totalShare = Number(await window.contarCompartilhamentosSupabase(pubId)) || 0;
    } catch (err) {
      console.warn('Erro ao contar compartilhamentos:', err);
    }
  }

  // ============================================
  // 3. MONTA A CÁPSULA
  // ============================================

  const temReacao = (totalHeart + totalBroken) > 0;
  const temShare = totalShare > 0;

  if (!temReacao && !temShare) {
    capsulaReacao.style.display = 'none';
    return;
  }

  let html = '';

  // Emoji de reação (prioridade ❤️)
  if (temReacao) {
    let emoji = '❤️';
    let count = totalHeart;

    if (totalHeart === 0 && totalBroken > 0) {
      emoji = '💔';
      count = totalBroken;
    }

    html += `
      <span class="mydrops-pub-reacao-emoji">${emoji}</span>
      <span class="mydrops-pub-reacao-count">${count}</span>
    `;
  }

  // Contador de compartilhamento
  if (temShare) {
    html += `
      <span class="mydrops-pub-share-icone">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="17 1 21 5 17 9"/>
          <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          <polyline points="7 23 3 19 7 15"/>
          <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
      </span>
      <span class="mydrops-pub-share-count">${totalShare}</span>
    `;
  }

  capsulaReacao.innerHTML = html;
  capsulaReacao.style.display = 'flex';
})();

  // ============================================
  // FASE 2 — CÁPSULA DE AUTOR (drop compartilhado)
  // ============================================

  if (pub.compartilhado_de_id) {
    const capsulaAutor = document.createElement('div');
    capsulaAutor.className = 'mydrops-publication-capsula-autor';

    const avatarHTML = pub.compartilhado_de_avatar
      ? `<img src="${escapeHTML(pub.compartilhado_de_avatar)}" alt="">`
      : escapeHTML(
          (pub.compartilhado_de_nome || '?').charAt(0).toUpperCase()
        );

    capsulaAutor.innerHTML = `
      <div class="mydrops-publication-capsula-autor-avatar">
        ${avatarHTML}
      </div>
      <svg class="mydrops-publication-capsula-autor-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
    `;

    card.appendChild(capsulaAutor);
  }

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
        username: '',
        avatar: item.trim().charAt(0).toUpperCase()
      };
    }

    if (item && typeof item === 'object') {
      const nome = String(
        item.nome || item.name || item.usuario || 'Pessoa'
      ).trim();

      const username = String(
        item.username || item.user || item.id || ''
      ).replace(/^@/, '').trim();

      return {
        nome,
        username,
        avatar: String(item.avatar || nome.charAt(0).toUpperCase() || '?')
      };
    }

    const texto = String(item || 'Pessoa').trim();
    return {
      nome: texto,
      username: '',
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

const itensHTML = itens.length
  ? itens
      .map((item, index) => {
        const avatarTexto = String(item.avatar || '?');
        const ehURL =
          avatarTexto.startsWith('http') ||
          avatarTexto.startsWith('data:image');

        const avatarHTML = ehURL
          ? `<img src="${escapeHTML(avatarTexto)}" alt="">`
          : escapeHTML(avatarTexto);

        return `
          <div class="mydrops-list-modal-item" data-item-index="${index}">
            <div class="mydrops-list-modal-avatar">${avatarHTML}</div>
            <div class="mydrops-list-modal-name">${escapeHTML(item.nome)}</div>
          </div>
        `;
      })
      .join('')
  : '<div class="mydrops-list-modal-empty">Nenhum registro ainda.</div>';

modal.innerHTML = `
  <div class="mydrops-list-modal-card">
    <div class="mydrops-list-modal-head">
      <strong>${escapeHTML(titulo)}</strong>
      <button type="button" class="mydrops-list-modal-close">✕</button>
    </div>

    <div class="mydrops-list-modal-body">
      ${itensHTML}
    </div>
  </div>
`;

  document.body.appendChild(modal);

  modal.querySelector('.mydrops-list-modal-close').onclick = () => {
    modal.remove();
  };

// ⚠️ Clique em item → abre o perfil
modal.querySelectorAll('.mydrops-list-modal-item').forEach((el) => {
  el.style.cursor = 'pointer';

  el.addEventListener('click', () => {
    const idx = Number(el.dataset.itemIndex);
    const item = itens[idx];
    if (!item || !item.username) return;

    // ⚠️ Fecha o modal de lista
    modal.remove();

    // ⚠️ Fecha o viewer de publicações que está por baixo
    const viewerAtual = document.querySelector('.mydrops-publication-viewer');
    if (viewerAtual) viewerAtual.remove();
    document.body.style.overflow = '';

    // ⚠️ Fecha qualquer viewer de mídia aberto
    const viewerMidia = document.querySelector('.nex-midia-viewer');
    if (viewerMidia) viewerMidia.remove();

    if (typeof window.abrirPerfilVisitadoNex === 'function') {
      window.abrirPerfilVisitadoNex(item.username, item.nome);
    }
  });
});

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
        visualizacoes: Array.isArray(pub.visualizacoes) ? pub.visualizacoes : [],
        reacoes: {
          heart: Array.isArray(pub?.reacoes?.heart) ? pub.reacoes.heart : [],
          broken: Array.isArray(pub?.reacoes?.broken) ? pub.reacoes.broken : []
        }
      }))
    : [];

  if (!publicacoesViewerMyDropsNex.length) return;

  publicacaoViewerIndexMyDropsNex = Math.max(
  0,
  Math.min(indexInicial, publicacoesViewerMyDropsNex.length - 1)
);

// ⚠️ FEEDBACK: vibra + toca ao abrir minhas publicações
if (typeof window.feedbackNex?.navegouDrop === 'function') {
  window.feedbackNex.navegouDrop();
}

// ⚠️ Fase 5: limpa a borda azul do drop que está sendo aberto
const pubAberta = publicacoesViewerMyDropsNex[publicacaoViewerIndexMyDropsNex];
if (pubAberta) {
  const idLimpar = pubAberta.idSupabase || pubAberta.id;
  window.limparNovidadeReacaoDrop?.(idLimpar);
  window.atualizarBordasCardsNex?.();
}

const antigo = document.querySelector('.mydrops-publication-viewer');
  if (antigo) antigo.remove();

  const viewer = document.createElement('div');
  viewer.className = 'mydrops-publication-viewer';

  viewer.innerHTML = `
    <div class="mydrops-pub-bg"></div>

    <div class="mydrops-pub-shell">

      <!-- TOPBAR — 3 linhas finas -->
<div class="mydrops-pub-topbar">
  <div class="mydrops-pub-topbar-linha1">
    <div class="mydrops-pub-titulo">Minhas publicações</div>

    <div class="mydrops-pub-voltar-group">
      <span class="mydrops-pub-contador" id="mydropsPubCounter">1/1</span>
      <button type="button" class="mydrops-pub-voltar" id="mydropsPubVoltar" aria-label="Voltar">➥</button>
    </div>
  </div>

  <div class="mydrops-pub-data" id="mydropsPubData">—</div>
  <div class="mydrops-pub-selos" id="mydropsPubSelos"></div>
</div>

            <!-- PALCO + PAPEL -->
<div class="mydrops-pub-palco">
  <div class="mydrops-pub-papel" id="mydropsPubMedia"></div>

  <!-- BARRA TOPO: expandir + cápsula de autor (se for compartilhado) -->
  <div class="mydrops-pub-barra-topo">
    <button type="button" class="mydrops-pub-expandir" id="mydropsPubExpandir" aria-label="Expandir mídia">⤢</button>

    <div class="mydrops-pub-capsula-autor" id="mydropsPubCapsulaAutor" style="display:none;">
      <div class="mydrops-pub-capsula-autor-avatar"></div>
      <div class="mydrops-pub-capsula-autor-texto">
        <span class="mydrops-pub-capsula-autor-nome"></span>
        <span class="mydrops-pub-capsula-autor-user"></span>
      </div>
      <svg class="mydrops-pub-capsula-autor-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
    </div>
  </div>
</div>

      <!-- RODAPÉ — CÁPSULA -->
<div class="mydrops-pub-rodape">
  <div class="mydrops-pub-capsula" id="mydropsPubCapsula" style="display:none;">
    <p class="mydrops-pub-capsula-texto" id="mydropsPubLegendaTexto"></p>
    <button type="button" class="mydrops-pub-capsula-ver-mais" id="mydropsPubVerMais">Ver mais</button>
  </div>

  <div class="mydrops-pub-rodape-vazio" id="mydropsPubRodapeVazio"></div>
</div>

      <!-- STATS + LIXEIRA -->
<div class="mydrops-pub-stats-row">
  <div class="mydrops-pub-stats-lista">
    <button type="button" class="mydrops-pub-stat-btn" data-list="views">
      👁 <span id="mydropsPubViews">0</span>
    </button>
    <button type="button" class="mydrops-pub-stat-btn" data-list="heart">
      ❤️ <span id="mydropsPubHeart">0</span>
    </button>
    <button type="button" class="mydrops-pub-stat-btn" data-list="broken">
      💔 <span id="mydropsPubBroken">0</span>
    </button>
    <button type="button" class="mydrops-pub-stat-btn" data-list="share" id="mydropsPubShareBtn" style="display:none;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:14px;height:14px;vertical-align:middle;">
        <polyline points="17 1 21 5 17 9"/>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
        <polyline points="7 23 3 19 7 15"/>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
      </svg>
      <span id="mydropsPubShare">0</span>
    </button>
  </div>

  <button type="button" class="mydrops-pub-trash-btn" aria-label="Excluir publicação">🗑️</button>
</div>

    </div>
  `;

  document.body.appendChild(viewer);
document.body.style.overflow = 'hidden';

// ============================================
// ONBOARDING — aparece IMEDIATAMENTE
// ============================================

if (typeof window.mostrarOnboardingMinhasPublicacoesNex === 'function') {
  window.mostrarOnboardingMinhasPublicacoesNex();
}

  // ============================================
// FECHAR
// ============================================

const fechar = () => {
    viewer.remove();
    document.body.style.overflow = '';
  };

  // ============================================
  // RENDERIZAR
  // ============================================

  const renderizarViewer = () => {
  const pub = publicacoesViewerMyDropsNex[publicacaoViewerIndexMyDropsNex];
  if (!pub) {
    fechar();
    return;
  }

  // ⚠️ Sai do modo expandido ao trocar de publicação
  if (viewer.classList.contains('modo-expandido')) {
    viewer.classList.remove('modo-expandido');
    const btnExp = viewer.querySelector('#mydropsPubExpandir');
    if (btnExp) btnExp.textContent = '⤢';
  }

    const counter = viewer.querySelector('#mydropsPubCounter');
    const dataEl = viewer.querySelector('#mydropsPubData');
    const selosEl = viewer.querySelector('#mydropsPubSelos');
    const media = viewer.querySelector('#mydropsPubMedia');
    const viewsEl = viewer.querySelector('#mydropsPubViews');
    const heartEl = viewer.querySelector('#mydropsPubHeart');
    const brokenEl = viewer.querySelector('#mydropsPubBroken');
    const capsula = viewer.querySelector('#mydropsPubCapsula');
    const capsulaTexto = viewer.querySelector('#mydropsPubLegendaTexto');
    const btnVerMais = viewer.querySelector('#mydropsPubVerMais');
    const rodapeVazio = viewer.querySelector('#mydropsPubRodapeVazio');

    const dataHora = formatarDataHoraPublicacaoMyDropsNex(pub.criadoEm);

    // ============================================
    // CONTADOR
    // ============================================

    if (counter) {
      counter.textContent = `${publicacaoViewerIndexMyDropsNex + 1}/${publicacoesViewerMyDropsNex.length}`;
    }

    // ============================================
    // DATA
    // ============================================

    if (dataEl) {
      dataEl.textContent = `${dataHora.data} · ${dataHora.hora}`;
    }

    // ============================================
    // SELOS (1 linha só)
    // ============================================

    if (selosEl) {
      selosEl.innerHTML = '';

      if (pub.selos && typeof window.gerarHTMLSelos === 'function') {
        selosEl.innerHTML = window.gerarHTMLSelos(pub.selos);
      }
    }

    // ============================================
    // MÍDIA
    // ============================================

    if (media) {
      const url = String(pub.mediaUrl || '');
      const tipo = String(pub.midiaTipo || '').toLowerCase();
      const ehVideo = tipo === 'video' || /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

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

// ============================================
// FASE 2 — CÁPSULA DE AUTOR (drop compartilhado)
// ============================================

const capsulaAutor = viewer.querySelector('#mydropsPubCapsulaAutor');

if (capsulaAutor) {
  const temCompartilhamento = !!pub.compartilhado_de_id;

  if (!temCompartilhamento) {
    capsulaAutor.style.display = 'none';
  } else {
    capsulaAutor.style.display = 'inline-flex';

    const avatarEl = capsulaAutor.querySelector('.mydrops-pub-capsula-autor-avatar');
    const nomeEl = capsulaAutor.querySelector('.mydrops-pub-capsula-autor-nome');
    const userEl = capsulaAutor.querySelector('.mydrops-pub-capsula-autor-user');

    // Avatar
    if (avatarEl) {
      if (pub.compartilhado_de_avatar) {
        avatarEl.innerHTML = `<img src="${escapeHTML(pub.compartilhado_de_avatar)}" alt="">`;
      } else {
        avatarEl.textContent = (pub.compartilhado_de_nome || '?')
          .charAt(0)
          .toUpperCase();
      }
    }

    // Nome
    if (nomeEl) {
      nomeEl.textContent = pub.compartilhado_de_nome || '';
    }

    // @username
    if (userEl) {
      const userLimpo = String(pub.compartilhado_de_username || '')
        .replace(/^@/, '')
        .trim();
      userEl.textContent = userLimpo ? '@' + userLimpo : '';
    }
  }
}

// ============================================
// CÁPSULA DE LEGENDA
// ============================================
    
    const temLegenda =
      pub.legenda &&
      typeof pub.legenda === 'string' &&
      pub.legenda.trim().length > 0;

    if (capsula && capsulaTexto && btnVerMais && rodapeVazio) {
      if (temLegenda) {
        capsula.style.display = 'flex';
        rodapeVazio.style.display = 'none';

        capsulaTexto.textContent = pub.legenda.trim();
        capsulaTexto.classList.remove('expandido');

        btnVerMais.classList.remove('visivel');
        btnVerMais.dataset.expandido = 'false';
        btnVerMais.textContent = 'Ver mais';

        // Mostra "Ver mais" só se o texto passar de 4 linhas
        setTimeout(() => {
          if (capsulaTexto.scrollHeight > capsulaTexto.clientHeight + 2) {
            btnVerMais.classList.add('visivel');
          }
        }, 30);
      } else {
        capsula.style.display = 'none';
        rodapeVazio.style.display = 'block';
      }
    }

    // ============================================
    // STATS — LOCAL (rápido)
    // ============================================

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

    // ============================================
    // STATS — SUPABASE (assíncrono)
    // ============================================

    const publicacaoIdSupabase = pub.idSupabase || pub.id;

if (
  publicacaoIdSupabase &&
  typeof window.buscarReacoesSupabase === 'function'
) {
  window
    .buscarReacoesSupabase(publicacaoIdSupabase)
    .then((dados) => {
      if (!dados) return;

      if (heartEl) heartEl.textContent = String(dados.heart || 0);
      if (brokenEl) brokenEl.textContent = String(dados.broken || 0);
    })
    .catch((err) => console.warn('Erro ao buscar reações MyDrops:', err));
}

// ============================================
// FASE 3 — CONTADOR DE COMPARTILHAMENTOS 🔁
// ============================================

const shareBtn = viewer.querySelector('#mydropsPubShareBtn');
const shareEl = viewer.querySelector('#mydropsPubShare');

if (shareBtn && shareEl) {
  // Esconde por padrão
  shareBtn.style.display = 'none';

  if (
    publicacaoIdSupabase &&
    typeof window.contarCompartilhamentosSupabase === 'function'
  ) {
    window
      .contarCompartilhamentosSupabase(publicacaoIdSupabase)
      .then((total) => {
        const num = Number(total) || 0;

        if (num > 0) {
          shareEl.textContent = String(num);
          shareBtn.style.display = 'inline-flex';
        } else {
          shareBtn.style.display = 'none';
        }
      })
      .catch((err) =>
        console.warn('Erro ao contar compartilhamentos:', err)
      );
  }
}

    if (
      publicacaoIdSupabase &&
      typeof window.buscarVisualizacoesSupabase === 'function'
    ) {
      window
        .buscarVisualizacoesSupabase(publicacaoIdSupabase)
        .then((total) => {
          if (viewsEl) viewsEl.textContent = String(total || 0);
        })
        .catch((err) => console.warn('Erro ao buscar views MyDrops:', err));
    }

  };
    // ============================================
  // EVENTO — VOLTAR
  // ============================================

  const btnVoltar = viewer.querySelector('#mydropsPubVoltar');
  if (btnVoltar) btnVoltar.onclick = fechar;

  viewer.addEventListener('click', (e) => {
    if (e.target === viewer) fechar();
  });

// ============================================
// NAVEGAÇÃO — feita apenas por SWIPE
// (as setas horizontais foram removidas)
// ============================================

  // ============================================
  // BOTÃO "VER MAIS" (legenda)
  // ============================================

  const btnVerMaisEl = viewer.querySelector('#mydropsPubVerMais');
  const capsulaTextoEl = viewer.querySelector('#mydropsPubLegendaTexto');

  if (btnVerMaisEl && capsulaTextoEl) {
    btnVerMaisEl.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const expandido = btnVerMaisEl.dataset.expandido === 'true';

      if (expandido) {
        capsulaTextoEl.classList.remove('expandido');
        btnVerMaisEl.textContent = 'Ver mais';
        btnVerMaisEl.dataset.expandido = 'false';
      } else {
        capsulaTextoEl.classList.add('expandido');
        btnVerMaisEl.textContent = 'Ver menos';
        btnVerMaisEl.dataset.expandido = 'true';
      }
    };
  }

  // ============================================
// SWIPE — horizontal troca publicação
// ⚠️ Continua funcionando em modo expandido (igual Nearby)
// ============================================

let swipeStartX = 0;
  let swipeStartY = 0;
  let swipeStartTime = 0;
  let swipeAtivo = false;

  const LIMITE_SWIPE = 50;
  const TEMPO_MAX_SWIPE = 800;

  viewer.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;

    const alvo = e.target;
if (
  alvo.closest('.mydrops-pub-voltar') ||
  alvo.closest('.mydrops-pub-seta') ||
  alvo.closest('.mydrops-pub-capsula') ||
  alvo.closest('.mydrops-pub-stats-row') ||
  alvo.closest('.mydrops-pub-stat-btn') ||
  alvo.closest('.mydrops-pub-trash-btn') ||
  alvo.closest('.mydrops-pub-expandir') ||
  alvo.closest('video') ||
  alvo.closest('button')
) {
  swipeAtivo = false;
  return;
}

    swipeAtivo = true;
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
    swipeStartTime = Date.now();
  }, { passive: true });

  viewer.addEventListener('touchend', (e) => {
    if (!swipeAtivo) return;
    swipeAtivo = false;

    if (!e.changedTouches || e.changedTouches.length === 0) return;

    const dx = e.changedTouches[0].clientX - swipeStartX;
    const dy = e.changedTouches[0].clientY - swipeStartY;
    const dt = Date.now() - swipeStartTime;

    if (dt > TEMPO_MAX_SWIPE) return;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < LIMITE_SWIPE) return;
    if (absX < absY * 1.3) return;

    if (dx < 0) {
  if (
    publicacaoViewerIndexMyDropsNex <
    publicacoesViewerMyDropsNex.length - 1
  ) {
    publicacaoViewerIndexMyDropsNex += 1;

    // ⚠️ FEEDBACK: vibra + toca ao trocar publicação
    if (typeof window.feedbackNex?.navegouDrop === 'function') {
      window.feedbackNex.navegouDrop();
    }

    renderizarViewer();
  }
} else {
  if (publicacaoViewerIndexMyDropsNex > 0) {
    publicacaoViewerIndexMyDropsNex -= 1;

    // ⚠️ FEEDBACK: vibra + toca ao trocar publicação
    if (typeof window.feedbackNex?.navegouDrop === 'function') {
      window.feedbackNex.navegouDrop();
    }

    renderizarViewer();
  }
    }
  }, { passive: true });

  // ============================================
  // BOTÕES DE STATS (views / heart / broken)
  // ============================================

  viewer.querySelectorAll('.mydrops-pub-stat-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const pub = publicacoesViewerMyDropsNex[publicacaoViewerIndexMyDropsNex];
      if (!pub) return;

      const tipo = btn.getAttribute('data-list');

      if (tipo === 'views') {
        const pubIdParaViews = pub.idSupabase || pub.id;

        if (
          pubIdParaViews &&
          typeof window.buscarListaVisualizacoesSupabase === 'function'
        ) {
          const lista = await window.buscarListaVisualizacoesSupabase(pubIdParaViews);
          abrirModalListaPublicacaoMyDropsNex('Visualizações', lista || []);
          return;
        }

        abrirModalListaPublicacaoMyDropsNex('Visualizações', pub.visualizacoes || []);
        return;
      }

      const publicacaoIdSupabase = pub.idSupabase || pub.id;

      if (
        publicacaoIdSupabase &&
        typeof window.buscarListaReacoesSupabase === 'function'
      ) {
        const tipoSupabase = tipo === 'heart' ? 'heart' : 'broken';

        const lista = await window.buscarListaReacoesSupabase(
          publicacaoIdSupabase,
          tipoSupabase
        );

        const titulo = tipoSupabase === 'heart' ? 'Reações ❤️' : 'Reações 💔';
        abrirModalListaPublicacaoMyDropsNex(titulo, lista || []);
        return;
      }

      if (tipo === 'heart') {
        abrirModalListaPublicacaoMyDropsNex('Reações ❤️', pub.reacoes?.heart || []);
      }

      if (tipo === 'broken') {
        abrirModalListaPublicacaoMyDropsNex('Reações 💔', pub.reacoes?.broken || []);
      }
    });
  });

  // ============================================
  // BOTÃO EXCLUIR
  // ============================================

  const btnTrash = viewer.querySelector('.mydrops-pub-trash-btn');

  if (btnTrash) {
    btnTrash.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      abrirModalExcluirPublicacaoMyDropsNex(async () => {
        const pub = publicacoesViewerMyDropsNex[publicacaoViewerIndexMyDropsNex];
        if (!pub) return;

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

        publicacoesViewerMyDropsNex = obterPublicacoesOrdenadasMyDropsNex();

        if (!publicacoesViewerMyDropsNex.length) {
          const viewerAtual = document.querySelector('.mydrops-publication-viewer');
          if (viewerAtual) viewerAtual.remove();
          document.body.style.overflow = '';
          return;
        }

        if (publicacaoViewerIndexMyDropsNex >= publicacoesViewerMyDropsNex.length) {
          publicacaoViewerIndexMyDropsNex = publicacoesViewerMyDropsNex.length - 1;
        }

        renderizarViewer();
      });
    });
  }

// ============================================
// BOTÃO EXPANDIR — TELA CHEIA (FOCO TOTAL)
// ============================================

const btnExpandir = viewer.querySelector('#mydropsPubExpandir');

function entrarModoExpandidoNex() {
  if (!viewer) return;
  viewer.classList.add('modo-expandido');
  if (btnExpandir) btnExpandir.textContent = '⤡';
}

function sairModoExpandidoNex() {
  if (!viewer) return;
  viewer.classList.remove('modo-expandido');
  if (btnExpandir) btnExpandir.textContent = '⤢';
}

function toggleModoExpandidoNex() {
  if (!viewer) return;
  const estaExpandido = viewer.classList.contains('modo-expandido');
  if (estaExpandido) {
    sairModoExpandidoNex();
  } else {
    entrarModoExpandidoNex();
  }
}

if (btnExpandir) {
  btnExpandir.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleModoExpandidoNex();
  });
}

// ============================================
// RENDERIZA PRIMEIRA VEZ
// ============================================

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
  let concluindo = false;
  let ultimoDisparo = 0;

  const handlerConcluir = (e) => {
    // ⚠️ NÃO chamar preventDefault — WebKit usa isso pra cancelar o click
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }

    // ⚠️ Debounce: se qualquer um dos 3 eventos disparou nos últimos 400ms, ignora
    const agora = Date.now();
    if (agora - ultimoDisparo < 400) return;
    if (concluindo) return;

    ultimoDisparo = agora;
    concluindo = true;

    try {
      concluirPublicacaoComDuracaoMyDropsNex();
    } catch (err) {
      console.error('❌ Erro ao concluir publicação:', err);
      if (typeof window.mostrarToastNex === 'function') {
        window.mostrarToastNex(
          'Erro: ' + (err.message || 'desconhecido'),
          'erro',
          6000
        );
      }
    } finally {
      setTimeout(() => { concluindo = false; }, 600);
    }
  };

  // ⚠️ Registra os 3 eventos — o debounce garante que só 1 executa
  // touchend  → funciona quando iOS cancela o pointerup
  // pointerup → funciona no Android e navegadores modernos
  // click     → fallback universal do WebKit
  btnConcluirDuracao.addEventListener('touchend', handlerConcluir);
  btnConcluirDuracao.addEventListener('pointerup', handlerConcluir);
  btnConcluirDuracao.addEventListener('click', handlerConcluir);
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
