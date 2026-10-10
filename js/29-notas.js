/* ============================================
   29-NOTAS.JS
   Editor de Notas do Drops — exclusivo
   
   Não compartilha estado com o 13-editor.js.
   Reaproveita apenas funções utilitárias.
   
   Depende de: 00-config.js, 03-utils.js, 12-mydrops.js, 13-editor.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // ESTADO DO EDITOR DE NOTAS
  // ============================================

  let notasContadorTexto = 0;

  let notasTextoSelecionado = null;
  let notasElementoSelecionado = null;
  let notasTextoEditando = null;
  let notasPosicaoOriginal = null;
  let notasUltimoToque = { el: null, tempo: 0 };
  let notasPainelAaAberto = false;

  // ============================================
  // HELPERS
  // ============================================

  function notasAberto() {
    const editor = document.getElementById('notasEditorNex');
    return editor && editor.classList.contains('aberto');
  }

  function notasLayer() {
    return document.getElementById('notasCamadaNex');
  }

  function notasPapel() {
    return document.getElementById('notasPapelNex');
  }

  // ============================================
  // ABRIR NOTAS
  // ============================================

  function abrirNotasNex() {
    const editor = document.getElementById('notasEditorNex');
    if (!editor) {
      console.warn('⚠️ notasEditorNex não encontrado');
      return;
    }

    // Limpa estado
    const layer = notasLayer();
    if (layer) layer.innerHTML = '';

    notasContadorTexto = 0;
    notasTextoSelecionado = null;
    notasElementoSelecionado = null;
    notasTextoEditando = null;
    notasPosicaoOriginal = null;
    notasPainelAaAberto = false;

    // Limpa lixeira
    esconderLixeiraNotasNex();

    // Limpa legenda
    const inputLegenda = document.getElementById('notasLegendaInputNex');
    if (inputLegenda) {
      inputLegenda.value = '';
      inputLegenda.style.height = 'auto';
    }

    const contador = document.getElementById('notasLegendaContadorNex');
    if (contador) {
      contador.textContent = '0/500';
      contador.classList.remove('visivel');
    }

    // Reset do papel
    const papel = notasPapel();
    if (papel) {
      papel.style.backgroundColor = '';
      papel.style.backgroundImage = '';
      papel.style.backgroundSize = '';
      papel.style.backgroundPosition = '';
      papel.style.backgroundRepeat = '';
    }

    // Abre
    editor.classList.add('aberto');
    document.body.classList.add('notas-aberto');

    // Foco Total
    atualizarFocoTotalNex();

    // Configura legenda
    configurarLegendaNotasNex();

    // Cria o texto inicial
    setTimeout(() => {
      criarTextoNotasNex();
    }, 120);
  }

  // ============================================
  // FECHAR NOTAS
  // ============================================

  function fecharNotasNex() {
    const editor = document.getElementById('notasEditorNex');
    if (!editor) return;

    // Encerra edição inline
    if (notasTextoEditando) {
      finalizarEdicaoTextoNotasNex();
    }

    // Fecha painel Aa
    fecharPainelAaNex();

    // Remove alças
    if (notasElementoSelecionado) {
      if (typeof window.removerAlcasMyDropsNex === 'function') {
        window.removerAlcasMyDropsNex(notasElementoSelecionado);
      }
    }

    // Esconde lixeira
    esconderLixeiraNotasNex();

    // Limpa estado
    notasTextoSelecionado = null;
    notasElementoSelecionado = null;
    notasTextoEditando = null;
    notasPosicaoOriginal = null;

    // Fecha editor
    editor.classList.remove('aberto');
    document.body.classList.remove('notas-aberto');

    // Limpa a camada
    const layer = notasLayer();
    if (layer) layer.innerHTML = '';
  }

  // ============================================
  // CRIAÇÃO DE TEXTO
  // ============================================

  function criarTextoNotasNex() {
    const layer = notasLayer();
    if (!layer) return;

    notasContadorTexto += 1;

    const el = document.createElement('div');
    el.className = 'video-editor-text-mydrops-nex';

    const body = document.createElement('div');
    body.className = 'video-editor-text-body-mydrops-nex';
    body.textContent = '2 toque para editar';
    body.style.textAlign = 'center';
    body.style.color = '#1a1a1a';
    body.style.fontSize = '28px';
    body.style.fontWeight = '500';
    el.dataset.align = 'center';

    el.appendChild(body);

    el.dataset.id = 'nota_txt_' + notasContadorTexto;
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

    layer.appendChild(el);

    ativarArrasteTextoNotasNex(el);
    selecionarTextoNotasNex(el);
  }

  // ============================================
  // ARRASTAR TEXTO
  // ============================================

  function ativarArrasteTextoNotasNex(el) {
    const layer = notasLayer();
    if (!layer) return;

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
      selecionarTextoNotasNex(el);

      pointerId = e.pointerId;
      moved = false;

      const layerRect = layer.getBoundingClientRect();
      const rect = el.getBoundingClientRect();

      startX = e.clientX;
      startY = e.clientY;
      originLeft = rect.left - layerRect.left + rect.width / 2;
      originTop = rect.top - layerRect.top + rect.height / 2;

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
          tratarDuploToqueTextoNotasNex(el);
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

  function tratarDuploToqueTextoNotasNex(el) {
    const agora = Date.now();

    if (
      notasUltimoToque.el === el &&
      agora - notasUltimoToque.tempo < 350
    ) {
      notasUltimoToque.el = null;
      notasUltimoToque.tempo = 0;

      editarTextoNotasNex(el);
      return;
    }

    notasUltimoToque.el = el;
    notasUltimoToque.tempo = agora;
  }

  // ============================================
// SELEÇÃO DE TEXTO
// ============================================

function selecionarTextoNotasNex(el) {
  if (!el) return;

  // Desseleciona outros
  document
    .querySelectorAll('#notasCamadaNex .is-selected')
    .forEach((item) => {
      if (item !== el) {
        item.classList.remove('is-selected');
        if (typeof window.removerAlcasMyDropsNex === 'function') {
          window.removerAlcasMyDropsNex(item);
        }
      }
    });

  notasTextoSelecionado = el;
  notasElementoSelecionado = el;

  el.classList.add('is-selected');

  // Cria alças ➕ e ↻
  if (typeof window.criarAlcasMyDropsNex === 'function') {
    window.criarAlcasMyDropsNex(el);
  }

  // Mostra lixeira
  mostrarLixeiraNotasNex(el);

  // Foco Total
  atualizarFocoTotalNex();
}

// ============================================
// SELEÇÃO DE FOTO
// ============================================

function selecionarFotoNotasNex(el) {
  if (!el) return;

  document
    .querySelectorAll('#notasCamadaNex .is-selected')
    .forEach((item) => {
      if (item !== el) {
        item.classList.remove('is-selected');
        if (typeof window.removerAlcasMyDropsNex === 'function') {
          window.removerAlcasMyDropsNex(item);
        }
      }
    });

  notasTextoSelecionado = null;
  notasElementoSelecionado = el;

  el.classList.add('is-selected');

  if (typeof window.criarAlcasMyDropsNex === 'function') {
    window.criarAlcasMyDropsNex(el);
  }

  // Mostra lixeira
  mostrarLixeiraNotasNex(el);

  atualizarFocoTotalNex();
}

// ============================================
// DESSSELECIONAR TUDO
// ============================================

function desselecionarTudoNotasNex() {
  document
    .querySelectorAll('#notasCamadaNex .is-selected')
    .forEach((item) => {
      item.classList.remove('is-selected');
      if (typeof window.removerAlcasMyDropsNex === 'function') {
        window.removerAlcasMyDropsNex(item);
      }
    });

  notasTextoSelecionado = null;
  notasElementoSelecionado = null;

  esconderLixeiraNotasNex();
  fecharPainelAaNex();
  atualizarFocoTotalNex();
}

// ============================================
// LIXEIRA DO NOTAS (própria, independente)
// ============================================

function garantirLixeiraNotasNex() {
  let btn = document.getElementById('notasLixeiraNex');

  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'notasLixeiraNex';
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

      const alvo = btn.__alvoParaApagar || notasElementoSelecionado;
      if (!alvo) return;

      if (typeof window.removerAlcasMyDropsNex === 'function') {
        window.removerAlcasMyDropsNex(alvo);
      }

      alvo.remove();

      notasTextoSelecionado = null;
      notasElementoSelecionado = null;
      btn.__alvoParaApagar = null;

      esconderLixeiraNotasNex();
      atualizarFocoTotalNex();
    });

    // Anexa no LAYER (mesmo sistema de coordenadas dos elementos)
    const layer = notasLayer();
    if (layer) layer.appendChild(btn);
  }

  return btn;
}

function mostrarLixeiraNotasNex(el) {
  if (!el) return;
  const btn = garantirLixeiraNotasNex();
  if (!btn) return;

  // Guarda a referência do elemento pra apagar
  btn.__alvoParaApagar = el;

  // ⚠️ Lixeira FIXA no canto superior esquerdo do papel
  btn.style.left = '16px';
  btn.style.top = '16px';
  btn.classList.add('visivel');
}
  

function esconderLixeiraNotasNex() {
  const btn = document.getElementById('notasLixeiraNex');
  if (btn) btn.classList.remove('visivel');
}

// ============================================
// FOCO TOTAL (botões contextuais)
// ============================================

function atualizarFocoTotalNex() {
  const editor = document.getElementById('notasEditorNex');
  if (!editor) return;

  editor.classList.remove(
    'modo-notas-texto-selecionado',
    'modo-notas-foto-selecionada'
  );

  const sel = notasElementoSelecionado;
  if (!sel) return;

  if (sel.classList.contains('video-editor-text-mydrops-nex')) {
    editor.classList.add('modo-notas-texto-selecionado');
  } else if (sel.classList.contains('video-editor-photo-mydrops-nex')) {
    editor.classList.add('modo-notas-foto-selecionada');
  }
}

// ============================================
// EDIÇÃO NO TOPO
// ============================================

function editarTextoNotasNex(el) {
  if (!el) return;
  if (notasTextoEditando) return;

  const body = el.querySelector('.video-editor-text-body-mydrops-nex');
  if (!body) return;

  notasTextoEditando = el;
  notasPosicaoOriginal = {
    left: el.style.left,
    top: el.style.top
  };

  // Sobe pro topo do papel
  el.style.transition = 'left 0.25s ease, top 0.25s ease, transform 0.25s ease';
  el.style.left = '50%';
  el.style.top = '60px';

  el.classList.add('nota-editando-topo');
  el.dataset.editando = '1';

  // Remove alças e lixeira durante a edição
  if (typeof window.removerAlcasMyDropsNex === 'function') {
    window.removerAlcasMyDropsNex(el);
  }
  esconderLixeiraNotasNex();

  // Ativa edição
  body.contentEditable = 'true';
  body.style.outline = 'none';

  // Placeholder não entra em edição
  const textoAtual = (body.textContent || '').trim();
  if (
    textoAtual === '2 toque para editar' ||
    textoAtual === '✍🏼 Escreva algo bonito...' ||
    textoAtual === '✍️ Escreva sua nota aqui...'
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

  // Sai do modo edição quando perde foco
  const onBlur = () => {
    body.removeEventListener('blur', onBlur);
    finalizarEdicaoTextoNotasNex();
  };

  body.addEventListener('blur', onBlur);
}

function finalizarEdicaoTextoNotasNex() {
  const el = notasTextoEditando;
  if (!el) return;

  const body = el.querySelector('.video-editor-text-body-mydrops-nex');

  if (body) {
    body.contentEditable = 'false';
    body.style.outline = '';
  }

  // Volta pra posição original
  if (notasPosicaoOriginal) {
    el.style.left = notasPosicaoOriginal.left || el.style.left;
    el.style.top = notasPosicaoOriginal.top || el.style.top;
  }

  setTimeout(() => {
    el.style.transition = '';
  }, 300);

  el.classList.remove('nota-editando-topo');
  delete el.dataset.editando;

  // Se ficou vazio, restaura o placeholder
  const textoFinal = (body?.textContent || '').trim();
  if (!textoFinal && body) {
    body.textContent = '2 toque para editar';
  }

  notasTextoEditando = null;
  notasPosicaoOriginal = null;

  // Re-seleciona pra voltar alças/lixeira/Foco Total
  selecionarTextoNotasNex(el);
}

  // ============================================
// PAINEL Aa
// ============================================

const NOTAS_FONTES = [
  { id: 'caveat',  css: "'Caveat', 'Comic Sans MS', cursive", label: 'Abc' },
  { id: 'inter',   css: "'Inter', 'Segoe UI', sans-serif",     label: 'Abc' },
  { id: 'georgia', css: "Georgia, 'Times New Roman', serif",   label: 'Abc' },
  { id: 'mono',    css: "'Courier New', monospace",            label: 'Abc' }
];

const NOTAS_CORES = [
  '#1a1a1a', '#ffffff', '#ef4444', '#f59e0b',
  '#22c55e', '#2563eb', '#8b5cf6', '#ec4899'
];

function criarPainelAaNex() {
  if (document.getElementById('notasPainelAaNex')) return;

  const painel = document.createElement('div');
  painel.id = 'notasPainelAaNex';

  painel.innerHTML = `
    <div class="notas-painel-topo">
      <span class="notas-painel-titulo">Aa — Estilo do texto</span>
      <button type="button" class="notas-painel-fechar" aria-label="Fechar">✕</button>
    </div>

    <div class="notas-painel-secao">
      <span class="notas-painel-label">Fonte</span>
      <div class="notas-fontes-lista">
        ${NOTAS_FONTES.map((f) => `
          <button type="button" class="notas-fonte-btn" data-fonte="${f.id}"
                  style="font-family:${f.css};">
            ${f.label}
          </button>
        `).join('')}
      </div>
    </div>

    <div class="notas-painel-secao">
      <span class="notas-painel-label">Cor</span>
      <div class="notas-cores-lista">
        ${NOTAS_CORES.map((c) => `
          <button type="button" class="notas-cor-btn" data-cor="${c}"
                  style="background:${c};"></button>
        `).join('')}
      </div>
    </div>

    <div class="notas-painel-secao">
      <span class="notas-painel-label">Tamanho</span>
      <div class="notas-tamanho-linha">
        <button type="button" class="notas-tamanho-btn" data-acao="menos">−</button>
        <span class="notas-tamanho-valor" id="notasTamanhoValorNex">28</span>
        <button type="button" class="notas-tamanho-btn" data-acao="mais">+</button>
      </div>
    </div>

    <div class="notas-painel-secao">
      <span class="notas-painel-label">Estilo</span>
      <div class="notas-estilos-linha">
        <button type="button" class="notas-estilo-btn" data-estilo="bold"><b>B</b></button>
        <button type="button" class="notas-estilo-btn" data-estilo="italic"><i>I</i></button>
        <button type="button" class="notas-estilo-btn" data-estilo="normal">N</button>
      </div>
    </div>
  `;

  document.body.appendChild(painel);

painel.querySelector('.notas-painel-fechar')
  .addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, true);
painel.querySelector('.notas-painel-fechar')
  .addEventListener('click', (e) => {
    e.stopPropagation();
    fecharPainelAaNex();
  });
  
  painel.querySelectorAll('.notas-fonte-btn').forEach((b) => {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, true);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    aplicarFonteAaNex(b.dataset.fonte);
  });
});

painel.querySelectorAll('.notas-cor-btn').forEach((b) => {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, true);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    aplicarCorAaNex(b.dataset.cor);
  });
});

painel.querySelectorAll('.notas-tamanho-btn').forEach((b) => {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, true);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    ajustarTamanhoAaNex(b.dataset.acao);
  });
});

painel.querySelectorAll('.notas-estilo-btn').forEach((b) => {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, true);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    aplicarEstiloAaNex(b.dataset.estilo);
  });
});
}

function abrirPainelAaNex() {
  if (!notasElementoSelecionado) return;
  if (!notasElementoSelecionado.classList.contains('video-editor-text-mydrops-nex')) return;

  criarPainelAaNex();

  const painel = document.getElementById('notasPainelAaNex');
  if (!painel) return;

  // ⚠️ Guarda a referência do body do texto selecionado
  painel.__bodyAlvo = notasElementoSelecionado.querySelector('.video-editor-text-body-mydrops-nex');

  painel.classList.add('aberto');
  notasPainelAaAberto = true;

  sincronizarPainelAaNex();
}

function fecharPainelAaNex() {
  const painel = document.getElementById('notasPainelAaNex');
  if (painel) {
    painel.classList.remove('aberto');
    painel.__bodyAlvo = null;
  }
  notasPainelAaAberto = false;
}

function notasBodySelecionado() {
  const painel = document.getElementById('notasPainelAaNex');

  // ⚠️ Se o painel Aa está aberto, usa a referência guardada
  if (painel && painel.classList.contains('aberto') && painel.__bodyAlvo) {
    return painel.__bodyAlvo;
  }

  const el = notasElementoSelecionado;
  if (!el) return null;
  return el.querySelector('.video-editor-text-body-mydrops-nex');
}

function sincronizarPainelAaNex() {
  const body = notasBodySelecionado();
  if (!body) return;

  const painel = document.getElementById('notasPainelAaNex');
  if (!painel) return;

  // Fonte
  const fonteAtual = body.style.fontFamily || '';
  painel.querySelectorAll('.notas-fonte-btn').forEach((b) => {
    const f = NOTAS_FONTES.find((x) => x.id === b.dataset.fonte);
    b.classList.toggle(
      'ativo',
      f && fonteAtual.includes(f.css.split(',')[0].replace(/'/g, '').trim())
    );
  });

  // Cor
  const corAtual = body.style.color || '#1a1a1a';
  painel.querySelectorAll('.notas-cor-btn').forEach((b) => {
    b.classList.toggle(
      'ativo',
      b.dataset.cor.toLowerCase() === corAtual.toLowerCase()
    );
  });

  // Tamanho
  const tam = parseFloat(body.style.fontSize) || 28;
  const elTam = document.getElementById('notasTamanhoValorNex');
  if (elTam) elTam.textContent = String(Math.round(tam));

  // Estilo
  const isBold = body.style.fontWeight === 'bold' || body.style.fontWeight === '700';
  const isItalic = body.style.fontStyle === 'italic';

  painel.querySelector('[data-estilo="bold"]')?.classList.toggle('ativo', isBold);
  painel.querySelector('[data-estilo="italic"]')?.classList.toggle('ativo', isItalic);
}

function aplicarFonteAaNex(id) {
  const body = notasBodySelecionado();
  if (!body) return;

  const f = NOTAS_FONTES.find((x) => x.id === id);
  if (!f) return;

  body.style.setProperty('font-family', f.css, 'important');
  sincronizarPainelAaNex();
}

function aplicarCorAaNex(cor) {
  const body = notasBodySelecionado();
  if (!body) return;

  body.style.setProperty('color', cor, 'important');
  sincronizarPainelAaNex();
}

function ajustarTamanhoAaNex(acao) {
  const body = notasBodySelecionado();
  if (!body) return;

  const atual = parseFloat(body.style.fontSize) || 28;
  let novo = atual;

  if (acao === 'mais') novo = Math.min(72, atual + 2);
  if (acao === 'menos') novo = Math.max(12, atual - 2);

  body.style.setProperty('font-size', novo + 'px', 'important');
  sincronizarPainelAaNex();
}

function aplicarEstiloAaNex(estilo) {
  const body = notasBodySelecionado();
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

  sincronizarPainelAaNex();
}

// ============================================
// TEMA (cicla os temas existentes)
// ============================================

function ciclarTemaNotasNex() {
  const el = notasTextoSelecionado;
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
// FOTO
// ============================================

function abrirSeletorFotoNotasNex() {
  const input = document.getElementById('notasInputFotoNex');
  if (!input) return;

  input.value = '';
  input.click();
}

function processarFotoNotasNex(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    window.mostrarToastNex?.('Escolha uma imagem.', 'erro');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    criarFotoNotasNex(e.target.result);
  };

  reader.onerror = function () {
    window.mostrarToastNex?.('Falha ao ler a imagem.', 'erro');
  };

  reader.readAsDataURL(file);
  event.target.value = '';
}

function criarFotoNotasNex(dataURL) {
  const layer = notasLayer();
  if (!layer) return;

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

  layer.appendChild(el);

  ativarArrasteFotoNotasNex(el);
  selecionarFotoNotasNex(el);
}

function ativarArrasteFotoNotasNex(el) {
  const layer = notasLayer();
  if (!layer) return;

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
    selecionarFotoNotasNex(el);

    pointerId = e.pointerId;
    moved = false;

    const layerRect = layer.getBoundingClientRect();
    const rect = el.getBoundingClientRect();

    startX = e.clientX;
    startY = e.clientY;
    originLeft = rect.left - layerRect.left + rect.width / 2;
    originTop = rect.top - layerRect.top + rect.height / 2;

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

      if (!moved) selecionarFotoNotasNex(el);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  });
}

// ============================================
// FUNDO (reaproveita modal existente)
// ============================================

function abrirFundoNotasNex() {
  window.__notasModoFundoAtivo = true;

  if (typeof window.abrirModalFundoMyDropsNex === 'function') {
    window.abrirModalFundoMyDropsNex();
  }
}

// ============================================
// LEGENDA
// ============================================

function configurarLegendaNotasNex() {
  const textarea = document.getElementById('notasLegendaInputNex');
  if (!textarea) return;

  const contador = document.getElementById('notasLegendaContadorNex');

  if (textarea.__notasInputListener) {
    textarea.removeEventListener('input', textarea.__notasInputListener);
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

  textarea.__notasInputListener = ajustar;
  textarea.addEventListener('input', ajustar);
  ajustar();
}

// ============================================
// BOTÃO PUBLICAR
// ============================================

function publicarNotasNex() {
  if (notasTextoEditando) {
    finalizarEdicaoTextoNotasNex();
  }

  const inputLegenda = document.getElementById('notasLegendaInputNex');
  const legenda = (inputLegenda?.value || '').trim();

  window.__notasLegendaTemporaria = legenda;

  if (typeof window.abrirModalDuracaoPublicacaoMyDropsNex === 'function') {
    window.abrirModalDuracaoPublicacaoMyDropsNex('drops');
  }
}

// ============================================
// SALVAR COMO PNG
// ============================================

async function salvarNotasComoPngNex() {
  const editor = document.getElementById('notasEditorNex');
  const papel = notasPapel();
  if (!editor || !papel) return;

  if (typeof window.html2canvas !== 'function') {
    window.mostrarToastNex?.('Sistema de captura indisponível.', 'erro');
    return;
  }

  if (notasTextoEditando) {
    finalizarEdicaoTextoNotasNex();
  }

  desselecionarTudoNotasNex();

  const barra = document.getElementById('notasBarraTopoNex');
  const rodape = document.getElementById('notasLegendaRowNex');

  const barraDisplay = barra?.style.display;
  const rodapeDisplay = rodape?.style.display;

  if (barra) barra.style.display = 'none';
  if (rodape) rodape.style.display = 'none';

  const capsula = garantirCapsulaMarcaNex();
  if (capsula) capsula.classList.add('visivel');

  editor.classList.add('nota-capturando-borda');

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
      const nomeArquivo = `Drops_nota_${dataStr}.png`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);

      window.mostrarToastNex?.('Nota salva! 💾', 'sucesso');
    }, 'image/png');
  } catch (err) {
    console.error('Erro ao salvar Nota:', err);
    window.mostrarToastNex?.('Falha ao salvar a Nota.', 'erro');
  } finally {
    if (barra) barra.style.display = barraDisplay || '';
    if (rodape) rodape.style.display = rodapeDisplay || '';

    if (capsula) capsula.classList.remove('visivel');
    editor.classList.remove('nota-capturando-borda');
  }
}

// ============================================
// CÁPSULA DE MARCA
// ============================================

function garantirCapsulaMarcaNex() {
  const papel = notasPapel();
  if (!papel) return null;

  let cap = document.getElementById('notasCapsulaMarcaNex');
  if (cap) return cap;

  cap = document.createElement('div');
  cap.id = 'notasCapsulaMarcaNex';

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

let notasObserver = null;

function iniciarObserverNotasNex() {
  if (notasObserver) return;

  notasObserver = new MutationObserver(() => {
    if (!notasAberto()) return;

    const layer = notasLayer();
    if (!layer) return;

    const selecionado = layer.querySelector(
      '.video-editor-text-mydrops-nex.is-selected, ' +
      '.video-editor-photo-mydrops-nex.is-selected'
    );

    if (selecionado !== notasElementoSelecionado) {
      if (notasElementoSelecionado) {
        if (typeof window.removerAlcasMyDropsNex === 'function') {
          window.removerAlcasMyDropsNex(notasElementoSelecionado);
        }
      }

      notasElementoSelecionado = selecionado || null;

      if (selecionado) {
        if (typeof window.criarAlcasMyDropsNex === 'function') {
          window.criarAlcasMyDropsNex(selecionado);
        }
      }

      atualizarFocoTotalNex();
    }
  });

  notasObserver.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
}

    // ============================================
  // BARRA TOPO — DELEGAÇÃO DE EVENTOS
  // ============================================

  function configurarBarraNotasNex() {
  const barraPrincipal = document.getElementById('notasBarraTopoNex');
  const barraContexto = document.getElementById('notasBarraContextoNex');

  if (!barraPrincipal) {
    console.warn('⚠️ Barra principal de Notas não encontrada');
  }

  if (!barraContexto) {
    console.warn('⚠️ Barra contexto de Notas não encontrada');
  }

  // ============================================
  // Handler de clique unificado
  // ============================================

  function handlerCliqueBotao(e) {
    const btn = e.target.closest('.notas-btn-topo');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const id = btn.id;

    console.log('👆 Notas: clique em', id);

    if (id === 'notasBtnTextoNex') {
      criarTextoNotasNex();
    } else if (id === 'notasBtnTemaNex') {
      ciclarTemaNotasNex();
    } else if (id === 'notasBtnAaNex') {
      abrirPainelAaNex();
    } else if (id === 'notasBtnFotoNex') {
      abrirSeletorFotoNotasNex();
    } else if (id === 'notasBtnFundoNex') {
      abrirFundoNotasNex();
    } else if (id === 'notasBtnSalvarNex') {
      salvarNotasComoPngNex();
    } else if (id === 'notasBtnSairNex') {
      fecharNotasNex();
    }
  }

  // ============================================
  // Anexa o mesmo handler nas duas barras
  // ============================================

  if (barraPrincipal && !barraPrincipal.__notasListenerAtivo) {
    barraPrincipal.__notasListenerAtivo = true;
    barraPrincipal.addEventListener('click', handlerCliqueBotao);
  }

  if (barraContexto && !barraContexto.__notasListenerAtivo) {
    barraContexto.__notasListenerAtivo = true;
    barraContexto.addEventListener('click', handlerCliqueBotao);
  }

  console.log('📌 Barra de Notas configurada (2 barras)');
  }

  // ============================================
  // INPUT DE FOTO
  // ============================================

  function configurarInputFotoNotasNex() {
    const input = document.getElementById('notasInputFotoNex');
    if (!input) return;

    if (input.__notasListenerAtivo) return;
    input.__notasListenerAtivo = true;

    input.addEventListener('change', processarFotoNotasNex);
  }

  // ============================================
  // BOTÃO PUBLICAR
  // ============================================

  function configurarBotaoPublicarNotasNex() {
    const btn = document.getElementById('notasBtnPublicarNex');
    if (!btn) return;

    if (btn.__notasListenerAtivo) return;
    btn.__notasListenerAtivo = true;

    btn.addEventListener('click', publicarNotasNex);
  }

  // ============================================
  // TOQUE FORA → DESSELEÇÃO
  // ============================================

  function configurarToqueForaNotasNex() {
  const papel = notasPapel();
  if (!papel) return;

  if (papel.__notasListenerFora) return;
  papel.__notasListenerFora = true;

  papel.addEventListener('pointerdown', (e) => {
    if (notasTextoEditando) return;

    // Ignora TUDO que for alça, lixeira, texto, foto ou cápsula
    if (e.target.closest('.editor-alca-nex')) return;
    if (e.target.closest('#notasLixeiraNex')) return;
    if (e.target.closest('#notasCapsulaMarcaNex')) return;
    if (e.target.closest('.video-editor-text-mydrops-nex')) return;
    if (e.target.closest('.video-editor-photo-mydrops-nex')) return;

    // Só desseleciona se tocar em área vazia
    desselecionarTudoNotasNex();
  }, true);
  }

  // ============================================
  // TECLADO — AJUSTA PALCO
  // ============================================

  function configurarTecladoNotasNex() {
    if (!window.visualViewport) return;
    if (window.__notasTecladoConfigurado) return;
    window.__notasTecladoConfigurado = true;

    const ajustar = () => {
      const editor = document.getElementById('notasEditorNex');
      if (!editor || !editor.classList.contains('aberto')) return;

      const alturaVisivel = window.visualViewport.height;
      const alturaJanela = window.innerHeight;

      const tecladoAberto = alturaJanela - alturaVisivel > 150;

      const palco = document.getElementById('notasPalcoNex');
      const rodape = document.getElementById('notasLegendaRowNex');

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
  // INTERCEPTAR MODAL DE FUNDO
  // ============================================

  function interceptarModalFundoNotasNex() {
  if (window.__notasFundoInterceptado) return;
  window.__notasFundoInterceptado = true;

  // Observa cliques nas cores
  document.addEventListener('click', (e) => {
    if (!window.__notasModoFundoAtivo) return;

    const btnCor = e.target.closest('.fundo-cor');
    if (btnCor) {
      window.__notasFundoSelecionado = btnCor.dataset.cor;
      window.__notasFundoTipo = 'cor';
    }
  }, true);

  // Observa o color picker
  document.addEventListener('input', (e) => {
    if (!window.__notasModoFundoAtivo) return;
    if (e.target.id !== 'fundoColorPicker') return;

    window.__notasFundoSelecionado = e.target.value;
    window.__notasFundoTipo = 'cor';
  }, true);

  // Observa a galeria
  document.addEventListener('change', (e) => {
    if (!window.__notasModoFundoAtivo) return;
    if (e.target.id !== 'fundoGaleriaInput') return;

    const arquivo = (e.target.files || [])[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = function (evt) {
      window.__notasFundoSelecionado = evt.target.result;
      window.__notasFundoTipo = 'imagem';
    };
    leitor.readAsDataURL(arquivo);
  }, true);

  // ============================================
  // APLICAR (fecha o modal + toast)
  // ============================================

  document.addEventListener('click', (e) => {
    if (!window.__notasModoFundoAtivo) return;

    const btnAplicar = e.target.closest('#fundoAplicarBtn');
    if (!btnAplicar) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const fundoSelecionado = window.__notasFundoSelecionado;
    const fundoTipo = window.__notasFundoTipo;

    // Sem escolha → só fecha
    if (!fundoSelecionado || !fundoTipo) {
      window.mostrarToastNex?.('Escolha uma cor ou imagem antes.', 'info');
      return;
    }

    // Aplica no papel do Notas
    const papel = notasPapel();
    if (papel) {
      if (fundoTipo === 'cor') {
        papel.style.setProperty('background-color', fundoSelecionado, 'important');
        papel.style.setProperty('background-image', 'none', 'important');
        papel.style.backgroundSize = 'cover';
        papel.style.backgroundPosition = 'center';
        papel.style.backgroundRepeat = 'no-repeat';
      } else if (fundoTipo === 'imagem') {
        papel.style.setProperty('background-image', `url('${fundoSelecionado}')`, 'important');
        papel.style.backgroundSize = 'cover';
        papel.style.backgroundPosition = 'center';
        papel.style.backgroundRepeat = 'no-repeat';
        papel.style.setProperty('background-color', '#000', 'important');
      }
    }

    // Toast de confirmação
    window.mostrarToastNex?.('Fundo aplicado!', 'sucesso');

    // Fecha o modal
    if (typeof window.fecharModalFundoMyDropsNex === 'function') {
      window.fecharModalFundoMyDropsNex();
    }

    // Limpa as variáveis
    window.__notasModoFundoAtivo = false;
    window.__notasFundoSelecionado = null;
    window.__notasFundoTipo = null;
  }, true);

  // ============================================
  // CANCELAR (fecha o modal + limpa)
  // ============================================

  document.addEventListener('click', (e) => {
    if (!window.__notasModoFundoAtivo) return;

    const btnCancelar = e.target.closest('#fundoCancelarBtn');
    if (!btnCancelar) return;

    // Deixa o 13-editor cuidar de fechar
    setTimeout(() => {
      window.__notasModoFundoAtivo = false;
      window.__notasFundoSelecionado = null;
      window.__notasFundoTipo = null;
    }, 50);
  }, true);
  }

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  function inicializarNotasNex() {
    // Cria o painel Aa
    criarPainelAaNex();

    // Configura os botões
    configurarBarraNotasNex();
    configurarInputFotoNotasNex();
    configurarBotaoPublicarNotasNex();
    configurarToqueForaNotasNex();
    configurarTecladoNotasNex();
    interceptarModalFundoNotasNex();

    // Observer
    iniciarObserverNotasNex();

    // Botão Notas do My Drops
    const btnNotas = document.getElementById('btnDropsMyDropsNex');
    if (btnNotas && !btnNotas.__notasListenerAtivo) {
      btnNotas.__notasListenerAtivo = true;
      btnNotas.addEventListener('click', abrirNotasNex);
    }

    console.log('📝 29-notas.js inicializado');
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(inicializarNotasNex, 300);
  });

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.abrirNotasNex = abrirNotasNex;
  window.fecharNotasNex = fecharNotasNex;
  window.criarTextoNotasNex = criarTextoNotasNex;
  window.selecionarTextoNotasNex = selecionarTextoNotasNex;
  window.selecionarFotoNotasNex = selecionarFotoNotasNex;
  window.desselecionarTudoNotasNex = desselecionarTudoNotasNex;
  window.editarTextoNotasNex = editarTextoNotasNex;
  window.finalizarEdicaoTextoNotasNex = finalizarEdicaoTextoNotasNex;
  window.ciclarTemaNotasNex = ciclarTemaNotasNex;
  window.abrirPainelAaNex = abrirPainelAaNex;
  window.fecharPainelAaNex = fecharPainelAaNex;
  window.abrirSeletorFotoNotasNex = abrirSeletorFotoNotasNex;
  window.abrirFundoNotasNex = abrirFundoNotasNex;
  window.publicarNotasNex = publicarNotasNex;
  window.salvarNotasComoPngNex = salvarNotasComoPngNex;
  window.atualizarFocoTotalNex = atualizarFocoTotalNex;
  window.mostrarLixeiraNotasNex = mostrarLixeiraNotasNex;
  window.esconderLixeiraNotasNex = esconderLixeiraNotasNex;

  // ============================================
  // DEBUG
  // ============================================

  console.log('📝 29-notas.js carregado');

})();

