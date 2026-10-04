/* ============================================
   17-ADAPTERS.JS
   Elo entre os módulos do app e a persistência.

   Hoje: métodos síncronos com localStorage.
   Amanhã: trocar APENAS o corpo de cada método
   para chamar o backend.

   Depois de plugar o backend, este arquivo é o
   ÚNICO lugar que precisa mudar para:
     - Auth (sessão, usuário, perfil, social)
     - Conectados / Desconectados
     - Publicações do MyDrops
     - Adeptos (interações, adeptos, sou adepto de)
============================================ */

(function () {
  'use strict';

  // ============================================
  // AUTH
  // ============================================

  const AuthAdapterNex = {
    // ------------------------------------------
    // SESSÃO
    // ------------------------------------------

    lerSessao() {
      return {
        cadastroCompleto:
          localStorage.getItem(Drops.CHAVES.CADASTRO_COMPLETO) === 'true',
        logado:
          localStorage.getItem(Drops.CHAVES.LOGADO) === 'true'
      };
    },

    encerrarSessao() {
      localStorage.setItem(Drops.CHAVES.LOGADO, 'false');
    },

    // ------------------------------------------
    // USUÁRIO
    // ------------------------------------------

    lerUsuario() {
  return {
    nome: localStorage.getItem(Drops.CHAVES.NOME) || '',
    username: localStorage.getItem(Drops.CHAVES.USERNAME) || '',
    email: localStorage.getItem(Drops.CHAVES.EMAIL) || ''
  };
},

salvarNome(novoNome) {
  localStorage.setItem(
    Drops.CHAVES.NOME,
    String(novoNome || '').trim()
  );
},

lerUltimaMudancaNome() {
  const bruto = localStorage.getItem(
    Drops.chaveUsuario('dropsNomeMudancaEm')
  );
  const ts = Number(bruto);
  return Number.isFinite(ts) && ts > 0 ? ts : 0;
},

salvarUltimaMudancaNome(timestamp) {
  localStorage.setItem(
    Drops.chaveUsuario('dropsNomeMudancaEm'),
    String(timestamp || Date.now())
  );
},

    // ------------------------------------------
    // PERFIL (avatar, capa, bio)
    // ------------------------------------------

    lerPerfil() {
      return {
        avatar:
          localStorage.getItem(Drops.chaveUsuario('mydropsAvatar')) || '',
        capa:
          localStorage.getItem(Drops.chaveUsuario('mydropsCover')) || '',
        bio:
          localStorage.getItem(Drops.chaveUsuario('mydropsBio')) || ''
      };
    },

    salvarAvatar(dataUrl) {
  localStorage.setItem(
    Drops.chaveUsuario('mydropsAvatar'),
    String(dataUrl || '')
  );
  if (window.atualizarPerfilSupabase) window.atualizarPerfilSupabase();
},

salvarCapa(dataUrl) {
  localStorage.setItem(
    Drops.chaveUsuario('mydropsCover'),
    String(dataUrl || '')
  );
  if (window.atualizarPerfilSupabase) window.atualizarPerfilSupabase();
},

salvarBio(texto) {
  localStorage.setItem(
    Drops.chaveUsuario('mydropsBio'),
    String(texto || '')
  );
  if (window.atualizarPerfilSupabase) window.atualizarPerfilSupabase();
},

    // ------------------------------------------
    // SOCIAL
    // ------------------------------------------

    lerSocial() {
      return {
        instagram:
          localStorage.getItem(
            Drops.chaveUsuario('mydropsSocialInstagram')
          ) || '',
        tiktok:
          localStorage.getItem(
            Drops.chaveUsuario('mydropsSocialTiktok')
          ) || '',
        whatsapp:
          localStorage.getItem(
            Drops.chaveUsuario('mydropsSocialWhatsapp')
          ) || ''
      };
    },

    salvarSocial({ instagram, tiktok, whatsapp }) {
  localStorage.setItem(
    Drops.chaveUsuario('mydropsSocialInstagram'),
    String(instagram || '').trim()
  );
  localStorage.setItem(
    Drops.chaveUsuario('mydropsSocialTiktok'),
    String(tiktok || '').trim()
  );
  localStorage.setItem(
    Drops.chaveUsuario('mydropsSocialWhatsapp'),
    String(whatsapp || '').trim()
  );
  if (window.atualizarPerfilSupabase) window.atualizarPerfilSupabase();
    }
  };

  // ============================================
  // CONECTADOS
  // ============================================

  const ConectadosAdapterNex = {
  lerConectados() {
    try {
      const bruto = localStorage.getItem(Drops.CHAVES.CONECTADOS);
      const lista = JSON.parse(bruto || '[]');
      return Array.isArray(lista) ? lista : [];
    } catch (erro) {
      console.warn('Erro ao ler conectados:', erro);
      return [];
    }
  },

  salvarConectados(lista) {
    try {
      localStorage.setItem(
        Drops.CHAVES.CONECTADOS,
        JSON.stringify(Array.isArray(lista) ? lista : [])
      );
    } catch (erro) {
      console.warn('Erro ao salvar conectados:', erro);
    }
  },

  // ⚠️ NOVO: adiciona um conectado no Supabase
  async adicionarConectadoSupabase(username) {
    if (!window.supabaseClient || !username) return false;

    try {
      const { data: { user } } =
        await window.supabaseClient.auth.getUser();
      if (!user) return false;

      const userLimpo = String(username).replace(/^@/, '').trim().toLowerCase();

      // Busca o id do perfil pelo username
      const { data: perfil } = await window.supabaseClient
        .from('profiles')
        .select('id')
        .eq('username', userLimpo)
        .maybeSingle();

      if (!perfil?.id) return false;

      const { error } = await window.supabaseClient
        .from('conectados')
        .insert({
          usuario_id: user.id,
          conectado_id: perfil.id,
          conectado_username: userLimpo
        });

      if (error && error.code !== '23505') {
        console.warn('Erro ao conectar no Supabase:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('Erro ao conectar no Supabase:', err);
      return false;
    }
  },

  // ⚠️ NOVO: remove um conectado do Supabase
  async removerConectadoSupabase(username) {
    if (!window.supabaseClient || !username) return false;

    try {
      const { data: { user } } =
        await window.supabaseClient.auth.getUser();
      if (!user) return false;

      const userLimpo = String(username).replace(/^@/, '').trim().toLowerCase();

      const { error } = await window.supabaseClient
        .from('conectados')
        .delete()
        .eq('usuario_id', user.id)
        .eq('conectado_username', userLimpo);

      if (error) {
        console.warn('Erro ao desconectar no Supabase:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('Erro ao desconectar no Supabase:', err);
      return false;
    }
  },

  // ⚠️ NOVO: sincroniza localStorage → Supabase
  async sincronizarConectadosSupabase() {
    if (!window.supabaseClient) return;

    try {
      const { data: { user } } =
        await window.supabaseClient.auth.getUser();
      if (!user) return;

      const listaLocal = this.lerConectados();
      if (!listaLocal.length) return;

      for (const item of listaLocal) {
        const username = String(item.id || '').replace(/^@/, '').trim().toLowerCase();
        if (!username) continue;

        await this.adicionarConectadoSupabase(username);
      }

      console.log('☁️ Conectados sincronizados com Supabase');
    } catch (err) {
      console.warn('Erro ao sincronizar conectados:', err);
    }
  },

  // ⚠️ NOVO: carrega conectados do Supabase pro localStorage
  async carregarConectadosSupabase() {
    if (!window.supabaseClient) return;

    try {
      const { data: { user } } =
        await window.supabaseClient.auth.getUser();
      if (!user) return;

      const { data, error } = await window.supabaseClient
        .from('conectados')
        .select('conectado_username, conectado_id, criado_em')
        .eq('usuario_id', user.id);

      if (error) {
        console.warn('Erro ao carregar conectados:', error);
        return;
      }

      if (!Array.isArray(data) || !data.length) return;

      // Busca os dados dos perfis
      const usernames = data.map((c) => c.conectado_username);
      const { data: perfis } = await window.supabaseClient
        .from('profiles')
        .select('username, nome, avatar_url')
        .in('username', usernames);

      const mapaPerfis = {};
      (perfis || []).forEach((p) => {
        mapaPerfis[p.username] = p;
      });

      const listaFinal = data.map((c) => {
        const p = mapaPerfis[c.conectado_username] || {};
        return {
          id: c.conectado_username,
          nome: p.nome || c.conectado_username,
          avatar: p.avatar_url || (p.nome || '?').charAt(0).toUpperCase()
        };
      });

      // Salva no localStorage
      this.salvarConectados(listaFinal);

      console.log('☁️ Conectados carregados do Supabase:', listaFinal.length);
    } catch (err) {
      console.warn('Erro ao carregar conectados:', err);
    }
  },

  lerDesconectados() {
    try {
      const bruto = localStorage.getItem(Drops.CHAVES.DESCONECTADOS);
      const lista = JSON.parse(bruto || '[]');
      return Array.isArray(lista) ? lista : [];
    } catch (erro) {
      console.warn('Erro ao ler desconectados:', erro);
      return [];
    }
  },

  salvarDesconectados(lista) {
    try {
      localStorage.setItem(
        Drops.CHAVES.DESCONECTADOS,
        JSON.stringify(Array.isArray(lista) ? lista : [])
      );
    } catch (erro) {
      console.warn('Erro ao salvar desconectados:', erro);
    }
  }
};

  // ============================================
  // MYDROPS (publicações)
  // ============================================

  const MyDropsAdapterNex = {
    lerPublicacoes() {
      try {
        const bruto = localStorage.getItem(Drops.CHAVES.PUBLICACOES);
        const lista = JSON.parse(bruto || '[]');
        return Array.isArray(lista) ? lista : [];
      } catch (erro) {
        console.warn('Erro ao ler publicações:', erro);
        return [];
      }
    },

    salvarPublicacoes(lista) {
      try {
        localStorage.setItem(
          Drops.CHAVES.PUBLICACOES,
          JSON.stringify(Array.isArray(lista) ? lista : [])
        );
      } catch (erro) {
        console.warn('Erro ao salvar publicações:', erro);
      }
    }
  };

  // ============================================
// MURAL
// ============================================

const MuralAdapterNex = {
  lerMural() {
    try {
      const bruto = localStorage.getItem(
        Drops.chaveUsuario('dropsMural')
      );
      if (!bruto) return null;
      const dados = JSON.parse(bruto);
      return dados && typeof dados === 'object' ? dados : null;
    } catch (erro) {
      console.warn('Erro ao ler mural:', erro);
      return null;
    }
  },

  salvarMural(dados) {
    try {
      localStorage.setItem(
        Drops.chaveUsuario('dropsMural'),
        JSON.stringify(dados || {})
      );
      return true;
    } catch (erro) {
      console.warn('Erro ao salvar mural:', erro);
      return false;
    }
  },

  limparMural() {
    localStorage.removeItem(Drops.chaveUsuario('dropsMural'));
  }
};


  // ============================================
  // ADEPTOS
  // ============================================

  const AdeptosAdapterNex = {
    // ------------------------------------------
    // INTERAÇÕES
    // ------------------------------------------

    lerInteracoesRecebidas() {
      try {
        const bruto = localStorage.getItem(
          Drops.CHAVES.INTERACOES_RECEBIDAS
        );
        const lista = JSON.parse(bruto || '[]');
        return Array.isArray(lista) ? lista : [];
      } catch (erro) {
        console.warn('Erro ao ler interações recebidas:', erro);
        return [];
      }
    },

    salvarInteracoesRecebidas(lista) {
      try {
        localStorage.setItem(
          Drops.CHAVES.INTERACOES_RECEBIDAS,
          JSON.stringify(Array.isArray(lista) ? lista : [])
        );
      } catch (erro) {
        console.warn('Erro ao salvar interações recebidas:', erro);
      }
    },

    lerInteracoesEnviadas() {
      try {
        const bruto = localStorage.getItem(
          Drops.CHAVES.INTERACOES_ENVIADAS
        );
        const lista = JSON.parse(bruto || '[]');
        return Array.isArray(lista) ? lista : [];
      } catch (erro) {
        console.warn('Erro ao ler interações enviadas:', erro);
        return [];
      }
    },

    salvarInteracoesEnviadas(lista) {
      try {
        localStorage.setItem(
          Drops.CHAVES.INTERACOES_ENVIADAS,
          JSON.stringify(Array.isArray(lista) ? lista : [])
        );
      } catch (erro) {
        console.warn('Erro ao salvar interações enviadas:', erro);
      }
    },

    // ------------------------------------------
    // ADEPTOS
    // ------------------------------------------

    lerAdeptos() {
      try {
        const bruto = localStorage.getItem(Drops.CHAVES.ADEPTOS);
        const lista = JSON.parse(bruto || '[]');
        return Array.isArray(lista) ? lista : [];
      } catch (erro) {
        console.warn('Erro ao ler adeptos:', erro);
        return [];
      }
    },

    salvarAdeptos(lista) {
      try {
        localStorage.setItem(
          Drops.CHAVES.ADEPTOS,
          JSON.stringify(Array.isArray(lista) ? lista : [])
        );
      } catch (erro) {
        console.warn('Erro ao salvar adeptos:', erro);
      }
    },

    lerSouAdeptoDe() {
      try {
        const bruto = localStorage.getItem(Drops.CHAVES.SOU_ADEPTO_DE);
        const lista = JSON.parse(bruto || '[]');
        return Array.isArray(lista) ? lista : [];
      } catch (erro) {
        console.warn('Erro ao ler "sou adepto de":', erro);
        return [];
      }
    },

    salvarSouAdeptoDe(lista) {
      try {
        localStorage.setItem(
          Drops.CHAVES.SOU_ADEPTO_DE,
          JSON.stringify(Array.isArray(lista) ? lista : [])
        );
      } catch (erro) {
        console.warn('Erro ao salvar "sou adepto de":', erro);
      }
    }
  };

// ============================================
// NEARBY (mock — aguardando backend)
// ============================================
// Hoje os perfis próximos estão hardcoded em 11-nearby.js.
// Quando o backend chegar, esses métodos vão consultar a API.

const NearbyAdapterNex = {
  lerPerfisProximos() {
    // Backend será conectado posteriormente
    return { conectados: {}, nearby: {} };
  },

  lerPerfilProximo(id) {
    // Backend será conectado posteriormente
    return null;
  }
};

// ============================================
// PERFIL (mock — aguardando backend)
// ============================================
// Hoje os perfis visitados estão hardcoded em 08-perfil.js.
// Quando o backend chegar, esses métodos vão consultar a API.

const PerfilAdapterNex = {
  lerPerfil(perfilId) {
    // Backend será conectado posteriormente
    return null;
  },

  lerDropsDoPerfil(perfilId) {
    // Backend será conectado posteriormente
    return [];
  }
};

// ============================================
// CONVERSAS (mock — aguardando backend)
// ============================================
// Hoje as conversas iniciais estão em memória no 04-conversas.js.
// Quando o backend chegar, esses métodos vão consultar a API.

const ConversasAdapterNex = {
  lerConversas() {
    // Backend será conectado posteriormente
    return {};
  },

  salvarConversas() {
    // Backend será conectado posteriormente
  }
};

// ============================================
// EXPÕE GLOBALMENTE
// ============================================

window.AuthAdapterNex = AuthAdapterNex;
window.ConectadosAdapterNex = ConectadosAdapterNex;
window.MyDropsAdapterNex = MyDropsAdapterNex;
  window.MuralAdapterNex = MuralAdapterNex;
window.AdeptosAdapterNex = AdeptosAdapterNex;
window.NearbyAdapterNex = NearbyAdapterNex;
window.PerfilAdapterNex = PerfilAdapterNex;
window.ConversasAdapterNex = ConversasAdapterNex;
  // ============================================
  // DEBUG
  // ============================================

  console.log(
  '🔌 17-adapters.js carregado (auth, conectados, mydrops, adeptos, nearby, perfil, conversas)'
);

})();