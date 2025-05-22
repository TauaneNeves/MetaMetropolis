const playBtn = document.getElementById('playBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const numPlayersSelect = document.getElementById('numPlayers');
const player3Container = document.getElementById('player3-container');
const player4Container = document.getElementById('player4-container');

// Mostra ou esconde os jogadores extras
function updatePlayersVisibility() {
  const num = parseInt(numPlayersSelect.value);
  player3Container.style.display = num >= 3 ? 'block' : 'none';
  player4Container.style.display = num === 4 ? 'block' : 'none';
}

// Abre ou fecha o painel de ajustes
settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('active');
  updatePlayersVisibility(); // Garante visibilidade correta ao abrir
});

// Atualiza visibilidade dos campos ao trocar o número de jogadores
numPlayersSelect.addEventListener('change', updatePlayersVisibility);

// Redireciona para o jogo ao clicar em Play
playBtn.addEventListener('click', () => {
  const numPlayers = parseInt(numPlayersSelect.value);

  const players = [];
  for (let i = 1; i <= numPlayers; i++) {
    const playerType = document.getElementById(`player${i}`).value;
    players.push(playerType);
  }

  const settings = {
    numPlayers: numPlayers,
    players: players
  };

  // Armazena localmente para resgatar no jogo
  localStorage.setItem('gameSettings', JSON.stringify(settings));

  // Vai para o jogo
  window.location.href = '../jogo/index.html';
});
