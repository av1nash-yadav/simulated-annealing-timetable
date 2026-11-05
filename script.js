// =====================================================================
//  Simulated Annealing – Timetable Scheduling
//  All logic: configuration, algorithm, and UI rendering
// =====================================================================

// ── Colour palette for subjects ──────────────────────────────────────
const PALETTE = [
  '#e74c3c','#e67e22','#0ea5e9','#10b981','#8b5cf6',
  '#ec4899','#14b8a6','#f59e0b','#6366f1','#ef4444',
  '#22c55e','#3b82f6','#a855f7','#f97316','#06b6d4',
  '#d946ef','#84cc16','#fb7185','#2dd4bf','#fbbf24',
];

// ── Fixed schedule axes ──────────────────────────────────────────────
const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const SLOTS = ['9:00–10:00','10:00–11:00','11:00–12:00','1:00–2:00','2:00–3:00'];

// ── Editable data (defaults) ─────────────────────────────────────────
let teachers = [
  'Teacher 1','Teacher 2','Teacher 3','Teacher 4','Teacher 5',
];

let subjects = [
  { name:'CS101',   teacher:0 },
  { name:'CS201',   teacher:0 },
  { name:'MATH101', teacher:1 },
  { name:'MATH201', teacher:1 },
  { name:'PHY101',  teacher:2 },
  { name:'PHY201',  teacher:2 },
  { name:'ENG101',  teacher:3 },
  { name:'CHEM101', teacher:3 },
  { name:'BIO101',  teacher:4 },
  { name:'EC101',   teacher:4 },
];

let rooms = ['Room 1','Room 2','Room 3'];

// ── Algorithm state ──────────────────────────────────────────────────
let schedule     = [];
let bestSchedule = [];
let bestCost     = Infinity;
let temperature  = 100;
let iteration    = 0;
let running      = false;
let timerId      = null;
let logLines     = [];

// ── DOM refs ─────────────────────────────────────────────────────────
const btnStart      = document.getElementById('btnStart');
const speedSlider   = document.getElementById('speedSlider');
const coolingSlider  = document.getElementById('coolingSlider');
const statTemp      = document.getElementById('statTemp');
const statCost      = document.getElementById('statCost');
const statBest      = document.getElementById('statBest');
const statIter      = document.getElementById('statIter');
const statStatus    = document.getElementById('statStatus');
const logEl         = document.getElementById('log');
const tableEl       = document.getElementById('timetable');


// =====================================================================
//  CONFIGURATION  UI
// =====================================================================

function toggleConfig() {
  const toggle = document.getElementById('configToggle');
  const body   = document.getElementById('configBody');
  toggle.classList.toggle('open');
  body.classList.toggle('open');
}

// ── render lists ─────────────────────────────────────────────────────

function renderTeacherList() {
  const ul = document.getElementById('teacherList');
  ul.innerHTML = '';
  teachers.forEach((t, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <input type="text" value="${esc(t)}" onchange="teachers[${i}]=this.value; renderSubjectList();">
      <button class="btn-remove" onclick="removeTeacher(${i})" title="Remove">×</button>`;
    ul.appendChild(li);
  });
}

function renderSubjectList() {
  const ul = document.getElementById('subjectList');
  ul.innerHTML = '';
  subjects.forEach((s, i) => {
    const opts = teachers.map((t,ti) =>
      `<option value="${ti}" ${ti===s.teacher?'selected':''}>${esc(t)}</option>`).join('');
    const li = document.createElement('li');
    li.innerHTML = `
      <input type="text" value="${esc(s.name)}" style="max-width:100px"
             onchange="subjects[${i}].name=this.value">
      <select onchange="subjects[${i}].teacher=+this.value">${opts}</select>
      <button class="btn-remove" onclick="removeSubject(${i})" title="Remove">×</button>`;
    ul.appendChild(li);
  });
}

function renderRoomList() {
  const ul = document.getElementById('roomList');
  ul.innerHTML = '';
  rooms.forEach((r, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <input type="text" value="${esc(r)}" onchange="rooms[${i}]=this.value">
      <button class="btn-remove" onclick="removeRoom(${i})" title="Remove">×</button>`;
    ul.appendChild(li);
  });
}

function renderConfigAll() {
  renderTeacherList();
  renderSubjectList();
  renderRoomList();
}

// ── add / remove helpers ─────────────────────────────────────────────

function addTeacher() {
  teachers.push('Teacher ' + (teachers.length + 1));
  renderConfigAll();
}
function removeTeacher(i) {
  if (teachers.length <= 1) return alert('Need at least one teacher.');
  // fix subject teacher indices
  subjects.forEach(s => {
    if (s.teacher === i) s.teacher = 0;
    else if (s.teacher > i) s.teacher--;
  });
  teachers.splice(i, 1);
  renderConfigAll();
}

function addSubject() {
  subjects.push({ name: 'SUB' + (subjects.length + 1), teacher: 0 });
  renderSubjectList();
}
function removeSubject(i) {
  if (subjects.length <= 1) return alert('Need at least one subject.');
  subjects.splice(i, 1);
  renderSubjectList();
}

function addRoom() {
  rooms.push('Room ' + (rooms.length + 1));
  renderRoomList();
}
function removeRoom(i) {
  if (rooms.length <= 1) return alert('Need at least one room.');
  rooms.splice(i, 1);
  renderRoomList();
}

function applyConfig() {
  // validate teacher indices
  subjects.forEach(s => {
    if (s.teacher < 0 || s.teacher >= teachers.length) s.teacher = 0;
  });
  stopSA();
  resetSA();
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}


// =====================================================================
//  HELPERS
// =====================================================================

function randInt(n) { return Math.floor(Math.random() * n); }

function getCoolingRate() {
  return 0.9 + (coolingSlider.value / 100) * 0.099;
}

function getDelay() {
  return Math.max(5, 510 - speedSlider.value * 5);
}

function randomSchedule() {
  return subjects.map(() => ({
    day:  randInt(DAYS.length),
    slot: randInt(SLOTS.length),
    room: randInt(rooms.length),
  }));
}

function cloneSchedule(s) { return s.map(e => ({ ...e })); }

function subjectColor(i) { return PALETTE[i % PALETTE.length]; }


// =====================================================================
//  COST  FUNCTION
// =====================================================================

function computeCost(sch) {
  let conflicts = 0;
  for (let i = 0; i < sch.length; i++) {
    for (let j = i + 1; j < sch.length; j++) {
      const a = sch[i], b = sch[j];
      if (a.day === b.day && a.slot === b.slot) {
        if (a.room === b.room) conflicts++;                             // room clash
        if (subjects[i].teacher === subjects[j].teacher) conflicts++;   // teacher clash
      }
    }
  }
  return conflicts;
}

function conflictCells(sch) {
  const set = new Set();
  for (let i = 0; i < sch.length; i++) {
    for (let j = i + 1; j < sch.length; j++) {
      const a = sch[i], b = sch[j];
      if (a.day === b.day && a.slot === b.slot) {
        if (a.room === b.room || subjects[i].teacher === subjects[j].teacher) {
          set.add(`${a.day}-${a.slot}-${a.room}`);
          set.add(`${b.day}-${b.slot}-${b.room}`);
        }
      }
    }
  }
  return set;
}


// =====================================================================
//  NEIGHBOUR
// =====================================================================

function neighbour(sch) {
  const n  = cloneSchedule(sch);
  const ci = randInt(subjects.length);
  const w  = randInt(3);
  if (w === 0)      n[ci].day  = randInt(DAYS.length);
  else if (w === 1)  n[ci].slot = randInt(SLOTS.length);
  else               n[ci].room = randInt(rooms.length);
  return { newSch: n, moved: ci };
}


// =====================================================================
//  RENDER  TIMETABLE
// =====================================================================

function renderTable(sch) {
  const conf = conflictCells(sch);

  // build lookup  key → [courseIndex, …]
  const grid = {};
  sch.forEach((e, ci) => {
    const k = `${e.day}-${e.slot}-${e.room}`;
    (grid[k] = grid[k] || []).push(ci);
  });

  let html = '<thead><tr><th>Day</th>';
  SLOTS.forEach(s => html += `<th>${s}</th>`);
  html += '</tr></thead><tbody>';

  for (let d = 0; d < DAYS.length; d++) {
    for (let r = 0; r < rooms.length; r++) {
      html += '<tr>';
      if (r === 0) {
        html += `<td class="day-label" rowspan="${rooms.length}">${DAYS[d]}</td>`;
      }
      for (let s = 0; s < SLOTS.length; s++) {
        const k = `${d}-${s}-${r}`;
        const cls = conf.has(k) ? ' conflict' : '';
        html += `<td class="${cls}">`;
        html += `<div class="room-label">${rooms[r]}</div>`;
        (grid[k] || []).forEach(ci => {
          const sub = subjects[ci];
          html += `<span class="course-tag" style="background:${subjectColor(ci)}"
                        title="${sub.name} — ${teachers[sub.teacher]}">${esc(sub.name)}<span class="tag-teacher">${esc(teachers[sub.teacher])}</span></span>`;
        });
        html += '</td>';
      }
      html += '</tr>';
    }
  }
  html += '</tbody>';
  tableEl.innerHTML = html;
}


// =====================================================================
//  LOGGING
// =====================================================================

function log(msg) {
  logLines.push(msg);
  if (logLines.length > 250) logLines = logLines.slice(-180);
  logEl.textContent = logLines.join('\n');
  logEl.scrollTop = logEl.scrollHeight;
}


// =====================================================================
//  SA  STEP
// =====================================================================

function step() {
  const { newSch, moved } = neighbour(schedule);
  const curCost = computeCost(schedule);
  const newCost = computeCost(newSch);
  const delta   = newCost - curCost;

  let accepted = false;
  if (delta <= 0) {
    accepted = true;
  } else {
    accepted = Math.random() < Math.exp(-delta / temperature);
  }

  const name = subjects[moved].name;

  if (accepted) {
    schedule = newSch;
    if (newCost < bestCost) {
      bestCost     = newCost;
      bestSchedule = cloneSchedule(newSch);
      log(`#${iteration}  ★ New best!  Moved ${name}  Cost: ${newCost}  (Δ=${delta >= 0 ? '+' : ''}${delta})  T=${temperature.toFixed(2)}`);
    } else if (delta > 0) {
      log(`#${iteration}  ↗ Accepted worse  Moved ${name}  Cost: ${newCost}  (Δ=+${delta})  T=${temperature.toFixed(2)}`);
    } else {
      log(`#${iteration}  ✓ Improved  Moved ${name}  Cost: ${newCost}  (Δ=${delta})  T=${temperature.toFixed(2)}`);
    }
  } else if (iteration % 25 === 0) {
    log(`#${iteration}    Rejected  Moved ${name}  Would be ${newCost}  (Δ=+${delta})  T=${temperature.toFixed(2)}`);
  }

  temperature *= getCoolingRate();
  iteration++;

  // update stats
  statTemp.textContent = temperature.toFixed(3);
  statCost.textContent = computeCost(schedule);
  statBest.textContent = bestCost;
  statIter.textContent = iteration;

  renderTable(schedule);

  // termination
  if (bestCost === 0) {
    stopSA();
    statStatus.textContent = '✅ Solved!';
    statStatus.style.color = '#10b981';
    log(`\n🎉  Conflict-free schedule found at iteration ${iteration}!`);
    renderTable(bestSchedule);
    return;
  }
  if (temperature < 0.001) {
    stopSA();
    statStatus.textContent = '❄️ Frozen';
    statStatus.style.color = '#ef4444';
    log(`\n❄️  Temperature too low. Best cost: ${bestCost}. Showing best found.`);
    renderTable(bestSchedule);
    return;
  }
}


// =====================================================================
//  CONTROLS
// =====================================================================

function toggleRun() {
  if (running) { stopSA(); return; }
  running = true;
  btnStart.textContent = '⏸ Pause';
  btnStart.classList.add('running');
  statStatus.textContent = '🔄 Running…';
  statStatus.style.color  = '#f59e0b';
  tick();
}

function tick() {
  if (!running) return;
  step();
  if (running) timerId = setTimeout(tick, getDelay());
}

function stopSA() {
  running = false;
  clearTimeout(timerId);
  btnStart.textContent = '▶ Resume';
  btnStart.classList.remove('running');
  if (statStatus.textContent === '🔄 Running…') {
    statStatus.textContent = '⏸ Paused';
    statStatus.style.color  = '#4361ee';
  }
}

function resetSA() {
  stopSA();
  schedule     = randomSchedule();
  bestSchedule = cloneSchedule(schedule);
  bestCost     = computeCost(schedule);
  temperature  = 100;
  iteration    = 0;
  logLines     = [];

  statTemp.textContent   = '100.000';
  statCost.textContent   = bestCost;
  statBest.textContent   = bestCost;
  statIter.textContent   = '0';
  statStatus.textContent = 'Ready';
  statStatus.style.color  = '';
  btnStart.textContent   = '▶ Start';
  btnStart.classList.remove('running');

  log('Schedule randomised. Press Start to begin.');
  renderTable(schedule);
}


// =====================================================================
//  INIT
// =====================================================================

renderConfigAll();
resetSA();
