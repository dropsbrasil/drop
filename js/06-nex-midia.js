/* ============================================
   06-NEX-MIDIA.JS
   Mídia, áudio, PDF, localização, álbum, viewer, reações
============================================ */

(function () {
  'use strict';

  // ============================================
  // MONTAR HTML DE ANEXOS DA MENSAGEM
  // ============================================

  function montarAnexosHTMLNex(msg, dataExibida, horaExibida) {
    let html = '';

    if (!msg.anexo && (!msg.midias || !msg.midias.length) && !msg.audio) {
      return html;
    }

    if (msg.anexo) {
      // ----- DOCUMENTO PDF -----
      if (msg.anexo.documento && !msg.anexo.perfilId) {
        const pdfUrl = msg.anexo.documento.url;
        const pdfNome = msg.anexo.documento.name || 'Documento PDF';
        const pdfThumb = msg.anexo.documento.thumbnail || '';

        html += `
          <div class="msg-anexo msg-pdf-card">
            <div class="msg-pdf-cover">
              ${
                pdfThumb
                  ? `<img class="msg-pdf-thumb" src="${escapeHTML(pdfThumb)}" alt="Prévia do PDF">`
                  : `<div class="msg-pdf-icon">📄</div>`
              }
              <div class="msg-pdf-filename">
                ${escapeHTML(pdfNome)}
              </div>
              <div class="msg-pdf-subtitle">Arquivo PDF</div>
            </div>

            <button
              type="button"
              class="msg-open-anexo-btn msg-pdf-view-btn"
              onclick="window.open('${escapeHTML(pdfUrl)}','_blank')">
              Visualizar arquivo
            </button>
          </div>
        `;
      }

      // ----- LOCALIZAÇÃO -----
      if (msg.anexo.localizacao || msg.anexo.type === 'location') {
        const loc = msg.anexo.localizacao || msg.anexo;
        const lat = loc.lat;
        const lng = loc.lng;
        const endereco = loc.address || 'Localização';

        if (lat != null && lng != null) {
          html += `
            <div class="msg-location-card">
              <div class="msg-location-header">
                <div class="msg-location-icon">📍</div>

                <div class="msg-location-header-text">
                  <div class="msg-location-title">Me encontre aqui:</div>
                  <div class="msg-location-status">Localização pronta</div>
                </div>
              </div>

              <div class="msg-location-address">
                ${escapeHTML(endereco)}
              </div>

              <button
                type="button"
                class="msg-location-btn"
                onclick="abrirMapaLocalizacaoNex(${lat}, ${lng})">
                Ver rota
              </button>
            </div>
          `;
        } else {
          html += `
            <div class="msg-location-card">
              <div class="msg-location-header">
                <div class="msg-location-icon">📍</div>
                <div class="msg-location-header-text">
                  <div class="msg-location-title">Localização</div>
                  <div class="msg-location-status">Indisponível</div>
                </div>
              </div>
              <div class="msg-location-address">
                ${escapeHTML(endereco)}
              </div>
            </div>
          `;
        }
      }

      // ----- COMENTÁRIO DO NEARBY -----
      if (msg.anexo.type === 'nearby-comment') {
        const souEu = msg.side === 'right';
        const textoSelo = souEu
          ? 'Você comentou esse Drop'
          : 'Comentário sobre esse Drop';

        const perfilId = escapeHTML(msg.anexo.perfilId || '');
        const perfilNome = escapeHTML(msg.anexo.perfilNome || '');
        const dropIndex = Number(msg.anexo.dropIndex || 0);

        html += `
          <div class="msg-nearby-comment">
            <div class="msg-nearby-comment-head">
              <span class="msg-nearby-comment-icone">💬</span>
              <span class="msg-nearby-comment-texto">
                ${escapeHTML(textoSelo)}
              </span>
            </div>

            <div class="msg-anexo-card">
              <img
                class="msg-midia-thumb"
                src="${escapeHTML(msg.anexo.url)}"
                alt="Drop">
            </div>

            <button
              type="button"
              class="msg-nearby-comment-btn"
              data-perfil-id="${perfilId}"
              data-perfil-nome="${perfilNome}"
              data-drop-index="${dropIndex}">
              👁️ Ver Drop
            </button>
          </div>
        `;
      }

      // ----- IMAGEM -----
      if (msg.anexo.type === 'imagem' || msg.anexo.type === 'image') {
        const ehDropDePerfil = !!msg.anexo.perfilId;

        if (ehDropDePerfil) {
          html += `
            <div
              class="msg-drop-preview-open"
              data-perfil-id="${escapeHTML(msg.anexo.perfilId || '')}"
              data-perfil-nome="${escapeHTML(msg.anexo.perfilNome || '')}"
              data-drop-index="${Number(msg.anexo.dropIndex || 0)}">

              <div class="msg-drop-preview-head">
                <div class="msg-drop-preview-title">
                  Drop postado por ${escapeHTML(msg.anexo.perfilNome || 'Perfil')}
                </div>

                <div class="msg-drop-preview-date">
                  ${escapeHTML(dataExibida || '')} • ${escapeHTML(horaExibida || '')}
                </div>
              </div>

              <div class="msg-anexo-card">
                <img
                  class="msg-midia-thumb"
                  src="${escapeHTML(msg.anexo.url)}"
                  alt="Mídia">
              </div>

              <button
                type="button"
                class="msg-drop-profile-btn"
                data-perfil-id="${escapeHTML(msg.anexo.perfilId || '')}"
                data-perfil-nome="${escapeHTML(msg.anexo.perfilNome || '')}">
                👣 Visitar perfil
              </button>
            </div>
          `;
        } else {
          const msgIdSafe = escapeHTML(String(msg._supabaseId || msg.id || ''));
          const urlSafe = escapeHTML(msg.anexo.url);

          html += `
            <div class="msg-anexo-card" data-midia-msg-id="${msgIdSafe}" data-midia-index="0">
              <img
                class="msg-midia-thumb"
                src="${urlSafe}"
                alt="Mídia"
                onclick="window.abrirMidiaComContextoNex('${urlSafe}', 'imagem', '${msgIdSafe}', 0)">
              <div class="msg-midia-badge-slot" data-badge-msg-id="${msgIdSafe}" data-badge-midia-index="0"></div>
            </div>
          `;
        }
      }

      // ----- VÍDEO -----
      if (msg.anexo.type === 'video') {
        const ehDropDePerfil = !!msg.anexo.perfilId;

        if (ehDropDePerfil) {
          html += `
            <div
              class="msg-drop-preview-open"
              data-perfil-id="${escapeHTML(msg.anexo.perfilId || '')}"
              data-perfil-nome="${escapeHTML(msg.anexo.perfilNome || '')}"
              data-drop-index="${Number(msg.anexo.dropIndex || 0)}">

              <div class="msg-drop-preview-head">
                <div class="msg-drop-preview-title">
                  Drop postado por ${escapeHTML(msg.anexo.perfilNome || 'Perfil')}
                </div>

                <div class="msg-drop-preview-date">
                  ${escapeHTML(dataExibida || '')} • ${escapeHTML(horaExibida || '')}
                </div>
              </div>

              <div class="msg-anexo-card">
                <div class="msg-video-thumb">
                  <video
                    src="${escapeHTML(msg.anexo.url)}"
                    muted
                    playsinline>
                  </video>

                  <div class="play-overlay">▶</div>
                </div>
              </div>

              <button
                type="button"
                class="msg-drop-profile-btn"
                data-perfil-id="${escapeHTML(msg.anexo.perfilId || '')}"
                data-perfil-nome="${escapeHTML(msg.anexo.perfilNome || '')}">
                👣 Visitar perfil
              </button>
            </div>
          `;
        } else {
          const msgIdSafe = escapeHTML(String(msg._supabaseId || msg.id || ''));
          const urlSafe = escapeHTML(msg.anexo.url);

          html += `
            <div class="msg-anexo-card" data-midia-msg-id="${msgIdSafe}" data-midia-index="0">
              <div class="msg-video-thumb">
                <video
                  src="${urlSafe}"
                  controls
                  playsinline>
                </video>
              </div>
              <div class="msg-midia-badge-slot" data-badge-msg-id="${msgIdSafe}" data-badge-midia-index="0"></div>
            </div>
          `;
        }
      }
          // ----- ÁLBUM / MÚLTIPLAS IMAGENS -----
    if (
      msg.anexo.type === 'multi-imagem' ||
      msg.anexo.type === 'album'
    ) {
      const lista = msg.anexo.midias || msg.anexo.urls || [];
      const listaEncoded = encodeURIComponent(JSON.stringify(lista));

      if (lista.length) {
        const totalMidias = lista.length;
        const midiasPreview = lista.slice(0, 4);

        html += `
          <div class="msg-anexo-card msg-album-card">
            <div class="msg-album-cover">
              <div class="msg-album-blur-grid">
                ${midiasPreview
                  .map((midia) => {
                    const url =
                      typeof midia === 'string'
                        ? midia
                        : midia.url || midia.src || '';

                    const tipo =
                      typeof midia === 'object' && midia && midia.type
                        ? midia.type
                        : 'image';

                    return `
                      <div class="msg-album-blur-thumb">
                        ${
                          tipo === 'video'
                            ? `<video src="${escapeHTML(url)}" muted playsinline></video>`
                            : `<img src="${escapeHTML(url)}" alt="">`
                        }
                      </div>
                    `;
                  })
                  .join('')}

                <div class="msg-album-overlay">
                  <div class="msg-album-badge">🎴</div>
                  <div class="msg-album-title">Álbum</div>
                  <div class="msg-album-subtitle">${totalMidias} mídia(s)</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              class="msg-open-anexo-btn msg-album-view-btn btn-fotos-open"
              data-list="${listaEncoded}">
              Ver álbum
            </button>
          </div>
        `;
      }
    }

    // ----- PDF (formato antigo) -----
    if (
      msg.anexo.type === 'pdf' &&
      !msg.anexo.documento &&
      !msg.anexo.perfilId
    ) {
      html += `
        <div class="msg-anexo msg-pdf-card">
          <div class="msg-pdf-cover">
            <div class="msg-pdf-icon">📄</div>
            <div class="msg-pdf-filename">
              ${escapeHTML(msg.anexo.name || 'Documento PDF')}
            </div>
            <div class="msg-pdf-subtitle">Arquivo PDF</div>
          </div>

          <button
            type="button"
            class="msg-open-anexo-btn msg-pdf-view-btn"
            onclick="window.open('${escapeHTML(msg.anexo.url)}','_blank')">
            Visualizar arquivo
          </button>
        </div>
      `;
    }

    // ----- ÁUDIO (formato antigo) -----
    if (msg.anexo.type === 'audio') {
      html += `
        <div class="msg-anexo msg-audio-only">
          <audio controls src="${escapeHTML(msg.anexo.url)}"></audio>
        </div>
      `;
    }
  }

  // ============================================
  // MÚLTIPLAS MÍDIAS (msg.midias)
  // ============================================

  if (Array.isArray(msg.midias) && msg.midias.length) {
    const listaMidias = encodeURIComponent(JSON.stringify(msg.midias));

    const qtdMidias = msg.midias.length;
    const classeGrade =
      qtdMidias >= 4
        ? 'msg-midias-grid-4'
        : qtdMidias === 3
          ? 'msg-midias-grid-3'
          : qtdMidias === 2
            ? 'msg-midias-grid-2'
            : 'msg-midias-grid-1';

    html += `
      <div class="msg-midias-grid ${classeGrade}">
        ${msg.midias
          .slice(0, 4)
          .map((midia, index) => {
            const reacaoMidia = obterReacaoMidiaNex({
              url: midia.url,
              type: midia.type
            });

            return `
              <div
                class="msg-grid-item msg-grid-item-${index + 1}"
                ${qtdMidias === 1 ? `onclick="abrirMidiaChatNex('${midia.url}','${midia.type}')" ` : ''}>

                ${
                  midia.type === 'video'
                    ? `
                      <video
                        src="${midia.url}"
                        muted
                        playsinline>
                      </video>
                      <div class="play-overlay">▶</div>
                    `
                    : `<img src="${midia.url}">`
                }

                ${
                  reacaoMidia
                    ? `
                  <div class="msg-reaction-preview">
                    ${escapeHTML(reacaoMidia)}
                  </div>
                `
                    : ''
                }
              </div>
            `;
          })
          .join('')}
      </div>

      ${
        qtdMidias > 1
          ? `
        <button
          class="msg-open-anexo-btn btn-fotos-open"
          type="button"
          data-list="${listaMidias}">
          🖼️ Ver mídias
        </button>
      `
          : ''
      }
    `;
  }

  // ============================================
  // ÁUDIO (msg.audio)
  // ============================================

  if (msg.audio) {
    html += `
      <div class="audio-msg">
        <div class="audio-top">
          <div class="audio-bar">
            <div class="audio-progress"></div>
          </div>

          <span class="audio-time">00:00</span>
        </div>

        <button
          class="audio-open-btn"
          type="button"
          onclick="toggleAudioNex(this)">
          ▶ Ouvir áudio
        </button>

        <audio
          preload="metadata"
          src="${escapeHTML(msg.audio)}"
          hidden>
        </audio>
      </div>
    `;
  }

  return html;
}

// ============================================
// ESTADO DOS PREVIEWS
// ============================================

let previewMidiaNex = null;
let previewMidiasNex = [];
let modoExcluirMidiasNex = false;
let documentoPreviewNex = null;
let localizacaoPreviaNex = null;

// ============================================
// PREVIEW DE MÍDIA ÚNICA (câmera/galeria)
// ============================================

function mostrarPreviaMidiaNex(midia) {
  previewMidiaNex = midia;

  const inline = document.getElementById('previewMidiasNex');
  if (!inline) return;

  inline.innerHTML = `
    <div class="midia-preview-card">
      <div
        class="midia-preview-click"
        onclick="abrirPreviewMidiaNex()">

        ${
          midia.type === 'video'
            ? `
            <video src="${midia.url}" muted playsinline></video>
            <div class="midia-preview-play">▶</div>
          `
            : `<img src="${midia.url}">`
        }
      </div>

      <div class="midia-preview-actions">
        <button
          type="button"
          class="midia-remove-btn"
          onclick="limparPreviaMidiaNex()">
          ✕
        </button>
      </div>
    </div>
  `;

  inline.style.display = 'block';
  inline.classList.add('ativo');

  if (typeof window.atualizarPreviewStackNex === 'function') {
    window.atualizarPreviewStackNex();
  }

  const micBtn = document.getElementById('micBtn');
  if (micBtn) micBtn.style.display = 'none';
}

function limparPreviaMidiaNex() {
  previewMidiasNex = [];
  modoExcluirMidiasNex = false;
  previewMidiaNex = null;

  const inlineMidias = document.getElementById('previewMidiasNex');
  if (inlineMidias) {
    inlineMidias.innerHTML = '';
    inlineMidias.style.display = 'none';
    inlineMidias.classList.remove('ativo');
  }

  if (typeof window.atualizarPreviewStackNex === 'function') {
    window.atualizarPreviewStackNex();
  }

  const micBtn = document.getElementById('micBtn');
  if (micBtn) micBtn.style.display = 'flex';
}

function abrirPreviewMidiaNex() {
  if (!previewMidiaNex) return;

  const viewer = document.createElement('div');
  viewer.className = 'nex-midia-viewer';

  viewer.innerHTML = `
    <button class="viewer-close">✕</button>
    ${
      previewMidiaNex.type === 'video'
        ? `<video src="${previewMidiaNex.url}" controls autoplay playsinline></video>`
        : `<img src="${previewMidiaNex.url}">`
    }
  `;

  document.body.appendChild(viewer);

  viewer.querySelector('.viewer-close').onclick = () => {
    viewer.remove();
  };
}
  // ============================================
// PREVIEW DE MÚLTIPLAS MÍDIAS
// ============================================

function mostrarPreviewMidiasNex() {
  const inline = document.getElementById('previewMidiasNex');
  if (!inline) return;

  inline.innerHTML = `
    <div class="midias-preview-wrap">
      <div class="midias-preview-grid">
        ${previewMidiasNex
          .map(
            (midia, index) => `
          <div
            class="midia-item-preview"
            onclick="abrirMidiaPreviewNex(${index})">

            <div class="midia-click-preview">
              ${
                midia.type === 'video'
                  ? `
                  <video src="${midia.url}" muted playsinline></video>
                  <div class="play-overlay">▶</div>
                `
                  : `<img src="${midia.url}" alt="">`
              }
            </div>

            ${
              modoExcluirMidiasNex
                ? `
              <button
                class="midia-remove-x"
                onclick="event.stopPropagation(); removerMidiaPreviewNex(${index})">
                ✕
              </button>
            `
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>

      <button
        class="midias-delete-btn"
        onclick="toggleExcluirMidiasNex()">
        🗑️
      </button>
    </div>
  `;

  inline.style.display = 'block';
  inline.classList.add('ativo');

  if (typeof window.atualizarPreviewStackNex === 'function') {
    window.atualizarPreviewStackNex();
  }
}

function toggleExcluirMidiasNex() {
  modoExcluirMidiasNex = !modoExcluirMidiasNex;
  mostrarPreviewMidiasNex();
}

function removerMidiaPreviewNex(index) {
  previewMidiasNex.splice(index, 1);

  if (!previewMidiasNex.length) {
    const inline = document.getElementById('previewMidiasNex');

    if (inline) {
      inline.innerHTML = '';
      inline.style.display = 'none';
      inline.classList.remove('ativo');
    }

    modoExcluirMidiasNex = false;

    if (typeof window.atualizarPreviewStackNex === 'function') {
      window.atualizarPreviewStackNex();
    }

    return;
  }

  mostrarPreviewMidiasNex();
}

function abrirMidiaPreviewNex(index) {
  if (!Array.isArray(previewMidiasNex) || !previewMidiasNex.length) return;

  if (typeof window.abrirVisualizadorMidiasNex === 'function') {
    window.abrirVisualizadorMidiasNex(previewMidiasNex, index, false);
  }
}

// ============================================
// PREVIEW DE DOCUMENTO PDF
// ============================================

async function gerarMiniaturaPdfNex(file) {
  try {
    if (!window.pdfjsLib) return '';

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.2 });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: context,
      viewport
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.error('Erro ao gerar miniatura PDF:', err);
    return '';
  }
}

function mostrarPreviaDocumentoNex(doc) {
  const inline = document.getElementById('previewMidiasNex');
  if (!inline || !doc) return;

  inline.innerHTML = `
    <div class="doc-preview-card-nex">
      ${
        doc.thumbnail
          ? `<img class="doc-preview-thumb-nex" src="${doc.thumbnail}" alt="Prévia do PDF">`
          : `<div class="doc-preview-icon-nex">📄</div>`
      }

      <div class="doc-preview-info-nex">
        <div class="doc-preview-name-nex">
          ${String(doc.name || 'Documento PDF')}
        </div>

        <div class="doc-preview-meta-nex">
          ${formatarTamanhoArquivoNex(doc.size || 0)}
        </div>
      </div>

      <div class="doc-preview-actions-nex">
        <button
          type="button"
          class="doc-preview-cancel-nex"
          onclick="limparPreviaDocumentoNex()">
          ✕
        </button>
      </div>
    </div>
  `;

  inline.style.display = 'block';
  inline.classList.add('ativo');

  if (typeof window.atualizarPreviewStackNex === 'function') {
    window.atualizarPreviewStackNex();
  }

  const micBtn = document.getElementById('micBtn');
  if (micBtn) micBtn.style.display = 'flex';
}

function limparPreviaDocumentoNex() {
  documentoPreviewNex = null;

  const inline = document.getElementById('previewMidiasNex');
  if (inline) {
    inline.innerHTML = '';
    inline.style.display = 'none';
    inline.classList.remove('ativo');
  }

  if (typeof window.atualizarPreviewStackNex === 'function') {
    window.atualizarPreviewStackNex();
  }

  const micBtn = document.getElementById('micBtn');
  if (micBtn) micBtn.style.display = 'flex';
}

// ============================================
// PREVIEW DE LOCALIZAÇÃO
// ============================================

function mostrarPreviaLocalizacaoNex() {
  const inline = document.getElementById('previewLocalizacaoNex');
  if (!inline || !localizacaoPreviaNex) return;

  const statusTexto = localizacaoPreviaNex.carregando
    ? '⏳ Carregando endereço...'
    : '✅ Localização pronta';

  inline.innerHTML = `
    <div class="preview-localizacao-card">
      <button
        type="button"
        class="preview-localizacao-remove"
        onclick="limparPreviaLocalizacaoNex()">
        ✕
      </button>

      <div class="preview-localizacao-header">
        <div class="preview-localizacao-icon">📍</div>

        <div class="preview-localizacao-header-text">
          <div class="preview-localizacao-title">Localização</div>
          <div class="preview-localizacao-status">${statusTexto}</div>
        </div>
      </div>

      <div class="preview-localizacao-address">
        ${escapeHTML(localizacaoPreviaNex.address || 'Sem endereço')}
      </div>
    </div>
  `;

  inline.style.display = 'block';
  inline.classList.add('ativo');

  if (typeof window.atualizarPreviewStackNex === 'function') {
    window.atualizarPreviewStackNex();
  }
}

async function capturarLocalizacaoFixaNex() {
  const menu = document.getElementById('menuAnexoNex');
  if (menu) menu.style.display = 'none';

  if (!navigator.geolocation) {
    window.mostrarToastNex?.('Seu aparelho não suporta localização.', 'erro');
    return;
  }

  localizacaoPreviaNex = {
    lat: null,
    lng: null,
    address: 'Carregando endereço...',
    carregando: true
  };

  mostrarPreviaLocalizacaoNex();

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      localizacaoPreviaNex = {
        lat,
        lng,
        address: 'Carregando endereço...',
        carregando: true
      };

      mostrarPreviaLocalizacaoNex();

      let endereco = 'Localização indisponível';

      try {
        const url =
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=pt-BR`;

        const res = await fetch(url);
        const data = await res.json();

        if (data?.display_name) {
          endereco = data.display_name;
        } else {
          endereco = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
      } catch (e) {
        endereco = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }

      localizacaoPreviaNex = {
        lat,
        lng,
        address: endereco,
        carregando: false
      };

      mostrarPreviaLocalizacaoNex();
    },
    () => {
      window.mostrarToastNex?.(
        'Não foi possível obter sua localização.',
        'erro'
      );

      limparPreviaLocalizacaoNex();
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

function limparPreviaLocalizacaoNex() {
  localizacaoPreviaNex = null;

  const inline = document.getElementById('previewLocalizacaoNex');
  if (inline) {
    inline.innerHTML = '';
    inline.style.display = 'none';
    inline.classList.remove('ativo');
  }

  if (typeof window.atualizarPreviewStackNex === 'function') {
    window.atualizarPreviewStackNex();
  }
}

function abrirMapaLocalizacaoNex(lat, lng) {
  if (lat == null || lng == null) return;

  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`;
  window.open(url, '_blank');
}

// ============================================
// ÁUDIO — ESTADO
// ============================================

let gravandoAudioNex = false;
let mediaRecorderNex = null;
let audioChunksNex = [];
let audioBlobNex = null;
let audioUrlNex = '';
let audioStreamNex = null;
let tempoGravacaoNex = 0;
let timerGravacaoNex = null;

// ============================================
// UI DE GRAVAÇÃO DE ÁUDIO
// ============================================

function atualizarUIGravacaoNex() {
  const micBtn = document.getElementById('micBtn');
  const recorder = document.getElementById('audioRecorderNex');
  const tempoEl = document.getElementById('audioTempoNex');
  const progressEl = document.getElementById('audioProgressNex');

  if (recorder) {
    recorder.style.display = gravandoAudioNex ? 'flex' : 'none';
  }

  if (micBtn) {
    micBtn.style.background = gravandoAudioNex ? '#ef4444' : '#2563eb';
    micBtn.style.color = '#fff';
  }

  if (tempoEl) {
    tempoEl.innerText = `${formatarTempoAudioNex(tempoGravacaoNex)} / ${formatarTempoAudioNex(Drops.LIMITES.AUDIO)}`;
  }

  if (progressEl) {
    const pct = Math.min(
      100,
      (tempoGravacaoNex / Drops.LIMITES.AUDIO) * 100
    );
    progressEl.style.width = `${pct}%`;
  }
}

function limparPreviaAudioNex() {
  const inline = document.getElementById('audioInlineNex');
  if (inline) {
    inline.innerHTML = '';
    inline.style.display = 'none';
    inline.classList.remove('ativo');
  }

  if (typeof window.atualizarPreviewStackNex === 'function') {
    window.atualizarPreviewStackNex();
  }

  const micBtn = document.getElementById('micBtn');
  if (micBtn) {
    micBtn.style.display = 'flex';
    micBtn.classList.remove('mic-recording');
    micBtn.innerText = '🎙️';
  }

  audioChunksNex = [];
  audioBlobNex = null;
  audioUrlNex = '';
  window.previewAudioAtivoNex = null;

  tempoGravacaoNex = 0;
  atualizarUIGravacaoNex();
}

function mostrarPreviaAudioNex(url) {
  const inline = document.getElementById('audioInlineNex');
  if (!inline) return;

  inline.innerHTML = `
    <div class="audio-preview-card">
      <button type="button" class="audio-preview-play" id="audioPreviewPlayNex">▶</button>

      <div class="audio-preview-main">
        <div class="audio-preview-bar">
          <div class="audio-preview-fill" id="audioPreviewProgressNex"></div>
        </div>

        <div class="audio-preview-time" id="audioPreviewTimeNex">00:00 / 00:00</div>
      </div>

      <button type="button" class="audio-preview-cancel" id="audioDiscardNex">✕</button>

      <audio id="audioPreviewPlayerNex" preload="metadata" src="${url}" hidden></audio>
    </div>
  `;

  inline.style.display = 'block';
  inline.classList.add('ativo');

  if (typeof window.atualizarPreviewStackNex === 'function') {
    window.atualizarPreviewStackNex();
  }

  const micBtn = document.getElementById('micBtn');
  if (micBtn) micBtn.style.display = 'none';

  const player = document.getElementById('audioPreviewPlayerNex');
  const playBtn = document.getElementById('audioPreviewPlayNex');
  const progress = document.getElementById('audioPreviewProgressNex');
  const tempo = document.getElementById('audioPreviewTimeNex');
  const discardBtn = document.getElementById('audioDiscardNex');

  if (!player || !playBtn || !progress || !tempo || !discardBtn) return;

  const atualizarTempo = () => {
    const atual = formatarTempoAudioNex(Math.floor(player.currentTime || 0));
    const total = formatarTempoAudioNex(Math.floor(player.duration || 0));
    tempo.innerText = `${atual} / ${total}`;
  };

  player.onloadedmetadata = atualizarTempo;

  player.ontimeupdate = () => {
    if (player.duration) {
      const pct = (player.currentTime / player.duration) * 100;
      progress.style.width = `${pct}%`;
      atualizarTempo();
    }
  };

  player.onended = () => {
    progress.style.width = '0%';
    playBtn.innerText = '▶';
    atualizarTempo();
  };

  playBtn.onclick = () => {
    if (player.paused) {
      player.play();
      playBtn.innerText = '⏸';
    } else {
      player.pause();
      playBtn.innerText = '▶';
    }
  };

  discardBtn.onclick = limparPreviaAudioNex;

  window.previewAudioAtivoNex = url;
}
    // ============================================
  // GRAVAR ÁUDIO
  // ============================================

  async function iniciarGravacaoAudioNex() {
    if (gravandoAudioNex) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Seu aparelho não suporta gravação de áudio.');
      return;
    }

    limparPreviaAudioNex();

    const micBtn = document.getElementById('micBtn');
    if (micBtn) {
      micBtn.style.display = 'flex';
      micBtn.classList.add('mic-recording');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamNex = stream;

      const tipos = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ];

      const mimeType = tipos.find(
        (tipo) =>
          typeof MediaRecorder !== 'undefined' &&
          MediaRecorder.isTypeSupported &&
          MediaRecorder.isTypeSupported(tipo)
      );

      mediaRecorderNex = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksNex = [];
      tempoGravacaoNex = 0;
      gravandoAudioNex = true;
      atualizarUIGravacaoNex();

      mediaRecorderNex.ondataavailable = (evento) => {
        if (evento.data && evento.data.size > 0) {
          audioChunksNex.push(evento.data);
        }
      };

      mediaRecorderNex.onstop = () => {
        clearInterval(timerGravacaoNex);
        timerGravacaoNex = null;

        if (audioStreamNex) {
          audioStreamNex.getTracks().forEach((track) => track.stop());
          audioStreamNex = null;
        }

        gravandoAudioNex = false;
        atualizarUIGravacaoNex();

        const blob = new Blob(audioChunksNex, {
          type: mediaRecorderNex?.mimeType || 'audio/webm'
        });

        audioBlobNex = blob;
        audioUrlNex = URL.createObjectURL(blob);

        mostrarPreviaAudioNex(audioUrlNex);

        const micBtn = document.getElementById('micBtn');
        if (micBtn) micBtn.style.display = 'none';
      };

      mediaRecorderNex.start();

      timerGravacaoNex = setInterval(() => {
        tempoGravacaoNex += 1;
        atualizarUIGravacaoNex();

        if (tempoGravacaoNex >= Drops.LIMITES.AUDIO) {
          pararGravacaoAudioNex();
        }
      }, 1000);
    } catch (erro) {
      gravandoAudioNex = false;
      atualizarUIGravacaoNex();
      alert('Não foi possível acessar o microfone.');
    }
  }

  function pararGravacaoAudioNex() {
    if (!gravandoAudioNex || !mediaRecorderNex) return;

    gravandoAudioNex = false;
    atualizarUIGravacaoNex();

    if (timerGravacaoNex) {
      clearInterval(timerGravacaoNex);
      timerGravacaoNex = null;
    }

    if (mediaRecorderNex.state !== 'inactive') {
      mediaRecorderNex.stop();
    }
  }

  function toggleGravacaoAudioNex() {
    if (gravandoAudioNex) {
      pararGravacaoAudioNex();
    } else {
      iniciarGravacaoAudioNex();
    }
  }

  function enviarAudioNex() {
    if (!audioUrlNex || !Drops.estado.conversaAtual) return;

    const conversaAtual = Drops.estado.conversaAtual;

    if (!conversas[conversaAtual]) {
      conversas[conversaAtual] = [];
    }

    conversas[conversaAtual].push({
      id: gerarIdMensagemNex(),
      timestamp: Date.now(),
      side: 'right',
      nome: 'Eu',
      avatar: 'EU',
      audio: audioUrlNex,
      data: new Date().toLocaleDateString('pt-BR'),
      hora: 'agora',
      status: 'enviado'
    });

    limparPreviaAudioNex();
    renderChat(conversaAtual);
  }

  // ============================================
  // PLAYER DE ÁUDIO NA MENSAGEM
  // ============================================

  function toggleAudioNex(btn) {
    const box = btn.closest('.audio-msg');
    if (!box) return;

    const player = box.querySelector('audio');
    const progress = box.querySelector('.audio-progress');
    const time = box.querySelector('.audio-time');

    if (!player || !progress || !time) return;

    document.querySelectorAll('.audio-msg audio').forEach((audioEl) => {
      if (audioEl !== player) {
        audioEl.pause();
        const otherBtn = audioEl
          .closest('.audio-msg')
          ?.querySelector('.audio-open-btn');
        if (otherBtn) otherBtn.innerHTML = '▶ Ouvir áudio';
      }
    });

    player.onloadedmetadata = () => {
      time.innerText = formatarTempoAudioNex(
        Math.floor(player.duration || 0)
      );
    };

    player.ontimeupdate = () => {
      if (!player.duration) return;
      const pct = (player.currentTime / player.duration) * 100;
      progress.style.width = `${pct}%`;
      time.innerText = formatarTempoAudioNex(Math.floor(player.currentTime));
    };

    player.onended = () => {
      progress.style.width = '0%';
      btn.innerHTML = '▶ Ouvir áudio';
      time.innerText = formatarTempoAudioNex(
        Math.floor(player.duration || 0)
      );
    };

    if (player.paused) {
      player.play();
      btn.innerHTML = '⏸ Pausar áudio';
    } else {
      player.pause();
      btn.innerHTML = '▶ Ouvir áudio';
    }
  }

  // ============================================
  // HELPERS — ESTADO DOS PREVIEWS
  // ============================================

  function temAudioNex() {
    return !!audioUrlNex;
  }

  function temMidiasNex() {
    return Array.isArray(previewMidiasNex) && previewMidiasNex.length > 0;
  }

  function temDocumentoNex() {
    return !!documentoPreviewNex;
  }

  function temLocalizacaoNex() {
    return !!localizacaoPreviaNex;
  }

  function limparTodosPreviewsNex() {
    limparPreviaAudioNex();

    if (typeof window.limparPreviaMidiaNex === 'function') {
      window.limparPreviaMidiaNex();
    }

    limparPreviaDocumentoNex();
    limparPreviaLocalizacaoNex();
  }

  // Getters para o estado interno
  window.getPreviewMidiasNex = () => previewMidiasNex;
  window.setPreviewMidiasNex = (v) => { previewMidiasNex = v; };

  window.getPreviewMidiaNex = () => previewMidiaNex;
  window.setPreviewMidiaNex = (v) => { previewMidiaNex = v; };

  window.getDocumentoPreviewNex = () => documentoPreviewNex;
  window.setDocumentoPreviewNex = (v) => { documentoPreviewNex = v; };

  window.getLocalizacaoPreviaNex = () => localizacaoPreviaNex;
  window.setLocalizacaoPreviaNex = (v) => { localizacaoPreviaNex = v; };

  window.getAudioUrlNex = () => audioUrlNex;

  // ============================================
  // ÁLBUM (SELEÇÃO MÚLTIPLA)
  // ============================================

  let albumSlotsNex = Array(12).fill(null);
  let albumDeleteModeNex = false;

  function atualizarAlbumModalNex() {
    const modal = document.getElementById('albumModalNex');
    const grid = document.getElementById('albumGridNex');
    const addBtn = document.getElementById('albumAddBtnNex');

    if (!modal || !grid || !addBtn) return;

    const preenchidos = albumSlotsNex.filter(Boolean).length;
    addBtn.classList.toggle('hidden', preenchidos >= 12);

    grid.innerHTML = albumSlotsNex
      .map((midia, index) => {
        if (!midia) {
          return `
            <div class="album-slot">
              <div class="album-slot-empty">+</div>
            </div>
          `;
        }

        return `
          <div class="album-slot ${albumDeleteModeNex ? 'selected-delete' : ''}">
            ${
              midia.type === 'video'
                ? `<video src="${midia.url}" muted playsinline></video>`
                : `<img src="${midia.url}" alt="">`
            }

            ${
              albumDeleteModeNex
                ? `<button type="button" class="album-slot-x" data-album-remove="${index}">✕</button>`
                : ''
            }
          </div>
        `;
      })
      .join('');
  }

  function fecharAlbumNex() {
    const modal = document.getElementById('albumModalNex');
    if (!modal) return;

    modal.hidden = true;
    modal.style.setProperty('display', 'none', 'important');
    modal.style.visibility = 'hidden';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';

    albumDeleteModeNex = false;
  }

  function toggleExcluirAlbumNex() {
    albumDeleteModeNex = !albumDeleteModeNex;
    atualizarAlbumModalNex();
  }

  function removerSlotAlbumNex(index) {
    if (index < 0 || index >= albumSlotsNex.length) return;

    albumSlotsNex[index] = null;
    albumDeleteModeNex = false;
    atualizarAlbumModalNex();
  }

  function abrirAlbumNex() {
    const menu = document.getElementById('menuAnexoNex');
    if (menu) menu.style.display = 'none';

    const modal = document.getElementById('albumModalNex');
    if (!modal) return;

    modal.hidden = false;
    modal.style.setProperty('display', 'block', 'important');
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';

    albumDeleteModeNex = false;
    atualizarAlbumModalNex();
  }

  function enviarAlbumNex() {
    const midias = albumSlotsNex
      .filter(Boolean)
      .map((item) => ({
        url: item.url,
        type: item.type === 'video' ? 'video' : 'imagem'
      }));

    const conversaAtual = Drops.estado.conversaAtual;
    if (!midias.length || !conversaAtual) return;

    if (!conversas[conversaAtual]) {
      conversas[conversaAtual] = [];
    }

    conversas[conversaAtual].push({
      id: gerarIdMensagemNex(),
      timestamp: Date.now(),
      side: 'right',
      nome: 'Eu',
      avatar: 'EU',
      data: new Date().toLocaleDateString('pt-BR'),
      hora: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: 'enviado',
      anexo: {
        type: 'album',
        midias: [...midias],
        urls: midias.map((item) => item.url)
      }
    });

    fecharAlbumNex();
    renderChat(conversaAtual);
  }

  // Listener global para remover slot do álbum
  if (!window.__albumRemoveListenerNex) {
    window.__albumRemoveListenerNex = true;

    const removerAlbumHandlerNex = (e) => {
      const btn = e.target.closest('[data-album-remove]');
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      const index = Number(btn.dataset.albumRemove);
      if (Number.isNaN(index)) return;

      removerSlotAlbumNex(index);
    };

    document.addEventListener('click', removerAlbumHandlerNex, true);
    document.addEventListener('pointerup', removerAlbumHandlerNex, true);
    document.addEventListener('touchend', removerAlbumHandlerNex, true);
  }

  // ============================================
  // MENU DE ANEXO / CÂMERA LATERAL
  // ============================================

  function abrirCameraMenuNex() {
    const menuAnexo = document.getElementById('menuAnexoNex');
    const menuCamera = document.getElementById('menuCameraLateralNex');

    if (menuAnexo) menuAnexo.style.display = 'none';
    if (menuCamera) menuCamera.classList.add('aberto');
  }

  function fecharCameraMenuNex() {
    const menuCamera = document.getElementById('menuCameraLateralNex');
    if (menuCamera) menuCamera.classList.remove('aberto');
  }

  function abrirCameraFotoNex() {
    fecharCameraMenuNex();
    document.getElementById('inputCameraFotoNex')?.click();
  }

  function abrirCameraVideoNex() {
    fecharCameraMenuNex();
    document.getElementById('inputCameraVideoNex')?.click();
  }

  // ⚠️ Mantém o showPicker() original (funcionava no seu iPhone)
  function abrirSeletorArquivoNex(id) {
    const input = document.getElementById(id);
    if (!input) return;

    input.value = '';

    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
        return;
      } catch (e) {}
    }

    input.click();
  }

  function abrirMidiasNex() {
    const menu = document.getElementById('menuAnexoNex');
    if (menu) menu.style.display = 'none';

    abrirSeletorArquivoNex('inputMidiasNex');
  }

  function abrirAnexoNex(tipo) {
    const menu = document.getElementById('menuAnexoNex');
    if (menu) menu.style.display = 'none';

    if (tipo === 'docs') {
      abrirSeletorArquivoNex('inputDocsNex');
      return;
    }

    if (tipo === 'localizacao') {
      capturarLocalizacaoFixaNex();
      return;
    }
  }

  function toggleMenuAnexoNex() {
    const menu = document.getElementById('menuAnexoNex');
    if (!menu) return;

    if (menu.style.display === 'flex') {
      menu.style.display = 'none';
    } else {
      menu.style.display = 'flex';
    }
  }

  // Fecha menu anexo ao clicar fora
  document.addEventListener('click', (e) => {
    const menu = document.getElementById('menuAnexoNex');
    const btn = document.getElementById('btnAnexoNex');

    if (!menu || !btn) return;

    const clicouNoMenu = menu.contains(e.target);
    const clicouNoBotao = btn.contains(e.target);

    if (!clicouNoMenu && !clicouNoBotao) {
      menu.style.display = 'none';
    }
  });

  // ============================================
  // INPUTS (câmera, docs, álbum, mídias)
  // ============================================

  function initInputsNex() {
    // Câmera foto
    const inputCameraFotoNex = document.getElementById('inputCameraFotoNex');
    if (inputCameraFotoNex) {
      inputCameraFotoNex.addEventListener('change', () => {
        const file = inputCameraFotoNex.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          previewMidiaNex = { type: 'imagem', url: e.target.result };
          mostrarPreviaMidiaNex(previewMidiaNex);
        };
        reader.readAsDataURL(file);

        inputCameraFotoNex.value = '';
      });
    }

    // Câmera vídeo
    const inputCameraVideoNex = document.getElementById('inputCameraVideoNex');
    if (inputCameraVideoNex) {
      inputCameraVideoNex.addEventListener('change', () => {
        const file = inputCameraVideoNex.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        previewMidiaNex = { type: 'video', url, _file: file };
        mostrarPreviaMidiaNex(previewMidiaNex);

        // ⚠️ NÃO zera o value (senão o blob morre no iOS)
      });
    }

    // Docs (PDF)
    const inputDocsNex = document.getElementById('inputDocsNex');
    if (inputDocsNex) {
      inputDocsNex.addEventListener('change', async () => {
        const file = inputDocsNex.files?.[0];
        if (!file) return;

        if (
          file.type !== 'application/pdf' &&
          !file.name.toLowerCase().endsWith('.pdf')
        ) {
          window.mostrarToastNex?.('Por enquanto esse botão aceita PDF.', 'info');
          inputDocsNex.value = '';
          return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
          const url = e.target.result;

          documentoPreviewNex = {
            type: 'pdf',
            url,
            name: file.name,
            size: file.size,
            thumbnail: '',
            loadingThumbnail: true
          };

          mostrarPreviaDocumentoNex(documentoPreviewNex);

          const thumb = await gerarMiniaturaPdfNex(file);

          if (!documentoPreviewNex || documentoPreviewNex.url !== url) return;

          documentoPreviewNex = {
            ...documentoPreviewNex,
            loadingThumbnail: false,
            thumbnail: thumb || ''
          };

          mostrarPreviaDocumentoNex(documentoPreviewNex);
        };
        reader.readAsDataURL(file);

        inputDocsNex.value = '';
      });
    }

    // Álbum
    const inputAlbumNex = document.getElementById('inputAlbumNex');
    if (inputAlbumNex) {
      inputAlbumNex.addEventListener('change', () => {
        const files = Array.from(inputAlbumNex.files || []).filter(
          (file) =>
            file.type.startsWith('image/') ||
            file.type.startsWith('video/')
        );

        if (!files.length) return;

        files.forEach((file) => {
          const slotLivre = albumSlotsNex.findIndex((item) => item === null);
          if (slotLivre === -1) return;

          albumSlotsNex[slotLivre] = {
            type: file.type.startsWith('video/') ? 'video' : 'imagem',
            url: URL.createObjectURL(file)
          };
        });

        albumDeleteModeNex = false;
        atualizarAlbumModalNex();
        inputAlbumNex.value = '';
      });
    }

    // Múltiplas mídias (envio direto)
    const inputMidiasNex = document.getElementById('inputMidiasNex');
    if (inputMidiasNex) {
      inputMidiasNex.addEventListener('change', async () => {
        const files = Array.from(inputMidiasNex.files || []);
        if (!files.length) return;

        const previewMidias = [];

        for (const file of files) {
          const url = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          });

          if (url) {
            previewMidias.push({
              type: file.type.startsWith('video/') ? 'video' : 'imagem',
              url
            });
          }
        }

        if (!previewMidias.length) return;

        previewMidiasNex = previewMidias;
        mostrarPreviewMidiasNex();
        inputMidiasNex.value = '';
      });
    }
  }

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.montarAnexosHTMLNex = montarAnexosHTMLNex;

  window.abrirMidiaComContextoNex = function (url, tipo, msgId, midiaIndex) {
    if (typeof window.abrirMidiaChatNex === 'function') {
      window.abrirMidiaChatNex(url, tipo, {
        mensagemId: String(msgId || ''),
        midiaIndex: Number(midiaIndex || 0)
      });
    }
  };

  window.mostrarPreviaMidiaNex = mostrarPreviaMidiaNex;
  window.limparPreviaMidiaNex = limparPreviaMidiaNex;
  window.abrirPreviewMidiaNex = abrirPreviewMidiaNex;
  window.mostrarPreviewMidiasNex = mostrarPreviewMidiasNex;
  window.toggleExcluirMidiasNex = toggleExcluirMidiasNex;
  window.removerMidiaPreviewNex = removerMidiaPreviewNex;
  window.abrirMidiaPreviewNex = abrirMidiaPreviewNex;

  window.mostrarPreviaDocumentoNex = mostrarPreviaDocumentoNex;
  window.limparPreviaDocumentoNex = limparPreviaDocumentoNex;

  window.mostrarPreviaLocalizacaoNex = mostrarPreviaLocalizacaoNex;
  window.capturarLocalizacaoFixaNex = capturarLocalizacaoFixaNex;
  window.limparPreviaLocalizacaoNex = limparPreviaLocalizacaoNex;
  window.abrirMapaLocalizacaoNex = abrirMapaLocalizacaoNex;

  window.toggleGravacaoAudioNex = toggleGravacaoAudioNex;
  window.pararGravacaoAudioNex = pararGravacaoAudioNex;
  window.enviarAudioNex = enviarAudioNex;
  window.toggleAudioNex = toggleAudioNex;

  window.abrirAlbumNex = abrirAlbumNex;
  window.fecharAlbumNex = fecharAlbumNex;
  window.toggleExcluirAlbumNex = toggleExcluirAlbumNex;
  window.removerSlotAlbumNex = removerSlotAlbumNex;
  window.enviarAlbumNex = enviarAlbumNex;
  window.atualizarAlbumModalNex = atualizarAlbumModalNex;

  window.abrirCameraMenuNex = abrirCameraMenuNex;
  window.fecharCameraMenuNex = fecharCameraMenuNex;
  window.abrirCameraFotoNex = abrirCameraFotoNex;
  window.abrirCameraVideoNex = abrirCameraVideoNex;
  window.abrirMidiasNex = abrirMidiasNex;
  window.abrirAnexoNex = abrirAnexoNex;
  window.toggleMenuAnexoNex = toggleMenuAnexoNex;

  window.temAudioNex = temAudioNex;
  window.temMidiasNex = temMidiasNex;
  window.temDocumentoNex = temDocumentoNex;
  window.temLocalizacaoNex = temLocalizacaoNex;
  window.limparTodosPreviewsNex = limparTodosPreviewsNex;

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    initInputsNex();
  });

  console.log('📎 06-nex-midia.js completo');

})();
