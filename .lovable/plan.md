## Hero photo visibility fix

In `src/routes/index.tsx`, the home hero image uses `object-cover` (which center-crops) and a `md:min-h-[600px]` container, so the top of `hero-fishing.jpg` gets cut off on desktop.

### Change
1. Update the `<img>` to anchor to the top of the photo:
   - `className="absolute inset-0 h-full w-full object-cover object-top"`
2. Raise the desktop hero height so more of the image is visible:
   - container class becomes `... md:min-h-[760px] ...` (was `md:min-h-[600px]`)

No changes to mobile sizing, copy, gradient overlay, or the booking bar. Scope is limited to those two class strings.

### Verification
View the home route at desktop width to confirm the top of the fishing photo is visible and the gradient/legibility of the headline still hold.