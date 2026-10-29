/* ============================================
   00-CONFIG.JS
   Configurações, constantes e namespace global
   
   Este módulo é o PRIMEIRO a carregar.
   Ele cria o namespace window.Drops que todos
   os outros módulos usam.
============================================ */

(function () {
  'use strict';

  // ============================================
  // 🛡️ ESCUDO ANTI-TELA BRANCA GLOBAL
  // ============================================
  window.addEventListener('error', function(event) {
    console.error('🚨 Erro capturado:', event.message);
    
    // Se a tela já estiver quebrada, evita loop de erro
    if (document.getElementById('erroGlobalNex')) return;

    // Cria um aviso amigável em vez da tela branca
    const erroBox = document.createElement('div');
    erroBox.id = 'erroGlobalNex';
    erroBox.style.cssText = `
      position: fixed; inset: 0; background: #050b18; color: #fff; 
      z-index: 9999999; display: flex; flex-direction: column; 
      align-items: center; justify-content: center; padding: 20px; text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    erroBox.innerHTML = `
      <div style="font-size: 40px; margin-bottom: 10px;">🛠️</div>
      <h2 style="margin: 0 0 10px; font-size: 20px;">Ops, algo deu errado.</h2>
      <p style="margin: 0 0 20px; color: #94a3b8; font-size: 14px;">Ocorreu um problema interno, mas já estamos cuidando disso.</p>
      <button onclick="location.reload()" style="background: #2563eb; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer;">Recarregar App</button>
    `;
    document.body.appendChild(erroBox);
  });

  window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 Promessa rejeitada sem catch:', event.reason);
    
    // Mostra um toast de aviso se o app estiver rodando (evita tela branca por falha no Supabase)
    if (typeof window.mostrarToastNex === 'function') {
      window.mostrarToastNex('Falha de conexão. Tente novamente.', 'erro');
    }
  });

  // ============================================
  // NAMESPACE GLOBAL
  // ============================================
  window.Drops = window.Drops || {};

  // ============================================
  // USUÁRIO ATUAL
  // ============================================

  Drops.usernameAtual = (localStorage.getItem('drops_username') || '')
    .trim()
    .toLowerCase();

  // Prefixa uma chave com o @username do usuário
  // Ex: _chaveUsuarioMyDrops('mydropsAvatar') → 'mydropsAvatar_jhgv'
  Drops.chaveUsuario = function (base) {
    return Drops.usernameAtual
      ? `${base}_${Drops.usernameAtual}`
      : base;
  };

  // ============================================
  // CHAVES DO LOCALSTORAGE
  // ============================================

  Drops.CHAVES = {
    // Onboarding / auth
    CADASTRO_COMPLETO: 'drops_cadastro_completo',
    LOGADO: 'drops_logado',
    NOME: 'drops_nome',
    USERNAME: 'drops_username',
    EMAIL: 'drops_email',
    NASCIMENTO: 'drops_nascimento',

    // My Drops
    PUBLICACOES: 'mydropsPublicacoesMyDropsNex',
    CONECTADOS: 'mydropsConectadosNex',
    DESCONECTADOS: 'mydropsDesconectadosNex',

    // NEX
    INTERACOES_RECEBIDAS: 'mydropsInteracoesRecebidasNex',
    INTERACOES_ENVIADAS: 'mydropsInteracoesEnviadasNex',
      ADEPTOS: 'mydropsAdeptosNex',
  SOU_ADEPTO_DE: 'mydropsSouAdeptoDeNex'
};

  // ============================================
  // LIMITES E REGRAS DE NEGÓCIO
  // ============================================

  Drops.LIMITES = {
    // Sistema de adeptos
    MINIMO_INTERACOES: 15,      // Precisa de 15 interações...
    JANELA_DIAS: 30,            // ...em até 30 dias

    // Áudio
    AUDIO: 60,                  // 60 segundos máximo

    // Câmera de vídeo
    CAMERA_VIDEO: 60,           // 60 segundos máximo

    // Auto-limpeza de conversas
    AUTO_LIMPEZA_MS: 30 * 24 * 60 * 60 * 1000, // 30 dias em ms

    // Legenda
    LEGENDA_MAX: 500,

    // Bio
    BIO_MAX: 190,

    // Username
    USERNAME_MIN: 3,
    USERNAME_MAX: 20
  };

  // ============================================
  // ABAS DO NEX
  // ============================================

  Drops.ABAS_NEX = {
    naolidas: 'nex-naolidas',
    geral: 'nex-geral',
    conectados: 'nex-conectados'
  };

  // ============================================
  // ESTADO INICIAL (variáveis globais do app)
  // ============================================

  Drops.estado = {
  conversaAtual: '',
    abaNex: 'naolidas',
    telaOrigemPerfilVisitado: 'nex',
    perfilBloquearAtual: '',
    perfilAberto: '',
    bloqueadoAtual: ''
  };

  // ============================================
  // DEBUG
  // ============================================

  console.log('⚙️ 00-config.js carregado');
  console.log('   Usuário:', Drops.usernameAtual || '(não logado)');

})();