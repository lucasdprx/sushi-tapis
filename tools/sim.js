// Joueurs automatiques pour régler la difficulté. Coller dans la console de la page du jeu, puis :
//   R('random', 1, 10)  -> '0/10'          (parties gagnées au niveau 1 sur 10)
//   R('smart', 1, 10)   -> '8/10 ~208s'    (et durée moyenne des victoires)
// spam   : vide les colonnes une par une
// random : tape une colonne au hasard
// smart  : envoie ce que les clients assis attendent, sait attendre, sinon creuse ce qui servira bientôt
// Un tap toutes les 0,6 s de jeu.
(() => {
  const loop = policy => {
    let t = 0, cd = 0; const dt = 0.05;
    while (!state.over && t < 1200){
      cd -= dt;
      if (cd <= 0){
        cd = 0.6;
        if (state.belt.length + state.pending.length < CAPACITY){
          const p = policy();
          if (p >= 0){ const tt = state.cols[p].shift(); state.pending.push({t:tt, x:0, y:0}); }
        }
      }
      update(dt); updateFx(dt); t += dt;
    }
    return (state.over || 'T')[0] + Math.round(t);
  };
  const spam = () => state.cols.findIndex(c => c.length);
  const random = () => {
    const ne = state.cols.map((c,i) => c.length ? i : -1).filter(i => i >= 0);
    return ne.length ? ne[Math.floor(Math.random()*ne.length)] : -1;
  };
  const smart = () => {
    const want = new Map();
    state.seats.forEach(c => { if (c && c.got < c.n) want.set(c.t, (want.get(c.t)||0) + c.n - c.got); });
    const on = new Map();
    [...state.belt, ...state.pending].forEach(i => on.set(i.t, (on.get(i.t)||0) + 1));
    const need = x => (want.get(x)||0) - (on.get(x)||0);
    const run = c => { let k = 0; while (k < c.length && c[k] === c[0]) k++; return k; };
    let best = -1, bs = -1;
    state.cols.forEach((c,i) => {
      if (!c.length) return;
      const n = need(c[0]);
      if (n > 0){ const sc = Math.min(n, run(c))*10 - (run(c) > n ? 5 : 0); if (sc > bs){ bs = sc; best = i; } }
    });
    if (best >= 0) return best;
    const useful = [...state.belt, ...state.pending].some(i => (want.get(i.t)||0) > 0);
    const room = CAPACITY - state.belt.length - state.pending.length;
    if (useful && room <= 10) return -1;
    const rank = x => { const i = state.queue.findIndex(q => q.t === x); return i < 0 ? 99 : i; };
    let b = -1, s = 1e9;
    state.cols.forEach((c,i) => { if (!c.length) return; const sc = rank(c[0])*3 + run(c); if (sc < s){ s = sc; b = i; } });
    return b;
  };
  const BOT = {spam, random, smart};
  window.R = (name, L, n=10) => {
    let w = 0, ts = [];
    for (let i=0;i<n;i++){ newLevel(L); const r = loop(BOT[name]); if (r[0]==='w'){ w++; ts.push(+r.slice(1)); } }
    newLevel(level);
    return `${w}/${n}` + (ts.length ? ` ~${Math.round(ts.reduce((a,b)=>a+b,0)/ts.length)}s` : '');
  };
})();
