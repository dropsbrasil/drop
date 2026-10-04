/* ============================================
   08-PERFIL.JS
   Perfil visitado, selo de adepto, conectar/desconectar
   
   Depende de: 00-config.js, 02-ui.js, 03-utils.js, 04-conversas.js
============================================ */

(function () {
  'use strict';

  // ============================================
// PERFIS VISITADOS (dados reais do Supabase)
// ============================================
// Os dados agora são buscados em tempo real pelo
// @username da pessoa visitada.

const perfisVisitadosNex = {}; // mantido vazio para compatibilidade

  // ============================================
  // BLOQUEADOS (em memória, depois vira backend)
  // ============================================

  const perfisBloqueadosNex = new Set();
  window.perfisBloqueadosNex = perfisBloqueadosNex;

  // ============================================
  // ABRIR PERFIL VISITADO
  // ============================================

async function abrirPerfilVisitadoNex(perfilId, perfilNome) {
Drops.estado.telaOrigemPerfilVisitado =
  document.querySelector('.screen.active')?.id || 'nex';

const id = String(perfilId || '').replace(/^@/, '').trim().toLowerCase();

Drops.estado.perfilBloquearAtual = id;
Drops.estado.perfilAberto = perfilNome;

if (perfisBloqueadosNex.has(id)) {
  return;
}

// ⚠️ CORREÇÃO: Restaura scroll do body
document.body.style.overflow = '';
document.body.classList.remove('viewer-aberto');

// Registra visita (hoje: stub; amanhã: backend)
if (typeof window.registrarVisitaPerfil === 'function') {
  window.registrarVisitaPerfil(id, Drops.usernameAtual);
}

// ============================================
// BUSCA DADOS REAIS NO SUPABASE
// ============================================
let perfilReal = null;

try {
  if (typeof window.buscarPerfilPublicoSupabase === 'function') {
    perfilReal = await window.buscarPerfilPublicoSupabase(id);
  }
} catch (e) {
  console.warn('Erro ao buscar perfil público:', e);
}


// Dados padrão (usados se o perfil não existir no Supabase)
const perfilBase = {
  nome: perfilReal?.nome || perfilNome || 'Perfil',
  capa: perfilReal?.capa_url || 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200',
  avatar: perfilReal?.avatar_url || null,
  bio: perfilReal?.bio || 'Sem bio disponível no momento.',
  visitas: '0',
  reacoes: '0',
  adeptos: '0',
  social: {
    instagram: perfilReal?.social_instagram || '',
    tiktok: perfilReal?.social_tiktok || '',
    whatsapp: perfilReal?.social_whatsapp || ''
  },
  drops: []
};

// ============================================
// BUSCA DROPS REAIS DESSE USUÁRIO
// ============================================
if (perfilReal && typeof window.buscarDropsDoUsuarioSupabase === 'function') {
  try {
    const drops = await window.buscarDropsDoUsuarioSupabase(perfilReal.id);
    perfilBase.drops = drops;
  } catch (e) {
    console.warn('Erro ao buscar drops do perfil:', e);
  }
}

const perfil = {
  ...perfilBase,
  drops: [...(perfilBase.drops || [])]
};

// ⚠️ Salva no mapa pra usar quando clicar num drop
perfisVisitadosNex[id] = { ...perfil, id };

    // ============================================
    // PREENCHE CAMPOS VISUAIS
    // ============================================

    const capaEl = document.getElementById('perfilCapaNex');
if (capaEl) {
  capaEl.style.backgroundImage = `url('${perfil.capa}')`;
  capaEl.style.cursor = 'pointer';

  capaEl.onclick = () => {
    if (typeof window.abrirFotoPerfilNex === 'function') {
      window.abrirFotoPerfilNex(perfil.capa, perfil.nome, 'capa');
    }
  };
}

const avatarEl = document.getElementById('perfilAvatarNex');
if (avatarEl) {
  const avatarValido =
    perfil.avatar &&
    typeof perfil.avatar === 'string' &&
    (perfil.avatar.startsWith('http') || perfil.avatar.startsWith('data:image'));

  if (avatarValido) {
    avatarEl.style.backgroundImage = 'none';
    avatarEl.innerHTML = `<img src="${perfil.avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;
  } else {
    avatarEl.innerHTML = '';
    avatarEl.style.backgroundImage = 'none';
    avatarEl.textContent = (perfil.nome || '?').charAt(0).toUpperCase();
  }

  // ⚠️ Clique no avatar → abre em tela cheia
  avatarEl.style.cursor = 'pointer';
  avatarEl.onclick = () => {
    if (typeof window.abrirFotoPerfilNex === 'function') {
      window.abrirFotoPerfilNex(avatarValido ? perfil.avatar : null, perfil.nome, 'avatar');
    }
  };
}

    const nomeEl = document.getElementById('perfilNomeNex');
    if (nomeEl) nomeEl.textContent = perfil.nome;

  // ============================================
// BOTÕES SOCIAIS — esconde os vazios
// ============================================
const socialBtns = document.querySelectorAll('.perfil-social button');
const socialConfig = [
  { tipo: 'instagram', valor: perfil.social?.instagram || '' },
  { tipo: 'tiktok', valor: perfil.social?.tiktok || '' },
  { tipo: 'whatsapp', valor: perfil.social?.whatsapp || '' }
];

let algumSocialPreenchido = false;

socialBtns.forEach((btn, i) => {
  const cfg = socialConfig[i];
  if (!cfg) return;

  const temValor = String(cfg.valor || '').trim() !== '';

  if (temValor) {
    btn.style.display = '';
    algumSocialPreenchido = true;

    // ⚠️ Adiciona o clique pra abrir o link
    btn.onclick = (e) => {
      e.preventDefault();
      const link = window.montarLinkSocialNex
        ? window.montarLinkSocialNex(cfg.tipo, cfg.valor)
        : '';
      if (link) window.open(link, '_blank');
    };
  } else {
    btn.style.display = 'none';
    btn.onclick = null;
  }
});

const socialContainer = document.querySelector('.perfil-social');
if (socialContainer) {
  socialContainer.style.display = algumSocialPreenchido ? '' : 'none';
}

    const perfilUsernameEl = document.getElementById('perfilUsernameNex');
    if (perfilUsernameEl) {
      const userLimpo = String(id).replace(/^@/, '').trim();
      perfilUsernameEl.textContent = userLimpo ? '@' + userLimpo : '@usuario';
    }

    const bioEl = document.getElementById('perfilBioNex');
    if (bioEl) bioEl.textContent = perfil.bio;

    // ============================================
    // RENDERIZA GRID DE DROPS
    // ============================================

    const grid = document.getElementById('perfilDropsGridNex');
    if (grid) {
      grid.innerHTML = '';

      if (!perfil.drops || perfil.drops.length === 0) {
        grid.innerHTML = `
          <div style="
            grid-column: 1 / -1;
            text-align: center;
            padding: 40px 20px;
            color: #94a3b8;
            font-size: 14px;
            font-weight: 600;
          ">
            Nenhuma publicação ainda.
          </div>
        `;
      } else {
        perfil.drops.forEach((drop, dropIndex) => {
          const card = document.createElement('div');
          card.className = 'perfil-drop-card';
          card.style.cursor = 'pointer';
          card.setAttribute('role', 'button');
          card.setAttribute('tabindex', '0');

          const abrirDrop = () => abrirDropsPerfilVisitadoNex(id, dropIndex);

          card.addEventListener('click', abrirDrop);
          card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              abrirDrop();
            }
          });

          if (drop.type === 'video') {
            card.innerHTML = `
              <div class="perfil-drop-media-indicator">🎥 vídeo</div>
              <video src="${drop.url}" muted loop playsinline autoplay></video>
              <div class="perfil-drop-meta">preview</div>
            `;
          } else {
            card.innerHTML = `
              <div class="perfil-drop-media-indicator">📸 foto</div>
              <img src="${drop.url}" alt="">
              <div class="perfil-drop-meta">preview</div>
            `;
          }

          grid.appendChild(card);
        });
      }
    }

    // ============================================
    // MOSTRA A TELA E ATUALIZA BOTÕES
    // ============================================

    if (typeof mostrarTela === 'function') {
      mostrarTela('perfilVisitadoNex');
    }

      atualizarBotaoConectarPerfilNex();
  atualizarSeloAdeptoPerfilNex(id);

// Renderiza o mural do perfil visitado
renderizarMuralNoPerfilVisitadoNex(id);
  }

// ============================================
// MURAL NO PERFIL VISITADO
// ============================================

async function renderizarMuralNoPerfilVisitadoNex(perfilId) {
  const btn = document.getElementById('perfilMuralBtnNex');
  const contador = document.getElementById('perfilMuralContadorNex');

  if (!btn) return;

  btn.onclick = () => {
    if (typeof window.abrirMuralNex === 'function') {
      window.abrirMuralNex(perfilId);
    }
  };

  let contribuicoes = [];

  try {
    if (typeof window.buscarMuralSupabase === 'function') {
      contribuicoes = await window.buscarMuralSupabase(perfilId);
    }
  } catch (err) {
    console.warn('Erro ao buscar mural do perfil:', err);
  }

  let totalElementos = 0;

  if (Array.isArray(contribuicoes)) {
    contribuicoes.forEach((contrib) => {
      const dados = contrib.dados || {};
      if (Array.isArray(dados.elementos)) {
        totalElementos += dados.elementos.length;
      }
      if (Array.isArray(dados.tracos)) {
        totalElementos += dados.tracos.length;
      }
    });
  }

  if (contador) {
    if (totalElementos === 0) {
      contador.textContent = 'Deixe sua marca';
    } else if (totalElementos === 1) {
      contador.textContent = '1 marca já aqui';
    } else {
      contador.textContent = `${totalElementos} marcas já aqui`;
    }
  }
}
  
// ============================================
// MODAL "MURAL EM BREVE"
// ============================================

function abrirMuralEmBrevePerfilNex(perfilId) {
  const modal = document.getElementById('perfilMuralEmBreveNex');
  if (modal) modal.style.display = 'flex';
}

function fecharMuralEmBrevePerfilNex() {
  const modal = document.getElementById('perfilMuralEmBreveNex');
  if (modal) modal.style.display = 'none';
}
  
  // ============================================
  // VOLTAR DO PERFIL
  // ============================================

  function voltarPerfilVisitadoNex() {
    const destino = Drops.estado.telaOrigemPerfilVisitado || 'nex';

    if (typeof mostrarTela === 'function') {
      mostrarTela(destino);
    }

    if (destino === 'nex' && typeof mostrarNexTab === 'function') {
      mostrarNexTab('naolidas');
    }
  }

  // ============================================
  // ABRIR DROPS DO PERFIL VISITADO
  // ============================================

  function abrirDropsPerfilVisitadoNex(perfilId, dropIndexInicial = 0) {
    const id = String(perfilId || '').trim().toLowerCase();

    const perfil = perfisVisitadosNex[id];

    if (!perfil || !Array.isArray(perfil.drops) || !perfil.drops.length) {
      return;
    }

    const base = {
      [id]: {
        ...perfil,
        id
      }
    };

    if (typeof abrirViewerPublicacaoNex === 'function') {
      abrirViewerPublicacaoNex(
        base[id],
        'perfil',
        id,
        dropIndexInicial,
        base
      );
    }
  }

  // ============================================
  // ATUALIZAR BOTÃO CONECTAR/DESCONECTAR
  // ============================================

  function atualizarBotaoConectarPerfilNex() {
    const btn = document.getElementById('btnConectarPerfilNex');
    if (!btn) return;

    const id = normalizarIdPerfilNex(Drops.estado.perfilBloquearAtual);

    const conectado = lerConectadosMyDropsNex().some(
      (item) => normalizarIdPerfilNex(item.id) === id
    );

    btn.textContent = conectado ? 'Desconectar' : '➕ Conectar';
    btn.classList.toggle('is-connected', conectado);
  }

  // ============================================
  // CONECTAR / DESCONECTAR PERFIL
  // ============================================

  async function alternarConexaoPerfilNex() {
  const id = normalizarIdPerfilNex(Drops.estado.perfilBloquearAtual);
  if (!id) return;

  const perfil = perfisVisitadosNex[id] || {
    nome: Drops.estado.perfilAberto || id,
    avatar: (Drops.estado.perfilAberto || id).charAt(0).toUpperCase()
  };

  let lista = lerConectadosMyDropsNex();
  const jaExiste = lista.some((item) => item.id === id);

  if (jaExiste) {
    // ⚠️ Desconectar — remove do Supabase primeiro
    if (window.ConectadosAdapterNex?.removerConectadoSupabase) {
      await window.ConectadosAdapterNex.removerConectadoSupabase(id);
    }

    const perfilRemovido = lista.find(
      (item) => normalizarIdPerfilNex(item.id) === id
    );

    if (typeof registrarDesconexaoMyDropsNex === 'function') {
      registrarDesconexaoMyDropsNex(perfilRemovido || perfil);
    }

    lista = lista.filter((item) => normalizarIdPerfilNex(item.id) !== id);
  } else {
    // ⚠️ Conectar — salva no Supabase primeiro
    if (window.ConectadosAdapterNex?.adicionarConectadoSupabase) {
      await window.ConectadosAdapterNex.adicionarConectadoSupabase(id);
    }

    lista.unshift({
      id,
      nome: perfil.nome || id,
      avatar:
        perfil.avatar || (perfil.nome || id).charAt(0).toUpperCase()
    });
  }

  salvarConectadosMyDropsNex(lista);
  atualizarBotaoConectarPerfilNex();

  if (typeof renderizarConectadosMyDropsNex === 'function') {
    renderizarConectadosMyDropsNex();
  }

  if (typeof renderizarPublicacoesNearbyNex === 'function') {
    renderizarPublicacoesNearbyNex();
  }

  if (typeof sincronizarConversasComConectadosMyDropsNex === 'function') {
    sincronizarConversasComConectadosMyDropsNex();
  }
  }
  
  // ============================================
  // SELO DE ADEPTO
  // ============================================

  function atualizarSeloAdeptoPerfilNex(perfilId) {
    const nomeArea = document.querySelector('.perfil-nome-area');
    if (!nomeArea) return;

    // Remove selo antigo
    const antigo = nomeArea.querySelector('.selo-adepto-nex');
    if (antigo) antigo.remove();

    const idLimpo = normalizarIdPerfilNex(perfilId);

    const adeptos =
      typeof lerAdeptosNex === 'function' ? lerAdeptosNex() : [];

    const ehAdepto = adeptos.some((a) => a.id === idLimpo);

    if (ehAdepto) {
      const h2 = document.getElementById('perfilNomeNex');
      if (h2) {
        const selo = document.createElement('span');
        selo.className = 'selo-adepto-nex';
        selo.textContent = '👑';
        selo.title = 'Este usuário é seu adepto';
        h2.appendChild(selo);
      }
    }
  }

  // ============================================
  // ABRIR CHAT DIRETO COM PERFIL
  // ============================================

  function abrirChatDiretoPerfilNex() {
    const perfilAberto = Drops.estado.perfilAberto;
    if (!perfilAberto) return;

    if (typeof mostrarTela === 'function') {
      mostrarTela('nex');
    }

    if (typeof mostrarNexTab === 'function') {
      mostrarNexTab('naolidas');
    }

    let card = obterCardConversaNex(perfilAberto);

    if (!card) {
      if (typeof criarCardConversaNex === 'function') {
        criarCardConversaNex(
          perfilAberto,
          estaConectadoNoMyDropsNex(perfilAberto),
          { text: 'Começou uma conversa no NEX' }
        );
      }

      card = obterCardConversaNex(perfilAberto);
    }

    if (card) card.click();
  }

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.abrirPerfilVisitadoNex = abrirPerfilVisitadoNex;
  window.renderizarMuralNoPerfilVisitadoNex = renderizarMuralNoPerfilVisitadoNex;
  window.abrirMuralEmBrevePerfilNex = abrirMuralEmBrevePerfilNex;
window.fecharMuralEmBrevePerfilNex = fecharMuralEmBrevePerfilNex;
  window.voltarPerfilVisitadoNex = voltarPerfilVisitadoNex;
  window.abrirDropsPerfilVisitadoNex = abrirDropsPerfilVisitadoNex;
  window.atualizarBotaoConectarPerfilNex = atualizarBotaoConectarPerfilNex;
  window.alternarConexaoPerfilNex = alternarConexaoPerfilNex;
  window.atualizarSeloAdeptoPerfilNex = atualizarSeloAdeptoPerfilNex;
  window.abrirChatDiretoPerfilNex = abrirChatDiretoPerfilNex;

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    // Botão Conectar
    const btnConectarPerfil = document.getElementById('btnConectarPerfilNex');
    if (btnConectarPerfil) {
      btnConectarPerfil.addEventListener('click', alternarConexaoPerfilNex);
    }

  // Botão Abrir Chat
  const btnAbrirChat = document.getElementById('btnAbrirChatPerfilNex');
  if (btnAbrirChat) {
    btnAbrirChat.addEventListener('click', abrirChatDiretoPerfilNex);
  }

  // Modal "Mural em breve" — botão OK
  const btnOkMural = document.getElementById('perfilMuralEmBreveOkNex');
  if (btnOkMural) {
    btnOkMural.addEventListener('click', fecharMuralEmBrevePerfilNex);
  }

  // Fecha modal ao clicar fora
  const modalMural = document.getElementById('perfilMuralEmBreveNex');
  if (modalMural) {
    modalMural.addEventListener('click', (e) => {
      if (e.target === modalMural) fecharMuralEmBrevePerfilNex();
    });
  }
});

  // ============================================
  // DEBUG
  // ============================================

  console.log('👤 08-perfil.js carregado');

})();
