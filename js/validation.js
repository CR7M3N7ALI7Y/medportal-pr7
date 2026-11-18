/* ============================================================
   MedPortal — validation.js
   Валидация форм регистрации/авторизации, проверка уникальности
   логина через localStorage, мини-«БД» врачей/филиалов.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Демонстрационная «БД» ---------- */

  // Справочник специальностей, врачей и филиалов (каскадные списки)
  const DOCTORS_DB = {
    specialties: [
      { id: 'terapevt',   title: 'Терапевт' },
      { id: 'kardiolog',  title: 'Кардиолог' },
      { id: 'nevrolog',   title: 'Невролог' },
      { id: 'pediatr',    title: 'Педиатр' },
      { id: 'oftalmolog', title: 'Офтальмолог' },
      { id: 'stomatolog', title: 'Стоматолог' }
    ],
    doctors: [
      { id: 'd1', name: 'Иванова Анна Петровна', specialty: 'terapevt',   branch: 'b1' },
      { id: 'd2', name: 'Петров Сергей Иванович', specialty: 'kardiolog',  branch: 'b1' },
      { id: 'd3', name: 'Смирнова Елена Сергеевна', specialty: 'kardiolog', branch: 'b2' },
      { id: 'd4', name: 'Козлов Дмитрий Алексеевич', specialty: 'nevrolog',  branch: 'b2' },
      { id: 'd5', name: 'Орлова Мария Викторовна', specialty: 'pediatr',    branch: 'b3' },
      { id: 'd6', name: 'Фёдоров Игорь Николаевич', specialty: 'oftalmolog', branch: 'b3' },
      { id: 'd7', name: 'Зайцева Ольга Дмитриевна', specialty: 'stomatolog', branch: 'b1' }
    ],
    branches: [
      { id: 'b1', title: 'ул. Ленина, 12 (центральный филиал)' },
      { id: 'b2', title: 'пр. Мира, 45 (северный филиал)' },
      { id: 'b3', title: 'ул. Гагарина, 8 (детский филиал)' }
    ]
  };

  // Сессия текущего пользователя
  const SESSION_KEY = 'medportal_session';

  /* ---------- Хранилище пользователей ---------- */

  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem('medportal_users') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem('medportal_users', JSON.stringify(users));
  }

  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      login: user.login,
      fio: user.fio,
      email: user.email
    }));
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch (e) { return null; }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  /* ---------- Утилиты валидации ---------- */

  const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  // СНИЛС: 123-456-789 00  или  12345678900
  const reSnils = /^\d{3}-\d{3}-\d{3}\s?\d{2}$/;

  function showError(id, msg) {
    const input = document.getElementById(id);
    const err = document.getElementById(id + 'Error');
    if (input) input.classList.add('invalid');
    if (err) err.textContent = msg;
  }

  function clearError(id) {
    const input = document.getElementById(id);
    const err = document.getElementById(id + 'Error');
    if (input) input.classList.remove('invalid');
    if (err) err.textContent = '';
  }

  function clearAllErrors(form) {
    form.querySelectorAll('.error').forEach(el => el.textContent = '');
    form.querySelectorAll('input,select,textarea').forEach(el => el.classList.remove('invalid'));
  }

  // Форматирование СНИЛС: 12345678900 → 123-456-789 00
  function formatSnils(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0,3) + '-' + digits.slice(3);
    if (digits.length <= 9) return digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6);
    return digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6,9) + ' ' + digits.slice(9);
  }

  // Контрольная сумма СНИЛС (упрощённая, по официальному алгоритму)
  function isValidSnils(snils) {
    const digits = snils.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    const nums = digits.slice(0, 9).split('').map(Number);
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += nums[i] * (9 - i);
    const check = parseInt(digits.slice(9), 10);
    let ctrl;
    if (sum < 100) ctrl = sum;
    else if (sum === 100 || sum === 101) ctrl = 0;
    else ctrl = sum % 101;
    return ctrl === check;
  }

  /* ---------- Toast ---------- */

  function toast(msg, type) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'toast show ' + (type || '');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ---------- Регистрация ---------- */

  function initRegister() {
    const form = document.getElementById('regForm');
    if (!form) return;

    const snilsInput = document.getElementById('snils');
    if (snilsInput) {
      snilsInput.addEventListener('input', (e) => {
        e.target.value = formatSnils(e.target.value);
      });
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearAllErrors(form);

      const fio = document.getElementById('fio').value.trim();
      const snils = document.getElementById('snils').value.trim();
      const birthdate = document.getElementById('birthdate').value;
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirm = document.getElementById('confirm') ? document.getElementById('confirm').value : password;

      let valid = true;

      // ФИО
      if (fio.length < 5) {
        showError('fio', 'Введите ФИО полностью (минимум 5 символов)');
        valid = false;
      } else if (!/\s/.test(fio)) {
        showError('fio', 'Укажите фамилию и имя (через пробел)');
        valid = false;
      }

      // СНИЛС
      if (!snils) {
        showError('snils', 'Поле обязательно для заполнения');
        valid = false;
      } else if (!reSnils.test(snils)) {
        showError('snils', 'Формат: 123-456-789 00');
        valid = false;
      } else if (!isValidSnils(snils)) {
        showError('snils', 'Неверная контрольная сумма СНИЛС');
        valid = false;
      }

      // Дата рождения
      if (!birthdate) {
        showError('birthdate', 'Укажите дату рождения');
        valid = false;
      } else {
        const d = new Date(birthdate);
        const now = new Date();
        if (d > now) {
          showError('birthdate', 'Дата не может быть в будущем');
          valid = false;
        } else {
          const age = (now - d) / (365.25 * 24 * 3600 * 1000);
          if (age < 0 || age > 120) {
            showError('birthdate', 'Некорректная дата рождения');
            valid = false;
          }
        }
      }

      // Email
      if (!email) {
        showError('email', 'Поле обязательно для заполнения');
        valid = false;
      } else if (!reEmail.test(email)) {
        showError('email', 'Некорректный email (пример: user@domain.ru)');
        valid = false;
      }

      // Пароль
      if (!password) {
        showError('password', 'Поле обязательно для заполнения');
        valid = false;
      } else if (password.length < 6) {
        showError('password', 'Пароль минимум 6 символов');
        valid = false;
      } else if (!/[A-Za-zА-Яа-я]/.test(password) || !/\d/.test(password)) {
        showError('password', 'Пароль должен содержать буквы и цифры');
        valid = false;
      }

      // Повтор пароля (если есть)
      const confirmEl = document.getElementById('confirm');
      if (confirmEl && confirm !== password) {
        showError('confirm', 'Пароли не совпадают');
        valid = false;
      }

      // Логин берём из email (до @) — упрощённо.
      const login = email.split('@')[0];
      const users = getUsers();

      if (valid && users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        showError('email', 'Пользователь с таким email уже зарегистрирован');
        valid = false;
      }

      if (!valid) {
        toast('Проверьте корректность заполнения полей', 'error');
        return;
      }

      users.push({
        login,
        fio,
        snils,
        birthdate,
        email,
        password,
        createdAt: new Date().toISOString()
      });
      saveUsers(users);

      toast('Регистрация прошла успешно!', 'success');
      setTimeout(() => location.href = 'login.html', 900);
    });

    // Очистка ошибок при вводе
    form.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => clearError(inp.id));
    });
  }

  /* ---------- Авторизация ---------- */

  function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      clearAllErrors(form);

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      let valid = true;

      if (!email) { showError('email', 'Введите email'); valid = false; }
      else if (!reEmail.test(email)) { showError('email', 'Некорректный email'); valid = false; }

      if (!password) { showError('password', 'Введите пароль'); valid = false; }

      if (!valid) return;

      const users = getUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!user) {
        showError('password', 'Неверный email или пароль');
        toast('Ошибка авторизации', 'error');
        return;
      }

      setSession(user);
      toast('С возвращением, ' + (user.fio.split(' ')[1] || user.fio) + '!', 'success');
      setTimeout(() => location.href = 'profile.html', 900);
    });

    form.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => clearError(inp.id));
    });
  }

  /* ---------- Сессия: защита profile.html ---------- */

  function guardAuth() {
    if (document.body.dataset.guard === 'auth' && !getSession()) {
      toast('Войдите в систему', 'error');
      setTimeout(() => location.href = 'login.html', 800);
    }
  }

  function fillProfileHeader() {
    const s = getSession();
    if (!s) return;
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    if (nameEl) nameEl.textContent = s.fio;
    if (emailEl) emailEl.textContent = s.email;
  }

  /* ---------- Экспорт в window ---------- */

  window.MedPortal = {
    DB: DOCTORS_DB,
    getUsers, saveUsers, getSession, setSession, clearSession,
    toast, formatSnils, isValidSnils,
    initRegister, initLogin, guardAuth, fillProfileHeader
  };

  /* ---------- Авто-инициализация ---------- */

  document.addEventListener('DOMContentLoaded', () => {
    initRegister();
    initLogin();
    guardAuth();
    fillProfileHeader();
  });

})();
