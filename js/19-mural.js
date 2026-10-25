/* ============================================
   19-MURAL.JS
   Mural criativo: texto, desenho, fotos
============================================ */

(function () {
  'use strict';

  // ============================================
  // ESTADO
  // ============================================

  let muralScrollEl = null;
  let muralLimiteInferiorEl = null;
  let muralLimiteSuperiorEl = null;
  let muralRolagemIniciada = false;

  let muralTextoEditandoNex = null;
  let ultimoToqueTextoNex = { el: null, time: 0 };

  // (Variáveis da caneta removidas)

  let elementoSelecionadoNex = null;
  let transformacoesNex = new WeakMap();

  let muralDonoUsernameNex = null;
  let muralAlteradoNex = false;

// ============================================
// BALÃO DO AUTOR
// ============================================

let balaoAutorNex = null;
let balaoElementoOrigemNex = null;
let balaoListenerGlobalNex = false;

function criarBalaoAutorNex() {
  if (balaoAutorNex) return balaoAutorNex;

  balaoAutorNex = document.createElement('div');
  balaoAutorNex.className = 'mural-balao-autor-nex';
  balaoAutorNex.style.display = 'none';
  document.body.appendChild(balaoAutorNex);

  if (!balaoListenerGlobalNex) {
  balaoListenerGlobalNex = true;

  // ⚠️ 'click' em vez de 'pointerdown' pra não disparar antes do onClick do balão
  document.addEventListener('click', (e) => {
    if (!balaoAutorNex || balaoAutorNex.style.display === 'none') return;
    if (balaoAutorNex.contains(e.target)) return;
    if (balaoElementoOrigemNex && balaoElementoOrigemNex.contains(e.target)) return;

    fecharBalaoAutorNex();
  });
  }

  return balaoAutorNex;
}

function mostrarBalaoAutorNex(el) {
  if (!el) return;

  const autorId = el.dataset.autorId;
  const autorNome = el.dataset.autorNome || autorId;

  if (!autorId) return;

  const balao = criarBalaoAutorNex();

  const el_autorId = el.dataset.autorId || '';
const el_autorNome = el.dataset.autorNome || el_autorId;

const inicial = String(el_autorNome || '?').trim().charAt(0).toUpperCase() || '?';

// Renderiza com inicial primeiro (rápido)
balao.innerHTML = `
  <div class="mural-balao-avatar-nex" id="muralBalaoAvatarNex"><span>${inicial}</span></div>
  <div class="mural-balao-info-nex">
    <div class="mural-balao-nome-nex">${el_autorNome}</div>
    <div class="mural-balao-user-nex">@${el_autorId}</div>
  </div>
`;

// ⚠️ Busca o avatar no Supabase (em background)
if (
  typeof window.buscarPerfilPublicoSupabase === 'function' &&
  el_autorId
) {
  window.buscarPerfilPublicoSupabase(el_autorId)
    .then((perfil) => {
      if (!perfil || !perfil.avatar_url) return;

      const avatarEl = document.getElementById('muralBalaoAvatarNex');
      if (!avatarEl) return;

      avatarEl.innerHTML = `<img src="${perfil.avatar_url}" alt="">`;
    })
    .catch((err) => {
      console.warn('Erro ao buscar avatar do balão:', err);
    });
}

  balaoElementoOrigemNex = el;

  balao.style.display = 'flex';
  balao.style.visibility = 'hidden';

  const rect = el.getBoundingClientRect();

  requestAnimationFrame(() => {
    const balaoRect = balao.getBoundingClientRect();

    let left = rect.left + rect.width / 2 - balaoRect.width / 2;
    let top = rect.bottom + 8;

    if (left < 8) left = 8;
    if (left + balaoRect.width > window.innerWidth - 8) {
      left = window.innerWidth - balaoRect.width - 8;
    }

    if (top + balaoRect.height > window.innerHeight - 8) {
      top = rect.top - balaoRect.height - 8;
    }

    balao.style.left = left + 'px';
    balao.style.top = top + 'px';
    balao.style.visibility = 'visible';
  });

  balao.onclick = (e) => {
  e.stopPropagation();
  e.preventDefault();

  const idFinal = el_autorId;
  const nomeFinal = el_autorNome;

  // 1. Fecha o balão
  fecharBalaoAutorNex();

  // 2. Fecha o mural
  fecharMuralNex();

  // 3. Abre o perfil (com delay mínimo pra dar tempo do DOM atualizar)
  setTimeout(() => {
    if (typeof window.abrirPerfilVisitadoNex === 'function') {
      window.abrirPerfilVisitadoNex(idFinal, nomeFinal);
    }
  }, 120);
};
}

function fecharBalaoAutorNex() {
  if (balaoAutorNex) {
    balaoAutorNex.style.display = 'none';
    balaoAutorNex.style.visibility = 'hidden';
  }

  balaoElementoOrigemNex = null;
}

  // ============================================
  // ABRIR / FECHAR
  // ============================================

  function abrirMuralNex(usernameDono = null) {
  const modal = document.getElementById('modalMuralNex');
  if (!modal) {
    console.warn('⚠️ modalMuralNex não encontrado');
    return;
  }

  // ⚠️ Se veio um Event object (click), ignora
  if (usernameDono && typeof usernameDono === 'object') {
    usernameDono = null;
  }

  // Se não passou, é o meu próprio mural
  muralDonoUsernameNex = usernameDono
    ? String(usernameDono).replace(/^@/, '').trim()
    : Drops.usernameAtual;

    if (!muralDonoUsernameNex) {
      muralDonoUsernameNex = (localStorage.getItem('drops_username') || '')
        .trim()
        .toLowerCase();
    }

    console.log('🎨 Abrindo mural de:', muralDonoUsernameNex);

    const btnLimpar = document.getElementById('muralBtnLimparNex');

    if (btnLimpar) {
      const meuUser = String(Drops.usernameAtual || '')
        .replace(/^@/, '')
        .toLowerCase()
        .trim();

      const donoLimpo = String(muralDonoUsernameNex || '')
        .replace(/^@/, '')
        .toLowerCase()
        .trim();

      const souDono = !!meuUser && !!donoLimpo && meuUser === donoLimpo;

      if (souDono) {
        btnLimpar.classList.remove('oculto');
      } else {
        btnLimpar.classList.add('oculto');
      }
    }

      modal.style.display = 'flex';

  if (typeof window.dropsEmpilharEstado === 'function') {
    window.dropsEmpilharEstado('mural', null);
  }

  setTimeout(async () => {
iniciarRolagemMuralNex();
  await carregarMuralSalvoNex();
}, 80);
  }
  
  function tentarFecharMuralNex() {
    if (!muralAlteradoNex) {
      fecharMuralNex();
      return;
    }

    const modal = document.getElementById('muralConfirmSairNex');
    if (modal) modal.style.display = 'flex';
  }

  function fecharMuralNex() {
    const modal = document.getElementById('modalMuralNex');
    if (modal) modal.style.display = 'none';

    const confirmModal = document.getElementById('muralConfirmSairNex');
    if (confirmModal) confirmModal.style.display = 'none';

      muralTextoEditandoNex = null;
  fecharModalTextoMuralNex();
  desregistrarSelecaoNex();

  muralDonoUsernameNex = null;
  muralAlteradoNex = false;
  }
  
// ============================================
// LIMPAR MURAL (só dono)
// ============================================

function abrirConfirmLimparMuralNex() {
  const modal = document.getElementById('muralConfirmLimparNex');
  if (modal) modal.style.display = 'flex';
}

function fecharConfirmLimparMuralNex() {
  const modal = document.getElementById('muralConfirmLimparNex');
  if (modal) modal.style.display = 'none';
}

async function confirmarLimparMuralNex() {
  fecharConfirmLimparMuralNex();

  const donoUsername = muralDonoUsernameNex || Drops.usernameAtual;
  if (!donoUsername) return;

  window.mostrarToastNex?.('Limpando mural...', 'info');

  let ok = false;

  if (typeof window.limparMuralSupabase === 'function') {
    ok = await window.limparMuralSupabase(donoUsername);
  }

  if (!ok) {
    window.mostrarToastNex?.('Falha ao limpar o mural.', 'erro');
    return;
  }

  const camada = document.getElementById('muralCamadaElementosNex');
  if (camada) camada.innerHTML = '';

  // (Tracos removidos)

  muralAlteradoNex = false;
  atualizarBotaoSalvarNex();

  window.mostrarToastNex?.('Mural limpo!', 'sucesso');
}

// ============================================
// PENDÊNCIAS / BOTÃO SALVAR
// ============================================

function marcarAlterado() {
  muralAlteradoNex = true;
  atualizarBotaoSalvarNex();
}

function temPendentesNex() {
  return muralAlteradoNex;
}

function atualizarBotaoSalvarNex() {
  const btn = document.getElementById('muralBtnSalvarNex');
  if (!btn) return;

  btn.disabled = !muralAlteradoNex;
}

// ============================================
// ROLAGEM
// ============================================

function iniciarRolagemMuralNex() {
  muralScrollEl = document.getElementById('muralScrollNex');
  muralLimiteInferiorEl = document.getElementById('muralLimiteInferiorNex');
  muralLimiteSuperiorEl = document.getElementById('muralLimiteSuperiorNex');

  if (!muralScrollEl) return;

  if (!muralRolagemIniciada) {
    muralRolagemIniciada = true;

    const setaCima = document.getElementById('muralSetaCimaNex');
    const setaBaixo = document.getElementById('muralSetaBaixoNex');

    if (setaCima) setaCima.addEventListener('click', () => rolarMuralNex(-1));
    if (setaBaixo) setaBaixo.addEventListener('click', () => rolarMuralNex(1));

    muralScrollEl.addEventListener('scroll', atualizarAvisosLimiteNex, {
      passive: true
    });
  }

  muralScrollEl.scrollTop = 0;
atualizarAvisosLimiteNex();
}

function rolarMuralNex(direcao) {
  if (!muralScrollEl) return;

  const passo = muralScrollEl.clientHeight * 0.55;
  const destino = muralScrollEl.scrollTop + passo * direcao;

  muralScrollEl.scrollTo({
    top: destino,
    behavior: 'smooth'
  });
}

function atualizarAvisosLimiteNex() {
  if (!muralScrollEl) return;

  const top = muralScrollEl.scrollTop;
  const height = muralScrollEl.scrollHeight;
  const visible = muralScrollEl.clientHeight;
  const tol = 4;

  if (muralLimiteSuperiorEl) {
    muralLimiteSuperiorEl.classList.toggle('visivel', top <= tol);
  }
  if (muralLimiteInferiorEl) {
    muralLimiteInferiorEl.classList.toggle(
      'visivel',
      top + visible >= height - tol
    );
  }
}
  
// ============================================
// FERRAMENTA TEXTO
// ============================================

function abrirModalTextoMuralNex() {
  const modal = document.getElementById('muralModalTextoNex');
  const input = document.getElementById('muralTextoInputNex');
  if (!modal || !input) return;

  if (muralTextoEditandoNex) {
    const conteudo = muralTextoEditandoNex.querySelector(
      '.mural-texto-conteudo-nex'
    );
    input.value = conteudo?.textContent || '';
  } else {
    input.value = '';
  }

  modal.style.display = 'flex';

  setTimeout(() => {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, 100);
}

function fecharModalTextoMuralNex() {
  const modal = document.getElementById('muralModalTextoNex');
  if (modal) modal.style.display = 'none';
  muralTextoEditandoNex = null;
}

function aplicarTextoMuralNex() {
  const input = document.getElementById('muralTextoInputNex');
  if (!input) return;

  const texto = input.value.trim();

  if (!texto) {
    fecharModalTextoMuralNex();
    return;
  }

  if (muralTextoEditandoNex) {
    const conteudo = muralTextoEditandoNex.querySelector(
      '.mural-texto-conteudo-nex'
    );
    if (conteudo) conteudo.textContent = texto;
  } else {
    criarTextoNoMuralNex(texto);
  }

  fecharModalTextoMuralNex();
  marcarAlterado();
}

function criarTextoNoMuralNex(texto, opcoes) {
  const canvas = document.getElementById('muralCanvasNex');
  const scroll = document.getElementById('muralScrollNex');
  const camada = document.getElementById('muralCamadaElementosNex');

  if (!canvas || !scroll || !camada) return null;

  const opts = opcoes || {};

  const scrollTop = scroll.scrollTop;
  const visibleHeight = scroll.clientHeight;
  const canvasWidth = canvas.clientWidth;

  const posX = opts.x != null ? opts.x : canvasWidth / 2;
  const posY = opts.y != null ? opts.y : scrollTop + visibleHeight / 2;

  const el = document.createElement('div');
  el.className = 'mural-texto-item-nex';
  el.style.left = posX + 'px';
  el.style.top = posY + 'px';
  el.style.transform = 'translate(-50%, -50%)';
  el.dataset.id =
    opts.id || 'txt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  el.dataset.baseTransform = 'translate(-50%, -50%)';

  const conteudo = document.createElement('span');
  conteudo.className = 'mural-texto-conteudo-nex';
  conteudo.textContent = texto;

  el.appendChild(conteudo);
  camada.appendChild(el);

  if (opts.escala != null || opts.rotacao != null) {
    transformacoesNex.set(el, {
      escala: opts.escala != null ? opts.escala : 1,
      rotacao: opts.rotacao != null ? opts.rotacao : 0
    });
    aplicarTransformacaoNex(el);
  }

  if (opts.travado) {
    el.classList.add('travado');
    el.dataset.travado = '1';
  } else {
    ativarInteracaoTextoMuralNex(el);
  }

  return el;
}

function editarTextoMuralNex(el) {
  if (el.dataset.travado === '1') return;
  editarTextoMuralInlineNex(el);
}

// ⚠️ NOVA FUNÇÃO: Edição direta no papel (igual ao Notas)
function editarTextoMuralInlineNex(el) {
  if (!el || el.dataset.travado === '1') return;

  const conteudo = el.querySelector('.mural-texto-conteudo-nex');
  if (!conteudo) return;

  // Desmarca a seleção enquanto edita
  el.classList.remove('selecionado');
  
  // Remove as alças do elemento
  el.querySelectorAll('.mural-alca-nex').forEach(a => a.remove());
  
  // Remove o menu fixo do topo
  const menuTopo = document.querySelector('.mural-menu-texto-nex');
  if (menuTopo) menuTopo.remove();

  // ⚠️ NOVO: Fecha o Painel Aa se ele estiver aberto (para o teclado subir limpo)
  const painelAa = document.getElementById('muralPainelAaNex');
  if (painelAa) painelAa.remove();

  // Limpa o placeholder se for o texto padrão
  const textoAtual = (conteudo.textContent || '').trim();
  if (textoAtual === 'Escreva algo...' || textoAtual === '2 toque para editar') {
    conteudo.textContent = '';
  }

  // Ativa edição
conteudo.contentEditable = 'true';
conteudo.style.outline = 'none';

// ⚠️ Rola a tela para cima antes de abrir o teclado
rolarTextoParaCimaMuralNex(el);

// ⚠️ CORREÇÃO: Foco IMEDIATO para o teclado abrir no celular
conteudo.focus();
  
  // Coloca o cursor no final do texto
  const range = document.createRange();
  const sel = window.getSelection();
  range.selectNodeContents(conteudo);
  range.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(range);

  // Finaliza quando clicar fora (perder o foco)
  const finalizarEdicao = () => {
    conteudo.removeEventListener('blur', finalizarEdicao);
    conteudo.contentEditable = 'false';

    const textoFinal = (conteudo.textContent || '').trim();
    if (!textoFinal) {
      conteudo.textContent = 'Escreva algo...';
    }

    marcarAlterado();
    selecionarTextoMuralNex(el); // Re-seleciona pra voltar as alças e o menu
  };

  conteudo.addEventListener('blur', finalizarEdicao);
}

// ============================================
// INTERAÇÃO COM TEXTO
// ============================================

function ativarInteracaoTextoMuralNex(el) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let moved = false;

  el.addEventListener('pointerdown', (e) => {
    if (el.dataset.travado === '1') return;
    if (e.button !== undefined && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    pointerId = e.pointerId;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    originLeft = parseFloat(el.style.left) || 0;
    originTop = parseFloat(el.style.top) || 0;

    try {
      el.setPointerCapture(pointerId);
    } catch (_) {}

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        if (!moved) {
          moved = true;
          muralAlteradoNex = true;
        }
      }

      el.style.left = originLeft + dx + 'px';
      el.style.top = originTop + dy + 'px';
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;

      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);

      try {
        el.releasePointerCapture(pointerId);
      } catch (_) {}

      pointerId = null;

      if (moved) {
        atualizarBotaoSalvarNex();
        return;
      }

      const agora = Date.now();

      if (
        ultimoToqueTextoNex.el === el &&
        agora - ultimoToqueTextoNex.time < 350
      ) {
        ultimoToqueTextoNex = { el: null, time: 0 };
        editarTextoMuralNex(el);
      } else {
        ultimoToqueTextoNex = { el, time: agora };
        selecionarTextoMuralNex(el);
      }
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  });
}

function selecionarTextoMuralNex(el) {
  document
    .querySelectorAll(
      '.mural-texto-item-nex.selecionado, .mural-foto-item-nex.selecionado'
    )
    .forEach((item) => {
      if (item !== el) {
        item.classList.remove('selecionado');
        // Remove alças dos outros
        item.querySelectorAll('.mural-alca-nex, .mural-menu-texto-nex').forEach(a => a.remove());
      }
    });

  if (el) {
    el.classList.add('selecionado');
    criarAlcasEMenuMuralNex(el); // ⚠️ Cria as novas alças e o menu
  }
  
  desregistrarSelecaoNex();
}

function deselecionarTudoMuralNex() {
  document
    .querySelectorAll(
      '.mural-texto-item-nex.selecionado, .mural-foto-item-nex.selecionado'
    )
    .forEach((item) => {
      item.classList.remove('selecionado');
      // Remove apenas as alças de dentro do texto/foto
      item.querySelectorAll('.mural-alca-nex').forEach(a => a.remove());
    });

  // ⚠️ Remove o menu fixo que fica no topo da área do mural
  const menuTopo = document.querySelector('.mural-menu-texto-nex');
  if (menuTopo) menuTopo.remove();

  // ⚠️ Fecha o painel Aa se estiver aberto
  const painelAa = document.getElementById('muralPainelAaNex');
  if (painelAa) painelAa.remove();

  desregistrarSelecaoNex();
}

// ⚠️ NOVA FUNÇÃO: Cria as alças e o menu FIXO no topo (diferente para texto e foto)
function criarAlcasEMenuMuralNex(el) {
  if (!el) return;
  
  // Remove alças antigas do elemento
  el.querySelectorAll('.mural-alca-nex').forEach(a => a.remove());
  // Remove menu antigo do topo do mural (se existir)
  const menuAntigo = document.querySelector('.mural-menu-texto-nex');
  if (menuAntigo) menuAntigo.remove();

  // Alças no elemento
  const alcaRot = document.createElement('div');
  alcaRot.className = 'mural-alca-nex mural-alca-rotacao-nex';
  
  const alcaRes = document.createElement('div');
  alcaRes.className = 'mural-alca-nex mural-alca-redimensionar-nex';

  el.appendChild(alcaRot);
  el.appendChild(alcaRes);

  // Verifica se é texto ou foto para montar o menu correto
  const isTexto = el.classList.contains('mural-texto-item-nex');

  const menu = document.createElement('div');
  menu.className = 'mural-menu-texto-nex';

  if (isTexto) {
    // Menu do Texto (Aa + Lixeira)
    menu.innerHTML = `
      <button type="button" class="btn-menu-aa" title="Formatar Texto">
        <span style="font-weight: 900; font-size: 14px;">Aa</span>
      </button>
      <div class="mural-menu-divisor-nex"></div>
      <button type="button" class="btn-menu-trash danger" title="Excluir">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `;
  } else {
    // Menu da Foto (Só Lixeira)
    menu.innerHTML = `
      <button type="button" class="btn-menu-trash danger" title="Excluir" style="padding: 6px 16px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    `;
  }

  // Adiciona o menu ao CONTAINER do mural (não gira junto)
  const muralArea = document.querySelector('.mural-area-wrap-nex');
  if (muralArea) {
    muralArea.appendChild(menu);
  } else {
    el.appendChild(menu); // Fallback
  }

  menu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('pointerdown', e => e.stopPropagation());
  });

  // Ação do Aa (Só existe se for texto)
  const btnAa = menu.querySelector('.btn-menu-aa');
  if (btnAa) {
    btnAa.addEventListener('click', (e) => {
      e.stopPropagation();
      document.activeElement.blur(); // Fecha o teclado
      abrirPainelAaMuralNex(el);
    });
  }

  // Ação da Lixeira
  const btnTrash = menu.querySelector('.btn-menu-trash');
  if (btnTrash) {
    btnTrash.addEventListener('click', (e) => {
      e.stopPropagation();
      el.remove();
      deselecionarTudoMuralNex();
      marcarAlterado();
    });
  }

      ativarAlcaRotacaoMuralNex(el, alcaRot);
  ativarAlcaRedimensionarMuralNex(el, alcaRes);
}

// ⚠️ NOVA FUNÇÃO: Rola o mural para cima para o texto não ficar escondido
function rolarTextoParaCimaMuralNex(el) {
  const scroll = document.getElementById('muralScrollNex');
  if (!scroll || !el) return;

  const elTop = parseFloat(el.style.top) || 0;
  const visibleHeight = scroll.clientHeight;
  
  // Calcula a rolagem para deixar o texto a uns 20% do topo da tela
  const targetScroll = Math.max(0, elTop - (visibleHeight * 0.2));
  
  scroll.scrollTo({
    top: targetScroll,
    behavior: 'smooth'
  });
}

// ⚠️ NOVA FUNÇÃO: Painel de formatação de texto do Mural (Igual ao Notas)
function abrirPainelAaMuralNex(el) {
  if (!el) return;

  // Remove painel antigo se existir
  const painelAntigo = document.getElementById('muralPainelAaNex');
  if (painelAntigo) painelAntigo.remove();

  const conteudo = el.querySelector('.mural-texto-conteudo-nex');
  if (!conteudo) return;

  const painel = document.createElement('div');
  painel.id = 'muralPainelAaNex';
  painel.className = 'mural-painel-aa aberto';

  painel.innerHTML = `
    <div class="mural-painel-aa-topo">
      <span>Aa — Estilo do texto</span>
      <button type="button" class="mural-painel-aa-fechar">✕</button>
    </div>

    <div class="mural-painel-secao">
      <span class="mural-painel-label">Fonte</span>
      <div class="mural-fontes-lista">
        <button type="button" class="mural-fonte-btn" data-fonte="'Caveat', cursive" style="font-family: 'Caveat', cursive;">Abc</button>
        <button type="button" class="mural-fonte-btn" data-fonte="'Inter', sans-serif" style="font-family: 'Inter', sans-serif;">Abc</button>
        <button type="button" class="mural-fonte-btn" data-fonte="Georgia, serif" style="font-family: Georgia, serif;">Abc</button>
        <button type="button" class="mural-fonte-btn" data-fonte="'Courier New', monospace" style="font-family: 'Courier New', monospace;">Abc</button>
      </div>
    </div>

    <div class="mural-painel-secao">
      <span class="mural-painel-label">Cor</span>
      <div class="mural-cores-lista">
        <button type="button" class="mural-cor-btn" data-cor="#1a1a1a" style="background:#1a1a1a;" title="Preto"></button>
        <button type="button" class="mural-cor-btn" data-cor="#ffffff" style="background:#ffffff; border: 1px solid #ccc;" title="Branco"></button>
        <button type="button" class="mural-cor-btn" data-cor="#ef4444" style="background:#ef4444;" title="Vermelho"></button>
        <button type="button" class="mural-cor-btn" data-cor="#f59e0b" style="background:#f59e0b;" title="Amarelo"></button>
        <button type="button" class="mural-cor-btn" data-cor="#22c55e" style="background:#22c55e;" title="Verde"></button>
        <button type="button" class="mural-cor-btn" data-cor="#2563eb" style="background:#2563eb;" title="Azul"></button>
        <button type="button" class="mural-cor-btn" data-cor="#8b5cf6" style="background:#8b5cf6;" title="Roxo"></button>
        <button type="button" class="mural-cor-btn" data-cor="#ec4899" style="background:#ec4899;" title="Rosa"></button>
      </div>
    </div>

    <div class="mural-painel-secao">
      <span class="mural-painel-label">Tamanho</span>
      <div class="mural-tamanho-linha">
        <button type="button" class="mural-tamanho-btn" data-acao="menos">−</button>
        <span class="mural-tamanho-valor" id="muralTamanhoValorNex">${parseInt(conteudo.style.fontSize) || 28}</span>
        <button type="button" class="mural-tamanho-btn" data-acao="mais">+</button>
      </div>
    </div>

    <div class="mural-painel-secao">
      <span class="mural-painel-label">Estilo</span>
      <div class="mural-estilos-linha">
        <button type="button" class="mural-estilo-btn" data-estilo="bold"><b>B</b></button>
        <button type="button" class="mural-estilo-btn" data-estilo="italic"><i>I</i></button>
        <button type="button" class="mural-estilo-btn" data-estilo="normal">N</button>
      </div>
    </div>

    <div class="mural-painel-secao">
      <span class="mural-painel-label">Alinhamento</span>
      <div class="mural-alinhamento-linha">
        <button type="button" class="mural-alinhamento-btn" data-align="left"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg></button>
        <button type="button" class="mural-alinhamento-btn" data-align="center"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="5" y1="18" x2="19" y2="18"/></svg></button>
        <button type="button" class="mural-alinhamento-btn" data-align="right"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg></button>
        <button type="button" class="mural-alinhamento-btn" data-align="justify"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
      </div>
    </div>
  `;

  document.querySelector('.mural-area-wrap-nex').appendChild(painel);

// ⚠️ Rola a tela para cima para o texto aparecer acima do painel
setTimeout(() => rolarTextoParaCimaMuralNex(el), 100);

// Função para fechar o painel
const fecharPainel = () => {
    painel.remove();
    document.removeEventListener('pointerdown', clickFora);
  };

  painel.querySelector('.mural-painel-aa-fechar').addEventListener('click', fecharPainel);

  // ⚠️ Lógica para fechar ao clicar fora do painel
const clickFora = (e) => {
  // Se clicou dentro do painel, ou no menu superior, ou no próprio texto, ignora
  if (
    painel.contains(e.target) || 
    e.target.closest('.mural-menu-texto-nex') || 
    el.contains(e.target)
  ) {
    return;
  }
  
  // Se clicou no fundo do mural, fecha o painel
  fecharPainel();
};
setTimeout(() => document.addEventListener('pointerdown', clickFora), 100);
  
  // Ações
  painel.querySelectorAll('.mural-fonte-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      conteudo.style.setProperty('font-family', btn.dataset.fonte, 'important');
      marcarAlterado();
    });
  });

  painel.querySelectorAll('.mural-cor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      conteudo.style.setProperty('color', btn.dataset.cor, 'important');
      marcarAlterado();
    });
  });

  painel.querySelectorAll('.mural-tamanho-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      let tam = parseInt(conteudo.style.fontSize) || 28;
      if (btn.dataset.acao === 'mais') tam = Math.min(100, tam + 2);
      if (btn.dataset.acao === 'menos') tam = Math.max(12, tam - 2);
      conteudo.style.setProperty('font-size', tam + 'px', 'important');
      document.getElementById('muralTamanhoValorNex').textContent = tam;
      marcarAlterado();
    });
  });

  painel.querySelectorAll('.mural-estilo-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.estilo === 'bold') {
        const isBold = conteudo.style.fontWeight === 'bold' || conteudo.style.fontWeight === '700';
        conteudo.style.setProperty('font-weight', isBold ? 'normal' : 'bold', 'important');
      } else if (btn.dataset.estilo === 'italic') {
        const isItalic = conteudo.style.fontStyle === 'italic';
        conteudo.style.setProperty('font-style', isItalic ? 'normal' : 'italic', 'important');
      } else {
        conteudo.style.setProperty('font-weight', 'normal', 'important');
        conteudo.style.setProperty('font-style', 'normal', 'important');
      }
      marcarAlterado();
    });
  });

  painel.querySelectorAll('.mural-alinhamento-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      conteudo.style.setProperty('text-align', btn.dataset.align, 'important');
      marcarAlterado();
    });
  });
}
  
// ============================================
// FERRAMENTA FOTO
// ============================================

function abrirSeletorFotoMuralNex() {
  const input = document.getElementById('muralInputFotoNex');
  if (!input) return;

  input.value = '';
  input.click();
}

function processarFotoMuralNex(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    window.mostrarToastNex?.('Escolha uma imagem.', 'erro');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    criarFotoNoMuralNex(e.target.result);
    marcarAlterado();
  };

  reader.onerror = function () {
    window.mostrarToastNex?.('Falha ao ler a imagem.', 'erro');
  };

  reader.readAsDataURL(file);
  event.target.value = '';
}

function criarFotoNoMuralNex(dataUrl, opcoes) {
  const canvas = document.getElementById('muralCanvasNex');
  const scroll = document.getElementById('muralScrollNex');
  const camada = document.getElementById('muralCamadaElementosNex');

  if (!canvas || !scroll || !camada) return null;

  const opts = opcoes || {};

  const scrollTop = scroll.scrollTop;
  const visibleHeight = scroll.clientHeight;
  const canvasWidth = canvas.clientWidth;

  const posX = opts.x != null ? opts.x : canvasWidth / 2;
  const posY = opts.y != null ? opts.y : scrollTop + visibleHeight / 2;

  const larguraInicial =
    opts.largura != null
      ? opts.largura
      : Math.min(220, Math.max(120, canvasWidth * 0.4));

  const el = document.createElement('div');
  el.className = 'mural-foto-item-nex';
  el.style.left = posX + 'px';
  el.style.top = posY + 'px';
  el.style.width = larguraInicial + 'px';
  el.style.height = larguraInicial + 'px';
  el.style.transform = 'translate(-50%, -50%)';
  el.dataset.id =
    opts.id || 'foto_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  el.dataset.baseTransform = 'translate(-50%, -50%)';
  el.dataset.dataUrl = dataUrl;

  const img = document.createElement('img');
  img.className = 'mural-foto-conteudo-nex';
  img.src = dataUrl;
  img.alt = 'Sticker';

  el.appendChild(img);
  camada.appendChild(el);

  if (opts.escala != null || opts.rotacao != null) {
    transformacoesNex.set(el, {
      escala: opts.escala != null ? opts.escala : 1,
      rotacao: opts.rotacao != null ? opts.rotacao : 0
    });
    aplicarTransformacaoNex(el);
  }

  if (opts.travado) {
    el.classList.add('travado');
    el.dataset.travado = '1';
  } else {
    ativarInteracaoFotoMuralNex(el);
  }

  return el;
}

function ativarInteracaoFotoMuralNex(el) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let moved = false;

  el.addEventListener('pointerdown', (e) => {
    if (el.dataset.travado === '1') return;
    if (e.button !== undefined && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    pointerId = e.pointerId;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    originLeft = parseFloat(el.style.left) || 0;
    originTop = parseFloat(el.style.top) || 0;

    try {
      el.setPointerCapture(pointerId);
    } catch (_) {}

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        if (!moved) {
          moved = true;
          muralAlteradoNex = true;
        }
      }

      el.style.left = originLeft + dx + 'px';
      el.style.top = originTop + dy + 'px';
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;

      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);

      try {
        el.releasePointerCapture(pointerId);
      } catch (_) {}

      pointerId = null;

      if (moved) {
        atualizarBotaoSalvarNex();
        return;
      }

      selecionarFotoMuralNex(el);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  });
}

function selecionarFotoMuralNex(el) {
  document
    .querySelectorAll(
      '.mural-foto-item-nex.selecionado, .mural-texto-item-nex.selecionado'
    )
    .forEach((item) => {
      if (item !== el) {
        item.classList.remove('selecionado');
        item.querySelectorAll('.mural-alca-nex').forEach(a => a.remove());
      }
    });

  if (el) {
    el.classList.add('selecionado');
    criarAlcasEMenuMuralNex(el); // ⚠️ Adiciona as alças e o menu (só lixeira)
  }

  desregistrarSelecaoNex();
}
  
// ============================================
// (FERRAMENTA CANETA REMOVIDA)
// ============================================
  
// ============================================
// CONTROLES DE SELEÇÃO
// ============================================

function obterTransformacaoNex(el) {
  if (!transformacoesNex.has(el)) {
    transformacoesNex.set(el, { escala: 1, rotacao: 0 });
  }
  return transformacoesNex.get(el);
}

function aplicarTransformacaoNex(el) {
  const t = obterTransformacaoNex(el);
  const baseTransform = el.dataset.baseTransform || 'translate(-50%, -50%)';
  el.style.transform =
    baseTransform + ' rotate(' + t.rotacao + 'deg) scale(' + t.escala + ')';
}

function registrarElementoSelecionadoNex(el) {
  if (elementoSelecionadoNex && elementoSelecionadoNex !== el) {
    elementoSelecionadoNex.classList.remove('selecionado');
  }

  elementoSelecionadoNex = el;

  const controles = document.getElementById('muralControlesSelecaoNex');
  if (controles) {
    controles.style.display = el ? 'flex' : 'none';
  }

  if (el && !el.dataset.baseTransform) {
    el.dataset.baseTransform = 'translate(-50%, -50%)';
  }
}

function desregistrarSelecaoNex() {
  if (elementoSelecionadoNex) {
    elementoSelecionadoNex.classList.remove('selecionado');
  }

  elementoSelecionadoNex = null;

  const controles = document.getElementById('muralControlesSelecaoNex');
  if (controles) controles.style.display = 'none';
}

function podeEditarElementoSelecionadoNex() {
  if (!elementoSelecionadoNex) return false;
  if (elementoSelecionadoNex.dataset.travado === '1') return false;
  return true;
}

function aumentarElementoNex() {
  if (!podeEditarElementoSelecionadoNex()) return;

  const t = obterTransformacaoNex(elementoSelecionadoNex);
  t.escala = Math.min(3, t.escala + 0.15);
  aplicarTransformacaoNex(elementoSelecionadoNex);
  marcarAlterado();
}

function diminuirElementoNex() {
  if (!podeEditarElementoSelecionadoNex()) return;

  const t = obterTransformacaoNex(elementoSelecionadoNex);
  t.escala = Math.max(0.3, t.escala - 0.15);
  aplicarTransformacaoNex(elementoSelecionadoNex);
  marcarAlterado();
}

function girarElementoNex() {
  if (!podeEditarElementoSelecionadoNex()) return;

  const t = obterTransformacaoNex(elementoSelecionadoNex);
  t.rotacao = (t.rotacao + 15) % 360;
  aplicarTransformacaoNex(elementoSelecionadoNex);
  marcarAlterado();
}

function girarElementoInversoNex() {
  if (!podeEditarElementoSelecionadoNex()) return;

  const t = obterTransformacaoNex(elementoSelecionadoNex);
  t.rotacao = (t.rotacao - 15 + 360) % 360;
  aplicarTransformacaoNex(elementoSelecionadoNex);
  marcarAlterado();
}

function excluirElementoNex() {
  if (!podeEditarElementoSelecionadoNex()) return;

  elementoSelecionadoNex.remove();
  desregistrarSelecaoNex();
  marcarAlterado();
}

// ============================================
// SALVAR / CARREGAR
// ============================================

function coletarEstadoMuralNex() {
  const camada = document.getElementById('muralCamadaElementosNex');
  if (!camada) return null;

  const elementos = [];

  camada.querySelectorAll('.mural-texto-item-nex:not(.travado)').forEach((el) => {
    const t = obterTransformacaoNex(el);
    const conteudo = el.querySelector('.mural-texto-conteudo-nex');

    elementos.push({
      tipo: 'texto',
      id: el.dataset.id,
      x: parseFloat(el.style.left) || 0,
      y: parseFloat(el.style.top) || 0,
      texto: conteudo?.textContent || '',
      escala: t.escala,
      rotacao: t.rotacao
    });
  });

  camada.querySelectorAll('.mural-foto-item-nex:not(.travado)').forEach((el) => {
    const t = obterTransformacaoNex(el);
    const img = el.querySelector('.mural-foto-conteudo-nex');

    elementos.push({
      tipo: 'foto',
      id: el.dataset.id,
      x: parseFloat(el.style.left) || 0,
      y: parseFloat(el.style.top) || 0,
      largura: parseFloat(el.style.width) || 160,
      dataUrl: img?.src || el.dataset.dataUrl || '',
      escala: t.escala,
      rotacao: t.rotacao
    });
  });

  return {
  elementos,
  versao: 1,
  atualizadoEm: Date.now()
};
}

async function salvarMuralNex() {
  if (!muralAlteradoNex) return;

  const estado = coletarEstadoMuralNex();
  if (!estado) return;

  window.mostrarToastNex?.('Salvando...', 'info');

  const donoUsername = muralDonoUsernameNex || Drops.usernameAtual;

  let ok = false;

  if (typeof window.salvarMuralSupabase === 'function') {
    ok = await window.salvarMuralSupabase(donoUsername, estado);
  }

  if (!ok) {
    window.mostrarToastNex?.('Falha ao salvar a arte.', 'erro');
    return;
  }

  muralAlteradoNex = false;

  desregistrarSelecaoNex();
  atualizarBotaoSalvarNex();

  window.mostrarToastNex?.('Arte salva!', 'sucesso');
  window.feedbackNex?.muralSalvo?.();
}
  
async function carregarMuralSalvoNex() {
  const camada = document.getElementById('muralCamadaElementosNex');
  if (!camada) return;

  camada.innerHTML = '';

  const donoUsername = muralDonoUsernameNex || Drops.usernameAtual;

  console.log('🎨 Carregando mural de:', donoUsername);

  let contribuicoes = [];

  if (typeof window.buscarMuralSupabase === 'function' && donoUsername) {
    contribuicoes = await window.buscarMuralSupabase(donoUsername);
    console.log('🎨 Contribuições recebidas:', contribuicoes.length);
  } else {
    console.warn('⚠️ Sem donoUsername ou sem buscarMuralSupabase');
  }

  if (!Array.isArray(contribuicoes) || !contribuicoes.length) {
  muralAlteradoNex = false;
    atualizarBotaoSalvarNex();
    return;
  }

  const meuUser = String(Drops.usernameAtual || '').toLowerCase().trim();

  contribuicoes.forEach((contrib) => {
    const dados = contrib.dados || {};
    const autor = String(contrib.autor_username || '').toLowerCase().trim();
    const ehMinha = autor === meuUser;

    if (Array.isArray(dados.elementos)) {
      dados.elementos.forEach((item) => {
        if (item.tipo === 'texto') {
          const el = criarTextoNoMuralNex(item.texto, {
            id: item.id,
            x: item.x,
            y: item.y,
            escala: item.escala,
            rotacao: item.rotacao,
            travado: !ehMinha
          });

          if (el) {
            el.dataset.autorId = autor;
            el.dataset.autorNome = contrib.autor_nome || autor;

            if (ehMinha) {
              el.classList.add('meu-elemento');
            } else {
              el.classList.add('elemento-outro');
            }
          }
        } else if (item.tipo === 'foto' && item.dataUrl) {
          const el = criarFotoNoMuralNex(item.dataUrl, {
            id: item.id,
            x: item.x,
            y: item.y,
            largura: item.largura,
            escala: item.escala,
            rotacao: item.rotacao,
            travado: !ehMinha
          });

          if (el) {
            el.dataset.autorId = autor;
            el.dataset.autorNome = contrib.autor_nome || autor;

            if (ehMinha) {
              el.classList.add('meu-elemento');
            } else {
              el.classList.add('elemento-outro');
            }
          }
        }
      });
    }

    });

  // ⚠️ Adiciona clique nos elementos de OUTROS autores → mostra balão
  const camada2 = document.getElementById('muralCamadaElementosNex');

  if (camada2) {
    camada2
      .querySelectorAll('.mural-texto-item-nex.travado, .mural-foto-item-nex.travado')
      .forEach((el) => {
        if (!el.dataset.autorId) return;

        el.style.cursor = 'pointer';

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          mostrarBalaoAutorNex(el);
        });
      });
  }

  muralAlteradoNex = false;
  atualizarBotaoSalvarNex();
}
  
  
  // ============================================
  // EVENT LISTENERS
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
  
    const btnFecharTopo = document.querySelector('.mural-topo-fechar-nex');
    if (btnFecharTopo) {
      const novoBtn = btnFecharTopo.cloneNode(true);
      btnFecharTopo.parentNode.replaceChild(novoBtn, btnFecharTopo);
      novoBtn.addEventListener('click', tentarFecharMuralNex);
    }

    const btnSalvar = document.getElementById('muralBtnSalvarNex');
    if (btnSalvar) {
      btnSalvar.addEventListener('click', salvarMuralNex);
    }

    const btnLimparMural = document.getElementById('muralBtnLimparNex');
    if (btnLimparMural) {
      btnLimparMural.addEventListener('click', abrirConfirmLimparMuralNex);
    }

    const btnConfirmLimparOk = document.getElementById('muralConfirmLimparOkNex');
    if (btnConfirmLimparOk) {
      btnConfirmLimparOk.addEventListener('click', confirmarLimparMuralNex);
    }

    const btnConfirmLimparCancelar = document.getElementById('muralConfirmLimparCancelarNex');
    if (btnConfirmLimparCancelar) {
      btnConfirmLimparCancelar.addEventListener('click', fecharConfirmLimparMuralNex);
    }

    const btnTextoOriginal = document.getElementById('muralBtnTextoNex');
if (btnTextoOriginal) {
  // ⚠️ Remove o evento antigo clonando o botão
  const novoBtnTexto = btnTextoOriginal.cloneNode(true);
  btnTextoOriginal.parentNode.replaceChild(novoBtnTexto, btnTextoOriginal);

  // ⚠️ NOVO EVENTO: Cria o texto direto no papel (igual ao Notas)
  novoBtnTexto.addEventListener('click', () => {
    const el = criarTextoNoMuralNex('Escreva algo...');
    if (el) {
      selecionarTextoMuralNex(el);
      marcarAlterado();
    }
  });
}

    const btnFoto = document.getElementById('muralBtnFotoNex');
    if (btnFoto) {
      btnFoto.addEventListener('click', abrirSeletorFotoMuralNex);
    }

    const inputFoto = document.getElementById('muralInputFotoNex');
    if (inputFoto) {
      inputFoto.addEventListener('change', processarFotoMuralNex);
    }

    // (Eventos da caneta removidos)

    const btnMenos = document.getElementById('muralBtnMenosNex');
    if (btnMenos) btnMenos.addEventListener('click', diminuirElementoNex);

    const btnMais = document.getElementById('muralBtnMaisNex');
    if (btnMais) btnMais.addEventListener('click', aumentarElementoNex);

    const btnGirar = document.getElementById('muralBtnGirarNex');
    if (btnGirar) btnGirar.addEventListener('click', girarElementoNex);

    const btnGirarInverso = document.getElementById('muralBtnGirarInversoNex');
    if (btnGirarInverso) {
      btnGirarInverso.addEventListener('click', girarElementoInversoNex);
    }

    const btnLixeira = document.getElementById('muralBtnLixeiraNex');
    if (btnLixeira) btnLixeira.addEventListener('click', excluirElementoNex);

    const btnCancelar = document.getElementById('muralTextoCancelarNex');
    if (btnCancelar) {
      btnCancelar.addEventListener('click', fecharModalTextoMuralNex);
    }

    const btnAplicar = document.getElementById('muralTextoAplicarNex');
    if (btnAplicar) {
      btnAplicar.addEventListener('click', aplicarTextoMuralNex);
    }

    const btnSalvarSair = document.getElementById('muralConfirmSalvarSairNex');
    if (btnSalvarSair) {
      btnSalvarSair.addEventListener('click', async () => {
        await salvarMuralNex();
        fecharMuralNex();
      });
    }

    const btnSairSemSalvar = document.getElementById('muralConfirmSairSemSalvarNex');
    if (btnSairSemSalvar) {
      btnSairSemSalvar.addEventListener('click', () => {
        fecharMuralNex();
      });
    }

    const btnContinuar = document.getElementById('muralConfirmContinuarNex');
    if (btnContinuar) {
      btnContinuar.addEventListener('click', () => {
        const modal = document.getElementById('muralConfirmSairNex');
        if (modal) modal.style.display = 'none';
      });
    }

    const scrollMural = document.getElementById('muralScrollNex');
    if (scrollMural) {
      scrollMural.addEventListener('pointerdown', (e) => {
        if (
          !e.target.closest('.mural-texto-item-nex') &&
          !e.target.closest('.mural-foto-item-nex')
        ) {
          deselecionarTudoMuralNex();
        }
      });
    }

    atualizarBotaoSalvarNex();
  });

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.abrirMuralNex = abrirMuralNex;
  window.fecharMuralNex = fecharMuralNex;
  window.abrirConfirmLimparMuralNex = abrirConfirmLimparMuralNex;
  window.fecharConfirmLimparMuralNex = fecharConfirmLimparMuralNex;
  window.confirmarLimparMuralNex = confirmarLimparMuralNex;
  window.tentarFecharMuralNex = tentarFecharMuralNex;
  window.rolarMuralNex = rolarMuralNex;
  window.atualizarAvisosLimiteNex = atualizarAvisosLimiteNex;

  window.abrirModalTextoMuralNex = abrirModalTextoMuralNex;
  window.fecharModalTextoMuralNex = fecharModalTextoMuralNex;
  window.aplicarTextoMuralNex = aplicarTextoMuralNex;
  window.criarTextoNoMuralNex = criarTextoNoMuralNex;
  window.deselecionarTudoMuralNex = deselecionarTudoMuralNex;

  window.abrirSeletorFotoMuralNex = abrirSeletorFotoMuralNex;
  window.processarFotoMuralNex = processarFotoMuralNex;
  window.criarFotoNoMuralNex = criarFotoNoMuralNex;

  // (Exportações da caneta removidas)
  
  window.aumentarElementoNex = aumentarElementoNex;
  window.diminuirElementoNex = diminuirElementoNex;
  window.girarElementoNex = girarElementoNex;
  window.girarElementoInversoNex = girarElementoInversoNex;
  window.excluirElementoNex = excluirElementoNex;

  window.salvarMuralNex = salvarMuralNex;
  window.carregarMuralSalvoNex = carregarMuralSalvoNex;
  window.coletarEstadoMuralNex = coletarEstadoMuralNex;
  window.atualizarBotaoSalvarNex = atualizarBotaoSalvarNex;
  window.temPendentesNex = temPendentesNex;

// ============================================
// MATEMÁTICA: ROTAÇÃO E REDIMENSIONAMENTO
// ============================================

function ativarAlcaRotacaoMuralNex(el, alca) {
  let pointerId = null;
  let centroX = 0, centroY = 0;
  let anguloInicial = 0, rotacaoInicial = 0;

  alca.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const rect = el.getBoundingClientRect();
    centroX = rect.left + rect.width / 2;
    centroY = rect.top + rect.height / 2;

    const dx = e.clientX - centroX;
    const dy = e.clientY - centroY;
    anguloInicial = Math.atan2(dy, dx) * (180 / Math.PI);
    
    const t = obterTransformacaoNex(el);
    rotacaoInicial = t.rotacao;

    pointerId = e.pointerId;
    try { alca.setPointerCapture(pointerId); } catch (_) {}

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;

      const dx2 = ev.clientX - centroX;
      const dy2 = ev.clientY - centroY;
      const anguloAtual = Math.atan2(dy2, dx2) * (180 / Math.PI);

      let delta = anguloAtual - anguloInicial;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      const tAtual = obterTransformacaoNex(el);
      tAtual.rotacao = rotacaoInicial + delta;
      aplicarTransformacaoNex(el);
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      alca.removeEventListener('pointermove', onMove);
      alca.removeEventListener('pointerup', onUp);
      alca.removeEventListener('pointercancel', onUp);
      try { alca.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;
      marcarAlterado();
    };

    alca.addEventListener('pointermove', onMove);
    alca.addEventListener('pointerup', onUp);
    alca.addEventListener('pointercancel', onUp);
  });
}

function ativarAlcaRedimensionarMuralNex(el, alca) {
  let pointerId = null;
  let centroX = 0, centroY = 0;
  let distInicial = 0, escalaInicial = 1;

  alca.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const rect = el.getBoundingClientRect();
    centroX = rect.left + rect.width / 2;
    centroY = rect.top + rect.height / 2;

    distInicial = Math.hypot(e.clientX - centroX, e.clientY - centroY) || 1;
    
    const t = obterTransformacaoNex(el);
    escalaInicial = t.escala;

    pointerId = e.pointerId;
    try { alca.setPointerCapture(pointerId); } catch (_) {}

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;

      const dist = Math.hypot(ev.clientX - centroX, ev.clientY - centroY);
      const fator = dist / distInicial;

      const tAtual = obterTransformacaoNex(el);
      // Limita a escala entre 0.3x (30%) e 4x (400%)
      tAtual.escala = Math.max(0.3, Math.min(4, escalaInicial * fator));
      
      aplicarTransformacaoNex(el);
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      alca.removeEventListener('pointermove', onMove);
      alca.removeEventListener('pointerup', onUp);
      alca.removeEventListener('pointercancel', onUp);
      try { alca.releasePointerCapture(pointerId); } catch (_) {}
      pointerId = null;
      marcarAlterado();
    };

    alca.addEventListener('pointermove', onMove);
    alca.addEventListener('pointerup', onUp);
    alca.addEventListener('pointercancel', onUp);
  });
}
  
  console.log('📌 19-mural.js carregado');

})();