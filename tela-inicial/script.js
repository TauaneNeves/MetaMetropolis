const playBtn = document.getElementById('playBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');

const numPlayersSelect = document.getElementById('numPlayers');
const player3Container = document.getElementById('player3-container');
const player4Container = document.getElementById('player4-container');

// Função para mostrar/esconder jogadores extras conforme número selecionado
function updatePlayersVisibility() {
  const num = parseInt(numPlayersSelect.value);
  player3Container.style.display = num >= 3 ? 'block' : 'none';
  player4Container.style.display = num === 4 ? 'block' : 'none';
}

// Evento para atualizar visibilidade dos jogadores ao mudar número
numPlayersSelect.addEventListener('change', updatePlayersVisibility);

// Inicializa visibilidade correta
updatePlayersVisibility();

// Mostrar / esconder painel de ajustes ao clicar no botão Ajustes
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('active');
});

// Redirecionar para o jogo ao clicar no Play (ajuste o caminho conforme seu projeto)
playBtn.addEventListener('click', () => {
  window.location.href = '../jogo/index.html';
});
