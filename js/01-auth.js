/* ============================================
   01-AUTH.JS
   Verificação de login + dados do usuário
   
   Persistência: via window.AuthAdapterNex
   (17-adapters.js).
   
   Depende de: 00-config.js
============================================ */

(function () {
  'use strict';

// ============================================
// GUARDA DE INTEGRIDADE
// ============================================
// Se o 17-adapters.js não carregou, evita tela branca
// silenciosa: loga o erro e para a execução deste módulo.

if (!window.AuthAdapterNex) {
  console.error(
    '❌ 01-auth.js: AuthAdapterNex não encontrado. ' +
      'Verifique se 17-adapters.js está carregado antes.'
  );
  return;
}

// ============================================
// VERIFICAÇÃO DE LOGIN
// ============================================

const sessao = window.AuthAdapterNex.lerSessao();

  // Nunca fez onboarding
  if (!sessao.cadastroCompleto) {
    window.location.href = './onboarding.html';
    return;
  }

  // Fez onboarding mas não está logado
  if (!sessao.logado) {
    window.location.href = './onboarding.html?modo=login';
    return;
  }

  // ============================================
  // CARREGAR DADOS DO USUÁRIO NO MY DROPS
  // ============================================

  function carregarDadosUsuarioMyDrops() {
    const usuario = window.AuthAdapterNex.lerUsuario();
    const perfil = window.AuthAdapterNex.lerPerfil();

    const nome = usuario.nome || 'Usuário';
    const username = usuario.username || '';
    const avatarSalvo = perfil.avatar;
    const bioSalva = perfil.bio;
    const capaSalva = perfil.capa;

    // Nome
    const nomeEl = document.getElementById('mydropsNomeUsuario');
    if (nomeEl) nomeEl.textContent = nome;

    // @username
    const usernameEl = document.getElementById('mydropsUsername');
    if (usernameEl) {
      const userLimpo = String(username).replace(/^@/, '').trim();
      usernameEl.textContent = userLimpo ? '@' + userLimpo : '@usuario';
    }

    // Avatar: imagem salva OU inicial do nome
    const avatarEl = document.getElementById('mydropsAvatarEl');
    if (avatarEl) {
      if (avatarSalvo) {
        avatarEl.innerHTML = `<img src="${avatarSalvo}" alt="Avatar do usuário">`;
      } else {
        const inicial = (nome || '?').trim().charAt(0).toUpperCase() || '?';
        avatarEl.textContent = inicial;
      }
    }

    // Bio
    const bioEl = document.getElementById('mydropsBioEl');
    if (bioEl) {
      bioEl.textContent = bioSalva || 'Sem bio ainda.';
    }

    // Capa salva
    if (capaSalva) {
      const capa = document.querySelector('.mydrops-cover');
      if (capa) {
        capa.style.backgroundImage =
          `linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.70)), url('${capaSalva}')`;
        capa.style.backgroundSize = 'cover';
        capa.style.backgroundPosition = 'center';
      }
    }
  }

  // Expõe globalmente
  window.carregarDadosUsuarioMyDrops = carregarDadosUsuarioMyDrops;

  // Chama IMEDIATAMENTE (não espera DOMContentLoaded)
  carregarDadosUsuarioMyDrops();

// ============================================
// EDITOR DE NOME
// ============================================

const COOLDOWN_NOME_DIAS = 30;
const COOLDOWN_NOME_MS = COOLDOWN_NOME_DIAS * 24 * 60 * 60 * 1000;

function contarEmojisNomeNex(texto) {
  if (!texto) return 0;
  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const seg = new Intl.Segmenter('pt-BR', { granularity: 'grapheme' });
      let total = 0;
      for (const { segment } of seg.segment(texto)) {
        if (/\p{Extended_Pictographic}/u.test(segment)) total++;
      }
      return total;
    }
  } catch (e) {}
  const m = texto.match(/\p{Extended_Pictographic}/gu);
  return m ? m.length : 0;
}

function validarNomeNex(valor) {
  const nome = String(valor || '').trim();

  if (!nome) return { ok: false, msg: 'Digite seu nome.' };
  if (nome.length < 2) return { ok: false, msg: 'Nome muito curto.' };
  if (nome.length > 40) return { ok: false, msg: 'Máximo 40 caracteres.' };

  const emojis = contarEmojisNomeNex(nome);
  if (emojis > 2) return { ok: false, msg: 'Máximo 2 emojis.' };

  const semEmoji = nome.replace(/\p{Extended_Pictographic}/gu, '').trim();

  if (!/^[\p{L}\p{N}\s]+$/u.test(semEmoji)) {
    return { ok: false, msg: 'Use letras, números e espaço.' };
  }

  if (/\s{2,}/.test(semEmoji)) {
    return { ok: false, msg: 'Evite espaços duplos.' };
  }

  const palavras = semEmoji.split(/\s+/).filter(Boolean);
  if (palavras.length > 3) {
    return { ok: false, msg: 'Máximo 3 palavras.' };
  }

  return { ok: true, msg: '' };
}

function formatarCooldownNomeNex(ms) {
  const dias = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (dias <= 1) return 'amanhã';
  return `em ${dias} dias`;
}

function podeMudarNomeNex() {
  const ultimo = window.AuthAdapterNex.lerUltimaMudancaNome();
  if (!ultimo) return { ok: true, restante: 0 };

  const diff = Date.now() - ultimo;
  if (diff >= COOLDOWN_NOME_MS) return { ok: true, restante: 0 };

  return { ok: false, restante: COOLDOWN_NOME_MS - diff };
}

function abrirEditorNomeNex() {
  const modal = document.getElementById('nomeModal');
  const input = document.getElementById('inputNomeNex');
  const ajuda = document.getElementById('nomeAjudaNex');
  const cooldown = document.getElementById('nomeCooldownNex');
  const btnSalvar = document.getElementById('salvarNomeNex');

  if (!modal || !input || !ajuda || !cooldown || !btnSalvar) return;

  const usuario = window.AuthAdapterNex.lerUsuario();
  const status = podeMudarNomeNex();

  // Reset visual
  ajuda.textContent = 'Letras, números e até 2 emojis. Máx. 3 palavras.';
  ajuda.style.color = '';
  cooldown.textContent = '';
  input.value = usuario.nome || '';
  input.style.borderColor = '';

  if (!status.ok) {
    // Bloqueado
    input.setAttribute('readonly', 'readonly');
    input.style.opacity = '0.55';
    btnSalvar.disabled = true;
    btnSalvar.style.opacity = '0.5';
    btnSalvar.style.cursor = 'not-allowed';

    cooldown.textContent =
      `⏳ Você poderá mudar o nome ${formatarCooldownNomeNex(status.restante)}.`;
  } else {
    // Liberado
    input.removeAttribute('readonly');
    input.style.opacity = '1';
    btnSalvar.disabled = false;
    btnSalvar.style.opacity = '1';
    btnSalvar.style.cursor = 'pointer';
  }

  modal.classList.add('active');

  setTimeout(() => {
    if (status.ok) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, 80);
}

function fecharEditorNomeNex() {
  const modal = document.getElementById('nomeModal');
  if (modal) modal.classList.remove('active');
}

function validarInputNomeNex() {
  const input = document.getElementById('inputNomeNex');
  const ajuda = document.getElementById('nomeAjudaNex');
  if (!input || !ajuda) return;

  const texto = input.value;
  if (!texto.trim()) {
    ajuda.textContent = 'Digite seu nome.';
    ajuda.style.color = '#ef4444';
    input.style.borderColor = 'rgba(239,68,68,.5)';
    return;
  }

  const resultado = validarNomeNex(texto);

  if (!resultado.ok) {
    ajuda.textContent = resultado.msg;
    ajuda.style.color = '#ef4444';
    input.style.borderColor = 'rgba(239,68,68,.5)';
  } else {
    ajuda.textContent = 'Nome válido.';
    ajuda.style.color = '#22c55e';
    input.style.borderColor = 'rgba(34,197,94,.5)';
  }
}

function salvarNomeNex() {
  const input = document.getElementById('inputNomeNex');
  if (!input) return;

  // Bloqueio de cooldown (defensivo)
  const status = podeMudarNomeNex();
  if (!status.ok) {
    window.mostrarToastNex?.(
      `Você só pode mudar o nome ${formatarCooldownNomeNex(status.restante)}.`,
      'erro'
    );
    return;
  }

  const novoNome = input.value.trim();
  const validacao = validarNomeNex(novoNome);

  if (!validacao.ok) {
    window.mostrarToastNex?.(validacao.msg, 'erro');
    return;
  }

  const usuario = window.AuthAdapterNex.lerUsuario();
  if (novoNome === (usuario.nome || '').trim()) {
    window.mostrarToastNex?.('O nome é o mesmo de antes.', 'info');
    return;
  }

  // Abre modal de confirmação antes de salvar
  abrirConfirmNomeNex();
}

// ============================================
// LIMPAR PERFIL
// ============================================

function abrirConfirmLimparPerfilNex() {
  const modal = document.getElementById('confirmLimparPerfilModalNex');
  if (modal) modal.style.display = 'flex';
}

function fecharConfirmLimparPerfilNex() {
  const modal = document.getElementById('confirmLimparPerfilModalNex');
  if (modal) modal.style.display = 'none';
}

function confirmarLimparPerfilNex() {
  fecharConfirmLimparPerfilNex();

  try {
    // ============================================
    // 1. APAGA CAPA, AVATAR E BIO (via adapter)
    // ============================================

    window.AuthAdapterNex.salvarAvatar('');
    window.AuthAdapterNex.salvarCapa('');
    window.AuthAdapterNex.salvarBio('');

    // ============================================
    // 2. APAGA PUBLICAÇÕES (via adapter)
    // ============================================

    if (window.MyDropsAdapterNex) {
      window.MyDropsAdapterNex.salvarPublicacoes([]);
    }

    // ============================================
    // 3. ATUALIZA UI DO MYDROPS
    // ============================================

    // Avatar → volta pra inicial do nome
    const avatarEl = document.getElementById('mydropsAvatarEl');
    if (avatarEl) {
      const usuario = window.AuthAdapterNex.lerUsuario();
      const inicial = (usuario.nome || '?').trim().charAt(0).toUpperCase() || '?';
      avatarEl.textContent = inicial;
      avatarEl.innerHTML = inicial;
    }

    // Capa → volta pra padrão
    const capaEl = document.querySelector('.mydrops-cover');
    if (capaEl) {
      capaEl.style.backgroundImage = '';
      capaEl.style.backgroundSize = '';
      capaEl.style.backgroundPosition = '';
    }

    // Bio → volta pro texto padrão
    const bioEl = document.getElementById('mydropsBioEl');
    if (bioEl) bioEl.textContent = 'Sem bio ainda.';

    // Publicações → limpa o grid
    if (typeof window.renderizarPublicacoesMyDropsNex === 'function') {
      window.renderizarPublicacoesMyDropsNex();
    }

    if (typeof window.renderizarPublicacoesNearbyNex === 'function') {
      window.renderizarPublicacoesNearbyNex();
    }

    // ============================================
    // 4. FECHA O PAINEL DE CONTROLE
    // ============================================

    if (typeof window.fecharPainelControleNex === 'function') {
      window.fecharPainelControleNex();
    }

    // ============================================
    // 5. FEEDBACK
    // ============================================

    window.mostrarToastNex?.('Perfil limpo com sucesso!', 'sucesso');
  } catch (erro) {
    console.error('Erro ao limpar perfil:', erro);
    window.mostrarToastNex?.('Falha ao limpar o perfil.', 'erro');
  }
}

// ============================================
// MODAL DE CONFIRMAÇÃO — MUDANÇA DE NOME
// ============================================

let nomePendenteNex = '';

function abrirConfirmNomeNex() {
  const input = document.getElementById('inputNomeNex');
  if (!input) return;

  nomePendenteNex = input.value.trim();

  const modal = document.getElementById('confirmNomeModalNex');
  if (modal) modal.style.display = 'flex';
}

function fecharConfirmNomeNex() {
  const modal = document.getElementById('confirmNomeModalNex');
  if (modal) modal.style.display = 'none';

  nomePendenteNex = '';
}

function confirmarSalvarNomeNex() {
  const novoNome = nomePendenteNex;

  fecharConfirmNomeNex();

  if (!novoNome) return;

  // Revalida (defensivo — caso o input tenha mudado)
  const status = podeMudarNomeNex();
  if (!status.ok) {
    window.mostrarToastNex?.(
      `Você só pode mudar o nome ${formatarCooldownNomeNex(status.restante)}.`,
      'erro'
    );
    return;
  }

  const validacao = validarNomeNex(novoNome);
  if (!validacao.ok) {
    window.mostrarToastNex?.(validacao.msg, 'erro');
    return;
  }

  try {
    // 1. Salva o nome
    window.AuthAdapterNex.salvarNome(novoNome);

    // 2. Marca o timestamp da mudança
    window.AuthAdapterNex.salvarUltimaMudancaNome(Date.now());

    // 3. Atualiza UI do MyDrops
    const nomeEl = document.getElementById('mydropsNomeUsuario');
    if (nomeEl) nomeEl.textContent = novoNome;

    // 4. Atualiza o painel de controle
    const nomePainel = document.getElementById('controleNomeNex');
    if (nomePainel) nomePainel.textContent = novoNome;

    // 5. Atualiza avatar fallback (se não tiver imagem, mostra inicial nova)
    const avatarEl = document.getElementById('mydropsAvatarEl');
    const perfil = window.AuthAdapterNex.lerPerfil();
    if (avatarEl && !perfil.avatar) {
      avatarEl.textContent = novoNome.charAt(0).toUpperCase() || '?';
    }

    // 6. Fecha o modal de edição (também fecha tudo o resto)
    fecharEditorNomeNex();

    // 7. Feedback
    window.mostrarToastNex?.('Nome atualizado com sucesso!', 'sucesso');
  } catch (erro) {
    console.error('Erro ao salvar nome:', erro);
    window.mostrarToastNex?.('Falha ao salvar o nome.', 'erro');
  }
}
  
  // ============================================
// EDITOR DE AVATAR
// ============================================

function abrirEditorAvatarNex() {
  const input = document.getElementById('inputAvatarNex');
  if (input) input.click();
}

async function aplicarAvatarNex(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    window.mostrarToastNex?.('Escolha um arquivo de imagem.', 'erro');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();

  reader.onload = async function (e) {
    try {
      const avatar = document.querySelector('.mydrops-avatar');
      if (!avatar) throw new Error('Elemento do avatar não encontrado.');

      // Mostra a imagem localmente de imediato (feedback visual)
      avatar.innerHTML = `<img src="${e.target.result}" alt="Avatar do usuário">`;

      window.mostrarToastNex?.('Enviando avatar...', 'info');

      // Faz upload pro Supabase Storage
      const urlPublica = await window.uploadImagemSupabase?.('avatars', e.target.result);

      if (urlPublica) {
        // Sucesso — salva a URL no localStorage
        window.AuthAdapterNex.salvarAvatar(urlPublica);
        window.mostrarToastNex?.('Avatar atualizado!', 'sucesso');
      } else {
        // Fallback — salva base64 (localStorage só)
        window.AuthAdapterNex.salvarAvatar(e.target.result);
        window.mostrarToastNex?.('Avatar salvo localmente.', 'info');
      }

      if (typeof fecharPainelControleNex === 'function') {
        fecharPainelControleNex();
      }
    } catch (erro) {
      console.error('Erro ao salvar avatar:', erro);
      window.mostrarToastNex?.('Falha ao salvar o avatar.', 'erro');
    }
  };

  reader.onerror = function () {
    console.error('Erro de leitura do arquivo do avatar.');
    window.mostrarToastNex?.('Falha ao ler a imagem.', 'erro');
  };

  reader.readAsDataURL(file);
  event.target.value = '';
}

// ============================================
// EDITOR DE CAPA
// ============================================

function abrirEditorCapaNex() {
  const input = document.getElementById('inputCapaNex');
  if (input) input.click();
}

async function aplicarCapaNex(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    window.mostrarToastNex?.('Escolha um arquivo de imagem.', 'erro');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();

  reader.onload = async function (e) {
    try {
      const capa = document.querySelector('.mydrops-cover');
      if (!capa) throw new Error('Elemento da capa não encontrado.');

      // Mostra a imagem localmente de imediato
      capa.style.backgroundImage =
        `linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.70)), url('${e.target.result}')`;
      capa.style.backgroundSize = 'cover';
      capa.style.backgroundPosition = 'center';

      window.mostrarToastNex?.('Enviando capa...', 'info');

      // Faz upload pro Supabase Storage
      const urlPublica = await window.uploadImagemSupabase?.('capas', e.target.result);

      if (urlPublica) {
        window.AuthAdapterNex.salvarCapa(urlPublica);
        window.mostrarToastNex?.('Foto de capa atualizada!', 'sucesso');
      } else {
        window.AuthAdapterNex.salvarCapa(e.target.result);
        window.mostrarToastNex?.('Capa salva localmente.', 'info');
      }

      if (typeof fecharPainelControleNex === 'function') {
        fecharPainelControleNex();
      }
    } catch (erro) {
      console.error('Erro ao salvar capa:', erro);
      window.mostrarToastNex?.('Falha ao salvar a capa.', 'erro');
    }
  };

  reader.onerror = function () {
    console.error('Erro de leitura do arquivo da capa.');
    window.mostrarToastNex?.('Falha ao ler a imagem.', 'erro');
  };

  reader.readAsDataURL(file);
  event.target.value = '';
}
  // ============================================
// EDITOR DE BIO
// ============================================

let salvarBioBtn = null;
let cancelarBioBtn = null;
let bioModal = null;
let inputBio = null;

function editarBioNex() {
  bioModal = document.getElementById('bioModal');
  inputBio = document.getElementById('inputBioNex');

  if (!bioModal || !inputBio) return;

  inputBio.value = window.AuthAdapterNex.lerPerfil().bio || '';

  bioModal.classList.add('active');
}

function initBioEventos() {
  salvarBioBtn = document.getElementById('salvarBioNex');
  cancelarBioBtn = document.getElementById('cancelarBioNex');
  bioModal = document.getElementById('bioModal');
  inputBio = document.getElementById('inputBioNex');

  // Botões de alinhamento
  document.querySelectorAll('.bio-align-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const align = btn.dataset.align;
      if (inputBio) inputBio.style.textAlign = align;
    });
  });

  if (salvarBioBtn) {
    salvarBioBtn.addEventListener('click', () => {
      try {
        const texto = inputBio.value.trim();

        const bioEl = document.querySelector('.mydrops-bio');
        if (bioEl) bioEl.textContent = texto || 'Sem bio ainda.';

        window.AuthAdapterNex.salvarBio(texto);

        if (bioModal) bioModal.classList.remove('active');

        window.mostrarToastNex?.('Bio atualizada com sucesso!', 'sucesso');
      } catch (erro) {
        console.error('Erro ao salvar bio:', erro);
        window.mostrarToastNex?.('Falha ao salvar a bio.', 'erro');
      }
    });
  }

  if (cancelarBioBtn) {
    cancelarBioBtn.addEventListener('click', () => {
      if (bioModal) bioModal.classList.remove('active');
    });
  }
}
// ============================================
// EDITOR DE SOCIAL
// ============================================

let salvarSocialBtn = null;
let cancelarSocialBtn = null;
let socialModal = null;
let inputInstagram = null;
let inputTiktok = null;
let inputWhatsapp = null;

let socialOriginalNex = {
  instagram: '',
  tiktok: '',
  whatsapp: ''
};

function montarLinkSocialNex(tipo, valor) {
  const texto = String(valor || '').trim();
  if (!texto) return '';

  if (/^https?:\/\//i.test(texto)) return texto;

  if (tipo === 'instagram') {
    const usuario = texto.replace(/^@/, '').trim();
    return usuario ? `https://www.instagram.com/${usuario}` : '';
  }

  if (tipo === 'tiktok') {
    const usuario = texto.replace(/^@/, '').trim();
    return usuario ? `https://www.tiktok.com/@${usuario}` : '';
  }

  if (tipo === 'whatsapp') {
    const numero = texto.replace(/\D/g, '');
    if (!numero) return '';
    const numeroFinal = numero.startsWith('55') ? numero : `55${numero}`;
    return `https://wa.me/${numeroFinal}`;
  }

  return texto;
}

function atualizarSocialLinksNex() {
  const social = window.AuthAdapterNex.lerSocial();

  const socialBtns = document.querySelectorAll('.mydrops-social-btn');

  const configs = [
    { btn: socialBtns[0], tipo: 'instagram', valor: social.instagram },
    { btn: socialBtns[1], tipo: 'tiktok', valor: social.tiktok },
    { btn: socialBtns[2], tipo: 'whatsapp', valor: social.whatsapp }
  ];

  configs.forEach(({ btn, tipo, valor }) => {
    if (!btn) return;

    const temValor = String(valor || '').trim() !== '';
    btn.classList.toggle('inactive', !temValor);

    btn.onclick = () => {
      const link = montarLinkSocialNex(tipo, valor);
      if (!link) return;
      window.open(link, '_blank');
    };
  });
}

function abrirEditorSocialNex() {
  socialModal = document.getElementById('socialModalNex');
  inputInstagram = document.getElementById('inputInstagramNex');
  inputTiktok = document.getElementById('inputTiktokNex');
  inputWhatsapp = document.getElementById('inputWhatsappNex');

  if (!socialModal || !inputInstagram || !inputTiktok || !inputWhatsapp) return;

  socialOriginalNex = window.AuthAdapterNex.lerSocial();

  inputInstagram.value = socialOriginalNex.instagram;
  inputTiktok.value = socialOriginalNex.tiktok;
  inputWhatsapp.value = socialOriginalNex.whatsapp;

  if (salvarSocialBtn) {
    salvarSocialBtn.style.display = 'none';
  }

  socialModal.classList.add('active');
}

function verificarMudancasSocialNex() {
  if (!salvarSocialBtn) return;

  const mudou =
    inputInstagram.value.trim() !== socialOriginalNex.instagram ||
    inputTiktok.value.trim() !== socialOriginalNex.tiktok ||
    inputWhatsapp.value.trim() !== socialOriginalNex.whatsapp;

  salvarSocialBtn.style.display = mudou ? 'inline-flex' : 'none';
}

function initSocialEventos() {
  salvarSocialBtn = document.getElementById('salvarSocialNex');
  cancelarSocialBtn = document.getElementById('cancelarSocialNex');
  socialModal = document.getElementById('socialModalNex');
  inputInstagram = document.getElementById('inputInstagramNex');
  inputTiktok = document.getElementById('inputTiktokNex');
  inputWhatsapp = document.getElementById('inputWhatsappNex');

  if (salvarSocialBtn) {
    salvarSocialBtn.addEventListener('click', () => {
      try {
        window.AuthAdapterNex.salvarSocial({
          instagram: inputInstagram.value,
          tiktok: inputTiktok.value,
          whatsapp: inputWhatsapp.value
        });

        atualizarSocialLinksNex();
        if (socialModal) socialModal.classList.remove('active');

        window.mostrarToastNex?.('Redes sociais atualizadas!', 'sucesso');
      } catch (erro) {
        console.error('Erro ao salvar redes sociais:', erro);
        window.mostrarToastNex?.('Falha ao salvar redes sociais.', 'erro');
      }
    });
  }

  if (cancelarSocialBtn) {
    cancelarSocialBtn.addEventListener('click', () => {
      if (inputInstagram) inputInstagram.value = socialOriginalNex.instagram;
      if (inputTiktok) inputTiktok.value = socialOriginalNex.tiktok;
      if (inputWhatsapp) inputWhatsapp.value = socialOriginalNex.whatsapp;
      if (socialModal) socialModal.classList.remove('active');
    });
  }

  if (inputInstagram) {
    inputInstagram.addEventListener('input', verificarMudancasSocialNex);
  }
  if (inputTiktok) {
    inputTiktok.addEventListener('input', verificarMudancasSocialNex);
  }
  if (inputWhatsapp) {
    inputWhatsapp.addEventListener('input', verificarMudancasSocialNex);
  }
}
    // ============================================
  // SAIR DA CONTA
  // ============================================

  function abrirModalSairContaNex() {
    const modal = document.getElementById('modalSairContaNex');
    if (!modal) return;

    modal.style.display = 'flex';

    const painel = document.getElementById('painelControleNex');
    if (painel) painel.style.display = 'none';
  }

  function fecharModalSairContaNex() {
    const modal = document.getElementById('modalSairContaNex');
    if (modal) modal.style.display = 'none';
  }

  function confirmarSairContaNex() {
    const modal = document.getElementById('modalSairContaNex');
    if (modal) {
      modal.style.transition = 'opacity 0.2s ease';
      modal.style.opacity = '0';
    }

    window.AuthAdapterNex.encerrarSessao();

    console.log('👋 Usuário deslogado');

    setTimeout(() => {
      window.location.href = './onboarding.html?modo=login';
    }, 220);
  }

  function sairDaContaNex() {
    abrirModalSairContaNex();
  }

  // ============================================
  // INICIALIZAÇÃO DOS EVENTOS (DOMContentLoaded)
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    initBioEventos();
    initSocialEventos();
    atualizarSocialLinksNex();
    // Botão Editar Nome
const btnEditarNome = document.getElementById('btnEditarNomeNex');
if (btnEditarNome) {
  btnEditarNome.addEventListener('click', abrirEditorNomeNex);
}

const btnSalvarNome = document.getElementById('salvarNomeNex');
if (btnSalvarNome) {
  btnSalvarNome.addEventListener('click', salvarNomeNex);
}

const btnCancelarNome = document.getElementById('cancelarNomeNex');
if (btnCancelarNome) {
  btnCancelarNome.addEventListener('click', fecharEditorNomeNex);
}

const inputNome = document.getElementById('inputNomeNex');
if (inputNome) {
  inputNome.addEventListener('input', validarInputNomeNex);
}

// Fecha modal ao clicar fora
const modalNome = document.getElementById('nomeModal');
if (modalNome) {
  modalNome.addEventListener('click', (e) => {
    if (e.target === modalNome) fecharEditorNomeNex();
  });
}
    // Fecha modal de confirmação ao clicar fora
const modalConfirmNome = document.getElementById('confirmNomeModalNex');
if (modalConfirmNome) {
  modalConfirmNome.addEventListener('click', (e) => {
    if (e.target === modalConfirmNome) fecharConfirmNomeNex();
  });
}
    // Botão Limpar Perfil
const btnLimparPerfil = document.getElementById('btnLimparPerfilNex');
if (btnLimparPerfil) {
  btnLimparPerfil.addEventListener('click', abrirConfirmLimparPerfilNex);
}

// Fecha modal de limpar perfil ao clicar fora
const modalLimpar = document.getElementById('confirmLimparPerfilModalNex');
if (modalLimpar) {
  modalLimpar.addEventListener('click', (e) => {
    if (e.target === modalLimpar) fecharConfirmLimparPerfilNex();
  });
}

// Botões de perfil no painel de controle
const btnEditarAvatar = document.getElementById('btnEditarAvatarNex');
    if (btnEditarAvatar) {
      btnEditarAvatar.addEventListener('click', abrirEditorAvatarNex);
    }

    const btnEditarCapa = document.getElementById('btnEditarCapaNex');
    if (btnEditarCapa) {
      btnEditarCapa.addEventListener('click', abrirEditorCapaNex);
    }

    const btnEditarBio = document.getElementById('btnEditarBioNex');
    if (btnEditarBio) {
      btnEditarBio.addEventListener('click', editarBioNex);
    }

    const btnEditarSocial = document.getElementById('btnEditarSocialNex');
    if (btnEditarSocial) {
      btnEditarSocial.addEventListener('click', abrirEditorSocialNex);
    }

    // Inputs de arquivo
    const inputCapa = document.getElementById('inputCapaNex');
    if (inputCapa) {
      inputCapa.addEventListener('change', aplicarCapaNex);
    }

    const inputAvatar = document.getElementById('inputAvatarNex');
    if (inputAvatar) {
      inputAvatar.addEventListener('change', aplicarAvatarNex);
    }

    // Modal sair
    const btnCancelarSair = document.getElementById('btnCancelarSairNex');
    if (btnCancelarSair) {
      btnCancelarSair.addEventListener('click', fecharModalSairContaNex);
    }

    const btnConfirmarSair = document.getElementById('btnConfirmarSairNex');
    if (btnConfirmarSair) {
      btnConfirmarSair.addEventListener('click', confirmarSairContaNex);
    }

    const modalSair = document.getElementById('modalSairContaNex');
    if (modalSair) {
      modalSair.addEventListener('click', (e) => {
        if (e.target === modalSair) fecharModalSairContaNex();
      });
    }
  });

  // ============================================
  // EXPÕE FUNÇÕES GLOBALMENTE
  // ============================================
  

  window.abrirEditorNomeNex = abrirEditorNomeNex;
window.fecharEditorNomeNex = fecharEditorNomeNex;
window.salvarNomeNex = salvarNomeNex;
window.abrirConfirmNomeNex = abrirConfirmNomeNex;
window.fecharConfirmNomeNex = fecharConfirmNomeNex;
window.confirmarSalvarNomeNex = confirmarSalvarNomeNex;
  window.abrirConfirmLimparPerfilNex = abrirConfirmLimparPerfilNex;
window.fecharConfirmLimparPerfilNex = fecharConfirmLimparPerfilNex;
window.confirmarLimparPerfilNex = confirmarLimparPerfilNex;
window.abrirEditorAvatarNex = abrirEditorAvatarNex;
  window.abrirEditorCapaNex = abrirEditorCapaNex;
  window.abrirEditorSocialNex = abrirEditorSocialNex;
  window.editarBioNex = editarBioNex;
  window.aplicarAvatarNex = aplicarAvatarNex;
  window.aplicarCapaNex = aplicarCapaNex;
  window.atualizarSocialLinksNex = atualizarSocialLinksNex;
  window.montarLinkSocialNex = montarLinkSocialNex;

  window.abrirModalSairContaNex = abrirModalSairContaNex;
  window.fecharModalSairContaNex = fecharModalSairContaNex;
  window.confirmarSairContaNex = confirmarSairContaNex;
  window.sairDaContaNex = sairDaContaNex;

  // ============================================
  // DEBUG
  // ============================================

  console.log('🔐 01-auth.js carregado (via adapter)');

})();
