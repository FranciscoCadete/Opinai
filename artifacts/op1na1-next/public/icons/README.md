# PWA Icons

The manifest references PNG icons that must be generated from `icon.svg`.

## Generate with sharp (Node.js)

```bash
pnpm add -D sharp
node -e "
const sharp = require('sharp');
const sizes = [96, 192, 512];
for (const s of sizes) {
  sharp('public/icons/icon.svg').resize(s, s).png().toFile(\`public/icons/icon-\${s}.png\`);
  sharp('public/icons/icon.svg').resize(s, s).png().toFile(\`public/icons/icon-maskable-\${s}.png\`);
}
sharp('public/icons/icon.svg').resize(180, 180).png().toFile('public/icons/apple-touch-icon.png');
"
```

## Alternative: squoosh.app

Upload `icon.svg`, export as PNG at 192×192 and 512×512.

## Required files

| File | Size | Purpose |
|---|---|---|
| `icon-96.png` | 96×96 | Shortcut icons in manifest |
| `icon-192.png` | 192×192 | Homescreen icon |
| `icon-512.png` | 512×512 | Splash screen / install prompt |
| `icon-maskable-192.png` | 192×192 | Adaptive icon (Android) |
| `icon-maskable-512.png` | 512×512 | Adaptive icon large |
| `apple-touch-icon.png` | 180×180 | iOS homescreen |
