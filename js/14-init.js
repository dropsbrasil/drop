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
// SERVICE WORKER (PWA)
// ============================================
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js')
    .then(() => console.log('📱 PWA: Service Worker registrado'))
    .catch((err) => console.warn('PWA: SW falhou', err));
}

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
  calcularAdeptosEnviadosNex().catch((err) =>
    console.warn('Erro ao calcular adeptos enviados:', err)
  );
   }

    console.log('👑 Sistema de adeptos inicializado');

    // ============================================
// 1.5. RENDERIZA OS CARDS INICIAIS DAS CONVERSAS
// ============================================

// ============================================
// 1.5. RENDERIZA OS CARDS INICIAIS DAS CONVERSAS
// ============================================

// ⚠️ Sincroniza conversas reais do Supabase (em background)
if (typeof sincronizarCardsNexSupabase === 'function') {
  setTimeout(async () => {
    await sincronizarCardsNexSupabase();

    // ⚠️ Abre a aba correta DEPOIS de sincronizar
    setTimeout(() => {
      const listaNaoLidas = document.getElementById('nex-naolidas');
      const temNaoLidas =
        listaNaoLidas &&
        listaNaoLidas.querySelectorAll('.nex-chat').length > 0;

      if (typeof mostrarNexTab === 'function') {
        if (temNaoLidas) {
          mostrarNexTab('naolidas');
        } else {
          mostrarNexTab('geral');
        }
      }

      // ⚠️ Atualiza visibilidade da aba (esconde se vazia)
      if (typeof window.atualizarAbaNaoLidasNex === 'function') {
        window.atualizarAbaNaoLidasNex();
      }
    }, 200);

    console.log('💬 Cards do Supabase sincronizados');
  }, 1500);
}

// ⚠️ Inicia o Realtime do NEX
if (typeof iniciarRealtimeNexSupabase === 'function') {
  setTimeout(() => {
    iniciarRealtimeNexSupabase();
  }, 2000);
}

// ⚠️ Carrega a lista de quem EU silenciei e de quem ME silenciou
if (typeof carregarSilenciadosSupabase === 'function') {
  setTimeout(() => {
    carregarSilenciadosSupabase();
  }, 2500);
}

// ⚠️ Ativa o Realtime dos silenciados:
//    - Quando ALGUÉM me silencia/desilencia → UI atualiza na hora
//    - Quando EU silencio/desilencia alguém → lista em memória atualiza
//    - Se estou no chat da pessoa → botão de enviar troca pro cadeado na hora
if (typeof iniciarRealtimeSilenciadosNex === 'function') {
  setTimeout(() => {
    iniciarRealtimeSilenciadosNex();
  }, 2800);
}

// ⚠️ Ativa o Realtime de presença (Online/Offline):
//    - Ouve a tabela profiles e avisa a tela na hora
//    - Elimina a necessidade de perguntar "quem está online?" toda hora
if (typeof iniciarRealtimePresencaNex === 'function') {
  setTimeout(() => {
    iniciarRealtimePresencaNex();
  }, 3000);
}

// ⚠️ Inicia o Realtime das reações de mídia
if (typeof iniciarRealtimeReacoesMidiaNex === 'function') {
  setTimeout(() => {
    iniciarRealtimeReacoesMidiaNex();
  }, 2500);
}

// ⚠️ Atualiza contador do mural
if (typeof window.atualizarContadorMeuMuralNex === 'function') {
  setTimeout(() => {
    window.atualizarContadorMeuMuralNex();
  }, 3000);
}

// ⚠️ Pede permissão pra enviar notificações
if (typeof pedirPermissaoNotificacaoNex === 'function') {
  setTimeout(() => {
    pedirPermissaoNotificacaoNex();
  }, 3000);
}

    // ============================================
// 2. MOSTRA A TELA INICIAL (restaura a última)
// ============================================

if (typeof mostrarTela === 'function') {
  let telaSalva = 'mydrops';

  try {
    const salva = localStorage.getItem('drops_tela_atual');
    if (salva && ['mydrops', 'nearby', 'nex'].includes(salva)) {
      telaSalva = salva;
    }
  } catch (e) {}

  const mapaTabs = { mydrops: 0, nearby: 1, nex: 2 };
  const index = mapaTabs[telaSalva] ?? 0;

  mostrarTela(telaSalva, index);
}

    // ⚠️ NÃO abre aba ainda — espera sincronizar os cards
// A aba correta é escolhida em atualizarAbaInicialNex()
    
// ============================================
// 3. SINCRONIZA E RENDERIZA CONECTADOS
// ============================================

// ⚠️ Primeiro: sincroniza localStorage → Supabase
// Depois: carrega do Supabase pro localStorage (pega de outros aparelhos)
if (window.ConectadosAdapterNex?.sincronizarConectadosSupabase) {
  setTimeout(async () => {
    await window.ConectadosAdapterNex.sincronizarConectadosSupabase();
    await window.ConectadosAdapterNex.carregarConectadosSupabase();

    if (typeof renderizarConectadosMyDropsNex === 'function') {
      renderizarConectadosMyDropsNex();
    }
  }, 1000);
} else {
  if (typeof renderizarConectadosMyDropsNex === 'function') {
    renderizarConectadosMyDropsNex();
  }
}

// ⚠️ Verifica visibilidade da aba "Não lidas" após carregar
setTimeout(() => {
  if (typeof window.atualizarAbaNaoLidasNex === 'function') {
    window.atualizarAbaNaoLidasNex();
  }
}, 1500);

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

if (typeof window.atualizarContadorVisitasNex === 'function') {
  window.atualizarContadorVisitasNex();
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
  weatherLocationEl.textContent = 'Buscando localização...';

  // ============================================
  // GPS INTELIGENTE (Local-First)
  // ============================================
  // ⚠️ Nada de salvar no Supabase a cada minuto.
  // A localização é guardada só na memória do celular.
  // O Nearby usa o cache local e o Realtime para economizar cota.

  const atualizarLocalizacaoNex = () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          // ⚠️ Guarda apenas em memória (o 11-nearby.js usa pra calcular)
          window.minhaLatitudeAtual = lat;
          window.minhaLongitudeAtual = lng;

          // ⚠️ Re-renderiza o Nearby (o cache decide se busca ou não)
          if (typeof window.renderizarPublicacoesNearbyNex === 'function') {
            window.renderizarPublicacoesNearbyNex();
          }

          // Tenta pegar o endereço pra mostrar no MyDrops
          let address = null;
          try {
            address = await Promise.race([
              reverseGeocodeExact(lat, lng),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('geocode timeout')), 8000)
              )
            ]);
          } catch (geoErr) {
            console.warn('Reverse geocode falhou:', geoErr.message);
          }

          weatherLocationEl.textContent =
            address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        } catch (err) {
          console.error('Erro localização:', err);
          weatherLocationEl.textContent = 'Localização indisponível';
        }
      },
      (err) => {
        console.error('Erro geolocalização:', err);
        if (err.code === 1) weatherLocationEl.textContent = 'Permissão negada';
        else if (err.code === 2) weatherLocationEl.textContent = 'GPS indisponível';
        else if (err.code === 3) weatherLocationEl.textContent = 'GPS demorou demais';
        else weatherLocationEl.textContent = 'Localização indisponível';
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000
      }
    );
  };

  // ⚠️ Chama uma vez ao abrir
  atualizarLocalizacaoNex();

  // ============================================
  // WATCH POSITION (Monitoramento Inteligente)
  // ============================================
  // ⚠️ Em vez de perguntar de minuto em minuto, o navegador
  // nos avisa quando o usuário realmente se move. Isso economiza
  // bateria e evita atualizações desnecessárias.

  if (navigator.geolocation.watchPosition) {
    navigator.geolocation.watchPosition(
      (pos) => {
        const novaLat = pos.coords.latitude;
        const novaLng = pos.coords.longitude;

        // Atualiza as variáveis globais
        window.minhaLatitudeAtual = novaLat;
        window.minhaLongitudeAtual = novaLng;

        // Chama a renderização (o cache do 11-nearby decide se busca)
        if (typeof window.renderizarPublicacoesNearbyNex === 'function') {
          window.renderizarPublicacoesNearbyNex();
        }
      },
      (err) => {
        console.warn('WatchPosition erro:', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000,
        distanceFilter: 500 // Só dispara quando mover 500m
      }
    );
  }
}

    // ============================================
    // 6. DESSELEÇÃO AUTOMÁTICA (editor)
    // ============================================

    document.addEventListener(
  'pointerdown',
  (e) => {
  // ⚠️ Se o editor de Notas estiver aberto, deixa o 29-notas cuidar
  const notasEditor = document.getElementById('notasEditorNex');
  if (notasEditor && notasEditor.classList.contains('aberto')) {
    return;
  }

  // ⚠️ Se o editor de Foto estiver aberto, deixa o 30-foto cuidar
  const fotoEditor = document.getElementById('fotoEditorNex');
  if (fotoEditor && fotoEditor.classList.contains('aberto')) {
    return;
  }

    const dentroDoTexto = e.target.closest('.video-editor-text-mydrops-nex');
    const dentroDaFoto = e.target.closest('.video-editor-photo-mydrops-nex');
    const dentroDoVideo = e.target.closest('.video-editor-video-mydrops-nex');
    const dentroDasAlcas = e.target.closest('.editor-alca-nex');

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
      !dentroDasAlcas &&
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
  let overlay = document.getElementById('mydropsMediaOverlay');

  // Cria o overlay se não existir
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'mydropsMediaOverlay';
    overlay.className = 'mydrops-media-overlay';
    overlay.addEventListener('click', fecharMenuFotoVideoMyDrops);
    document.body.appendChild(overlay);
  }

  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'mydropsMediaMenu';
    menu.className = 'mydrops-media-menu';
    document.body.appendChild(menu);
  }

  if (tipo === 'foto') {
    menu.innerHTML = `
      <button type="button" class="mydrops-media-option" id="mydropsCameraFotoOption" style="display: flex; align-items: center; gap: 14px;">
        <span class="icone-capsula" style="width: 40px; height: 40px; min-width: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(37, 99, 235, 0.2); color: #60a5fa; flex-shrink: 0;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </span>
        Tirar foto
      </button>
      <button type="button" class="mydrops-media-option" id="mydropsGaleriaFotoOption" style="display: flex; align-items: center; gap: 14px;">
        <span class="icone-capsula" style="width: 40px; height: 40px; min-width: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(37, 99, 235, 0.2); color: #60a5fa; flex-shrink: 0;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </span>
        Escolher da galeria
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
      <button type="button" class="mydrops-media-option" id="mydropsCameraVideoOption" style="display: flex; align-items: center; gap: 14px;">
        <span class="icone-capsula" style="width: 40px; height: 40px; min-width: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(37, 99, 235, 0.2); color: #60a5fa; flex-shrink: 0;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
        </span>
        Gravar vídeo
      </button>
      <button type="button" class="mydrops-media-option" id="mydropsGaleriaVideoOption" style="display: flex; align-items: center; gap: 14px;">
        <span class="icone-capsula" style="width: 40px; height: 40px; min-width: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(37, 99, 235, 0.2); color: #60a5fa; flex-shrink: 0;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        </span>
        Escolher da galeria
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

  // ⚠️ Ativa o fundo desfocado e mostra o menu
  if (overlay) overlay.classList.add('aberto');
  menu.style.display = 'flex';
  menuFotoVideoAtivo = tipo;
    }

    function fecharMenuFotoVideoMyDrops() {
  const menu = document.getElementById('mydropsMediaMenu');
  const overlay = document.getElementById('mydropsMediaOverlay');
  
  if (menu) menu.style.display = 'none';
  if (overlay) overlay.classList.remove('aberto');
  
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
    }, 500);

    // ============================================
  // SYNC GERAL DE SEGURANÇA (ao voltar ao app ou reconectar)
  // ============================================
  const executarSyncGeralNex = () => {
    console.log('🔄 Sync Geral: atualizando dados em background...');
    
    // 1. Atualiza o perfil do próprio usuário
    if (typeof window.sincronizarPerfilSupabase === 'function') {
      window.sincronizarPerfilSupabase().catch(() => {});
    }

    // 2. Atualiza as métricas (interações e visitas)
    if (typeof window.atualizarMetricaInteracoesMyDropsNex === 'function') {
      window.atualizarMetricaInteracoesMyDropsNex();
    }
    if (typeof window.atualizarContadorVisitasNex === 'function') {
      window.atualizarContadorVisitasNex();
    }

    // 3. Atualiza as publicações do MyDrops
    if (typeof window.sincronizarPublicacoesSupabase === 'function') {
      window.sincronizarPublicacoesSupabase();
    }

    // 4. Atualiza o feed do Nearby
    if (typeof window.renderizarPublicacoesNearbyNex === 'function') {
      window.renderizarPublicacoesNearbyNex();
    }
  };

  // ⚠️ Quando o usuário volta para o app (tela desligou, trocou de aba, etc.)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    executarSyncGeralNex();
  });

  // ⚠️ Quando a internet volta
  window.addEventListener('online', () => {
    executarSyncGeralNex();
  });

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

// ⚠️ REMOVIDO: O setInterval foi desativado na Fase 1 de estabilização.
// Ele consumia memória à toa. O app agora só atualiza o body quando necessário.
// setInterval(atualizarClassesBodyNex, 1500);
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
// ⚠️ CORREÇÃO iOS: no WebKit, e.target às vezes chega como
//    nó de texto ou filho interno do botão — e o m.contains()
//    falha. Isso matava cliques legítimos no botão "Concluir".
//    Agora sobe a árvore manualmente até achar o modal.
// ============================================

document.addEventListener(
  'click',
  (e) => {
    const modaisAbertos = [
      'modalFundoMyDropsNex',
      'modalDuracaoPublicacaoMyDropsNex'
    ].filter((id) => {
      const m = document.getElementById(id);
      return m && !m.classList.contains('hidden');
    });

    if (!modaisAbertos.length) return;

    const clicouDentroDeAlgum = modaisAbertos.some((id) => {
      const m = document.getElementById(id);
      if (!m) return false;

      // Tentativa 1: contains direto
      if (m.contains(e.target)) return true;

      // Tentativa 2: sobe a árvore manualmente
      let atual = e.target;
      while (atual && atual !== document.body) {
        if (atual === m) return true;
        atual = atual.parentNode;
      }

      return false;
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