import { defaultSettings, MODULE_NAME } from '../config.js';

export function createSettingsStore(getContext = () => SillyTavern.getContext()) {
    function getSettings() {
        const context = getContext();
        const { extensionSettings } = context;
        if (!extensionSettings[MODULE_NAME]) {
            extensionSettings[MODULE_NAME] = structuredClone(defaultSettings);
        }
        const stored = extensionSettings[MODULE_NAME];
        for (const key of Object.keys(defaultSettings)) {
            if (stored[key] === undefined) {
                stored[key] = structuredClone(defaultSettings[key]);
            }
        }
        const characterId = context.characterId;
        if (characterId === undefined || characterId === null) return stored;

        const entryStoreKey = String(characterId);
        if (!Array.isArray(stored.entriesByCharacter[entryStoreKey])) {
            const legacyEntries = context.characters?.[characterId]?.data?.extensions?.[MODULE_NAME]?.entries;
            stored.entriesByCharacter[entryStoreKey] = structuredClone(
                Array.isArray(legacyEntries)
                    ? legacyEntries
                    : (!stored.entriesMigrated ? stored.entries ?? [] : []),
            );
            stored.entriesMigrated = true;
            stored.entries = [];
            context.saveSettingsDebounced();
        }

        return new Proxy(stored, {
            get(target, property) {
                return property === 'entries' ? target.entriesByCharacter[entryStoreKey] : target[property];
            },
            set(target, property, value) {
                if (property === 'entries') {
                    target.entriesByCharacter[entryStoreKey] = value;
                } else {
                    target[property] = value;
                }
                return true;
            },
        });
    }

    function saveSettings() {
        const context = getContext();
        getSettings();
        context.saveSettingsDebounced();
    }

    return { getSettings, saveSettings };
}