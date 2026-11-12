/* ============================================
   20-SUPABASE.JS
   Configuração do cliente Supabase
============================================ */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://sldiecaaplwgjxvfsdnq.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZGllY2FhcGx3Z2p4dmZzZG5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MTg5NDYsImV4cCI6MjEwNjA5NDk0Nn0.NJ7moZHhR4dEazJO35b7HFfPHpVnQhEeS5tnQE1xucE';

  if (!window.supabase) {
    console.error('❌ CDN do Supabase não foi carregado. Verifique o <script> no index.html.');
    return;
  }

  // ⚠️ FONTE ÚNICA DE VERDADE — todos os módulos devem ler daqui
  window.Drops = window.Drops || {};
  window.Drops.SUPABASE_URL = SUPABASE_URL;
  window.Drops.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY;

  // ============================================
  // ⚠️ TENTATIVA DE INICIALIZAÇÃO COM PROTEÇÃO
  // ============================================
  let tentativas = 0;
  const maxTentativas = 50; // 5 segundos (50 x 100ms)

  function tentarIniciarSupabase() {
    // Se o CDN do Supabase já carregou, inicializa
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        window.supabaseClient = window.supabase.createClient(
          SUPABASE_URL,
          SUPABASE_ANON_KEY
        );
        console.log('🔌 Supabase client carregado com sucesso');
        return;
      } catch (erro) {
        console.error('❌ Erro ao criar o cliente Supabase:', erro);
        mostrarErroSupabase();
        return;
      }
    }

    // Se o CDN não carregou ainda, tenta de novo
    tentativas++;
    if (tentativas < maxTentativas) {
      setTimeout(tentarIniciarSupabase, 100);
    } else {
      console.error('❌ CDN do Supabase não carregou após 5s.');
      mostrarErroSupabase();
    }
  }

  function mostrarErroSupabase() {
    // Avisa na tela que a conexão falhou
    const escudo = document.getElementById('bootProtectionNex');
    if (escudo) {
      escudo.innerHTML = `
        <div style="text-align: center; padding: 24px;">
          <div style="font-size: 40px; margin-bottom: 16px;">📡</div>
          <h2 style="font-size: 20px; font-weight: 900; color: #fff; margin-bottom: 12px;">Sem conexão</h2>
          <p style="font-size: 14px; color: #94a3b8; margin-bottom: 20px; line-height: 1.5;">Não foi possível conectar aos servidores.<br>Verifique sua internet e tente novamente.</p>
          <button onclick="window.location.reload(true);" style="background: #2563eb; color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 800; font-size: 14px; cursor: pointer; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
            Tentar Novamente
          </button>
        </div>
      `;
    }
  }

  // Inicia a tentativa
  tentarIniciarSupabase();

  console.log('🔌 20-supabase.js carregado');
})();