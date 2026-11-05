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

  // ⚠️ MOSTRA SKELETON ENQUANTO BUSCA
  container.innerHTML = '<div style="text-align:center; padding: 20px; color: #94a3b8; font-weight: 600;">Carregando amigos...</div>';

  // ⚠️ BUSCA O DADO REAL DO SUPABASE ANTES DE MOSTRAR
  if (window.ConectadosAdapterNex?.carregarConectadosSupabase) {
    await window.ConectadosAdapterNex.carregarConectadosSupabase();
  }

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
  // ⚠️ Adicione esta linha no final da função:
  if (typeof verificarStatusSecretNex === 'function') {
    verificarStatusSecretNex();
  }
  
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

  // ⚠️ Atualiza os ícones sociais do painel
  if (typeof window.atualizarIconesSocialPainelNex === 'function') {
    window.atualizarIconesSocialPainelNex();
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

async function abrirBloqueadosNex() {
  const painel = document.getElementById('painelBloqueadosNex');
  if (painel) painel.style.display = 'flex';

  // ⚠️ Sincroniza o Set com o cache do adapter antes de renderizar
  if (window.BloqueadosAdapterNex?.lerBloqueados) {
    const doCache = window.BloqueadosAdapterNex.lerBloqueados();

    // Mescla os dois (garante que nada se perca)
    doCache.forEach((username) => {
      perfisBloqueadosNex.add(username);
    });
  }

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

async function confirmarDesbloqueioNex() {
  const username = Drops.estado.bloqueadoAtual;

  if (username) {
    // ⚠️ Remove do Supabase
    if (window.BloqueadosAdapterNex?.removerBloqueadoSupabase) {
      try {
        await window.BloqueadosAdapterNex.removerBloqueadoSupabase(username);
      } catch (err) {
        console.warn('Erro ao desbloquear no Supabase:', err);
      }
    }

    perfisBloqueadosNex.delete(username);

    // ⚠️ Atualiza o cache do adapter
    if (window.BloqueadosAdapterNex?.salvarBloqueados) {
      window.BloqueadosAdapterNex.salvarBloqueados(perfisBloqueadosNex);
    }

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

async function confirmarBloqueioPerfilNex() {
  fecharModalBloquearPerfilNex();

  const bloqueando = document.getElementById('bloqueandoUsuarioModalNex');
  if (bloqueando) bloqueando.style.display = 'flex';

  const perfilBloqueado = Drops.estado.perfilBloquearAtual;

  // ⚠️ NOVO: Apaga o histórico de conversa e as mídias do Storage imediatamente
  if (perfilBloqueado && typeof apagarChatNex === 'function') {
    try {
      await apagarChatNex(perfilBloqueado);
    } catch (err) {
      console.warn('Erro ao apagar chat no bloqueio:', err);
    }
  }

  // Salva no Supabase ANTES do setTimeout (não perde o valor)
  if (perfilBloqueado && window.BloqueadosAdapterNex?.adicionarBloqueadoSupabase) {
    try {
      await window.BloqueadosAdapterNex.adicionarBloqueadoSupabase(perfilBloqueado);
    } catch (err) {
      console.warn('Erro ao bloquear no Supabase:', err);
    }
  }

  setTimeout(() => {
    if (bloqueando) bloqueando.style.display = 'none';

    if (perfilBloqueado) {
      perfisBloqueadosNex.add(perfilBloqueado);

      // Atualiza o cache do adapter
      if (window.BloqueadosAdapterNex?.salvarBloqueados) {
        window.BloqueadosAdapterNex.salvarBloqueados(perfisBloqueadosNex);
      }

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
// NAVEGAÇÃO DAS SUB-ABAS DE AMIGOS
// ============================================

function mudarAbaAmigosNex(aba) {
  const btnLista = document.querySelector('.tab-btn-amigos:nth-child(1)');
  const btnBuscar = document.querySelector('.tab-btn-amigos:nth-child(2)');
  const contentLista = document.getElementById('aba-amigos-lista');
  const contentBuscar = document.getElementById('aba-amigos-buscar');

  if (!btnLista || !btnBuscar || !contentLista || !contentBuscar) return;

  if (aba === 'lista') {
    btnLista.classList.add('active');
    btnBuscar.classList.remove('active');
    contentLista.classList.add('active');
    contentBuscar.classList.remove('active');
  } else {
    btnBuscar.classList.add('active');
    btnLista.classList.remove('active');
    contentBuscar.classList.add('active');
    contentLista.classList.remove('active');
  }
}

window.mudarAbaAmigosNex = mudarAbaAmigosNex;

  // ============================================
// BUSCA DE USUÁRIOS
// ============================================
let timeoutBuscaAmigo = null;

async function buscarUsuarioNex() {
  const input = document.getElementById('inputBuscaAmigoNex');
  const container = document.getElementById('resultadoBuscaAmigoNex');
  if (!input || !container) return;

  const termo = input.value.replace(/^@/, '').trim().toLowerCase();

  if (timeoutBuscaAmigo) clearTimeout(timeoutBuscaAmigo);

  if (termo.length < 2) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = '<div style="text-align:center; color:#94a3b8; font-size:13px;">Buscando...</div>';

  timeoutBuscaAmigo = setTimeout(async () => {
    try {
      const { data: perfis, error } = await window.supabaseClient
        .from('profiles')
        .select('id, username, nome, avatar_url')
        .ilike('username', `%${termo}%`)
        .limit(5);

      if (error) throw error;

      container.innerHTML = '';

      if (!perfis || perfis.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#94a3b8; font-size:13px; padding: 20px;">Nenhum perfil encontrado.</div>';
        return;
      }

      const meusConectados = lerConectadosMyDropsNex();
      const idsConectados = new Set(meusConectados.map(c => String(c.id).toLowerCase()));

      perfis.forEach(perfil => {
  if (String(perfil.username).toLowerCase() === String(Drops.usernameAtual).toLowerCase()) return; // Não mostra a si mesmo

  const jaConectado = idsConectados.has(String(perfil.username).toLowerCase());
  
  // Monta o HTML do avatar usando as classes reais do app
  const avatarValor = String(perfil.avatar_url || '');
  const avatarEhUrl = avatarValor.startsWith('http') || avatarValor.startsWith('data:image');
  const avatarHTML = avatarEhUrl 
    ? `<img src="${avatarValor}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">` 
    : (avatarValor || (perfil.nome || '?').charAt(0).toUpperCase());

  const card = document.createElement('div');
  card.className = 'mydrops-connected-item'; // ⚠️ Usa a mesma classe da lista de amigos
  card.style.marginBottom = '10px';
  
  card.innerHTML = `
  <div class="connected-avatar">${avatarHTML}</div>
  <div class="connected-info">
    <div class="connected-name">${perfil.nome || perfil.username}</div>
    <div class="connected-handle">@${perfil.username}</div>
  </div>
  <button class="connected-send-btn" style="
    background: ${jaConectado ? 'rgba(37, 99, 235, 0.15)' : '#2563eb'}; 
    color: ${jaConectado ? '#60a5fa' : '#fff'};
    border: ${jaConectado ? '1px solid rgba(37, 99, 235, 0.3)' : 'none'};
  ">
    ${jaConectado ? 'Ver perfil' : 'Adicionar'}
  </button>
`;

  card.querySelector('button').onclick = async () => {
    if (jaConectado) {
      // Se já é conectado, abre o perfil
      abrirPerfilVisitadoNex(perfil.username, perfil.nome);
    } else {
      // Se não, adiciona
      if (window.ConectadosAdapterNex?.adicionarConectadoSupabase) {
        await window.ConectadosAdapterNex.adicionarConectadoSupabase(perfil.username);
      }
      const novaLista = lerConectadosMyDropsNex();
      novaLista.unshift({
        id: perfil.username,
        nome: perfil.nome || perfil.username,
        avatar: perfil.avatar_url || (perfil.nome || '?').charAt(0).toUpperCase()
      });
      salvarConectadosMyDropsNex(novaLista);
      
      window.mostrarToastNex?.('Amigo adicionado!', 'sucesso');
      buscarUsuarioNex(); // Recarrega a busca
      renderizarConectadosMyDropsNex(); // Atualiza a lista principal
    }
  };

  container.appendChild(card);
});

    } catch (err) {
      console.warn('Erro na busca:', err);
      container.innerHTML = '<div style="text-align:center; color:#fca5a5; font-size:13px;">Erro ao buscar.</div>';
    }
  }, 500); // Debounce de 500ms
}

// ============================================
// GERAR MEU QR CODE
// ============================================
function abrirMeuQrCodeNex() {
  const modal = document.getElementById('modalMeuQrCodeNex');
  const container = document.getElementById('qrcodeCanvasNex');
  if (!modal || !container) return;

  container.innerHTML = ''; // Limpa o anterior
  const meuUser = Drops.usernameAtual;
  const linkPerfil = `https://appdrop.com.br/?user=${meuUser}`; // Link que o leitor vai capturar

  new QRCode(container, {
    text: linkPerfil,
    width: 200,
    height: 200,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
  });

  modal.style.display = 'flex';
}

function fecharMeuQrCodeNex() {
  const modal = document.getElementById('modalMeuQrCodeNex');
  if (modal) modal.style.display = 'none';
}

// ============================================
// LER QR CODE (CÂMERA)
// ============================================
let html5QrCodeScanner = null;

function abrirLeitorQrCodeNex() {
  const modal = document.getElementById('modalLeitorQrCodeNex');
  if (!modal) return;

  modal.style.display = 'flex';

  if (html5QrCodeScanner) {
    html5QrCodeScanner.clear();
  }

  html5QrCodeScanner = new Html5Qrcode("leitorQrCodeCanvasNex");

  const config = { fps: 10, qrbox: { width: 250, height: 250 } };

  html5QrCodeScanner.start(
    { facingMode: "environment" },
    config,
    (decodedText) => {
      // SUCESSO AO LER!
      console.log("QR Code lido:", decodedText);
      
      // Para a câmera imediatamente
      html5QrCodeScanner.stop().then(() => {
        fecharLeitorQrCodeNex();
        
        // Extrai o username do link (ex: https://appdrop.com.br/?user=jqmarques1)
        let usernameLido = '';
        try {
          const url = new URL(decodedText);
          usernameLido = url.searchParams.get('user');
        } catch (e) {
          // Se não for URL, tenta usar o texto puro
          usernameLido = decodedText.replace('@', '').trim();
        }

        if (usernameLido) {
          window.mostrarToastNex?.('Perfil encontrado!', 'sucesso');
          abrirPerfilVisitadoNex(usernameLido, usernameLido);
        } else {
          window.mostrarToastNex?.('QR Code inválido.', 'erro');
        }
      }).catch(err => console.warn('Erro ao parar câmera:', err));
    },
    (errorMessage) => {
      // Ignorar erros de leitura contínua (ruído da câmera)
    }
  ).catch(err => {
    console.warn('Erro ao abrir câmera:', err);
    window.mostrarToastNex?.('Não foi possível abrir a câmera.', 'erro');
    fecharLeitorQrCodeNex();
  });
}

function fecharLeitorQrCodeNex() {
  const modal = document.getElementById('modalLeitorQrCodeNex');
  if (modal) modal.style.display = 'none';
  
  if (html5QrCodeScanner) {
    html5QrCodeScanner.stop().then(() => {
      html5QrCodeScanner.clear();
    }).catch(() => {});
  }
}

// ============================================
// SECRET MODE (LIGAR/DESLIGAR E VERIFICAR)
// ============================================

async function verificarStatusSecretNex() {
  if (!window.supabaseClient) return;
  const toggle = document.getElementById('toggleSecretModeNex');
  const btnSolicitacoes = document.getElementById('btnSolicitacoesSecretNex');
  if (!toggle || !btnSolicitacoes) return;

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    // 1. Verifica se o perfil é secret
    const { data: perfil } = await window.supabaseClient
      .from('profiles')
      .select('is_secret')
      .eq('id', user.id)
      .single();

    const isSecret = perfil?.is_secret === true;

    // Atualiza o visual do Toggle
    toggle.classList.toggle('ativo', isSecret);
    
    // Mostra/esconde o botão de solicitações
    if (isSecret) {
      btnSolicitacoes.classList.add('visivel');
      atualizarBadgeSolicitacoesNex(); // Busca o número de solicitações
    } else {
      btnSolicitacoes.classList.remove('visivel');
    }

  } catch (err) {
    console.warn('Erro ao verificar status secret:', err);
  }
}

async function alternarSecretModeNex() {
  if (!window.supabaseClient) return;
  const toggle = document.getElementById('toggleSecretModeNex');
  const btnSolicitacoes = document.getElementById('btnSolicitacoesSecretNex');
  if (!toggle || !btnSolicitacoes) return;

  // Pega o estado atual e inverte
  const vaiAtivar = !toggle.classList.contains('ativo');
  
  // Atualiza o visual otimista (para não travar)
  toggle.classList.toggle('ativo', vaiAtivar);
  if (vaiAtivar) {
    btnSolicitacoes.classList.add('visivel');
  } else {
    btnSolicitacoes.classList.remove('visivel');
  }

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    // Salva no banco
    const { error } = await window.supabaseClient
      .from('profiles')
      .update({ is_secret: vaiAtivar })
      .eq('id', user.id);

    if (error) throw error;

    window.mostrarToastNex?.(vaiAtivar ? 'Secret Mode Ativado 🕵️' : 'Secret Mode Desativado', 'sucesso');
    
    if (vaiAtivar) atualizarBadgeSolicitacoesNex();

  } catch (err) {
    console.warn('Erro ao alternar secret:', err);
    // Reverte se der erro
    toggle.classList.toggle('ativo', !vaiAtivar);
    if (!vaiAtivar) btnSolicitacoes.classList.add('visivel');
    else btnSolicitacoes.classList.remove('visivel');
    window.mostrarToastNex?.('Erro ao salvar. Tente novamente.', 'erro');
  }
}

// ============================================
// SOLICITAÇÕES (BADGE E LISTA)
// ============================================

async function atualizarBadgeSolicitacoesNex() {
  if (!window.supabaseClient) return;
  const badge = document.getElementById('badgeSolicitacoesNex');
  if (!badge) return;

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    const { count, error } = await window.supabaseClient
      .from('solicitacoes_acesso')
      .select('*', { count: 'exact', head: true })
      .eq('dono_perfil_id', user.id)
      .eq('status', 'pendente');

    if (error) throw error;

    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  } catch (err) {
    console.warn('Erro ao buscar badge:', err);
  }
}

async function abrirSolicitacoesSecretNex() {
  const modal = document.getElementById('modalSolicitacoesSecretNex');
  const lista = document.getElementById('listaSolicitacoesSecretNex');
  if (!modal || !lista) return;

  modal.style.display = 'flex';
  lista.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:13px;">Carregando...</div>';

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    // Puxa as solicitações pendentes E os dados de quem pediu
    const { data: solicitacoes, error } = await window.supabaseClient
      .from('solicitacoes_acesso')
      .select(`
        id,
        solicitante_id,
        profiles!solicitacoes_acesso_solicitante_id_fkey (username, nome, avatar_url)
      `)
      .eq('dono_perfil_id', user.id)
      .eq('status', 'pendente')
      .order('criado_em', { ascending: false });

    if (error) throw error;

    lista.innerHTML = '';

    if (!solicitacoes || solicitacoes.length === 0) {
      lista.innerHTML = '<div style="text-align:center; padding:20px; color:#94a3b8; font-size:13px;">Nenhuma solicitação pendente.</div>';
      return;
    }

    solicitacoes.forEach(sol => {
      const perfil = sol.profiles || {};
      const inicial = (perfil.nome || perfil.username || '?').charAt(0).toUpperCase();
      const avatarHTML = perfil.avatar_url 
        ? `<img src="${perfil.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
        : inicial;

      const item = document.createElement('div');
      item.style.cssText = 'display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.04); padding:12px; border-radius:16px; border:1px solid rgba(255,255,255,0.05);';
      
      item.innerHTML = `
        <div style="width:46px; height:46px; border-radius:50%; background:#1e293b; display:flex; align-items:center; justify-content:center; font-weight:900; flex-shrink:0; overflow:hidden;">
          ${avatarHTML}
        </div>
        <div style="flex:1; min-width:0;">
          <div style="color:#fff; font-weight:800; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${perfil.nome || 'Usuário'}</div>
          <div style="color:#94a3b8; font-size:12px;">@${perfil.username}</div>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
          <button onclick="aceitarSolicitacaoSecretNex('${sol.id}')" style="background:#22c55e; color:#fff; border:none; padding:6px 12px; border-radius:10px; font-size:12px; font-weight:800; cursor:pointer;">Aceitar</button>
          <button onclick="recusarSolicitacaoSecretNex('${sol.id}')" style="background:transparent; color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:6px 12px; border-radius:10px; font-size:12px; font-weight:800; cursor:pointer;">Recusar</button>
        </div>
      `;
      lista.appendChild(item);
    });

  } catch (err) {
    console.warn('Erro ao carregar solicitações:', err);
    lista.innerHTML = '<div style="text-align:center; padding:20px; color:#fca5a5; font-size:13px;">Erro ao carregar.</div>';
  }
}

async function aceitarSolicitacaoSecretNex(solicitacaoId) {
  try {
    // Chama a RPC que criamos no banco
    const { error } = await window.supabaseClient.rpc('aceitar_solicitacao_secret', { 
      solicitacao_id_param: solicitacaoId 
    });

    if (error) throw error;

    window.mostrarToastNex?.('Acesso concedido!', 'sucesso');
    
    // Atualiza a tela
    abrirSolicitacoesSecretNex(); 
    atualizarBadgeSolicitacoesNex();

  } catch (err) {
    console.warn('Erro ao aceitar:', err);
    window.mostrarToastNex?.('Erro ao aceitar.', 'erro');
  }
}

async function recusarSolicitacaoSecretNex(solicitacaoId) {
  try {
    const { error } = await window.supabaseClient
      .from('solicitacoes_acesso')
      .update({ status: 'recusado' })
      .eq('id', solicitacaoId);

    if (error) throw error;

    window.mostrarToastNex?.('Solicitação recusada.', 'info');
    abrirSolicitacoesSecretNex();
    atualizarBadgeSolicitacoesNex();

  } catch (err) {
    console.warn('Erro ao recusar:', err);
    window.mostrarToastNex?.('Erro ao recusar.', 'erro');
  }
}

function fecharSolicitacoesSecretNex() {
  const modal = document.getElementById('modalSolicitacoesSecretNex');
  if (modal) modal.style.display = 'none';
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

// Secret Mode
window.verificarStatusSecretNex = verificarStatusSecretNex;
window.alternarSecretModeNex = alternarSecretModeNex;
window.atualizarBadgeSolicitacoesNex = atualizarBadgeSolicitacoesNex;
window.abrirSolicitacoesSecretNex = abrirSolicitacoesSecretNex;
window.aceitarSolicitacaoSecretNex = aceitarSolicitacaoSecretNex;
window.recusarSolicitacaoSecretNex = recusarSolicitacaoSecretNex;
window.fecharSolicitacoesSecretNex = fecharSolicitacoesSecretNex;

// Novas funções de Amigos (Busca e QR Code)
window.buscarUsuarioNex = buscarUsuarioNex;
window.abrirMeuQrCodeNex = abrirMeuQrCodeNex;
window.fecharMeuQrCodeNex = fecharMeuQrCodeNex;
window.abrirLeitorQrCodeNex = abrirLeitorQrCodeNex;
window.fecharLeitorQrCodeNex = fecharLeitorQrCodeNex;
  
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
