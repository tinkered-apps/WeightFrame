/* One small authored icon set: 24-unit grid, 1.75 stroke, round caps and joins, currentColor.
 * Every icon in the app comes from here so they share one weight and one drawing style. */
(function (root) {
  const FH = root.FH = root.FH || {};
  const P = {
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6v.01"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6"/><path d="M12 16.9v.01"/>',
    warn: '<path d="M12 3.8 21.2 19.5H2.8z"/><path d="M12 10v4.2"/><path d="M12 17v.01"/>',
    danger: '<path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2z"/><path d="M12 7.8v5"/><path d="M12 16.3v.01"/>',
    close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
    run: '<circle cx="14.5" cy="4.5" r="1.8"/><path d="M8 21l2.8-6 3 2.5V21"/><path d="M6 11.5 9.5 8h4l2.5 3.5 3 1"/><path d="M13.5 8l-2.7 7"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>',
    refresh: '<path d="M5 12a7 7 0 1 1 2.5 5.4"/><path d="M4 20v-4h4"/>',
    trash: '<path d="M5 7h14"/><path d="M9.5 7V5.2c0-.66.54-1.2 1.2-1.2h2.6c.66 0 1.2.54 1.2 1.2V7"/><path d="M7 7l.9 12.1a2 2 0 0 0 2 1.9h4.2a2 2 0 0 0 2-1.9L17 7"/><path d="M10.2 10.5v6.5"/><path d="M13.8 10.5v6.5"/>',
    link: '<path d="M10 14 14 10"/><path d="M8.3 12.7 6 15a3.2 3.2 0 0 0 4.5 4.5l2.3-2.3"/><path d="M15.7 11.3 18 9a3.2 3.2 0 0 0-4.5-4.5l-2.3 2.3"/>',
    check: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
  };
  /** @param name key of P; @param cls optional extra class */
  function icon(name, cls) {
    return `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
  }
  FH.icon = icon;
})(typeof self !== 'undefined' ? self : this);
