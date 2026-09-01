export function createSettingsPanel({ getSettings, saveSettings, cropImage, readFileAsDataUrl, compressImage, scanCurrentChat, clearAllPortraits }) {
    function buildSettingsHTML() {
        return `
<div id="npc-portrait-panel" style="margin-bottom:10px;">
  <div id="npc-portrait-header" class="npc-ps-header">
    <b>NPC Portrait Switcher</b>
    <span id="npc-portrait-chevron" class="npc-ps-chevron">▲</span>
  </div>
  <div id="npc-portrait-body" class="npc-ps-body" style="display:block;">

    <div class="npc-ps-row">
      <label class="npc-ps-label">
        <input type="checkbox" id="npc_ps_enabled" />
        Enabled
      </label>
    </div>

    <div class="npc-ps-row">
      <label class="npc-ps-label">
        <input type="checkbox" id="npc_ps_autoclose" />
        Auto-close when next message has no keyword match
      </label>
    </div>

    <div class="npc-ps-row">
      <label class="npc-ps-label" for="npc_ps_sticky">
        Sticky replies (number of messages to keep NPC after last mention — 0 = clears immediately)
      </label>
      <input type="number" id="npc_ps_sticky" min="0" max="20" step="1" class="text_pole" style="width:80px;display:inline-block;" />
    </div>

    <div class="npc-ps-row">
      <label class="npc-ps-label">
        <input type="checkbox" id="npc_ps_case" />
        Case-sensitive matching
      </label>
    </div>

        <div class="npc-ps-row">
            <button id="npc_ps_scan_chat" class="menu_button" title="Scan the latest user and assistant messages">Scan latest messages</button>
        </div>

    <hr style="margin:10px 0;opacity:0.2;" />

    <div style="margin-bottom:4px;"><b>NPC Entries</b></div>
    <div style="margin-bottom:8px;font-size:0.85em;opacity:0.6;">Separate multiple keywords with commas. Expressions override the default portrait when their keyword also appears.</div>

    <div class="npc-ps-row" style="margin-bottom:10px;">
      <button id="npc_ps_add" class="menu_button">+ Add NPC</button>
    </div>

    <div id="npc_ps_entries" class="npc-ps-entries-scroll"></div>

  </div>
</div>`;
    }

    function renderExpressionRow(expr, exprIdx, entryIdx, settings) {
        const row = document.createElement('div');
        row.className = 'npc-ps-expr-row';
        row.dataset.entryIndex = String(entryIdx);
        row.dataset.exprIndex = String(exprIdx);

        row.innerHTML = `
        <div class="npc-ps-entry-preview">
            ${expr.imageData
                ? `<img src="${expr.imageData}" class="npc-ps-thumb" alt="expression" />`
                : `<div class="npc-ps-thumb npc-ps-thumb-empty">?</div>`}
        </div>
        <div class="npc-ps-entry-fields">
            <input type="text" class="npc-ps-expr-keyword text_pole"
                placeholder="Expression keywords, e.g. smiles, laughs, happy"
                value="${escapeHtml(expr.keyword)}" />
            <input type="text" class="npc-ps-expr-label text_pole"
                placeholder="Expression label (optional)"
                value="${escapeHtml(expr.label ?? '')}" />
            <label class="npc-ps-upload-btn menu_button" style="cursor:pointer;">
                📁 Upload Expression
                <input type="file" accept="image/*" style="display:none;" />
            </label>
        </div>
        <button class="npc-ps-expr-delete menu_button" title="Remove expression">✕</button>
    `;

        row.querySelector('.npc-ps-expr-keyword').addEventListener('input', event => {
            settings.entries[entryIdx].expressions[exprIdx].keyword = event.target.value;
            saveSettings();
        });
        row.querySelector('.npc-ps-expr-label').addEventListener('input', event => {
            settings.entries[entryIdx].expressions[exprIdx].label = event.target.value;
            saveSettings();
        });
        row.querySelector('input[type="file"]').addEventListener('change', async event => {
            const file = event.target.files[0];
            if (!file) return;
            const dataUrl = await readFileAsDataUrl(file);
            const cropped = await cropImage(dataUrl);
            if (!cropped) return;
            settings.entries[entryIdx].expressions[exprIdx].imageData = await compressImage(cropped);
            saveSettings();
            renderEntries();
        });
        return row;
    }

    function renderEntries() {
        const settings = getSettings();
        const container = document.getElementById('npc_ps_entries');
        if (!container) return;
        container.innerHTML = '';

        settings.entries.forEach((entry, idx) => {
            if (!Array.isArray(entry.expressions)) entry.expressions = [];
            if (entry.mentionsBeforeTrigger === undefined) entry.mentionsBeforeTrigger = 1;

            const card = document.createElement('div');
            card.className = 'npc-ps-entry-card';
            card.dataset.index = String(idx);

            const headerRow = document.createElement('div');
            headerRow.className = 'npc-ps-entry-row';
            headerRow.dataset.index = String(idx);
            headerRow.innerHTML = `
            <div class="npc-ps-entry-preview">
                ${entry.imageData
                    ? `<img src="${entry.imageData}" class="npc-ps-thumb" alt="portrait" />`
                    : `<div class="npc-ps-thumb npc-ps-thumb-empty">?</div>`}
            </div>
            <div class="npc-ps-entry-fields">
                <input type="text" class="npc-ps-keyword text_pole"
                    placeholder="Keywords, comma separated (e.g. Vexis, Vex)"
                    value="${escapeHtml(entry.keyword)}" />
                <input type="text" class="npc-ps-label-field text_pole"
                    placeholder="Label (optional)"
                    value="${escapeHtml(entry.label ?? '')}" />
                <div class="npc-ps-mention-field">
                    <label style="font-size:0.85em;opacity:0.7;">Mentions needed per message:</label>
                    <input type="number" class="npc-ps-mention-count text_pole"
                        min="1" max="10" step="1"
                        value="${entry.mentionsBeforeTrigger || 1}"
                        style="width:60px;display:inline-block;" />
                    <span style="font-size:0.8em;opacity:0.6;margin-left:4px;">(occurrences in one message)</span>
                </div>
                <label class="npc-ps-upload-btn menu_button" style="cursor:pointer;">
                    📁 Default Portrait
                    <input type="file" accept="image/*" style="display:none;" />
                </label>
            </div>
            <button class="npc-ps-delete menu_button" title="Remove NPC">✕</button>
        `;

            headerRow.querySelector('.npc-ps-keyword').addEventListener('input', event => {
                settings.entries[idx].keyword = event.target.value;
                saveSettings();
            });
            headerRow.querySelector('.npc-ps-label-field').addEventListener('input', event => {
                settings.entries[idx].label = event.target.value;
                saveSettings();
            });
            headerRow.querySelector('.npc-ps-mention-count').addEventListener('change', event => {
                settings.entries[idx].mentionsBeforeTrigger = Math.max(1, parseInt(event.target.value) || 1);
                saveSettings();
            });
            headerRow.querySelector('input[type="file"]').addEventListener('change', async event => {
                const file = event.target.files[0];
                if (!file) return;
                const dataUrl = await readFileAsDataUrl(file);
                const cropped = await cropImage(dataUrl);
                if (!cropped) return;
                settings.entries[idx].imageData = await compressImage(cropped);
                saveSettings();
                renderEntries();
            });
            card.appendChild(headerRow);

            const exprSection = document.createElement('div');
            exprSection.className = 'npc-ps-expr-section';

            const exprCount = entry.expressions.length;
            const exprToggle = document.createElement('div');
            exprToggle.className = 'npc-ps-expr-toggle';
            exprToggle.innerHTML = `
            <span class="npc-ps-expr-chevron">${exprCount > 0 ? '▼' : '▶'}</span>
            <span>Expressions <span class="npc-ps-expr-count">(${exprCount})</span></span>
            <button class="npc-ps-expr-add menu_button" data-entry="${idx}">+ Add Expression</button>
        `;
            exprSection.appendChild(exprToggle);

            const exprList = document.createElement('div');
            exprList.className = 'npc-ps-expr-list';
            exprList.style.display = exprCount > 0 ? 'block' : 'none';
            entry.expressions.forEach((expr, exprIdx) => {
                exprList.appendChild(renderExpressionRow(expr, exprIdx, idx, settings));
            });
            exprSection.appendChild(exprList);
            card.appendChild(exprSection);

            exprToggle.addEventListener('click', event => {
                if (event.target.closest('.npc-ps-expr-add')) return;
                const open = exprList.style.display !== 'none';
                exprList.style.display = open ? 'none' : 'block';
                exprToggle.querySelector('.npc-ps-expr-chevron').textContent = open ? '▶' : '▼';
            });

            container.appendChild(card);
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function init() {
        const settings = getSettings();
        document.getElementById('npc-portrait-switcher-settings')?.remove();

        const panel = document.createElement('div');
        panel.id = 'npc-portrait-switcher-settings';
        panel.dataset.extensionName = 'NPC Portrait Switcher';
        panel.innerHTML = buildSettingsHTML();
        const target = document.getElementById('extensions_settings2') ?? document.getElementById('extensions_settings');
        if (!target) {
            console.warn('[NPC Portrait Switcher] Could not find extensions settings container.');
            return;
        }
        target.appendChild(panel);

        const header = document.getElementById('npc-portrait-header');
        const body = document.getElementById('npc-portrait-body');
        const chev = document.getElementById('npc-portrait-chevron');
        header.addEventListener('click', () => {
            const open = body.style.display !== 'none';
            body.style.display = open ? 'none' : 'block';
            chev.textContent = open ? '▼' : '▲';
        });

        const enabledCb = document.getElementById('npc_ps_enabled');
        enabledCb.checked = settings.enabled;
        enabledCb.addEventListener('change', event => {
            settings.enabled = event.target.checked;
            saveSettings();
            if (!settings.enabled) clearAllPortraits();
        });

        const autocloseCb = document.getElementById('npc_ps_autoclose');
        autocloseCb.checked = settings.autoClose;
        autocloseCb.addEventListener('change', event => {
            settings.autoClose = event.target.checked;
            saveSettings();
        });

        const stickyInput = document.getElementById('npc_ps_sticky');
        stickyInput.value = settings.stickyReplies;
        stickyInput.addEventListener('change', event => {
            settings.stickyReplies = Math.max(0, parseInt(event.target.value) || 0);
            saveSettings();
        });

        const caseCb = document.getElementById('npc_ps_case');
        caseCb.checked = settings.caseSensitive;
        caseCb.addEventListener('change', event => {
            settings.caseSensitive = event.target.checked;
            saveSettings();
        });

        document.getElementById('npc_ps_scan_chat').addEventListener('click', scanCurrentChat);
        renderEntries();
    }

    function handleDocumentClick(event) {
        if (event.target.closest('#npc_ps_add')) {
            const settings = getSettings();
            settings.entries.push({ keyword: '', imageData: '', label: '', expressions: [], mentionsBeforeTrigger: 1 });
            saveSettings();
            renderEntries();
            return true;
        }

        const deleteBtn = event.target.closest('.npc-ps-delete');
        if (deleteBtn) {
            const row = deleteBtn.closest('.npc-ps-entry-row');
            if (row) {
                const settings = getSettings();
                settings.entries.splice(parseInt(row.dataset.index), 1);
                saveSettings();
                renderEntries();
            }
            return true;
        }

        const addExprBtn = event.target.closest('.npc-ps-expr-add');
        if (addExprBtn) {
            const entryIdx = parseInt(addExprBtn.dataset.entry);
            const settings = getSettings();
            if (!Array.isArray(settings.entries[entryIdx].expressions)) settings.entries[entryIdx].expressions = [];
            settings.entries[entryIdx].expressions.push({ keyword: '', imageData: '', label: '' });
            saveSettings();
            renderEntries();
            return true;
        }

        const deleteExprBtn = event.target.closest('.npc-ps-expr-delete');
        if (deleteExprBtn) {
            const row = deleteExprBtn.closest('.npc-ps-expr-row');
            if (row) {
                const settings = getSettings();
                settings.entries[parseInt(row.dataset.entryIndex)].expressions.splice(parseInt(row.dataset.exprIndex), 1);
                saveSettings();
                renderEntries();
            }
            return true;
        }

        return false;
    }

    return { handleDocumentClick, init, renderEntries };
}