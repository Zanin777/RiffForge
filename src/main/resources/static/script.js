/* ============================================================
   RiffForge — script.js
   Lógica da ferramenta + camada de movimento (smooth scroll,
   tipografia cinética e cursor custom).
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

/* ---------- Gerador local (mock — usado no modo demo) ---------- */
function gerar({ afinacao, subgenero, blastBeats }) {
  const cordas = TUNINGS[afinacao] || TUNINGS['Drop B'];
  const SLOTS = 16, MED = 2, total = SLOTS * MED;
  let pat = (SUBGEN[subgenero] || SUBGEN['Death Metal']).pat;
  if (blastBeats) pat = pat.map(() => 1);
  const grade = cordas.map(() => Array(total).fill('-'));
  for (let s = 0; s < total; s++) {
    const m = s % SLOTS;
    if (pat[m]) grade[0][s] = '0';
    if (m === 0 || m === 8) {
      const corda = 1 + Math.floor(Math.random() * 2);
      grade[corda][s] = FRETS[Math.floor(Math.random() * FRETS.length)];
    }
    if (Math.random() < 0.08) grade[1][s] = FRETS[Math.floor(Math.random() * FRETS.length)];
  }
  const linhas = [];
  for (let c = cordas.length - 1; c >= 0; c--) {
    const rot = (cordas[c] + ' ').slice(0, 2), partes = [];
    for (let m = 0; m < MED; m++) partes.push(grade[c].slice(m * SLOTS, (m + 1) * SLOTS).join(''));
    linhas.push(rot + '|' + partes.join('|') + '|');
  }
  return linhas.join('\n');
}

/* ---------- Estado ---------- */
let estado = { afinacao: 'Drop B', bpm: 180, subgenero: 'Death Metal', blastBeats: false };
let ultimoResultado = null;   // guarda a última resposta (tab, estrutura, audioUrl…)

function pintarNotas() {
  $('tuningNotes').innerHTML = TUNINGS[estado.afinacao].map(n => `<span class="note-pill">${n}</span>`).join('');
}
$('afinacao').addEventListener('change', e => { estado.afinacao = e.target.value; pintarNotas(); });

const bpm = $('bpm');
function pintarBpm() { estado.bpm = Number(bpm.value); $('bpmOut').textContent = bpm.value; }
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
  return {
    afinacao: { nome: p.afinacao, cordas: TUNINGS[p.afinacao] || TUNINGS['Drop B'] },
    bpm: p.bpm,
    subgenero: p.subgenero,
    blastBeats: p.blastBeats,
    estrutura: ESTRUTURAS[p.subgenero] || [],
    tab: gerar(p),
    audioUrl: null,   // o back pode devolver a URL de um .mp3 aqui
  };
}
const delay = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------- Chamada à API (real ou simulada) ----------
   Sempre devolve o mesmo formato de resposta, venha do back ou do mock,
   e lança (throw) em caso de falha — quem chama trata no try/catch.
*/
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
  // estado de carregamento
  btn.disabled = true;
  $('output').style.display = 'none';
  $('forging').classList.add('on');
  $('forgingMsg').textContent = MSGS[Math.floor(Math.random() * MSGS.length)];

  try {
    const data = await gerarRiff(payloadAtual());   // sucesso
    renderResultado(data);
  } catch (err) {                                   // falha (500/timeout/rede)
    console.error('[RiffForge] falha ao gerar o riff:', err);
    toast('Não foi possível gerar o riff — ' + (err.message || 'tente novamente'), 'erro');
  } finally {                                       // sempre restaura a UI
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
   PLAYER — reproduz um .mp3 vindo do back OU lê a tab (Tone.js)
   ============================================================ */
const ICON_PLAY  = '<svg viewBox="0 0 24 24" fill="none"><path d="M7 5l12 7-12 7V5z" fill="currentColor" stroke="none"/></svg> Reproduzir';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="5" width="4" height="14" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" fill="currentColor" stroke="none"/></svg> Pausar';

/* Converte a tablatura ASCII gerada numa sequência de notas (ex.: ["B2","E3"…]).
   É o que um sintetizador (Tone.js) consumiria para "tocar o texto". */
function tabParaNotas(tab) {
  if (!tab) return [];
  const CROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const linhas = tab.split('\n');
  // nota e oitava-base de cada corda, a partir do rótulo (graves embaixo)
  const cordas = linhas.map((ln, i) => {
    const idx = CROMA.indexOf(ln.slice(0, 2).trim());
    return { idx: idx < 0 ? 0 : idx, oct: 2 + (linhas.length - 1 - i) };
  });
  const conteudo = linhas.map(ln => ln.slice(2).replace(/\|/g, ''));
  const largura = Math.max(0, ...conteudo.map(c => c.length));
  const seq = [];
  for (let col = 0; col < largura; col++) {
    for (let c = 0; c < conteudo.length; c++) {
      const ch = conteudo[c][col];
      if (ch && /\d/.test(ch)) {
        let casa = ch;
        const prox = conteudo[c][col + 1];
        if (prox && /\d/.test(prox)) casa += prox;       // casas de 2 dígitos (ex.: 10)
        const semis = cordas[c].idx + parseInt(casa, 10);
        seq.push(CROMA[semis % 12] + (cordas[c].oct + Math.floor(semis / 12)));
      }
    }
  }
  return seq;
}

const Player = (() => {
  let tocando = false, audioEl = null, simTimer = null;

  function ui(on) {
    tocando = on;
    $('eq').classList.toggle('on', on);
    $('btnPlay').innerHTML = on ? ICON_PAUSE : ICON_PLAY;
  }

  function stop() {
    if (audioEl) audioEl.pause();
    if (simTimer) { clearTimeout(simTimer); simTimer = null; }
    ui(false);
  }

  // (1) Caminho real: o back devolveu um .mp3 -> toca o arquivo
  function tocarArquivo(url) {
    if (!audioEl) {
      audioEl = new Audio();
      audioEl.addEventListener('ended', () => ui(false));
      audioEl.addEventListener('error', () => { toast('Não foi possível tocar o áudio', 'erro'); ui(false); });
    }
    audioEl.src = url;
    audioEl.play().then(() => ui(true)).catch(() => { toast('Reprodução bloqueada pelo navegador', 'erro'); ui(false); });
  }

  // (2) Caminho sintetizado: lê a tab e toca (estrutura pronta p/ Tone.js)
  function tocarTab(tab) {
    const notas = tabParaNotas(tab);

    /* --- INTEGRAÇÃO FUTURA COM Tone.js ---------------------------------
       Carregue o Tone (CDN) e troque o fallback abaixo por:

         await Tone.start();
         const synth = new Tone.PluckSynth({ resonance: 0.9 }).toDestination();
         Tone.Transport.bpm.value = estado.bpm;
         const seq = new Tone.Sequence((time, n) => {
           if (n) synth.triggerAttackRelease(n, '16n', time);
         }, notas, '16n');
         seq.start(0);
         Tone.Transport.start();
       E pare em stop(): seq.dispose(); Tone.Transport.stop();
       ------------------------------------------------------------------- */

    if (!notas.length) { toast('Nada para tocar ainda', 'erro'); return; }

    // Fallback (sem Tone.js): playback "visual" sincronizado ao andamento.
    const bpmAtual = estado.bpm || 120;
    const durMs = (notas.length / 4) * (60 / bpmAtual) * 1000;
    ui(true);
    simTimer = setTimeout(() => ui(false), Math.min(Math.max(durMs, 1500), 12000));
  }

  function toggle() {
    if (tocando) { stop(); return; }
    const r = ultimoResultado;
    if (r && r.audioUrl) tocarArquivo(r.audioUrl);          // back mandou áudio
    else tocarTab(r ? r.tab : $('tab').textContent);        // senão, lê a tab
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
   CAMADA DE MOVIMENTO (smooth scroll + cinética + cursor)
   ============================================================ */

/* split de texto em palavras (máscara que sobe) */
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

/* smooth scroll (Lenis) */
let lenis = null;
if (!RM && window.Lenis) {
  lenis = new Lenis({ lerp: 0.19, wheelMultiplier: 1.65, smoothWheel: true });
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
