const board = document.getElementById('board');

const cols = 12;
const rows = 8;
const totalTiles = (cols + rows - 2) * 2; // casas na borda

const icons = [
  "⚡", "🏢", "🔋", "🚁", "💻", "🛒", "☁️", "🧠", "🚀", "🌀",
  "💰", "🔥", "🛰️", "🤖", "🕹️", "📡", "⚙️", "🧬", "🔧", "💡",
  "🏙️", "🌐", "📱", "🎮", "🔬", "📊", "📡", "💾", "🧪", "🛰️",
  "🤖", "🕹️", "📡", "⚙️", "🧬", "🔧", "💡", "🏙️", "🌐", "⚡"
];

// Casas que são propriedades (menos múltiplos de 5)
const properties = {};
for (let i = 0; i < totalTiles; i++) {
  if (i % 5 !== 0) {
    properties[i] = {
      price: 100 + (i * 10),
      owner: null,
    };
  }
}

// Casas de eventos (múltiplos de 5)
const eventIndexes = [];
for(let i=0; i<totalTiles; i++) {
  if (i % 5 === 0) eventIndexes.push(i);
}

const players = [
  { id: 0, emoji: '👾', position: 0, money: 1500, properties: [] },
  { id: 1, emoji: '🤖', position: 0, money: 1500, properties: [] },
  { id: 2, emoji: '🚀', position: 0, money: 1500, properties: [] },
  { id: 3, emoji: '🛸', position: 0, money: 1500, properties: [] },
];

let currentPlayerIndex = 0;

const moneyBoard = document.getElementById('money-board');
const rollDiceBtn = document.getElementById('roll-dice');
const diceResult = document.getElementById('dice-result');

const tiles = [];
const playerElements = [];

function createBoard() {
  for(let row = 0; row < rows; row++) {
    for(let col = 0; col < cols; col++) {
      let tileNumber = null;

      if(row === 0) {
        tileNumber = col; // topo, da esquerda pra direita
      } else if(col === cols -1) {
        tileNumber = cols -1 + row; // lado direito, de cima pra baixo
      } else if(row === rows -1) {
        tileNumber = cols -1 + rows -1 + (cols -1 - col); // base, da direita pra esquerda
      } else if(col === 0) {
        tileNumber = totalTiles -1 - (row -1); // lado esquerdo, de baixo pra cima
      }

      const div = document.createElement('div');
      div.style.gridRowStart = row + 1;
      div.style.gridColumnStart = col + 1;

      if(tileNumber !== null && tileNumber < totalTiles) {
        div.classList.add('tile');
        div.id = `tile-${tileNumber}`;

        if(properties[tileNumber]) {
          div.innerHTML = `${tileNumber} ${icons[tileNumber % icons.length]}<br><small>Preço: $${properties[tileNumber].price}</small>`;
        } else if(eventIndexes.includes(tileNumber)) {
          div.innerHTML = `${tileNumber} 🎲 Evento`;
          div.style.backgroundColor = '#004466';
          div.style.borderColor = '#ffaa00';
        } else {
          div.textContent = `${tileNumber} ${icons[tileNumber % icons.length]}`;
        }
      }

      board.appendChild(div);
      tiles[tileNumber] = div;
    }
  }
}

function createPlayers() {
  players.forEach(player => {
    const p = document.createElement('div');
    p.classList.add('player', `player-${player.id}`);
    p.textContent = player.emoji;
    board.appendChild(p);
    playerElements[player.id] = p;
  });
}

function updatePlayerPosition(playerId) {
  const position = players[playerId].position;
  const tile = tiles[position];
  if (!tile) return;

  const boardRect = board.getBoundingClientRect();
  const tileRect = tile.getBoundingClientRect();

  const offsetX = tileRect.left - boardRect.left + tileRect.width / 2;
  const offsetY = tileRect.top - boardRect.top + tileRect.height / 2;

  const offset = 30;

  let top, left;
  switch(playerId) {
    case 0:
      top = offsetY - offset;
      left = offsetX - offset;
      break;
    case 1:
      top = offsetY - offset;
      left = offsetX + offset;
      break;
    case 2:
      top = offsetY + offset;
      left = offsetX - offset;
      break;
    case 3:
      top = offsetY + offset;
      left = offsetX + offset;
      break;
  }

  const p = playerElements[playerId];
  p.style.top = `${top - p.offsetHeight/2}px`;
  p.style.left = `${left - p.offsetWidth/2}px`;
}

function updateMoneyDisplay() {
  moneyBoard.innerHTML = '';
  players.forEach(player => {
    const div = document.createElement('div');
    div.classList.add('player-money', `player-${player.id}`);
    let propsList = player.properties.length > 0 ? player.properties.join(', ') : 'Nenhuma';
    div.innerHTML = `<div class="player-name">${player.emoji} Jogador ${player.id + 1}</div>
                     <div>Dinheiro: $${player.money}</div>
                     <div>Propriedades: ${propsList}</div>`;
    moneyBoard.appendChild(div);
  });
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function movePlayer(steps) {
  const player = players[currentPlayerIndex];
  player.position += steps;
  if (player.position >= totalTiles) {
    player.position -= totalTiles;
  }
  updatePlayerPosition(player.id);
  checkTile(player);
  updateMoneyDisplay();
}

function checkTile(player) {
  const pos = player.position;

  if (properties[pos]) {
    const property = properties[pos];
    if (property.owner === null) {
      if (player.money >= property.price) {
        property.owner = player.id;
        player.money -= property.price;
        player.properties.push(pos);
        tiles[pos].style.backgroundColor = ['#005577', '#774433', '#337744', '#777755'][player.id];
        tiles[pos].innerHTML = `${pos} ${icons[pos % icons.length]}<br><small>Proprietário: ${players[player.id].emoji}</small>`;
        alert(`Jogador ${player.emoji} comprou a propriedade ${pos} por $${property.price}`);
      }
    } else if (property.owner !== player.id) {
      const rent = Math.floor(property.price * 0.2);
      player.money -= rent;
      players[property.owner].money += rent;
      alert(`Jogador ${player.emoji} pagou $${rent} de aluguel para ${players[property.owner].emoji}`);
    }
  } else if (eventIndexes.includes(pos)) {
    handleEvent(player);
  }
}

function handleEvent(player) {
  const events = [
    { text: 'Encontrou uma carteira! Ganha $200', effect: () => player.money += 200 },
    { text: 'Problema no sistema! Perde $150', effect: () => player.money -= 150 },
    { text: 'Bonus de tecnologia! Ganha $100', effect: () => player.money += 100 },
    { text: 'Falha na rede! Perde $100', effect: () => player.money -= 100 },
  ];

  const event = events[Math.floor(Math.random() * events.length)];
  alert(`Evento: ${event.text}`);
  event.effect();
}

function nextTurn() {
  currentPlayerIndex++;
  if (currentPlayerIndex >= players.length) currentPlayerIndex = 0;

  diceResult.textContent = '';
  if(players[currentPlayerIndex].id === 0){
    rollDiceBtn.style.display = 'block';
    updateTurnMessage(`Sua vez, ${players[currentPlayerIndex].emoji}!`);
  } else {
    rollDiceBtn.style.display = 'none';
    updateTurnMessage(`Vez do jogador IA ${players[currentPlayerIndex].emoji}...`);
    setTimeout(() => {
      const diceRoll = rollDice();
      diceResult.textContent = `Jogador IA tirou: ${diceRoll}`;
      movePlayer(diceRoll);
      nextTurn();
    }, 1500);
  }
}

function updateTurnMessage(msg) {
  const turnMessage = document.getElementById('turn-message');
  if(turnMessage) turnMessage.textContent = msg;
}

rollDiceBtn.addEventListener('click', () => {
  const diceRoll = rollDice();
  diceResult.textContent = `Você tirou: ${diceRoll}`;
  movePlayer(diceRoll);
  rollDiceBtn.style.display = 'none';
  nextTurn();
});

// Inicialização
createBoard();
createPlayers();
players.forEach(p => updatePlayerPosition(p.id));
updateMoneyDisplay();

// Mensagem de início de jogo
const container = document.createElement('div');
container.id = 'turn-message';
container.style.color = '#00eaff';
container.style.fontWeight = 'bold';
container.style.fontSize = '20px';
container.style.marginTop = '10px';
container.style.textAlign = 'center';
document.body.insertBefore(container, document.getElementById('board').parentNode);

updateTurnMessage(`Sua vez, ${players[currentPlayerIndex].emoji}!`);
rollDiceBtn.style.display = 'block';
