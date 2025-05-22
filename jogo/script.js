// Seleciona os elementos principais do HTML
const board = document.getElementById('board'); // tabuleiro do jogo
const moneyBoard = document.getElementById('money-board'); // painel de dinheiro e propriedades dos jogadores
const rollDiceBtn = document.getElementById('roll-dice'); // botão para rolar o dado
const diceResult = document.getElementById('dice-result'); // área que mostra o resultado do dado
const turnMessage = document.getElementById('turn-message'); // mensagem da vez do jogador
const buyModal = document.getElementById('buy-modal'); // modal de compra de propriedade
const modalText = document.getElementById('modal-text'); // texto dentro do modal
const buyYesBtn = document.getElementById('buy-yes'); // botão de confirmar compra
const buyNoBtn = document.getElementById('buy-no'); // botão de recusar compra
const actionNotice = document.getElementById('action-notice'); // caixa de aviso de ação
const noticeText = document.getElementById('notice-text'); // texto do aviso
const historyBox = document.getElementById('history'); // histórico das ações anteriores

// Definição das dimensões do tabuleiro
const cols = 12, rows = 8;
const totalTiles = (cols + rows - 2) * 2; // total de casas no tabuleiro

// Adiciona os ícones ao tabuleiro
window.addEventListener('DOMContentLoaded', () => {
  let settings;
  try {
    settings = JSON.parse(localStorage.getItem('gameSettings'));
  } catch (error) {
    console.error('Failed to parse gameSettings from localStorage:', error);
    settings = null;
  }
  const sidebar = document.querySelector('.sidebar');

  if (settings && settings.players) {
    sidebar.innerHTML = ''; // Limpa o que estava fixo
// Adiciona os ícones dos jogadores 
    settings.players.forEach((type, index) => {
      const icon = document.createElement('div');
      icon.classList.add('icon');
      icon.textContent = type.toUpperCase();
      sidebar.appendChild(icon);
    });
  } else {
    console.error('Configurações não encontradas.');
  }
});


// Arrays e objetos auxiliares
const icons = [];
const properties = {}; // propriedades disponíveis no jogo
for (let i = 0; i < totalTiles; i++) {
  if (i % 5 !== 0) properties[i] = { price: 100 + i * 10, owner: null }; // define casas compráveis
}
const eventIndexes = [...Array(totalTiles).keys()].filter(i => i % 5 === 0 && i !== 0); // casas de evento

const emojis = ['👾', '🚀', '🤖', '🛸']; // emojis dos jogadores

// Configura o número de jogadores conforme a configuração
let numPlayers = 2; // número padrão de jogadores
try {
  const settings = JSON.parse(localStorage.getItem('gameSettings'));
  if (settings && settings.numPlayers) {
    numPlayers = Math.min(settings.numPlayers, emojis.length); // limita ao número de emojis disponíveis
  }
} catch (error) {
  console.error('Failed to parse gameSettings from localStorage:', error);
}


const players = [];

// Cria os jogadores conforme numPlayers
for (let i = 0; i < numPlayers; i++) {
  players.push({
    id: i,
    emoji: emojis[i] || '🙂',
    position: 0, // começa na casa 0
    money: 1500, // dinheiro inicial
    properties: [] // propriedades compradas
  });
}

let currentPlayerIndex = 0; // controla qual jogador está jogando

const tiles = [], playerElems = []; // arrays que armazenam as casas e os elementos visuais dos jogadores

let messageQueue = []; // fila de mensagens a mostrar
let messageLog = []; // histórico de mensagens
let messageActive = false; // controla se uma mensagem está sendo exibida

// Função para mostrar uma notificação com callback
function showNotice(text, callback) {
  messageQueue.push({ text, callback });
  messageLog.push(text);
  updateHistory();
  if (!messageActive) showNextMessage();
}

// Mostra a próxima mensagem da fila
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

// Atualiza o histórico de mensagens
function updateHistory() {
  historyBox.innerHTML = messageLog.map(msg => `<div>${msg}</div>`).join('');
}

// Cria o tabuleiro com as casas numeradas
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

// Cria os elementos visuais dos jogadores
function createPlayers() {
  players.forEach(p => {
    const el = document.createElement('div');
    el.classList.add('player');
    el.textContent = p.emoji;
    board.appendChild(el);
    playerElems[p.id] = el;
  });
}

// Atualiza a posição dos jogadores no tabuleiro
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

// Atualiza o painel de dinheiro e propriedades (com destaque para o jogador da vez)
function updateMoney() {
  moneyBoard.innerHTML = ''; // limpa o painel

  players.forEach((p, i) => {
    const d = document.createElement('div');
    d.className = 'player-money';
    if (i === currentPlayerIndex) {
      d.classList.add('active-player'); // adiciona destaque ao jogador atual
    }
    d.innerHTML = `
      <div class="player-name">${p.emoji} Jogador ${p.id + 1}</div>
      <div>Dinheiro: $${p.money}</div>
      <div>Props: ${p.properties.length > 0 ? p.properties.map(String).join(', ') : 'Nenhuma'}</div>
    `;
    moneyBoard.appendChild(d);
  });
}


// Rola o dado (valor entre 1 e 6)
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// Verifica se algum jogador perdeu
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

// Passa a vez para o próximo jogador
function nextTurn() {
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  const cp = players[currentPlayerIndex];
  rollDiceBtn.disabled = false;
  rollDiceBtn.style.display = 'block';
  turnMessage.textContent = `Vez do Jogador ${cp.id + 1} ${cp.emoji}. Clique para rolar o dado.`;
  updateMoney(); // <-- ISSO é o que garante que o destaque funcione!
  showNotice(`Jogador ${cp.id + 1} ${cp.emoji} vai jogar!`);
}


// Move o jogador e trata a ação da casa
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

// Lida com transações ao cair em uma casa comprável
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

// Realiza a compra da propriedade
function buyProperty(player, pos) {
  const prop = properties[pos];
  player.money -= prop.price;
  prop.owner = player.id;
  player.properties.push(pos);
  updateMoney();
  updatePositions();
  checkVictory();
}

// Inicialização do jogo
createBoard();
createPlayers();
updatePositions();
updateMoney();

const currentPlayer = players[currentPlayerIndex];
turnMessage.textContent = `Vez do Jogador ${currentPlayer.id + 1} ${currentPlayer.emoji}. Clique para rolar o dado.`;
showNotice(`Jogador ${currentPlayer.id + 1} ${currentPlayer.emoji} vai jogar!`);

// Evento ao clicar no botão de rolar dado
rollDiceBtn.addEventListener('click', () => {
  rollDiceBtn.disabled = true;
  diceResult.textContent = '';
  
  const diceAnim = document.getElementById('dice-animation');
  diceAnim.style.display = 'block';

  setTimeout(() => {
    const cp = players[currentPlayerIndex];
    const r = rollDice();
    diceAnim.style.display = 'none';
    diceResult.textContent = `Jogador ${cp.id + 1} tirou ${r}!`;
    showNotice(`Jogador ${cp.id + 1} ${cp.emoji} jogou o dado e está esperando decisão...`);
    handleMove(cp, r);
  }, 1500); // anima o dado por 1.5 segundos
});

// Fecha o modal se clicar fora dele
buyModal.addEventListener('click', (e) => {
  if (e.target === buyModal) {
    buyModal.style.display = 'none';
    rollDiceBtn.disabled = false;
  }
});
