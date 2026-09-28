(() => {
  'use strict';

  const CHAVE_CADASTRO = 'drops_cadastro_completo';

  const TELAS = {
  splash:      'onb-tela-splash',
  carrossel:   'onb-tela-carrossel',
  cadastro:    'onb-tela-cadastro',
  verificacao: 'onb-tela-verificacao',
  username:    'onb-tela-username',
  lgpd:        'onb-tela-lgpd',
  escolha:     'onb-tela-escolha',
  email:       'onb-tela-email'
};

  let telaAtual = 'splash';
  const historicoTelas = [];

  /* ============================================
     NAVEGAÇÃO
  ============================================ */
  function onbIrPara(nomeTela, adicionarHistorico = true) {
    const idTela = TELAS[nomeTela];
    if (!idTela) {
      console.warn('Tela desconhecida:', nomeTela);
      return;
    }

    document.querySelectorAll('.onb-tela').forEach((el) => {
      el.classList.remove('onb-ativa');
    });

    const tela = document.getElementById(idTela);
    if (tela) tela.classList.add('onb-ativa');

    if (adicionarHistorico && telaAtual !== nomeTela) {
      historicoTelas.push(telaAtual);
    }

    telaAtual = nomeTela;
    window.scrollTo(0, 0);

    // Hook: verificação
    if (nomeTela === 'verificacao') {
      setTimeout(() => {
        if (typeof onbIniciarTelaVerificacao === 'function') {
          onbIniciarTelaVerificacao();
        }
      }, 100);
    }

    // Hook: username
    if (nomeTela === 'username') {
      setTimeout(() => {
        if (typeof onbConfigurarUsername === 'function') {
          onbConfigurarUsername();
        }

        const input = document.getElementById('onbInputUser');
        if (input) {
          input.value = '';
          input.focus();
        }

        const status = document.getElementById('onbUserStatus');
        if (status) {
          status.textContent = '';
          status.classList.remove('onb-status-ok', 'onb-status-erro', 'onb-status-checando');
        }

        const wrap = document.getElementById('onbUserWrap');
        if (wrap) {
          wrap.classList.remove('onb-input-user-ok', 'onb-input-user-erro');
        }

        const sugestoesWrap = document.getElementById('onbUserSugestoesWrap');
        if (sugestoesWrap) sugestoesWrap.style.display = 'none';

        const btn = document.getElementById('onbBtnUser');
        if (btn) {
          btn.disabled = true;
          btn.classList.add('onb-btn-desabilitado');
        }
      }, 150);
    }

    // Hook: LGPD
    if (nomeTela === 'lgpd') {
      setTimeout(() => {
        if (typeof onbConfigurarLgpd === 'function') {
          onbConfigurarLgpd();
        }
      }, 150);
    }

    // Hook: email
    if (nomeTela === 'email') {
      setTimeout(() => {
        if (typeof onbConfigurarEmail === 'function') {
          onbConfigurarEmail();
        }
      }, 150);
    }

    // Hook: cadastro → preenche email readonly
    if (nomeTela === 'cadastro') {
      setTimeout(() => {
        const emailTemp = localStorage.getItem('drops_email_temp') || '';
        const inputEmail = document.getElementById('onbInputEmail');

        if (inputEmail && emailTemp) {
          inputEmail.value = emailTemp;
        }

        const inputNome = document.getElementById('onbInputNome');
        if (inputNome) inputNome.focus();
      }, 150);
    }
  }

  function onbVoltar() {
  const anterior = historicoTelas.pop();
  if (anterior) {
    onbIrPara(anterior, false);
  } else {
    onbIrPara('cadastro', false);
  }
}

function onbIrParaEmail() {
    historicoTelas.length = 0;
    onbIrPara('email', false);

    setTimeout(() => {
      const input = document.getElementById('onbInputEmailGeral');
      const ajuda = document.getElementById('onbAjudaEmailGeral');
      const btn = document.getElementById('onbBtnEmailGeral');

      if (input) {
        input.value = '';
        input.focus();
      }
      if (ajuda) {
        ajuda.textContent = '';
        ajuda.classList.remove('onb-ajuda-erro', 'onb-ajuda-ok');
      }
      if (btn) {
        btn.disabled = true;
        btn.classList.add('onb-btn-desabilitado');
      }
      if (input) {
        input.classList.remove('onb-input-erro', 'onb-input-ok');
      }
    }, 150);
  }

  function onbIrParaApp() {
    window.location.href = './index.html';
  }

  /* ============================================
     RESET
  ============================================ */
  function onbVerificarReset() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'true') {
      localStorage.removeItem(CHAVE_CADASTRO);
      console.log('🧹 Cadastro limpo para teste');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  /* ============================================
     ESTADO INICIAL
  ============================================ */
  function onbVerificarEstadoInicial() {
  const jaCadastrado = localStorage.getItem(CHAVE_CADASTRO) === 'true';
  const logado = localStorage.getItem('drops_logado') === 'true';
  const params = new URLSearchParams(window.location.search);
  const modoLogin = params.get('modo') === 'login';

  // Já cadastrado E logado → vai pro app (sessão persistente!)
  if (jaCadastrado && logado) {
    onbIrParaApp();
    return;
  }

  // Já cadastrado MAS não logado
  if (jaCadastrado && !logado) {
    // Se veio com ?modo=login → vai direto pra tela de email
    if (modoLogin) {
      onbIrParaEmail();
      return;
    }
    // Senão → mostra tela de escolha
    onbIrPara('escolha', false);
    return;
  }

  // Nunca fez onboarding → começa do zero
  onbIrPara('splash', false);

  setTimeout(() => {
    onbIrPara('carrossel');
  }, 2800);
  }

  /* ============================================
     CARROSSEL
  ============================================ */
  let slideAtual = 0;
  const TOTAL_SLIDES = 3;

  function onbMostrarSlide(index) {
    if (index < 0 || index >= TOTAL_SLIDES) return;

    slideAtual = index;

    document.querySelectorAll('.onb-slide').forEach((el) => {
      el.classList.remove('onb-slide-ativo');
    });

    const slide = document.querySelector(`.onb-slide[data-slide="${index}"]`);
    if (slide) slide.classList.add('onb-slide-ativo');

    document.querySelectorAll('.onb-ponto').forEach((el) => {
      el.classList.remove('onb-ponto-ativo');
    });

    const ponto = document.querySelector(`.onb-ponto[data-ponto="${index}"]`);
    if (ponto) ponto.classList.add('onb-ponto-ativo');

    const btn = document.getElementById('onbBtnProximo');
    if (btn) {
      btn.textContent = index === TOTAL_SLIDES - 1 ? 'Começar' : 'Próximo';
    }
  }

  function onbProximoSlide() {
    if (slideAtual === TOTAL_SLIDES - 1) {
      onbIrParaEmail();
    } else {
      onbMostrarSlide(slideAtual + 1);
    }
  }

  /* ============================================
     SWIPE
  ============================================ */
  function onbConfigurarSwipe() {
    const container = document.getElementById('onbCarrosselSlides');
    if (!container) return;

    let inicioX = 0;
    let inicioY = 0;
    let arrastando = false;

    container.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      inicioX = e.touches[0].clientX;
      inicioY = e.touches[0].clientY;
      arrastando = true;
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
      if (!arrastando) return;
      arrastando = false;

      const fimX = e.changedTouches[0].clientX;
      const fimY = e.changedTouches[0].clientY;

      const deltaX = fimX - inicioX;
      const deltaY = fimY - inicioY;

      if (Math.abs(deltaY) > Math.abs(deltaX)) return;
      if (Math.abs(deltaX) < 50) return;

      if (deltaX < 0) {
        if (slideAtual < TOTAL_SLIDES - 1) {
          onbMostrarSlide(slideAtual + 1);
        }
      } else {
        if (slideAtual > 0) {
          onbMostrarSlide(slideAtual - 1);
        }
      }
    }, { passive: true });
  }
  /* ============================================
   DOMÍNIOS BLOQUEADOS
============================================ */
const DOMINIOS_BLOQUEADOS = [
  'temp-mail.org',
  'tempmail.com',
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.net',
  'mailinator.com',
  'yopmail.com',
  'throwawaymail.com',
  'fakeinbox.com',
  'sharklasers.com',
  'trashmail.com',
  'mytemp.email',
  'tempinbox.com',
  'maildrop.cc',
  'getnada.com'
];

/* ============================================
   VALIDAÇÕES
============================================ */
function onbContarEmojis(texto) {
  if (!texto) return 0;

  try {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter('pt-BR', { granularity: 'grapheme' });
      let total = 0;
      for (const { segment } of segmenter.segment(texto)) {
        if (/\p{Extended_Pictographic}/u.test(segment)) total++;
      }
      return total;
    }
  } catch (e) {}

  const matches = texto.match(/\p{Extended_Pictographic}/gu);
  return matches ? matches.length : 0;
}

function onbValidarNome(valor) {
  const nome = String(valor || '').trim();

  if (!nome) return { ok: false, msg: 'Digite seu nome.' };
  if (nome.length < 2) return { ok: false, msg: 'Nome muito curto.' };

  const emojis = onbContarEmojis(nome);
  if (emojis > 2) return { ok: false, msg: 'Máximo 2 emojis no nome.' };

  const semEmoji = nome.replace(/\p{Extended_Pictographic}/gu, '').trim();

  if (!/^[\p{L}\p{N}\s]+$/u.test(semEmoji)) {
    return { ok: false, msg: 'Use apenas letras, números e espaço.' };
  }

  if (/\s{2,}/.test(semEmoji)) {
    return { ok: false, msg: 'Evite espaços duplos.' };
  }

  const palavras = semEmoji.split(/\s+/).filter(Boolean);
  if (palavras.length > 3) {
    return { ok: false, msg: 'Máximo 3 palavras.' };
  }

  return { ok: true, msg: 'Nome válido.' };
}

function onbAplicarMascaraData(valor) {
  const digitos = String(valor || '').replace(/\D/g, '').slice(0, 8);

  let resultado = '';
  if (digitos.length <= 2) {
    resultado = digitos;
  } else if (digitos.length <= 4) {
    resultado = digitos.slice(0, 2) + ' / ' + digitos.slice(2);
  } else {
    resultado =
      digitos.slice(0, 2) +
      ' / ' +
      digitos.slice(2, 4) +
      ' / ' +
      digitos.slice(4);
  }

  return resultado;
}

function onbValidarNascimento(valor) {
  const digitos = String(valor || '').replace(/\D/g, '');

  if (digitos.length !== 8) {
    return { ok: false, msg: 'Digite a data completa (DD/MM/AAAA).' };
  }

  const dia = Number(digitos.slice(0, 2));
  const mes = Number(digitos.slice(2, 4));
  const ano = Number(digitos.slice(4));

  if (mes < 1 || mes > 12) {
    return { ok: false, msg: 'Mês inválido.' };
  }
  if (dia < 1 || dia > 31) {
    return { ok: false, msg: 'Dia inválido.' };
  }

  const data = new Date(ano, mes - 1, dia);

  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return { ok: false, msg: 'Data inválida.' };
  }

  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const mesAniversario = mes - 1;
  const diaAniversario = dia;

  if (
    hoje.getMonth() < mesAniversario ||
    (hoje.getMonth() === mesAniversario && hoje.getDate() < diaAniversario)
  ) {
    idade--;
  }

  if (idade < 15) {
    return {
      ok: false,
      msg: 'O Drops é para maiores de 15 anos.'
    };
  }

  if (idade > 120) {
    return { ok: false, msg: 'Data inválida.' };
  }

  return { ok: true, msg: 'Data válida.' };
}

function onbValidarEmail(valor) {
  const email = String(valor || '').trim().toLowerCase();

  if (!email) return { ok: false, msg: 'Digite seu e-mail.' };

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!regex.test(email)) {
    return { ok: false, msg: 'Digite um e-mail válido.' };
  }

  const dominio = email.split('@')[1] || '';
  if (DOMINIOS_BLOQUEADOS.includes(dominio)) {
    return {
      ok: false,
      msg: 'E-mails temporários não são aceitos.'
    };
  }

  return { ok: true, msg: 'E-mail válido.' };
}

function onbAtualizarCampo(input, ajuda, resultado) {
  if (!input || !ajuda) return;

  input.classList.remove('onb-input-erro', 'onb-input-ok');
  ajuda.classList.remove('onb-ajuda-erro', 'onb-ajuda-ok');

  if (resultado.ok) {
    input.classList.add('onb-input-ok');
    return;
  }

  if (input.value.trim().length > 0) {
    input.classList.add('onb-input-erro');
    ajuda.classList.add('onb-ajuda-erro');
  }
}

/* ============================================
   TELA DE EMAIL
============================================ */
function onbConfigurarEmail() {
  const input = document.getElementById('onbInputEmailGeral');
  const btn = document.getElementById('onbBtnEmailGeral');

  if (!input || !btn) return;

  input.removeEventListener('input', onbHandlerEmailInput);
  input.addEventListener('input', onbHandlerEmailInput);
}

function onbHandlerEmailInput() {
  const input = document.getElementById('onbInputEmailGeral');
  const ajuda = document.getElementById('onbAjudaEmailGeral');
  const btn = document.getElementById('onbBtnEmailGeral');

  if (!input || !ajuda || !btn) return;

  input.value = input.value.toLowerCase().replace(/\s/g, '');

  const email = input.value.trim();

  input.classList.remove('onb-input-erro', 'onb-input-ok');
  ajuda.classList.remove('onb-ajuda-erro', 'onb-ajuda-ok');

  if (!email) {
    ajuda.textContent = '';
    btn.disabled = true;
    btn.classList.add('onb-btn-desabilitado');
    return;
  }

  const resultado = onbValidarEmail(email);

  if (!resultado.ok) {
    input.classList.add('onb-input-erro');
    ajuda.textContent = resultado.msg;
    ajuda.classList.add('onb-ajuda-erro');
    btn.disabled = true;
    btn.classList.add('onb-btn-desabilitado');
    return;
  }

  input.classList.add('onb-input-ok');
  ajuda.textContent = '✅ E-mail válido.';
  ajuda.classList.add('onb-ajuda-ok');
  btn.disabled = false;
  btn.classList.remove('onb-btn-desabilitado');
}

async function onbContinuarComEmail() {
  const input = document.getElementById('onbInputEmailGeral');
  if (!input) return;

  const email = input.value.trim().toLowerCase();

  if (!onbValidarEmail(email).ok) return;

  if (!window.supabaseClient) {
    alert('Conexão com o servidor não disponível. Tente novamente.');
    return;
  }

  // Mostra "enviando..." no botão
  const btn = document.getElementById('onbBtnEmailGeral');
  const textoOriginal = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Enviando...';
  }

  try {
    const { error } = await window.supabaseClient.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: true
      }
    });

    if (error) throw error;

    // Salva o email na sessão pra usar na tela de verificação
    localStorage.setItem('drops_email_temp', email);

    console.log('📧 Código enviado para:', email);

    onbIrPara('verificacao');
  } catch (erro) {
    console.error('Erro ao enviar código:', erro);
    alert('Não foi possível enviar o código. Verifique o email e tente novamente.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = textoOriginal || 'Continuar →';
    }
  }
}
  
/* ============================================
   TELA DE CADASTRO
============================================ */
function onbAtualizarBotaoCadastro() {
  const inputNome = document.getElementById('onbInputNome');
  const inputNasc = document.getElementById('onbInputNascimento');
  const inputEmail = document.getElementById('onbInputEmail');
  const btn = document.getElementById('onbBtnCadastro');

  if (!inputNome || !inputNasc || !inputEmail || !btn) return;

  const okNome = onbValidarNome(inputNome.value).ok;
  const okNasc = onbValidarNascimento(inputNasc.value).ok;
  const okEmail = onbValidarEmail(inputEmail.value).ok;

  const tudoOk = okNome && okNasc && okEmail;

  if (tudoOk) {
    btn.disabled = false;
    btn.classList.remove('onb-btn-desabilitado');
  } else {
    btn.disabled = true;
    btn.classList.add('onb-btn-desabilitado');
  }
}

function onbConfigurarCadastro() {
  const inputNome = document.getElementById('onbInputNome');
  const inputNasc = document.getElementById('onbInputNascimento');

  const ajudaNome = document.getElementById('onbAjudaNome');
  const ajudaNasc = document.getElementById('onbAjudaNascimento');

  if (!inputNome || !inputNasc) return;

  // NOME
  inputNome.addEventListener('input', () => {
    const resultado = onbValidarNome(inputNome.value);

    if (!resultado.ok && inputNome.value.trim().length > 0) {
      ajudaNome.textContent = resultado.msg;
      ajudaNome.classList.add('onb-ajuda-erro');
    } else {
      ajudaNome.textContent = 'Letras, números e até 2 emojis. Máx. 3 palavras.';
      ajudaNome.classList.remove('onb-ajuda-erro');
    }

    onbAtualizarCampo(inputNome, ajudaNome, resultado);
    onbAtualizarBotaoCadastro();
  });

  // NASCIMENTO
  inputNasc.addEventListener('input', () => {
    inputNasc.value = onbAplicarMascaraData(inputNasc.value);

    const resultado = onbValidarNascimento(inputNasc.value);

    if (!resultado.ok && inputNasc.value.replace(/\D/g, '').length >= 8) {
      ajudaNasc.textContent = resultado.msg;
      ajudaNasc.classList.add('onb-ajuda-erro');
    } else {
      ajudaNasc.textContent = 'Você precisa ter 15 anos ou mais.';
      ajudaNasc.classList.remove('onb-ajuda-erro');
    }

    onbAtualizarCampo(inputNasc, ajudaNasc, resultado);
    onbAtualizarBotaoCadastro();
  });
}

async function onbFinalizarCadastro() {
  const inputNome = document.getElementById('onbInputNome');
  const inputNasc = document.getElementById('onbInputNascimento');
  const inputEmail = document.getElementById('onbInputEmail');

  if (!inputNome || !inputNasc || !inputEmail) return;

  const nome = inputNome.value.trim();
  const nasc = inputNasc.value.trim();
  const email = inputEmail.value.trim().toLowerCase();

  if (
    !onbValidarNome(nome).ok ||
    !onbValidarNascimento(nasc).ok ||
    !onbValidarEmail(email).ok
  ) {
    return;
  }

  if (!window.supabaseClient) {
    alert('Conexão com o servidor não disponível. Tente novamente.');
    return;
  }

  const btn = document.getElementById('onbBtnCadastro');
  const textoOriginal = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Enviando...';
  }

  try {
    const { error } = await window.supabaseClient.auth.signInWithOtp({
      email: email,
      options: { shouldCreateUser: true }
    });

    if (error) throw error;

    localStorage.setItem('drops_nome', nome);
    localStorage.setItem('drops_nascimento', nasc);
    localStorage.setItem('drops_email', email);
    localStorage.removeItem('drops_email_temp');

    localStorage.setItem('drops_codigo_expira', String(Date.now() + 10 * 60 * 1000));
    localStorage.setItem('drops_codigo_tentativas', '0');
    localStorage.setItem('drops_codigo_modo', 'cadastro');

    console.log('📧 Código real enviado para:', email);

    onbIrPara('verificacao');
  } catch (erro) {
    console.error('Erro ao enviar código:', erro);
    alert('Não foi possível enviar o código. Tente novamente.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = textoOriginal || 'Continuar →';
    }
  }
}
  
  /* ============================================
   TELA DE VERIFICAÇÃO
============================================ */
let timerExpiracao = null;
let timerReenviar = null;
let tempoReenviar = 30;

function onbIniciarTelaVerificacao() {
  const modo = localStorage.getItem('drops_codigo_modo') || 'cadastro';
  const emailSalvo = modo === 'login'
    ? (localStorage.getItem('drops_email_login') || '')
    : (localStorage.getItem('drops_email') || '');

  const emailEl = document.getElementById('onbVerificaEmail');
  if (emailEl) emailEl.textContent = emailSalvo;

  const codigo = localStorage.getItem('drops_codigo_email') || '';
  const codigoEl = document.getElementById('onbVerificaTesteCodigo');
  if (codigoEl) codigoEl.textContent = codigo;

  document.querySelectorAll('.onb-codigo-input').forEach((el) => {
    el.value = '';
    el.classList.remove('onb-codigo-preenchido', 'onb-codigo-erro');
  });

  const erroEl = document.getElementById('onbVerificaErro');
  if (erroEl) erroEl.textContent = '';

  onbConfigurarCodigoInputs();
  onbIniciarTimerExpiracao();
  onbIniciarTimerReenviar();
  onbAtualizarBotaoVerifica();

  setTimeout(() => {
    document.getElementById('onbCodigoInput0')?.focus();
  }, 200);
}

function onbConfigurarCodigoInputs() {
  const inputs = document.querySelectorAll('.onb-codigo-input');

  inputs.forEach((input) => {
    input.addEventListener('input', (e) => {
      let valor = e.target.value.replace(/\D/g, '');

      if (valor.length > 1) {
  const digitos = valor.split('').slice(0, 8);
        inputs.forEach((inp, i) => {
          inp.value = digitos[i] || '';
          if (inp.value) {
            inp.classList.add('onb-codigo-preenchido');
          } else {
            inp.classList.remove('onb-codigo-preenchido');
          }
        });
        onbAtualizarBotaoVerifica();
        inputs[Math.min(digitos.length, 5)].focus();
        return;
      }

      e.target.value = valor;

      if (valor) {
        e.target.classList.add('onb-codigo-preenchido');
        e.target.classList.remove('onb-codigo-erro');

        const idx = Number(e.target.dataset.index);
        if (idx < 5) {
          document.getElementById(`onbCodigoInput${idx + 1}`)?.focus();
        } else {
          e.target.blur();
        }
      } else {
        e.target.classList.remove('onb-codigo-preenchido');
      }

      onbAtualizarBotaoVerifica();
    });

    input.addEventListener('keydown', (e) => {
      const idx = Number(input.dataset.index);

      if (e.key === 'Backspace' && !input.value && idx > 0) {
        const anterior = document.getElementById(`onbCodigoInput${idx - 1}`);
        if (anterior) {
          anterior.focus();
          anterior.value = '';
          anterior.classList.remove('onb-codigo-preenchido');
          onbAtualizarBotaoVerifica();
        }
      }

      if (e.key === 'ArrowLeft' && idx > 0) {
        document.getElementById(`onbCodigoInput${idx - 1}`)?.focus();
      }

      if (e.key === 'ArrowRight' && idx < 5) {
        document.getElementById(`onbCodigoInput${idx + 1}`)?.focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData('text');
      const digitos = texto.replace(/\D/g, '').slice(0, 6).split('');

      inputs.forEach((inp, i) => {
        inp.value = digitos[i] || '';
        if (inp.value) {
          inp.classList.add('onb-codigo-preenchido');
        } else {
          inp.classList.remove('onb-codigo-preenchido');
        }
      });

      onbAtualizarBotaoVerifica();
    });
  });
}

function onbAtualizarBotaoVerifica() {
  const inputs = document.querySelectorAll('.onb-codigo-input');
  const btn = document.getElementById('onbBtnVerifica');
  if (!btn) return;

  let preenchidos = 0;
  inputs.forEach((inp) => {
    if (inp.value.trim()) preenchidos++;
  });

  if (preenchidos === 8) {
    btn.disabled = false;
    btn.classList.remove('onb-btn-desabilitado');
  } else {
    btn.disabled = true;
    btn.classList.add('onb-btn-desabilitado');
  }
}

function onbIniciarTimerExpiracao() {
  if (timerExpiracao) clearInterval(timerExpiracao);

  const expira = Number(localStorage.getItem('drops_codigo_expira') || '0');
  const total = 10 * 60 * 1000;

  function atualizar() {
    const agora = Date.now();
    const restante = Math.max(0, expira - agora);

    const fill = document.getElementById('onbVerificaTimerFill');
    const texto = document.getElementById('onbVerificaTimerTexto');

    if (!fill || !texto) return;

    const pct = (restante / total) * 100;
    fill.style.width = `${pct}%`;

    if (restante < 2 * 60 * 1000) {
      fill.classList.add('onb-verifica-timer-fill-alerta');
    } else {
      fill.classList.remove('onb-verifica-timer-fill-alerta');
    }

    const min = Math.floor(restante / 60000);
    const seg = Math.floor((restante % 60000) / 1000);

    texto.textContent = `Expira em ${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;

    if (restante <= 0) {
      clearInterval(timerExpiracao);
      timerExpiracao = null;
      texto.textContent = 'Código expirado';
      onbMostrarErroVerifica('Código expirado. Solicite um novo.');
    }
  }

  atualizar();
  timerExpiracao = setInterval(atualizar, 1000);
}

function onbIniciarTimerReenviar() {
  if (timerReenviar) clearInterval(timerReenviar);

  tempoReenviar = 30;
  const btn = document.getElementById('onbVerificaReenviar');
  if (!btn) return;

  btn.disabled = true;
  btn.textContent = `Reenviar em ${tempoReenviar}s`;

  timerReenviar = setInterval(() => {
    tempoReenviar--;

    if (tempoReenviar <= 0) {
      clearInterval(timerReenviar);
      timerReenviar = null;
      btn.disabled = false;
      btn.textContent = 'Reenviar';
    } else {
      btn.textContent = `Reenviar em ${tempoReenviar}s`;
    }
  }, 1000);
}

async function onbReenviarCodigo() {
  const email = localStorage.getItem('drops_email') ||
                localStorage.getItem('drops_email_login') || '';

  if (!email) {
    onbMostrarErroVerifica('Email não encontrado. Volte e tente novamente.');
    return;
  }

  if (!window.supabaseClient) {
    onbMostrarErroVerifica('Sem conexão com o servidor.');
    return;
  }

  const btn = document.getElementById('onbVerificaReenviar');
  const textoOriginal = btn?.textContent;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Enviando...';
  }

  try {
    const { error } = await window.supabaseClient.auth.signInWithOtp({
      email: email,
      options: { shouldCreateUser: true }
    });

    if (error) throw error;

    localStorage.setItem('drops_codigo_expira', String(Date.now() + 60 * 60 * 1000));
    localStorage.setItem('drops_codigo_tentativas', '0');

    console.log('📧 Novo código enviado para:', email);

    document.querySelectorAll('.onb-codigo-input').forEach((el) => {
      el.value = '';
      el.classList.remove('onb-codigo-preenchido', 'onb-codigo-erro');
    });

    onbMostrarErroVerifica('');
    onbIniciarTimerExpiracao();
    onbIniciarTimerReenviar();
    onbAtualizarBotaoVerifica();

    setTimeout(() => {
      document.getElementById('onbCodigoInput0')?.focus();
    }, 100);
  } catch (erro) {
    console.error('Erro ao reenviar código:', erro);
    onbMostrarErroVerifica('Não foi possível reenviar. Tente novamente.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = textoOriginal || 'Reenviar';
    }
  }
}

function onbMostrarErroVerifica(mensagem) {
  const el = document.getElementById('onbVerificaErro');
  if (el) el.textContent = mensagem;
}

async function onbConfirmarCodigo() {
  const inputs = document.querySelectorAll('.onb-codigo-input');
  let codigoDigitado = '';

  inputs.forEach((inp) => {
    codigoDigitado += inp.value.trim();
  });

  const tentativas = Number(localStorage.getItem('drops_codigo_tentativas') || '0');
  const expira = Number(localStorage.getItem('drops_codigo_expira') || '0');
  const modo = localStorage.getItem('drops_codigo_modo') || 'cadastro';

if (tentativas >= 3) {
  
    onbMostrarErroVerifica('Muitas tentativas. Aguarde 5 minutos.');
    return;
  }

  if (!window.supabaseClient) {
    onbMostrarErroVerifica('Sem conexão com o servidor.');
    return;
  }

  const email = localStorage.getItem('drops_email') ||
                localStorage.getItem('drops_email_login') || '';

  if (!email) {
    onbMostrarErroVerifica('Email não encontrado. Volte e tente novamente.');
    return;
  }

  const { data, error } = await window.supabaseClient.auth.verifyOtp({
    email: email,
    token: codigoDigitado,
    type: 'email'
  });

  if (!error && data && data.user) {
    console.log('✅ Código confirmado. Modo:', modo);
    localStorage.setItem('drops_codigo_verificado', 'true');
    localStorage.setItem('drops_codigo_tentativas', '0');

    if (modo === 'login') {
      console.log('🔓 Login confirmado. Marcando como logado...');

      localStorage.setItem('drops_logado', 'true');
      localStorage.setItem('drops_ultimo_login', new Date().toISOString());

      localStorage.removeItem('drops_codigo_modo');
      localStorage.removeItem('drops_email_login');

      onbIrParaApp();
    } else {
      console.log('🆕 Onboarding confirmado. Indo pra tela de @ID...');

      localStorage.removeItem('drops_codigo_modo');

      onbIrPara('username');
    }
  } else {
    const novas = tentativas + 1;
    localStorage.setItem('drops_codigo_tentativas', String(novas));

    inputs.forEach((inp) => {
      inp.classList.add('onb-codigo-erro');
    });

    if (novas >= 3) {
      onbMostrarErroVerifica('Muitas tentativas. Aguarde 5 minutos.');

      setTimeout(() => {
        localStorage.setItem('drops_codigo_tentativas', '0');
        inputs.forEach((inp) => inp.classList.remove('onb-codigo-erro'));
        onbMostrarErroVerifica('');
      }, 5 * 60 * 1000);
    } else {
      onbMostrarErroVerifica(`Código incorreto. Tentativa ${novas} de 3.`);

      setTimeout(() => {
        inputs.forEach((inp) => {
          inp.classList.remove('onb-codigo-erro');
        });
      }, 800);
    }
  }
}

/* ============================================
   TELA DE USERNAME
============================================ */
const USERNAMES_OCUPADOS = [
  'jqmarques',
  'admin',
  'drops',
  'teste',
  'user',
  'julia',
  'lucas',
  'ana',
  'rafael',
  'suporte',
  'contato',
  'oficial',
  'dropsapp',
  'equipe',
  'moderador'
];

function onbValidarFormatoUsername(valor) {
  const user = String(valor || '').toLowerCase().trim();

  if (!user) {
    return { ok: false, msg: '' };
  }

  if (user.length < 3) {
    return { ok: false, msg: 'Mínimo 3 caracteres.' };
  }

  if (user.length > 20) {
    return { ok: false, msg: 'Máximo 20 caracteres.' };
  }

  if (!/^[a-z0-9]+$/.test(user)) {
    return { ok: false, msg: 'Só letras minúsculas e números.' };
  }

  return { ok: true, msg: '' };
}

function onbVerificarDisponibilidade(user) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const disponivel = !USERNAMES_OCUPADOS.includes(user.toLowerCase());
      resolve(disponivel);
    }, 400);
  });
}

function onbGerarSugestoes(base) {
  const sugestoes = [];
  const baseLimpa = base.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'user';

  let ano = new Date().getFullYear();

  const tentativas = [
    baseLimpa + '1',
    baseLimpa + '2',
    baseLimpa + ano,
    baseLimpa + 'br',
    baseLimpa + 'oficial'
  ];

  for (const tentativa of tentativas) {
    if (sugestoes.length >= 4) break;
    if (!USERNAMES_OCUPADOS.includes(tentativa) && tentativa.length <= 20) {
      sugestoes.push(tentativa);
    }
  }

  let contador = 3;
  while (sugestoes.length < 4 && contador < 100) {
    const candidato = baseLimpa + contador;
    if (!USERNAMES_OCUPADOS.includes(candidato) && candidato.length <= 20) {
      sugestoes.push(candidato);
    }
    contador++;
  }

  return sugestoes.slice(0, 4);
}

function onbAplicarSugestao(user) {
  const input = document.getElementById('onbInputUser');
  if (!input) return;

  input.value = user;
  onbVerificarUsername();
  input.focus();
}

let timeoutVerificacaoUser = null;

function onbVerificarUsername() {
  const input = document.getElementById('onbInputUser');
  const wrap = document.getElementById('onbUserWrap');
  const status = document.getElementById('onbUserStatus');
  const sugestoesWrap = document.getElementById('onbUserSugestoesWrap');
  const sugestoesEl = document.getElementById('onbUserSugestoes');
  const btn = document.getElementById('onbBtnUser');

  if (!input || !wrap || !status || !btn) return;

  input.value = input.value.toLowerCase().replace(/[^a-z0-9]/g, '');

  const user = input.value;

  wrap.classList.remove('onb-input-user-ok', 'onb-input-user-erro');
  status.classList.remove('onb-status-ok', 'onb-status-erro', 'onb-status-checando');
  if (sugestoesWrap) sugestoesWrap.style.display = 'none';

  if (!user) {
    status.textContent = '';
    btn.disabled = true;
    btn.classList.add('onb-btn-desabilitado');
    return;
  }

  const formato = onbValidarFormatoUsername(user);

  if (!formato.ok) {
    wrap.classList.add('onb-input-user-erro');
    status.textContent = formato.msg;
    status.classList.add('onb-status-erro');
    btn.disabled = true;
    btn.classList.add('onb-btn-desabilitado');
    return;
  }

  if (timeoutVerificacaoUser) clearTimeout(timeoutVerificacaoUser);

  status.textContent = '⏳ Verificando disponibilidade...';
  status.classList.add('onb-status-checando');
  btn.disabled = true;
  btn.classList.add('onb-btn-desabilitado');

  timeoutVerificacaoUser = setTimeout(async () => {
    const disponivel = await onbVerificarDisponibilidade(user);

    if (disponivel) {
      wrap.classList.add('onb-input-user-ok');
      status.textContent = `✅ @${user} está disponível`;
      status.classList.add('onb-status-ok');
      btn.disabled = false;
      btn.classList.remove('onb-btn-desabilitado');
    } else {
      wrap.classList.add('onb-input-user-erro');
      status.textContent = `❌ @${user} já está em uso`;
      status.classList.add('onb-status-erro');
      btn.disabled = true;
      btn.classList.add('onb-btn-desabilitado');

      const sugestoes = onbGerarSugestoes(user);

      if (sugestoes.length && sugestoesWrap && sugestoesEl) {
        sugestoesEl.innerHTML = '';
        sugestoes.forEach((sug) => {
          const btnSug = document.createElement('button');
          btnSug.type = 'button';
          btnSug.className = 'onb-user-sugestao-btn';
          btnSug.textContent = '@' + sug;
          btnSug.addEventListener('click', () => onbAplicarSugestao(sug));
          sugestoesEl.appendChild(btnSug);
        });
        sugestoesWrap.style.display = 'block';
      }
    }
  }, 400);
}

function onbConfigurarUsername() {
  const input = document.getElementById('onbInputUser');
  if (!input) return;

  input.removeEventListener('input', onbVerificarUsername);
  input.addEventListener('input', onbVerificarUsername);
}

function onbFinalizarUsername() {
  const input = document.getElementById('onbInputUser');
  if (!input) return;

  const user = input.value.toLowerCase().trim();

  if (!onbValidarFormatoUsername(user).ok) return;
  if (USERNAMES_OCUPADOS.includes(user)) return;

  localStorage.setItem('drops_username', user);
  console.log('✅ Username salvo:', user);

  onbIrPara('lgpd');
}

/* ============================================
   TELA DE LGPD
============================================ */
const DOC_TERMOS = `
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

  <p style="margin-top: 16px; font-style: italic; opacity: .7;">Última atualização: versão 1.0</p>
`;

const DOC_PRIVACIDADE = `
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

  <p style="margin-top: 16px; font-style: italic; opacity: .7;">Última atualização: versão 1.0</p>
`;

function onbAbrirModalTermos(tipo) {
  const modal = document.getElementById('onbModalDoc');
  const titulo = document.getElementById('onbModalDocTitulo');
  const corpo = document.getElementById('onbModalDocCorpo');

  if (!modal || !titulo || !corpo) return;

  if (tipo === 'termos') {
    titulo.textContent = 'Termos de Uso';
    corpo.innerHTML = DOC_TERMOS;
  } else {
    titulo.textContent = 'Política de Privacidade';
    corpo.innerHTML = DOC_PRIVACIDADE;
  }

  corpo.scrollTop = 0;
  modal.style.display = 'flex';
}

function onbFecharModalTermos() {
  const modal = document.getElementById('onbModalDoc');
  if (modal) modal.style.display = 'none';
}

document.addEventListener('click', (e) => {
  const modal = document.getElementById('onbModalDoc');
  if (!modal || modal.style.display === 'none') return;

  if (e.target === modal) {
    onbFecharModalTermos();
  }
});

function onbConfigurarLgpd() {
  const checkboxes = document.querySelectorAll('.onb-lgpd-checkbox');

  checkboxes.forEach((cb) => {
    cb.removeEventListener('change', onbAtualizarBotaoLgpd);
    cb.addEventListener('change', onbAtualizarBotaoLgpd);
  });

  onbAtualizarBotaoLgpd();
}

function onbAtualizarBotaoLgpd() {
  const termos = document.getElementById('onbLgpdTermos');
  const privacidade = document.getElementById('onbLgpdPrivacidade');
  const dados = document.getElementById('onbLgpdDados');
  const btn = document.getElementById('onbBtnLgpd');

  if (!termos || !privacidade || !dados || !btn) return;

  const tudoMarcado = termos.checked && privacidade.checked && dados.checked;

  if (tudoMarcado) {
    btn.disabled = false;
    btn.classList.remove('onb-btn-desabilitado');
  } else {
    btn.disabled = true;
    btn.classList.add('onb-btn-desabilitado');
  }
}

function onbFinalizarLgpd() {
  const termos = document.getElementById('onbLgpdTermos');
  const privacidade = document.getElementById('onbLgpdPrivacidade');
  const dados = document.getElementById('onbLgpdDados');

  if (!termos || !privacidade || !dados) return;
  if (!termos.checked || !privacidade.checked || !dados.checked) return;

  const agora = new Date().toISOString();

    localStorage.setItem('drops_termos_versao', '1.0');
    localStorage.setItem('drops_termos_aceito_em', agora);

    localStorage.setItem('drops_lgpd_versao', '1.0');
    localStorage.setItem('drops_lgpd_aceito_em', agora);

    localStorage.setItem('drops_dados_aceito_em', agora);

      console.log('✅ Consentimento registrado em', agora);

  // GPS removido do onboarding. Usuário vai direto pro app.
  localStorage.setItem(CHAVE_CADASTRO, 'true');
  localStorage.setItem('drops_logado', 'true');
  localStorage.setItem('drops_cadastro_em', new Date().toISOString());

  onbIrParaApp();
}

  /* ============================================
     EXPÕE FUNÇÕES
  ============================================ */
  window.onbIrPara = onbIrPara;
window.onbVoltar = onbVoltar;
window.onbIrParaApp = onbIrParaApp;
  window.onbIrParaEmail = onbIrParaEmail;
  window.onbProximoSlide = onbProximoSlide;
  window.onbMostrarSlide = onbMostrarSlide;
  window.onbContinuarComEmail = onbContinuarComEmail;
  window.onbFinalizarCadastro = onbFinalizarCadastro;
  window.onbConfirmarCodigo = onbConfirmarCodigo;
  window.onbReenviarCodigo = onbReenviarCodigo;
  window.onbFinalizarUsername = onbFinalizarUsername;
  window.onbAplicarSugestao = onbAplicarSugestao;
  window.onbAbrirModalTermos = onbAbrirModalTermos;
  window.onbFecharModalTermos = onbFecharModalTermos;
  window.onbFinalizarLgpd = onbFinalizarLgpd;

  /* ============================================
     INICIALIZAÇÃO
  ============================================ */
  document.addEventListener('DOMContentLoaded', () => {
    onbVerificarReset();
    onbVerificarEstadoInicial();
    onbConfigurarSwipe();
    onbConfigurarCadastro();

    const btnReenviar = document.getElementById('onbVerificaReenviar');
    if (btnReenviar) {
      btnReenviar.addEventListener('click', onbReenviarCodigo);
    }

    console.log('✅ Onboarding inicializado');
  });
})();