export async function cropImage(dataUrl) {
    const { Popup, POPUP_TYPE } = SillyTavern.getContext();
    const dlg = new Popup('Crop portrait image (2:3)', POPUP_TYPE.CROP, '', {
        cropImage: dataUrl, cropAspect: 2 / 3,
    });
    const result = await dlg.show();
    return result ? String(result) : null;
}

export async function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export async function compressImage(dataUrl, { maxDimension = 1536, quality = 0.92 } = {}) {
    try {
        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = dataUrl;
        });

        const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));
        const width = Math.max(1, Math.round(img.naturalWidth * scale));
        const height = Math.max(1, Math.round(img.naturalHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        return canvas.toDataURL('image/webp', quality);
    } catch (err) {
        console.warn('[NPC Portrait Switcher] Image compression failed, using original image:', err);
        return dataUrl;
    }
}