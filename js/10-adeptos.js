/* ============================================
   10-ADEPTOS.JS
   Sistema de adeptos, interações, notificações
   
   Persistência: via window.AdeptosAdapterNex
   (17-adapters.js).
   
   Depende de: 00-config.js, 03-utils.js, 04-conversas.js
============================================ */

(function () {
  'use strict';

  // ============================================
// INTERAÇÕES — agora no Supabase
// ============================================
// As interações são gravadas via RPC registrar_interacao.
// A leitura pra cálculo de adeptos é feita pela RPC calcular_adeptos.
// Mantemos funções vazias pra compatibilidade com o resto do código.

function lerInteracoesRecebidasNex() {
  return [];
}

function salvarInteracoesRecebidasNex() {}

function lerInteracoesEnviadasNex() {
  return window.AdeptosAdapterNex.lerInteracoesEnviadas();
}

function salvarInteracoesEnviadasNex(lista) {
  window.AdeptosAdapterNex.salvarInteracoesEnviadas(lista);
}
  
  // ============================================
  // REGISTRAR INTERAÇÃO
  // ============================================
  function registrarInteracaoNex(autorId, tipo, dropId) {
  const idLimpo = String(autorId || '').trim().toLowerCase();
  if (!idLimpo) return;

  const eu = String(Drops.usernameAtual || '').trim().toLowerCase();

  // Descobre o @username do dono do drop
  let idDonoDoDrop = idLimpo;
  if (idLimpo === 'local' || !idLimpo) {
    idDonoDoDrop = String(dropId || '').split('::')[0] || '';
  }

  idDonoDoDrop = idDonoDoDrop.replace(/^@/, '').trim().toLowerCase();
  if (!idDonoDoDrop) return;

  // Não registra auto-interação
  if (idDonoDoDrop === eu) return;

  // 1. Salva local (pra calcular "sou adepto de")
try {
  const enviadas = window.AdeptosAdapterNex.lerInteracoesEnviadas();
  enviadas.push({
    autorId: idDonoDoDrop,
    interagenteId: eu,
    paraId: idDonoDoDrop,
    tipo: String(tipo || 'like').trim(),
    dropId: String(dropId || '').trim(),
    timestamp: Date.now()
  });
  window.AdeptosAdapterNex.salvarInteracoesEnviadas(enviadas);
} catch (e) {
  console.warn('Erro ao salvar interação local:', e);
}

// 2. Envia pro Supabase (a RPC cuida do resto)
if (!window.supabaseClient) return;

window.supabaseClient
  .rpc('registrar_interacao', {
    username_alvo: idDonoDoDrop,
    drop_id_param: String(dropId || '').trim(),
    tipo_param: String(tipo || 'like').trim()
  })
  .then(() => {
    console.log(`📤 Interação registrada: → ${idDonoDoDrop}`);
  })
  .catch((err) => {
    console.warn('Erro ao registrar interação:', err);
  });
  }

  // ============================================
  // LIMPAR INTERAÇÕES ANTIGAS (30 dias)
  // ============================================

  function limparInteracoesAntigasNex() {
  // Não é mais necessário: a RPC calcular_adeptos
  // já filtra por janela de 30 dias no banco.
  }
  
  // ============================================
// CALCULAR ADEPTOS (quem virou MEU adepto)
// ============================================

async function calcularAdeptosNex() {
  if (!window.supabaseClient) return [];

  try {
    const { data, error } = await window.supabaseClient
      .rpc('calcular_adeptos');

    if (error) {
      console.warn('Erro ao calcular adeptos:', error);
      return [];
    }

    // Converte retorno da RPC pro formato antigo
    const adeptosCalculados = (data || []).map((a) => ({
      id: a.username || String(a.adepto_id),
      nome: a.nome || a.username || 'Usuário',
      avatar: a.avatar_url || (a.nome || '?').charAt(0).toUpperCase(),
      desde: a.ultima_interacao ? new Date(a.ultima_interacao).getTime() : Date.now(),
      ultimaInteracao: a.ultima_interacao ? new Date(a.ultima_interacao).getTime() : Date.now(),
      totalInteracoes: Number(a.total_interacoes) || 0
    }));

    // Compara com a lista antiga pra notificar
    const adeptosAntigos = lerAdeptosNex();
    const idsAntigos = new Set(adeptosAntigos.map((a) => a.id));
    const idsNovos = new Set(adeptosCalculados.map((a) => a.id));

    const entraram = adeptosCalculados.filter((a) => !idsAntigos.has(a.id));
    const sairam = adeptosAntigos.filter((a) => !idsNovos.has(a.id));

    entraram.forEach((a) => notificarAdeptoNex(a, 'entrou'));
    sairam.forEach((a) => notificarAdeptoNex(a, 'saiu'));

    salvarAdeptosNex(adeptosCalculados);
    atualizarContadorAdeptosNex();

    return adeptosCalculados;
  } catch (erro) {
    console.warn('Erro ao calcular adeptos:', erro);
    return [];
  }
}

// ============================================
// CALCULAR "SOU ADEPTO DE QUEM"
// ============================================

function calcularAdeptosEnviadosNex() {
  const agora = Date.now();
  const JANELA_MS = Drops.LIMITES.JANELA_DIAS * 24 * 60 * 60 * 1000;

  const interacoes = lerInteracoesEnviadasNex();

  const porPerfil = {};

  interacoes.forEach((i) => {
    const paraId = i.paraId || i.dropId.split('::')[0] || '';
    if (!paraId) return;

    if (!porPerfil[paraId]) {
      porPerfil[paraId] = { total: 0, ultima: 0 };
    }

    porPerfil[paraId].total += 1;

    if (i.timestamp > porPerfil[paraId].ultima) {
      porPerfil[paraId].ultima = i.timestamp;
    }
  });

  const souAdeptoDe = [];

  Object.entries(porPerfil).forEach(([perfilId, dados]) => {
    if (agora - dados.ultima > JANELA_MS) return;
    if (dados.total < Drops.LIMITES.MINIMO_INTERACOES) return;

    souAdeptoDe.push({
      id: perfilId,
      totalInteracoes: dados.total,
      ultimaInteracao: dados.ultima
    });
  });

  // Compara com a lista antiga
  const antigos = lerSouAdeptoDeNex();
  const idsAntigos = new Set(antigos.map((a) => a.id));
  const idsNovos = new Set(souAdeptoDe.map((a) => a.id));

  const novos = souAdeptoDe.filter((a) => !idsAntigos.has(a.id));
  const saiu = antigos.filter((a) => !idsNovos.has(a.id));

  novos.forEach((a) => notificarSouAdeptoNex(a, 'entrou'));
  saiu.forEach((a) => notificarSouAdeptoNex(a, 'saiu'));

  window.AdeptosAdapterNex.salvarSouAdeptoDe(souAdeptoDe);

  console.log('🎯 Sou adepto de:', souAdeptoDe);
  return souAdeptoDe;
}

// ============================================
// ADEPTOS — LEITURA E ESCRITA
// ============================================

function lerAdeptosNex() {
  return window.AdeptosAdapterNex.lerAdeptos();
}

function salvarAdeptosNex(lista) {
  window.AdeptosAdapterNex.salvarAdeptos(lista);
}

function lerSouAdeptoDeNex() {
  return window.AdeptosAdapterNex.lerSouAdeptoDe();
}
 // ============================================
// NOTIFICAR QUE SOU ADEPTO DE ALGUÉM
// ============================================

function notificarSouAdeptoNex(perfil, tipo) {
  const id = perfil.id;
  if (!id) return;

  const conectado = lerConectadosMyDropsNex().find(
    (c) => normalizarIdPerfilNex(c.id) === normalizarIdPerfilNex(id)
  );

  const nome = conectado?.nome || id;

  console.log(
    `🎯 ${tipo === 'entrou' ? 'Virei adepto' : 'Deixei de ser adepto'} de:`,
    nome
  );

  const nomeContato = nome;

  if (!conversas[nomeContato]) {
    conversas[nomeContato] = [];
  }

  const agora = Date.now();

  // Usa o NOME da pessoa (não o @id) na mensagem
  const textoMensagem =
    tipo === 'entrou'
      ? `👑 Parabéns! Você se tornou adepto de ${nome}!`
      : `😢 Você deixou de ser adepto de ${nome}.`;

  conversas[nomeContato].push({
    id: gerarIdMensagemNex(),
    timestamp: agora,
    side: 'right',
    nome: 'Eu',
    avatar: 'EU',
    data: new Date(agora).toLocaleDateString('pt-BR'),
    hora: new Date(agora).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    text: textoMensagem,
    sistema: true
  });

  // Cria/atualiza card no NEX
  let card = obterCardConversaNex(nomeContato);

  if (!card) {
    criarCardConversaNex(
      nomeContato,
      false,
      {
        text: textoMensagem,
        hora: new Date(agora).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      },
      'recebida'
    );

    marcarConversaComoNaoLidaNex(nomeContato, false);
  } else {
    if (typeof renderChat === 'function' && Drops.estado.conversaAtual === nomeContato) {
      renderChat(nomeContato);
    }
    marcarConversaComoNaoLidaNex(nomeContato, false);
  }
}

// ============================================
// NOTIFICAR QUE ALGUÉM VIROU MEU ADEPTO
// ============================================

function notificarAdeptoNex(adepto, tipo) {
  console.log(`👑 Adepto ${tipo}:`, adepto.nome);

  if (tipo === 'entrou') {
    criarNotificacaoAdeptoNex(adepto, 'entrou');
  }

  if (tipo === 'saiu') {
    criarNotificacaoAdeptoNex(adepto, 'saiu');
  }
}

function criarNotificacaoAdeptoNex(adepto, tipo) {
  const agora = Date.now();
  const nome = adepto.nome || adepto.id;
  const id = adepto.id;

  if (!id) return;

  let card = obterCardConversaNex(nome);

  if (!card) {
    const mensagemInicial = {
      id: gerarIdMensagemNex(),
      timestamp: agora,
      side: 'left',
      nome,
      avatar: adepto.avatar || nome.charAt(0).toUpperCase(),
      data: new Date(agora).toLocaleDateString('pt-BR'),
      hora: new Date(agora).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      text:
        tipo === 'entrou'
          ? `👑 Parabéns! Você virou adepto de @${Drops.usernameAtual}!`
          : `😢 Você deixou de ser adepto de @${Drops.usernameAtual}.`,
      sistema: true
    };

    if (!conversas[nome]) {
      conversas[nome] = [];
    }

    conversas[nome].push(mensagemInicial);

    criarCardConversaNex(nome, false, mensagemInicial, 'recebida');
    marcarConversaComoNaoLidaNex(nome, false);
  } else {
    if (!conversas[nome]) {
      conversas[nome] = [];
    }

    conversas[nome].push({
      id: gerarIdMensagemNex(),
      timestamp: agora,
      side: 'left',
      nome,
      avatar: adepto.avatar || nome.charAt(0).toUpperCase(),
      data: new Date(agora).toLocaleDateString('pt-BR'),
      hora: new Date(agora).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      text:
        tipo === 'entrou'
          ? `👑 Parabéns! Você virou adepto de @${Drops.usernameAtual}!`
          : `😢 Você deixou de ser adepto de @${Drops.usernameAtual}.`,
      sistema: true
    });

    if (typeof renderChat === 'function' && Drops.estado.conversaAtual === nome) {
      renderChat(nome);
    }

    marcarConversaComoNaoLidaNex(nome, false);
  }

  console.log(`📬 Notificação criada: ${nome} ${tipo} como adepto`);
} 
  // ============================================
// PAINEL MEUS ADEPTOS
// ============================================

function abrirMeusAdeptosNex() {
  const painel = document.getElementById('painelMeusAdeptosNex');
  if (!painel) return;

  renderizarMeusAdeptosNex();
  painel.style.display = 'flex';
}

function fecharMeusAdeptosNex() {
  const painel = document.getElementById('painelMeusAdeptosNex');
  if (painel) painel.style.display = 'none';
}

function renderizarMeusAdeptosNex() {
  const container = document.getElementById('listaMeusAdeptosNex');
  if (!container) return;

  const adeptos = lerAdeptosNex();
  container.innerHTML = '';

  if (!adeptos.length) {
    const vazio = document.createElement('div');
    vazio.className = 'adepto-vazio-nex';
    vazio.innerHTML =
      'Você ainda não tem adeptos.<br><br>Quando alguém te salvar em <strong>Conectados</strong> e interagir <strong>15 vezes</strong> em 30 dias, vai aparecer aqui.';
    container.appendChild(vazio);
    return;
  }

  // Ordena: quem interagiu mais recente primeiro
  const ordenados = [...adeptos].sort(
    (a, b) => (b.ultimaInteracao || 0) - (a.ultimaInteracao || 0)
  );

  ordenados.forEach((a) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'adepto-item-nex';

    const diasAdepto = Math.max(
      1,
      Math.floor(
        (Date.now() - (a.desde || Date.now())) / (1000 * 60 * 60 * 24)
      )
    );

    item.innerHTML = `
      <div class="adepto-avatar-nex">${a.avatar || '?'}</div>

      <div class="adepto-info-nex">
        <div class="adepto-nome-nex">${a.nome || 'Perfil'}</div>
        <div class="adepto-handle-nex">@${a.id}</div>
        <div class="adepto-meta-nex">
          <span>👑 ${diasAdepto}d como adepto</span>
          <span>•</span>
          <span>${a.totalInteracoes || 0} interações</span>
        </div>
      </div>
    `;

    item.addEventListener('click', () => {
      fecharMeusAdeptosNex();
      abrirPerfilVisitadoNex(a.id, a.nome);
    });

    container.appendChild(item);
  });
}

  // ============================================
// CONTADOR DE INTERAÇÕES (30 dias)
// ============================================

async function atualizarMetricaInteracoesMyDropsNex() {
  if (!window.supabaseClient) return;

  try {
    const { data, error } = await window.supabaseClient
      .rpc('contar_interacoes_recebidas');

    if (error) {
      console.warn('Erro ao contar interações:', error);
      return;
    }

    const total = Number(data) || 0;

    const el = document.getElementById('mydropsInteracoesContador');
    if (el) el.textContent = String(total);
  } catch (erro) {
    console.warn('Erro ao contar interações:', erro);
  }
}

  
// ============================================
// CONTADOR DE ADEPTOS
// ============================================

function atualizarContadorAdeptosNex() {
  const adeptos = lerAdeptosNex();
  const total = adeptos.length;

  const elPerfil = document.getElementById('perfilAdeptosNex');
  if (elPerfil) {
    elPerfil.textContent = total > 0 ? String(total) : '0';
  }

  const elMyDrops = document.getElementById('mydropsAdeptosContador');
  if (elMyDrops) {
    elMyDrops.textContent = total > 0 ? String(total) : '0';
  }
}
    // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  // Interações
  window.lerInteracoesRecebidasNex = lerInteracoesRecebidasNex;
  window.salvarInteracoesRecebidasNex = salvarInteracoesRecebidasNex;
  window.lerInteracoesEnviadasNex = lerInteracoesEnviadasNex;
  window.salvarInteracoesEnviadasNex = salvarInteracoesEnviadasNex;
  window.registrarInteracaoNex = registrarInteracaoNex;
  window.limparInteracoesAntigasNex = limparInteracoesAntigasNex;

  // Adeptos
  window.lerAdeptosNex = lerAdeptosNex;
  window.salvarAdeptosNex = salvarAdeptosNex;
  window.atualizarMetricaInteracoesMyDropsNex = atualizarMetricaInteracoesMyDropsNex;
  window.lerSouAdeptoDeNex = lerSouAdeptoDeNex;
  window.calcularAdeptosNex = calcularAdeptosNex;
  window.calcularAdeptosEnviadosNex = calcularAdeptosEnviadosNex;
  window.notificarSouAdeptoNex = notificarSouAdeptoNex;
  window.notificarAdeptoNex = notificarAdeptoNex;
  window.criarNotificacaoAdeptoNex = criarNotificacaoAdeptoNex;
  window.atualizarContadorAdeptosNex = atualizarContadorAdeptosNex;

  // Painel
  window.abrirMeusAdeptosNex = abrirMeusAdeptosNex;
  window.fecharMeusAdeptosNex = fecharMeusAdeptosNex;
  window.renderizarMeusAdeptosNex = renderizarMeusAdeptosNex;

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  document.addEventListener('DOMContentLoaded', () => {
    // Botão Meus Adeptos
    const btnMeusAdeptos = document.getElementById('btnMeusAdeptosNex');
    if (btnMeusAdeptos) {
      btnMeusAdeptos.addEventListener('click', () => {
        fecharPainelControleNex();
        abrirMeusAdeptosNex();
      });
    }
  });

  // ============================================
  // DEBUG
  // ============================================

  console.log('👑 10-adeptos.js carregado (via adapter)');

})();
