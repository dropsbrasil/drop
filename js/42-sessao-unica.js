(function () {
  'use strict';

  function gerarIdDispositivo() {
    return 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }

  async function gerenciarSessaoUnica() {
    if (!window.supabaseClient) return;

    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    // 1. Gera ou recupera o ID deste celular
    let meuDeviceId = localStorage.getItem('drops_device_id');
    if (!meuDeviceId) {
      meuDeviceId = gerarIdDispositivo();
      localStorage.setItem('drops_device_id', meuDeviceId);
    }

    // 2. Salva este ID no banco de dados
    await window.supabaseClient
      .from('profiles')
      .update({ sessao_atual: meuDeviceId })
      .eq('id', user.id);

    // 3. Função que desloga o usuário
    const deslogarDispositivo = () => {
      console.warn('🚨 Outro dispositivo logou. Deslogando este...');
      window.mostrarToastNex?.('Sua conta foi acessada em outro celular.', 'erro');
      
      setTimeout(() => {
        window.supabaseClient.auth.signOut().then(() => {
          localStorage.removeItem('drops_logado');
          window.location.href = './onboarding.html?modo=login';
        });
      }, 2000); // Espera 2 segundos pro usuário ler o aviso
    };

    // 4. Escuta o banco em tempo real
    window.supabaseClient
      .channel('sessao-unica-' + user.id)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          const novaSessao = payload.new.sessao_atual;
          const minhaSessao = localStorage.getItem('drops_device_id');

          // Se a sessão no banco for diferente da minha, fui deslogado
          if (novaSessao && novaSessao !== minhaSessao) {
            deslogarDispositivo();
          }
        }
      )
      .subscribe();

    // 5. Segurança extra: se o celular ficar sem internet e voltar, checa o banco
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        const { data } = await window.supabaseClient.from('profiles').select('sessao_atual').eq('id', user.id).single();
        if (data && data.sessao_atual !== localStorage.getItem('drops_device_id')) {
          deslogarDispositivo();
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(gerenciarSessaoUnica, 2000); // Espera o Supabase carregar
  });

})();