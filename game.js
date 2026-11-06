(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  const frame = document.querySelector('.game-frame');
  const stageStat = document.querySelector('#stageStat');
  const coinStat = document.querySelector('#coinStat');
  const progressText = document.querySelector('#progressText');
  const progressBar = document.querySelector('#progressBar');
  const boostStatus = document.querySelector('#boostStatus');
  const toast = document.querySelector('#toast');
  const centerMessage = document.querySelector('#centerMessage');
  const shopModal = document.querySelector('#shopModal');
  const shopCoins = document.querySelector('#shopCoins');
  const shopItems = document.querySelector('#shopItems');
  const levelTitle = document.querySelector('#levelTitle');
  const zoneName = document.querySelector('#zoneName');

  const stages = [
    { zone: 'SUNRISE STARTER', title: 'Easy does it', sub: 'Take your first leap.', sky: ['#9bd8f3','#ffdda6'], accent: '#a8e94e' },
    { zone: 'CLOUD NINE', title: 'Mind the gap', sub: 'A little more air time.', sky: ['#9cbbf3','#d4c8ff'], accent: '#8a79f3' },
    { zone: 'CANDY CIRCUIT', title: 'Sweet & spicy', sub: 'Watch those moving bits.', sky: ['#f5b5d1','#ffd7ad'], accent: '#ff6998' },
    { zone: 'FROSTBITE FALLS', title: 'Ice, ice maybe', sub: 'The platforms keep moving.', sky: ['#79cbe0','#d3f0ff'], accent: '#5bd7df' },
    { zone: 'EMBER RIDGE', title: 'Heat check', sub: 'Tiny landing zones ahead.', sky: ['#f9a77d','#f7d093'], accent: '#ff754e' },
    { zone: 'NEON NIGHTSHIFT', title: 'No looking down', sub: 'Long jumps. Quick feet.', sky: ['#342d79','#a46fc2'], accent: '#c4fb4e' },
    { zone: 'THE SKYBRIDGE', title: 'Almost orbit', sub: 'Precision is everything.', sky: ['#375889','#e2a5c1'], accent: '#f5c45d' },
    { zone: 'SUMMIT ZERO', title: 'Touch the sky', sub: 'One last legendary run.', sky: ['#202c61','#c37cbe'], accent: '#d3fb64' }
  ];
  const shopCatalog = [
    { id:'spring', icon:'↟', name:'Super spring', desc:'Your next 2 jumps go extra high.', price:60, button:'GET 2' },
    { id:'magnet', icon:'✧', name:'Coin magnet', desc:'Pull nearby coins for 20 seconds.', price:75, button:'GET 1' },
    { id:'shield', icon:'⬡', name:'Safety bubble', desc:'Survive your next 2 wipeouts.', price:100, button:'GET 2' },
    { id:'double', icon:'⇧', name:'Double jump', desc:'Unlock a second jump in mid-air.', price:240, button:'UNLOCK', permanent:true }
  ];
  const saveKey = 'skybound-save-v1';
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(saveKey) || '{}') || {}; } catch (_) {}
  const data = { coins: saved.coins || 0, unlocked: Math.max(1, saved.unlocked || 1), double: !!saved.double, spring: saved.spring || 0, magnet: saved.magnet || 0, shield: saved.shield || 0 };
  let W=900,H=560,dpr=1,cameraX=0,stage=1,worldEnd=0,platforms=[],hazards=[],coins=[],clouds=[],collected=new Set();
  let player={x:70,y:0,vx:0,vy:0,w:30,h:46,grounded:false,jumps:0,face:1};
  let checkpoint={x:70,y:0}, checkpointReached=false, stageWon=false, finalWon=false, paused=false;
  let keys={},lastTime=0,toastTimer=0,sceneTime=0, particles=[],moving=[];
  const rand=(seed)=>{let n=seed|0;return()=>{n=(n*1664525+1013904223)|0;return(n>>>0)/4294967296}};
  function persist(){try{localStorage.setItem(saveKey,JSON.stringify(data))}catch(_){}}
  function resize(){const r=frame.getBoundingClientRect(); dpr=Math.min(devicePixelRatio||1,2); W=Math.max(320,r.width);H=Math.max(400,r.height);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
  new ResizeObserver(resize).observe(frame); resize();
  function say(text){toast.textContent=text;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2100)}
  function updateStats(){stageStat.innerHTML=`${String(stage).padStart(2,'0')} <i>/ 08</i>`;coinStat.textContent=String(data.coins).padStart(3,'0');shopCoins.textContent=data.coins;boostStatus.innerHTML='';if(data.double)boostStatus.innerHTML+='<span class="boost-pill">DOUBLE JUMP <b>ON</b></span>';if(data.spring)boostStatus.innerHTML+=`<span class="boost-pill">SPRING <b>${data.spring}</b></span>`;if(data.magnet)boostStatus.innerHTML+=`<span class="boost-pill">MAGNET <b>${Math.ceil(data.magnet/20)}s</b></span>`;if(data.shield)boostStatus.innerHTML+=`<span class="boost-pill">SHIELD <b>${data.shield}</b></span>`}
  function buildStage(n){
    stage=n;stageWon=false;finalWon=false;paused=false;collected=new Set();particles=[];moving=[];cameraX=0;
    const conf=stages[n-1],r=rand(n*9281+41),difficulty=n-1;
    zoneName.textContent=conf.zone;levelTitle.innerHTML=`${conf.title}<span>${conf.sub}</span>`;
    platforms=[{x:0,y:0,w:270,type:'start'}];hazards=[];coins=[];clouds=[];
    let x=270,prevY=0,idx=0;
    while(x<1900+difficulty*210){
      const gap=38+Math.floor(r()*(44+difficulty*7));
      const width=Math.max(112,210-Math.floor(r()*(38+difficulty*12))-difficulty*7);
      let y=Math.max(-145,Math.min(18,prevY+(r()-.53)*(25+difficulty*12)));
      if(idx%4===2)y-=12;
      x+=gap;
      const p={x,y,w:width,type:'normal'};
      if(n>=3&&idx%5===3){p.type='moving';moving.push({platform:p,originY:y,phase:r()*6,amp:14+difficulty*2})}
      platforms.push(p);
      if(n>=2&&idx%3===1&&width>125){hazards.push({x:x+width*(.58+r()*.13),y:y-21,w:26,h:22})}
      const count=1+(r()>.55?1:0);
      for(let j=0;j<count;j++){coins.push({id:`${n}-${idx}-${j}`,x:x+width*(.35+j*.34),y:y-48-(j%2)*18,taken:false,phase:r()*6})}
      prevY=y;x+=width;idx++;
    }
    x+=70;platforms.push({x,y:Math.max(-20,prevY),w:270,type:'finish'});worldEnd=x+270;
    for(let i=0;i<8;i++)clouds.push({x:i*370+r()*180,y:55+r()*200,s:.55+r()*.9,alpha:.18+r()*.25});
    player={x:70,y:-46,vx:0,vy:0,w:30,h:46,grounded:true,jumps:0,face:1};checkpoint={x:70,y:0};checkpointReached=false;
    centerMessage.innerHTML='';updateStats();updateProgress();
  }
  function updateProgress(){const pct=Math.min(100,Math.max(0,Math.floor(player.x/worldEnd*100)));progressText.textContent=`${pct}%`;progressBar.style.width=`${pct}%`}
  function openShop(){paused=true;shopModal.classList.add('open');shopModal.setAttribute('aria-hidden','false');renderShop()}
  function closeShop(){shopModal.classList.remove('open');shopModal.setAttribute('aria-hidden','true');paused=false}
  function renderShop(){shopCoins.textContent=data.coins;shopItems.innerHTML=shopCatalog.map(item=>{const owned=item.permanent&&data.double;return `<article class="shop-item"><div class="item-icon">${item.icon}</div><div class="item-copy"><b>${item.name}${owned?' ✓':''}</b><small>${owned?'Already in your kit.':item.desc}</small></div><button class="buy-button" data-buy="${item.id}" ${owned||data.coins<item.price?'disabled':''}>${owned?'OWNED':`<span>●</span> ${item.price} &nbsp;·&nbsp; ${item.button}`}</button></article>`}).join('')}
  shopItems.addEventListener('click',e=>{const id=e.target.closest('[data-buy]')?.dataset.buy;if(!id)return;const item=shopCatalog.find(v=>v.id===id);if(!item||data.coins<item.price||(id==='double'&&data.double))return;data.coins-=item.price;if(id==='double')data.double=true;else if(id==='spring')data.spring+=2;else if(id==='magnet')data.magnet+=1;else if(id==='shield')data.shield+=2;persist();updateStats();renderShop();say(`${item.name} added to your kit!`)});
  document.querySelector('#shopOpen').addEventListener('click',openShop);document.querySelector('#shopClose').addEventListener('click',closeShop);shopModal.addEventListener('click',e=>{if(e.target===shopModal)closeShop()});
  document.querySelector('#restartButton').addEventListener('click',()=>{if(finalWon){buildStage(1);return}player.x=checkpoint.x;player.y=checkpoint.y-player.h;player.vy=0;player.vx=0;player.grounded=true;player.jumps=0;cameraX=Math.max(0,player.x-W*.36);say('Back to the last safe spot.')});
  function jump(){if(paused||stageWon)return;if(player.grounded){let power=620;if(data.spring>0){power=800;data.spring--;persist();say('SUPER SPRING!');updateStats()}player.vy=-power;player.grounded=false;player.jumps=1;burst(player.x+player.w/2,player.y+player.h,'#ffffff',5);return}if(data.double&&player.jumps<2){player.vy=-590;player.jumps=2;burst(player.x+player.w/2,player.y+player.h/2,'#d7fb69',9);say('DOUBLE JUMP!')}}
  function burst(x,y,color,count){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*190,vy:-Math.random()*180,life:.45+Math.random()*.4,color})}
  function die(){if(data.shield>0){data.shield--;persist();updateStats();player.x=checkpoint.x;player.y=checkpoint.y-player.h;player.vx=0;player.vy=0;player.grounded=true;player.jumps=0;cameraX=Math.max(0,player.x-W*.36);say('Bubble save! Back to your checkpoint.');burst(player.x,player.y+20,'#81e2a7',14);return}player.x=checkpoint.x;player.y=checkpoint.y-player.h;player.vx=0;player.vy=0;player.grounded=true;player.jumps=0;cameraX=Math.max(0,player.x-W*.36);say(checkpointReached?'Oops! Checkpoint to the rescue.':'Oops! Have another go.');burst(player.x,player.y+24,'#ffb3a5',10)}
  function collect(c){if(collected.has(c.id))return;collected.add(c.id);data.coins+=10;persist();updateStats();burst(c.x,c.y,'#ffcf59',8);say('+10 coins');}
  function winStage(){if(stageWon)return;stageWon=true;player.vx=0;player.vy=0;const reward=80+stage*25;data.coins+=reward;data.unlocked=Math.max(data.unlocked,Math.min(8,stage+1));persist();updateStats();burst(player.x+15,player.y+10,'#d5fb68',32);if(stage<8){centerMessage.innerHTML=`<span class="big">STAGE CLEAR!</span><span class="small">+${reward} COINS &nbsp; · &nbsp; NEXT STAGE LOADING</span>`;say(`Stage clear! +${reward} coins`);setTimeout(()=>{if(stageWon)buildStage(stage+1)},2100)}else{finalWon=true;centerMessage.innerHTML='<span class="big">YOU TOUCHED THE SKY!</span><span class="small">OBBY CHAMPION &nbsp; · &nbsp; CLICK RESTART TO RUN IT BACK</span>';say(`Summit conquered! +${reward} coins`)}}

  function roundRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
  function drawBackground(base,conf){
    const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,conf.sky[0]);grad.addColorStop(1,conf.sky[1]);ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    const night=stage>=6;ctx.save();
    if(night){for(let i=0;i<80;i++){const sx=((i*173+31-cameraX*.06)%(W+40)+W+40)%(W+40);const sy=(i*89+17)%(H*.63);ctx.fillStyle=`rgba(255,255,255,${.18+(i%4)*.12})`;ctx.beginPath();ctx.arc(sx,sy,(i%3)*.45+.7,0,Math.PI*2);ctx.fill()}}
    else{const sx=W*.77-cameraX*.035,sy=H*.18;const sun=ctx.createRadialGradient(sx,sy,7,sx,sy,82);sun.addColorStop(0,'#fff8d8dd');sun.addColorStop(1,'#fff8d800');ctx.fillStyle=sun;ctx.fillRect(sx-90,sy-90,180,180);ctx.fillStyle='#fff4c2';ctx.beginPath();ctx.arc(sx,sy,23,0,Math.PI*2);ctx.fill()}
    for(let i=0;i<clouds.length;i++){const c=clouds[i],cx=((c.x-cameraX*.17)%(W+350)+W+350)%(W+350)-90;ctx.globalAlpha=c.alpha;ctx.fillStyle=night?'#d7dcff':'#fff';ctx.beginPath();ctx.ellipse(cx,c.y,c.s*45,c.s*12,0,0,Math.PI*2);ctx.ellipse(cx-20*c.s,c.y+2,c.s*25,c.s*10,0,0,Math.PI*2);ctx.ellipse(cx+22*c.s,c.y-5,c.s*28,c.s*15,0,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;
    for(let layer=0;layer<3;layer++){const y=base-80+layer*42;ctx.beginPath();ctx.moveTo(0,H);for(let x=-100;x<=W+100;x+=100){let xx=x,world=(x+cameraX*(.10+layer*.08));let peak=Math.sin(world*.004+layer*2)*28+Math.cos(world*.009)*16;ctx.lineTo(xx,y-peak)}ctx.lineTo(W,H);ctx.closePath();ctx.fillStyle=night?['#484b8e','#444477','#383e69'][layer]:['#a0c9d4','#8cb7c8','#7198ad'][layer];ctx.globalAlpha=.42+layer*.1;ctx.fill()}ctx.globalAlpha=1;ctx.restore();
  }
  function drawPlatform(p,base){const x=p.x-cameraX,y=base+p.y;if(x+p.w<-40||x>W+40)return;const color=stages[stage-1].accent;ctx.save();ctx.shadowColor='#17203d35';ctx.shadowBlur=14;ctx.shadowOffsetY=8;roundRect(x,y,p.w,28,8,'#32364e');ctx.shadowColor='transparent';ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,p.w,8,5);ctx.fill();ctx.fillStyle='#ffffff35';ctx.fillRect(x+12,y+13,Math.max(0,p.w-24),2);ctx.fillStyle='#161a2c55';for(let d=20;d<p.w-12;d+=34){ctx.beginPath();ctx.arc(x+d,y+21,2,0,Math.PI*2);ctx.fill()}if(p.type==='start'){ctx.fillStyle='#fff9';ctx.font='9px DM Mono, monospace';ctx.fillText('START',x+18,y-9)}if(p.type==='finish'){ctx.fillStyle='#fff9';ctx.font='9px DM Mono, monospace';ctx.fillText('SUMMIT',x+18,y-9)}ctx.restore()}
  function drawCoin(c,base){if(collected.has(c.id))return;const x=c.x-cameraX,y=base+c.y+Math.sin(sceneTime*3+c.phase)*4;if(x<-30||x>W+30)return;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(sceneTime*2+c.phase)*.18);ctx.shadowColor='#ffd45caa';ctx.shadowBlur=15;ctx.fillStyle='#ffcf56';ctx.beginPath();ctx.ellipse(0,0,8,11,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#fff1af';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,4,7,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
  function drawHazard(h,base){const x=h.x-cameraX,y=base+h.y;if(x<-40||x>W+40)return;ctx.save();ctx.shadowColor='#fa657a88';ctx.shadowBlur=9;ctx.fillStyle='#fb7185';ctx.beginPath();ctx.moveTo(x,y+h.h);ctx.lineTo(x+h.w*.5,y);ctx.lineTo(x+h.w,y+h.h);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#fff6';ctx.beginPath();ctx.moveTo(x+h.w*.5,y+5);ctx.lineTo(x+h.w*.67,y+h.h-4);ctx.lineTo(x+h.w*.5,y+h.h-4);ctx.fill();ctx.restore()}
  function drawGoal(base){const gx=worldEnd-180-cameraX,gy=base-100;if(gx<-100||gx>W+100)return;ctx.save();ctx.shadowColor=stages[stage-1].accent;ctx.shadowBlur=22;ctx.strokeStyle=stages[stage-1].accent;ctx.lineWidth=7;ctx.beginPath();ctx.roundRect(gx,gy,62,100,28);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#fff9';ctx.font='10px DM Mono, monospace';ctx.textAlign='center';ctx.fillText('GO!',gx+31,gy-10);ctx.textAlign='left';ctx.restore()}
  function drawPlayer(base){const x=player.x-cameraX,y=base+player.y;ctx.save();ctx.translate(x+player.w/2,y+player.h/2);if(player.face<0)ctx.scale(-1,1);const bob=player.grounded?Math.sin(sceneTime*12)*1.2:0;ctx.translate(0,bob);ctx.shadowColor='#5c58b977';ctx.shadowBlur=18;const body=ctx.createLinearGradient(-14,-18,14,22);body.addColorStop(0,'#9b8cff');body.addColorStop(1,'#6c63d9');roundRect(-15,-22,30,42,11,body);ctx.shadowBlur=0;roundRect(-10,-29,20,19,8,'#ffe0bd');ctx.fillStyle='#292742';ctx.beginPath();ctx.arc(-3,-21,1.5,0,Math.PI*2);ctx.arc(5,-21,1.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d3fb64';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-10,14);ctx.lineTo(-8,21);ctx.moveTo(9,14);ctx.lineTo(11,21);ctx.stroke();ctx.fillStyle='#d3fb64';ctx.beginPath();ctx.arc(0,-29,4,0,Math.PI*2);ctx.fill();ctx.restore()}
  function drawCheckpoint(base){const marker=worldEnd*.52,x=marker-cameraX;if(x<-30||x>W+30)return;const plat=platforms.filter(p=>p.x<=marker).at(-1)||platforms[0];const y=base+plat.y;ctx.fillStyle=checkpointReached?'#d3fb64':'#ffffff77';ctx.fillRect(x,y-48,3,48);ctx.fillStyle=checkpointReached?'#d3fb64':'#fff';ctx.beginPath();ctx.moveTo(x+3,y-47);ctx.lineTo(x+23,y-40);ctx.lineTo(x+3,y-33);ctx.closePath();ctx.fill();if(!checkpointReached){ctx.fillStyle='#fff9';ctx.font='8px DM Mono, monospace';ctx.fillText('CHECKPOINT',x-24,y-55)}}
  function draw(){const base=H*.76,conf=stages[stage-1];drawBackground(base,conf);ctx.save();ctx.fillStyle='#272940';ctx.globalAlpha=.12;ctx.fillRect(0,base+8,W,H-base);ctx.restore();for(const p of platforms)drawPlatform(p,base);drawCheckpoint(base);drawGoal(base);for(const h of hazards)drawHazard(h,base);for(const c of coins)drawCoin(c,base);drawPlayer(base);for(const p of particles){ctx.globalAlpha=Math.max(0,p.life*1.6);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x-cameraX,base+p.y,3,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}

  function update(dt){sceneTime+=dt;if(paused)return;
    if(!stageWon){
      for(const m of moving)m.platform.y=m.originY+Math.sin(sceneTime*1.6+m.phase)*m.amp;
      const direction=(keys.right?1:0)-(keys.left?1:0);if(direction){player.vx=direction*310;player.face=direction}else player.vx*=Math.pow(.001,dt);player.x+=player.vx*dt;
      if(player.x<0){player.x=0;player.vx=0}
      const oldFeet=player.y+player.h;player.vy+=1680*dt;player.y+=player.vy*dt;player.grounded=false;
      for(const p of platforms){if(player.x+player.w>p.x+3&&player.x<p.x+p.w-3&&player.vy>=0&&oldFeet<=p.y+8&&player.y+player.h>=p.y){player.y=p.y-player.h;player.vy=0;player.grounded=true;player.jumps=0;break}}
      if(player.y>H*.8){die()}
      for(const h of hazards){if(player.x+player.w-5>h.x&&player.x+5<h.x+h.w&&player.y+player.h-5>h.y&&player.y+5<h.y+h.h)die()}
      if(data.magnet>0){data.magnet=Math.max(0,data.magnet-dt);if(Math.floor(data.magnet)!==Math.floor(data.magnet+dt))updateStats()}
      for(const c of coins){if(collected.has(c.id))continue;const dx=player.x+player.w/2-c.x,dy=player.y+player.h/2-c.y,range=data.magnet>0?105:25;if(dx*dx+dy*dy<range*range)collect(c)}
      const marker=worldEnd*.52;if(!checkpointReached&&player.x+player.w>marker&&player.grounded){const p=platforms.filter(q=>q.x<=marker).at(-1)||platforms[0];checkpoint={x:Math.max(p.x+8,Math.min(marker-35,p.x+p.w-player.w-8)),y:p.y};checkpointReached=true;say('Checkpoint reached! Your progress is safe.');burst(marker,checkpoint.y,'#d3fb64',13)}
      const goal=platforms[platforms.length-1];if(player.x+player.w>goal.x+25&&player.grounded)winStage();
      cameraX=Math.max(0,Math.min(worldEnd-W*.78,player.x-W*.36));updateProgress();
    }
    particles=particles.filter(p=>p.life>0);for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=350*dt;p.life-=dt}
  }
  function loop(now){const dt=Math.min(.033,(now-lastTime)/1000||0);lastTime=now;update(dt);draw();requestAnimationFrame(loop)}
  document.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if([' ','arrowleft','arrowright','arrowup'].includes(key))e.preventDefault();if(key==='b'){if(shopModal.classList.contains('open'))closeShop();else openShop();return}if(key==='escape'&&shopModal.classList.contains('open')){closeShop();return}if([' ','arrowup','w'].includes(key)&&!e.repeat){jump();return}if(key==='arrowleft'||key==='a')keys.left=true;if(key==='arrowright'||key==='d')keys.right=true});
  document.addEventListener('keyup',e=>{const key=e.key.toLowerCase();if(key==='arrowleft'||key==='a')keys.left=false;if(key==='arrowright'||key==='d')keys.right=false});
  document.querySelectorAll('[data-control]').forEach(button=>{const control=button.dataset.control;button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);if(control==='jump')jump();else keys[control]=true});const stop=()=>{if(control!=='jump')keys[control]=false};button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',stop);button.addEventListener('lostpointercapture',stop)});
  window.addEventListener('blur',()=>{keys={}});
  document.querySelector('#tipText').textContent='Collect every coin — they add up fast.';
  updateStats();buildStage(Math.min(data.unlocked,8));requestAnimationFrame(loop);
})();
