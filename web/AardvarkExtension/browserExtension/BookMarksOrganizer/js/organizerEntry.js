function boot() {
  // Keep a global handle for debugging (matches your earlier pattern).
  window.bookMarksOrganizerInstance = new BookMarksOrganizer();
  window.bookMarksOrganizerInstance.init(document.body);
}

try {
  boot();
} catch (e) {
  console.error('Organizer boot failed:', e);
  // Helpful top-level message in case the UI didn’t render.
  document.body.textContent =
    'Organizer boot failed — check the console for details.';
}
