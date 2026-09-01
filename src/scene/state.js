export function createSceneState() {
    return {
        sceneNPCs: new Map(),
        activeEntryIdx: null,
        pinnedEntryIdx: null,
    };
}

export function clearScene(state) {
    state.sceneNPCs.clear();
    state.activeEntryIdx = null;
    state.pinnedEntryIdx = null;
}