/* ============================================
   14-INIT.JS
   Inicialização geral do app
   
   Este é o ÚLTIMO módulo a carregar.
   Depende de TODOS os outros módulos.
============================================ */

(function () {
  'use strict';

  // ============================================
  // INICIALIZAÇÃO PRINCIPAL
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando Drops...');

    // ============================================
    // 1. INICIALIZA SISTEMA DE ADEPTOS
    // ============================================

    if (typeof limparInteracoesAntigasNex === 'function') {
      limparInteracoesAntigasNex();
    }

    if (typeof calcularAdeptosNex === 'function') {
      calcularAdeptosNex();
    }

    if (typeof calcularAdeptosEnviadosNex === 'function') {
      calcularAdeptosEnviadosNex();
    }

    console.log('👑 Sistema de adeptos inicializado');

    // ============================================
// 1.5. RENDERIZA OS CARDS INICIAIS DAS CONVERSAS
// ============================================

if (typeof criarCardConversaNex === 'function') {
  Object.keys(conversas).forEach((nome) => {
    // Só cria se ainda não existir
    if (!obterCardConversaNex(nome)) {
      const conectado = estaConectadoNoMyDropsNex(nome);

      criarCardConversaNex(
        nome,
        conectado,
        { text: '' },
        'recebida'
      );
    }
  });

  console.log('💬 Cards iniciais criados');
}

    // ============================================
    // 2. MOSTRA A TELA INICIAL
    // ============================================

    if (typeof mostrarTela === 'function') {
      mostrarTela('mydrops', 0);
    }

    if (typeof mostrarNexTab === 'function') {
      mostrarNexTab('naolidas');
    }

    // ============================================
    // 3. RENDERIZA LISTAS E CONTEÚDO
    // ============================================

    if (typeof renderizarConectadosMyDropsNex === 'function') {
      renderizarConectadosMyDropsNex();
    }

    if (typeof renderizarPublicacoesNearbyNex === 'function') {
      renderizarPublicacoesNearbyNex();
    }

    if (typeof renderizarDesconectadosMyDropsNex === 'function') {
      renderizarDesconectadosMyDropsNex();
    }

    if (typeof renderizarPublicacoesMyDropsNex === 'function') {
      renderizarPublicacoesMyDropsNex();
    }

// ============================================
// 4. AUTO-LIMPEZA DE CONVERSAS (a cada 10 min)
// ============================================

if (typeof executarAutoLimpezaNex === 'function') {
  executarAutoLimpezaNex();
  setInterval(executarAutoLimpezaNex, 10 * 60 * 1000);
}

// ============================================
// 4.5. AUTO-LIMPEZA DE REAÇÕES EXPIRADAS
// ============================================

if (typeof limparReacoesExpiradasNex === 'function') {
  limparReacoesExpiradasNex();
  // Roda a cada 6 horas (reações com 30 dias de validade
  // não precisam ser limpas com frequência)
  setInterval(limparReacoesExpiradasNex, 6 * 60 * 60 * 1000);
}

// ============================================
// 4.6. ATUALIZA MÉTRICA DE INTERAÇÕES
// ============================================

if (typeof window.atualizarMetricaInteracoesMyDropsNex === 'function') {
  window.atualizarMetricaInteracoesMyDropsNex();
}

// ============================================
// MÉTRICA DE VISITAS (stub — backend futuro)
// ============================================

if (typeof window.obterVisitasPerfil === 'function') {
  const totalVisitas = window.obterVisitasPerfil(Drops.usernameAtual);
  const elVisitas = document.getElementById('mydropsVisitasContador');
  if (elVisitas) elVisitas.textContent = String(totalVisitas);
}
    
    

    // ============================================
    // 5. LOCALIZAÇÃO (weatherLocation)
    // ============================================

    const weatherLocationEl = document.getElementById('weatherLocation');

    async function reverseGeocodeExact(lat, lon) {
      const url =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`;

      const res = await fetch(url, {
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) throw new Error('Falha ao buscar endereço');

      const data = await res.json();
      const a = data.address || {};

      const rua = a.road || a.pedestrian || a.footway || '';
      const numero = a.house_number || '';
      const bairro = a.suburb || a.neighbourhood || a.quarter || '';
      const cidade = a.city || a.town || a.village || a.municipality || '';
      const estado = a.state || '';
      const pais = a.country || '';

      const linha1 = [rua, numero].filter(Boolean).join(', ');
      const linha2 = [bairro, cidade, estado].filter(Boolean).join(' • ');

      return (
        [linha1, linha2, pais].filter(Boolean).join(' • ') ||
        'Localização indisponível'
      );
    }

    if (weatherLocationEl) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            weatherLocationEl.textContent = 'Buscando localização...';

            const address = await reverseGeocodeExact(
              pos.coords.latitude,
              pos.coords.longitude
            );

            weatherLocationEl.textContent = address;
          } catch (err) {
            console.error('Erro localização:', err);
            weatherLocationEl.textContent = 'Localização indisponível';
          }
        },
        (err) => {
          console.error('Erro geolocalização:', err);
          weatherLocationEl.textContent = 'Localização negada';
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    }

    // ============================================
    // 6. DESSELEÇÃO AUTOMÁTICA (editor)
    // ============================================

    document.addEventListener(
      'pointerdown',
      (e) => {
        const dentroDoTexto = e.target.closest('.video-editor-text-mydrops-nex');
        const dentroDaFoto = e.target.closest('.video-editor-photo-mydrops-nex');
        const dentroDoVideo = e.target.closest('.video-editor-video-mydrops-nex');
        const dentroDosControles = e.target.closest(
          '.video-editor-controls-mydrops-nex'
        );

        const dentroDaBarraDoEditor = e.target.closest(
          '#videoEditorThemeMyDropsNex, ' +
            '#videoEditorLoopMyDropsNex, ' +
            '#videoEditorAddTextMyDropsNex, ' +
            '#videoEditorDeleteMyDropsNex, ' +
            '#videoEditorPublishMyDropsNex, ' +
            '#videoEditorTrashFloatingMyDropsNex, ' +
            '#fotoEditorThemeMyDropsNex, ' +
            '#fotoEditorLoopMyDropsNex, ' +
            '#fotoEditorAddTextMyDropsNex, ' +
            '#fotoEditorDeleteMyDropsNex, ' +
            '#fotoEditorPublishMyDropsNex, ' +
            '#fotoEditorMediaActionsMyDropsNex, ' +
            '#dropsFotoMyDropsNex, ' +
            '#dropsVideoMyDropsNex, ' +
            '#dropsFundoMyDropsNex, ' +
            '#fotoEditorAjustarMyDropsNex, ' +
            '#fotoEditorTrashMyDropsNex'
        );

        if (
          !dentroDoTexto &&
          !dentroDaFoto &&
          !dentroDoVideo &&
          !dentroDosControles &&
          !dentroDaBarraDoEditor
        ) {
          if (typeof desselecionarTextoMyDropsNex === 'function') {
            desselecionarTextoMyDropsNex();
          }
        }
      },
      true
    );

    // ============================================
    // 7. CONTADOR DE LEGENDA DO VÍDEO
    // ============================================

    const legendaVideoInput = document.getElementById('legendaVideoMyDropsInput');
    const legendaVideoContador = document.getElementById(
      'legendaVideoContadorMyDrops'
    );

    if (legendaVideoInput && legendaVideoContador) {
      legendaVideoInput.addEventListener('input', () => {
        const len = legendaVideoInput.value.length;
        legendaVideoContador.textContent = `${len}/500`;
      });
    }

    // ============================================
    // 8. MENU FOTO / VÍDEO MY DROPS
    // ============================================

    let menuFotoVideoAtivo = null;

    function criarMenuFotoVideoMyDrops(tipo) {
      let menu = document.getElementById('mydropsMediaMenu');

      if (!menu) {
        menu = document.createElement('div');
        menu.id = 'mydropsMediaMenu';
        menu.className = 'mydrops-media-menu';
        document.body.appendChild(menu);
      }

      if (tipo === 'foto') {
        menu.innerHTML = `
          <button type="button" class="mydrops-media-option" id="mydropsCameraFotoOption">
            <span>📷</span> Tirar foto
          </button>
          <button type="button" class="mydrops-media-option" id="mydropsGaleriaFotoOption">
            <span>🖼️</span> Escolher da galeria
          </button>
        `;

        document.getElementById('mydropsCameraFotoOption')?.addEventListener('click', () => {
          fecharMenuFotoVideoMyDrops();
          window.abrirCameraFotoMyDropsNex?.();
        });

        document.getElementById('mydropsGaleriaFotoOption')?.addEventListener('click', () => {
          fecharMenuFotoVideoMyDrops();
          document.getElementById('mydropsGalleryImageInput')?.click();
        });
      } else if (tipo === 'video') {
        menu.innerHTML = `
          <button type="button" class="mydrops-media-option" id="mydropsCameraVideoOption">
            <span>🎥</span> Gravar vídeo
          </button>
          <button type="button" class="mydrops-media-option" id="mydropsGaleriaVideoOption">
            <span>📁</span> Escolher da galeria
          </button>
        `;

        document.getElementById('mydropsCameraVideoOption')?.addEventListener('click', () => {
          fecharMenuFotoVideoMyDrops();
          window.abrirCameraMyDrops?.();
        });

        document.getElementById('mydropsGaleriaVideoOption')?.addEventListener('click', () => {
          fecharMenuFotoVideoMyDrops();
          document.getElementById('mydropsGalleryVideoInput')?.click();
        });
      }

      menu.style.display = 'flex';
      menuFotoVideoAtivo = tipo;
    }

    function fecharMenuFotoVideoMyDrops() {
      const menu = document.getElementById('mydropsMediaMenu');
      if (menu) menu.style.display = 'none';
      menuFotoVideoAtivo = null;
    }

    // Inputs escondidos para galeria
    if (!document.getElementById('mydropsGalleryVideoInput')) {
      const videoInput = document.createElement('input');
      videoInput.type = 'file';
      videoInput.id = 'mydropsGalleryVideoInput';
      videoInput.accept = 'video/*';
      videoInput.style.display = 'none';
      document.body.appendChild(videoInput);

      videoInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const url = URL.createObjectURL(file);

        window.videoGravadoMyDropsNex = file;
        window.urlVideoGravadoMyDropsNex = url;

        window.abrirEditorVideoMyDropsNex?.();
        videoInput.value = '';
      });
    }

    if (!document.getElementById('mydropsGalleryImageInput')) {
      const imageInput = document.createElement('input');
      imageInput.type = 'file';
      imageInput.id = 'mydropsGalleryImageInput';
      imageInput.accept = 'image/*';
      imageInput.style.display = 'none';
      document.body.appendChild(imageInput);

      imageInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          const dataURL = evt.target.result;
          window.abrirEditorFotoMyDropsNex?.(dataURL);
        };
        reader.readAsDataURL(file);
        imageInput.value = '';
      });
    }

    // Fecha o menu ao clicar fora
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('mydropsMediaMenu');
      if (menu && menu.style.display === 'flex') {
        if (
          !menu.contains(e.target) &&
          !e.target.closest('#btnFotoDropsMyDropsNex') &&
          !e.target.closest('#btnVideoDropsMyDropsNex')
        ) {
          fecharMenuFotoVideoMyDrops();
        }
      }
    });

    // ============================================
    // 9. BOTÕES FOTO E VÍDEO DO MY DROPS (menu)
    // ============================================

    setTimeout(() => {
      const btnFotoOriginal = document.getElementById('btnFotoDropsMyDropsNex');
      if (btnFotoOriginal) {
        const novoBtnFoto = btnFotoOriginal.cloneNode(true);
        btnFotoOriginal.parentNode.replaceChild(novoBtnFoto, btnFotoOriginal);
        novoBtnFoto.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          criarMenuFotoVideoMyDrops('foto');
        });
      }

      const btnVideoOriginal = document.getElementById('btnVideoDropsMyDropsNex');
      if (btnVideoOriginal) {
        const novoBtnVideo = btnVideoOriginal.cloneNode(true);
        btnVideoOriginal.parentNode.replaceChild(novoBtnVideo, btnVideoOriginal);
        novoBtnVideo.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          criarMenuFotoVideoMyDrops('video');
        });
      }

      const btnCanvas = document.getElementById('btnDropsMyDropsNex');
      if (btnCanvas && !btnCanvas.__listener) {
        btnCanvas.__listener = true;
        // Já tem listener de 13-editor.js, não precisa duplicar
      }
    }, 500);

    console.log('✅ Drops inicializado com sucesso!');
  });

// ============================================
// TRAVA SCROLL DO BODY QUANDO EDITOR ABRIR
// E FORÇA ALTURA REAL DO EDITOR
// ============================================

function ajustarAlturaEditorNex() {
  const altura = window.innerHeight;

  const fotoEditor = document.getElementById('fotoEditorMyDropsNex');
  const videoEditor = document.getElementById('videoEditorMyDropsNex');

  [fotoEditor, videoEditor].forEach((editor) => {
    if (!editor) return;
    if (editor.style.display !== 'flex') return;

    editor.style.setProperty('height', altura + 'px', 'important');
    editor.style.setProperty('max-height', altura + 'px', 'important');
    editor.style.setProperty('top', '0', 'important');
    editor.style.setProperty('bottom', 'auto', 'important');
  });
}

function ajustarLegendaNex() {
  const fotoEditor = document.getElementById('fotoEditorMyDropsNex');
  const videoEditor = document.getElementById('videoEditorMyDropsNex');

  [fotoEditor, videoEditor].forEach((editor) => {
    if (!editor) return;
    if (editor.style.display !== 'flex') return;

    const legenda = editor.querySelector(
      '.foto-editor-legenda-row-mydrops-nex, .video-editor-legenda-row-mydrops-nex'
    );
    if (!legenda) return;

    legenda.style.setProperty('position', 'absolute', 'important');
    legenda.style.setProperty('bottom', '12px', 'important');
    legenda.style.setProperty('left', '12px', 'important');
    legenda.style.setProperty('right', '12px', 'important');
    legenda.style.setProperty('z-index', '100000', 'important');
  });
}

// ============================================
// DETECTA EDITOR/VIEWER/MODAL ABERTO
// ============================================

function atualizarClassesBodyNex() {
  // 1. EDITOR ABERTO?
  const fotoEditor = document.getElementById('fotoEditorMyDropsNex');
  const videoEditor = document.getElementById('videoEditorMyDropsNex');

  const fotoAberto = fotoEditor && fotoEditor.style.display === 'flex';
  const videoAberto = videoEditor && videoEditor.style.display === 'flex';

  if (fotoAberto || videoAberto) {
    document.body.classList.add('editor-aberto');
    setTimeout(ajustarAlturaEditorNex, 50);
    setTimeout(ajustarLegendaNex, 100);
  } else {
    document.body.classList.remove('editor-aberto');
  }

  // 2. VIEWER DE PUBLICAÇÃO / MÍDIA ABERTO?
  const viewerPub = document.querySelector('.mydrops-publication-viewer');
  const viewerNearby = document.querySelector('.nearby-drop-viewer');
  const viewerMidia = document.querySelector('.nex-midia-viewer');

  const algumViewer = !!(viewerPub || viewerNearby || viewerMidia);

  if (algumViewer) {
    document.body.classList.add('viewer-aberto');
  } else {
    document.body.classList.remove('viewer-aberto');
  }

  // 3. MODAL ABERTO?
  const modais = [
    'modalTextoMyDropsNex',
    'modalFundoMyDropsNex',
    'modalDuracaoPublicacaoMyDropsNex'
  ];

  const algumModalAberto = modais.some((id) => {
    const m = document.getElementById(id);
    return m && !m.classList.contains('hidden');
  });

  if (algumModalAberto) {
    document.body.classList.add('modal-aberto');
  } else {
    document.body.classList.remove('modal-aberto');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Roda uma vez no início
  atualizarClassesBodyNex();

  // Em vez de MutationObserver (que trava), usa interval
  // A cada 400ms verifica o estado. Leve e sem loop infinito.
  setInterval(atualizarClassesBodyNex, 400);

  // Reajusta quando a tela mudar
  window.addEventListener('resize', () => {
    ajustarAlturaEditorNex();
    ajustarLegendaNex();
  });

  window.addEventListener('orientationchange', () => {
    setTimeout(ajustarAlturaEditorNex, 300);
    setTimeout(ajustarLegendaNex, 350);
  });
});

// ============================================
// FECHAR MODAIS AO CLICAR FORA
// ============================================

document.addEventListener(
  'click',
  (e) => {
    const modalTexto = document.getElementById('modalTextoMyDropsNex');
    if (
      modalTexto &&
      !modalTexto.classList.contains('hidden') &&
      e.target === modalTexto
    ) {
      if (typeof window.fecharModalEdicaoNex === 'function') {
        window.fecharModalEdicaoNex();
      }
      return;
    }

    const modalFundo = document.getElementById('modalFundoMyDropsNex');
    if (
      modalFundo &&
      !modalFundo.classList.contains('hidden') &&
      e.target === modalFundo
    ) {
      if (typeof window.fecharModalFundoMyDropsNex === 'function') {
        window.fecharModalFundoMyDropsNex();
      }
      return;
    }

    const modalDuracao = document.getElementById('modalDuracaoPublicacaoMyDropsNex');
    if (
      modalDuracao &&
      !modalDuracao.classList.contains('hidden') &&
      e.target === modalDuracao
    ) {
      if (typeof window.fecharModalDuracaoPublicacaoMyDropsNex === 'function') {
        window.fecharModalDuracaoPublicacaoMyDropsNex();
      }
      return;
    }
  },
  true
);

// ============================================
// BLOQUEIA CLIQUES FORA DO MODAL QUANDO ABERTO
// ============================================

document.addEventListener(
  'click',
  (e) => {
    const modaisAbertos = [
      'modalTextoMyDropsNex',
      'modalFundoMyDropsNex',
      'modalDuracaoPublicacaoMyDropsNex'
    ].filter((id) => {
      const m = document.getElementById(id);
      return m && !m.classList.contains('hidden');
    });

    if (!modaisAbertos.length) return;

    const clicouDentroDeAlgum = modaisAbertos.some((id) => {
      const m = document.getElementById(id);
      return m && m.contains(e.target);
    });

    if (!clicouDentroDeAlgum) {
      e.stopPropagation();
      e.preventDefault();
    }
  },
  true
);
  console.log('🎯 14-init.js carregado');

})();

