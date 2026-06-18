## Update home page hero intro video

In `src/routes/index.tsx` (the modal triggered by the "How FishTrippers works" link in the hero):

1. **Replace the iframe video source** (line 418) with the new Bunny Stream video:
   - From: `https://iframe.mediadelivery.net/embed/683194/aa5f7090-2922-4ba8-a2c8-0d11de0d09f2?autoplay=true&loop=false&muted=true&color=FF5733`
   - To: `https://iframe.mediadelivery.net/embed/683194/4a27c961-f4c0-4b88-b463-e507b24032fa?autoplay=true&loop=false&muted=true&color=FF5733`
   (Converted your `player.mediadelivery.net/play/...` link to the matching `iframe.mediadelivery.net/embed/...` embed URL, keeping the same playback options.)

2. **Update the dialog title text** (line 400) from `What is FishTrippers?` to `How FishTrippers Works`. Also update the iframe `title` attribute (line 419) to match for accessibility.

No other files need changes — the hero trigger button already reads "How FishTrippers works", and the background hero image stays the same.
