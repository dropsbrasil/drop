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
// 1. ABRE A TELA IMEDIATAMENTE (Antes de buscar)
// ============================================
if (typeof mostrarTela === 'function') {
  mostrarTela('perfilVisitadoNex');
}

// ⚠️ Salva a tela no histórico do app (para o botão voltar funcionar)
if (typeof window.dropsEmpilharEstado === 'function') {
  window.dropsEmpilharEstado('perfil', { id, nome: perfilNome });
}

// Configura os elementos para o estado de "Carregando" (Skeleton)
// ⚠️ IMPORTANTE: variáveis renomeadas com sufixo "Skeleton"
//    para não colidir com as declarações de dados reais
//    mais abaixo no mesmo escopo da função.
const capaSkeletonEl = document.getElementById('perfilCapaNex');
if (capaSkeletonEl) capaSkeletonEl.classList.add('skeleton-box');

const avatarSkeletonEl = document.getElementById('perfilAvatarNex');
if (avatarSkeletonEl) {
  avatarSkeletonEl.innerHTML = '';
  avatarSkeletonEl.textContent = '?';
  avatarSkeletonEl.classList.add('skeleton-box');
}

const nomeSkeletonEl = document.getElementById('perfilNomeNex');
if (nomeSkeletonEl) nomeSkeletonEl.textContent = perfilNome || 'Carregando...';

const userSkeletonEl = document.getElementById('perfilUsernameNex');
if (userSkeletonEl) userSkeletonEl.textContent = '@carregando...';

const bioSkeletonEl = document.getElementById('perfilBioNex');
if (bioSkeletonEl) {
  bioSkeletonEl.textContent = 'Carregando bio...';
  bioSkeletonEl.classList.add('skeleton-box');
}

const gridSkeletonEl = document.getElementById('perfilDropsGridNex');
if (gridSkeletonEl) {
  gridSkeletonEl.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #94a3b8; font-size: 14px; font-weight: 600;">
      Carregando publicações...
    </div>
  `;
}

  // ============================================
  // 2. CRIA O TIMEOUT DE 1 MINUTO
  // ============================================
  // Se o banco não responder em 60s, avisa o usuário
  const timerFalha = setTimeout(() => {
    if (typeof window.mostrarToastNex === 'function') {
      window.mostrarToastNex('Falha de conexão. Verifique sua internet.', 'erro', 4000);
    }
  }, 60000);

  // ============================================
  // 3. BUSCA DADOS REAIS NO SUPABASE
  // ============================================
  let perfilReal = null;

  try {
    if (typeof window.buscarPerfilPublicoSupabase === 'function') {
      perfilReal = await window.buscarPerfilPublicoSupabase(id);
    }
  } catch (e) {
    console.warn('Erro ao buscar perfil público:', e);
  }

// ⚠️ Se a busca terminou (com sucesso ou erro), cancela o timer de falha
clearTimeout(timerFalha);

// ⚠️ Limpa o Skeleton (independente de ter dado certo ou errado)
if (capaSkeletonEl) capaSkeletonEl.classList.remove('skeleton-box');
if (avatarSkeletonEl) avatarSkeletonEl.classList.remove('skeleton-box');
if (bioSkeletonEl) bioSkeletonEl.classList.remove('skeleton-box');
    // ============================================
// ⚠️ PROTEÇÃO: Se o Supabase falhou (rede/bloqueio)
// ============================================
if (!perfilReal) {
  console.warn('⚠️ Perfil não carregado. Supabase indisponível.');

  // Limpa tudo o que era do perfil anterior (evita a "Julia")
  const capaEl = document.getElementById('perfilCapaNex');
  if (capaEl) {
    capaEl.style.backgroundImage = 'none';
    capaEl.style.backgroundColor = '#0f172a';
  }

  const avatarEl = document.getElementById('perfilAvatarNex');
  if (avatarEl) {
    avatarEl.innerHTML = '';
    avatarEl.textContent = (perfilNome || '?').charAt(0).toUpperCase();
  }

  const nomeEl = document.getElementById('perfilNomeNex');
  if (nomeEl) nomeEl.textContent = perfilNome || 'Perfil';

  const userEl = document.getElementById('perfilUsernameNex');
  if (userEl) userEl.textContent = '@' + (id || 'usuario');

  const bioEl = document.getElementById('perfilBioNex');
  if (bioEl) {
    bioEl.textContent = 'Não foi possível carregar. Verifique sua conexão.';
    bioEl.style.removeProperty('font-family');
    bioEl.style.removeProperty('color');
    bioEl.style.removeProperty('text-align');
  }

  const socialContainer = document.querySelector('.perfil-social');
  if (socialContainer) socialContainer.style.display = 'none';

  const grid = document.getElementById('perfilDropsGridNex');
  if (grid) {
    grid.innerHTML = `
      <div style="
        grid-column: 1 / -1;
        text-align: center;
        padding: 40px 20px;
        color: #94a3b8;
        font-size: 14px;
        font-weight: 600;
      ">
        Não foi possível carregar as publicações.
      </div>
    `;
  }

  // Atualiza botões mesmo sem dados reais
  atualizarBotaoConectarPerfilNex();

  return; // ⚠️ ABORTA. Não monta perfil fake.
}

// Dados reais — usa apenas o que veio do banco
const perfilBase = {
  nome: perfilReal.nome || perfilNome || 'Perfil',
  capa: perfilReal.capa_url || '', // Sem capa falsa
  avatar: perfilReal.avatar_url || null,
  bio: perfilReal.bio || 'Sem bio ainda.',
  visitas: '0',
  reacoes: '0',
  adeptos: '0',
  social: {
    instagram: perfilReal.social_instagram || '',
    tiktok: perfilReal.social_tiktok || '',
    whatsapp: perfilReal.social_whatsapp || ''
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
  avatarEl.innerHTML = `<img src="${perfil.avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:32px;display:block;">`;
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
if (bioEl) {
  bioEl.textContent = perfil.bio;

  // ⚠️ Aplica os estilos da bio salvos pelo dono do perfil
  if (perfilReal) {
    if (perfilReal.bio_fonte) {
      bioEl.style.setProperty('font-family', perfilReal.bio_fonte, 'important');
    }
    if (perfilReal.bio_cor) {
      bioEl.style.setProperty('color', perfilReal.bio_cor, 'important');
    }
    if (perfilReal.bio_alinhamento) {
      bioEl.style.setProperty('text-align', perfilReal.bio_alinhamento, 'important');
    }
  } else {
    // Se não tiver dados do Supabase, reseta pros padrões
    bioEl.style.removeProperty('font-family');
    bioEl.style.removeProperty('color');
    bioEl.style.removeProperty('text-align');
  }
}
    
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
  <div class="perfil-drop-media-indicator" style="display: flex; align-items: center; gap: 4px;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true">
      <polygon points="23 7 16 12 23 17 23 7"></polygon>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
    </svg>
    vídeo
  </div>
  <video src="${drop.url}" muted playsinline preload="metadata"></video>
  <div class="perfil-drop-meta">preview</div>
`; 
} else {
  card.innerHTML = `
    <div class="perfil-drop-media-indicator" style="display: flex; align-items: center; gap: 4px;">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="12" height="12" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      foto
    </div>
    <img src="${drop.url}" alt="">
    <div class="perfil-drop-meta">preview</div>
  `;
        }

        // ============================================
        // ⚠️ AJUSTE 1 — CÁPSULA DE AUTOR (drop compartilhado)
        // ============================================
        // Se o drop é uma republicação, mostra a cápsula com o
        // autor original no canto superior esquerdo do card.

        if (drop.compartilhado_de_id) {
          const capsulaAutor = document.createElement('div');
          capsulaAutor.className = 'mydrops-publication-capsula-autor';

          const avatarHTML = drop.compartilhado_de_avatar
            ? `<img src="${escapeHTML(drop.compartilhado_de_avatar)}" alt="">`
            : escapeHTML(
                (drop.compartilhado_de_nome || '?').charAt(0).toUpperCase()
              );

          capsulaAutor.innerHTML = `
            <div class="mydrops-publication-capsula-autor-avatar">
              ${avatarHTML}
            </div>
            <svg class="mydrops-publication-capsula-autor-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          `;

          card.appendChild(capsulaAutor);
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

  // ⚠️ CORREÇÃO: empilha o estado DEPOIS do mostrarTela.
  //    Assim, se um popstate disparar durante a transição
  //    viewer → perfil, o 28-history.js já encontra
  //    perfilVisitadoNex ativa e não joga de volta pro feed.
  if (typeof window.dropsEmpilharEstado === 'function') {
    window.dropsEmpilharEstado('perfil', { id, nome: perfilNome });
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

  // ⚠️ Conta quantas PESSOAS diferentes contribuíram
  const pessoasUnicas = new Set();

  if (Array.isArray(contribuicoes)) {
    contribuicoes.forEach((contrib) => {
      const autor = String(
        contrib.autor_username || contrib.autor_id || ''
      )
        .replace(/^@/, '')
        .toLowerCase()
        .trim();

      if (autor) pessoasUnicas.add(autor);
    });
  }

  const total = pessoasUnicas.size;

  // ⚠️ Atualiza a cápsula nova
  const capsula = document.getElementById('muralCapsulaVisitadoNex');
  if (capsula) {
    const numeroEl = capsula.querySelector('.mural-capsula-numero');
    if (numeroEl) numeroEl.textContent = String(total);
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

    // ============================================
    // ⚠️ AJUSTE 1 — Garante que os drops carreguem os dados
    //    de compartilhamento pro viewer do Nearby montar a cápsula.
    // ============================================

    const dropsComCompartilhamento = (perfil.drops || []).map((drop) => ({
      ...drop,
      compartilhado_de_id: drop.compartilhado_de_id || null,
      compartilhado_de_username: drop.compartilhado_de_username || '',
      compartilhado_de_nome: drop.compartilhado_de_nome || '',
      compartilhado_de_avatar: drop.compartilhado_de_avatar || ''
    }));

    const base = {
      [id]: {
        ...perfil,
        drops: dropsComCompartilhamento,
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

    if (conectado) {
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="8.5" cy="7" r="4"></circle>
      <line x1="23" y1="11" x2="17" y2="11"></line>
    </svg>
    <span>Desconectar</span>
  `;
} else {
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="8.5" cy="7" r="4"></circle>
      <line x1="20" y1="8" x2="20" y2="14"></line>
      <line x1="23" y1="11" x2="17" y2="11"></line>
    </svg>
    <span>Adicionar amigo</span>
  `;
    }

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
        avatar: perfil.avatar || (perfil.nome || id).charAt(0).toUpperCase()
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
    selo.title = 'Este usuário é seu adepto';
    selo.style.display = 'inline-flex';
    selo.style.alignItems = 'center';
    selo.style.justifyContent = 'center';
    
    // ⚠️ Ícone SVG de Estrela no lugar do emoji
    selo.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1a1a1a" width="14" height="14" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    `;
    
    h2.appendChild(selo);
  }
    }
  }

  // ============================================
  // ABRIR CHAT DIRETO COM PERFIL
  // ============================================
function abrirChatDiretoPerfilNex() {
  // ⚠️ Pega direto do estado global (não do DOM, que pode estar desatualizado)
  const perfilUsername = Drops.estado.perfilBloquearAtual;
  const perfilAberto = Drops.estado.perfilAberto;

  if (!perfilAberto || !perfilUsername) {
    alert('Perfil sem dados. Volte e tente novamente.');
    return;
  }

  // ⚠️ Avisa o chat que veio do perfil para ele voltar pra cá
  window.__chatVeioDoPerfil = true;
  
  // ⚠️ Limpa a conversa atual antes de abrir a nova (evita o Efeito Fantasma do Jadilson)
  Drops.estado.conversaAtual = '';

  // ⚠️ PADRONIZAÇÃO: Usa a função oficial de abrir chat do 05-nex-chat.js
  if (typeof window.abrirChatNex === 'function') {
    window.abrirChatNex({
      username: perfilUsername,
      nome: perfilAberto,
      chave: perfilUsername
    });
  } else {
    console.error('❌ abrirChatNex não está disponível.');
  }
}

  window.abrirChatDiretoPerfilNex = abrirChatDiretoPerfilNex;

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
    // ⚠️ Carrega bloqueados do Supabase ao abrir o app
    if (window.BloqueadosAdapterNex?.carregarBloqueadosSupabase) {
      setTimeout(async () => {
        await window.BloqueadosAdapterNex.carregarBloqueadosSupabase();
      }, 1200);
    }

    // Botão Conectar
    const btnConectarPerfil = document.getElementById('btnConectarPerfilNex');
    if (btnConectarPerfil) {
      btnConectarPerfil.addEventListener('click', alternarConexaoPerfilNex);
    }

    // Botão Abrir Chat — usa onclick inline no HTML

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