// Elementos
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

// Configuração do tabuleiro
const cols = 12, rows = 8;
const totalTiles = (cols + rows - 2) * 2;
const icons = [/* ...seus ícones... */];

// Propriedades e eventos
const properties = {};
for (let i = 0; i < totalTiles; i++) {
  if (i % 5 !== 0) properties[i] = { price: 100 + i*10, owner: null };
}
const eventIndexes = [...Array(totalTiles).keys()].filter(i => i % 5 === 0);

// Jogadores
const players = [
  { id:0, emoji:'👾', position:0, money:1500, properties:[] },
  { id:1, emoji:'🤖', position:0, money:1500, properties:[] },
  { id:2, emoji:'🚀', position:0, money:1500, properties:[] },
  { id:3, emoji:'🛸', position:0, money:1500, properties:[] }
];
let currentPlayerIndex = 0;
const tiles = [], playerElems = [];

// Criação do tabuleiro e jogadores
function createBoard(){
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    let num = null;
    if(r===0) num=c;
    else if(c===cols-1) num=cols-1+r;
    else if(r===rows-1) num=cols-1+rows-1+(cols-1-c);
    else if(c===0) num=totalTiles-1-(r-1);
    const div=document.createElement('div');
    div.style.gridRowStart=r+1; div.style.gridColumnStart=c+1;
    if(num!==null && num<totalTiles){
      div.classList.add('tile'); div.id=`tile-${num}`;
      if(properties[num]){
        div.innerHTML=`${num} ${icons[num%icons.length]}<br><small>$${properties[num].price}</small>`;
      } else if(eventIndexes.includes(num)){
        div.innerHTML=`${num} 🎲 Evento`;
        div.style.backgroundColor='#004466'; div.style.borderColor='#ffaa00';
      }
      tiles[num]=div;
    }
    board.appendChild(div);
  }
}
function createPlayers(){
  players.forEach(p=>{
    const el=document.createElement('div');
    el.classList.add('player'); el.textContent=p.emoji;
    board.appendChild(el); playerElems[p.id]=el;
  });
}

// Atualizações de UI
function updatePositions(){
  players.forEach(p=>{
    const tile=tiles[p.position];
    if(!tile)return;
    const br=board.getBoundingClientRect(), tr=tile.getBoundingClientRect();
    const x=tr.left-br.left+tr.width/2, y=tr.top-br.top+tr.height/2, off=30;
    const top = y + (p.id<2?-off:off), left = x + (p.id%2?off:-off);
    const el=playerElems[p.id];
    el.style.top=`${top-el.offsetHeight/2}px`;
    el.style.left=`${left-el.offsetWidth/2}px`;
  });
}
function updateMoney(){
  moneyBoard.innerHTML='';
  players.forEach(p=>{
    const d=document.createElement('div');
    d.className='player-money';
    d.innerHTML=`<div class="player-name">${p.emoji} Jogador ${p.id+1}</div>
                 <div>Dinheiro: $${p.money}</div>
                 <div>Props: ${p.properties.join(', ')||'Nenhuma'}</div>`;
    moneyBoard.appendChild(d);
  });
}
function showNotice(text){
  noticeText.textContent=text;
  actionNotice.style.display='block';
  actionNotice.classList.remove('fade');
  void actionNotice.offsetWidth;
  actionNotice.classList.add('fade');
  setTimeout(()=>actionNotice.style.display='none', 10000);
}

// Lógica de turno e dados
function rollDice(){ return Math.floor(Math.random()*6)+1; }
function nextTurn(){
  currentPlayerIndex=(currentPlayerIndex+1)%players.length;
  const cp=players[currentPlayerIndex];
  turnMessage.textContent = cp.id===0 
    ? 'Sua vez, 👾' 
    : `Vez da IA ${cp.emoji}`;
  if(cp.id===0){
    rollDiceBtn.style.display='block';
  } else {
    rollDiceBtn.style.display='none';
    setTimeout(()=>{
      const r=rollDice();
      diceResult.textContent=`IA ${cp.emoji} tirou: ${r}`;
      handleMove(cp,r);
    }, 1000);
  }
}
function handleMove(player, steps){
  player.position=(player.position+steps)%totalTiles;
  updatePositions();
  if(properties[player.position]){
    transact(player, player.position);
  } else if(eventIndexes.includes(player.position)){
    const e = ['+200','-150','+100','-100'][Math.floor(Math.random()*4)];
    const amt = parseInt(e);
    player.money += amt;
    showNotice(`Evento ${player.emoji}: ${e}`);
  }
  updateMoney();
  setTimeout(nextTurn, 1500);
}
function transact(player, pos){
  const prop=properties[pos];
  if(prop.owner===null){
    if(player.id===0){
      // pergunta
      modalText.textContent=`Comprar casa ${pos} por $${prop.price}?`;
      buyModal.style.display='block';
      rollDiceBtn.disabled=true;
      buyYesBtn.onclick=()=>{
        buyModal.style.display='none'; rollDiceBtn.disabled=false;
        buyProperty(player,pos);
        showNotice(`Você comprou a casa ${pos}`);
        updateMoney(); updatePositions();
        setTimeout(nextTurn, 500);
      };
      buyNoBtn.onclick=()=>{
        buyModal.style.display='none'; rollDiceBtn.disabled=false;
        showNotice(`Você recusou a casa ${pos}`);
        setTimeout(nextTurn, 500);
      };
    } else if(player.money>=prop.price){
      buyProperty(player,pos);
      showNotice(`IA ${player.emoji} comprou casa ${pos}`);
    }
  } else if(prop.owner!==player.id){
    const rent=Math.floor(prop.price*0.2);
    player.money-=rent;
    players[prop.owner].money+=rent;
    showNotice(`${player.emoji} pagou $${rent} a ${players[prop.owner].emoji}`);
  }
}
function buyProperty(player,pos){
  const prop=properties[pos];
  prop.owner=player.id;
  player.money-=prop.price;
  player.properties.push(pos);
  const tile=tiles[pos];
  tile.style.backgroundColor=['#005577','#774433','#337744','#777755'][player.id];
  tile.innerHTML=`${pos} ${icons[pos%icons.length]}<br><small>Dono: ${player.emoji}</small>`;
}

// Eventos
rollDiceBtn.addEventListener('click', ()=>{
  const r=rollDice();
  diceResult.textContent=`Você tirou: ${r}`;
  rollDiceBtn.style.display='none';
  handleMove(players[0], r);
});

// Inicialização
createBoard(); createPlayers();
updatePositions(); updateMoney();
nextTurn();
