/* ============================================
   30-FOTO.JS
   Editor de Foto do Drops — exclusivo
   
   Não compartilha estado com o 13-editor.js.
   Reaproveita apenas funções utilitárias.
   
   Depende de: 00-config.js, 03-utils.js, 12-mydrops.js, 13-editor.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // ESTADO DO EDITOR DE FOTO
  // ============================================

  let fotoContadorTexto = 0;
  let fotoTextoSelecionado = null;
  let fotoElementoSelecionado = null;
  let fotoTextoEditando = null;
  let fotoPosicaoOriginal = null;
  let fotoUltimoToque = { el: null, tempo: 0 };
  let fotoPainelAaAberto = false;
  let fotoAtualDataURL = null;

  // ============================================
  // HELPERS
  // ============================================

  function fotoAberto() {
    const editor = document.getElementById('fotoEditorNex');
    return editor && editor.classList.contains('aberto');
  }

  function fotoPalco() {
    return document.getElementById('fotoPalcoNex');
  }

  function fotoPapel() {
    return document.getElementById('fotoPapelNex');
  }

  function fotoCamada() {
    return document.getElementById('fotoCamadaNex');
  }

  // ============================================
  // ABRIR FOTO
  // ============================================

  function abrirFotoNex(dataURL) {
    const editor = document.getElementById('fotoEditorNex');
    if (!editor) {
      console.warn('⚠️ fotoEditorNex não encontrado');
      return;
    }

    // Limpa estado
    const camada = fotoCamada();
    if (camada) camada.innerHTML = '';

    fotoContadorTexto = 0;
    fotoTextoSelecionado = null;
    fotoElementoSelecionado = null;
    fotoTextoEditando = null;
    fotoPosicaoOriginal = null;
    fotoPainelAaAberto = false;
    fotoAtualDataURL = dataURL || null;

    // Esconde lixeira
    esconderLixeiraFotoNex();

    // Limpa legenda
    const inputLegenda = document.getElementById('legendaMyDropsInput');
    if (inputLegenda) {
      inputLegenda.value = '';
      inputLegenda.style.height = 'auto';
    }

    const contador = document.getElementById('legendaContadorMyDrops');
    if (contador) {
      contador.textContent = '0/500';
    }

    // Aplica a foto no papel
    const papel = fotoPapel();
    if (papel) {
      if (dataURL) {
        papel.style.backgroundImage = `url('${dataURL}')`;
        papel.style.backgroundSize = 'cover';
        papel.style.backgroundPosition = 'center';
        papel.style.backgroundRepeat = 'no-repeat';
        papel.style.backgroundColor = '#000';
      } else {
        papel.style.backgroundImage = 'none';
        papel.style.backgroundColor = '#08111f';
      }
    }

    // Abre
    editor.classList.add('aberto');
    document.body.classList.add('foto-aberto');

    // Configura legenda
    configurarLegendaFotoNex();

    // Foco Total
    atualizarFocoTotalFotoNex();
  }

  // ============================================
  // FECHAR FOTO
  // ============================================

  function fecharFotoNex() {
    const editor = document.getElementById('fotoEditorNex');
    if (!editor) return;

    // Encerra edição
    if (fotoTextoEditando) {
      finalizarEdicaoTextoFotoNex();
    }

    // Fecha painel Aa
    fecharPainelAaFotoNex();

    // Remove alças
    if (fotoElementoSelecionado) {
      if (typeof window.removerAlcasMyDropsNex === 'function') {
        window.removerAlcasMyDropsNex(fotoElementoSelecionado);
      }
    }

    // Esconde lixeira
    esconderLixeiraFotoNex();

    // Limpa estado
    fotoTextoSelecionado = null;
    fotoElementoSelecionado = null;
    fotoTextoEditando = null;
    fotoPosicaoOriginal = null;
    fotoAtualDataURL = null;

    // Fecha editor
    editor.classList.remove('aberto');
    document.body.classList.remove('foto-aberto');

    // Limpa a camada
    const camada = fotoCamada();
    if (camada) camada.innerHTML = '';
  }

  // ============================================
// CRIAÇÃO DE TEXTO
// ============================================

function criarTextoFotoNex() {
  const camada = fotoCamada();
  if (!camada) return;

  fotoContadorTexto += 1;

  const el = document.createElement('div');
  el.className = 'video-editor-text-mydrops-nex';

  const body = document.createElement('div');
  body.className = 'video-editor-text-body-mydrops-nex';
  body.textContent = '2 toque para editar';
  body.style.textAlign = 'center';
  body.style.color = '#ffffff';
  body.style.fontSize = '28px';
  body.style.fontWeight = '500';
  el.dataset.align = 'center';

  el.appendChild(body);

  el.dataset.id = 'foto_txt_' + fotoContadorTexto;
  el.dataset.temaIndex = '0';
  el.dataset.scale = '1';
  el.dataset.rotation = '0';

  el.style.left = '50%';
  el.style.top = '50%';
  el.style.transformOrigin = 'center center';
  el.style.transform = 'translate(-50%, -50%) rotate(0deg) scale(1)';

  // Tema padrão (sem caixa)
  if (typeof window.aplicarTemaTextoMyDropsNex === 'function') {
    window.aplicarTemaTextoMyDropsNex(el, 0);
  }

  camada.appendChild(el);

  ativarArrasteTextoFotoNex(el);
  selecionarTextoFotoNex(el);
}

// ============================================
// ARRASTAR TEXTO
// ============================================

function ativarArrasteTextoFotoNex(el) {
  const camada = fotoCamada();
  if (!camada) return;

  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;
  let moved = false;

  el.addEventListener('pointerdown', (e) => {
    const body = el.querySelector('.video-editor-text-body-mydrops-nex');
    if (body && body.contentEditable === 'true') return;
    if (e.target.closest('.editor-alca-nex')) return;
    if (e.button !== undefined && e.button !== 0) return;

    e.preventDefault();
    selecionarTextoFotoNex(el);

    pointerId = e.pointerId;
    moved = false;

    const camadaRect = camada.getBoundingClientRect();
    const rect = el.getBoundingClientRect();

    startX = e.clientX;
    startY = e.clientY;
    originLeft = rect.left - camadaRect.left + rect.width / 2;
    originTop = rect.top - camadaRect.top + rect.height / 2;

    try { el.setPointerCapture(pointerId); } catch (_) {}

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;

      el.style.left = `${originLeft + dx}px`;
      el.style.top = `${originTop + dy}px`;

      if (typeof window.atualizarTransformacaoItemMyDropsNex === 'function') {
        window.atualizarTransformacaoItemMyDropsNex(el);
      }
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;

      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);

      try { el.releasePointerCapture(pointerId); } catch (_) {}

      if (!moved) {
        tratarDuploToqueTextoFotoNex(el);
      }
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  });
}

// ============================================
// DUPLO TOQUE → EDIÇÃO NO TOPO
// ============================================

function tratarDuploToqueTextoFotoNex(el) {
  const agora = Date.now();

  if (
    fotoUltimoToque.el === el &&
    agora - fotoUltimoToque.tempo < 350
  ) {
    fotoUltimoToque.el = null;
    fotoUltimoToque.tempo = 0;
    editarTextoFotoNex(el);
    return;
  }

  fotoUltimoToque.el = el;
  fotoUltimoToque.tempo = agora;
}

// ============================================
// SELEÇÃO DE TEXTO
// ============================================

function selecionarTextoFotoNex(el) {
  if (!el) return;

  document
    .querySelectorAll('#fotoCamadaNex .is-selected')
    .forEach((item) => {
      if (item !== el) {
        item.classList.remove('is-selected');
        if (typeof window.removerAlcasMyDropsNex === 'function') {
          window.removerAlcasMyDropsNex(item);
        }
      }
    });

  fotoTextoSelecionado = el;
  fotoElementoSelecionado = el;

  el.classList.add('is-selected');

  if (typeof window.criarAlcasMyDropsNex === 'function') {
    window.criarAlcasMyDropsNex(el);
  }

  mostrarLixeiraFotoNex(el);
  atualizarFocoTotalFotoNex();
}

// ============================================
// SELEÇÃO DE FOTO (sticker por cima)
// ============================================

function selecionarFotoFotoNex(el) {
  if (!el) return;

  document
    .querySelectorAll('#fotoCamadaNex .is-selected')
    .forEach((item) => {
      if (item !== el) {
        item.classList.remove('is-selected');
        if (typeof window.removerAlcasMyDropsNex === 'function') {
          window.removerAlcasMyDropsNex(item);
        }
      }
    });

  fotoTextoSelecionado = null;
  fotoElementoSelecionado = el;

  el.classList.add('is-selected');

  if (typeof window.criarAlcasMyDropsNex === 'function') {
    window.criarAlcasMyDropsNex(el);
  }

  mostrarLixeiraFotoNex(el);
  atualizarFocoTotalFotoNex();
}

// ============================================
// DESSELECIONAR TUDO
// ============================================

function desselecionarTudoFotoNex() {
  document
    .querySelectorAll('#fotoCamadaNex .is-selected')
    .forEach((item) => {
      item.classList.remove('is-selected');
      if (typeof window.removerAlcasMyDropsNex === 'function') {
        window.removerAlcasMyDropsNex(item);
      }
    });

  fotoTextoSelecionado = null;
  fotoElementoSelecionado = null;

  esconderLixeiraFotoNex();
  fecharPainelAaFotoNex();
  atualizarFocoTotalFotoNex();
}

// ============================================
// LIXEIRA DO FOTO (própria, igual Notas)
// ============================================

function garantirLixeiraFotoNex() {
  let btn = document.getElementById('fotoLixeiraNex');

  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'fotoLixeiraNex';
    btn.textContent = '🗑️';
    btn.setAttribute('aria-label', 'Excluir');

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const alvo = btn.__alvoParaApagar || fotoElementoSelecionado;
      if (!alvo) return;

      if (typeof window.removerAlcasMyDropsNex === 'function') {
        window.removerAlcasMyDropsNex(alvo);
      }

      alvo.remove();

      fotoTextoSelecionado = null;
      fotoElementoSelecionado = null;
      btn.__alvoParaApagar = null;

      esconderLixeiraFotoNex();
      atualizarFocoTotalFotoNex();
    });

    const camada = fotoCamada();
    if (camada) camada.appendChild(btn);
  }

  return btn;
}

function mostrarLixeiraFotoNex(el) {
  if (!el) return;
  const btn = garantirLixeiraFotoNex();
  if (!btn) return;

  btn.__alvoParaApagar = el;

  // Lixeira FIXA no canto superior esquerdo do papel
  btn.style.left = '16px';
  btn.style.top = '16px';
  btn.classList.add('visivel');
}

function esconderLixeiraFotoNex() {
  const btn = document.getElementById('fotoLixeiraNex');
  if (btn) btn.classList.remove('visivel');
}

// ============================================
// FOCO TOTAL (botões contextuais)
// ============================================

function atualizarFocoTotalFotoNex() {
  const editor = document.getElementById('fotoEditorNex');
  if (!editor) return;

  editor.classList.remove(
    'modo-foto-texto-selecionado',
    'modo-foto-foto-selecionada'
  );

  const sel = fotoElementoSelecionado;
  if (!sel) return;

  if (sel.classList.contains('video-editor-text-mydrops-nex')) {
    editor.classList.add('modo-foto-texto-selecionado');
  } else if (sel.classList.contains('video-editor-photo-mydrops-nex')) {
    editor.classList.add('modo-foto-foto-selecionada');
  }
}

// ============================================
// EDIÇÃO NO TOPO (igual Notas)
// ============================================

function editarTextoFotoNex(el) {
  if (!el) return;
  if (fotoTextoEditando) return;

  const body = el.querySelector('.video-editor-text-body-mydrops-nex');
  if (!body) return;

  fotoTextoEditando = el;
  fotoPosicaoOriginal = {
    left: el.style.left,
    top: el.style.top
  };

  el.style.transition = 'left 0.25s ease, top 0.25s ease, transform 0.25s ease';
  el.style.left = '50%';
  el.style.top = '60px';

  el.classList.add('foto-editando-topo');
  el.dataset.editando = '1';

  if (typeof window.removerAlcasMyDropsNex === 'function') {
    window.removerAlcasMyDropsNex(el);
  }
  esconderLixeiraFotoNex();

  body.contentEditable = 'true';
  body.style.outline = 'none';

  const textoAtual = (body.textContent || '').trim();
  if (
    textoAtual === '2 toque para editar' ||
    textoAtual === '✍🏼 Escreva algo bonito...'
  ) {
    body.textContent = '';
  }

  setTimeout(() => {
    body.focus();

    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(body);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, 120);

  const onBlur = () => {
    body.removeEventListener('blur', onBlur);
    finalizarEdicaoTextoFotoNex();
  };

  body.addEventListener('blur', onBlur);
}

function finalizarEdicaoTextoFotoNex() {
  const el = fotoTextoEditando;
  if (!el) return;

  const body = el.querySelector('.video-editor-text-body-mydrops-nex');

  if (body) {
    body.contentEditable = 'false';
    body.style.outline = '';
  }

  if (fotoPosicaoOriginal) {
    el.style.left = fotoPosicaoOriginal.left || el.style.left;
    el.style.top = fotoPosicaoOriginal.top || el.style.top;
  }

  setTimeout(() => {
    el.style.transition = '';
  }, 300);

  el.classList.remove('foto-editando-topo');
  delete el.dataset.editando;

  const textoFinal = (body?.textContent || '').trim();
  if (!textoFinal && body) {
    body.textContent = '2 toque para editar';
  }

  fotoTextoEditando = null;
  fotoPosicaoOriginal = null;

  selecionarTextoFotoNex(el);
}

    // ============================================
  // PAINEL Aa
  // ============================================

  const FOTO_FONTES = [
    { id: 'caveat',  css: "'Caveat', 'Comic Sans MS', cursive", label: 'Abc' },
    { id: 'inter',   css: "'Inter', 'Segoe UI', sans-serif",     label: 'Abc' },
    { id: 'georgia', css: "Georgia, 'Times New Roman', serif",   label: 'Abc' },
    { id: 'mono',    css: "'Courier New', monospace",            label: 'Abc' }
  ];

  const FOTO_CORES = [
    '#ffffff', '#1a1a1a', '#ef4444', '#f59e0b',
    '#22c55e', '#2563eb', '#8b5cf6', '#ec4899'
  ];

  function criarPainelAaFotoNex() {
    if (document.getElementById('fotoPainelAaNex')) return;

    const painel = document.createElement('div');
    painel.id = 'fotoPainelAaNex';

    painel.innerHTML = `
      <div class="foto-painel-topo">
        <span class="foto-painel-titulo">Aa — Estilo do texto</span>
        <button type="button" class="foto-painel-fechar" aria-label="Fechar">✕</button>
      </div>

      <div class="foto-painel-secao">
        <span class="foto-painel-label">Fonte</span>
        <div class="foto-fontes-lista">
          ${FOTO_FONTES.map((f) => `
            <button type="button" class="foto-fonte-btn" data-fonte="${f.id}"
                    style="font-family:${f.css};">
              ${f.label}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="foto-painel-secao">
        <span class="foto-painel-label">Cor</span>
        <div class="foto-cores-lista">
          ${FOTO_CORES.map((c) => `
            <button type="button" class="foto-cor-btn" data-cor="${c}"
                    style="background:${c};"></button>
          `).join('')}
        </div>
      </div>

      <div class="foto-painel-secao">
        <span class="foto-painel-label">Tamanho</span>
        <div class="foto-tamanho-linha">
          <button type="button" class="foto-tamanho-btn" data-acao="menos">−</button>
          <span class="foto-tamanho-valor" id="fotoTamanhoValorNex">28</span>
          <button type="button" class="foto-tamanho-btn" data-acao="mais">+</button>
        </div>
      </div>

      <div class="foto-painel-secao">
        <span class="foto-painel-label">Estilo</span>
        <div class="foto-estilos-linha">
          <button type="button" class="foto-estilo-btn" data-estilo="bold"><b>B</b></button>
          <button type="button" class="foto-estilo-btn" data-estilo="italic"><i>I</i></button>
          <button type="button" class="foto-estilo-btn" data-estilo="normal">N</button>
        </div>
      </div>
    `;

    document.body.appendChild(painel);

    painel.querySelector('.foto-painel-fechar')
      .addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, true);
    painel.querySelector('.foto-painel-fechar')
      .addEventListener('click', (e) => {
        e.stopPropagation();
        fecharPainelAaFotoNex();
      });

    painel.querySelectorAll('.foto-fonte-btn').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, true);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        aplicarFonteAaFotoNex(b.dataset.fonte);
      });
    });

    painel.querySelectorAll('.foto-cor-btn').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, true);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        aplicarCorAaFotoNex(b.dataset.cor);
      });
    });

    painel.querySelectorAll('.foto-tamanho-btn').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, true);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        ajustarTamanhoAaFotoNex(b.dataset.acao);
      });
    });

    painel.querySelectorAll('.foto-estilo-btn').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, true);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        aplicarEstiloAaFotoNex(b.dataset.estilo);
      });
    });
  }

  function abrirPainelAaFotoNex() {
    if (!fotoElementoSelecionado) return;
    if (!fotoElementoSelecionado.classList.contains('video-editor-text-mydrops-nex')) return;

    criarPainelAaFotoNex();

    const painel = document.getElementById('fotoPainelAaNex');
    if (!painel) return;

    painel.__bodyAlvo = fotoElementoSelecionado.querySelector('.video-editor-text-body-mydrops-nex');

    painel.classList.add('aberto');
    fotoPainelAaAberto = true;

    sincronizarPainelAaFotoNex();
  }

  function fecharPainelAaFotoNex() {
    const painel = document.getElementById('fotoPainelAaNex');
    if (painel) {
      painel.classList.remove('aberto');
      painel.__bodyAlvo = null;
    }
    fotoPainelAaAberto = false;
  }

  function fotoBodySelecionado() {
    const painel = document.getElementById('fotoPainelAaNex');

    if (painel && painel.classList.contains('aberto') && painel.__bodyAlvo) {
      return painel.__bodyAlvo;
    }

    const el = fotoElementoSelecionado;
    if (!el) return null;
    return el.querySelector('.video-editor-text-body-mydrops-nex');
  }

  function sincronizarPainelAaFotoNex() {
    const body = fotoBodySelecionado();
    if (!body) return;

    const painel = document.getElementById('fotoPainelAaNex');
    if (!painel) return;

    const fonteAtual = body.style.fontFamily || '';
    painel.querySelectorAll('.foto-fonte-btn').forEach((b) => {
      const f = FOTO_FONTES.find((x) => x.id === b.dataset.fonte);
      b.classList.toggle(
        'ativo',
        f && fonteAtual.includes(f.css.split(',')[0].replace(/'/g, '').trim())
      );
    });

    const corAtual = body.style.color || '#ffffff';
    painel.querySelectorAll('.foto-cor-btn').forEach((b) => {
      b.classList.toggle(
        'ativo',
        b.dataset.cor.toLowerCase() === corAtual.toLowerCase()
      );
    });

    const tam = parseFloat(body.style.fontSize) || 28;
    const elTam = document.getElementById('fotoTamanhoValorNex');
    if (elTam) elTam.textContent = String(Math.round(tam));

    const isBold = body.style.fontWeight === 'bold' || body.style.fontWeight === '700';
    const isItalic = body.style.fontStyle === 'italic';

    painel.querySelector('[data-estilo="bold"]')?.classList.toggle('ativo', isBold);
    painel.querySelector('[data-estilo="italic"]')?.classList.toggle('ativo', isItalic);
  }

  function aplicarFonteAaFotoNex(id) {
    const body = fotoBodySelecionado();
    if (!body) return;

    const f = FOTO_FONTES.find((x) => x.id === id);
    if (!f) return;

    body.style.setProperty('font-family', f.css, 'important');
    sincronizarPainelAaFotoNex();
  }

  function aplicarCorAaFotoNex(cor) {
    const body = fotoBodySelecionado();
    if (!body) return;

    body.style.setProperty('color', cor, 'important');
    sincronizarPainelAaFotoNex();
  }

  function ajustarTamanhoAaFotoNex(acao) {
    const body = fotoBodySelecionado();
    if (!body) return;

    const atual = parseFloat(body.style.fontSize) || 28;
    let novo = atual;

    if (acao === 'mais') novo = Math.min(72, atual + 2);
    if (acao === 'menos') novo = Math.max(12, atual - 2);

    body.style.setProperty('font-size', novo + 'px', 'important');
    sincronizarPainelAaFotoNex();
  }

  function aplicarEstiloAaFotoNex(estilo) {
    const body = fotoBodySelecionado();
    if (!body) return;

    if (estilo === 'bold') {
      const isBold = body.style.fontWeight === 'bold';
      body.style.setProperty('font-weight', isBold ? 'normal' : 'bold', 'important');
    } else if (estilo === 'italic') {
      const isItalic = body.style.fontStyle === 'italic';
      body.style.setProperty('font-style', isItalic ? 'normal' : 'italic', 'important');
    } else {
      body.style.setProperty('font-weight', 'normal', 'important');
      body.style.setProperty('font-style', 'normal', 'important');
    }

    sincronizarPainelAaFotoNex();
  }

    // ============================================
  // TEMA (cicla os temas existentes)
  // ============================================

  function ciclarTemaFotoNex() {
    const el = fotoTextoSelecionado;
    if (!el) return;

    const temas = [
      '', 'tema-branco', 'tema-escuro', 'tema-azul',
      'tema-verde', 'tema-amarelo', 'tema-rosa',
      'tema-roxo', 'tema-neon', 'tema-papel', 'tema-vidro'
    ];

    const atual = Number(el.dataset.temaIndex || 0);
    const proximo = (atual + 1) % temas.length;

    if (typeof window.aplicarTemaTextoMyDropsNex === 'function') {
      window.aplicarTemaTextoMyDropsNex(el, proximo);
    }

    el.dataset.temaIndex = String(proximo);
  }

  // ============================================
  // FOTO STICKER (adiciona fotos por cima)
  // ============================================

  function abrirSeletorStickerFotoNex() {
    const input = document.getElementById('fotoInputStickerNex');
    if (!input) return;

    input.value = '';
    input.click();
  }

  function processarStickerFotoNex(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      window.mostrarToastNex?.('Escolha uma imagem.', 'erro');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = function (e) {
      criarStickerFotoNex(e.target.result);
    };

    reader.onerror = function () {
      window.mostrarToastNex?.('Falha ao ler a imagem.', 'erro');
    };

    reader.readAsDataURL(file);
    event.target.value = '';
  }

  function criarStickerFotoNex(dataURL) {
    const camada = fotoCamada();
    if (!camada) return;

    const el = document.createElement('div');
    el.className = 'video-editor-photo-mydrops-nex';
    el.dataset.scale = '1';
    el.dataset.rotation = '0';
    el.style.left = '50%';
    el.style.top = '50%';
    el.style.transform = 'translate(-50%, -50%) rotate(0deg) scale(1)';
    el.style.transformOrigin = 'center center';
    el.style.width = '180px';

    el.innerHTML = `
      <div class="video-editor-photo-body-mydrops-nex">
        <img src="${dataURL}" alt="Foto">
      </div>
    `;

    camada.appendChild(el);

    ativarArrasteStickerFotoNex(el);
    selecionarFotoFotoNex(el);
  }

  function ativarArrasteStickerFotoNex(el) {
    const camada = fotoCamada();
    if (!camada) return;

    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    let moved = false;

    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.editor-alca-nex')) return;
      if (e.button !== undefined && e.button !== 0) return;

      e.preventDefault();
      selecionarFotoFotoNex(el);

      pointerId = e.pointerId;
      moved = false;

      const camadaRect = camada.getBoundingClientRect();
      const rect = el.getBoundingClientRect();

      startX = e.clientX;
      startY = e.clientY;
      originLeft = rect.left - camadaRect.left + rect.width / 2;
      originTop = rect.top - camadaRect.top + rect.height / 2;

      try { el.setPointerCapture(pointerId); } catch (_) {}

      const onMove = (ev) => {
        if (ev.pointerId !== pointerId) return;

        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;

        el.style.left = `${originLeft + dx}px`;
        el.style.top = `${originTop + dy}px`;

        if (typeof window.atualizarTransformacaoItemMyDropsNex === 'function') {
          window.atualizarTransformacaoItemMyDropsNex(el);
        }
      };

      const onUp = (ev) => {
        if (ev.pointerId !== pointerId) return;

        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);

        try { el.releasePointerCapture(pointerId); } catch (_) {}

        if (!moved) selecionarFotoFotoNex(el);
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });
  }

  // ============================================
  // LEGENDA
  // ============================================

function configurarLegendaFotoNex() {
  const textarea = document.getElementById('legendaMyDropsInput');
  if (!textarea) return;

  const contador = document.getElementById('legendaContadorMyDrops');

  if (textarea.__fotoInputListener) {
    textarea.removeEventListener('input', textarea.__fotoInputListener);
  }

  const ajustar = () => {
    textarea.style.height = 'auto';
    const altura = Math.min(textarea.scrollHeight, 60);
    textarea.style.height = altura + 'px';

    if (contador) {
      const len = textarea.value.length;
      contador.textContent = `${len}/500`;
      contador.classList.toggle('visivel', len >= 400);
    }
  };

  textarea.__fotoInputListener = ajustar;
  textarea.addEventListener('input', ajustar);
  ajustar();
}

  // ============================================
  // BOTÃO PUBLICAR
  // ============================================

  function publicarFotoNex() {
    if (fotoTextoEditando) {
      finalizarEdicaoTextoFotoNex();
    }

    const inputLegenda = document.getElementById('legendaMyDropsInput');
    const legenda = (inputLegenda?.value || '').trim();

    window.__fotoLegendaTemporaria = legenda;

    if (typeof window.abrirModalDuracaoPublicacaoMyDropsNex === 'function') {
      window.abrirModalDuracaoPublicacaoMyDropsNex('foto');
    }
  }

    // ============================================
  // SALVAR COMO PNG (com cápsula + borda dupla)
  // ============================================

  async function salvarFotoComoPngNex() {
    const editor = document.getElementById('fotoEditorNex');
    const papel = fotoPapel();
    if (!editor || !papel) return;

    if (typeof window.html2canvas !== 'function') {
      window.mostrarToastNex?.('Sistema de captura indisponível.', 'erro');
      return;
    }

    if (fotoTextoEditando) {
      finalizarEdicaoTextoFotoNex();
    }

    desselecionarTudoFotoNex();

    const barra = document.getElementById('fotoBarraTopoNex');
    const barraCtx = document.getElementById('fotoBarraContextoNex');
    const rodape = document.getElementById('fotoLegendaRowNex');

    const barraDisplay = barra?.style.display;
    const barraCtxDisplay = barraCtx?.style.display;
    const rodapeDisplay = rodape?.style.display;

    if (barra) barra.style.display = 'none';
    if (barraCtx) barraCtx.style.display = 'none';
    if (rodape) rodape.style.display = 'none';

    const capsula = garantirCapsulaMarcaFotoNex();
    if (capsula) capsula.classList.add('visivel');

    editor.classList.add('foto-capturando-borda');

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    try {
      const canvas = await window.html2canvas(papel, {
        backgroundColor: null,
        useCORS: true,
        scale: Math.min(2, window.devicePixelRatio || 1),
        logging: false
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          window.mostrarToastNex?.('Falha ao gerar imagem.', 'erro');
          return;
        }

        const dataStr = new Date().toISOString().slice(0, 10);
        const nomeArquivo = `Drops_foto_${dataStr}.png`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);

        window.mostrarToastNex?.('Foto salva! 💾', 'sucesso');
      }, 'image/png');
    } catch (err) {
      console.error('Erro ao salvar Foto:', err);
      window.mostrarToastNex?.('Falha ao salvar a Foto.', 'erro');
    } finally {
      if (barra) barra.style.display = barraDisplay || '';
      if (barraCtx) barraCtx.style.display = barraCtxDisplay || '';
      if (rodape) rodape.style.display = rodapeDisplay || '';

      if (capsula) capsula.classList.remove('visivel');
      editor.classList.remove('foto-capturando-borda');
    }
  }

  // ============================================
  // CÁPSULA DE MARCA
  // ============================================

  function garantirCapsulaMarcaFotoNex() {
    const papel = fotoPapel();
    if (!papel) return null;

    let cap = document.getElementById('fotoCapsulaMarcaNex');
    if (cap) return cap;

    cap = document.createElement('div');
    cap.id = 'fotoCapsulaMarcaNex';

    const meuUser = String(window.Drops?.usernameAtual || '')
      .replace(/^@/, '')
      .trim();

    const nome = localStorage.getItem('drops_nome') || 'Usuário';

    const escapar = (txt) =>
      String(txt || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    cap.innerHTML = `
      <span class="capsula-icone">📌</span>
      <span>Drops</span>
      <span class="capsula-sep">·</span>
      <span>${escapar(nome)}</span>
      <span class="capsula-sep">·</span>
      <span class="capsula-user">@${escapar(meuUser || 'usuario')}</span>
    `;

    papel.appendChild(cap);
    return cap;
  }

  // ============================================
  // OBSERVER DE SELEÇÃO
  // ============================================

  let fotoObserver = null;

  function iniciarObserverFotoNex() {
    if (fotoObserver) return;

    fotoObserver = new MutationObserver(() => {
      if (!fotoAberto()) return;

      const camada = fotoCamada();
      if (!camada) return;

      const selecionado = camada.querySelector(
        '.video-editor-text-mydrops-nex.is-selected, ' +
        '.video-editor-photo-mydrops-nex.is-selected'
      );

      if (selecionado !== fotoElementoSelecionado) {
        if (fotoElementoSelecionado) {
          if (typeof window.removerAlcasMyDropsNex === 'function') {
            window.removerAlcasMyDropsNex(fotoElementoSelecionado);
          }
        }

        fotoElementoSelecionado = selecionado || null;

        if (selecionado) {
          if (typeof window.criarAlcasMyDropsNex === 'function') {
            window.criarAlcasMyDropsNex(selecionado);
          }
        }

        atualizarFocoTotalFotoNex();
      }
    });

    fotoObserver.observe(document.body, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  // ============================================
  // BARRA TOPO — DELEGAÇÃO DE EVENTOS
  // ============================================

  function configurarBarraFotoNex() {
    const barraPrincipal = document.getElementById('fotoBarraTopoNex');
    const barraContexto = document.getElementById('fotoBarraContextoNex');

    if (!barraPrincipal) {
      console.warn('⚠️ Barra principal de Foto não encontrada');
    }

    if (!barraContexto) {
      console.warn('⚠️ Barra contexto de Foto não encontrada');
    }

    function handlerCliqueBotao(e) {
      const btn = e.target.closest('.foto-btn-topo');
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const id = btn.id;

      if (id === 'fotoBtnTextoNex') {
        criarTextoFotoNex();
      } else if (id === 'fotoBtnTemaNex') {
        ciclarTemaFotoNex();
      } else if (id === 'fotoBtnAaNex') {
        abrirPainelAaFotoNex();
      } else if (id === 'fotoBtnFotoNex') {
        abrirSeletorStickerFotoNex();
      } else if (id === 'fotoBtnSalvarNex') {
        salvarFotoComoPngNex();
      } else if (id === 'fotoBtnSairNex') {
        fecharFotoNex();
      }
    }

    if (barraPrincipal && !barraPrincipal.__fotoListenerAtivo) {
      barraPrincipal.__fotoListenerAtivo = true;
      barraPrincipal.addEventListener('click', handlerCliqueBotao);
    }

    if (barraContexto && !barraContexto.__fotoListenerAtivo) {
      barraContexto.__fotoListenerAtivo = true;
      barraContexto.addEventListener('click', handlerCliqueBotao);
    }
  }

  // ============================================
  // INPUT DE STICKER
  // ============================================

  function configurarInputStickerFotoNex() {
    const input = document.getElementById('fotoInputStickerNex');
    if (!input) return;

    if (input.__fotoListenerAtivo) return;
    input.__fotoListenerAtivo = true;

    input.addEventListener('change', processarStickerFotoNex);
  }

  // ============================================
  // BOTÃO PUBLICAR
  // ============================================

  function configurarBotaoPublicarFotoNex() {
    const btn = document.getElementById('fotoBtnPublicarNex');
    if (!btn) return;

    if (btn.__fotoListenerAtivo) return;
    btn.__fotoListenerAtivo = true;

    btn.addEventListener('click', publicarFotoNex);
  }

  // ============================================
  // TOQUE FORA → DESSELEÇÃO
  // ============================================

  function configurarToqueForaFotoNex() {
    const papel = fotoPapel();
    if (!papel) return;

    if (papel.__fotoListenerFora) return;
    papel.__fotoListenerFora = true;

    papel.addEventListener('pointerdown', (e) => {
      if (fotoTextoEditando) return;

      if (e.target.closest('.editor-alca-nex')) return;
      if (e.target.closest('#fotoLixeiraNex')) return;
      if (e.target.closest('#fotoCapsulaMarcaNex')) return;
      if (e.target.closest('.video-editor-text-mydrops-nex')) return;
      if (e.target.closest('.video-editor-photo-mydrops-nex')) return;

      desselecionarTudoFotoNex();
    }, true);
  }

  // ============================================
  // TECLADO — AJUSTA PALCO
  // ============================================

  function configurarTecladoFotoNex() {
    if (!window.visualViewport) return;
    if (window.__fotoTecladoConfigurado) return;
    window.__fotoTecladoConfigurado = true;

    const ajustar = () => {
      const editor = document.getElementById('fotoEditorNex');
      if (!editor || !editor.classList.contains('aberto')) return;

      const alturaVisivel = window.visualViewport.height;
      const alturaJanela = window.innerHeight;

      const tecladoAberto = alturaJanela - alturaVisivel > 150;

      const palco = document.getElementById('fotoPalcoNex');
      const rodape = document.getElementById('fotoLegendaRowNex');

      if (tecladoAberto) {
        if (palco) palco.style.bottom = `${alturaJanela - alturaVisivel + 80}px`;
        if (rodape) {
          rodape.style.opacity = '0';
          rodape.style.pointerEvents = 'none';
        }
      } else {
        if (palco) palco.style.bottom = '90px';
        if (rodape) {
          rodape.style.opacity = '1';
          rodape.style.pointerEvents = 'auto';
        }
      }
    };

    window.visualViewport.addEventListener('resize', ajustar);
    window.visualViewport.addEventListener('scroll', ajustar);
  }

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  function inicializarFotoNex() {
    criarPainelAaFotoNex();

    configurarBarraFotoNex();
    configurarInputStickerFotoNex();
    configurarBotaoPublicarFotoNex();
    configurarToqueForaFotoNex();
    configurarTecladoFotoNex();

    iniciarObserverFotoNex();

    console.log('📷 30-foto.js inicializado');
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(inicializarFotoNex, 350);
  });

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.abrirFotoNex = abrirFotoNex;
  window.fecharFotoNex = fecharFotoNex;
  window.criarTextoFotoNex = criarTextoFotoNex;
  window.selecionarTextoFotoNex = selecionarTextoFotoNex;
  window.selecionarFotoFotoNex = selecionarFotoFotoNex;
  window.desselecionarTudoFotoNex = desselecionarTudoFotoNex;
  window.editarTextoFotoNex = editarTextoFotoNex;
  window.finalizarEdicaoTextoFotoNex = finalizarEdicaoTextoFotoNex;
  window.ciclarTemaFotoNex = ciclarTemaFotoNex;
  window.abrirPainelAaFotoNex = abrirPainelAaFotoNex;
  window.fecharPainelAaFotoNex = fecharPainelAaFotoNex;
  window.abrirSeletorStickerFotoNex = abrirSeletorStickerFotoNex;
  window.publicarFotoNex = publicarFotoNex;
  window.salvarFotoComoPngNex = salvarFotoComoPngNex;
  window.atualizarFocoTotalFotoNex = atualizarFocoTotalFotoNex;
  window.mostrarLixeiraFotoNex = mostrarLixeiraFotoNex;
  window.esconderLixeiraFotoNex = esconderLixeiraFotoNex;

  // ============================================
  // INTERCEPTA A FUNÇÃO ANTIGA (a partir daqui,
  // TUDO que chamava abrirEditorFotoMyDropsNex
  // passa a usar a nova abrirFotoNex)
  // ============================================

  window.abrirEditorFotoMyDropsNex = abrirFotoNex;

  // ============================================
  // DEBUG
  // ============================================

  console.log('📷 30-foto.js carregado');

})();