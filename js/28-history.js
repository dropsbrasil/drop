/* ============================================
   28-HISTORY.JS
   Navegação com botão voltar (Android/iOS/PWA)
============================================ */

(function () {
  'use strict';

  const HISTORY_KEY = '__dropsState';
  let ultimaSaidaPedida = 0;

  // ============================================
  // EMPILHAR ESTADO
  // ============================================
  function empilharEstado(tipo, dados) {
    try {
      history.pushState(
        { [HISTORY_KEY]: tipo, dados: dados || null },
        '',
        location.href
      );
    } catch (e) {}
  }

  window.dropsEmpilharEstado = empilharEstado;

  // ============================================
  // DETECTAR O QUE ESTÁ ABERTO
  // ============================================
  function detectarAberto() {
    // 1. Modais com classe .active
    const modaisActive = ['nomeModal', 'bioModal', 'socialModalNex'];
    for (const id of modaisActive) {
      const el = document.getElementById(id);
      if (el && el.classList.contains('active')) {
        return { tipo: 'modal', id, via: 'active' };
      }
    }

    // 2. Modais com style.display
    const modaisDisplay = [
      'editarMsgModalNex',
      'confirmDeleteModalNex',
      'confirmDeleteMeModalNex',
      'bloquearPerfilModalNex',
      'bloqueandoUsuarioModalNex',
      'modalDesbloquearNex',
      'modalSobreAppNex',
      'modalDocSobreNex',
      'modalSairContaNex',
      'painelControleNex',
      'painelMeusAdeptosNex',
      'painelBloqueadosNex',
      'painelDesconectadosNex',
      'albumModalNex',
      'muralConfirmSairNex',
      'muralConfirmLimparNex',
      'muralModalTextoNex',
      'perfilMuralEmBreveNex'
    ];

    for (const id of modaisDisplay) {
      const el = document.getElementById(id);
      if (!el) continue;
      const disp = el.style.display;
      if (disp && disp !== 'none') {
        return { tipo: 'modal', id, via: 'display' };
      }
    }

    // 3. Modais com classe .hidden
    const modaisHidden = [
      'modalTextoMyDropsNex',
      'modalFundoMyDropsNex',
      'modalDuracaoPublicacaoMyDropsNex'
    ];

    for (const id of modaisHidden) {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('hidden')) {
        return { tipo: 'modal', id, via: 'hidden' };
      }
    }

    // 4. Mural
    const mural = document.getElementById('modalMuralNex');
    if (mural && mural.style.display === 'flex') {
      return { tipo: 'mural' };
    }

    // 5. Câmeras
    const camVideo = document.getElementById('cameraMyDropsOverlayNex');
    if (camVideo && camVideo.style.display === 'flex') {
      return { tipo: 'camera-video' };
    }

    const camFoto = document.getElementById('cameraFotoMyDropsOverlayNex');
    if (camFoto && camFoto.style.display === 'flex') {
      return { tipo: 'camera-foto' };
    }

    // 6. Editor de vídeo
    const editorVideo = document.getElementById('videoEditorMyDropsNex');
    if (editorVideo && editorVideo.style.display === 'flex') {
      return { tipo: 'editor-video' };
    }

    // 7. Editor de foto (criado dinamicamente)
    const editorFoto = document.getElementById('fotoEditorMyDropsNex');
    if (editorFoto && editorFoto.style.display === 'flex') {
      return { tipo: 'editor-foto' };
    }

    // 8. Menus
    const menuAnexo = document.getElementById('menuAnexoNex');
    if (menuAnexo && menuAnexo.style.display === 'flex') {
      return { tipo: 'menu-anexo' };
    }

    const menuMsg = document.getElementById('msgMenuNex');
    if (menuMsg && menuMsg.style.display === 'flex') {
      return { tipo: 'menu-msg' };
    }

    const chatMenu = document.getElementById('chatMenuDropdownNex');
    if (chatMenu && chatMenu.classList.contains('aberto')) {
      return { tipo: 'chat-menu' };
    }

    const menuCamera = document.getElementById('menuCameraLateralNex');
    if (menuCamera && menuCamera.classList.contains('aberto')) {
      return { tipo: 'menu-camera' };
    }

    // 9. Viewers
    if (document.querySelector('.nex-midia-viewer')) return { tipo: 'viewer-midia' };
    if (document.querySelector('.nearby-drop-viewer')) return { tipo: 'viewer-nearby' };
    if (document.querySelector('.mydrops-publication-viewer')) return { tipo: 'viewer-pub' };
    if (document.querySelector('.mydrops-list-modal')) return { tipo: 'lista-modal' };
    if (document.querySelector('.mydrops-delete-modal')) return { tipo: 'lista-modal' };

    // 10. Chat
    const chat = document.getElementById('chatNex');
    if (chat && chat.classList.contains('active') && chat.style.display !== 'none') {
      return { tipo: 'chat' };
    }

    // 11. Perfil visitado
    const perfil = document.getElementById('perfilVisitadoNex');
    if (perfil && perfil.classList.contains('active')) {
      return { tipo: 'perfil' };
    }

    // 12. Telas principais
    if (document.getElementById('nex')?.classList.contains('active')) {
      return { tipo: 'tela-nex' };
    }
    if (document.getElementById('nearby')?.classList.contains('active')) {
      return { tipo: 'tela-nearby' };
    }
    if (document.getElementById('mydrops')?.classList.contains('active')) {
      return { tipo: 'tela-mydrops' };
    }

    return { tipo: 'raiz' };
  }

  // ============================================
  // FECHAR O QUE ESTÁ ABERTO
  // ============================================
  function fecharAberto(aberto) {
    switch (aberto.tipo) {
      case 'modal': {
        const el = document.getElementById(aberto.id);
        if (!el) return false;

        const fechadores = {
          nomeModal: 'fecharEditorNomeNex',
          editarMsgModalNex: 'fecharModalEdicaoNex',
          confirmDeleteModalNex: 'fecharConfirmDeleteNex',
          confirmDeleteMeModalNex: 'fecharConfirmDeleteMeNex',
          bloquearPerfilModalNex: 'fecharModalBloquearPerfilNex',
          modalDesbloquearNex: 'fecharModalDesbloquearNex',
          modalSobreAppNex: 'fecharSobreAppNex',
          modalDocSobreNex: 'fecharDocSobreNex',
          modalSairContaNex: 'fecharModalSairContaNex',
          painelControleNex: 'fecharPainelControleNex',
          painelMeusAdeptosNex: 'fecharMeusAdeptosNex',
          painelBloqueadosNex: 'fecharBloqueadosNex',
          painelDesconectadosNex: 'fecharDesconectadosNex',
          modalFundoMyDropsNex: 'fecharModalFundoMyDropsNex',
          modalDuracaoPublicacaoMyDropsNex: 'fecharModalDuracaoPublicacaoMyDropsNex',
          confirmLimparPerfilModalNex: 'fecharConfirmLimparPerfilNex',
          confirmNomeModalNex: 'fecharConfirmNomeNex',
          albumModalNex: 'fecharAlbumNex',
          muralConfirmLimparNex: 'fecharConfirmLimparMuralNex',
          muralModalTextoNex: 'fecharModalTextoMuralNex',
          perfilMuralEmBreveNex: 'fecharMuralEmBrevePerfilNex'
        };

        const fn = fechadores[aberto.id];
        if (fn && typeof window[fn] === 'function') {
          window[fn]();
          return true;
        }

        if (aberto.via === 'active') {
          el.classList.remove('active');
        } else if (aberto.via === 'hidden') {
          el.classList.add('hidden');
        } else {
          el.style.display = 'none';
        }

        return true;
      }

      case 'mural': {
        if (typeof window.tentarFecharMuralNex === 'function') {
          window.tentarFecharMuralNex();
        } else if (typeof window.fecharMuralNex === 'function') {
          window.fecharMuralNex();
        }
        return true;
      }

      case 'camera-video': {
        if (typeof window.fecharCameraMyDrops === 'function') {
          window.fecharCameraMyDrops();
        }
        return true;
      }

      case 'camera-foto': {
        if (typeof window.fecharCameraFotoMyDropsNex === 'function') {
          window.fecharCameraFotoMyDropsNex();
        }
        return true;
      }

      case 'editor-video': {
        if (typeof window.fecharEditorVideoMyDropsNex === 'function') {
          window.fecharEditorVideoMyDropsNex();
        }
        return true;
      }

      case 'editor-foto': {
        const el = document.getElementById('fotoEditorMyDropsNex');
        if (el) el.style.display = 'none';
        return true;
      }

      case 'menu-anexo': {
        const m = document.getElementById('menuAnexoNex');
        if (m) m.style.display = 'none';
        return true;
      }

      case 'menu-msg': {
        if (typeof window.fecharMenuMsgNex === 'function') {
          window.fecharMenuMsgNex();
        }
        return true;
      }

      case 'chat-menu': {
        if (typeof window.fecharMenuChatNex === 'function') {
          window.fecharMenuChatNex();
        }
        return true;
      }

      case 'menu-camera': {
        if (typeof window.fecharCameraMenuNex === 'function') {
          window.fecharCameraMenuNex();
        }
        return true;
      }

      case 'viewer-midia': {
        const v = document.querySelector('.nex-midia-viewer');
        if (v) v.remove();
        return true;
      }

      case 'viewer-nearby': {
        const v = document.querySelector('.nearby-drop-viewer');
        if (v) v.remove();
        document.body.style.overflow = '';
        return true;
      }

      case 'viewer-pub': {
        const v = document.querySelector('.mydrops-publication-viewer');
        if (v) v.remove();
        document.body.style.overflow = '';
        return true;
      }

      case 'lista-modal': {
        document.querySelectorAll('.mydrops-list-modal, .mydrops-delete-modal')
          .forEach((v) => v.remove());
        return true;
      }

      case 'chat': {
        if (typeof window.voltarChatNex === 'function') {
          window.voltarChatNex();
        }
        return true;
      }

      case 'perfil': {
        if (typeof window.voltarPerfilVisitadoNex === 'function') {
          window.voltarPerfilVisitadoNex();
        }
        return true;
      }

      case 'tela-nex': {
        if (typeof window.abrirTela === 'function') {
          window.abrirTela('mydrops', 0);
        }
        return true;
      }

      case 'tela-nearby': {
        if (typeof window.abrirTela === 'function') {
          window.abrirTela('mydrops', 0);
        }
        return true;
      }

      default:
        return false;
    }
  }

  // ============================================
  // POPSTATE — botão voltar
  // ============================================
  window.addEventListener('popstate', () => {
    const aberto = detectarAberto();

    // Está na raiz → pergunta se quer sair
    if (aberto.tipo === 'tela-mydrops' || aberto.tipo === 'raiz') {
      const agora = Date.now();

      if (agora - ultimaSaidaPedida < 2000) {
        return; // deixa fechar
      }

      ultimaSaidaPedida = agora;

      if (typeof window.mostrarToastNex === 'function') {
        window.mostrarToastNex('Clique de novo pra sair', 'info', 2000);
      }

      empilharEstado('tela-mydrops', null);
      return;
    }

    const fechou = fecharAberto(aberto);

    if (fechou) {
      setTimeout(() => {
        const depois = detectarAberto();
        if (depois.tipo !== 'tela-mydrops' && depois.tipo !== 'raiz') {
          empilharEstado(depois.tipo, null);
        }
      }, 50);
    }
  });

  // ============================================
  // INICIALIZAÇÃO
  // ============================================
  document.addEventListener('DOMContentLoaded', () => {
    try {
      history.replaceState(
        { [HISTORY_KEY]: 'tela-mydrops' },
        '',
        location.href
      );
    } catch (e) {}
  });

  console.log('🕹️ 28-history.js carregado');
})();