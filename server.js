const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/tela-inicial/index.html');
});

// =================== LÓGICA E ESTADO DO JOGO ===================

const cols = 12, rows = 8;
const totalTiles = (cols + rows - 2) * 2;
const properties = {};
for (let i = 0; i < totalTiles; i++) {
  if (i % 5 !== 0) properties[i] = { price: 100 + i * 10, owner: null };
}
const eventIndexes = [...Array(totalTiles).keys()].filter(i => i % 5 === 0 && i !== 0);

let gameState = {};
let gameInProgress = false;

function initializeGame(settings) {
  const players = [];
  for (let i = 0; i < settings.numPlayers; i++) {
    players.push({
      id: i,
      position: 0,
      money: 1500,
      properties: [],
      playerType: settings.players[i],
      socketId: null
    });
  }
  
  gameState = {
    players: players,
    currentPlayerIndex: 0,
  };

  gameInProgress = true;
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function checkVictory() {
    if (!gameState.players || gameState.players.length <= 1) return false;
    const activePlayers = gameState.players.filter(p => p.money > 0);
    if (activePlayers.length === 1) {
        const winner = activePlayers[0];
        io.emit('gameOver', { message: `🎉 Jogador ${winner.id + 1} venceu o jogo!` });
        gameInProgress = false;
        return true;
    }
    return false;
}

function nextTurn() {
    if (!gameInProgress) return;
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    io.emit('gameUpdate', gameState);
    io.emit('showNotice', `Vez do Jogador ${currentPlayer.id + 1}.`);

    if (currentPlayer.playerType === 'ia') {
      setTimeout(() => {
        playAITurn(currentPlayer);
      }, 2000);
    }
}

function playAITurn(aiPlayer) {
    io.emit('showNotice', `Jogador ${aiPlayer.id + 1} (IA) está a jogar...`);
    const steps = rollDice();
    io.emit('showNotice', `Jogador ${aiPlayer.id + 1} (IA) tirou ${steps}!`);
    handleMove(aiPlayer, steps);
}


function handleMove(player, steps) {
    const startPos = player.position;
    player.position = (player.position + steps) % totalTiles;
    
    io.emit('playerMoved', { 
        playerId: player.id, 
        startPos: startPos,
        endPos: player.position,
        steps: steps
    });

    setTimeout(() => {
        const currentTile = player.position;

        if (properties[currentTile]) {
            transact(player, currentTile);
        } else if (eventIndexes.includes(currentTile)) {
            const events = ['+200', '-150', '+100', '-100'];
            const e = events[Math.floor(Math.random() * events.length)];
            const amt = parseInt(e);
            player.money += amt;
            io.emit('showNotice', `Evento: ${e}`);
            io.emit('gameUpdate', gameState);
            if (!checkVictory()) setTimeout(nextTurn, 2000);
        } else {
            if (!checkVictory()) setTimeout(nextTurn, 1500);
        }
    }, (steps + 1) * 160);
}

function transact(player, pos) {
    const prop = properties[pos];
    
    if (prop.owner === null) {
        if (player.playerType === 'ia') {
            if (player.money >= prop.price) {
                player.money -= prop.price;
                prop.owner = player.id;
                player.properties.push(pos);
                io.emit('showNotice', `Jogador ${player.id + 1} (IA) comprou a casa ${pos}!`);
                io.emit('gameUpdate', gameState);
            } else {
                io.emit('showNotice', `Jogador ${player.id + 1} (IA) não comprou a casa ${pos}.`);
            }
            if (!checkVictory()) setTimeout(nextTurn, 1000);
        } else {
            if (player.money >= prop.price) {
                io.to(player.socketId).emit('offerPurchase', { pos, price: prop.price, playerId: player.id });
            } else {
                io.emit('showNotice', `Jogador ${player.id + 1} não tem dinheiro para comprar.`);
                setTimeout(nextTurn, 2000);
            }
        }
    } else if (prop.owner !== player.id) {
        const rent = Math.floor(prop.price * 0.2);
        player.money -= rent;
        gameState.players.find(p => p.id === prop.owner).money += rent;
        io.emit('showNotice', `Pagou $${rent} de aluguer ao Jogador ${prop.owner + 1}.`);
        io.emit('gameUpdate', gameState);
        if (!checkVictory()) setTimeout(nextTurn, 2000);
    } else {
        setTimeout(nextTurn, 1500);
    }
}

io.on('connection', (socket) => {
  console.log('Novo jogador conectado:', socket.id);

  if (gameInProgress) {
    const playerToAssign = gameState.players.find(p => p.socketId === null && p.playerType === 'local');
    if (playerToAssign) {
        playerToAssign.socketId = socket.id;
        socket.emit('playerAssigned', { playerId: playerToAssign.id, gameState: gameState });
        console.log(`Jogador ${playerToAssign.id} associado ao socket ${socket.id}`);
        io.emit('gameUpdate', gameState);
    } else {
        socket.emit('gameUpdate', gameState);
    }
  }

  socket.on('startGame', (settings) => {
    initializeGame(settings);
    io.emit('gameStarted');
    setTimeout(() => {
        const firstPlayer = gameState.players[0];
        io.emit('gameUpdate', gameState);
        io.emit('showNotice', `Vez do Jogador ${firstPlayer.id + 1}.`);
        if (firstPlayer.playerType === 'ia') {
            setTimeout(() => playAITurn(firstPlayer), 2000);
        }
    }, 1000);
  });

  socket.on('rollDice', (playerId) => {
    if (!gameInProgress || playerId !== gameState.currentPlayerIndex) return;
    
    const player = gameState.players[gameState.currentPlayerIndex];
    if (player.playerType === 'ia') return;
    if (socket.id !== player.socketId) return;

    const steps = rollDice();
    io.emit('showNotice', `Jogador ${player.id + 1} tirou ${steps}!`);
    handleMove(player, steps);
  });
  
   socket.on('purchaseDecision', (decision) => {
        if (decision.playerId !== gameState.currentPlayerIndex) return;

        const player = gameState.players[gameState.currentPlayerIndex];
        const prop = properties[decision.pos];

        if (decision.buy && player.money >= prop.price) {
            player.money -= prop.price;
            prop.owner = player.id;
            player.properties.push(decision.pos);
            io.emit('showNotice', `Jogador ${player.id + 1} comprou a casa ${decision.pos}!`);
        } else {
            io.emit('showNotice', `Jogador ${player.id + 1} recusou a compra.`);
        }
        
        io.emit('gameUpdate', gameState);
        if (!checkVictory()) setTimeout(nextTurn, 1000);
    });

  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id);
    if (gameInProgress) {
        const disconnectedPlayer = gameState.players.find(p => p.socketId === socket.id);
        if (disconnectedPlayer) {
            console.log(`Jogador ${disconnectedPlayer.id} perdeu a conexão.`);
            disconnectedPlayer.socketId = null;
        }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});