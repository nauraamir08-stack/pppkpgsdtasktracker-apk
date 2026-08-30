/* PPPK PGSD Task Tracker — Multi-page core
 * Single source of truth for state, rendering, navigation helpers and calendar.
 */
'use strict';

const STORAGE = Object.freeze({
  completed: 'pppk_completed',
  favorites: 'pppk_favorites',
  dark: 'pppk_dark',
  nickname: 'pppk_nickname',
});

function readStore(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : {};
  } catch (_) {
    return {};
  }
}

let completed = readStore(STORAGE.completed);
let favorites = readStore(STORAGE.favorites);
const page = document.body?.dataset.page || 'home';
const navLinks = Object.freeze({ home: 'index.html', calendar: 'kalender.html', tasks: 'tugas.html', favorites: 'favorit.html' });

function save() {
  localStorage.setItem(STORAGE.completed, JSON.stringify(completed));
  localStorage.setItem(STORAGE.favorites, JSON.stringify(favorites));
}

function allItems() {
  const result = [];
  Object.values(tasks).forEach(category => category.forEach(task => {
    if (Array.isArray(task.subtasks) && task.subtasks.length) task.subtasks.forEach(subtask => result.push(subtask));
    else result.push(task);
  }));
  return result;
}

function allTaskIds() {
  return new Set(allItems().map(item => item.id));
}

function getTaskById(id) {
  if (!id) return null;
  for (const [cat, categoryTasks] of Object.entries(tasks)) {
    for (const task of categoryTasks) {
      if (task.id === id) return { ...task, cat };
      for (const subtask of (task.subtasks || [])) {
        if (subtask.id === id) return { ...subtask, cat, parent: task };
      }
    }
  }
  return null;
}

function getDeadlineItems() {
  const result = [];
  Object.entries(tasks).forEach(([cat, categoryTasks]) => categoryTasks.forEach(task => {
    if (task.deadline) result.push({ ...task, cat });
    (task.subtasks || []).forEach(subtask => {
      if (subtask.deadline) result.push({ ...subtask, cat, parent: task, title: `${task.title} — ${subtask.title}` });
    });
  }));
  return result;
}

function parseDate(value) {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
}

function smartStatus(deadline, done = false) {
  if (done) return { cls: 'done-status', label: '✓ Selesai' };
  const time = parseDate(deadline);
  if (time === null) return { cls: 'future', label: 'Tanpa deadline' };
  const diff = time - Date.now();
  if (diff < 0) return { cls: 'passed', label: 'Terlambat' };
  if (diff <= 24 * 60 * 60 * 1000) return { cls: 'today', label: 'Hari ini' };
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days <= 3) return { cls: 'soon', label: `${days} hari lagi` };
  return { cls: 'future', label: `${days} hari lagi` };
}

function deadlineText(deadline) {
  const time = parseDate(deadline);
  if (time === null) return 'Tanpa deadline';
  return new Date(time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

let officialNoticeTimer = null;

function closeNotice() {
  const notice = document.getElementById('officialNotice');
  if (!notice) return;
  if (officialNoticeTimer) window.clearTimeout(officialNoticeTimer);
  notice.classList.remove('show');
  notice.classList.add('hide');
  window.setTimeout(() => notice.remove(), 420);
}

function showOfficialNotice() {
  const notice = document.getElementById('officialNotice');
  if (!notice || page !== 'home') return;
  const timer = document.createElement('div');
  timer.className = 'notice-timer';
  timer.setAttribute('aria-hidden', 'true');
  notice.appendChild(timer);
  window.setTimeout(() => notice.classList.add('show'), 250);
  officialNoticeTimer = window.setTimeout(() => closeNotice(), 10250);
}

function getNickname() {
  try { return (localStorage.getItem(STORAGE.nickname) || '').trim(); } catch (_) { return ''; }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

function getPendingItemsForWelcome() {
  return allItems()
    .filter(item => !completed[item.id])
    .map(item => ({ ...item, _time: parseDate(item.deadline) }))
    .sort((a, b) => {
      if (a._time === null && b._time === null) return 0;
      if (a._time === null) return 1;
      if (b._time === null) return -1;
      return a._time - b._time;
    });
}

function renderWelcome() {
  const card = document.getElementById('welcomeCard');
  if (!card) return;
  const name = getNickname();
  if (!name) {
    card.classList.add('hidden');
    card.innerHTML = '';
    return;
  }
  const pending = getPendingItemsForWelcome();
  const count = pending.length;
  const visible = pending.slice(0, 4);
  const itemsHTML = visible.map(item => `<li><span>•</span><strong>${escapeHTML(item.title)}</strong>${item.deadline ? `<small>${escapeHTML(item.deadlineText || deadlineText(item.deadline))}</small>` : ''}</li>`).join('');
  card.classList.remove('hidden');
  card.innerHTML = `<div class="welcome-copy"><div class="welcome-greeting">${getGreeting()}, <strong>${escapeHTML(name)}</strong> 👋</div><p>${count ? `Jangan lupa tugasnya, masih ada <strong>${count} tugas yang belum selesai.</strong>` : '<strong>Hebat!</strong> Semua tugas sudah selesai 🎉'}</p></div>${count ? `<div class="welcome-tasks"><div class="welcome-tasks-title">🔔 Tugas yang perlu dikerjakan</div><ul>${itemsHTML}</ul>${count > visible.length ? `<a href="tugas.html" class="welcome-more">Lihat ${count - visible.length} tugas lainnya →</a>` : ''}</div>` : ''}`;
}

function openNameSettings() {
  const modal = document.getElementById('nameModal');
  const input = document.getElementById('nicknameInput');
  const title = document.getElementById('nameTitle');
  const intro = document.getElementById('nameIntro');
  const saveButton = document.getElementById('saveNicknameButton');
  if (!modal || !input) return;
  const existing = getNickname();
  title.textContent = existing ? 'Ubah nama panggilan' : 'Selamat datang!';
  intro.textContent = existing ? 'Ganti nama panggilan yang tampil di dashboard.' : 'Sebelum mulai, boleh tahu nama panggilan kamu?';
  saveButton.textContent = existing ? 'Simpan →' : 'Mulai →';
  input.value = existing;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  window.setTimeout(() => input.focus(), 80);
}

function closeNameSettings() {
  const modal = document.getElementById('nameModal');
  if (!modal) return;
  if (!getNickname()) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
}

function saveNickname() {
  const input = document.getElementById('nicknameInput');
  if (!input) return;
  const name = input.value.trim().replace(/\s+/g, ' ');
  if (!name) { input.focus(); input.classList.add('invalid'); return; }
  input.classList.remove('invalid');
  localStorage.setItem(STORAGE.nickname, name.slice(0, 30));
  const modal = document.getElementById('nameModal');
  if (modal) { modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); }
  renderWelcome();
}

function initNickname() {
  if (page !== 'home') return;
  renderWelcome();
  if (!getNickname()) window.setTimeout(openNameSettings, 450);
}

function toggleDarkMode() {
  document.body.classList.toggle('dark');
  localStorage.setItem(STORAGE.dark, document.body.classList.contains('dark') ? 'true' : 'false');
  syncDarkButton();
}

function syncDarkButton() {
  const button = document.getElementById('darkButton');
  if (!button) return;
  const dark = document.body.classList.contains('dark');
  button.textContent = dark ? '☀️' : '🌙';
  button.setAttribute('aria-label', dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');
}

function initTheme() {
  if (localStorage.getItem(STORAGE.dark) === 'true') document.body.classList.add('dark');
  syncDarkButton();
}

function setActiveNav() {
  document.querySelectorAll('.nav-item').forEach(link => {
    const active = link.dataset.page === page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function animateNumber(element, target) {
  if (!element) return;
  const end = Number(target) || 0;
  const start = Number(element.dataset.value ?? element.textContent) || 0;
  if (start === end) {
    element.textContent = String(end);
    element.dataset.value = String(end);
    return;
  }
  const startTime = performance.now();
  const duration = 500;
  function frame(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = String(Math.round(start + (end - start) * eased));
    if (progress < 1) requestAnimationFrame(frame);
    else element.dataset.value = String(end);
  }
  requestAnimationFrame(frame);
}

function updateGlobalStats() {
  const items = allItems();
  const done = items.filter(item => !!completed[item.id]).length;
  const total = items.length;
  const progress = total ? Math.round(done / total * 100) : 0;
  const validIds = allTaskIds();
  const favoriteCount = Object.entries(favorites).filter(([id, value]) => value && validIds.has(id)).length;

  document.querySelectorAll('[data-stat="progress"]').forEach(el => el.textContent = `${progress}%`);
  document.querySelectorAll('[data-stat="done"]').forEach(el => animateNumber(el, done));
  document.querySelectorAll('[data-stat="remaining"]').forEach(el => animateNumber(el, total - done));
  document.querySelectorAll('[data-stat="total"]').forEach(el => animateNumber(el, total));
  document.querySelectorAll('[data-stat="favorites"]').forEach(el => animateNumber(el, favoriteCount));

  const ring = document.getElementById('progressRing');
  if (ring) ring.style.setProperty('--progress', String(progress));
  const ringPercent = document.getElementById('ringPercent');
  if (ringPercent) ringPercent.textContent = `${progress}%`;
  const fill = document.getElementById('progressFill');
  if (fill) fill.style.width = `${progress}%`;

  const kpiProgress = document.getElementById('kpiProgress');
  const kpiText = document.getElementById('kpiProgressText');
  const kpiFavorites = document.getElementById('kpiFavorites');
  if (kpiProgress) kpiProgress.textContent = `${progress}%`;
  if (kpiText) kpiText.textContent = `${done} dari ${total} checklist selesai`;
  if (kpiFavorites) kpiFavorites.textContent = String(favoriteCount);
  renderWelcome();
}

function updateKpis() {
  const now = Date.now();
  const active = getDeadlineItems()
    .filter(item => !completed[item.id] && parseDate(item.deadline) !== null);
  const future = active
    .filter(item => parseDate(item.deadline) >= now)
    .sort((a, b) => parseDate(a.deadline) - parseDate(b.deadline));
  const next = future[0];
  const urgent = future.filter(item => parseDate(item.deadline) - now <= 3 * 24 * 60 * 60 * 1000).length;

  const nextEl = document.getElementById('kpiNext');
  const nextText = document.getElementById('kpiNextText');
  const urgentEl = document.getElementById('kpiUrgent');
  const today = document.getElementById('todayLabel');
  if (nextEl) nextEl.textContent = next ? new Date(next.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—';
  if (nextText) nextText.textContent = next ? next.title : 'Semua deadline selesai';
  if (urgentEl) urgentEl.textContent = String(urgent);
  if (today) today.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
}

function celebrate(element) {
  if (!element?.getBoundingClientRect) return;
  const rect = element.getBoundingClientRect();
  const pop = document.createElement('div');
  pop.className = 'check-pop';
  pop.textContent = '✓';
  pop.style.left = `${rect.left + rect.width / 2}px`;
  pop.style.top = `${rect.top + rect.height / 2}px`;
  document.body.appendChild(pop);
  window.setTimeout(() => pop.remove(), 750);
}

function toggleTask(id) {
  completed[id] = !completed[id];
  save();
  updateGlobalStats();
  updateKpis();
  renderWelcome();
  renderTaskPages();
  updateCountdowns();
  if (completed[id]) celebrate(document.querySelector(`#card-${CSS.escape(id)} .main-check`));
}

function toggleSubtask(id) {
  completed[id] = !completed[id];
  save();
  updateGlobalStats();
  updateKpis();
  renderTaskPages();
  updateCountdowns();
  if (completed[id]) celebrate(document.querySelector(`#card-${CSS.escape(id)} .subtask-check`));
}

function toggleFavorite(event, id) {
  event?.stopPropagation();
  favorites[id] = !favorites[id];
  if (!favorites[id]) delete favorites[id];
  save();
  updateGlobalStats();
  renderTaskPages();
  updateCountdowns();
}

function renderSubtasks(task) {
  if (!Array.isArray(task.subtasks) || !task.subtasks.length) return '';
  const done = task.subtasks.filter(subtask => completed[subtask.id]).length;
  return `<div class="subtask-progress">📊 Sub-tugas selesai: ${done}/${task.subtasks.length}</div>
    <div class="subtask-container">${task.subtasks.map(subtask => {
      const checked = !!completed[subtask.id];
      const status = smartStatus(subtask.deadline, checked);
      return `<div class="subtask ${checked ? 'done' : ''}">
        <input class="subtask-check" type="checkbox" ${checked ? 'checked' : ''} onchange="toggleSubtask('${subtask.id}')" aria-label="${checked ? 'Batalkan' : 'Selesaikan'} ${subtask.title}">
        <div class="subtask-info" onclick="openTaskSheet('${subtask.id}')">
          <div class="subtask-title">${subtask.title}</div>
          <div class="subtask-date">📅 ${subtask.deadlineText}</div>
        </div>
        <span class="subtask-status ${status.cls}">${checked ? 'SELESAI' : status.label.toUpperCase()}</span>
      </div>`;
    }).join('')}</div>`;
}

function taskCard(task) {
  const done = !task.subtasks && !!completed[task.id];
  const favorite = !!favorites[task.id];
  const status = smartStatus(task.deadline, done);
  return `<article class="task-card ${done ? 'completed' : ''} ${favorite ? 'favorite' : ''}" id="card-${task.id}" data-title="${String(task.title).toLowerCase()}">
    <div class="task-main">
      ${task.subtasks ? '<div class="folder-icon" aria-hidden="true">▱</div>' : `<input class="main-check" type="checkbox" ${done ? 'checked' : ''} onchange="toggleTask('${task.id}')" aria-label="${done ? 'Batalkan' : 'Selesaikan'} ${task.title}">`}
      <div class="task-info" onclick="openTaskSheet('${task.id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ')openTaskSheet('${task.id}')">
        <div class="task-number">${task.number ? `TUGAS ${task.number}` : 'TUGAS'}</div>
        <div class="task-title">${task.title}</div>
        <span class="deadline">📅 ${task.deadlineText}</span>
        ${task.deadline ? `<div class="countdown" id="count-${task.id}">⏳ Menghitung...</div>` : ''}
        <span class="deadline-status ${status.cls}">${status.label}</span>
        ${task.resourceUrl ? `<a class="task-resource-link" href="${task.resourceUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">📁 ${task.resourceLabel || 'Buka Folder'} <span>↗</span></a>` : ''}
      </div>
      <button class="favorite-btn ${favorite ? 'active' : ''}" onclick="toggleFavorite(event,'${task.id}')" aria-label="${favorite ? 'Hapus dari favorit' : 'Tambahkan ke favorit'}">${favorite ? '★' : '☆'}</button>
      <button class="arrow" onclick="openTaskSheet('${task.id}')" aria-label="Buka detail tugas">⌄</button>
    </div>
    <div class="details">${task.details || ''}${renderSubtasks(task)}</div>
  </article>`;
}

function emptyState(title, text) {
  return `<div class="empty-state"><div class="empty-icon">☆</div><h3>${title}</h3><p>${text}</p><a class="primary-link" href="tugas.html">Lihat semua tugas</a></div>`;
}

function currentTaskCategory() {
  return document.body.dataset.category || 'individu';
}

function renderTaskPages() {
  const content = document.getElementById('content');
  if (!content || (page !== 'tasks' && page !== 'favorites')) return;

  if (page === 'tasks') {
    const category = currentTaskCategory();
    const categoryNames = { individu: '👤 Tugas Individu', kelompok: '👥 Tugas Kelompok', angkatan: '🎓 Tugas Angkatan' };
    const categoryTasks = tasks[category] || [];
    content.innerHTML = `<div class="category-title"><span class="eyebrow">TASK CENTER</span><h2>${categoryNames[category]}</h2><p>Kelola checklist, deadline, dan favorit dari satu tempat.</p></div>${categoryTasks.map(taskCard).join('') || emptyState('Belum ada tugas', 'Belum ada tugas pada kategori ini.')}`;
  } else {
    const groups = Object.entries(tasks).map(([category, categoryTasks]) => [category, categoryTasks.filter(task => favorites[task.id])]).filter(([, categoryTasks]) => categoryTasks.length);
    content.innerHTML = groups.map(([category, categoryTasks]) => {
      const label = category === 'individu' ? '👤 Individu' : category === 'kelompok' ? '👥 Kelompok' : '🎓 Angkatan';
      return `<div class="category-title compact"><span class="eyebrow">${category.toUpperCase()}</span><h2>${label}</h2></div>${categoryTasks.map(taskCard).join('')}`;
    }).join('') || emptyState('Belum ada favorit', 'Tandai tugas dengan ★ untuk menyimpannya di sini.');
  }
  applySearch();
}

function applySearch() {
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const filter = document.getElementById('statusFilter')?.value || 'all';
  document.querySelectorAll('.task-card').forEach(card => {
    const id = card.id.replace('card-', '');
    const done = !!completed[id];
    const favorite = !!favorites[id];
    const matchesText = !search || card.dataset.title.includes(search) || card.textContent.toLowerCase().includes(search);
    const matchesFilter = filter === 'all' || (filter === 'done' && done) || (filter === 'pending' && !done) || (filter === 'favorite' && favorite);
    card.hidden = !(matchesText && matchesFilter);
  });
}

function setupTasks() {
  if (page !== 'tasks' && page !== 'favorites') return;
  if (!document.body.dataset.category) document.body.dataset.category = 'individu';
  document.querySelectorAll('.tab').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      document.body.dataset.category = button.dataset.cat || 'individu';
      renderTaskPages();
      updateCountdowns();
    });
  });
  document.getElementById('searchInput')?.addEventListener('input', applySearch);
  document.getElementById('statusFilter')?.addEventListener('change', applySearch);
  renderTaskPages();
}

function updateCountdowns() {
  document.querySelectorAll('[id^="count-"]').forEach(element => {
    const id = element.id.slice(6);
    const task = getTaskById(id);
    const time = parseDate(task?.deadline);
    if (time === null) return;
    const diff = time - Date.now();
    if (diff <= 0) {
      element.textContent = '⏰ Deadline telah lewat';
      return;
    }
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    element.textContent = `⏳ ${days} hari ${hours} jam ${minutes} menit lagi`;
  });

  document.querySelectorAll('.task-card').forEach(card => {
    const id = card.id.replace('card-', '');
    const task = getTaskById(id);
    if (!task) return;
    const statusElement = card.querySelector('.deadline-status');
    if (statusElement) {
      const status = smartStatus(task.deadline, !!completed[id]);
      statusElement.className = `deadline-status ${status.cls}`;
      statusElement.textContent = status.label;
    }
  });
  updateKpis();
}

function openTaskSheet(id) {
  const task = getTaskById(id);
  const sheet = document.getElementById('taskSheet');
  const output = document.getElementById('sheetContent');
  if (!task || !sheet || !output) return;
  const status = smartStatus(task.deadline, !!completed[task.id]);
  const resourceUrl = task.resourceUrl || task.parent?.resourceUrl;
  const resourceLabel = task.resourceLabel || task.parent?.resourceLabel || 'Buka Folder';
  const resourceButton = resourceUrl ? `<div class="sheet-resource"><a class="sheet-resource-btn" href="${resourceUrl}" target="_blank" rel="noopener noreferrer">📁 ${resourceLabel}<span>↗</span></a></div>` : '';
  output.innerHTML = `<div class="task-number">${task.number ? `TUGAS ${task.number}` : 'SUB-TUGAS'}</div>
    <div class="sheet-title">${task.title}</div>
    <div class="sheet-meta"><span class="sheet-status ${status.cls}">${status.label}</span>${task.deadline ? `<span>📅 ${deadlineText(task.deadline)}</span>` : ''}</div>
    <div class="sheet-body">${task.details || task.parent?.details || ''}</div>
    ${resourceButton}
    ${task.subtasks ? renderSubtasks(task) : ''}`;
  sheet.classList.add('show');
  sheet.setAttribute('aria-hidden', 'false');
  document.body.classList.add('sheet-open');
}

function closeTaskSheet() {
  const sheet = document.getElementById('taskSheet');
  if (!sheet) return;
  sheet.classList.remove('show');
  sheet.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('sheet-open');
}

let calendarDate = new Date();
calendarDate.setDate(1);

function changeMonth(delta) {
  calendarDate.setMonth(calendarDate.getMonth() + Number(delta || 0));
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const title = document.getElementById('calendarTitle');
  if (!grid || !title) return;
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  title.textContent = new Date(year, month, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const byDay = {};
  getDeadlineItems().forEach(item => {
    const time = parseDate(item.deadline);
    if (time === null) return;
    const date = new Date(time);
    if (date.getFullYear() === year && date.getMonth() === month) {
      (byDay[date.getDate()] ||= []).push(item);
    }
  });

  let html = '';
  for (let i = 0; i < firstDay; i += 1) html += '<div class="calendar-cell empty" aria-hidden="true"></div>';
  for (let day = 1; day <= daysInMonth; day += 1) {
    const items = byDay[day] || [];
    const urgent = items.some(item => ['today', 'soon'].includes(smartStatus(item.deadline, !!completed[item.id]).cls));
    const firstId = items[0]?.id;
    html += `<button type="button" class="calendar-cell ${items.length ? 'has-deadline' : ''} ${urgent ? 'urgent' : ''}" data-calendar-date="${year}-${month}-${day}" aria-label="${day} ${title.textContent}${items.length ? `, ${items.length} deadline` : ', tidak ada deadline'}">
      <span class="calendar-date">${day}</span>${items.length ? `<span class="calendar-dot"></span><span class="calendar-count">${items.length}</span>` : ''}</button>`;
  }
  grid.innerHTML = html;
  // Use real event listeners so date details work reliably on mobile and
  // even when inline handlers are restricted by the browser/WebView.
  grid.querySelectorAll('[data-calendar-date]').forEach(cell => {
    cell.addEventListener('click', () => {
      const [y, m, d] = cell.dataset.calendarDate.split('-').map(Number);
      openCalendarDay(y, m, d);
    });
  });
}

function openCalendarDay(year, month, day) {
  const items = getDeadlineItems().filter(item => {
    const time = parseDate(item.deadline);
    if (time === null) return false;
    const date = new Date(time);
    return date.getFullYear() === Number(year)
      && date.getMonth() === Number(month)
      && date.getDate() === Number(day);
  });

  document.querySelectorAll('.calendar-cell.selected')
    .forEach(el => el.classList.remove('selected'));

  const target = Array.from(document.querySelectorAll('.calendar-cell')).find(
    el => el.dataset.calendarDate === `${year}-${month}-${day}`
  );
  if (target) target.classList.add('selected');

  const panel = document.getElementById('selectedDayPanel');
  const list = document.getElementById('selectedDayList');
  const titleEl = document.getElementById('selectedDayTitle');
  if (!panel || !list) return;

  if (!items.length) {
    panel.hidden = true;
    return;
  }

  // Popup kalender hanya menampilkan tanggal dan nama tugas.
  // Detail/status tugas tidak ditampilkan di popup kalender.
  if (titleEl) {
    const selectedDate = new Date(Number(year), Number(month), Number(day));
    titleEl.textContent = selectedDate.toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  list.innerHTML = items.map(item => `
    <div class="calendar-task-item" role="listitem">
      <span>${item.title}</span>
    </div>
  `).join('');

  panel.hidden = false;
  panel.classList.remove('day-panel-enter');
  void panel.offsetWidth;
  panel.classList.add('day-panel-enter');
}

function closeCalendarDay() {
  const panel = document.getElementById('selectedDayPanel');
  if (!panel) return;
  panel.hidden = true;
  panel.classList.remove('day-panel-enter');
  document.querySelectorAll('.calendar-cell.selected').forEach(el => el.classList.remove('selected'));
}

// Compatibility helper: calendar no longer redirects to tugas.html.
function openCalendarTask(id) {
  const task = getTaskById(id);
  if (!task || !task.deadline) return;
  const d = new Date(parseDate(task.deadline));
  openCalendarDay(d.getFullYear(), d.getMonth(), d.getDate());
}

function handleTaskQuery() {
  if (page !== 'tasks') return;
  const id = new URLSearchParams(window.location.search).get('task');
  if (!id) return;
  const task = getTaskById(id);
  if (!task) return;
  const category = task.cat;
  const tab = document.querySelector(`.tab[data-cat="${category}"]`);
  if (tab) {
    document.querySelectorAll('.tab').forEach(item => item.classList.remove('active'));
    tab.classList.add('active');
    document.body.dataset.category = category;
    renderTaskPages();
  }
  const cardId = task.parent ? task.parent.id : task.id;
  window.setTimeout(() => {
    const card = document.getElementById(`card-${cardId}`);
    if (!card) return;
    card.classList.add('open', 'calendar-focus');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => card.classList.remove('calendar-focus'), 1300);
    openTaskSheet(id);
  }, 80);
}

function init() {
  initTheme();
  initNickname();
  setActiveNav();
  showOfficialNotice();
  updateGlobalStats();
  updateKpis();
  setupTasks();
  renderCalendar();
  updateCountdowns();
  handleTaskQuery();
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeTaskSheet();
  });
  window.setInterval(updateCountdowns, 60000);
}

document.addEventListener('keydown', event => { if (event.key === 'Escape') closeNameSettings(); });
window.addEventListener('DOMContentLoaded', init);
