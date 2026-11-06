/* ============================================
   18-SOBRE.JS
   Modal "Sobre o app" + Termos + Privacidade + Suporte
   + Consentimentos LGPD

   Independente. Não depende de outros módulos
   além do 00-config.js (para nada, na verdade).
============================================ */

(function () {
  'use strict';

  // ============================================
  // LINKS PÚBLICOS (LGPD / LOJAS)
  // ============================================

  const URL_PRIVACIDADE_PUBLICA = 'https://appdrop.com.br/privacidade.html';
  const URL_EXCLUSAO_PUBLICA = 'https://appdrop.com.br/exclusao-de-conta.html';

  // ============================================
  // ABRIR / FECHAR SOBRE O APP
  // ============================================

  function abrirSobreAppNex() {
    const modal = document.getElementById('modalSobreAppNex');
    if (!modal) return;

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
  // LINKS PÚBLICOS
  // ============================================

  function abrirPrivacidadePublicaNex() {
    window.open(URL_PRIVACIDADE_PUBLICA, '_blank', 'noopener');
  }

  function abrirExclusaoPublicaNex() {
    window.open(URL_EXCLUSAO_PUBLICA, '_blank', 'noopener');
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
      <li><strong>Localização precisa</strong> (latitude e longitude) — usada para mostrar pessoas e publicações próximas a você</li>
      <li>Conteúdo que você publica (fotos, vídeos, mensagens, áudios, documentos)</li>
      <li>Dados de uso técnico (endereço IP, tipo de navegador, sistema operacional)</li>
    </ul>

    <h4>2. Como usamos seus dados</h4>
    <ul>
      <li>Permitir que você use o app</li>
      <li>Mostrar pessoas e publicações próximas a você (com base na localização precisa)</li>
      <li>Verificar sua identidade</li>
      <li>Enviar códigos de segurança por e-mail</li>
      <li>Moderar conteúdo e processar denúncias</li>
      <li>Melhorar a experiência do app</li>
    </ul>

    <h4>3. Compartilhamento com terceiros</h4>
    <p>Não vendemos seus dados. Compartilhamos apenas com prestadores de serviço essenciais:</p>
    <ul>
      <li><strong>Supabase</strong> — banco de dados e autenticação (armazena perfil, mensagens, publicações)</li>
      <li><strong>Cloudflare R2</strong> — armazenamento de mídia (fotos e vídeos publicados)</li>
      <li><strong>Nominatim / OpenStreetMap</strong> — conversão de coordenadas em endereço legível (geocodificação reversa)</li>
    </ul>
    <p>Todos os prestadores atuam sob contratos de confidencialidade e processam dados apenas para as finalidades acima.</p>

    <h4>4. Retenção de dados</h4>
    <ul>
      <li>Mensagens apagadas por você ou pelo destinatário são removidas em até 30 dias</li>
      <li>Conta excluída: todos os dados pessoais são removidos em até 30 dias</li>
      <li>Denúncias são mantidas por até 12 meses para fins de moderação</li>
    </ul>

    <h4>5. Seus direitos (LGPD)</h4>
    <p>Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
    <ul>
      <li>Acessar seus dados a qualquer momento</li>
      <li>Corrigir dados incorretos</li>
      <li>Solicitar a exclusão dos seus dados</li>
      <li>Revogar o consentimento (inclusive o de localização precisa)</li>
      <li>Solicitar a portabilidade dos dados</li>
      <li>Ser informado sobre compartilhamento com terceiros</li>
    </ul>
    <p>Para exercer qualquer direito, use a página de <strong>Exclusão de Conta</strong> ou envie e-mail para <strong>dpo@drops.app</strong>.</p>

    <h4>6. Segurança</h4>
    <p>Usamos criptografia em trânsito (HTTPS) e controles de acesso no banco de dados. Nenhum sistema é 100% seguro — avise-nos imediatamente se suspeitar de acesso indevido.</p>

    <h4>7. Encarregado de Dados (DPO)</h4>
    <p>Para exercer seus direitos ou tirar dúvidas sobre privacidade: <strong>dpo@drops.app</strong></p>

    <h4>8. Alterações nesta política</h4>
    <p>Podemos atualizar esta política periodicamente. Mudanças importantes serão avisadas dentro do app antes de entrar em vigor.</p>

    <p style="margin-top: 18px; font-style: italic; opacity: .7;">Última atualização: versão 1.0</p>
  `;
}

// ============================================
// CONSENTIMENTOS (LGPD)
// ============================================

const TIPOS_CONSENTIMENTO = {
  termos: 'Termos de Uso',
  privacidade: 'Política de Privacidade',
  dados: 'Tratamento de dados',
  localizacao: 'Localização precisa'
};

async function abrirConsentimentosNex() {
  const modal = document.getElementById('modalConsentimentosNex');
  const lista = document.getElementById('listaConsentimentosNex');
  if (!modal || !lista) return;

  if (typeof window.fecharPainelControleNex === 'function') {
    window.fecharPainelControleNex();
  }

  modal.style.display = 'flex';
  lista.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:13px;">Carregando...</div>';

  try {
    if (!window.supabaseClient) throw new Error('Supabase não disponível');

    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) throw new Error('Sem usuário');

    const { data, error } = await window.supabaseClient
      .from('consentimentos')
      .select('tipo, versao, aceito_em, revogado_em')
      .eq('user_id', user.id)
      .order('aceito_em', { ascending: true });

    if (error) throw error;

    const mapa = {};
    (data || []).forEach((c) => {
      if (!mapa[c.tipo] || new Date(c.aceito_em) > new Date(mapa[c.tipo].aceito_em)) {
        mapa[c.tipo] = c;
      }
    });

    lista.innerHTML = '';

    Object.entries(TIPOS_CONSENTIMENTO).forEach(([tipo, label]) => {
      const registro = mapa[tipo];
      const aceitoEm = registro?.aceito_em
        ? new Date(registro.aceito_em).toLocaleString('pt-BR')
        : 'Não registrado';
      const revogado = !!registro?.revogado_em;

      const item = document.createElement('div');
      item.style.cssText = 'background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 12px 14px;';

      const podeRevogar = tipo === 'localizacao' && !revogado;

      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
          <strong style="color:#fff; font-size:14px; font-weight:800;">${label}</strong>
          <span style="font-size:11px; font-weight:800; padding:3px 8px; border-radius:999px; background:${revogado ? 'rgba(239,68,68,0.18)' : 'rgba(34,197,94,0.18)'}; color:${revogado ? '#fca5a5' : '#86efac'};">
            ${revogado ? 'Revogado' : 'Ativo'}
          </span>
        </div>
        <div style="color:#94a3b8; font-size:12px; margin-top:6px;">
          Aceito em: ${aceitoEm}
        </div>
        ${podeRevogar ? `
          <button type="button" data-tipo="${tipo}" class="btn-revogar-consentimento" style="margin-top:10px; width:100%; background:rgba(239,68,68,0.12); color:#fca5a5; border:1px solid rgba(239,68,68,0.3); border-radius:10px; padding:9px; font-size:13px; font-weight:800; cursor:pointer;">
            Revogar localização precisa
          </button>
        ` : ''}
      `;

      lista.appendChild(item);
    });

    lista.querySelectorAll('.btn-revogar-consentimento').forEach((btn) => {
      btn.addEventListener('click', () => {
        revogarConsentimentoNex(btn.dataset.tipo);
      });
    });

  } catch (err) {
  console.warn('Erro ao carregar consentimentos:', err);
  const mensagemErro = err.message || err.details || String(err);
  lista.innerHTML = `<div style="text-align:center; padding:20px; color:#fca5a5; font-size:13px; word-break: break-word;">
    <b>Erro do Banco:</b><br>${mensagemErro}
  </div>`;
  }
}

function fecharConsentimentosNex() {
  const modal = document.getElementById('modalConsentimentosNex');
  if (modal) modal.style.display = 'none';
}

async function revogarConsentimentoNex(tipo) {
  if (!tipo) return;

  const confirmar = window.confirm(
    'Ao revogar a localização precisa, o app deixará de mostrar pessoas e publicações próximas. Deseja continuar?'
  );
  if (!confirmar) return;

  try {
    if (!window.supabaseClient) throw new Error('Supabase não disponível');

    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) throw new Error('Sem usuário');

    const agora = new Date().toISOString();

    const { error } = await window.supabaseClient
      .from('consentimentos')
      .update({ revogado_em: agora })
      .eq('user_id', user.id)
      .eq('tipo', tipo)
      .is('revogado_em', null);

    if (error) throw error;

    if (tipo === 'localizacao') {
      await window.supabaseClient
        .from('profiles')
        .update({ lat: null, lng: null })
        .eq('id', user.id);
    }

    window.mostrarToastNex?.('Consentimento revogado.', 'sucesso');
    abrirConsentimentosNex();

  } catch (err) {
    console.warn('Erro ao revogar consentimento:', err);
    window.mostrarToastNex?.('Erro ao revogar. Tente novamente.', 'erro');
  }
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

    // Fecha "Consentimentos" ao clicar fora
    const modalConsent = document.getElementById('modalConsentimentosNex');
    if (modalConsent) {
      modalConsent.addEventListener('click', (e) => {
        if (e.target === modalConsent) fecharConsentimentosNex();
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
  window.abrirPrivacidadePublicaNex = abrirPrivacidadePublicaNex;
  window.abrirExclusaoPublicaNex = abrirExclusaoPublicaNex;
  window.abrirConsentimentosNex = abrirConsentimentosNex;
  window.fecharConsentimentosNex = fecharConsentimentosNex;
  window.revogarConsentimentoNex = revogarConsentimentoNex;

  // ============================================
  // DEBUG
  // ============================================

  console.log('ℹ️ 18-sobre.js carregado (com links públicos LGPD + consentimentos)');

})();