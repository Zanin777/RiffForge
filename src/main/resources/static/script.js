/* ============================================================
   RiffForge — script.js
   Lógica da ferramenta + áudio (Tone.js) + camada de movimento.
   ============================================================ */

/* ---------- Config da API ----------
   usarBackend: false  -> modo demo (gera localmente, sem servidor)
                true   -> chama POST /api/generate no back Java
   simularErro: true   -> força uma falha para testar o feedback de erro
*/
const CONFIG = {
  endpoint: '/api/generate',
  usarBackend: false,
  timeoutMs: 8000,
  simularErro: false,
};

const $ = (id) => document.getElementById(id);
const som = $('som-forja');
const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Dados base ---------- */
const TUNINGS = {
  'Drop B':['B','F#','B','E','G#','C#'], 'Drop A':['A','E','A','D','F#','B'],
  'Drop C':['C','G','C','F','A','D'], 'Standard E':['E','A','D','G','B','E'],
};
const SUBGEN = {
  'Death Metal':   { desc: 'Tremolo implacável e blast beats. Peso bruto, sem trégua.', pat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  'Groove Metal':  { desc: 'Síncope pesada e cadência que balança a cabeça.',          pat:[1,0,0,1,1,0,1,0,1,0,0,1,1,0,1,0] },
  'Djent':         { desc: 'Poliritmia cirúrgica, palm mutes e cordas estendidas.',     pat:[1,0,0,1,0,0,1,0,1,0,0,1,0,1,0,0] },
  'Metalcore':     { desc: 'Breakdowns demolidores com melodia por cima.',              pat:[1,1,0,0,1,1,0,0,1,0,1,0,1,1,0,0] },
  'Black Metal':   { desc: 'Tremolo gélido e atmosfera. Frio como a forja apagada.',    pat:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
};
const ESTRUTURAS = {
  'Death Metal':  ['Intro','Riff A','Blast','Riff B','Breakdown','Outro'],
  'Groove Metal': ['Intro','Groove','Refrão','Ponte','Groove','Outro'],
  'Djent':        ['Intro','Verso','Poliritmia','Refrão','Breakdown','Outro'],
  'Metalcore':    ['Intro','Verso','Refrão','Verso','Breakdown','Final'],
  'Black Metal':  ['Intro','Tremolo A','Atmosfera','Tremolo B','Clímax','Outro'],
};
const FRETS = ['3','5','7','8','10'];

/* ============================================================
   GERADOR — devolve a MATRIZ do riff (cordas × slots) e renderiza ASCII
   ============================================================ */

/* Gera a matriz: grade[corda][slot] = casa (ex.: '0','7','10') ou '-' (pausa).
   cordas vão das mais graves (índice 0) para as mais agudas. */
function gerarGrade({ afinacao, subgenero, blastBeats }) {
  const cordas = TUNINGS[afinacao] || TUNINGS['Drop B'];
  const SLOTS = 16, MED = 2, total = SLOTS * MED;
  let pat = (SUBGEN[subgenero] || SUBGEN['Death Metal']).pat;
  if (blastBeats) pat = pat.map(() => 1);

  const grade = cordas.map(() => Array(total).fill('-'));
  for (let s = 0; s < total; s++) {
    const m = s % SLOTS;
    if (pat[m]) grade[0][s] = '0';                       // chug na corda grave
    if (m === 0 || m === 8) {                            // acentos no início das medidas
      const corda = 1 + Math.floor(Math.random() * 2);
      grade[corda][s] = FRETS[Math.floor(Math.random() * FRETS.length)];
    }
    if (Math.random() < 0.08) grade[1][s] = FRETS[Math.floor(Math.random() * FRETS.length)];
  }
  return { cordas, grade, slots: SLOTS, medidas: MED, total };
}

/* Renderiza a matriz como tablatura ASCII (aguda no topo, grave embaixo). */
function renderGrade({ cordas, grade, slots, medidas }) {
  const linhas = [];
  for (let c = cordas.length - 1; c >= 0; c--) {
    const rot = (cordas[c] + ' ').slice(0, 2), partes = [];
    for (let m = 0; m < medidas; m++) partes.push(grade[c].slice(m * slots, (m + 1) * slots).join(''));
    linhas.push(rot + '|' + partes.join('|') + '|');
  }
  return linhas.join('\n');
}

function gerar(p) { return renderGrade(gerarGrade(p)); }

/* ---------- Estado ---------- */
let estado = { afinacao: 'Drop B', bpm: 180, subgenero: 'Death Metal', blastBeats: false };
let ultimoResultado = null;   // última resposta (tab, estrutura, grade, audioUrl…)

function pintarNotas() {
  $('tuningNotes').innerHTML = TUNINGS[estado.afinacao].map(n => `<span class="note-pill">${n}</span>`).join('');
}
$('afinacao').addEventListener('change', e => { estado.afinacao = e.target.value; pintarNotas(); });

const bpm = $('bpm');
function pintarBpm() {
  estado.bpm = Number(bpm.value);
  $('bpmOut').textContent = bpm.value;
  if (window.Tone) Tone.Transport.bpm.value = estado.bpm;   // segue o andamento ao vivo
}
bpm.addEventListener('input', pintarBpm);

$('subgenGrid').innerHTML = Object.keys(SUBGEN).map((k, i) =>
  `<button class="subgen" data-sg="${k}" aria-pressed="${i === 0}">
     <div class="sg-name">${k.replace(' Metal','')}</div><div class="sg-desc">${SUBGEN[k].desc}</div>
   </button>`).join('');
$('subgenGrid').addEventListener('click', e => {
  const card = e.target.closest('.subgen'); if (!card) return;
  document.querySelectorAll('.subgen').forEach(c => c.setAttribute('aria-pressed', 'false'));
  card.setAttribute('aria-pressed', 'true'); estado.subgenero = card.dataset.sg;
});

const blast = $('blast');
function toggleBlast() {
  const v = blast.getAttribute('aria-checked') !== 'true';
  blast.setAttribute('aria-checked', String(v)); estado.blastBeats = v;
}
blast.addEventListener('click', toggleBlast);
blast.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleBlast(); } });

/* ---------- Toast (sucesso / erro) ---------- */
let toastTimer = null;
function toast(msg, tipo) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('erro', tipo === 'erro');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), tipo === 'erro' ? 3400 : 1800);
}

/* ---------- Payload + resposta (espelha o contrato do back Java) ---------- */
function payloadAtual() {
  return { afinacao: estado.afinacao, bpm: estado.bpm, subgenero: estado.subgenero, blastBeats: estado.blastBeats, usarIA: false };
}
function montarRespostaLocal(p) {
  const g = gerarGrade(p);
  return {
    afinacao: { nome: p.afinacao, cordas: g.cordas },
    bpm: p.bpm,
    subgenero: p.subgenero,
    blastBeats: p.blastBeats,
    estrutura: ESTRUTURAS[p.subgenero] || [],
    tab: renderGrade(g),
    grade: g.grade,    // matriz crua, para o player ler corda/casa/pausa
    audioUrl: null,    // o back pode devolver a URL de um .mp3 aqui
  };
}
const delay = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------- Chamada à API (real ou simulada) ---------- */
async function gerarRiff(payload) {
  if (CONFIG.usarBackend) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CONFIG.timeoutMs);
    try {
      const resp = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      if (!resp.ok) throw new Error('O servidor respondeu ' + resp.status);
      return await resp.json();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Tempo esgotado (timeout)');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  // --- Modo demo: simula a latência da rede e gera localmente ---
  await delay(420 + Math.random() * 360);
  if (CONFIG.simularErro) throw new Error('Falha simulada do servidor (500)');
  return montarRespostaLocal(payload);
}

/* ---------- Render do resultado ---------- */
const MSGS = ['Gerando…', 'Calculando posições…', 'Resolvendo o ritmo…'];

function renderResultado(data) {
  ultimoResultado = data;
  Player.stop();

  $('structure').innerHTML = (data.estrutura || []).map(s => `<span class="seg">${s}</span>`).join('');

  const nome = (data.afinacao && data.afinacao.nome) ? data.afinacao.nome : data.afinacao;
  $('resultMeta').innerHTML = [
    `<span class="chip">${nome}</span>`,
    `<span class="chip">${data.bpm} BPM</span>`,
    `<span class="chip hot">${data.subgenero}</span>`,
    data.blastBeats ? `<span class="chip hot">Blast</span>` : '',
  ].join('');

  const tab = $('tab');
  tab.textContent = data.tab || '';
  tab.classList.remove('stamp'); void tab.offsetWidth; tab.classList.add('stamp');
}

/* ---------- Forjar (assíncrono, com try/catch e estados de UI) ---------- */
let gerando = false;
async function forjar() {
  if (gerando) return;
  gerando = true;

  if (som) { som.currentTime = 0; som.play().catch(() => {}); }

  const btn = $('forjar');
  btn.disabled = true;
  $('output').style.display = 'none';
  $('forging').classList.add('on');
  $('forgingMsg').textContent = MSGS[Math.floor(Math.random() * MSGS.length)];

  try {
    const data = await gerarRiff(payloadAtual());
    renderResultado(data);
  } catch (err) {
    console.error('[RiffForge] falha ao gerar o riff:', err);
    toast('Não foi possível gerar o riff — ' + (err.message || 'tente novamente'), 'erro');
  } finally {
    $('forging').classList.remove('on');
    $('output').style.display = 'flex';
    btn.disabled = false;
    gerando = false;
  }
}
$('forjar').addEventListener('click', forjar);
$('btnVary').addEventListener('click', forjar);

/* ---------- Copiar / Exportar ---------- */
$('btnCopy').addEventListener('click', () => {
  navigator.clipboard.writeText($('tab').textContent)
    .then(() => toast('Tablatura copiada'))
    .catch(() => toast('Não foi possível copiar', 'erro'));
});
$('btnExport').addEventListener('click', () => {
  const tab = $('tab').textContent;
  const blob = new Blob([`RiffForge — ${estado.afinacao} · ${estado.bpm} BPM · ${estado.subgenero}\n\n` + tab], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'riff-forjado.txt'; a.click();
  toast('Riff exportado');
});

/* ============================================================
   ÁUDIO — mapeamento casa→nota + Player com Tone.js (distorção)
   ============================================================ */
const CROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

/* Nota MIDI de cada CORDA SOLTA, a partir dos nomes (graves→agudas).
   Ancora a corda mais grave numa oitava baixa (~MIDI 33–44, ex.: B1/E2) e
   sobe cada corda seguinte para o menor MIDI com aquele nome acima da anterior. */
function midiAbertoDeCordas(cordas) {
  const pcs = cordas.map(n => { const i = CROMA.indexOf((n || '').trim()); return i < 0 ? 0 : i; });
  const midis = [];
  let m = pcs[0]; while (m < 33) m += 12;           // grave mais baixa
  midis.push(m);
  for (let i = 1; i < pcs.length; i++) {
    let x = pcs[i]; while (x <= m) x += 12;          // mantém a ordem ascendente
    midis.push(x); m = x;
  }
  return midis;
}
function midiParaNota(midi) { return CROMA[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1); }

/* Lê a MATRIZ (grade[corda][slot]) e devolve a sequência tocável:
   um passo por slot; cada passo é um array de notas (vazio = pausa '-'). */
function gradeParaSequencia(grade, cordas) {
  const midis = midiAbertoDeCordas(cordas);
  const total = grade[0] ? grade[0].length : 0;
  const passos = [];
  for (let col = 0; col < total; col++) {
    const notas = [];
    for (let c = 0; c < grade.length; c++) {
      const cell = grade[c][col];
      if (cell && cell !== '-') {
        const casa = parseInt(cell, 10);
        if (!isNaN(casa)) notas.push(midiParaNota(midis[c] + casa));
      }
    }
    passos.push(notas);
  }
  return passos;
}

/* Fallback: reconstrói a sequência a partir da tab ASCII (ex.: resposta do back
   que só mandou o texto). As linhas vêm agudas→graves; reordeno para o MIDI. */
function tabParaSequencia(tab) {
  if (!tab) return [];
  const linhas = tab.split('\n');
  const pcsAgudoGrave = linhas.map(ln => ln.slice(0, 2).trim());
  const midisGraveAgudo = midiAbertoDeCordas(pcsAgudoGrave.slice().reverse());
  const midis = midisGraveAgudo.slice().reverse();          // alinha com a ordem das linhas
  const conteudo = linhas.map(ln => ln.slice(2).replace(/\|/g, ''));
  const largura = Math.max(0, ...conteudo.map(c => c.length));
  const passos = [];
  for (let col = 0; col < largura; col++) {
    const notas = [];
    for (let l = 0; l < conteudo.length; l++) {
      const ch = conteudo[l][col];
      if (ch && /\d/.test(ch)) {
        let casa = ch; const prox = conteudo[l][col + 1];
        if (prox && /\d/.test(prox)) casa += prox;          // casas de 2 dígitos (ex.: 10)
        notas.push(midiParaNota(midis[l] + parseInt(casa, 10)));
      }
    }
    passos.push(notas);
  }
  return passos;
}

const ICON_PLAY  = '<svg viewBox="0 0 24 24" fill="none"><path d="M7 5l12 7-12 7V5z" fill="currentColor" stroke="none"/></svg> Reproduzir';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="5" width="4" height="14" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" fill="currentColor" stroke="none"/></svg> Pausar';

const Player = (() => {
  let tocando = false, audioEl = null;
  let synth = null, seq = null, cadeiaPronta = false;

  /* Cadeia de áudio: PolySynth (sawtooth) -> Distortion -> Filtro -> Limiter -> saída */
  function montarCadeia() {
    if (cadeiaPronta) return;
    const dist    = new Tone.Distortion(0.8);                 // peso de metal
    const filtro  = new Tone.Filter(2600, 'lowpass');         // tira a fritura aguda
    const limiter = new Tone.Limiter(-3);                     // segura o clipping
    synth = new Tone.PolySynth(Tone.Synth);                   // acordes (chug + acento)
    synth.set({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.16, sustain: 0.05, release: 0.08 },
      volume: -10,
    });
    synth.chain(dist, filtro, limiter, Tone.Destination);
    cadeiaPronta = true;
  }

  function ui(on) {
    tocando = on;
    $('eq').classList.toggle('on', on);                       // equalizador anima enquanto toca
    $('btnPlay').innerHTML = on ? ICON_PAUSE : ICON_PLAY;
  }

  function pararTone() {
    if (seq) { try { seq.stop(0); seq.dispose(); } catch (e) {} seq = null; }
    if (window.Tone) { try { Tone.Transport.stop(); Tone.Transport.cancel(0); } catch (e) {} }
    if (synth) { try { synth.releaseAll(); } catch (e) {} }
  }

  function stop() {
    if (audioEl) audioEl.pause();
    pararTone();
    ui(false);
  }

  /* (1) Back devolveu um .mp3 -> toca o arquivo */
  function tocarArquivo(url) {
    if (!audioEl) {
      audioEl = new Audio();
      audioEl.addEventListener('ended', () => ui(false));
      audioEl.addEventListener('error', () => { toast('Não foi possível tocar o áudio', 'erro'); ui(false); });
    }
    audioEl.src = url;
    audioEl.play().then(() => ui(true)).catch(() => { toast('Reprodução bloqueada pelo navegador', 'erro'); ui(false); });
  }

  /* (2) Sintetiza a tablatura com Tone.js, no BPM e com distorção */
  async function tocarSequencia(passos) {
    if (!window.Tone) { toast('Áudio indisponível (Tone.js não carregou)', 'erro'); return; }
    await Tone.start();                                       // libera o áudio (gesto do usuário)
    montarCadeia();
    pararTone();

    Tone.Transport.bpm.value = estado.bpm || 120;            // anda no andamento do slider
    seq = new Tone.Sequence((time, notas) => {
      if (notas && notas.length) synth.triggerAttackRelease(notas, '16n', time);
    }, passos, '16n');                                        // 16 slots/medida = semicolcheias
    seq.loop = true;                                          // riff em loop até pausar
    seq.start(0);
    Tone.Transport.start();
    ui(true);
  }

  function toggle() {
    if (tocando) { stop(); return; }
    const r = ultimoResultado;
    if (r && r.audioUrl) { tocarArquivo(r.audioUrl); return; }

    // monta a sequência a partir da MATRIZ (ou da tab como fallback)
    const cordas = (r && r.afinacao && r.afinacao.cordas) || TUNINGS[estado.afinacao];
    const passos = (r && r.grade) ? gradeParaSequencia(r.grade, cordas) : tabParaSequencia($('tab').textContent);

    if (!passos.some(p => p.length)) { toast('Nada para tocar ainda', 'erro'); return; }
    tocarSequencia(passos);
  }

  return { toggle, stop };
})();
$('btnPlay').addEventListener('click', () => Player.toggle());

/* ---------- Reveals (entrada no scroll) ---------- */
const io = new IntersectionObserver(
  (es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }),
  { threshold: 0.14 }
);
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* ---------- Init: pré-preenche o resultado (sem loading) ---------- */
pintarNotas();
pintarBpm();
renderResultado(montarRespostaLocal(payloadAtual()));

/* ============================================================
   CAMADA DE MOVIMENTO (reveals cinéticos + cursor; scroll nativo)
   ============================================================ */

function split(el) {
  const txt = el.textContent; el.textContent = '';
  txt.split(/(\s+)/).forEach(tok => {
    if (/^\s+$/.test(tok)) { el.appendChild(document.createTextNode(' ')); return; }
    const w = document.createElement('span'); w.className = 'w';
    const i = document.createElement('span'); i.className = 'w-i'; i.textContent = tok;
    w.appendChild(i); el.appendChild(w);
  });
}
const splits = document.querySelectorAll('[data-split]');
if (!RM) {
  splits.forEach(split);
  const revelar = (el) => {
    el.querySelectorAll('.w-i').forEach((s, i) => { s.style.transitionDelay = (i * 0.045) + 's'; });
    el.classList.add('in');
  };
  const sio = new IntersectionObserver(
    (es) => es.forEach(e => { if (e.isIntersecting) { revelar(e.target); sio.unobserve(e.target); } }),
    { threshold: 0.3 }
  );
  splits.forEach(el => {
    if (el.getBoundingClientRect().top < innerHeight * 0.9) setTimeout(() => revelar(el), 120);
    else sio.observe(el);
  });
} else {
  splits.forEach(el => el.classList.add('in'));
}

/* smooth scroll (Lenis) — DESLIGADO: scroll nativo do navegador ("normal").
   Troque USAR_SMOOTH para true se um dia quiser o scroll suave de volta. */
const USAR_SMOOTH = false;
let lenis = null;
if (USAR_SMOOTH && !RM && window.Lenis) {
  lenis = new Lenis({ lerp: 0.2, wheelMultiplier: 1, smoothWheel: true });
  (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })();
}
function irPara(id) {
  const el = document.getElementById(id); if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset: -10 }); else el.scrollIntoView({ behavior: 'smooth' });
}
document.querySelectorAll('[data-target]').forEach(b => b.addEventListener('click', () => irPara(b.dataset.target)));
document.querySelectorAll('a[href^="#"]').forEach(a => {
  const href = a.getAttribute('href');
  if (href.length > 1) a.addEventListener('click', e => { e.preventDefault(); irPara(href.slice(1)); });
});

/* nav com hairline ao rolar */
const nav = $('nav');
const onScroll = () => nav.classList.toggle('scrolled', (lenis ? lenis.scroll : scrollY) > 24);
if (lenis) lenis.on('scroll', onScroll); else addEventListener('scroll', onScroll);
onScroll();

/* cursor custom (só em ponteiro fino) */
const fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
if (fino && !RM) {
  document.documentElement.classList.add('has-cursor');
  const dot = document.querySelector('.cursor'), ring = document.querySelector('.cursor-ring');
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
  addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
  });
  (function ringRaf() {
    rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
    ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(ringRaf);
  })();
  document.querySelectorAll('a,button,select,input,label,.subgen,[role=switch]').forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('grow'));
    el.addEventListener('mouseleave', () => ring.classList.remove('grow'));
  });
}

/* ============================================================
   CAPA CINEMATOGRÁFICA — partículas digitais + fade do fundo
   ============================================================ */
(function cine() {
  const bg = document.getElementById('cine-bg');
  if (!bg) return;

  const cv = document.getElementById('cine-particles');
  const c = cv ? cv.getContext('2d') : null;
  let parts = [], raf = 0, rodando = false;

  function criar() {
    parts = [];
    const n = Math.min(90, Math.floor((cv.width * cv.height) / 16000));
    for (let i = 0; i < n; i++) parts.push({
      x: Math.random() * cv.width, y: Math.random() * cv.height,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      s: Math.random() * 2 + 1, o: Math.random() * 0.4 + 0.08,
      az: Math.random() < 0.22   // ~1/5 na cor de acento (azul)
    });
  }
  function resize() { cv.width = innerWidth; cv.height = innerHeight; criar(); }
  function tick() {
    c.clearRect(0, 0, cv.width, cv.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = cv.width; else if (p.x > cv.width) p.x = 0;
      if (p.y < 0) p.y = cv.height; else if (p.y > cv.height) p.y = 0;
      c.fillStyle = p.az ? `rgba(111,134,255,${p.o})` : `rgba(255,255,255,${p.o})`;
      c.fillRect(p.x, p.y, p.s, p.s);   // quadrados (estilo digital)
    }
    raf = requestAnimationFrame(tick);
  }
  function start() { if (!rodando && c && !RM) { rodando = true; tick(); } }
  function stop()  { if (rodando) { rodando = false; cancelAnimationFrame(raf); } }

  // fade do fundo ao deixar o hero (não vaza pra ferramenta)
  function fade() {
    const o = Math.max(0, 1 - scrollY / (innerHeight * 0.85));
    bg.style.opacity = o;
    if (o <= 0.01) { bg.style.visibility = 'hidden'; stop(); }
    else { bg.style.visibility = 'visible'; start(); }
  }

  if (c && !RM) { resize(); addEventListener('resize', resize); }
  addEventListener('scroll', fade, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (scrollY < innerHeight * 0.85) start(); });
  fade();
})();
