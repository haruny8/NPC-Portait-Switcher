import('./src/app.js')
    .then(({ start }) => start())
    .catch(error => {
        console.error('[NPC Portrait Switcher] Failed to load:', error);
    });
