const board = document.getElementById('board');
const moneyBoard = document.getElementById('money-board');
const rollDiceBtn = document.getElementById('roll-dice');
const diceResult = document.getElementById('dice-result');
const turnMessage = document.getElementById('turn-message');
const buyModal = document.getElementById('buy-modal');
const modalText = document.getElementById('modal-text');
const buyYesBtn = document.getElementById('buy-yes');
const buyNoBtn = document.getElementById('buy-no');
const actionNotice = document.getElementById('action-notice');
const noticeText = document.getElementById('notice-text');
const historyBox = document.getElementById('history');

const cols = 12, rows = 8;
const totalTiles = (cols + rows - 2) * 2;
const icons = [];
const properties = {};
for (let i = 0; i < totalTiles; i++) {
  if (i % 5 !== 0) properties[i] = { price: 100 + i * 10, owner: null };
}
const eventIndexes = [...Array(totalTiles).keys()].filter(i => i % 5 === 0 && i !== 0);

const players = [
  { id: 0, emoji: '👾', position: 0, money: 9, properties: [] },
  { id: 1, emoji: '🚀', position: 0, money: 1500, properties: [] }
];

let currentPlayerIndex = 0;

const tiles = [], playerElems = [];

let messageQueue = [];
let messageLog = [];
let messageActive = false;

function showNotice(text, callback) {
  messageQueue.push({ text, callback });
  messageLog.push(text);
  updateHistory();
  if (!messageActive) showNextMessage();
}

function showNextMessage() {
  if (messageQueue.length === 0) {
    messageActive = false;
    return;
  }

  messageActive = true;
  const { text, callback } = messageQueue.shift();
  noticeText.textContent = text;
  actionNotice.style.display = 'block';
  actionNotice.classList.add('fade');
  setTimeout(() => {
    actionNotice.classList.remove('fade');
    actionNotice.style.display = 'none';
    messageActive = false;
    if (callback) callback();
    showNextMessage();
  }, 2000);
}

function updateHistory() {
  historyBox.innerHTML = messageLog.map(msg => `<div>${msg}</div>`).join('');
}

function createBoard() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let num = null;
      if (r === 0) num = c;
      else if (c === cols - 1) num = cols - 1 + r;
      else if (r === rows - 1) num = cols - 1 + rows - 1 + (cols - 1 - c);
      else if (c === 0) num = totalTiles - 1 - (r - 1);
      const div = document.createElement('div');
      div.style.gridRowStart = r + 1;
      div.style.gridColumnStart = c + 1;
      if (num !== null && num < totalTiles) {
        div.classList.add('tile');
        div.id = `tile-${num}`;
        if (properties[num]) {
          div.innerHTML = `${num} ${icons.length ? icons[num % icons.length] : ''}<br><small>$${properties[num].price}</small>`;
        } else if (eventIndexes.includes(num)) {
          div.innerHTML = `${num} 🎲 Evento`;
          div.style.backgroundColor = '#004466';
          div.style.borderColor = '#ffaa00';
        }
        tiles[num] = div;
      }
      board.appendChild(div);
    }
  }
}

function createPlayers() {
  players.forEach(p => {
    const el = document.createElement('div');
    el.classList.add('player');
    el.textContent = p.emoji;
    board.appendChild(el);
    playerElems[p.id] = el;
  });
}

function updatePositions() {
  players.forEach(p => {
    const tile = tiles[p.position];
    if (!tile) return;
    const br = board.getBoundingClientRect(), tr = tile.getBoundingClientRect();
    const x = tr.left - br.left + tr.width / 2, y = tr.top - br.top + tr.height / 2, off = 30;
    const top = y + (p.id < 2 ? -off : off);
    const left = x + (p.id % 2 ? off : -off);
    const el = playerElems[p.id];
    el.style.top = `${top - el.offsetHeight / 2}px`;
    el.style.left = `${left - el.offsetWidth / 2}px`;
  });
}

function updateMoney() {
  moneyBoard.innerHTML = '';
  players.forEach(p => {
    const d = document.createElement('div');
    d.className = 'player-money';
    d.innerHTML = `<div class="player-name">${p.emoji} Jogador ${p.id + 1}</div>
                   <div>Dinheiro: $${p.money}</div>
                   <div>Props: ${p.properties.join(', ') || 'Nenhuma'}</div>`;
    moneyBoard.appendChild(d);
  });
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}
//função para verificar se o jogador venceu
function checkVictory() {
  const defeated = players.find(p => p.money <= 0);
  if (defeated) {
    const winner = players.find(p => p.id !== defeated.id);
    document.getElementById('winner-message').textContent = `🎉 Jogador ${winner.id + 1} ${winner.emoji} venceu o jogo!`;
    document.getElementById('victory-screen').style.display = 'flex';
    rollDiceBtn.disabled = true;
    rollDiceBtn.style.display = 'none';
    return true;
  }
  return false;
}


function nextTurn() {
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  const cp = players[currentPlayerIndex];
  rollDiceBtn.disabled = false;
  rollDiceBtn.style.display = 'block';
  turnMessage.textContent = `Vez do Jogador ${cp.id + 1} ${cp.emoji}. Clique para rolar o dado.`;
  showNotice(`Jogador ${cp.id + 1} ${cp.emoji} vai jogar!`);
}

function handleMove(player, steps) {
  player.position = (player.position + steps) % totalTiles;
  updatePositions();
  if (properties[player.position]) {
    transact(player, player.position);
  } else if (eventIndexes.includes(player.position)) {
    const events = ['+200', '-150', '+100', '-100'];
    const e = events[Math.floor(Math.random() * events.length)];
    const amt = parseInt(e);
    player.money += amt;
    showNotice(`Evento para ${player.emoji}: ${e}`, () => {
      updateMoney();
      if (!checkVictory()) {
        setTimeout(nextTurn, 500);
      }
    });
  } else {
    updateMoney();
    if (!checkVictory()) {
      setTimeout(nextTurn, 1500);
    }
  }
}

function transact(player, pos) {
  const prop = properties[pos];
  if (prop.owner === null) {
    if (player.money < prop.price) {
      showNotice(`Jogador ${player.id + 1} não tem dinheiro para comprar a casa ${pos}.`, () => {
        if (!checkVictory()) {
          setTimeout(nextTurn, 1000);
        }
      });
      return;
    }

    showNotice(`Jogador ${player.id + 1} pode comprar a casa ${pos} por $${prop.price}.`, () => {
      modalText.textContent = `Jogador ${player.id + 1}, deseja comprar a casa ${pos} por $${prop.price}?`;
      buyModal.style.display = 'block';
      rollDiceBtn.disabled = true;

      buyYesBtn.onclick = () => {
        buyModal.style.display = 'none';
        rollDiceBtn.disabled = false;
        buyProperty(player, pos);
        showNotice(`Jogador ${player.id + 1} comprou a casa ${pos}!`, () => {
          updateMoney();
          updatePositions();
          if (!checkVictory()) {
            setTimeout(nextTurn, 500);
          }
        });
      };

      buyNoBtn.onclick = () => {
        buyModal.style.display = 'none';
        rollDiceBtn.disabled = false;
        showNotice(`Jogador ${player.id + 1} recusou a casa ${pos}.`, () => {
          if (!checkVictory()) {
            setTimeout(nextTurn, 500);
          }
        });
      };
    });
  } else if (prop.owner !== player.id) {
    const rent = Math.floor(prop.price * 0.2);
    player.money -= rent;
    players[prop.owner].money += rent;
    showNotice(`${player.emoji} pagou $${rent} de aluguel para ${players[prop.owner].emoji}.`, () => {
      updateMoney();
      if (!checkVictory()) {
        setTimeout(nextTurn, 1000);
      }
    });
  } else {
    setTimeout(nextTurn, 1000);
  }
}

function buyProperty(player, pos) {
  const prop = properties[pos];
  player.money -= prop.price;
  prop.owner = player.id;
  player.properties.push(pos);
  updateMoney();
  updatePositions();
  checkVictory();
}

createBoard();
createPlayers();
updatePositions();
updateMoney();
nextTurn();

rollDiceBtn.addEventListener('click', () => {
  rollDiceBtn.disabled = true;
  const cp = players[currentPlayerIndex];
  const r = rollDice();
  diceResult.textContent = `Jogador ${cp.id + 1} tirou ${r}!`;
  showNotice(`Jogador ${cp.id + 1} ${cp.emoji} jogou o dado e está esperando decisão...`);
  handleMove(cp, r);
});

buyModal.addEventListener('click', (e) => {
  if (e.target === buyModal) {
    buyModal.style.display = 'none';
    rollDiceBtn.disabled = false;
  }
});
