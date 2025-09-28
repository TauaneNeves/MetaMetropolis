const socket = io();

// Elementos do DOM
const board = document.getElementById('board');
const moneyBoard = document.getElementById('money-board');
const rollDiceBtn = document.getElementById('roll-dice');
const turnMessage = document.getElementById('turn-message');
const buyModal = document.getElementById('buy-modal');
const modalText = document.getElementById('modal-text');
const buyYesBtn = document.getElementById('buy-yes');
const buyNoBtn = document.getElementById('buy-no');
const actionNotice = document.getElementById('action-notice');
const noticeText = document.getElementById('notice-text');
const historyBox = document.getElementById('history');
const victoryScreen = document.getElementById('victory-screen');
const winnerMessage = document.getElementById('winner-message');

let currentGameState = {};
const cols = 12, rows = 8;
const totalTiles = (cols + rows - 2) * 2;
let tiles = [];
let playerElems = [];
let localPlayerId = null;
let messageLog = [];

const playerIcons = [
  '/assets/personagem.gif',
  '/assets/personagem2.gif',
  'https://www.flaticon.com/svg/static/icons/svg/3039/3039543.svg',
  'https://www.flaticon.com/svg/static/icons/svg/921/921125.svg'
];
const playerColors = ['#ff4d4d', '#4d94ff', '#4dff4d', '#ffff4d'];

function showNotice(text) {
    noticeText.textContent = text;
    actionNotice.style.display = 'block';
    actionNotice.classList.add('fade');
    messageLog.unshift(text);
    updateHistory();
    setTimeout(() => {
        actionNotice.style.display = 'none';
        actionNotice.classList.remove('fade');
    }, 2000);
}

function updateHistory() {
    historyBox.innerHTML = messageLog.map(msg => `<div>${msg}</div>`).join('');
}

// --- FUNÇÃO ATUALIZADA PARA USAR A LISTA DE EVENTOS DO SERVIDOR ---
function createBoard(properties, eventIndexes) {
    board.innerHTML = '';
    tiles = [];
    
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
                
                const prop = properties[num];
                if (prop) {
                    div.innerHTML = `
                        <div class="color-bar ${prop.group}"></div>
                        <div class="prop-name">${prop.name}</div>
                        <div class="prop-price">$${prop.price}</div>
                    `;
                } else if (eventIndexes.includes(num)) {
                    // Desenha "Evento" apenas se o número estiver na lista de eventos
                    div.textContent = "Evento";
                } else {
                    // Para outras casas (como Início, etc.)
                    if (num === 0) div.textContent = "Início";
                    // Deixa outras casas em branco ou com outro texto
                }
                
                tiles[num] = div;
            }
            board.appendChild(div);
        }
    }
}


function createOrUpdatePlayers(players) {
  players.forEach(p => {
    let el = document.getElementById(`player-${p.id}`);
    if (!el) {
      el = document.createElement('div');
      el.id = `player-${p.id}`;
      el.classList.add('player');
      el.innerHTML = `<img src="${playerIcons[p.id]}" alt="Jogador ${p.id + 1}" />`;
      board.appendChild(el);
      playerElems[p.id] = el;
    }
  });
}

function updatePlayerPosition(player) {
    const el = playerElems[player.id];
    const tile = tiles[player.position];
    if (!el || !tile) return;

    const tileRect = tile.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    const top = tileRect.top - boardRect.top + tile.offsetHeight / 2 - el.offsetHeight / 2;
    const left = tileRect.left - boardRect.left + tile.offsetWidth / 2 - el.offsetWidth / 2;
    el.style.transition = 'none';
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function animateMove(playerId, startPos, endPos) {
  const el = playerElems[playerId];
  if (!el) return;
  let currentPos = startPos;
  while (currentPos !== endPos) {
    currentPos = (currentPos + 1) % totalTiles;
    const tile = tiles[currentPos];
    if (tile) {
      const tileRect = tile.getBoundingClientRect();
      const boardRect = board.getBoundingClientRect();
      const top = tileRect.top - boardRect.top + tile.offsetHeight / 2 - el.offsetHeight / 2;
      const left = tileRect.left - boardRect.left + tile.offsetWidth / 2 - el.offsetWidth / 2;
      el.style.transition = 'top 0.15s linear, left 0.15s linear';
      el.style.top = `${top}px`;
      el.style.left = `${left}px`;
      await sleep(150);
    }
  }
}

function updateMoney(players, currentPlayerIndex) {
    moneyBoard.innerHTML = '';
    players.forEach((p, i) => {
        const d = document.createElement('div');
        d.className = 'player-money';
        if (i === currentPlayerIndex) d.classList.add('active-player');
        d.innerHTML = `
            <div class="player-name" style="color: ${playerColors[p.id]}">
              <img src="${playerIcons[p.id]}" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 5px;" />
              Jogador ${p.id + 1}
            </div>
            <div>Dinheiro: $${p.money}</div>
            <div>Props: ${p.properties.map(prop => prop.id).join(', ') || 'Nenhuma'}</div>
        `;
        moneyBoard.appendChild(d);
    });
}

function updateUI(gameState) {
    if (!gameState || !gameState.players) return;
    currentGameState = gameState;
    
    // --- LÓGICA DE CRIAÇÃO DO TABULEIRO CORRIGIDA ---
    if (tiles.length === 0) {
        createBoard(gameState.properties, gameState.eventIndexes);
    }
    
    createOrUpdatePlayers(gameState.players);
    gameState.players.forEach(p => updatePlayerPosition(p));
    updateMoney(gameState.players, gameState.currentPlayerIndex);
    
    const cp = gameState.players[gameState.currentPlayerIndex];
    turnMessage.textContent = `Vez do Jogador ${cp.id + 1}`;
    rollDiceBtn.disabled = gameState.currentPlayerIndex !== localPlayerId;

    Object.values(gameState.properties).forEach(prop => {
        const tile = document.getElementById(`tile-${prop.id}`);
        if (tile) {
            // Limpa estilos de dono para evitar sobreposição
            tile.className = 'tile';
            const oldImprovements = tile.querySelector('.improvements');
            if (oldImprovements) oldImprovements.remove();

            if (prop.owner !== null) {
                tile.classList.add(`owned-by-${prop.owner}`);
                if (prop.level > 0) {
                    const improvementDiv = document.createElement('div');
                    improvementDiv.className = 'improvements';
                    improvementDiv.textContent = prop.level === 5 ? '🏙️' : '🏠'.repeat(prop.level);
                    tile.appendChild(improvementDiv);
                }
            }
        }
    });
}

rollDiceBtn.addEventListener('click', () => {
    rollDiceBtn.disabled = true;
    socket.emit('rollDice', localPlayerId);
});

socket.on('playerAssigned', (data) => {
    localPlayerId = data.playerId;
    updateUI(data.gameState);
});

socket.on('gameUpdate', (gameState) => {
    updateUI(gameState);
});

socket.on('playerMoved', (data) => {
    const { playerId, startPos, endPos } = data;
    animateMove(playerId, startPos, endPos);
});

socket.on('showNotice', (message) => {
    showNotice(message);
});

socket.on('offerPurchase', (data) => {
    if (data.playerId !== localPlayerId) return;
    modalText.innerHTML = `Deseja comprar <strong>${data.name}</strong> por $${data.price}?`;
    buyYesBtn.textContent = "Comprar";
    buyNoBtn.textContent = "Recusar";
    buyModal.style.display = 'block';
    setTimeout(() => buyModal.classList.add('visible'), 10);

    buyYesBtn.onclick = () => {
        socket.emit('purchaseDecision', { buy: true, pos: data.pos, playerId: localPlayerId });
        buyModal.classList.remove('visible');
        setTimeout(() => { buyModal.style.display = 'none'; }, 300);
    };
    buyNoBtn.onclick = () => {
        socket.emit('purchaseDecision', { buy: false, pos: data.pos, playerId: localPlayerId });
        buyModal.classList.remove('visible');
        setTimeout(() => { buyModal.style.display = 'none'; }, 300);
    };
});

socket.on('offerImprovement', (data) => {
    if (data.playerId !== localPlayerId) return;
    modalText.innerHTML = `Você está em <strong>${data.name}</strong>.<br>Deseja melhorar para o Nível ${data.level + 1} por $${data.cost}?`;
    buyYesBtn.textContent = "Melhorar";
    buyNoBtn.textContent = "Não, obrigado";
    buyModal.style.display = 'block';
    setTimeout(() => buyModal.classList.add('visible'), 10);

    buyYesBtn.onclick = () => {
        socket.emit('improveDecision', { improve: true, pos: data.pos, playerId: localPlayerId });
        buyModal.classList.remove('visible');
        setTimeout(() => { buyModal.style.display = 'none'; }, 300);
    };
    buyNoBtn.onclick = () => {
        socket.emit('improveDecision', { improve: false, pos: data.pos, playerId: localPlayerId });
        buyModal.classList.remove('visible');
        setTimeout(() => { buyModal.style.display = 'none'; }, 300);
    };
});

socket.on('gameOver', (data) => {
    winnerMessage.textContent = data.message;
    victoryScreen.style.display = 'flex';
    rollDiceBtn.disabled = true;
});