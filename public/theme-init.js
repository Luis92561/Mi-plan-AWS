/*
 * Script de arranque del tema. Se carga en <head> (bloqueante) para aplicar
 * `data-theme` antes del primer paint y evitar el flash de tema equivocado.
 * Vive en un archivo externo (no inline) porque la CSP del producto es
 * `script-src 'self'` sin 'unsafe-inline'.
 */
(function () {
  var KEY = 'miplan-aws:prefs';
  var theme = 'dark';
  try {
    var raw = window.localStorage.getItem(KEY);
    if (raw) {
      var prefs = JSON.parse(raw);
      if (prefs && (prefs.theme === 'dark' || prefs.theme === 'light' || prefs.theme === 'system')) {
        theme = prefs.theme;
      }
      if (prefs && typeof prefs.fontScale === 'number') {
        document.documentElement.style.setProperty('--fs-base', String(prefs.fontScale));
      }
      if (prefs && prefs.fontMode === 'lectura') {
        document.documentElement.setAttribute('data-font', 'lectura');
      }
      if (prefs && typeof prefs.locale === 'string') {
        document.documentElement.setAttribute('lang', prefs.locale === 'en' ? 'en' : 'es');
      }
    }
  } catch (e) {
    /* preferencias corruptas: se sigue con los defaults */
  }
  var resolved = theme;
  if (theme === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.setAttribute('data-theme-pref', theme);
})();
