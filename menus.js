// Écrans autour du jeu : titre, carte des restaurants, boutique, fin de niveau, sauvegarde, pièces, musique.
// Choix faits sur maquettes (maquettes/ecrans-jeu) : carte M2, pièces P1, fin F2, boutique B1, restaurants R2.
// Partage les variables globales de index.html (state, newLevel, ctx, W, H, drawSprite, IMG…).

// ---------- sauvegarde (navigateur) ----------
const SAVE_KEY = 'sushi-tapis-v1';
const SAVE = Object.assign({
  level: 1,            // plus haut niveau débloqué
  stars: {},           // meilleures étoiles par niveau
  coins: 0,
  inv: [0, 0, 0, 0],   // bonus achetés : annuler, mélanger, renvoyer, tapis +4
  owned: {},           // déco achetée
  deco: {},            // déco utilisée
  seen: false,         // écran titre déjà vu
  sound: true,
}, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'));
SAVE.inv = [0,1,2,3].map(i => SAVE.inv[i] || 0);
function saveGame(){ localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); }

// ---------- restaurants (R2 : tour du monde) ----------
const RESTOS = [
  {name: 'Sushi'},
  {name: 'Pizzeria'},
  {name: 'Pâtisserie'},
  {name: 'Tacos'},
  {name: 'Burger'},
];
const PER_RESTO = 10;
let RESTO = 0;
const restoOf = n => Math.min(RESTOS.length-1, Math.floor((n-1) / PER_RESTO));
for (let k=1;k<RESTOS.length;k++){
  for (let t=0;t<TYPES.length;t++) loadImg(`r${k}f${t}`, `assets/r${k}/food${t}.png`);
  loadImg(`r${k}bg`, `assets/r${k}/bg.png`);
}
// aliment du restaurant en cours (les sushis tant que ses images ne sont pas là)
function foodKey(t){ const k = `r${RESTO}f${t}`; return RESTO && IMG[k] ? k : 'sushi'+t; }

// ---------- déco ----------
const DECO = [
  {id:'bg',     name:'Lanternes dorées', price:400, img:'bg_gold'},
  {id:'chef',   name:'Tenue du chef',    price:250, img:'chef_red'},
  {id:'belt',   name:'Tapis bois',       price:600, img:'belt_wood'},
  {id:'column', name:'Colonnes laquées', price:300, img:'column_red'},
];
DECO.forEach(d => loadImg(d.img, `assets/${d.img}.png`));
const BASE = {bg:'bg', chef:'chef', belt:'belt', column:'column'};
function decoKey(id){
  const d = DECO.find(d => d.id === id);
  if (d && SAVE.deco[id] && IMG[d.img]) return d.img;
  if (id === 'bg' && RESTO && IMG[`r${RESTO}bg`]) return `r${RESTO}bg`;
  return BASE[id];
}

// ---------- boutique : bonus ----------
const SHOP_BONUS = [
  {name:'Annuler ×3',     price:60,  inv:0, n:3, icon:'undo'},
  {name:'Mélanger ×3',    price:90,  inv:1, n:3, icon:'shuffle'},
  {name:'Renvoyer ×3',    price:120, inv:2, n:3, icon:'return'},
  {name:'Tapis +4 places', price:200, inv:3, n:1, icon:'belt'},
];

// ---------- état des écrans ----------
// T1 : l'écran titre à chaque ouverture
const MENU = {scene: 'title', t: 0, scroll: 0, open: 0, tab: 'bonus', end: null, shake: 0, drag: null};
MENU.open = restoOf(SAVE.level);

function startLevel(n){
  level = n; RESTO = restoOf(n);
  newLevel(n);
  if (SAVE.inv[3] > 0){ SAVE.inv[3]--; saveGame(); CAPACITY += 4; SPACING = PERIM / CAPACITY; state.bigBelt = true; }
  layersDirty = true;
  MENU.scene = 'game';
  music.start();
}

// ---------- pièces (P1 : une par client servi) ----------
const HUD_COIN = {x: 362, y: 22};
function onServed(q){
  state.fx.push({kind:'coin', x:q.x, y:q.y-20, sx:q.x, sy:q.y-20, vx:0, vy:0, k:0, life:1, max:1, r:0, col:'rgba(0,0,0,0)'});
}
// les pièces volent vers le compteur, puis comptent
const _updateFx = updateFx;
updateFx = function(dt){
  state.fx.forEach(f => {
    if (f.kind !== 'coin') return;
    f.k += dt*1.6; f.life = 1; f.vx = 0; f.vy = 0;
    const e = f.k*f.k;
    f.x = f.sx + (HUD_COIN.x - f.sx)*e; f.y = f.sy + (HUD_COIN.y - f.sy)*e - Math.sin(Math.PI*f.k)*60;
    if (f.k >= 1){ f.life = 0; state.coins++; SAVE.coins++; MENU.coinPulse = 1; }
  });
  _updateFx(dt);
  MENU.coinPulse = Math.max(0, (MENU.coinPulse||0) - dt*4);
};
const _drawFx = drawFx;
drawFx = function(){
  _drawFx();
  state.fx.forEach(f => { if (f.kind === 'coin') drawCoin(f.x, f.y, 9); });
};
function drawCoin(x, y, r){
  const g = ctx.createRadialGradient(x-r*0.3, y-r*0.3, 1, x, y, r);
  g.addColorStop(0, '#fff3a0'); g.addColorStop(0.6, '#f2b81c'); g.addColorStop(1, '#b07a10');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#8a5a10'; ctx.lineWidth = Math.max(1.5, r*0.2); ctx.stroke();
}
function drawCoinsBox(x, y, n, pulse){
  const s = 1 + (pulse||0)*0.15;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(58,36,22,0.88)'; roundRect(-34, -14, 70, 28, 9); ctx.fill();
  drawCoin(-18, 0, 9);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'left';
  ctx.fillText(n, -5, 5); ctx.textAlign = 'center';
  ctx.restore();
}
function drawCoinsHud(S){ drawCoinsBox(358, 22, SAVE.coins, MENU.coinPulse); }

// ---------- étoiles (S4 : une étoile par objectif) ----------
const STAR_TIME = 300;   // secondes
function starsOf(S){
  const time = (performance.now() - S.t0) / 1000;
  return [true, !S.bonusUsed, time < STAR_TIME];
}

// ---------- fin de niveau ----------
function levelOver(){
  const S = state;
  if (S.ended) return;
  S.ended = performance.now();
  setTimeout(() => {
    const win = S.over === 'win', got = win ? starsOf(S) : [false,false,false];
    const n = got.filter(Boolean).length, bonus = n * 10;
    if (win){
      SAVE.coins += bonus;
      SAVE.stars[level] = Math.max(SAVE.stars[level]||0, n);
      SAVE.level = Math.max(SAVE.level, level + 1);
    }
    saveGame();
    MENU.end = {win, got, n, coins: S.coins + bonus, level, t: 0, time: (S.ended - S.t0)/1000, bonusUsed: S.bonusUsed||0};
    MENU.scene = 'end';
  }, 1300);
}

// ---------- dessin commun ----------
function drawButton(x, y, w, h, label, size, press){
  const yy = y + (press ? 2 : 0);
  if (!drawSprite('button', x-3, yy-3, w+6, h+8)){ ctx.fillStyle = '#ffd36a'; roundRect(x, yy, w, h, 12); ctx.fill(); }
  ctx.fillStyle = '#5a2e12'; ctx.font = `800 ${size||20}px system-ui`;
  ctx.fillText(label, x + w/2, yy + h/2 + (size||20)*0.36);
}
// étoile de jeu : pointes arrondies, contour brun épais, dégradé doré, reflet ; éteinte = creux sombre
function starPath(x, y, r){
  ctx.beginPath();
  for (let k=0;k<10;k++){ const rr = k%2 ? r*0.5 : r, a = -Math.PI/2 + k*Math.PI/5; ctx.lineTo(x+Math.cos(a)*rr, y+Math.sin(a)*rr); }
  ctx.closePath();
}
function drawStar(x, y, r, on){
  ctx.save(); ctx.lineJoin = 'round';
  const ow = Math.max(2, r*0.28);
  // ombre portée
  starPath(x, y + r*0.14, r); ctx.fillStyle = 'rgba(40,20,8,0.55)'; ctx.lineWidth = ow; ctx.strokeStyle = 'rgba(40,20,8,0.55)'; ctx.fill(); ctx.stroke();
  starPath(x, y, r);
  ctx.lineWidth = ow; ctx.strokeStyle = on ? '#6a3410' : 'rgba(40,20,8,0.75)'; ctx.stroke();
  if (on){
    const g = ctx.createLinearGradient(0, y - r, 0, y + r);
    g.addColorStop(0, '#fff6b0'); g.addColorStop(0.45, '#ffd23c'); g.addColorStop(1, '#e88a10');
    ctx.fillStyle = g; ctx.fill();
    // reflet
    ctx.save(); starPath(x, y, r); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.ellipse(x - r*0.2, y - r*0.38, r*0.42, r*0.2, -0.5, 0, 7); ctx.fill();
    ctx.restore();
  } else { ctx.fillStyle = 'rgba(60,35,15,0.6)'; ctx.fill(); }
  ctx.restore();
}
function drawTitleText(text, x, y, size){
  ctx.font = `900 ${size}px system-ui`; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#5a2e12'; ctx.lineWidth = size*0.16; ctx.strokeText(text, x, y + size*0.1);
  ctx.strokeText(text, x, y); ctx.fillStyle = '#ffd36a'; ctx.fillText(text, x, y);
}
function drawBg(dim){
  const im = IMG[decoKey('bg')];
  if (im){ const s = Math.max(W/im.width, H/im.height); ctx.drawImage(im, (W-im.width*s)/2, 0, im.width*s, im.height*s); }
  else { ctx.fillStyle = '#c4834a'; ctx.fillRect(0,0,W,H); }
  if (dim){ ctx.fillStyle = `rgba(30,18,10,${dim})`; ctx.fillRect(0,0,W,H); }
}
function drawLock(x, y){
  ctx.fillStyle = '#ffd36a'; roundRect(x-7, y-3, 14, 11, 2); ctx.fill();
  ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x, y-3, 4.5, Math.PI, 0); ctx.stroke();
}
function drawIconButton(x, y, kind){
  drawSprite('button', x-20, y-20, 40, 42);
  ctx.save(); ctx.strokeStyle = '#5a2e12'; ctx.fillStyle = '#5a2e12'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'cart'){ ctx.beginPath(); ctx.moveTo(x-11,y-8); ctx.lineTo(x-7,y-8); ctx.lineTo(x-4,y+5); ctx.lineTo(x+8,y+5); ctx.lineTo(x+10,y-4); ctx.lineTo(x-6,y-4); ctx.stroke(); ctx.beginPath(); ctx.arc(x-3,y+10,2,0,7); ctx.arc(x+7,y+10,2,0,7); ctx.fill(); }
  else if (kind === 'back'){ ctx.beginPath(); ctx.moveTo(x+4,y-9); ctx.lineTo(x-5,y); ctx.lineTo(x+4,y+9); ctx.stroke(); }
  else if (kind === 'pause'){ roundRect(x-7, y-9, 5, 18, 1.5); ctx.fill(); roundRect(x+2, y-9, 5, 18, 1.5); ctx.fill(); }
  else { // son
    ctx.beginPath(); ctx.moveTo(x-10,y-4); ctx.lineTo(x-5,y-4); ctx.lineTo(x+1,y-10); ctx.lineTo(x+1,y+10); ctx.lineTo(x-5,y+4); ctx.lineTo(x-10,y+4); ctx.closePath(); ctx.fill();
    if (SAVE.sound){ ctx.beginPath(); ctx.arc(x+2,y,6,-0.8,0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(x+2,y,11,-0.8,0.8); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(x+5,y-5); ctx.lineTo(x+12,y+5); ctx.moveTo(x+12,y-5); ctx.lineTo(x+5,y+5); ctx.stroke(); }
  }
  ctx.restore();
}

// ---------- écran titre ----------
function drawTitle(){
  drawBg(0.35);
  drawTitleText('SUSHI', W/2, 170, 64);
  drawTitleText('TAPIS', W/2, 238, 64);
  const b = Math.sin(MENU.t*2)*4;
  drawSprite('chef', W/2-110, 270+b, 220, 220);
  const s = 1 + Math.sin(MENU.t*4.5)*0.04;
  ctx.save(); ctx.translate(W/2, 590); ctx.scale(s, s); drawButton(-110, -40, 220, 80, 'JOUER', 30); ctx.restore();
}

// ---------- carte des restaurants (M2) ----------
const CARD_H = 150, GRID_ROW = 84, MAP_TOP = 64;
function mapLayout(){
  const items = []; let y = MAP_TOP - MENU.scroll;
  RESTOS.forEach((r, k) => {
    items.push({kind:'card', k, y, h:CARD_H}); y += CARD_H + 14;
    if (MENU.open === k && unlockedResto(k)){
      for (let i=0;i<PER_RESTO;i++){
        const n = k*PER_RESTO + i + 1, row = Math.floor(i/4), col = i%4;
        items.push({kind:'node', n, x: 62 + col*92, y: y + 36 + row*GRID_ROW});
      }
      y += Math.ceil(PER_RESTO/4)*GRID_ROW + 14;
    }
  });
  return {items, height: y + MENU.scroll - MAP_TOP + 20};
}
const unlockedResto = k => SAVE.level > k*PER_RESTO;
function restoStars(k){ let n = 0; for (let i=1;i<=PER_RESTO;i++) n += SAVE.stars[k*PER_RESTO+i] || 0; return n; }
function drawMap(){
  ctx.fillStyle = '#7a4a28'; ctx.fillRect(0,0,W,H);
  const L = mapLayout();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 50, W, H-50); ctx.clip();
  L.items.forEach(it => {
    if (it.kind === 'card'){
      const open = unlockedResto(it.k), x = 16, w = W-32;
      ctx.save(); roundRect(x, it.y, w, it.h, 16); ctx.clip();
      const im = IMG[it.k ? `r${it.k}bg` : 'bg'] || IMG.bg;
      if (im){ const s = w/im.width; ctx.filter = open ? 'none' : 'grayscale(1) brightness(0.5)'; ctx.drawImage(im, 0, im.height*0.18, im.width, it.h/s, x, it.y, w, it.h); ctx.filter = 'none'; }
      if (!IMG[`r${it.k}bg`] && it.k){ ctx.fillStyle = ['','rgba(200,60,40,0.35)','rgba(230,120,180,0.35)','rgba(80,160,60,0.35)','rgba(200,40,50,0.35)'][it.k]; ctx.fillRect(x, it.y, w, it.h); }
      const g = ctx.createLinearGradient(0, it.y+it.h-60, 0, it.y+it.h); g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,0.6)');
      ctx.fillStyle = g; ctx.fillRect(x, it.y, w, it.h);
      ctx.restore();
      ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 4; roundRect(x, it.y, w, it.h, 16); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '900 24px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(RESTOS[it.k].name, x+14, it.y+it.h-14);
      ctx.textAlign = 'right'; ctx.font = '800 16px system-ui';
      if (open){ ctx.fillText(`${restoStars(it.k)} / ${PER_RESTO*3}`, x+w-14, it.y+it.h-15); drawStar(x+w-14-ctx.measureText(`${restoStars(it.k)} / ${PER_RESTO*3}`).width-13, it.y+it.h-21, 9, true); }
      else { ctx.fillText(`Niveau ${it.k*PER_RESTO+1}`, x+w-14, it.y+it.h-15); drawLock(x+w-14-ctx.measureText(`Niveau ${it.k*PER_RESTO+1}`).width-14, it.y+it.h-20); }
      ctx.textAlign = 'center';
    } else {
      const lock = it.n > SAVE.level, cur = it.n === SAVE.level;
      const r = cur ? 33 + Math.sin(MENU.t*4)*2 : 29;
      ctx.fillStyle = '#3a2416'; ctx.beginPath(); ctx.arc(it.x, it.y+4, r, 0, 7); ctx.fill();
      if (lock) ctx.fillStyle = '#8a7a6a';
      else { const g = ctx.createRadialGradient(it.x-r*0.3, it.y-r*0.35, 2, it.x, it.y, r); g.addColorStop(0,'#fff7c8'); g.addColorStop(0.6,'#ffd36a'); g.addColorStop(1,'#c88a20'); ctx.fillStyle = g; }
      ctx.beginPath(); ctx.arc(it.x, it.y, r, 0, 7); ctx.fill();
      ctx.strokeStyle = '#5a2e12'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = lock ? '#4a3a2a' : '#5a2e12'; ctx.font = '900 22px system-ui'; ctx.fillText(it.n, it.x, it.y+8);
      if (!lock && !cur){ const st = SAVE.stars[it.n]||0; for (let k=0;k<3;k++) drawStar(it.x-21+k*21, it.y-r-9, 10, k < st); }
    }
  });
  ctx.restore();
  // barre du haut
  ctx.fillStyle = '#7a4a28'; ctx.fillRect(0, 0, W, 50);
  ctx.fillStyle = '#fff'; ctx.font = '900 22px system-ui'; ctx.textAlign = 'left'; ctx.fillText('Restaurants', 16, 33); ctx.textAlign = 'center';
  drawIconButton(232, 26, 'sound'); drawIconButton(280, 26, 'cart');
  drawCoinsBox(358, 25, SAVE.coins);
}

// ---------- boutique (B1) ----------
function shopItems(){
  return MENU.tab === 'bonus'
    ? SHOP_BONUS.map(b => ({...b, have: SAVE.inv[b.inv]}))
    : DECO.map(d => ({...d, owned: !!SAVE.owned[d.id], on: !!SAVE.deco[d.id]}));
}
function shopRect(i){ return {x: 28 + (i%2)*176, y: 130 + Math.floor(i/2)*186, w: 168, h: 156}; }
function drawShop(){
  ctx.fillStyle = '#7a4a28'; ctx.fillRect(0,0,W,H);
  drawIconButton(36, 30, 'back');
  ctx.fillStyle = '#fff'; ctx.font = '900 24px system-ui'; ctx.textAlign = 'left'; ctx.fillText('Boutique', 66, 39); ctx.textAlign = 'center';
  drawCoinsBox(358, 30, SAVE.coins, MENU.shake);
  [['bonus','Bonus'],['deco','Déco']].forEach(([id, label], i) => {
    const x = 16 + i*186, on = MENU.tab === id;
    ctx.fillStyle = on ? '#a8703f' : '#5a3a22'; roundRect(x, 72, 182, 40, 12); ctx.fill();
    if (on) ctx.fillRect(x, 96, 182, 16);
    ctx.fillStyle = on ? '#fff' : '#d8c0a0'; ctx.font = '800 17px system-ui'; ctx.fillText(label, x+91, 98);
  });
  ctx.fillStyle = '#a8703f'; roundRect(16, 108, W-32, H-124, 14); ctx.fill();
  shopItems().forEach((it, i) => {
    const r = shopRect(i);
    ctx.fillStyle = '#f4e3c4'; roundRect(r.x, r.y, r.w, r.h, 12); ctx.fill();
    ctx.strokeStyle = '#5a3a22'; ctx.lineWidth = 3; ctx.stroke();
    const cx = r.x + r.w/2;
    if (MENU.tab === 'bonus'){
      if (it.icon === 'belt') drawSprite(foodKey(0), cx-30, r.y+22, 60, 60);
      else { drawSprite('button', cx-28, r.y+24, 56, 58); drawBonusIcon(it.icon, cx, r.y+52); }
    } else {
      const key = it.img, im = IMG[key] ? key : BASE[it.id];
      const imo = IMG[im];
      if (imo){ const s = Math.min(90/imo.width, 70/imo.height); drawSprite(im, cx-imo.width*s/2, r.y+18+(70-imo.height*s)/2, imo.width*s, imo.height*s); }
    }
    ctx.fillStyle = '#3a2416'; ctx.font = '800 15px system-ui'; ctx.fillText(it.name, cx, r.y+112);
    if (MENU.tab === 'bonus' && it.have){ ctx.fillStyle = '#7a4a28'; ctx.font = '700 13px system-ui'; ctx.fillText(`En réserve : ${it.have}`, cx, r.y+130); }
    // étiquette du prix / état
    const ty = r.y + r.h - 12;
    if (MENU.tab === 'deco' && it.owned){
      ctx.fillStyle = it.on ? '#5a3a22' : '#a8703f'; roundRect(cx-44, ty, 88, 26, 9); ctx.fill();
      ctx.fillStyle = '#ffd36a'; ctx.font = '800 14px system-ui'; ctx.fillText(it.on ? 'Utilisé' : 'Utiliser', cx, ty+18);
    } else {
      const can = SAVE.coins >= it.price;
      ctx.fillStyle = can ? '#5cbf3a' : '#8a8a7a'; roundRect(cx-40, ty, 80, 26, 9); ctx.fill();
      ctx.strokeStyle = can ? '#2f6a1c' : '#5a5a4a'; ctx.lineWidth = 3; ctx.stroke();
      drawCoin(cx-20, ty+13, 8);
      ctx.fillStyle = '#fff'; ctx.font = '900 15px system-ui'; ctx.textAlign = 'left'; ctx.fillText(it.price, cx-8, ty+19); ctx.textAlign = 'center';
    }
  });
}
function shopTap(x, y){
  if (Math.hypot(x-36, y-30) < 24){ MENU.scene = 'map'; return; }
  if (y > 72 && y < 112){ MENU.tab = x < W/2 ? 'bonus' : 'deco'; return; }
  shopItems().forEach((it, i) => {
    const r = shopRect(i);
    if (x < r.x || x > r.x+r.w || y < r.y || y > r.y+r.h+14) return;
    if (MENU.tab === 'deco' && it.owned){ SAVE.deco[it.id] = !SAVE.deco[it.id]; saveGame(); layersDirty = true; sfx('tap'); return; }
    if (SAVE.coins < it.price){ MENU.shake = 1; sfx('bad'); return; }
    SAVE.coins -= it.price;
    if (MENU.tab === 'bonus') SAVE.inv[it.inv] += it.n;
    else { SAVE.owned[it.id] = true; SAVE.deco[it.id] = true; layersDirty = true; }
    saveGame(); sfx('bonus');
  });
}

// ---------- fin de niveau (F2) ----------
function drawEnd(dt){
  const E = MENU.end; E.t += dt;
  drawBg(0.5);
  drawTitleText(E.win ? 'BRAVO !' : 'TAPIS BOUCHÉ', W/2, 120, E.win ? 52 : 38);
  if (E.win){
    for (let k=0;k<3;k++){
      const at = 0.4 + k*0.35, p = Math.max(0, Math.min(1, (E.t-at)/0.3));
      const sc = p < 1 ? p*1.3 : 1, big = k === 1 ? 46 : 38;
      drawStar(W/2 + (k-1)*96, k === 1 ? 210 : 226, big, false);
      if (E.got[k] && p > 0){ ctx.save(); ctx.translate(W/2 + (k-1)*96, k === 1 ? 210 : 226); ctx.scale(sc, sc); drawStar(0, 0, big, true); ctx.restore(); }
      if (p >= 1 && E.got[k] && !E['s'+k]){ E['s'+k] = true; sfx('take'); }
    }
    // objectifs des étoiles
    const lines = ['Niveau gagné', 'Aucun bonus', `Moins de ${STAR_TIME/60} min`];
    ctx.font = '700 15px system-ui';
    lines.forEach((l, k) => { ctx.fillStyle = E.got[k] ? '#fff' : 'rgba(255,255,255,0.5)'; ctx.fillText((E.got[k] ? '✓ ' : '✗ ') + l, W/2, 292 + k*22); });
  }
  [0,2,3].forEach((c, i) => { const hop = E.win ? Math.abs(Math.sin(E.t*6 + i))*8 : 0; drawSprite('client'+c, 22 + i*122, 372 - hop - (i===1?14:0), 112, 112); });
  drawCoin(W/2 - 46, 538, 15);
  ctx.fillStyle = '#fff'; ctx.font = '900 34px system-ui'; ctx.textAlign = 'left'; ctx.fillText('+' + Math.min(E.coins, Math.floor(E.t*60)), W/2 - 24, 550); ctx.textAlign = 'center';
  drawButton(30, 600, 160, 66, '↻ Rejouer', 20);
  drawButton(210, 600, 160, 66, E.win ? 'Suivant' : 'Carte', 20);
}
function endTap(x, y){
  if (y < 600 || y > 670) return;
  if (x < W/2) startLevel(MENU.end.level);
  else if (MENU.end.win && MENU.end.level + 1 <= RESTOS.length*PER_RESTO) startLevel(MENU.end.level + 1);
  else MENU.scene = 'map';
}

// ---------- pause en partie : reprendre ou revenir à la carte ----------
const PAUSE_BTN = {x: 26, y: 24};
MENU.paused = false;
const _update = update;
update = function(dt){ if (!MENU.paused) _update(dt); };
const _draw = draw;
draw = function(){
  _draw();
  if (MENU.scene !== 'game' || state.over) return;
  ctx.textAlign = 'center';
  if (!MENU.paused){ drawIconButton(PAUSE_BTN.x, PAUSE_BTN.y, 'pause'); return; }
  ctx.fillStyle = 'rgba(30,18,10,0.7)'; ctx.fillRect(0, 0, W, H);
  drawTitleText('PAUSE', W/2, 250, 52);
  drawButton(90, 310, 220, 70, 'Reprendre', 24);
  drawButton(90, 400, 220, 70, 'Carte', 24);
};
function pauseTap(x, y){
  if (!MENU.paused){
    if (Math.hypot(x - PAUSE_BTN.x, y - PAUSE_BTN.y) > 24) return false;
    MENU.paused = true; MENU.pausedAt = performance.now(); sfx('tap'); return true;
  }
  if (x > 90 && x < 310 && y > 310 && y < 380){          // reprendre : le temps de pause ne compte pas pour l'étoile « vite »
    state.t0 += performance.now() - MENU.pausedAt; MENU.paused = false; sfx('tap');
  } else if (x > 90 && x < 310 && y > 400 && y < 470){   // carte : la partie est abandonnée, les pièces gagnées sont gardées
    MENU.paused = false; saveGame(); MENU.open = restoOf(level); MENU.scene = 'map'; sfx('tap');
  }
  return true;
}
// avant le clic du jeu (index.html) : pendant une partie, le bouton pause et l'écran de pause passent en premier
cv.addEventListener('pointerdown', e => {
  if (MENU.scene !== 'game' || state.over) return;
  const b = cv.getBoundingClientRect();
  const x = (e.clientX-b.left)/b.width*W, y = (e.clientY-b.top)/b.height*H;
  if (pauseTap(x, y)) e.stopImmediatePropagation();
}, true);
addEventListener('keydown', e => { if (e.key === 'Escape' && MENU.scene === 'game' && !state.over && !MENU.paused){ MENU.paused = true; MENU.pausedAt = performance.now(); } });

// ---------- routage ----------
function drawMenu(dt){
  MENU.t += dt; MENU.shake = Math.max(0, MENU.shake - dt*3);
  ctx.textAlign = 'center';
  if (MENU.scene === 'title') drawTitle();
  else if (MENU.scene === 'map') drawMap();
  else if (MENU.scene === 'shop') drawShop();
  else if (MENU.scene === 'end') drawEnd(dt);
}
function menuTap(x, y){
  music.start();
  if (MENU.scene === 'title'){ if (y > 540 && y < 640 && Math.abs(x-W/2) < 120){ SAVE.seen = true; saveGame(); MENU.scene = 'map'; sfx('tap'); } return; }
  if (MENU.scene === 'shop') return shopTap(x, y);
  if (MENU.scene === 'end') return endTap(x, y);
  if (MENU.scene === 'map'){
    if (y < 50){
      if (Math.hypot(x-232, y-26) < 22){ SAVE.sound = !SAVE.sound; saveGame(); music.apply(); return; }
      if (Math.hypot(x-280, y-26) < 22){ MENU.scene = 'shop'; return; }
      return;
    }
    for (const it of mapLayout().items){
      if (it.kind === 'card' && y > it.y && y < it.y + it.h){
        if (unlockedResto(it.k)){ MENU.open = MENU.open === it.k ? -1 : it.k; sfx('tap'); } else sfx('bad');
        return;
      }
      if (it.kind === 'node' && Math.hypot(x-it.x, y-it.y) < 32){
        if (it.n <= SAVE.level){ sfx('tap'); startLevel(it.n); } else sfx('bad');
        return;
      }
    }
  }
}
// défilement de la carte au doigt : un tap n'est compté que si le doigt n'a presque pas bougé
cv.addEventListener('pointerdown', e => { if (MENU.scene === 'map') MENU.drag = {y: e.clientY, s: MENU.scroll, moved: false}; }, true);
cv.addEventListener('pointermove', e => {
  const D = MENU.drag; if (!D || MENU.scene !== 'map') return;
  const k = W / cv.getBoundingClientRect().width, dy = (e.clientY - D.y) * k;
  if (Math.abs(dy) > 6) D.moved = true;
  if (D.moved){ const max = Math.max(0, mapLayout().height - (H - MAP_TOP)); MENU.scroll = Math.max(0, Math.min(max, D.s - dy)); }
});
addEventListener('pointerup', () => { MENU.drag = null; });
// le tap de la carte part au relâché pour ne pas lancer un niveau en faisant défiler
const _menuTap = menuTap;
menuTap = function(x, y){
  if (MENU.scene === 'map' && y >= 50){ MENU.pendingTap = {x, y}; return; }
  _menuTap(x, y);
};
cv.addEventListener('pointerup', e => {
  const P = MENU.pendingTap; MENU.pendingTap = null;
  if (P && MENU.scene === 'map' && !(MENU.drag && MENU.drag.moved)) _menuTap(P.x, P.y);
}, true);
addEventListener('wheel', e => { if (MENU.scene === 'map'){ const max = Math.max(0, mapLayout().height - (H - MAP_TOP)); MENU.scroll = Math.max(0, Math.min(max, MENU.scroll + e.deltaY*0.5)); } });

// ---------- musique d'ambiance (jouée par le jeu) ----------
const music = (() => {
  let ac = null, gain = null, timer = null, step = 0, next = 0;
  const BPM = 96, SPB = 60 / BPM / 2;              // croches
  const SCALE = [0, 2, 5, 7, 9];                     // gamme pentatonique
  const MEL = [0,2,4,2, 3,2,1,0, 1,2,4,5, 4,2,3,1, 0,2,4,7, 6,4,3,2, 1,3,2,1, 0,-1,0,-1];
  const BASS = [0,0,3,3, 4,4,2,2];
  const hz = (deg, oct) => { const n = Math.floor(deg/5), d = ((deg%5)+5)%5; return 261.63 * Math.pow(2, (SCALE[d] + 12*(n+oct)) / 12); };
  function note(f, t, d, type, v){
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t+0.02); g.gain.exponentialRampToValueAtTime(0.001, t+d);
    o.connect(g).connect(gain); o.start(t); o.stop(t+d+0.05);
  }
  function tick(){
    while (next < ac.currentTime + 0.25){
      const m = MEL[step % MEL.length];
      if (m >= 0) note(hz(m, 0), next, SPB*1.8, 'triangle', 0.5);
      if (step % 4 === 0) note(hz(BASS[(step/4) % BASS.length], -1), next, SPB*3.6, 'sine', 0.6);
      if (step % 2 === 1) note(2400, next, 0.03, 'square', 0.05);
      next += SPB; step++;
    }
  }
  return {
    start(){
      if (ac) return;
      try { ac = AC = AC || new AudioContext(); } catch(e){ return; }
      gain = ac.createGain(); gain.connect(ac.destination);
      next = ac.currentTime + 0.1; this.apply();
      timer = setInterval(tick, 100);
    },
    apply(){ if (gain) gain.gain.value = SAVE.sound ? 0.05 : 0; },
  };
})();
// les bruitages suivent aussi le bouton son
const _sfx = sfx;
sfx = function(kind){ if (SAVE.sound) _sfx(kind); };

// ---------- départ ----------
RESTO = restoOf(SAVE.level);
newLevel(Math.min(SAVE.level, RESTOS.length*PER_RESTO));
