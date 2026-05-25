/* Vertical-tab driver for docs/brainstorm/*.html.
   Drives the .layout/.tabs/.panel markup off the URL hash so internal
   cross-reference links (#section, #row-id) still switch tabs and scroll.
   Load with <script src="page.js" defer></script>; pages without .panel
   elements are a no-op. */
(function () {
  var panels = [].slice.call(document.querySelectorAll('.panel'));
  if (!panels.length) return;
  var tabs = [].slice.call(document.querySelectorAll('.tab'));
  var layout = document.querySelector('.layout');
  function show(id, scroll) {
    var el = id ? document.getElementById(id) : null;
    var panel = el ? (el.classList.contains('panel') ? el : el.closest('.panel')) : null;
    if (!panel) panel = panels[0];
    panels.forEach(function (p) { p.classList.toggle('active', p === panel); });
    tabs.forEach(function (t) { t.classList.toggle('active', t.getAttribute('href') === '#' + panel.id); });
    if (!scroll) return;
    // deep-link to a row: reveal it; plain tab/section switch: bring the rail+panel to top
    (el && el !== panel ? el : layout).scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', function () { show(location.hash.slice(1), true); });
  show(location.hash ? location.hash.slice(1) : null, !!location.hash);
})();
