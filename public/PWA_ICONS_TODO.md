# PWA Icons TODO

## Required Icons

For optimal PWA experience, create these icons from your logo:

### Required Sizes:
- `pwa-icon-192.png` - 192x192px (minimum required)
- `pwa-icon-512.png` - 512x512px (required for splash screen)

### Optional but Recommended:
- `pwa-icon-72.png` - 72x72px
- `pwa-icon-96.png` - 96x96px
- `pwa-icon-128.png` - 128x128px
- `pwa-icon-144.png` - 144x144px
- `pwa-icon-152.png` - 152x152px
- `pwa-icon-384.png` - 384x384px

## How to Create Icons

### Option 1: Using Existing PNG
If you have `logo.png` or `panboo.png`:
1. Use an image editor (Photoshop, Figma, GIMP)
2. Resize to 512x512px with transparent background
3. Export as PNG
4. Use online tool to generate all sizes: https://www.pwabuilder.com/imageGenerator

### Option 2: Quick Online Tool
1. Go to https://favicon.io/favicon-converter/
2. Upload your logo
3. Download generated icons
4. Rename to match manifest.json names

### Option 3: Command Line (ImageMagick)
```bash
# Install ImageMagick first
convert logo.png -resize 192x192 pwa-icon-192.png
convert logo.png -resize 512x512 pwa-icon-512.png
```

## Temporary Solution
Currently using placeholder references. The PWA will work but won't show proper icons until you add the actual image files.

## Design Guidelines
- Use simple, recognizable logo
- Ensure good contrast on both light/dark backgrounds
- Test on actual devices (iOS, Android)
- Consider using the Panboo logo with green (#00C48C) background
- Add padding (safe area) for iOS rounded icons
