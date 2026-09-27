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
    conversaAtual: 'Julia',
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