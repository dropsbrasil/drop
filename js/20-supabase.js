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

  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  console.log('🔌 Supabase client carregado');
})();