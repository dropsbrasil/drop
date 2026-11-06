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

  const perfisVisitadosNex = {}; 

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
  if (typeof window.mostrarToastNex === 'function') {
    window.mostrarToastNex('Perfil indisponível.', 'info');
  }
  return;
}

// ⚠️ LGPD / Política de Bloqueio:
// Se EU fui bloqueado por essa pessoa, não posso visualizar o perfil dela.
const estouBloqueadoPorEle =
  typeof window.checarSeFuiSilenciadoNex === 'function' &&
  window.checarSeFuiSilenciadoNex(id);

if (estouBloqueadoPorEle) {
  if (typeof window.mostrarToastNex === 'function') {
    window.mostrarToastNex('Perfil indisponível.', 'info');
  }
  return;
}

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
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #94a3b8; font-size: 14px; font-weight: 600;">
        Não foi possível carregar as publicações.
      </div>
    `;
  }

  atualizarBotaoConectarPerfilNex();
  criarBotaoDenunciarNex(); // ⚠️ Mantém o botão de denunciar mesmo offline
  return; // ⚠️ ABORTA. Não monta perfil fake.
}

// Dados reais — usa apenas o que veio do banco
const perfilBase = {
  nome: perfilReal.nome || perfilNome || 'Perfil',
  capa: perfilReal.capa_url || '',
  avatar: perfilReal.avatar_url || null,
  bio: perfilReal.bio || 'Sem bio ainda.',
  visitas: '0',
  reacoes: '0',
  adeptos: '0',
  // ⚠️ CORREÇÃO SECRET MODE: preserva is_secret em perfisVisitadosNex
  // pra o revalidate do alternarConexaoPerfilNex funcionar.
  is_secret: perfilReal.is_secret === true,
  id: perfilReal.id || null,
  username: perfilReal.username || id,
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
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #94a3b8; font-size: 14px; font-weight: 600;">
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

        if (drop.compartilhado_de_id) {
          const capsulaAutor = document.createElement('div');
          capsulaAutor.className = 'mydrops-publication-capsula-autor';

          const avatarHTML = drop.compartilhado_de_avatar
            ? `<img src="${escapeHTML(drop.compartilhado_de_avatar)}" alt="">`
            : escapeHTML((drop.compartilhado_de_nome || '?').charAt(0).toUpperCase());

          capsulaAutor.innerHTML = `
            <div class="mydrops-publication-capsula-autor-avatar">${avatarHTML}</div>
            <svg class="mydrops-publication-capsula-autor-icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
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

// ⚠️ NOVO: Verifica se o perfil é Secret e aplica o bloqueio visual
await verificarEBloquearPerfilSecretNex(perfilReal);

atualizarBotaoConectarPerfilNex();
  atualizarSeloAdeptoPerfilNex(id);
  criarBotaoDenunciarNex(); // ⚠️ Chama a criação do botão de denúncia

  renderizarMuralNoPerfilVisitadoNex(id);
}

// ============================================
// SISTEMA DE DENÚNCIA (PERFIL)
// ============================================

function criarBotaoDenunciarNex() {
  const btnBloquear = document.getElementById('btnBloquearPerfilNex');
  if (!btnBloquear) return;

  // Evita criar duplicado
  if (document.getElementById('btnDenunciarPerfilNex')) return;

  const btnDenunciar = document.createElement('button');
  btnDenunciar.type = 'button';
  btnDenunciar.id = 'btnDenunciarPerfilNex';
  btnDenunciar.className = 'perfil-btn-bloquear'; // usa o mesmo estilo do bloquear
  btnDenunciar.style.left = '110px'; // Posiciona ao lado do botão bloquear
  btnDenunciar.style.borderColor = '#f59e0b'; // Laranja
  btnDenunciar.style.color = '#f59e0b';
  btnDenunciar.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
    Denunciar
  `;

  btnDenunciar.onclick = () => {
    abrirModalDenunciaNex(
      Drops.estado.perfilAberto || 'Usuário', 
      Drops.estado.perfilBloquearAtual, 
      null // Sem mensagem específica
    );
  };

  // Insere o botão logo após o botão de bloquear
  btnBloquear.parentNode.insertBefore(btnDenunciar, btnBloquear.nextSibling);
}

function abrirModalDenunciaNex(nomePessoa, usernameAlvo, mensagemId) {
  if (!usernameAlvo) return;

  // Se o modal já existir, apenas atualiza e abre
  let modal = document.getElementById('modalDenunciaNex');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalDenunciaNex';
    modal.className = 'modal-msg-nex'; // Reaproveita o estilo de modal escuro
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-msg-box" style="background: #0f172a; border: 1px solid rgba(255,255,255,.1);">
        <div class="modal-confirm-delete-title" style="color: #fff; text-align: left; padding: 0 0 10px 0;">
          Denunciar <strong id="denunciaNomeAlvo"></strong>
        </div>
        
        <select id="denunciaMotivoNex" style="width: 100%; height: 48px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 0 12px; margin-bottom: 12px; font-size: 15px;">
          <option value="Spam">Spam ou golpe</option>
          <option value="Assédio">Assédio ou bullying</option>
          <option value="Conteúdo impróprio">Conteúdo impróprio/nudez</option>
          <option value="Perfil falso">Perfil falso</option>
          <option value="Outro">Outro motivo</option>
        </select>

        <textarea id="denunciaDetalhesNex" placeholder="Descreva o que aconteceu (opcional)" style="width: 100%; height: 80px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; margin-bottom: 16px; font-size: 14px; resize: none; outline: none;"></textarea>

        <div class="modal-confirm-delete-actions">
          <button type="button" class="btn-delete-cancel-nex" id="btnCancelarDenunciaNex" style="background: rgba(255,255,255,.08) !important; color: #cbd5e1 !important; box-shadow: none !important;">Cancelar</button>
          <button type="button" class="btn-delete-confirm-nex" id="btnEnviarDenunciaNex" style="background: #f59e0b !important; color: #fff !important; box-shadow: 0 8px 24px rgba(245,158,11,.28) !important;">Enviar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Eventos de fechar
    modal.querySelector('#btnCancelarDenunciaNex').onclick = () => {
      modal.style.display = 'none';
    };
    modal.onclick = (e) => {
      if (e.target === modal) modal.style.display = 'none';
    };
  }

  // Preenche o nome
  modal.querySelector('#denunciaNomeAlvo').textContent = nomePessoa;
  modal.querySelector('#denunciaDetalhesNex').value = '';
  modal.querySelector('#denunciaMotivoNex').value = 'Spam';

  // Ação do botão Enviar
  const btnEnviar = modal.querySelector('#btnEnviarDenunciaNex');
  btnEnviar.onclick = async () => {
    btnEnviar.disabled = true;
    btnEnviar.textContent = 'Enviando...';

    try {
      const motivo = modal.querySelector('#denunciaMotivoNex').value;
      const detalhes = modal.querySelector('#denunciaDetalhesNex').value.trim();

      const { data: { user } } = await window.supabaseClient.auth.getUser();
      
      // Busca o ID da pessoa denunciada
      const { data: perfilAlvo } = await window.supabaseClient
        .from('profiles')
        .select('id')
        .eq('username', usernameAlvo)
        .maybeSingle();

      if (perfilAlvo && user) {
        await window.supabaseClient.from('denuncias').insert({
          denunciante_id: user.id,
          denunciado_id: perfilAlvo.id,
          denunciado_username: usernameAlvo,
          motivo: motivo,
          detalhes: detalhes || null,
          mensagem_id: mensagemId || null
        });
        
        window.mostrarToastNex?.('Denúncia enviada. Obrigado por avisar!', 'sucesso');
        modal.style.display = 'none';
      }
    } catch (err) {
      console.error('Erro ao denunciar:', err);
      window.mostrarToastNex?.('Erro ao enviar denúncia.', 'erro');
    } finally {
      btnEnviar.disabled = false;
      btnEnviar.textContent = 'Enviar';
    }
  };

  modal.style.display = 'flex';
}
  // ============================================
// MURAL NO PERFIL VISITADO
// ============================================

async function renderizarMuralNoPerfilVisitadoNex(perfilId) {
  const btn = document.getElementById('perfilMuralBtnNex');
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

  const pessoasUnicas = new Set();

  if (Array.isArray(contribuicoes)) {
    contribuicoes.forEach((contrib) => {
      const autor = String(contrib.autor_username || contrib.autor_id || '')
        .replace(/^@/, '')
        .toLowerCase()
        .trim();

      if (autor) pessoasUnicas.add(autor);
    });
  }

  const total = pessoasUnicas.size;

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

  // ⚠️ CORREÇÃO SECRET MODE:
  // Se acabou de adicionar (não de remover), revalida o bloqueio
  // pra liberar o perfil na hora, sem precisar fechar e reabrir.
  if (!jaExiste) {
    try {
      const perfilAtual = perfisVisitadosNex[id];
      if (perfilAtual && typeof verificarEBloquearPerfilSecretNex === 'function') {
        await verificarEBloquearPerfilSecretNex(perfilAtual);
      }
    } catch (err) {
      console.warn('Erro ao revalidar secret após conectar:', err);
    }
  }
  }

  // ============================================
  // SELO DE ADEPTO
  // ============================================

  function atualizarSeloAdeptoPerfilNex(perfilId) {
    const nomeArea = document.querySelector('.perfil-nome-area');
    if (!nomeArea) return;

    const antigo = nomeArea.querySelector('.selo-adepto-nex');
    if (antigo) antigo.remove();

    const idLimpo = normalizarIdPerfilNex(perfilId);
    const adeptos = typeof lerAdeptosNex === 'function' ? lerAdeptosNex() : [];
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
  const perfilUsername = Drops.estado.perfilBloquearAtual;
  const perfilAberto = Drops.estado.perfilAberto;

  if (!perfilAberto || !perfilUsername) {
    alert('Perfil sem dados. Volte e tente novamente.');
    return;
  }

  window.__chatVeioDoPerfil = true;
  Drops.estado.conversaAtual = '';

  if (typeof window.abrirChatNex === 'function') {
    window.abrirChatNex({
      username: perfilUsername,
      nome: perfilAberto,
      chave: perfilUsername
    });
  }
}

  window.abrirChatDiretoPerfilNex = abrirChatDiretoPerfilNex;

// ============================================
// VERIFICAR SECRET MODE NO PERFIL VISITADO
// ============================================
async function verificarEBloquearPerfilSecretNex(perfilReal) {
  const caixaBloqueio = document.getElementById('bloqueioSecretPerfilNex');
  const perfilAcoes = document.getElementById('perfilAcoesNex');
  const conteudoPrivado = document.getElementById('conteudoPrivadoPerfilNex');
  const btnSolicitar = document.getElementById('btnSolicitarAcessoPerfilNex');
  const avisoPendente = document.getElementById('avisoSolicitacaoPendenteNex');

  if (!caixaBloqueio || !perfilReal) return;

  // ⚠️ Normaliza is_secret (aceita true, "true", 1, "1")
  const ehSecret =
    perfilReal.is_secret === true ||
    perfilReal.is_secret === 'true' ||
    perfilReal.is_secret === 1 ||
    perfilReal.is_secret === '1';

  // ⚠️ Fallback pros campos que podem faltar
  const usernameAlvo = String(
    perfilReal.username ||
    Drops.estado.perfilBloquearAtual ||
    ''
  ).replace(/^@/, '').toLowerCase().trim();

  console.log('🔐 verificarEBloquearPerfilSecretNex:', {
    perfil: usernameAlvo,
    is_secret: perfilReal.is_secret,
    ehSecret
  });

  // 1. Se não for Secret, mostra tudo normalmente e esconde o bloqueio
  if (!ehSecret) {
    caixaBloqueio.style.display = 'none';
    if (perfilAcoes) perfilAcoes.style.display = 'grid';
    if (conteudoPrivado) conteudoPrivado.style.display = 'block';
    return;
  }

  // 2. É Secret. Vamos verificar se EU tenho acesso
  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    const meuUsername = String(Drops.usernameAtual || '')
      .replace(/^@/, '').toLowerCase().trim();

    // O dono do perfil vê o próprio perfil
    const ehMeuPerfil =
      perfilReal.id === user.id ||
      (usernameAlvo && usernameAlvo === meuUsername);

    if (ehMeuPerfil) {
      caixaBloqueio.style.display = 'none';
      if (perfilAcoes) perfilAcoes.style.display = 'grid';
      if (conteudoPrivado) conteudoPrivado.style.display = 'block';
      return;
    }

    // Verifica se já sou amigo (estou nos conectados dele ou ele nos meus)
    const meusConectados = typeof window.lerConectadosMyDropsNex === 'function'
      ? window.lerConectadosMyDropsNex()
      : [];

    const souAmigo = meusConectados.some(
      (c) => String(c.id).replace(/^@/, '').toLowerCase().trim() === usernameAlvo
    );

    if (souAmigo) {
      caixaBloqueio.style.display = 'none';
      if (perfilAcoes) perfilAcoes.style.display = 'grid';
      if (conteudoPrivado) conteudoPrivado.style.display = 'block';
      return;
    }

    // ⚠️ Só consulta solicitacoes_acesso se tiver o id do perfil
    let solicitacao = null;
    if (perfilReal.id) {
      const { data } = await window.supabaseClient
        .from('solicitacoes_acesso')
        .select('id, status')
        .eq('dono_perfil_id', perfilReal.id)
        .eq('solicitante_id', user.id)
        .maybeSingle();
      solicitacao = data;
    }

    // Se não sou amigo, bloqueia a tela
    caixaBloqueio.style.display = 'block';
    if (perfilAcoes) perfilAcoes.style.display = 'none';
    if (conteudoPrivado) conteudoPrivado.style.display = 'none';

    if (solicitacao && solicitacao.status === 'pendente') {
      if (btnSolicitar) btnSolicitar.style.display = 'none';
      if (avisoPendente) avisoPendente.style.display = 'block';
    } else if (solicitacao && solicitacao.status === 'aprovado') {
      // Se foi aprovado, libera o acesso
      caixaBloqueio.style.display = 'none';
      if (perfilAcoes) perfilAcoes.style.display = 'grid';
      if (conteudoPrivado) conteudoPrivado.style.display = 'block';
    } else {
      if (btnSolicitar) btnSolicitar.style.display = 'block';
      if (avisoPendente) avisoPendente.style.display = 'none';
    }

  } catch (err) {
    console.warn('Erro ao verificar secret mode do perfil:', err);
  }
}
async function solicitarAcessoPerfilNex() {
  const btn = document.getElementById('btnSolicitarAcessoPerfilNex');
  const aviso = document.getElementById('avisoSolicitacaoPendenteNex');
  const perfilId = Drops.estado.perfilBloquearAtual; // O username

  if (!btn || !perfilId) return;

  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    
    // Precisamos do UUID do perfil, então busca pelo username
    const { data: perfil } = await window.supabaseClient
      .from('profiles')
      .select('id')
      .eq('username', String(perfilId).toLowerCase())
      .maybeSingle();

    if (!perfil?.id) throw new Error('Perfil não encontrado');

    const { error } = await window.supabaseClient
      .from('solicitacoes_acesso')
      .insert({
        dono_perfil_id: perfil.id,
        solicitante_id: user.id,
        status: 'pendente'
      });

    if (error && error.code !== '23505') throw error; // 23505 = já existe

    window.mostrarToastNex?.('Solicitação enviada!', 'sucesso');
    btn.style.display = 'none';
    if (aviso) aviso.style.display = 'block';

  } catch (err) {
    console.warn('Erro ao solicitar acesso:', err);
    window.mostrarToastNex?.('Erro ao enviar solicitação.', 'erro');
    btn.disabled = false;
    btn.textContent = 'Solicitar Acesso';
  }
}

window.solicitarAcessoPerfilNex = solicitarAcessoPerfilNex;
  
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

  // Exporta o modal de denúncia para ser usado no chat depois
  window.abrirModalDenunciaNex = abrirModalDenunciaNex;

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    if (window.BloqueadosAdapterNex?.carregarBloqueadosSupabase) {
      setTimeout(async () => {
        await window.BloqueadosAdapterNex.carregarBloqueadosSupabase();
      }, 1200);
    }

    const btnConectarPerfil = document.getElementById('btnConectarPerfilNex');
    if (btnConectarPerfil) {
      btnConectarPerfil.addEventListener('click', alternarConexaoPerfilNex);
    }

    const btnOkMural = document.getElementById('perfilMuralEmBreveOkNex');
    if (btnOkMural) {
      btnOkMural.addEventListener('click', fecharMuralEmBrevePerfilNex);
    }

    const modalMural = document.getElementById('perfilMuralEmBreveNex');
    if (modalMural) {
      modalMural.addEventListener('click', (e) => {
        if (e.target === modalMural) fecharMuralEmBrevePerfilNex();
      });
    }
  });

  console.log('👤 08-perfil.js carregado');

})();
