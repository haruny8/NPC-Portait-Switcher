import { DEBUG } from '../config.js';

export function splitKeywords(str) {
    return (str || '').split(',').map(k => k.trim()).filter(k => k.length > 0);
}

const WORD_CHAR_RE = /[\w]/;

export function isWordChar(char) {
    return WORD_CHAR_RE.test(char);
}

export function findKeywordMatches(rawText, keywords, caseSensitive) {
    const hay = caseSensitive ? rawText : rawText.toLowerCase();
    const matches = [];

    for (const kw of keywords) {
        if (!kw) continue;

        const needle = caseSensitive ? kw : kw.toLowerCase();

        let pos = -1;
        while ((pos = hay.indexOf(needle, pos + 1)) !== -1) {
            const beforeChar = pos > 0 ? hay[pos - 1] : '';
            const afterChar = pos + needle.length < hay.length ? hay[pos + needle.length] : '';

            const isBeforeWordBoundary = beforeChar === '' || !isWordChar(beforeChar);
            const isAfterWordBoundary = afterChar === '' || !isWordChar(afterChar);

            if (isBeforeWordBoundary && isAfterWordBoundary) {
                matches.push({ keyword: kw, start: pos, end: pos + needle.length });
            }
        }
    }

    return matches.sort((a, b) => a.start - b.start || a.end - b.end);
}

export function matchesAny(rawText, keywords, caseSensitive, triggerCount = 1) {
    const matches = findKeywordMatches(rawText, keywords, caseSensitive);
    if (matches.length >= triggerCount && matches.length > 0) {
        const matchedKeyword = matches[triggerCount - 1]?.keyword || matches[0].keyword;
        if (DEBUG) console.log(`[NPC Portrait Switcher] Found ${matches.length} occurrences of "${matchedKeyword}" (need ${triggerCount})`);
        return true;
    }

    return false;
}