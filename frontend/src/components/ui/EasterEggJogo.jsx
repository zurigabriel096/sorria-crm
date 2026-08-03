import { Modal } from "./Modal";

// Jogo temático (estilo Dino do Chrome, dente x germe) — HTML autocontido,
// renderizado num iframe isolado pra não misturar o canvas/loop dele com o
// React da aplicação. Repassado pelo Samuel, sem alteração de lógica.
const JOGO_HTML = `
<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>OrthoDontic Run</title>
<style>
  html,body{margin:0;height:100%;background:#eaf4fb;font-family:'Courier New',monospace}
  #ortho-wrap{display:flex;align-items:center;justify-content:center;height:100%}
  #ortho-stage{position:relative;display:inline-block;max-width:100%}
  #ortho-canvas{image-rendering:pixelated;touch-action:none;max-width:100%;display:block;cursor:pointer}
  #ortho-badge{
    position:absolute;right:6px;bottom:6px;
    background:rgba(10,61,98,.85);color:#dff3fa;
    font:9px 'Courier New',monospace;letter-spacing:.2px;
    padding:3px 8px;border-radius:10px;cursor:pointer;user-select:none;
    transition:transform .1s, background .2s;
  }
  #ortho-badge:active{transform:scale(0.94)}
</style>
</head>
<body>
<div id="ortho-wrap">
  <div id="ortho-stage">
    <canvas id="ortho-canvas" width="600" height="150"></canvas>
    <div id="ortho-badge">Sorr.ia · dados salvos no servidor</div>
  </div>
</div>

<script>
(function(){
  "use strict";

  /* ====== CORES DA MARCA — ajuste aqui ====== */
  var BRAND = {
    primary: '#0a3d62',   // azul marinho OrthoDontic
    accent : '#00a8cc',   // ciano
    danger : '#e55039',   // coral (vilões / germes)
    bgDay  : '#eaf4fb',    // fundo dia
    bgNight: '#0a2233'     // fundo noite
  };
  /* ========================================== */

  var cv = document.getElementById('ortho-canvas');
  var ctx = cv.getContext('2d');
  var W = cv.width, H = cv.height, GROUND = H - 20;

  var speed, baseSpeed, score, hi, obstacles, clouds, frames, state, night;
  try { hi = parseInt(localStorage.getItem('orthoDinoHi')) || 0; } catch(e){ hi = 0; }

  // ---- easter egg: 10 cliques no selo "dados salvos no servidor" ----
  var badge = document.getElementById('ortho-badge');
  var badgeClicks = 0, confetti = [], eggActive = false;
  var CONFETTI_COLORS = [BRAND.primary, BRAND.accent, BRAND.danger, '#f6b93b'];

  badge.addEventListener('pointerdown', function(e){
    e.preventDefault(); e.stopPropagation();
    if(eggActive) return;
    badgeClicks++;
    if(badgeClicks >= 10){
      badgeClicks = 0;
      triggerEasterEgg();
    }
  });

  function triggerEasterEgg(){
    eggActive = true;
    badge.textContent = 'conectando ao Sorr.ia CRM...';
    confetti = [];
    for(var i=0;i<60;i++){
      confetti.push({
        x: Math.random()*W, y: -10-Math.random()*40,
        vy: 2+Math.random()*3, vx: -1+Math.random()*2,
        size: 3+Math.random()*3,
        color: CONFETTI_COLORS[Math.floor(Math.random()*CONFETTI_COLORS.length)]
      });
    }
    setTimeout(function(){
      var pw = 480, ph = 720;
      var left = Math.round((window.screen.width - pw)/2);
      var top = Math.round((window.screen.height - ph)/2);
      window.open(
        'https://sorriacrm.vercel.app/',
        'sorriaCrmPopup',
        'width='+pw+',height='+ph+',left='+left+',top='+top+',noopener'
      );
      eggActive = false;
      badge.textContent = 'Sorr.ia · dados salvos no servidor';
      confetti = [];
    }, 1500);
  }

  var dino = { x:30, y:GROUND, w:26, h:28, vy:0, duck:false, run:0 };
  var GRAV = 0.6, JUMP = -10;

  function reset(){
    speed = baseSpeed = 5;
    score = 0; frames = 0; night = false;
    obstacles = []; clouds = [{x:400,y:30},{x:550,y:50}];
    dino.y = GROUND; dino.vy = 0; dino.duck = false;
    state = 'ready';
  }

  // ---- input ----
  function jump(){
    if(state === 'over'){ reset(); state='run'; return; }
    if(state === 'ready') state = 'run';
    if(dino.y >= GROUND){ dino.vy = JUMP; }
  }
  function duck(on){ if(state==='run') dino.duck = on; }

  document.addEventListener('keydown', function(e){
    if(e.code==='Space'||e.code==='ArrowUp'){ e.preventDefault(); jump(); }
    if(e.code==='ArrowDown'){ e.preventDefault(); duck(true); }
  });
  document.addEventListener('keyup', function(e){
    if(e.code==='ArrowDown') duck(false);
  });
  cv.addEventListener('pointerdown', function(e){ e.preventDefault(); try{window.focus();}catch(_){} jump(); });

  // ---- spawn ----
  function spawn(){
    var r = Math.random();
    if(score > 300 && r < 0.25){
      var hs = [GROUND-40, GROUND-24, GROUND-14];
      obstacles.push({x:W, y:hs[Math.floor(Math.random()*3)], w:22, h:16, fly:true, flap:0});
    } else {
      var n = 1 + Math.floor(Math.random()*3);
      obstacles.push({x:W, y:GROUND, w:18*n, h:22, units:n, fly:false});
    }
  }

  function hit(a,b){
    var pad = 5;
    return a.x+pad < b.x+b.w && a.x+a.w-pad > b.x &&
           a.y-a.h+pad < b.y && a.y > b.y-b.h+pad;
  }

  function update(){
    frames++;

    if(eggActive){
      for(var e=0;e<confetti.length;e++){
        var p = confetti[e];
        p.x += p.vx; p.y += p.vy;
        if(p.y > H) p.y = -10;
      }
    }

    if(state !== 'run') return;

    score += 0.15 * (speed/5);
    speed = baseSpeed + score/300;

    dino.vy += GRAV; dino.y += dino.vy;
    if(dino.y > GROUND){ dino.y = GROUND; dino.vy = 0; }
    dino.run = Math.floor(frames/5)%2;

    var last = obstacles[obstacles.length-1];
    if(!last || last.x < W - (150 + Math.random()*200)) spawn();

    for(var i=obstacles.length-1;i>=0;i--){
      var o = obstacles[i];
      o.x -= speed;
      if(o.fly) o.flap = Math.floor(frames/8)%2;
      if(o.x + o.w < 0){ obstacles.splice(i,1); continue; }
      var box = { x:dino.x, y:dino.y, w:dino.duck?30:dino.w, h:dino.duck?16:dino.h };
      if(hit(box,o)){ gameOver(); }
    }

    for(var c=0;c<clouds.length;c++){
      clouds[c].x -= speed*0.3;
      if(clouds[c].x < -50){ clouds[c].x = W+Math.random()*100; clouds[c].y = 20+Math.random()*40; }
    }

    night = Math.floor(score/700)%2 === 1;
  }

  function gameOver(){
    state = 'over';
    if(score > hi){ hi = Math.floor(score); try{ localStorage.setItem('orthoDinoHi',hi);}catch(e){} }
  }

  // ---- desenho ----
  function drawTooth(){
    var x = dino.x, yb = dino.y;
    var out  = night ? '#8fd3e8' : BRAND.primary;
    var body = night ? '#dff3fa' : '#ffffff';

    if(dino.duck){
      ctx.fillStyle = out;  ctx.fillRect(x-2, yb-16, 34, 16);
      ctx.fillStyle = body; ctx.fillRect(x,   yb-14, 30, 12);
      ctx.fillStyle = out;
      ctx.fillRect(x+20, yb-11, 2,2); ctx.fillRect(x+25, yb-11, 2,2); // olhos
      ctx.fillRect(x+20, yb-6, 8,2);                                   // sorriso
      ctx.fillRect(x+5, yb, 5,3); ctx.fillRect(x+18, yb, 5,3);         // raízes
      return;
    }

    // contorno
    ctx.fillStyle = out;
    ctx.fillRect(x,   yb-28, 26, 16);
    ctx.fillRect(x+2, yb-14, 22, 8);
    // corpo
    ctx.fillStyle = body;
    ctx.fillRect(x+2, yb-26, 22, 13);
    ctx.fillRect(x+4, yb-14, 18, 6);
    // raízes/pernas animadas
    ctx.fillStyle = out;
    if(dino.run){ ctx.fillRect(x+4,yb-8,7,8);  ctx.fillRect(x+15,yb-6,7,6); }
    else        { ctx.fillRect(x+4,yb-6,7,6);  ctx.fillRect(x+15,yb-8,7,8); }
    // rosto
    ctx.fillStyle = out;
    ctx.fillRect(x+8, yb-22, 3,3); ctx.fillRect(x+16, yb-22, 3,3);     // olhos
    ctx.fillRect(x+9, yb-16, 9,2);                                     // sorriso
    ctx.fillRect(x+8, yb-17, 2,2); ctx.fillRect(x+17, yb-17, 2,2);     // cantos do sorriso
  }

  function drawGerm(x, top, h){
    ctx.fillStyle = BRAND.danger;
    ctx.fillRect(x+3, top+3, 12, h-3);              // corpo
    // espinhos
    ctx.fillRect(x,    top+7, 3,3); ctx.fillRect(x+15, top+7, 3,3);
    ctx.fillRect(x+6,  top,   3,3);
    ctx.fillRect(x+3,  top+h-3, 3,3); ctx.fillRect(x+12, top+h-3, 3,3);
    // olhinhos brabos
    ctx.fillStyle = '#fff';
    ctx.fillRect(x+5, top+7, 3,3); ctx.fillRect(x+10, top+7, 3,3);
    ctx.fillStyle = BRAND.primary;
    ctx.fillRect(x+6, top+9, 1,1); ctx.fillRect(x+11, top+9, 1,1);
  }

  function drawObstacle(o){
    if(o.fly){
      // germe voador com "asas"
      var up = o.flap;
      ctx.fillStyle = BRAND.accent;
      ctx.fillRect(o.x+4, o.y-12, 14, 12);          // corpo
      ctx.fillStyle = '#fff';
      ctx.fillRect(o.x+7, o.y-9, 3,3); ctx.fillRect(o.x+12, o.y-9, 3,3);
      ctx.fillStyle = BRAND.accent;
      if(up){ ctx.fillRect(o.x, o.y-18, 8,6); ctx.fillRect(o.x+14, o.y-18, 8,6); }
      else  { ctx.fillRect(o.x, o.y-2, 8,6);  ctx.fillRect(o.x+14, o.y-2, 8,6); }
    } else {
      for(var k=0;k<o.units;k++){
        drawGerm(o.x + k*18, o.y-22, 22);
      }
    }
  }

  function drawScore(){
    ctx.fillStyle = night ? '#dff3fa' : BRAND.primary;
    ctx.font = '14px "Courier New",monospace';
    ctx.textAlign = 'right';
    function pad(v){ v=Math.floor(v).toString(); while(v.length<5)v='0'+v; return v; }
    var txt = (hi>0 ? 'HI '+pad(hi)+'  ' : '') + pad(score);
    ctx.fillText(txt, W-10, 20);
    ctx.textAlign = 'left';
  }

  function drawLogo(){
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px "Courier New",monospace';
    ctx.fillStyle = night ? '#8fd3e8' : BRAND.primary;
    ctx.fillText('Ortho', 10, 20);
    ctx.fillStyle = BRAND.accent;
    ctx.fillText('Dontic', 10 + ctx.measureText('Ortho').width, 20);
  }

  function draw(){
    ctx.fillStyle = night ? BRAND.bgNight : BRAND.bgDay;
    ctx.fillRect(0,0,W,H);

    // nuvens
    ctx.fillStyle = night ? '#1c3e52' : '#cfe6f5';
    for(var c=0;c<clouds.length;c++){
      var cl=clouds[c]; ctx.fillRect(cl.x,cl.y,18,5); ctx.fillRect(cl.x+4,cl.y-4,10,4);
    }
    // lua / sol
    if(night){ ctx.fillStyle='#dff3fa'; ctx.fillRect(W-90,25,10,10); ctx.fillStyle=BRAND.bgNight; ctx.fillRect(W-86,25,4,10); }
    else { ctx.fillStyle=BRAND.accent; ctx.fillRect(W-88,26,8,8); }

    // chão
    ctx.fillStyle = night ? '#2a5a72' : BRAND.primary;
    ctx.fillRect(0,GROUND,W,2);
    for(var g=0; g<W; g+=33){
      var gx = (g - (frames*speed)%33);
      ctx.fillRect(gx, GROUND+6, 3, 2);
      ctx.fillRect(gx+15, GROUND+10, 2, 2);
    }

    obstacles.forEach(drawObstacle);
    drawTooth();
    drawLogo();
    drawScore();

    if(eggActive){
      for(var e=0;e<confetti.length;e++){
        var p = confetti[e];
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.fillStyle = night?'#dff3fa':BRAND.primary;
      ctx.font='bold 13px "Courier New",monospace'; ctx.textAlign='center';
      ctx.fillText('você achou o easter egg! 🎉', W/2, H/2);
      ctx.textAlign='left';
    }

    if(state==='ready'){
      ctx.fillStyle = night?'#dff3fa':BRAND.primary;
      ctx.font='13px "Courier New",monospace'; ctx.textAlign='center';
      ctx.fillText('ESPAÇO / TOQUE pra pular  •  ↓ agacha', W/2, H/2-2);
      ctx.font='11px "Courier New",monospace';
      ctx.fillText('desvie dos germes e proteja o sorriso!', W/2, H/2+14);
      ctx.textAlign='left';
    }
    if(state==='over'){
      ctx.fillStyle = night?'#dff3fa':BRAND.primary;
      ctx.font='bold 16px "Courier New",monospace'; ctx.textAlign='center';
      ctx.fillText('O SORRISO CAIU :(', W/2, H/2-6);
      ctx.font='12px "Courier New",monospace';
      ctx.fillText('espaço / toque pra recomeçar', W/2, H/2+14);
      ctx.textAlign='left';
    }
  }

  function loop(){ update(); draw(); requestAnimationFrame(loop); }
  reset(); loop();
})();
</script>
</body>
</html>
`;

export function EasterEggJogo({ onClose }) {
  return (
    <Modal title="🦷 Você encontrou o easter egg!" onClose={onClose} wide>
      <iframe
        title="OrthoDontic Run"
        srcDoc={JOGO_HTML}
        style={{ width: "100%", height: 190, border: "none", borderRadius: 12, display: "block" }}
      />
    </Modal>
  );
}
