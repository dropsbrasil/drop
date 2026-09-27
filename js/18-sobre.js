/* ============================================
   18-SOBRE.JS
   Modal "Sobre o app" + Termos + Privacidade + Suporte
   
   Independente. Não depende de outros módulos
   além do 00-config.js (para nada, na verdade).
============================================ */

(function () {
  'use strict';

  // ============================================
  // ABRIR / FECHAR SOBRE O APP
  // ============================================

  function abrirSobreAppNex() {
    const modal = document.getElementById('modalSobreAppNex');
    if (!modal) return;

    // Fecha o painel de controle (se estiver aberto)
    if (typeof window.fecharPainelControleNex === 'function') {
      window.fecharPainelControleNex();
    }

    modal.style.display = 'flex';
  }

  function fecharSobreAppNex() {
    const modal = document.getElementById('modalSobreAppNex');
    if (modal) modal.style.display = 'none';
  }

  // ============================================
  // SUPORTE
  // ============================================

  function abrirSuporteSobreNex() {
    const email = 'suporte@drops.app';
    const assunto = encodeURIComponent('Suporte Drops');
    const corpo = encodeURIComponent(
      'Olá, time Drops!\n\nDescreva aqui seu problema ou dúvida:\n\n\n\n---\n' +
      'Detalhes técnicos (não apague):\n' +
      'Plataforma: ' + (navigator.platform || 'desconhecida') + '\n' +
      'Navegador: ' + (navigator.userAgent || 'desconhecido')
    );

    window.location.href = `mailto:${email}?subject=${assunto}&body=${corpo}`;
  }

  // ============================================
  // DOCUMENTOS (Termos / Privacidade)
  // ============================================

  function abrirDocSobreNex(tipo) {
    const modal = document.getElementById('modalDocSobreNex');
    const titulo = document.getElementById('docSobreTituloNex');
    const corpo = document.getElementById('docSobreCorpoNex');

    if (!modal || !titulo || !corpo) return;

if (tipo === 'novidades') {
  titulo.textContent = 'Novidades da versão';
  corpo.innerHTML = obterNovidadesSobreNex();
} else if (tipo === 'termos') {
  titulo.textContent = 'Termos de Uso';
  corpo.innerHTML = obterTermosSobreNex();
} else if (tipo === 'privacidade') {
  titulo.textContent = 'Política de Privacidade';
  corpo.innerHTML = obterPrivacidadeSobreNex();
} else {
  return;
}

    corpo.scrollTop = 0;
    modal.style.display = 'flex';
  }

  function fecharDocSobreNex() {
    const modal = document.getElementById('modalDocSobreNex');
    if (modal) modal.style.display = 'none';
  }

// ============================================
// CONTEÚDO — NOVIDADES / CHANGELOG
// ============================================

function obterNovidadesSobreNex() {
  return `
    <h4>🎉 Bem-vindo à versão 1.0.0</h4>
    <p>O Drops nasceu de uma ideia simples: e se as redes sociais fossem sobre <strong>quem está perto</strong>, e não sobre quem tem mais seguidores?</p>
    <p>Aqui, o feed é o seu bairro. O valor está nas pessoas que cruzam o seu caminho todos os dias — mesmo que você ainda não as conheça.</p>

    <h4>🎯 Nossos objetivos</h4>
    <ul>
      <li>Reaproximar pessoas que estão geograficamente perto</li>
      <li>Dar espaço para momentos reais, não para vitrines</li>
      <li>Priorizar conexão sobre competição</li>
      <li>Ser simples, rápido e sem ruído</li>
    </ul>

    <h4>✨ O que você pode fazer</h4>
    <ul>
      <li><strong>📸 Compartilhar drops</strong> — fotos, vídeos e notas que somem sozinhos</li>
      <li><strong>👣 Descobrir quem está perto</strong> — veja publicações de quem está no seu raio</li>
      <li><strong>💬 Conversar no NEX</strong> — chat completo com texto, áudio, mídia, localização e PDF</li>
      <li><strong>🤝 Conectar-se</strong> — salve pessoas que você quer acompanhar de perto</li>
      <li><strong>❤️ Reagir</strong> — coração ou coração partido, sem drama</li>
      <li><strong>👑 Ganhar adeptos</strong> — quem interage muito com você vira seu adepto</li>
      <li><strong>🔒 Controlar seu espaço</strong> — bloqueie, desconecte e limpe o perfil quando quiser</li>
    </ul>

    <h4>🚀 O que vem por aí</h4>
    <p>Esta é só a primeira versão. Estamos trabalhando em melhorias no NEX, novos tipos de drops e ferramentas de privacidade mais finas. Fique de olho!</p>

    <h4>💙 Obrigado</h4>
    <p>Obrigado por fazer parte disso desde o começo. Se tiver sugestões, críticas ou só quiser dizer oi, use o link de <strong>Suporte</strong>. Sua opinião molda o que o Drops vai ser.</p>

    <p style="margin-top: 18px; font-style: italic; opacity: .7;">Versão 1.0.0 — Setembro de 2026</p>
  `;
}

// ============================================
// CONTEÚDO — TERMOS DE USO
// ============================================

function obterTermosSobreNex() {
    return `
      <h4>1. Aceitação dos termos</h4>
      <p>Ao criar uma conta e usar o Drops, você concorda em cumprir estes Termos de Uso e todas as leis aplicáveis. Se não concordar, não use o app.</p>

      <h4>2. Sua conta</h4>
      <p>Você é responsável por manter suas credenciais seguras. Você deve ter pelo menos 15 anos para usar o Drops. Se for menor de 18 anos, deve ter consentimento dos pais ou responsáveis.</p>

      <h4>3. Uso permitido</h4>
      <p>Você concorda em não usar o Drops para:</p>
      <ul>
        <li>Publicar conteúdo ilegal, ofensivo ou que viole direitos de terceiros</li>
        <li>Assediar, ameaçar ou prejudicar outros usuários</li>
        <li>Fazer spam ou enviar mensagens não solicitadas</li>
        <li>Tentar acessar contas de outras pessoas</li>
        <li>Usar bots ou ferramentas automatizadas não autorizadas</li>
      </ul>

      <h4>4. Conteúdo que você publica</h4>
      <p>Você mantém os direitos sobre o que publica no Drops. Ao publicar, você nos concede uma licença para exibir, distribuir e armazenar o conteúdo dentro do app, respeitando suas configurações de privacidade.</p>

      <h4>5. Suspensão e encerramento</h4>
      <p>Podemos suspender ou encerrar sua conta a qualquer momento, caso você viole estes termos. Você também pode excluir sua conta a qualquer momento.</p>

      <h4>6. Alterações nos termos</h4>
      <p>Podemos atualizar estes termos periodicamente. Vamos avisar você sobre mudanças importantes antes que entrem em vigor.</p>

      <p style="margin-top: 18px; font-style: italic; opacity: .7;">Última atualização: versão 1.0</p>
    `;
  }

  // ============================================
  // CONTEÚDO — POLÍTICA DE PRIVACIDADE
  // ============================================

  function obterPrivacidadeSobreNex() {
    return `
      <h4>1. Quais dados coletamos</h4>
      <p>Coletamos apenas o essencial para o Drops funcionar:</p>
      <ul>
        <li>Nome, data de nascimento e e-mail</li>
        <li>Nome de usuário único (@)</li>
        <li>Localização aproximada (para mostrar pessoas próximas)</li>
        <li>Conteúdo que você publica (fotos, vídeos, mensagens)</li>
      </ul>

      <h4>2. Como usamos seus dados</h4>
      <p>Usamos seus dados para:</p>
      <ul>
        <li>Permitir que você use o app</li>
        <li>Mostrar pessoas e publicações próximas a você</li>
        <li>Verificar sua identidade</li>
        <li>Enviar códigos de segurança</li>
        <li>Melhorar a experiência do app</li>
      </ul>

      <h4>3. Seus direitos (LGPD)</h4>
      <p>Conforme a Lei Geral de Proteção de Dados (LGPD), você tem direito a:</p>
      <ul>
        <li>Acessar seus dados a qualquer momento</li>
        <li>Corrigir dados incorretos</li>
        <li>Solicitar a exclusão dos seus dados</li>
        <li>Revogar o consentimento</li>
        <li>Solicitar a portabilidade dos dados</li>
      </ul>

      <h4>4. Compartilhamento</h4>
      <p>Não vendemos seus dados. Compartilhamos apenas com prestadores de serviço essenciais (como servidores), sempre com contratos de confidencialidade.</p>

      <h4>5. Segurança</h4>
      <p>Usamos criptografia e outras medidas para proteger seus dados. Mesmo assim, nenhum sistema é 100% seguro — avise-nos imediatamente se suspeitar de acesso indevido.</p>

      <h4>6. Encarregado de Dados (DPO)</h4>
      <p>Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato pelo e-mail: <strong>dpo@drops.app</strong></p>

      <p style="margin-top: 18px; font-style: italic; opacity: .7;">Última atualização: versão 1.0</p>
    `;
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    // Botão Sobre o app no painel de controle
    const btnSobreApp = document.getElementById('btnSobreAppNex');
    if (btnSobreApp) {
      btnSobreApp.addEventListener('click', abrirSobreAppNex);
    }

    // Fecha "Sobre" ao clicar fora
    const modalSobre = document.getElementById('modalSobreAppNex');
    if (modalSobre) {
      modalSobre.addEventListener('click', (e) => {
        if (e.target === modalSobre) fecharSobreAppNex();
      });
    }

    // Fecha "Documento" ao clicar fora
    const modalDoc = document.getElementById('modalDocSobreNex');
    if (modalDoc) {
      modalDoc.addEventListener('click', (e) => {
        if (e.target === modalDoc) fecharDocSobreNex();
      });
    }
  });

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.abrirSobreAppNex = abrirSobreAppNex;
  window.fecharSobreAppNex = fecharSobreAppNex;
  window.abrirDocSobreNex = abrirDocSobreNex;
  window.fecharDocSobreNex = fecharDocSobreNex;
  window.abrirSuporteSobreNex = abrirSuporteSobreNex;

  // ============================================
  // DEBUG
  // ============================================

  console.log('ℹ️ 18-sobre.js carregado');

})();