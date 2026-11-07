/* =========================================================
   NadiKampus — Theme Manager (Dark & Light Mode)
   Menjaga preferensi tema secara persisten & bebas flicker
   ========================================================= */
(function () {
  'use strict';

  // Inisialisasi tema default (selalu terang / cerah di awal buka)
  function getPreferredTheme() {
    var stored = localStorage.getItem('nk_theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    
    // Perbarui semua tombol toggle di halaman
    var buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(function (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap');
      btn.setAttribute('title', theme === 'dark' ? 'Mode Gelap (Klik untuk Terang)' : 'Mode Terang (Klik untuk Gelap)');
      btn.classList.toggle('is-dark', theme === 'dark');
    });

    // Kirim event agar grafik atau komponen lain dapat mendeteksi perubahan
    window.dispatchEvent(new CustomEvent('nk_theme_change', { detail: { theme: theme } }));
  }

  // Terapkan tema saat ini
  var currentTheme = getPreferredTheme();
  applyTheme(currentTheme);

  // Inisialisasi event listener setelah DOM selesai dimuat
  function initThemeToggle() {
    var buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem('nk_theme', now);
        applyTheme(now);

        // Tampilkan toast jika fungsi toast tersedia (di dashboard)
        if (typeof window.nkToast === 'function') {
          window.nkToast(now === 'dark' ? '🌙 Mode Gelap Aktif' : '☀️ Mode Terang Aktif');
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeToggle);
  } else {
    initThemeToggle();
  }

  // Ekspor global helper
  window.nkTheme = {
    get: function () { return document.documentElement.getAttribute('data-theme') || 'light'; },
    set: function (t) {
      localStorage.setItem('nk_theme', t);
      applyTheme(t);
    },
    toggle: function () {
      var next = this.get() === 'dark' ? 'light' : 'dark';
      this.set(next);
      return next;
    }
  };
})();
