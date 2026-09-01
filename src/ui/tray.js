export function createTrayController({ getSettings, saveSettings, state, splitKeywords, ensurePanel, onSelectNPC = () => {} }) {
    let removeMobileButtonViewportListeners = null;

    function isMobileView() {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    function positionMobilePortraitButton(button, position) {
        const viewport = window.visualViewport;
        const inset = 8;
        const width = button.offsetWidth;
        const height = button.offsetHeight;
        const leftEdge = (viewport?.offsetLeft ?? 0) + inset;
        const topEdge = (viewport?.offsetTop ?? 0) + inset;
        const rightEdge = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth) - width - inset;
        const bottomEdge = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - height - inset;
        const left = Math.min(Math.max(leftEdge, position.left), Math.max(leftEdge, rightEdge));
        const top = Math.min(Math.max(topEdge, position.top), Math.max(topEdge, bottomEdge));

        button.style.left = `${left}px`;
        button.style.top = `${top}px`;
        button.style.right = 'auto';
        button.style.bottom = 'auto';
    }

    function makeMobilePortraitButton() {
        const button = document.createElement('button');
        button.id = 'npc-ps-mobile-button';
        button.type = 'button';
        button.title = 'Show active NPC portrait';
        button.setAttribute('aria-label', 'Show active NPC portrait');
        button.innerHTML = '<i class="fa-solid fa-image-portrait"></i>';

        const settings = getSettings();
        const savedPosition = settings.mobileButtonPosition;
        if (savedPosition && Number.isFinite(savedPosition.left) && Number.isFinite(savedPosition.top)) {
            positionMobilePortraitButton(button, savedPosition);
        }

        const restoreSavedPosition = () => {
            const position = settings.mobileButtonPosition;
            if (position && Number.isFinite(position.left) && Number.isFinite(position.top)) {
                positionMobilePortraitButton(button, position);
            }
        };
        const viewport = window.visualViewport;
        viewport?.addEventListener('resize', restoreSavedPosition);
        viewport?.addEventListener('scroll', restoreSavedPosition);
        window.addEventListener('resize', restoreSavedPosition);
        removeMobileButtonViewportListeners = () => {
            viewport?.removeEventListener('resize', restoreSavedPosition);
            viewport?.removeEventListener('scroll', restoreSavedPosition);
            window.removeEventListener('resize', restoreSavedPosition);
        };

        let dragStart = null;
        let moved = false;

        button.addEventListener('pointerdown', event => {
            dragStart = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                left: button.getBoundingClientRect().left,
                top: button.getBoundingClientRect().top,
            };
            moved = false;
            button.setPointerCapture(event.pointerId);
        });

        button.addEventListener('pointermove', event => {
            if (!dragStart || event.pointerId !== dragStart.pointerId) return;

            const position = {
                left: dragStart.left + event.clientX - dragStart.x,
                top: dragStart.top + event.clientY - dragStart.y,
            };
            moved = moved || Math.abs(event.clientX - dragStart.x) > 4 || Math.abs(event.clientY - dragStart.y) > 4;
            positionMobilePortraitButton(button, position);
        });

        button.addEventListener('pointerup', event => {
            if (!dragStart || event.pointerId !== dragStart.pointerId) return;
            button.releasePointerCapture(event.pointerId);
            if (moved) {
                settings.mobileButtonPosition = {
                    left: Math.round(button.getBoundingClientRect().left),
                    top: Math.round(button.getBoundingClientRect().top),
                };
                saveSettings();
            }
            dragStart = null;
        });

        button.addEventListener('click', event => {
            if (moved) {
                event.preventDefault();
                return;
            }
            const entryIdx = state.activeEntryIdx ?? state.sceneNPCs.keys().next().value;
            if (entryIdx !== undefined) onSelectNPC(entryIdx, { open: true });
        });

        return button;
    }

    function render() {
        const panel = ensurePanel();
        const tray = panel.querySelector('#npc-ps-tray');
        if (!tray) return;

        if (state.sceneNPCs.size === 0) {
            removeMobileButtonViewportListeners?.();
            removeMobileButtonViewportListeners = null;
            tray.innerHTML = '';
            tray.style.display = 'none';
            return;
        }

        tray.style.display = 'flex';

        if (isMobileView()) {
            if (!document.getElementById('npc-ps-mobile-button')) {
                tray.appendChild(makeMobilePortraitButton());
            }
            return;
        }

        removeMobileButtonViewportListeners?.();
        removeMobileButtonViewportListeners = null;
        tray.innerHTML = '';

        const settings = getSettings();
        for (const [entryIdx] of state.sceneNPCs) {
            const entry = settings.entries[entryIdx];
            if (!entry) continue;

            const icon = document.createElement('div');
            icon.className = 'npc-ps-tray-icon';
            icon.dataset.entryIdx = String(entryIdx);
            icon.title = entry.label || splitKeywords(entry.keyword)[0] || 'NPC';
            if (entryIdx === state.activeEntryIdx) icon.classList.add('active');

            const img = document.createElement('img');
            img.src = entry.imageData || '';
            img.alt = icon.title;
            icon.appendChild(img);

            icon.addEventListener('click', () => {
                state.pinnedEntryIdx = entryIdx;
                onSelectNPC(entryIdx, { open: true });
            });

            tray.appendChild(icon);
        }

        if (state.sceneNPCs.size > 1) {
            const count = document.createElement('span');
            count.id = 'npc-ps-tray-count';
            count.className = 'npc-ps-tray-count';
            count.textContent = `${state.sceneNPCs.size} in scene`;
            tray.appendChild(count);
        }
    }

    return { render };
}