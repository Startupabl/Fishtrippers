## Replace auth hero image

The current hero (`src/assets/login-hero.jpg`) is portrait 2:3 (1024×1536) and fills the left half of `/login` and `/register` on desktop via `object-cover`. The uploaded photo is landscape ~1024×768, so it needs to be cropped to portrait before swapping in — otherwise `object-cover` will zoom in heavily and chop off most of the boat scene.

### Steps

1. Crop the uploaded `test.jfif` to a 2:3 portrait (target 1024×1536, upscaled from the source) centered on the anglers and boat — keep the boat roughly in the middle third, preserve the misty water foreground and the tree line above. Save as JPG.
2. Upload the cropped JPG via `lovable-assets` and write `src/assets/login-hero.jpg.asset.json` (CDN pointer).
3. Update `src/components/auth/AuthLayout.tsx`:
   - Import the new `.asset.json` pointer instead of the local `login-hero.jpg`.
   - Use `asset.url` as the `<img src>`.
   - Update the `alt` text to describe the fishing scene (anglers in a boat on a misty river).
4. Delete the old `src/assets/login-hero.jpg`.
5. Verify on `/register` at desktop width that the image fills the left column cleanly with the boat visible and no awkward cropping.

### Notes

- Cropping a 1024×768 source to 2:3 portrait means the output's pixel width will be ~512px wide before upscaling. I'll upscale to 1024×1536 with high-quality resampling so it stays crisp on the auth page; quality will be good but not retina-sharp. If you have a higher-resolution original, sending it would yield a sharper result.
- No code changes outside `AuthLayout.tsx` and the asset files.
