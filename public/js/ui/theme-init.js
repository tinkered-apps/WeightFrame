/* Apply a saved manual theme before first paint, so a dark-mode user never sees a light flash. */
try { var t = localStorage.getItem('weightframe.theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch (e) {}
