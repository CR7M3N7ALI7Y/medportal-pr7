/* ============================================================
   MedPortal — admin-filter.js
   Демонстрационные заявки, фильтрация по врачу/дате/статусу,
   отрисовка карточек заявок, смена статуса.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Демонстрационные заявки ---------- */

  const APPLICATIONS = [
    { id: 'A-1001', patient: 'Иванова Анна Петровна', doctor: 'd2', specialty: 'kardiolog',
      branch: 'b1', date: '2026-11-20', time: '10:30', status: 'waiting', note: 'ЭКГ, консультация' },
    { id: 'A-1002', patient: 'Смирнов Игорь Олегович', doctor: 'd1', specialty: 'terapevt',
      branch: 'b1', date: '2026-11-18', time: '09:00', status: 'done', note: 'Профилактический осмотр' },
    { id: 'A-1003', patient: 'Кузьмина Ольга Сергеевна', doctor: 'd4', specialty: 'nevrolog',
      branch: 'b2', date: '2026-11-21', time: '14:00', status: 'waiting', note: 'Головные боли' },
    { id: 'A-1004', patient: 'Орлова Мария Викторовна', doctor: 'd5', specialty: 'pediatr',
      branch: 'b3', date: '2026-11-15', time: '11:00', status: 'cancelled', note: 'Перенос приёма' },
    { id: 'A-1005', patient: 'Петров Сергей Иванович', doctor: 'd3', specialty: 'kardiolog',
      branch: 'b2', date: '2026-11-19', time: '15:30', status: 'done', note: 'Контроль давления' },
    { id: 'A-1006', patient: 'Фёдоров Игорь Николаевич', doctor: 'd6', specialty: 'oftalmolog',
      branch: 'b3', date: '2026-11-22', time: '13:00', status: 'waiting', note: 'Подбор очков' },
    { id: 'A-1007', patient: 'Зайцева Ольга Дмитриевна', doctor: 'd7', specialty: 'stomatolog',
      branch: 'b1', date: '2026-11-17', time: '16:30', status: 'done', note: 'Лечение кариеса' },
    { id: 'A-1008', patient: 'Новиков Павел Андреевич', doctor: 'd2', specialty: 'kardiolog',
      branch: 'b1', date: '2026-11-23', time: '10:00', status: 'waiting', note: 'ЭКГ' }
  ];

  /* ---------- Справочники из validation.js ---------- */

  function getDb() {
    return (window.MedPortal && window.MedPortal.DB) || { specialties: [], doctors: [], branches: [] };
  }

  function doctorName(id) {
    const d = getDb().doctors.find(x => x.id === id);
    return d ? d.name : '—';
  }
  function specialtyTitle(id) {
    const s = getDb().specialties.find(x => x.id === id);
    return s ? s.title : '—';
  }
  function branchTitle(id) {
    const b = getDb().branches.find(x => x.id === id);
    return b ? b.title : '—';
  }

  /* ---------- Фильтрация ---------- */

  function filterApplications(apps, filters) {
    return apps.filter(a => {
      if (filters.status && a.status !== filters.status) return false;
      if (filters.specialty && a.specialty !== filters.specialty) return false;
      if (filters.doctor && a.doctor !== filters.doctor) return false;
      if (filters.dateFrom && a.date < filters.dateFrom) return false;
      if (filters.dateTo && a.date > filters.dateTo) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        const hay = (a.patient + ' ' + a.id + ' ' + doctorName(a.doctor) + ' ' + a.note).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  /* ---------- Статусы ---------- */

  const STATUS = {
    waiting:  { title: 'Ожидает',   cls: 'badge-waiting' },
    done:     { title: 'Завершён',  cls: 'badge-success' },
    cancelled:{ title: 'Отменён',   cls: 'badge-cancel' }
  };

  /* ---------- Рендер карточек ---------- */

  function renderCard(a) {
    const st = STATUS[a.status] || STATUS.waiting;
    return `
      <article class="app-card" data-id="${a.id}">
        <div class="top">
          <div>
            <div class="who">${escapeHtml(a.patient)}</div>
            <div class="when">Заявка №${a.id} · ${formatDate(a.date)} ${a.time}</div>
          </div>
          <span class="badge ${st.cls}">${st.title}</span>
        </div>
        <div class="row-info">
          <span>Врач: <b>${escapeHtml(doctorName(a.doctor))}</b></span>
          <span>Специальность: <b>${escapeHtml(specialtyTitle(a.specialty))}</b></span>
          <span>Филиал: <b>${escapeHtml(branchTitle(a.branch))}</b></span>
        </div>
        ${a.note ? `<div class="row-info" style="margin-top:4px"><span>Комментарий: ${escapeHtml(a.note)}</span></div>` : ''}
        <div class="actions">
          ${a.status === 'waiting' ? `<button class="btn btn-sm btn-secondary" data-act="done" data-id="${a.id}">Завершить</button>` : ''}
          ${a.status === 'waiting' ? `<button class="btn btn-sm btn-danger" data-act="cancel" data-id="${a.id}">Отменить</button>` : ''}
          ${a.status === 'done'    ? `<button class="btn btn-sm btn-secondary" data-act="reopen" data-id="${a.id}">Вернуть в ожидание</button>` : ''}
        </div>
      </article>`;
  }

  function renderEmpty() {
    return `
      <div class="empty-state">
        <img src="img/icons/search.png" alt="">
        <div>Заявок по выбранным фильтрам не найдено.</div>
      </div>`;
  }

  function render(list) {
    const container = document.getElementById('appList');
    if (!container) return;
    if (!list.length) {
      container.innerHTML = renderEmpty();
    } else {
      container.innerHTML = list.map(renderCard).join('');
    }
    const countEl = document.getElementById('countInfo');
    if (countEl) countEl.textContent = `Найдено: ${list.length} из ${APPLICATIONS.length}`;
    // Оповещаем подписчиков (KPI-блок), что список перерисован
    document.dispatchEvent(new CustomEvent('medportal:filtered', { detail: { count: list.length } }));
  }

  /* ---------- Сбор фильтров и перерисовка ---------- */

  function applyFilters() {
    const filters = {
      q: document.getElementById('q')?.value.trim() || '',
      status: document.getElementById('fStatus')?.value || '',
      specialty: document.getElementById('fSpecialty')?.value || '',
      doctor: document.getElementById('fDoctor')?.value || '',
      dateFrom: document.getElementById('fDateFrom')?.value || '',
      dateTo: document.getElementById('fDateTo')?.value || ''
    };
    render(filterApplications(APPLICATIONS, filters));
  }

  /* ---------- Действия по карточке ---------- */

  function onListClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    const app = APPLICATIONS.find(a => a.id === id);
    if (!app) return;

    if (act === 'done')    app.status = 'done';
    if (act === 'cancel')  app.status = 'cancelled';
    if (act === 'reopen')  app.status = 'waiting';

    window.MedPortal && window.MedPortal.toast('Статус заявки обновлён', 'success');
    applyFilters();
  }

  /* ---------- Чипы быстрых статусов ---------- */

  function initChips() {
    const chips = document.querySelectorAll('.chip[data-status]');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const status = chip.dataset.status;
        const select = document.getElementById('fStatus');
        if (select) select.value = status;
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        applyFilters();
      });
    });
  }

  function resetFilters() {
    ['q','fStatus','fSpecialty','fDoctor','fDateFrom','fDateTo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.querySelectorAll('.chip[data-status]').forEach(c => c.classList.remove('active'));
    applyFilters();
  }

  /* ---------- Утилиты ---------- */

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }

  /* ---------- Инициализация ---------- */

  function fillSpecialtyOptions() {
    const sel = document.getElementById('fSpecialty');
    if (!sel) return;
    const db = getDb();
    db.specialties.forEach(s => {
      const o = document.createElement('option');
      o.value = s.id; o.textContent = s.title;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => {
      const doctorSel = document.getElementById('fDoctor');
      const sp = sel.value;
      if (!doctorSel) return;
      doctorSel.innerHTML = '<option value="">Все врачи</option>';
      db.doctors.filter(d => !sp || d.specialty === sp).forEach(d => {
        const o = document.createElement('option');
        o.value = d.id; o.textContent = d.name;
        doctorSel.appendChild(o);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('appList')) return;

    fillSpecialtyOptions();

    ['q','fStatus','fSpecialty','fDoctor','fDateFrom','fDateTo'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const ev = (el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(ev, applyFilters);
      }
    });

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);

    initChips();
    document.getElementById('appList').addEventListener('click', onListClick);
    applyFilters();
  });

  // Экспорт функции фильтрации для теста/проверки (как в задании)
  window.filterApplications = filterApplications;

})();
