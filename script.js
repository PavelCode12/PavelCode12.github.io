(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Браузер может прервать переход (вкладка в фоне и т.п.) — это не ошибка
  function quiet(vt) {
    vt.ready.catch(function () {});
    return vt.finished.catch(function () {});
  }

  // Тема: системная по умолчанию, выбор сохраняется; смена — кругом от кнопки
  var themeBtn = document.getElementById('theme-toggle');
  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function updateThemeLabel() {
    themeBtn.setAttribute('aria-label', currentTheme() === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему');
  }
  function applyTheme(next) {
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    updateThemeLabel();
  }
  themeBtn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || reduceMotion) return applyTheme(next);
    var r = themeBtn.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    root.style.setProperty('--tx', x + 'px');
    root.style.setProperty('--ty', y + 'px');
    root.style.setProperty('--tr', Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 'px');
    root.classList.add('theme-vt');
    quiet(document.startViewTransition(function () { applyTheme(next); }))
      .finally(function () { root.classList.remove('theme-vt'); });
  });
  updateThemeLabel();

  // Мобильное меню
  var menuBtn = document.getElementById('menu-toggle');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }
  menuBtn.addEventListener('click', function () {
    setMenu(!nav.classList.contains('open'));
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      setMenu(false);
      menuBtn.focus();
    }
  });

  // Прокрутка: полоса прогресса, тень шапки, кнопка «Наверх»
  var header = document.getElementById('header');
  var progress = document.getElementById('progress');
  var toTop = document.getElementById('to-top');
  var ticking = false;
  function onScroll() {
    var max = document.documentElement.scrollHeight - innerHeight;
    var y = scrollY;
    progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    header.classList.toggle('scrolled', y > 8);
    toTop.classList.toggle('show', y > innerHeight * 0.8);
    ticking = false;
  }
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  toTop.addEventListener('click', function () {
    scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    document.querySelector('.logo').focus({ preventScroll: true });
  });

  // Подсветка текущего раздела в меню
  var links = {};
  nav.querySelectorAll('a').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      Object.keys(links).forEach(function (id) { links[id].classList.toggle('active', id === en.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  document.querySelectorAll('main section[id]').forEach(function (s) { spy.observe(s); });

  // Появление блоков при прокрутке (с лесенкой для соседей)
  var groups = new Map();
  document.querySelectorAll('.reveal').forEach(function (el) {
    var siblings = groups.get(el.parentElement) || 0;
    el.style.setProperty('--i', siblings);
    groups.set(el.parentElement, siblings + 1);
  });
  var revealer = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      el.classList.add('visible');
      revealer.unobserve(el);
      // После появления карточкам нужен быстрый transition для наведения
      if (el.classList.contains('card')) setTimeout(function () { el.classList.add('settled'); }, 1200);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(function (el) { revealer.observe(el); });

  // Сменяющееся слово в hero
  var words = ['веб-сервисы', 'сайты под ключ', 'Telegram-ботов', 'автоматизацию'];
  var rotator = document.getElementById('rotator');
  if (!reduceMotion) {
    var w = 0;
    setInterval(function () {
      if (document.hidden) return;
      rotator.classList.remove('in');
      rotator.classList.add('out');
      setTimeout(function () {
        w = (w + 1) % words.length;
        rotator.textContent = words[w];
        rotator.classList.remove('out');
        rotator.classList.add('in');
      }, 350);
    }, 2800);
  }

  var cards = Array.prototype.slice.call(document.querySelectorAll('#projects-list .card'));

  // Пятно света за курсором на карточках
  cards.forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // Копирование текста; fallback через скрытое поле для file:// и старых браузеров
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return ok ? Promise.resolve() : Promise.reject();
  }

  // Копирование ника
  var copyBtn = document.getElementById('copy-handle');
  var note = document.getElementById('copy-note');
  copyBtn.addEventListener('click', function () {
    copyText(copyBtn.dataset.handle).then(
      function () { note.textContent = 'Ник скопирован'; },
      function () { note.textContent = 'Не удалось скопировать — выделите ник выше'; }
    );
    setTimeout(function () { note.textContent = ''; }, 3000);
  });

  // Форма: копирует сообщение и открывает чат в Telegram
  var form = document.getElementById('contact-form');
  var hint = document.getElementById('form-hint');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name, msg = form.elements.message;
    var empty = [name, msg].filter(function (f) { return !f.value.trim(); });
    [name, msg].forEach(function (f) { f.setAttribute('aria-invalid', String(empty.indexOf(f) !== -1)); });
    if (empty.length) {
      hint.textContent = 'Заполните оба поля.';
      empty[0].focus();
      return;
    }
    var text = 'Здравствуйте, Павел! Меня зовут ' + name.value.trim() + '.\n\n' + msg.value.trim();
    var chat = 'https://t.me/' + form.dataset.tg;
    copyText(text).then(
      function () { hint.textContent = 'Текст скопирован — вставьте его в открывшийся чат.'; },
      function () { hint.textContent = 'Чат открыт — скопируйте текст из формы и отправьте его.'; }
    ).finally(function () {
      window.open(chat, '_blank', 'noopener');
    });
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
