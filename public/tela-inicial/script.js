const socket = io();

const playBtn = document.getElementById('playBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const numPlayersSelect = document.getElementById('numPlayers');
const player3Container = document.getElementById('player3-container');
const player4Container = document.getElementById('player4-container');

function updatePlayersVisibility() {
  const num = parseInt(numPlayersSelect.value);
  player3Container.style.display = num >= 3 ? 'block' : 'none';
  player4Container.style.display = num === 4 ? 'block' : 'none';
}

settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('active');
  updatePlayersVisibility();
});

numPlayersSelect.addEventListener('change', updatePlayersVisibility);

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

  socket.emit('startGame', settings);
});

socket.on('gameStarted', () => {
    window.location.href = '../jogo/index.html';
});

updatePlayersVisibility();