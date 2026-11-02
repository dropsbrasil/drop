/* ============================================
   17-ADAPTERS.JS
   Elo entre os módulos do app e a persistência.
============================================ */

(function () {
  'use strict';

  // ============================================
  // AUTH
  // ============================================

  const AuthAdapterNex = {
    lerSessao() {
      return {
        cadastroCompleto: localStorage.getItem(Drops.CHAVES.CADASTRO_COMPLETO) === 'true',
        logado: localStorage.getItem(Drops.CHAVES.LOGADO) === 'true'
      };
    },

    encerrarSessao() {
      localStorage.setItem(Drops.CHAVES.LOGADO, 'false');
    },

    lerUsuario() {
      return {
        nome: localStorage.getItem(Drops.CHAVES.NOME) || '',
        username: localStorage.getItem(Drops.CHAVES.USERNAME) || '',
        email: localStorage.getItem(Drops.CHAVES.EMAIL) || ''
      };
    },

    salvarNome(novoNome) {
      localStorage.setItem(Drops.CHAVES.NOME, String(novoNome || '').trim());
    },

    lerUltimaMudancaNome() {
      const bruto = localStorage.getItem(Drops.chaveUsuario('dropsNomeMudancaEm'));
      const ts = Number(bruto);
      return Number.isFinite(ts) && ts > 0 ? ts : 0;
    },

    salvarUltimaMudancaNome(timestamp) {
      localStorage.setItem(Drops.chaveUsuario('dropsNomeMudancaEm'), String(timestamp || Date.now()));
    },

    lerPerfil() {
      return {
        avatar: localStorage.getItem(Drops.chaveUsuario('mydropsAvatar')) || '',
        capa: localStorage.getItem(Drops.chaveUsuario('mydropsCover')) || '',
        bio: localStorage.getItem(Drops.chaveUsuario('mydropsBio')) || '',
        bioFonte: localStorage.getItem(Drops.chaveUsuario('mydropsBioFont')) || '',
        bioCor: localStorage.getItem(Drops.chaveUsuario('mydropsBioColor')) || '',
        bioAlign: localStorage.getItem(Drops.chaveUsuario('mydropsBioAlign')) || ''
      };
    },

    salvarAvatar(dataUrl) {
      localStorage.setItem(Drops.chaveUsuario('mydropsAvatar'), String(dataUrl || ''));
      if (window.atualizarPerfilSupabase) window.atualizarPerfilSupabase();
    },

    salvarCapa(dataUrl) {
      localStorage.setItem(Drops.chaveUsuario('mydropsCover'), String(dataUrl || ''));
      if (window.atualizarPerfilSupabase) window.atualizarPerfilSupabase();
    },

    salvarBio(texto) {
      localStorage.setItem(Drops.chaveUsuario('mydropsBio'), String(texto || ''));
      if (window.atualizarPerfilSupabase) window.atualizarPerfilSupabase();
    },

    salvarBioEstilos(fonte, cor, align) {
      localStorage.setItem(Drops.chaveUsuario('mydropsBioFont'), String(fonte || ''));
      localStorage.setItem(Drops.chaveUsuario('mydropsBioColor'), String(cor || ''));
      localStorage.setItem(Drops.chaveUsuario('mydropsBioAlign'), String(align || ''));
      if (window.atualizarPerfilSupabase) window.atualizarPerfilSupabase();
    }, 

    lerSocial() {
      return {
        instagram: localStorage.getItem(Drops.chaveUsuario('mydropsSocialInstagram')) || '',
        tiktok: localStorage.getItem(Drops.chaveUsuario('mydropsSocialTiktok')) || '',
        whatsapp: localStorage.getItem(Drops.chaveUsuario('mydropsSocialWhatsapp')) || ''
      };
    },

    salvarSocial({ instagram, tiktok, whatsapp }) {
      localStorage.setItem(Drops.chaveUsuario('mydropsSocialInstagram'), String(instagram || '').trim());
      localStorage.setItem(Drops.chaveUsuario('mydropsSocialTiktok'), String(tiktok || '').trim());
      localStorage.setItem(Drops.chaveUsuario('mydropsSocialWhatsapp'), String(whatsapp || '').trim());
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
        localStorage.setItem(Drops.CHAVES.CONECTADOS, JSON.stringify(Array.isArray(lista) ? lista : []));
      } catch (erro) {
        console.warn('Erro ao salvar conectados:', erro);
      }
    },

    async adicionarConectadoSupabase(username) {
      if (!window.supabaseClient || !username) return false;
      try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return false;
        const userLimpo = String(username).replace(/^@/, '').trim().toLowerCase();
        const { data: perfil } = await window.supabaseClient.from('profiles').select('id').eq('username', userLimpo).maybeSingle();
        if (!perfil?.id) return false;

        const { error } = await window.supabaseClient.from('conectados').insert({
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

    async removerConectadoSupabase(username) {
      if (!window.supabaseClient || !username) return false;
      try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return false;
        const userLimpo = String(username).replace(/^@/, '').trim().toLowerCase();
        const { error } = await window.supabaseClient.from('conectados').delete().eq('usuario_id', user.id).eq('conectado_username', userLimpo);
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

    async sincronizarConectadosSupabase() {
      if (!window.supabaseClient) return;
      try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;
        const listaLocal = this.lerConectados();
        if (!listaLocal.length) return;

        const promessas = listaLocal.map((item) => {
          const username = String(item.id || '').replace(/^@/, '').trim().toLowerCase();
          if (!username) return Promise.resolve();
          return this.adicionarConectadoSupabase(username);
        });
        await Promise.all(promessas);
        console.log('☁️ Conectados sincronizados com Supabase');
      } catch (err) {
        console.warn('Erro ao sincronizar conectados:', err);
      }
    },

    async carregarConectadosSupabase() {
      if (!window.supabaseClient) return;
      try {
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return;

        const { data, error } = await window.supabaseClient.from('conectados').select('conectado_username, conectado_id, criado_em').eq('usuario_id', user.id);
        if (error) {
          console.warn('Erro ao carregar conectados:', error);
          return;
        }
        if (!Array.isArray(data) || !data.length) return;

        const usernames = data.map((c) => c.conectado_username);
        const { data: perfis } = await window.supabaseClient.from('profiles').select('username, nome, avatar_url').in('username', usernames);

        const mapaPerfis = {};
        (perfis || []).forEach((p) => { mapaPerfis[p.username] = p; });

        const listaFinal = data.map((c) => {
          const p = mapaPerfis[c.conectado_username] || {};
          return {
            id: c.conectado_username,
            nome: p.nome || c.conectado_username,
            avatar: p.avatar_url || (p.nome || '?').charAt(0).toUpperCase()
          };
        });

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
        localStorage.setItem(Drops.CHAVES.DESCONECTADOS, JSON.stringify(Array.isArray(lista) ? lista : []));
      } catch (erro) {
        console.warn('Erro ao salvar desconectados:', erro);
      }
    }
  };
  // ============================================
// BLOQUEADOS (CORRIGIDO PARA FUNCIONAR OFFLINE)
// ============================================

const BloqueadosAdapterNex = {
  // Cache local: Set de usernames bloqueados
  _cache: null,

  // ⚠️ CORRIGIDO: Agora tem fallback para o localStorage!
  lerBloqueados() {
    if (this._cache) return this._cache;

    try {
      const bruto = localStorage.getItem(Drops.chaveUsuario('dropsBloqueados'));
      const lista = JSON.parse(bruto || '[]');
      
      this._cache = new Set(
        (Array.isArray(lista) ? lista : []).map((u) => String(u).toLowerCase().trim())
      );
      
      return this._cache;
    } catch (e) {
      this._cache = new Set();
      return this._cache;
    }
  },

  // ⚠️ CORRIGIDO: Agora salva no localStorage também!
  salvarBloqueados(set) {
    this._cache = set;

    try {
      localStorage.setItem(
        Drops.chaveUsuario('dropsBloqueados'),
        JSON.stringify(Array.from(set || []))
      );
    } catch (e) {
      console.warn('Erro ao salvar bloqueados localmente:', e);
    }
  },

  async adicionarBloqueadoSupabase(username) {
    if (!window.supabaseClient || !username) return false;
    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return false;
      const userLimpo = String(username).replace(/^@/, '').trim().toLowerCase();

      const { data: perfil } = await window.supabaseClient.from('profiles').select('id').eq('username', userLimpo).maybeSingle();
      if (!perfil?.id) return false;

      const { error } = await window.supabaseClient.from('bloqueados').insert({
        usuario_id: user.id,
        bloqueado_id: perfil.id,
        bloqueado_username: userLimpo
      });

      if (error && error.code !== '23505') {
        console.warn('Erro ao bloquear no Supabase:', error);
        return false;
      }
      console.log('🚫 Bloqueado no Supabase:', userLimpo);
      return true;
    } catch (err) {
      console.warn('Erro ao bloquear no Supabase:', err);
      return false;
    }
  },

  async removerBloqueadoSupabase(username) {
    if (!window.supabaseClient || !username) return false;
    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return false;
      const userLimpo = String(username).replace(/^@/, '').trim().toLowerCase();

      const { error } = await window.supabaseClient.from('bloqueados').delete().eq('usuario_id', user.id).eq('bloqueado_username', userLimpo);
      if (error) {
        console.warn('Erro ao desbloquear no Supabase:', error);
        return false;
      }
      console.log('✅ Desbloqueado no Supabase:', userLimpo);
      return true;
    } catch (err) {
      console.warn('Erro ao desbloquear no Supabase:', err);
      return false;
    }
  },

  async carregarBloqueadosSupabase() {
    if (!window.supabaseClient) return;
    try {
      const { data: { user } } = await window.supabaseClient.auth.getUser();
      if (!user) return;

      const { data, error } = await window.supabaseClient.from('bloqueados').select('bloqueado_username').eq('usuario_id', user.id);
      if (error) {
        console.warn('Erro ao carregar bloqueados:', error);
        return;
      }

      const set = new Set((data || []).map((b) => String(b.bloqueado_username).toLowerCase().trim()));
      this.salvarBloqueados(set);
      console.log('🚫 Bloqueados carregados:', set.size);
    } catch (err) {
      console.warn('Erro ao carregar bloqueados:', err);
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
      localStorage.setItem(Drops.CHAVES.PUBLICACOES, JSON.stringify(Array.isArray(lista) ? lista : []));
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
      const bruto = localStorage.getItem(Drops.chaveUsuario('dropsMural'));
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
      localStorage.setItem(Drops.chaveUsuario('dropsMural'), JSON.stringify(dados || {}));
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
    lerInteracoesRecebidas() {
      try {
        const bruto = localStorage.getItem(Drops.CHAVES.INTERACOES_RECEBIDAS);
        const lista = JSON.parse(bruto || '[]');
        return Array.isArray(lista) ? lista : [];
      } catch (erro) {
        return [];
      }
    },

    salvarInteracoesRecebidas(lista) {
      try {
        localStorage.setItem(Drops.CHAVES.INTERACOES_RECEBIDAS, JSON.stringify(Array.isArray(lista) ? lista : []));
      } catch (erro) {}
    },

    lerInteracoesEnviadas() {
      try {
        const bruto = localStorage.getItem(Drops.CHAVES.INTERACOES_ENVIADAS);
        const lista = JSON.parse(bruto || '[]');
        return Array.isArray(lista) ? lista : [];
      } catch (erro) {
        return [];
      }
    },

    salvarInteracoesEnviadas(lista) {
      try {
        localStorage.setItem(Drops.CHAVES.INTERACOES_ENVIADAS, JSON.stringify(Array.isArray(lista) ? lista : []));
      } catch (erro) {}
    },

    lerAdeptos() {
      try {
        const bruto = localStorage.getItem(Drops.CHAVES.ADEPTOS);
        const lista = JSON.parse(bruto || '[]');
        return Array.isArray(lista) ? lista : [];
      } catch (erro) {
        return [];
      }
    },

    salvarAdeptos(lista) {
      try {
        localStorage.setItem(Drops.CHAVES.ADEPTOS, JSON.stringify(Array.isArray(lista) ? lista : []));
      } catch (erro) {}
    },

    lerSouAdeptoDe() {
      try {
        const bruto = localStorage.getItem(Drops.CHAVES.SOU_ADEPTO_DE);
        const lista = JSON.parse(bruto || '[]');
        return Array.isArray(lista) ? lista : [];
      } catch (erro) {
        return [];
      }
    },

    salvarSouAdeptoDe(lista) {
      try {
        localStorage.setItem(Drops.CHAVES.SOU_ADEPTO_DE, JSON.stringify(Array.isArray(lista) ? lista : []));
      } catch (erro) {}
    }
  };

  // ============================================
  // MOCKS (Nearby, Perfil, Conversas)
  // ============================================

  const NearbyAdapterNex = {
    lerPerfisProximos() { return { conectados: {}, nearby: {} }; },
    lerPerfilProximo(id) { return null; }
  };

  const PerfilAdapterNex = {
    lerPerfil(perfilId) { return null; },
    lerDropsDoPerfil(perfilId) { return []; }
  };

  const ConversasAdapterNex = {
    lerConversas() { return {}; },
    salvarConversas() {}
  };

  // ============================================
  // EXPÕE GLOBALMENTE
  // ============================================

  window.AuthAdapterNex = AuthAdapterNex;
  window.ConectadosAdapterNex = ConectadosAdapterNex;
  window.BloqueadosAdapterNex = BloqueadosAdapterNex;
  window.MyDropsAdapterNex = MyDropsAdapterNex;
  window.MuralAdapterNex = MuralAdapterNex;
  window.AdeptosAdapterNex = AdeptosAdapterNex;
  window.NearbyAdapterNex = NearbyAdapterNex;
  window.PerfilAdapterNex = PerfilAdapterNex;
  window.ConversasAdapterNex = ConversasAdapterNex;
    
  console.log('🔌 17-adapters.js carregado (auth, conectados, mydrops, adeptos, nearby, perfil, conversas)');

})();