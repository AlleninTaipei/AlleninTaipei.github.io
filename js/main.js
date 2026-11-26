(function () {
  'use strict';

  const CATEGORIES = ['native', 'api', 'local', 'pages', 'notes'];
  const CATEGORY_ICONS = {
    native: 'bi-stars',
    api: 'bi-key',
    local: 'bi-laptop',
    pages: 'bi-globe2',
    notes: 'bi-journal-text',
  };
  const projects = window.PROJECTS || [];

  const state = { lang: 'zh', filter: 'all', query: '' };

  // 只顯示有專案的類別
  const activeCategories = () => CATEGORIES.filter((c) => projects.some((p) => p.category === c));

  const $ = (sel) => document.querySelector(sel);
  const t = (key) => window.I18N[state.lang][key] || key;

  // localStorage 在私密模式可能失效, 一律包 try/catch
  function loadLang() {
    try {
      const saved = localStorage.getItem('lang');
      if (saved === 'zh' || saved === 'en') return saved;
    } catch (e) { /* 忽略 */ }
    return navigator.language.startsWith('zh') ? 'zh' : 'en';
  }

  function saveLang(lang) {
    try { localStorage.setItem('lang', lang); } catch (e) { /* 忽略 */ }
  }

  // 說明文字中的 `code` 轉成 <code>, 其餘一律當純文字, 避免 XSS
  function renderRichText(el, text) {
    el.textContent = '';
    text.split('`').forEach((part, i) => {
      if (!part) return;
      if (i % 2 === 1) {
        const code = document.createElement('code');
        code.textContent = part;
        el.appendChild(code);
      } else {
        el.appendChild(document.createTextNode(part));
      }
    });
  }

  function applyStaticText() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-Hant' : 'en';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === state.lang);
    });
  }

  function renderStats() {
    const count = (cats) => projects.filter((p) => cats.includes(p.category)).length;
    const stats = [
      ['stats.total', projects.length],
      ['stats.native', count(['native'])],
      ['stats.dev', count(['api', 'local', 'pages', 'notes'])],
      ['stats.pages', count(['pages'])],
    ];
    const box = $('#stats');
    box.textContent = '';
    stats.forEach(([key, value]) => {
      const col = document.createElement('div');
      col.className = 'col-6 col-md-3';
      col.innerHTML = '<div class="stat"><div class="stat-value"></div><div class="stat-label"></div></div>';
      col.querySelector('.stat-value').textContent = value;
      col.querySelector('.stat-label').textContent = t(key);
      box.appendChild(col);
    });
  }

  function renderFilters() {
    const box = $('#filters');
    box.textContent = '';
    ['all', ...activeCategories()].forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-sm btn-outline-secondary' + (state.filter === cat ? ' active' : '');
      btn.textContent = cat === 'all' ? t('filter.all') : t('cat.' + cat);
      btn.addEventListener('click', () => {
        state.filter = cat;
        renderFilters();
        renderProjects();
      });
      box.appendChild(btn);
    });
  }

  function matches(p) {
    if (state.filter !== 'all' && p.category !== state.filter) return false;
    if (!state.query) return true;
    const haystack = [
      ...p.links.map((l) => l.name),
      p.desc.zh, p.desc.en, ...p.providers,
    ].join(' ').toLowerCase();
    return haystack.includes(state.query);
  }

  function renderProjects() {
    const list = $('#project-list');
    list.textContent = '';
    const visible = projects.filter(matches);

    visible.forEach((p) => {
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4';
      col.innerHTML = `
        <article class="project-card h-100">
          <div class="d-flex align-items-center gap-2 mb-3">
            <i class="bi ${CATEGORY_ICONS[p.category]} category-icon"></i>
            <span class="category-label"></span>
          </div>
          <h3 class="project-title"></h3>
          <p class="project-desc"></p>
          <div class="d-flex flex-wrap gap-1 mt-auto providers"></div>
        </article>`;

      col.querySelector('.category-label').textContent = t('cat.' + p.category);

      const title = col.querySelector('.project-title');
      p.links.forEach((link, i) => {
        if (i > 0) title.appendChild(document.createTextNode(', '));
        const a = document.createElement('a');
        a.href = link.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = link.name;
        title.appendChild(a);
      });

      renderRichText(col.querySelector('.project-desc'), p.desc[state.lang] || p.desc.zh);

      const providers = col.querySelector('.providers');
      p.providers.forEach((name) => {
        const tag = document.createElement('span');
        tag.className = 'badge rounded-pill bg-body-secondary text-body border';
        tag.textContent = name;
        providers.appendChild(tag);
      });

      list.appendChild(col);
    });

    $('#empty').classList.toggle('d-none', visible.length > 0);
  }

  function renderCategoryCards() {
    const box = $('#category-cards');
    box.textContent = '';
    activeCategories().forEach((cat) => {
      const n = projects.filter((p) => p.category === cat).length;
      const col = document.createElement('div');
      col.className = 'col-sm-6';
      col.innerHTML = `
        <button type="button" class="category-card w-100 text-start">
          <i class="bi ${CATEGORY_ICONS[cat]} category-icon fs-4"></i>
          <div class="fw-semibold mt-2"><span class="name"></span> <span class="text-body-secondary">(${n})</span></div>
          <div class="small text-body-secondary desc"></div>
        </button>`;
      col.querySelector('.name').textContent = t('cat.' + cat);
      col.querySelector('.desc').textContent = t('catdesc.' + cat);
      // 點類別卡片直接跳到作品區並套用篩選
      col.querySelector('button').addEventListener('click', () => {
        state.filter = cat;
        renderFilters();
        renderProjects();
        scrollToId('#projects');
      });
      box.appendChild(col);
    });
  }

  function renderAll() {
    applyStaticText();
    renderStats();
    renderFilters();
    renderProjects();
    renderCategoryCards();
  }

  function scrollToId(id) {
    const target = $(id);
    if (!target) return;
    const offset = $('#header').offsetHeight;
    window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
  }

  function initNav() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        e.preventDefault();
        scrollToId(id);
        // 手機版選單點完自動收合
        const menu = $('#navbarNav');
        if (menu.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(menu).hide();
      });
    });

    const header = $('#header');
    const backToTop = $('#backToTop');
    const onScroll = () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
      backToTop.classList.toggle('show', window.scrollY > 300);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  document.addEventListener('DOMContentLoaded', () => {
    state.lang = loadLang();

    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.lang = btn.dataset.lang;
        saveLang(state.lang);
        renderAll();
      });
    });

    $('#search').addEventListener('input', (e) => {
      state.query = e.target.value.trim().toLowerCase();
      renderProjects();
    });

    // 跟隨系統深淺色切換
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      document.documentElement.setAttribute('data-bs-theme', e.matches ? 'dark' : 'light');
    });

    $('#year').textContent = new Date().getFullYear();
    initNav();
    renderAll();
  });
})();
