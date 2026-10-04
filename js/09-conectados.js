/* ============================================
   09-CONECTADOS.JS
   Conectados, desconectados, bloqueados, painel de controle, tema
   
   Persistência: via window.ConectadosAdapterNex
   (17-adapters.js).
   
   Depende de: 00-config.js, 02-ui.js, 03-utils.js
============================================ */

(function () {
  'use strict';

  // ============================================
  // CONECTADOS — LEITURA E ESCRITA
  // ============================================

  function lerConectadosMyDropsNex() {
    return window.ConectadosAdapterNex.lerConectados();
  }

  function salvarConectadosMyDropsNex(lista) {
    window.ConectadosAdapterNex.salvarConectados(lista);
  }

  // ============================================
  // VERIFICAR SE ESTÁ CONECTADO
  // ============================================

  function estaConectadoNoMyDropsNex(nome) {
    const id = normalizarIdPerfilNex(nome);

    return lerConectadosMyDropsNex().some(
      (item) => normalizarIdPerfilNex(item.id) === id
    );
  }

  // ============================================
  // DESCONECTADOS — LEITURA E ESCRITA
  // ============================================

  function lerDesconectadosMyDropsNex() {
    return window.ConectadosAdapterNex.lerDesconectados();
  }

  function salvarDesconectadosMyDropsNex(lista) {
    window.ConectadosAdapterNex.salvarDesconectados(lista);
  }

  function registrarDesconexaoMyDropsNex(perfil) {
    const id = normalizarIdPerfilNex(
      perfil?.id ||
        Drops.estado.perfilBloquearAtual ||
        Drops.estado.perfilAberto
    );

    if (!id) return;

    const nome = perfil?.nome || Drops.estado.perfilAberto || id;
    const avatar = perfil?.avatar || nome.charAt(0).toUpperCase();

    const lista = lerDesconectadosMyDropsNex();
    const existente = lista.find(
      (item) => normalizarIdPerfilNex(item.id) === id
    );

    const dadosAtualizados = {
      id,
      nome,
      avatar,
      desconectadoEm: new Date().toISOString()
    };

    if (existente) {
      Object.assign(existente, dadosAtualizados);
    } else {
      lista.unshift(dadosAtualizados);
    }

    salvarDesconectadosMyDropsNex(lista);
  }
  // ============================================
// RENDERIZAR CONECTADOS
// ============================================

async function renderizarConectadosMyDropsNex() {
  const container = document.getElementById('listaConectadosMyDropsNex');
  if (!container) return;

  let lista = lerConectadosMyDropsNex();
  container.innerHTML = '';

  // ⚠️ Busca avatares atualizados no Supabase
  if (lista.length && window.supabaseClient) {
    try {
      const usernames = lista
        .map((p) => String(p.id || '').replace(/^@/, '').trim().toLowerCase())
        .filter(Boolean);

      if (usernames.length) {
        const { data: perfisAtualizados } = await window.supabaseClient
          .from('profiles')
          .select('username, nome, avatar_url')
          .in('username', usernames);

        if (Array.isArray(perfisAtualizados)) {
          let mudou = false;

          const mapaPerfis = {};
          perfisAtualizados.forEach((p) => {
            const key = String(p.username || '').toLowerCase();
            if (key) mapaPerfis[key] = p;
          });

          lista = lista.map((p) => {
            const key = String(p.id || '').replace(/^@/, '').trim().toLowerCase();
            const atualizado = mapaPerfis[key];

            if (!atualizado) return p;

            const avatarNovo = atualizado.avatar_url || p.avatar;
            const nomeNovo = atualizado.nome || p.nome;

            if (avatarNovo !== p.avatar || nomeNovo !== p.nome) {
              mudou = true;
            }

            return {
              ...p,
              nome: nomeNovo,
              avatar: avatarNovo
            };
          });

          if (mudou) {
            salvarConectadosMyDropsNex(lista);
          }
        }
      }
    } catch (erro) {
      console.warn('Erro ao atualizar avatares conectados:', erro);
    }
  }

  if (!lista.length) {
    const vazio = document.createElement('div');
    vazio.className = 'mydrops-empty-state';
    vazio.textContent = 'Nenhum conectado ainda.';
    container.appendChild(vazio);

    sincronizarConversasComConectadosMyDropsNex();
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'mydrops-connected-list';

  lista.forEach((perfil) => {
    const item = document.createElement('div');
    item.className = 'mydrops-connected-item';

    item.addEventListener('click', () => {
      abrirPerfilVisitadoNex(perfil.id, perfil.nome);
    });

    const avatar = document.createElement('div');
avatar.className = 'connected-avatar';

const avatarValor = String(perfil.avatar || '');

const avatarEhUrl =
  avatarValor.startsWith('http') ||
  avatarValor.startsWith('data:image');

if (avatarEhUrl) {
  const img = document.createElement('img');
  img.src = avatarValor;
  img.alt = perfil.nome || 'Avatar';
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'cover';
  img.style.borderRadius = '50%';
  img.style.display = 'block';
  avatar.appendChild(img);
} else {
  avatar.textContent =
    avatarValor || (perfil.nome || '?').charAt(0).toUpperCase();
}

    const info = document.createElement('div');
    info.className = 'connected-info';

    const nome = document.createElement('div');
    nome.className = 'connected-name';
    nome.textContent = perfil.nome || 'Perfil';

    const handle = document.createElement('div');
    handle.className = 'connected-handle';
    handle.textContent = `@${perfil.id}`;

    info.appendChild(nome);
    info.appendChild(handle);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'connected-send-btn';
    btn.textContent = 'Desconectar';
    btn.dataset.id = perfil.id;

    btn.addEventListener('click', async (e) => {
  e.stopPropagation();

  const id = normalizarIdPerfilNex(btn.dataset.id);

  // ⚠️ Remove do Supabase primeiro
  if (window.ConectadosAdapterNex?.removerConectadoSupabase) {
    await window.ConectadosAdapterNex.removerConectadoSupabase(id);
  }

  const perfilRemovido = lerConectadosMyDropsNex().find(
    (item) => normalizarIdPerfilNex(item.id) === id
  );

  registrarDesconexaoMyDropsNex(perfilRemovido || perfil);

  const listaAtual = lerConectadosMyDropsNex().filter(
    (item) => normalizarIdPerfilNex(item.id) !== id
  );

  salvarConectadosMyDropsNex(listaAtual);
  sincronizarConversasComConectadosMyDropsNex();

  if (normalizarIdPerfilNex(Drops.estado.perfilBloquearAtual) === id) {
    atualizarBotaoConectarPerfilNex();
  }

  renderizarConectadosMyDropsNex();
  renderizarDesconectadosMyDropsNex();

  if (typeof renderizarPublicacoesNearbyNex === 'function') {
    renderizarPublicacoesNearbyNex();
  }
});

    item.appendChild(avatar);
    item.appendChild(info);
    item.appendChild(btn);

    wrapper.appendChild(item);
  });

  container.appendChild(wrapper);
  sincronizarConversasComConectadosMyDropsNex();
}

// ============================================
// RENDERIZAR DESCONECTADOS
// ============================================

async function renderizarDesconectadosMyDropsNex() {
  const container = document.getElementById('listaDesconectadosNex');
  if (!container) return;

  let lista = lerDesconectadosMyDropsNex();
  container.innerHTML = '';

  // ⚠️ Busca avatares atualizados no Supabase
  if (lista.length && window.supabaseClient) {
    try {
      const usernames = lista
        .map((p) => String(p.id || '').replace(/^@/, '').trim().toLowerCase())
        .filter(Boolean);

      if (usernames.length) {
        const { data: perfisAtualizados } = await window.supabaseClient
          .from('profiles')
          .select('username, nome, avatar_url')
          .in('username', usernames);

        if (Array.isArray(perfisAtualizados)) {
          let mudou = false;

          const mapaPerfis = {};
          perfisAtualizados.forEach((p) => {
            const key = String(p.username || '').toLowerCase();
            if (key) mapaPerfis[key] = p;
          });

          lista = lista.map((p) => {
            const key = String(p.id || '').replace(/^@/, '').trim().toLowerCase();
            const atualizado = mapaPerfis[key];

            if (!atualizado) return p;

            const avatarNovo = atualizado.avatar_url || p.avatar;
            const nomeNovo = atualizado.nome || p.nome;

            if (avatarNovo !== p.avatar || nomeNovo !== p.nome) {
              mudou = true;
            }

            return {
              ...p,
              nome: nomeNovo,
              avatar: avatarNovo
            };
          });

          if (mudou) {
            salvarDesconectadosMyDropsNex(lista);
          }
        }
      }
    } catch (erro) {
      console.warn('Erro ao atualizar avatares desconectados:', erro);
    }
  }

  if (!lista.length) {
    const vazio = document.createElement('div');
    vazio.className = 'desconectado-vazio-nex';
    vazio.textContent = 'Nenhuma pessoa desconectada ainda.';
    container.appendChild(vazio);
    return;
  }

  lista.forEach((perfil) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'desconectado-item-nex';

    const data = perfil.desconectadoEm
      ? new Date(perfil.desconectadoEm)
      : null;

    const dataTexto =
      data && !isNaN(data)
        ? data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })
        : '';

    const avatarValor = String(perfil.avatar || '');
const avatarEhUrl =
  avatarValor.startsWith('http') ||
  avatarValor.startsWith('data:image');

const avatarHTML = avatarEhUrl
  ? `<img src="${avatarValor}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`
  : (avatarValor || (perfil.nome || '?').charAt(0).toUpperCase());

item.innerHTML = `
  <div class="desconectado-avatar-nex">
    ${avatarHTML}
  </div>

      <div class="desconectado-info-nex">
        <div class="desconectado-nome-nex">${perfil.nome || 'Perfil'}</div>
        <div class="desconectado-handle-nex">@${perfil.id}</div>
        ${dataTexto ? `<div class="desconectado-data-nex">${dataTexto}</div>` : ''}
      </div>
    `;

    item.addEventListener('click', () => {
      abrirPerfilVisitadoNex(perfil.id, perfil.nome);
    });

    container.appendChild(item);
  });
}
  // ============================================
// PAINEL DE CONTROLE
// ============================================

function abrirPainelControleNex() {
  const modal = document.getElementById('painelControleNex');
  if (!modal) return;

  // Preenche nome e avatar do usuário
  preencherPerfilNoPainelControleNex();

  modal.style.display = 'flex';
}

function preencherPerfilNoPainelControleNex() {
  if (
    !window.AuthAdapterNex ||
    typeof window.AuthAdapterNex.lerUsuario !== 'function' ||
    typeof window.AuthAdapterNex.lerPerfil !== 'function'
  ) {
    return;
  }

  const usuario = window.AuthAdapterNex.lerUsuario();
  const perfil = window.AuthAdapterNex.lerPerfil();

  const nome = (usuario.nome || 'Usuário').trim();

  // Avatar / nome no topo do painel
  const avatarEl = document.getElementById('controleAvatarNex');
  const nomeEl = document.getElementById('controleNomeNex');

  if (nomeEl) nomeEl.textContent = nome;

  if (avatarEl) {
    if (perfil.avatar) {
      avatarEl.innerHTML = `<img src="${perfil.avatar}" alt="Avatar">`;
    } else {
      const inicial = nome.charAt(0).toUpperCase() || '?';
      avatarEl.textContent = inicial;
    }
  }
}

function fecharPainelControleNex() {
  const modal = document.getElementById('painelControleNex');
  if (modal) modal.style.display = 'none';
}

// ============================================
// PAINEL DESCONECTADOS
// ============================================

function abrirDesconectadosNex() {
  const modal = document.getElementById('painelDesconectadosNex');
  if (modal) {
    renderizarDesconectadosMyDropsNex();
    modal.style.display = 'flex';
  }
}

function fecharDesconectadosNex() {
  const modal = document.getElementById('painelDesconectadosNex');
  if (modal) modal.style.display = 'none';
}

// ============================================
// PAINEL BLOQUEADOS
// ============================================

function abrirBloqueadosNex() {
  const painel = document.getElementById('painelBloqueadosNex');
  if (painel) painel.style.display = 'flex';

  renderizarBloqueadosNex();
}

function fecharBloqueadosNex() {
  const painel = document.getElementById('painelBloqueadosNex');
  if (painel) painel.style.display = 'none';
}

function renderizarBloqueadosNex() {
  const lista = document.getElementById('listaBloqueadosNex');
  if (!lista) return;

  lista.innerHTML = '';

  const bloqueados = Array.from(perfisBloqueadosNex);

  if (!bloqueados.length) {
    lista.innerHTML =
      '<div class="item-bloqueado-nex">Nenhum bloqueado.</div>';
    return;
  }

  bloqueados.forEach((nome) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'item-bloqueado-nex';
    btn.textContent = nome;

    btn.addEventListener('click', () => {
      Drops.estado.bloqueadoAtual = nome;
      const modal = document.getElementById('modalDesbloquearNex');
      if (modal) modal.style.display = 'flex';
    });

    lista.appendChild(btn);
  });
}

function fecharModalDesbloquearNex() {
  const modal = document.getElementById('modalDesbloquearNex');
  if (modal) modal.style.display = 'none';
  Drops.estado.bloqueadoAtual = '';
}

function confirmarDesbloqueioNex() {
  if (Drops.estado.bloqueadoAtual) {
    perfisBloqueadosNex.delete(Drops.estado.bloqueadoAtual);
    renderizarBloqueadosNex();
  }

  fecharModalDesbloquearNex();
}

// ============================================
// MODAL DE BLOQUEAR PERFIL
// ============================================

function abrirModalBloquearPerfilNex() {
  const modal = document.getElementById('bloquearPerfilModalNex');
  if (modal) modal.style.display = 'flex';
}

function fecharModalBloquearPerfilNex() {
  const modal = document.getElementById('bloquearPerfilModalNex');
  if (modal) modal.style.display = 'none';
}

function confirmarBloqueioPerfilNex() {
  fecharModalBloquearPerfilNex();

  const bloqueando = document.getElementById('bloqueandoUsuarioModalNex');
  if (bloqueando) bloqueando.style.display = 'flex';

  setTimeout(() => {
    if (bloqueando) bloqueando.style.display = 'none';

    const perfilBloqueado = Drops.estado.perfilBloquearAtual;

    if (perfilBloqueado) {
      perfisBloqueadosNex.add(perfilBloqueado);

      removerPerfilBloqueadoDaNex(perfilBloqueado);
      removerPerfilBloqueadoDoNearby(perfilBloqueado);
      removerConversaBloqueadaDoNex(perfilBloqueado);
    }

    const telaAtual = Drops.estado.telaOrigemPerfilVisitado || 'nex';

    mostrarTela(telaAtual);

    if (telaAtual === 'nex') {
      mostrarNexTab('naolidas');
    }
  }, 4000);
}

// ============================================
// REMOVER PERFIL BLOQUEADO
// ============================================

function removerPerfilBloqueadoDoNearby(perfilId) {
  document.querySelectorAll(`[onclick*="${perfilId}"]`).forEach((el) => {
    const texto = el.getAttribute('onclick') || '';
    if (
      texto.includes('abrirPublicacaoNearbyNex') ||
      texto.includes('abrirPublicacaoConectadaNex')
    ) {
      el.remove();
    }
  });
}

function removerPerfilBloqueadoDaNex(perfilId) {
  document.querySelectorAll('.nex-chat').forEach((card) => {
    const nome = (card.dataset.chat || '').trim().toLowerCase();
    if (nome === perfilId) {
      card.remove();
    }
  });
}

function removerConversaBloqueadaDoNex(perfilId) {
  const nomeMaiusculo =
    perfilId.charAt(0).toUpperCase() + perfilId.slice(1);

  delete conversas[nomeMaiusculo];
  delete estadoConversasNex[nomeMaiusculo];
}
    // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  // Conectados
  window.lerConectadosMyDropsNex = lerConectadosMyDropsNex;
  window.salvarConectadosMyDropsNex = salvarConectadosMyDropsNex;
  window.estaConectadoNoMyDropsNex = estaConectadoNoMyDropsNex;
  window.renderizarConectadosMyDropsNex = renderizarConectadosMyDropsNex;

  // Desconectados
  window.lerDesconectadosMyDropsNex = lerDesconectadosMyDropsNex;
  window.salvarDesconectadosMyDropsNex = salvarDesconectadosMyDropsNex;
  window.registrarDesconexaoMyDropsNex = registrarDesconexaoMyDropsNex;
  window.renderizarDesconectadosMyDropsNex = renderizarDesconectadosMyDropsNex;
  window.abrirDesconectadosNex = abrirDesconectadosNex;
  window.fecharDesconectadosNex = fecharDesconectadosNex;

  // Painel de controle
  window.abrirPainelControleNex = abrirPainelControleNex;
  window.fecharPainelControleNex = fecharPainelControleNex;

  // Bloqueados
  window.abrirBloqueadosNex = abrirBloqueadosNex;
  window.fecharBloqueadosNex = fecharBloqueadosNex;
  window.renderizarBloqueadosNex = renderizarBloqueadosNex;
  window.fecharModalDesbloquearNex = fecharModalDesbloquearNex;
  window.confirmarDesbloqueioNex = confirmarDesbloqueioNex;

  // Modal de bloquear perfil
  window.abrirModalBloquearPerfilNex = abrirModalBloquearPerfilNex;
  window.fecharModalBloquearPerfilNex = fecharModalBloquearPerfilNex;
  window.confirmarBloqueioPerfilNex = confirmarBloqueioPerfilNex;

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
  // Botão bloquear perfil
    const btnBloquearPerfil = document.getElementById('btnBloquearPerfilNex');
    if (btnBloquearPerfil) {
      btnBloquearPerfil.addEventListener('click', abrirModalBloquearPerfilNex);
    }

    // Botão bloqueados
    const btnBloqueados = document.getElementById('btnBloqueadosNex');
    if (btnBloqueados) {
      btnBloqueados.addEventListener('click', abrirBloqueadosNex);
    }

    // Botão desconectados
    const btnDesconectados = document.getElementById('btnDesconectadosNex');
    if (btnDesconectados) {
      btnDesconectados.addEventListener('click', abrirDesconectadosNex);
    }
  });

  // ============================================
  // DEBUG
  // ============================================

  console.log('👥 09-conectados.js carregado (via adapter)');

})();
