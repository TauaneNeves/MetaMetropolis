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

const baseProperties = {
  1: { id: 1, name: "Torre de Néon", group: "Ciano", price: 120, rent: 15, buildCost: 60 },
  2: { id: 2, name: "Plataforma de Drons", group: "Ciano", price: 130, rent: 18, buildCost: 65 },
  3: { id: 3, name: "Mercado de Hologramas", group: "Ciano", price: 140, rent: 20, buildCost: 70 },
  4: { id: 4, name: "Setor Magenta", group: "Magenta", price: 160, rent: 22, buildCost: 80 },
  6: { id: 6, name: "Laboratório de IA", group: "Magenta", price: 170, rent: 25, buildCost: 85 },
  7: { id: 7, name: "Fábrica de Androides", group: "Magenta", price: 180, rent: 28, buildCost: 90 },
  8: { id: 8, name: "Centro de Sinapse", group: "Amarelo", price: 200, rent: 30, buildCost: 100 },
  9: { id: 9, name: "Rede Neural Central", group: "Amarelo", price: 210, rent: 32, buildCost: 105 },
  11: { id: 11, name: "Torre de Dados", group: "Amarelo", price: 220, rent: 35, buildCost: 110 },
  12: { id: 12, name: "Porto Espacial", group: "Verde", price: 250, rent: 40, buildCost: 120 },
  13: { id: 13, name: "Jardins Verticais", group: "Verde", price: 260, rent: 42, buildCost: 125 },
  14: { id: 14, name: "Complexo Bio-Domus", group: "Verde", price: 280, rent: 45, buildCost: 130 },
  16: { id: 16, name: "Autoestrada Magnética", group: "Laranja", price: 300, rent: 50, buildCost: 150 },
  17: { id: 17, name: "Hub de Hyperloop", group: "Laranja", price: 310, rent: 55, buildCost: 155 },
  18: { id: 18, name: "Campo de Antimatéria", group: "Laranja", price: 320, rent: 60, buildCost: 160 },
  19: { id: 19, name: "Reator de Fusão", group: "Vermelho", price: 340, rent: 65, buildCost: 170 },
  21: { id: 21, name: "Satélite Quântico", group: "Vermelho", price: 350, rent: 70, buildCost: 175 },
  22: { id: 22, name: "Matriz de Energia", group: "Vermelho", price: 360, rent: 75, buildCost: 180 },
  23: { id: 23, name: "Torre Ark", group: "Azul", price: 400, rent: 80, buildCost: 200 },
  24: { id: 24, name: "Complexo Orbital", group: "Azul", price: 420, rent: 90, buildCost: 210 },
  26: { id: 26, name: "Mina de Hélio-3", group: "Roxo", price: 450, rent: 100, buildCost: 220 },
  27: { id: 27, name: "Cidade de Titânio", group: "Roxo", price: 475, rent: 110, buildCost: 230 },
};

let properties = {};

// --- LISTA DE EVENTOS REDUZIDA PARA EXATAMENTE 5 ---
const eventIndexes = [5, 12, 18, 27, 34]; // Escolha os números das casas que quer que sejam eventos

let gameState = {};
let gameInProgress = false;
let turnInProgress = false;

function initializeGame(settings) {
  properties = JSON.parse(JSON.stringify(baseProperties));
  Object.values(properties).forEach(prop => {
    prop.level = 0;
    prop.owner = null;
  });

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
    properties: properties,
    eventIndexes: eventIndexes // Envia a lista de eventos para o cliente
  };

  gameInProgress = true;
  turnInProgress = false;
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

    turnInProgress = false;
    if (currentPlayer.playerType === 'ia') {
      setTimeout(() => {
        playAITurn(currentPlayer);
      }, 2000);
    }
}

function playAITurn(aiPlayer) {
    if (turnInProgress) return;
    turnInProgress = true;

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
            // Se não for propriedade nem evento, apenas passa a vez
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
                prop.level = 1;
                prop.rent = Math.floor(prop.rent * 1.8);
                player.properties.push(prop);
                io.emit('showNotice', `Jogador ${player.id + 1} (IA) comprou a casa ${pos}!`);
                io.emit('gameUpdate', gameState);
            }
            if (!checkVictory()) setTimeout(nextTurn, 1000);
        } else {
            if (player.money >= prop.price) {
                io.to(player.socketId).emit('offerPurchase', { pos, price: prop.price, name: prop.name, playerId: player.id });
            } else {
                io.emit('showNotice', `Jogador ${player.id + 1} não tem dinheiro para comprar.`);
                setTimeout(nextTurn, 2000);
            }
        }
    } else if (prop.owner === player.id) {
        if (prop.level < 5) {
            if (player.playerType === 'ia') {
                if (player.money >= prop.buildCost * 2) {
                    player.money -= prop.buildCost;
                    prop.level += 1;
                    prop.rent = Math.floor(prop.rent * 1.8);
                    io.emit('showNotice', `Jogador ${player.id + 1} (IA) melhorou a propriedade ${pos}!`);
                    io.emit('gameUpdate', gameState);
                }
                if (!checkVictory()) setTimeout(nextTurn, 1000);
            } else {
                io.to(player.socketId).emit('offerImprovement', { pos, name: prop.name, level: prop.level, cost: prop.buildCost, playerId: player.id });
            }
        } else {
            io.emit('showNotice', `Propriedade ${pos} já está no nível máximo!`);
            setTimeout(nextTurn, 1500);
        }
    } else {
        const rent = prop.rent;
        player.money -= rent;
        gameState.players.find(p => p.id === prop.owner).money += rent;
        io.emit('showNotice', `Pagou $${rent} de aluguer ao Jogador ${prop.owner + 1}.`);
        io.emit('gameUpdate', gameState);
        if (!checkVictory()) setTimeout(nextTurn, 2000);
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
    if (turnInProgress || !gameInProgress || playerId !== gameState.currentPlayerIndex) return;
    
    const player = gameState.players[gameState.currentPlayerIndex];
    if (player.playerType === 'ia') return;
    if (socket.id !== player.socketId) return;
    
    turnInProgress = true; 

    const steps = rollDice();
    io.emit('showNotice', `Jogador ${player.id + 1} tirou ${steps}!`);
    handleMove(player, steps);
  });
  
   socket.on('purchaseDecision', (decision) => {
        const player = gameState.players.find(p => p.id === decision.playerId);
        const prop = properties[decision.pos];
        if (!player || !prop) return;

        if (decision.buy && player.money >= prop.price) {
            player.money -= prop.price;
            prop.owner = player.id;
            prop.level = 1;
            prop.rent = Math.floor(prop.rent * 1.8);
            player.properties.push(prop);
            io.emit('showNotice', `Jogador ${player.id + 1} comprou "${prop.name}"!`);
        } else {
            io.emit('showNotice', `Jogador ${player.id + 1} recusou a compra.`);
        }
        
        io.emit('gameUpdate', gameState);
        if (!checkVictory()) setTimeout(nextTurn, 1000);
    });
    
   socket.on('improveDecision', (decision) => {
        const player = gameState.players.find(p => p.id === decision.playerId);
        const prop = properties[decision.pos];
        if (!player || !prop) return;

        if (decision.improve && player.money >= prop.buildCost) {
            player.money -= prop.buildCost;
            prop.level += 1;
            prop.rent = Math.floor(prop.rent * 1.8);
            io.emit('showNotice', `Jogador ${player.id + 1} melhorou "${prop.name}"!`);
        } else {
            io.emit('showNotice', `Jogador ${player.id + 1} não fez a melhoria.`);
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