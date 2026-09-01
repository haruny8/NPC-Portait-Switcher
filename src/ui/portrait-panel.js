function getPortraitImages(getSettings, entryIdx) {
    const entry = getSettings().entries[entryIdx];
    if (!entry) return [];

    const images = [];
    if (entry.imageData) images.push({ src: entry.imageData, label: entry.label || 'Default' });
    for (const expr of (entry.expressions || [])) {
        if (expr.imageData) images.push({ src: expr.imageData, label: expr.label || expr.keyword || 'Expression' });
    }
    return images;
}

export function createPortraitPanel({ getSettings, state, splitKeywords, onSelectNPC = () => {} }) {
    function isMobileView() {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    function openPortraitModal() {
        ensurePanel();
        document.getElementById('npc-ps-modal')?.classList.add('visible');
        document.getElementById('npc-ps-backdrop')?.classList.add('visible');
    }

    function closePortraitModal() {
        document.getElementById('npc-ps-modal')?.classList.remove('visible');
        document.getElementById('npc-ps-backdrop')?.classList.remove('visible');
    }

    function isPortraitModalOpen() {
        return document.getElementById('npc-ps-modal')?.classList.contains('visible') ?? false;
    }

    function ensurePanel() {
        let panel = document.getElementById('npc-ps-portrait-panel');
        if (panel) return panel;

        panel = document.createElement('div');
        panel.id = 'npc-ps-portrait-panel';

        const tray = document.createElement('div');
        tray.id = 'npc-ps-tray';
        panel.appendChild(tray);

        const modal = document.createElement('div');
        modal.id = 'npc-ps-modal';

        const controlBar = document.createElement('div');
        controlBar.className = 'panelControlBar';
        const closeBtn = document.createElement('div');
        closeBtn.id = 'npc-ps-close';
        closeBtn.className = 'dragClose';
        closeBtn.title = 'Close portrait';
        closeBtn.innerHTML = '✕';
        closeBtn.addEventListener('click', closePortraitModal);
        controlBar.appendChild(closeBtn);
        modal.appendChild(controlBar);

        const container = document.createElement('div');
        container.id = 'npc-ps-portrait-container';
        container.className = 'zoomed_avatar_container';
        const img = document.createElement('img');
        img.id = 'npc-ps-portrait-img';
        container.appendChild(img);

        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.id = 'npc-ps-zoom-out';
        zoomOutBtn.type = 'button';
        zoomOutBtn.title = 'Zoom out';
        zoomOutBtn.setAttribute('aria-label', 'Zoom out');
        zoomOutBtn.innerHTML = '&#8722;';
        const zoomInBtn = document.createElement('button');
        zoomInBtn.id = 'npc-ps-zoom-in';
        zoomInBtn.type = 'button';
        zoomInBtn.title = 'Zoom in';
        zoomInBtn.setAttribute('aria-label', 'Zoom in');
        zoomInBtn.innerHTML = '+';

        let zoom = 1;
        let panX = 0;
        let panY = 0;
        let panStart = null;
        const activePointers = new Map();
        let pinchStart = null;

        const updateImageTransform = () => {
            img.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
            zoomOutBtn.disabled = zoom <= 1;
            zoomInBtn.disabled = zoom >= 3;
        };

        const resetImageView = () => {
            zoom = 1;
            panX = 0;
            panY = 0;
            updateImageTransform();
        };
        container.npcPsResetImageView = resetImageView;

        const setZoom = nextZoom => {
            zoom = Math.min(3, Math.max(1, Number(nextZoom.toFixed(2))));
            if (zoom === 1) {
                panX = 0;
                panY = 0;
            }
            updateImageTransform();
        };
        const changeZoom = amount => setZoom(zoom + amount);

        const getPointerDistance = () => {
            const [firstPointer, secondPointer] = [...activePointers.values()];
            return Math.hypot(secondPointer.x - firstPointer.x, secondPointer.y - firstPointer.y);
        };

        zoomOutBtn.addEventListener('click', () => changeZoom(-0.25));
        zoomInBtn.addEventListener('click', () => changeZoom(0.25));
        container.addEventListener('pointerdown', event => {
            activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            container.setPointerCapture(event.pointerId);
            if (activePointers.size === 2) {
                pinchStart = { distance: getPointerDistance(), zoom };
                panStart = null;
                return;
            }
            if (zoom <= 1) return;
            panStart = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, panX, panY };
        });
        container.addEventListener('pointermove', event => {
            if (!activePointers.has(event.pointerId)) return;
            activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (pinchStart && activePointers.size >= 2) {
                setZoom(pinchStart.zoom * (getPointerDistance() / pinchStart.distance));
                return;
            }
            if (!panStart || event.pointerId !== panStart.pointerId) return;
            panX = panStart.panX + event.clientX - panStart.x;
            panY = panStart.panY + event.clientY - panStart.y;
            updateImageTransform();
        });
        const endPointerInteraction = event => {
            activePointers.delete(event.pointerId);
            if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
            panStart = null;
            pinchStart = activePointers.size >= 2 ? { distance: getPointerDistance(), zoom } : null;
        };
        container.addEventListener('pointerup', endPointerInteraction);
        container.addEventListener('pointercancel', endPointerInteraction);
        container.addEventListener('wheel', event => {
            if (event.deltaY === 0) return;
            event.preventDefault();
            changeZoom(event.deltaY < 0 ? 0.1 : -0.1);
        }, { passive: false });
        updateImageTransform();
        modal.appendChild(container);

        const nameplate = document.createElement('div');
        nameplate.id = 'npc-ps-nameplate';
        nameplate.className = 'npc-ps-nameplate';
        const nameText = document.createElement('button');
        nameText.id = 'npc-ps-name-text';
        nameText.type = 'button';
        nameText.title = 'Choose an NPC';
        nameText.setAttribute('aria-expanded', 'false');
        nameText.addEventListener('click', () => {
            if (!isMobileView() || state.sceneNPCs.size < 2) return;
            const picker = document.getElementById('npc-ps-npc-picker');
            if (!picker) return;
            const isOpen = picker.classList.toggle('visible');
            nameText.setAttribute('aria-expanded', String(isOpen));
        });
        const positionText = document.createElement('span');
        positionText.id = 'npc-ps-position-text';
        positionText.className = 'npc-ps-nameplate-position';
        nameplate.append(nameText, positionText);
        modal.appendChild(nameplate);

        const picker = document.createElement('div');
        picker.id = 'npc-ps-npc-picker';
        picker.setAttribute('aria-label', 'NPCs in scene');
        modal.appendChild(picker);

        const navBar = document.createElement('div');
        navBar.id = 'npc-ps-nav';
        navBar.classList.add('npc-ps-nav-hidden');

        const prevBtn = document.createElement('button');
        prevBtn.id = 'npc-ps-prev';
        prevBtn.title = 'Previous portrait';
        prevBtn.innerHTML = '&#8249;';
        prevBtn.addEventListener('click', () => stepPortrait(-1));

        const navLabel = document.createElement('span');
        navLabel.id = 'npc-ps-nav-label';

        const nextBtn = document.createElement('button');
        nextBtn.id = 'npc-ps-next';
        nextBtn.title = 'Next portrait';
        nextBtn.innerHTML = '&#8250;';
        nextBtn.addEventListener('click', () => stepPortrait(1));

        const leftControls = document.createElement('div');
        leftControls.className = 'npc-ps-nav-side';
        leftControls.append(prevBtn, zoomOutBtn);
        const rightControls = document.createElement('div');
        rightControls.className = 'npc-ps-nav-side';
        rightControls.append(zoomInBtn, nextBtn);
        navBar.append(leftControls, navLabel, rightControls);
        modal.appendChild(navBar);

        panel.appendChild(modal);
        document.body.appendChild(panel);

        if (!document.getElementById('npc-ps-backdrop')) {
            const backdrop = document.createElement('div');
            backdrop.id = 'npc-ps-backdrop';
            backdrop.addEventListener('click', closePortraitModal);
            document.body.appendChild(backdrop);
        }

        return panel;
    }

    function updateNavLabel() {
        const nav = document.getElementById('npc-ps-nav');
        const label = document.getElementById('npc-ps-nav-label');
        const nameText = document.getElementById('npc-ps-name-text');
        const positionText = document.getElementById('npc-ps-position-text');
        if (!nav || !label) return;

        if (state.activeEntryIdx === null) {
            nav.classList.add('npc-ps-nav-hidden');
            if (nameText) nameText.textContent = '';
            if (positionText) positionText.textContent = '';
            renderNpcPicker();
            return;
        }

        const npcState = state.sceneNPCs.get(state.activeEntryIdx);
        const images = getPortraitImages(getSettings, state.activeEntryIdx);
        const sceneEntries = [...state.sceneNPCs.keys()];
        const activeScenePosition = sceneEntries.indexOf(state.activeEntryIdx) + 1;
        const entry = getSettings().entries[state.activeEntryIdx];
        const npcLabel = entry?.label || splitKeywords(entry?.keyword)[0] || 'NPC';

        if (nameText) nameText.textContent = npcLabel;
        if (positionText) {
            positionText.textContent = sceneEntries.length > 1
                ? `${activeScenePosition} / ${sceneEntries.length}`
                : (images.length > 1 ? `${npcState ? npcState.imageIdx + 1 : 1} / ${images.length}` : '');
        }

        if (!npcState || (images.length <= 1 && sceneEntries.length <= 1)) {
            nav.classList.add('npc-ps-nav-hidden');
            label.textContent = '';
        } else {
            nav.classList.remove('npc-ps-nav-hidden');
            label.textContent = sceneEntries.length > 1
                ? `${npcLabel} ${activeScenePosition} / ${sceneEntries.length}`
                : `${npcState.imageIdx + 1} / ${images.length}`;
        }

        renderNpcPicker();
    }

    function renderNpcPicker() {
        const picker = document.getElementById('npc-ps-npc-picker');
        const nameText = document.getElementById('npc-ps-name-text');
        if (!picker || !nameText) return;

        picker.replaceChildren();
        const settings = getSettings();
        for (const entryIdx of state.sceneNPCs.keys()) {
            const entry = settings.entries[entryIdx];
            if (!entry) continue;

            const npcLabel = entry.label || splitKeywords(entry.keyword)[0] || 'NPC';
            const option = document.createElement('button');
            option.type = 'button';
            option.className = 'npc-ps-npc-picker-option';
            option.textContent = npcLabel;
            option.classList.toggle('active', entryIdx === state.activeEntryIdx);
            option.addEventListener('click', () => {
                state.pinnedEntryIdx = entryIdx;
                picker.classList.remove('visible');
                nameText.setAttribute('aria-expanded', 'false');
                onSelectNPC(entryIdx, { open: true });
            });
            picker.appendChild(option);
        }

        if (state.sceneNPCs.size < 2) {
            picker.classList.remove('visible');
            nameText.setAttribute('aria-expanded', 'false');
        }
    }

    function stepPortrait(direction) {
        if (state.sceneNPCs.size > 1) {
            const sceneEntries = [...state.sceneNPCs.keys()];
            const currentPosition = sceneEntries.indexOf(state.activeEntryIdx);
            const nextPosition = (currentPosition + direction + sceneEntries.length) % sceneEntries.length;
            state.pinnedEntryIdx = sceneEntries[nextPosition];
            onSelectNPC(state.pinnedEntryIdx, { open: true });
            return;
        }

        stepExpression(direction);
    }

    function stepExpression(direction) {
        if (state.activeEntryIdx === null) return;
        const npcState = state.sceneNPCs.get(state.activeEntryIdx);
        const images = getPortraitImages(getSettings, state.activeEntryIdx);
        if (!npcState || images.length <= 1) return;

        npcState.imageIdx = (npcState.imageIdx + direction + images.length) % images.length;

        const img = document.getElementById('npc-ps-portrait-img');
        if (img) {
            img.src = images[npcState.imageIdx].src;
            document.getElementById('npc-ps-portrait-container')?.npcPsResetImageView?.();
        }
        updateNavLabel();
    }

    function showActiveNPC(entryIdx, { open = true } = {}) {
        const npcState = state.sceneNPCs.get(entryIdx);
        if (!npcState) return;

        state.activeEntryIdx = entryIdx;
        ensurePanel();

        const images = getPortraitImages(getSettings, entryIdx);
        const src = images[npcState.imageIdx]?.src || images[0]?.src;
        if (!src) return;

        const img = document.getElementById('npc-ps-portrait-img');
        if (img) {
            img.src = src;
            document.getElementById('npc-ps-portrait-container')?.npcPsResetImageView?.();
        }

        if (open) openPortraitModal();
        updateNavLabel();
    }

    return {
        close: closePortraitModal,
        ensurePanel,
        isOpen: isPortraitModalOpen,
        open: openPortraitModal,
        showActiveNPC,
        updateNavLabel,
    };
}