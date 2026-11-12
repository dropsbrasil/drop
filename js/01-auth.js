/* ============================================
   01-AUTH.JS
   Verificação de login + dados do usuário
   
   Persistência: via window.AuthAdapterNex
   (17-adapters.js).
   
   Depende de: 00-config.js, 20-supabase.js
============================================ */

(function () {
  'use strict';

// ============================================
// GUARDA DE INTEGRIDADE
// ============================================
if (!window.AuthAdapterNex) {
  console.error(
    '❌ 01-auth.js: AuthAdapterNex não encontrado. ' +
      'Verifique se 17-adapters.js está carregado antes.'
  );
  return;
}

// ============================================
// VERIFICAÇÃO DE LOGIN E SESSÃO (ASSÍNCRONO)
// ============================================
(async function verificarSessaoReal() {
  if (!window.supabaseClient) {
    console.warn('Aguardando Supabase...');
    return;
  }

  try {
    const { data: { session } } = await window.supabaseClient.auth.getSession();

    if (!session) {
      const cadastroCompleto = localStorage.getItem('drops_cadastro_completo') === 'true';
      
      if (!cadastroCompleto) {
        window.location.href = './onboarding.html';
      } else {
        window.location.href = './onboarding.html?modo=login';
      }
      return;
    }

    localStorage.setItem('drops_logado', 'true');
    localStorage.setItem('drops_cadastro_completo', 'true');

    carregarDadosUsuarioMyDrops();

  } catch (err) {
    console.error('Erro ao verificar sessão:', err);
  }
})();

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

    const nomeEl = document.getElementById('mydropsNomeUsuario');
    if (nomeEl) nomeEl.textContent = nome;

    const usernameEl = document.getElementById('mydropsUsername');
    if (usernameEl) {
      const userLimpo = String(username).replace(/^@/, '').trim();
      usernameEl.textContent = userLimpo ? '@' + userLimpo : '@usuario';
    }

    const avatarEl = document.getElementById('mydropsAvatarEl');
    if (avatarEl) {
      if (avatarSalvo) {
        avatarEl.innerHTML = `<img src="${avatarSalvo}" alt="Avatar do usuário">`;
      } else {
        const inicial = (nome || '?').trim().charAt(0).toUpperCase() || '?';
        avatarEl.textContent = inicial;
      }

      avatarEl.style.cursor = 'pointer';
      avatarEl.onclick = () => {
        abrirFotoPerfilNex(avatarSalvo, nome, 'avatar');
      };
    }

    const bioEl = document.getElementById('mydropsBioEl');
    if (bioEl) {
      bioEl.textContent = bioSalva || 'Sem bio ainda.';
      const bioFont = perfil.bioFonte;
      const bioColor = perfil.bioCor;
      const bioAlign = perfil.bioAlign;
      
      if (bioFont) bioEl.style.setProperty('font-family', bioFont, 'important');
      if (bioColor) bioEl.style.setProperty('color', bioColor, 'important');
      if (bioAlign) bioEl.style.setProperty('text-align', bioAlign, 'important');
    }

    const capa = document.querySelector('.mydrops-cover');
    const aviso = document.getElementById('avisoNovoPerfilNex');

    if (capa) {
      capa.style.cursor = 'pointer';

      if (capaSalva) {
        capa.style.backgroundImage =
          `linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.70)), url('${capaSalva}')`;
        capa.style.backgroundSize = 'cover';
        capa.style.backgroundPosition = 'center';
        
        capa.classList.remove('sem-foto');
        if (aviso) aviso.style.display = 'none';

      } else {
        capa.style.backgroundImage = 'none';
        capa.classList.add('sem-foto');
        if (aviso) aviso.style.display = 'flex';
      }

      capa.onclick = () => {
        abrirFotoPerfilNex(capaSalva, nome, 'capa');
      };
    }
  }

// ============================================
// ABRIR FOTO EM TELA CHEIA (avatar/capa)
// ============================================

function abrirFotoPerfilNex(url, nome, tipo) {
  if (!url) {
    if (typeof window.mostrarToastNex === 'function') {
      window.mostrarToastNex('Sem foto ainda', 'info');
    }
    return;
  }

  const viewer = document.getElementById('viewerPerfilNex');
  const img = document.getElementById('viewerPerfilImgNex');
  
  if (!viewer || !img) return;

  img.src = url;
  viewer.classList.add('aberto');
  document.body.style.overflow = 'hidden';

  const btnFechar = document.getElementById('viewerPerfilFecharNex');
  if (btnFechar) {
    const novoBtn = btnFechar.cloneNode(true);
    btnFechar.parentNode.replaceChild(novoBtn, btnFechar);

    novoBtn.addEventListener('click', () => {
      viewer.classList.remove('aberto');
      document.body.style.overflow = '';
    });
  }

  viewer.addEventListener('click', (e) => {
    if (e.target === viewer) {
      viewer.classList.remove('aberto');
      document.body.style.overflow = '';
    }
  });
}

window.abrirFotoPerfilNex = abrirFotoPerfilNex;
window.carregarDadosUsuarioMyDrops = carregarDadosUsuarioMyDrops;
  // ============================================
// ÍCONES SOCIAIS NO PAINEL DE CONTROLE
// ============================================

function atualizarIconesSocialPainelNex() {
  const container = document.getElementById('controleSocialIconsNex');
  if (!container) return;

  const social = window.AuthAdapterNex?.lerSocial?.() || {};

  const mapa = {
    instagram: social.instagram,
    whatsapp: social.whatsapp,
    tiktok: social.tiktok
  };

  container.querySelectorAll('img').forEach((img) => {
    const rede = img.dataset.rede;
    const temValor = String(mapa[rede] || '').trim() !== '';
    img.classList.toggle('ativo', temValor);
  });
}

window.atualizarIconesSocialPainelNex = atualizarIconesSocialPainelNex;

// ============================================
// CONTADOR DO MEU MURAL
// ============================================

async function atualizarContadorMeuMuralNex() {
  const capsula = document.getElementById('muralCapsulaMeuNex');
  if (!capsula) return;

  const numeroEl = capsula.querySelector('.mural-capsula-numero');
  if (!numeroEl) return;

  if (typeof window.buscarMuralSupabase !== 'function') return;

  const donoUsername = window.Drops?.usernameAtual || '';
  if (!donoUsername) return;

  try {
    const contribuicoes = await window.buscarMuralSupabase(donoUsername);
    const pessoas = new Set();

    (contribuicoes || []).forEach((c) => {
      const autor = String(c.autor_username || c.autor_id || '')
        .replace(/^@/, '')
        .toLowerCase()
        .trim();
      if (autor) pessoas.add(autor);
    });

    numeroEl.textContent = String(pessoas.size);
  } catch (err) {
    console.warn('Erro ao contar mural:', err);
  }
}

window.atualizarContadorMeuMuralNex = atualizarContadorMeuMuralNex;

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

  ajuda.textContent = 'Letras, números e até 2 emojis. Máx. 3 palavras.';
  ajuda.style.color = '';
  cooldown.textContent = '';
  input.value = usuario.nome || '';
  input.style.borderColor = '';

  if (!status.ok) {
    input.setAttribute('readonly', 'readonly');
    input.style.opacity = '0.55';
    btnSalvar.disabled = true;
    btnSalvar.style.opacity = '0.5';
    btnSalvar.style.cursor = 'not-allowed';
    cooldown.textContent = `⏳ Você poderá mudar o nome ${formatarCooldownNomeNex(status.restante)}.`;
  } else {
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

  const status = podeMudarNomeNex();
  if (!status.ok) {
    window.mostrarToastNex?.(`Você só pode mudar o nome ${formatarCooldownNomeNex(status.restante)}.`, 'erro');
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
    window.AuthAdapterNex.salvarAvatar('');
    window.AuthAdapterNex.salvarCapa('');
    window.AuthAdapterNex.salvarBio('');

    if (window.MyDropsAdapterNex) {
      window.MyDropsAdapterNex.salvarPublicacoes([]);
    }

    const avatarEl = document.getElementById('mydropsAvatarEl');
    if (avatarEl) {
      const usuario = window.AuthAdapterNex.lerUsuario();
      const inicial = (usuario.nome || '?').trim().charAt(0).toUpperCase() || '?';
      avatarEl.textContent = inicial;
      avatarEl.innerHTML = inicial;
    }

    const capaEl = document.querySelector('.mydrops-cover');
    if (capaEl) {
      capaEl.style.backgroundImage = '';
      capaEl.style.backgroundSize = '';
      capaEl.style.backgroundPosition = '';
    }

    const bioEl = document.getElementById('mydropsBioEl');
    if (bioEl) bioEl.textContent = 'Sem bio ainda.';

    if (typeof window.renderizarPublicacoesMyDropsNex === 'function') {
      window.renderizarPublicacoesMyDropsNex();
    }

    if (typeof window.renderizarPublicacoesNearbyNex === 'function') {
      window.renderizarPublicacoesNearbyNex();
    }

    if (typeof window.fecharPainelControleNex === 'function') {
      window.fecharPainelControleNex();
    }

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

  const status = podeMudarNomeNex();
  if (!status.ok) {
    window.mostrarToastNex?.(`Você só pode mudar o nome ${formatarCooldownNomeNex(status.restante)}.`, 'erro');
    return;
  }

  const validacao = validarNomeNex(novoNome);
  if (!validacao.ok) {
    window.mostrarToastNex?.(validacao.msg, 'erro');
    return;
  }

  try {
    window.AuthAdapterNex.salvarNome(novoNome);
    window.AuthAdapterNex.salvarUltimaMudancaNome(Date.now());

    const nomeEl = document.getElementById('mydropsNomeUsuario');
    if (nomeEl) nomeEl.textContent = novoNome;

    const nomePainel = document.getElementById('controleNomeNex');
    if (nomePainel) nomePainel.textContent = novoNome;

    const avatarEl = document.getElementById('mydropsAvatarEl');
    const perfil = window.AuthAdapterNex.lerPerfil();
    if (avatarEl && !perfil.avatar) {
      avatarEl.textContent = novoNome.charAt(0).toUpperCase() || '?';
    }

    fecharEditorNomeNex();
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

  event.target.value = '';

  try {
    const comprimido = await window.comprimirImagemNex?.(file, {
      maxWidthOrHeight: 400,
      maxSizeMB: 0.15,
      fileType: 'image/jpeg',
      useWebWorker: true
    }) || file;

    const blobUrl = URL.createObjectURL(comprimido);
    const avatar = document.querySelector('.mydrops-avatar');
    if (avatar) {
      avatar.innerHTML = `<img src="${blobUrl}" alt="Avatar do usuário">`;
    }

    window.mostrarToastNex?.('Enviando avatar...', 'info');

    const urlPublica = await window.uploadImagemSupabase?.('avatars', comprimido);

    if (!urlPublica) {
      if (avatar) {
        const perfil = window.AuthAdapterNex.lerPerfil();
        if (perfil.avatar) {
          avatar.innerHTML = `<img src="${perfil.avatar}" alt="Avatar do usuário">`;
        } else {
          const usuario = window.AuthAdapterNex.lerUsuario();
          avatar.innerHTML = '';
          avatar.textContent = (usuario.nome || '?').charAt(0).toUpperCase() || '?';
        }
      }
      URL.revokeObjectURL(blobUrl);
      window.mostrarToastNex?.('Falha ao salvar. Tente novamente.', 'erro');
      return;
    }

    window.AuthAdapterNex.salvarAvatar(urlPublica);
    URL.revokeObjectURL(blobUrl);
    window.mostrarToastNex?.('Avatar atualizado!', 'sucesso');

    if (typeof fecharPainelControleNex === 'function') {
      fecharPainelControleNex();
    }
  } catch (erro) {
    console.error('Erro ao salvar avatar:', erro);
    window.mostrarToastNex?.('Falha ao salvar o avatar.', 'erro');
  }
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

  event.target.value = '';

  try {
    const comprimido = await window.comprimirImagemNex?.(file, {
      maxWidthOrHeight: 1600,
      maxSizeMB: 0.5,
      fileType: 'image/jpeg',
      useWebWorker: true
    }) || file;

    const blobUrl = URL.createObjectURL(comprimido);
    const capa = document.querySelector('.mydrops-cover');
    if (capa) {
      capa.style.backgroundImage =
        `linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.70)), url('${blobUrl}')`;
      capa.style.backgroundSize = 'cover';
      capa.style.backgroundPosition = 'center';
      capa.classList.remove('sem-foto');

      const avisoNovo = document.getElementById('avisoNovoPerfilNex');
      if (avisoNovo) avisoNovo.style.display = 'none';
    }

    window.mostrarToastNex?.('Enviando capa...', 'info');

    const urlPublica = await window.uploadImagemSupabase?.('capas', comprimido);

    if (!urlPublica) {
      if (capa) {
        const perfil = window.AuthAdapterNex.lerPerfil();
        if (perfil.capa) {
          capa.style.backgroundImage =
            `linear-gradient(180deg, rgba(0,0,0,.10), rgba(0,0,0,.70)), url('${perfil.capa}')`;
          capa.classList.remove('sem-foto');
        } else {
          capa.style.backgroundImage = 'none';
          capa.classList.add('sem-foto');
          const avisoNovo = document.getElementById('avisoNovoPerfilNex');
          if (avisoNovo) avisoNovo.style.display = 'flex';
        }
      }
      URL.revokeObjectURL(blobUrl);
      window.mostrarToastNex?.('Falha ao salvar. Tente novamente.', 'erro');
      return;
    }

    window.AuthAdapterNex.salvarCapa(urlPublica);
    URL.revokeObjectURL(blobUrl);
    window.mostrarToastNex?.('Foto de capa atualizada!', 'sucesso');

    if (typeof fecharPainelControleNex === 'function') {
      fecharPainelControleNex();
    }
  } catch (erro) {
    console.error('Erro ao salvar capa:', erro);
    window.mostrarToastNex?.('Falha ao salvar a capa.', 'erro');
  }
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

  const bioFont = localStorage.getItem(Drops.chaveUsuario('mydropsBioFont')) || '';
  const bioColor = localStorage.getItem(Drops.chaveUsuario('mydropsBioColor')) || '';
  const bioAlign = localStorage.getItem(Drops.chaveUsuario('mydropsBioAlign')) || '';

  inputBio.style.fontFamily = bioFont;
  inputBio.style.color = bioColor;
  inputBio.style.textAlign = bioAlign;

  document.querySelectorAll('.bio-fonte-btn').forEach(b => b.classList.toggle('ativo', b.dataset.fonte === bioFont));
  document.querySelectorAll('.bio-cor-btn').forEach(b => b.classList.toggle('ativo', b.dataset.cor === bioColor));
  document.querySelectorAll('.bio-align-btn').forEach(b => b.classList.toggle('ativo', b.dataset.align === bioAlign));

  if (!bioFont) document.querySelector('.bio-fonte-btn')?.classList.add('ativo');
  if (!bioColor) document.querySelector('.bio-cor-btn')?.classList.add('ativo');
  if (!bioAlign) document.querySelector('.bio-align-btn[data-align="left"]')?.classList.add('ativo');

  bioModal.classList.add('active');
}

function initBioEventos() {
  salvarBioBtn = document.getElementById('salvarBioNex');
  cancelarBioBtn = document.getElementById('cancelarBioNex');
  bioModal = document.getElementById('bioModal');
  inputBio = document.getElementById('inputBioNex');

  const bioFonteBtns = document.querySelectorAll('.bio-fonte-btn');
  const bioCorBtns = document.querySelectorAll('.bio-cor-btn');
  const bioAlignBtns = document.querySelectorAll('.bio-align-btn');

  bioFonteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      bioFonteBtns.forEach(b => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      if (inputBio) inputBio.style.fontFamily = btn.dataset.fonte;
    });
  });

  bioCorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      bioCorBtns.forEach(b => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      if (inputBio) inputBio.style.color = btn.dataset.cor;
    });
  });

  bioAlignBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      bioAlignBtns.forEach(b => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      if (inputBio) inputBio.style.textAlign = btn.dataset.align;
    });
  });

  if (salvarBioBtn) {
    salvarBioBtn.addEventListener('click', () => {
      try {
        const texto = inputBio.value.trim();

        const bioEl = document.querySelector('.mydrops-bio');
        if (bioEl) {
          bioEl.textContent = texto || 'Sem bio ainda.';
          bioEl.style.setProperty('font-family', inputBio.style.fontFamily || '', 'important');
          bioEl.style.setProperty('color', inputBio.style.color || '', 'important');
          bioEl.style.setProperty('text-align', inputBio.style.textAlign || '', 'important');
        }

        window.AuthAdapterNex.salvarBio(texto);
        window.AuthAdapterNex.salvarBioEstilos(
          inputBio.style.fontFamily || '',
          inputBio.style.color || '',
          inputBio.style.textAlign || ''
        );

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

  if (inputInstagram) inputInstagram.addEventListener('input', verificarMudancasSocialNex);
  if (inputTiktok) inputTiktok.addEventListener('input', verificarMudancasSocialNex);
  if (inputWhatsapp) inputWhatsapp.addEventListener('input', verificarMudancasSocialNex);
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

async function confirmarSairContaNex() {
  const modal = document.getElementById('modalSairContaNex');
  if (modal) {
    modal.style.transition = 'opacity 0.2s ease';
    modal.style.opacity = '0';
  }

  if (typeof window.desativarPush === 'function') {
    await window.desativarPush();
  }

  try {
    if (window.supabaseClient) {
      await window.supabaseClient.auth.signOut();
    }
  } catch (err) {
    console.warn('Erro ao deslogar do Supabase:', err);
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

  // ============================================
  // BOTÕES DE SOM E VIBRAÇÃO (feedbackNex)
  // ============================================

  const btnToggleSom = document.getElementById('btnToggleSomNex');
if (btnToggleSom) {
  btnToggleSom.addEventListener('click', () => {
    if (!window.feedbackNex) return;
    const ligado = window.feedbackNex.somLigado();
    if (ligado) {
      window.feedbackNex.desligarSom();
      window.mostrarToastNex?.('Sons desativados', 'info');
    } else {
      window.feedbackNex.ligarSom();
      window.mostrarToastNex?.('Sons ativados', 'sucesso');
    }
    atualizarBotoesSomVibracaoNex();
  });
}

const btnToggleVibracao = document.getElementById('btnToggleVibracaoNex');
if (btnToggleVibracao) {
  btnToggleVibracao.addEventListener('click', () => {
    if (!window.feedbackNex) return;
    const ligado = window.feedbackNex.vibracaoLigada();
    if (ligado) {
      window.feedbackNex.desligarVibracao();
      window.mostrarToastNex?.('Vibração desativada', 'info');
    } else {
      window.feedbackNex.ligarVibracao();
      window.mostrarToastNex?.('Vibração ativada', 'sucesso');
      if (navigator.vibrate) { try { navigator.vibrate([60, 40, 60]); } catch (e) {} }
    }
    atualizarBotoesSomVibracaoNex();
  });
}

function atualizarBotoesSomVibracaoNex() {
  const switchSom = document.getElementById('switchSomNex');
  const switchVib = document.getElementById('switchVibracaoNex');

  if (switchSom && window.feedbackNex) {
    switchSom.classList.toggle('ativo', window.feedbackNex.somLigado());
  }

  if (switchVib && window.feedbackNex) {
    switchVib.classList.toggle('ativo', window.feedbackNex.vibracaoLigada());
  }
}

  window.atualizarBotoesSomVibracaoNex = atualizarBotoesSomVibracaoNex;

  const btnMenuGlobal = document.querySelector('.btn-menu-global');
  if (btnMenuGlobal) {
    btnMenuGlobal.addEventListener('click', () => {
      setTimeout(atualizarBotoesSomVibracaoNex, 50);
    });
  }
    const btnEditarNome = document.getElementById('btnEditarNomeNex');
  if (btnEditarNome) btnEditarNome.addEventListener('click', abrirEditorNomeNex);

  const btnSalvarNome = document.getElementById('salvarNomeNex');
  if (btnSalvarNome) btnSalvarNome.addEventListener('click', salvarNomeNex);

  const btnCancelarNome = document.getElementById('cancelarNomeNex');
  if (btnCancelarNome) btnCancelarNome.addEventListener('click', fecharEditorNomeNex);

  const inputNome = document.getElementById('inputNomeNex');
  if (inputNome) inputNome.addEventListener('input', validarInputNomeNex);

  const modalNome = document.getElementById('nomeModal');
  if (modalNome) {
    modalNome.addEventListener('click', (e) => {
      if (e.target === modalNome) fecharEditorNomeNex();
    });
  }

  const modalConfirmNome = document.getElementById('confirmNomeModalNex');
  if (modalConfirmNome) {
    modalConfirmNome.addEventListener('click', (e) => {
      if (e.target === modalConfirmNome) fecharConfirmNomeNex();
    });
  }

  const btnLimparPerfil = document.getElementById('btnLimparPerfilNex');
  if (btnLimparPerfil) btnLimparPerfil.addEventListener('click', abrirConfirmLimparPerfilNex);

  const modalLimpar = document.getElementById('confirmLimparPerfilModalNex');
  if (modalLimpar) {
    modalLimpar.addEventListener('click', (e) => {
      if (e.target === modalLimpar) fecharConfirmLimparPerfilNex();
    });
  }

  const btnEditarAvatar = document.getElementById('btnEditarAvatarNex');
  if (btnEditarAvatar) btnEditarAvatar.addEventListener('click', abrirEditorAvatarNex);

  const btnEditarCapa = document.getElementById('btnEditarCapaNex');
  if (btnEditarCapa) btnEditarCapa.addEventListener('click', abrirEditorCapaNex);

  const btnEditarBio = document.getElementById('btnEditarBioNex');
  if (btnEditarBio) btnEditarBio.addEventListener('click', editarBioNex);

  const btnEditarSocial = document.getElementById('btnEditarSocialNex');
  if (btnEditarSocial) btnEditarSocial.addEventListener('click', abrirEditorSocialNex);

  const inputCapa = document.getElementById('inputCapaNex');
  if (inputCapa) inputCapa.addEventListener('change', aplicarCapaNex);

  const inputAvatar = document.getElementById('inputAvatarNex');
  if (inputAvatar) inputAvatar.addEventListener('change', aplicarAvatarNex);

  const btnCancelarSair = document.getElementById('btnCancelarSairNex');
  if (btnCancelarSair) btnCancelarSair.addEventListener('click', fecharModalSairContaNex);

  const btnConfirmarSair = document.getElementById('btnConfirmarSairNex');
  if (btnConfirmarSair) btnConfirmarSair.addEventListener('click', confirmarSairContaNex);

  const modalSair = document.getElementById('modalSairContaNex');
  if (modalSair) {
    modalSair.addEventListener('click', (e) => {
      if (e.target === modalSair) fecharModalSairContaNex();
    });
  }

  // ============================================
  // INJEÇÃO DO BOTÃO "EXCLUIR CONTA" (NOVO)
  // ============================================
  setTimeout(() => {
    const blocos = document.querySelectorAll('#painelControleNex .controle-bloco-nex');
    
    blocos.forEach(bloco => {
      const h4 = bloco.querySelector('h4');
      if (h4 && h4.textContent.includes('Sistema')) {
        
        if (document.getElementById('btnExcluirContaNex')) return;

        const btnExcluir = document.createElement('button');
        btnExcluir.id = 'btnExcluirContaNex';
        btnExcluir.type = 'button';
        btnExcluir.style.color = '#fca5a5';
        btnExcluir.textContent = '🗑️ Excluir minha conta';
        
        btnExcluir.addEventListener('click', () => {
  if (typeof fecharPainelControleNex === 'function') {
    fecharPainelControleNex();
  }
  abrirModalExcluirContaNex();
});

        bloco.appendChild(btnExcluir);
      }
    });
  }, 1000);
});
  // ============================================
// MODAL DE EXCLUSÃO DE CONTA
// ============================================

function abrirModalExcluirContaNex() {
  const modal = document.getElementById('modalExcluirContaNex');
  const input = document.getElementById('inputConfirmarExclusaoNex');
  const btn = document.getElementById('btnConfirmarExclusaoFinalNex');
  
  if (!modal || !input || !btn) return;

  // Reseta o estado
  input.value = '';
  btn.style.background = 'rgba(239, 68, 68, 0.5)';
  btn.style.pointerEvents = 'none';
  btn.textContent = 'Excluir';

  // Abre o modal
  modal.style.display = 'flex';
  
  setTimeout(() => input.focus(), 100);

  // Lógica para habilitar o botão apenas quando digitar EXCLUIR
  input.oninput = (e) => {
    const texto = e.target.value.trim().toUpperCase();
    if (texto === 'EXCLUIR') {
      btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      btn.style.pointerEvents = 'auto';
      btn.style.boxShadow = '0 10px 24px rgba(239, 68, 68, 0.32)';
      input.style.borderColor = 'rgba(239, 68, 68, 0.6)';
    } else {
      btn.style.background = 'rgba(239, 68, 68, 0.5)';
      btn.style.pointerEvents = 'none';
      btn.style.boxShadow = 'none';
      input.style.borderColor = 'rgba(255,255,255,0.1)';
    }
  };

  // Ação do botão
  btn.onclick = async () => {
    if (input.value.trim().toUpperCase() !== 'EXCLUIR') return;

    btn.disabled = true;
    btn.textContent = 'Excluindo...';
    window.mostrarToastNex?.('Excluindo conta...', 'info');

    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      
      await fetch(`${window.Drops.SUPABASE_URL}/functions/v1/excluir-conta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (window.supabaseClient) {
        await window.supabaseClient.auth.signOut();
      }
      
      localStorage.clear();
      window.location.href = './onboarding.html';

    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      window.mostrarToastNex?.('Erro ao excluir. Tente novamente.', 'erro');
      btn.disabled = false;
      btn.textContent = 'Excluir';
    }
  };
}

function fecharModalExcluirContaNex() {
  const modal = document.getElementById('modalExcluirContaNex');
  if (modal) modal.style.display = 'none';
}

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
window.abrirModalExcluirContaNex = abrirModalExcluirContaNex;
window.fecharModalExcluirContaNex = fecharModalExcluirContaNex;

// ============================================
// DEBUG
// ============================================

console.log('🔐 01-auth.js carregado (via adapter + sessão real + botão excluir)');

})();
