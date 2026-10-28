# BinRadar

**Track:** Environment and Sustainability

## The problem

Pune is growing faster than its waste infrastructure. Residents and housing society members may not know where the nearest collection point is, while overflowing bins can go unreported. BinRadar is a small demo that helps people find nearby sample points and prepare a report for a collector or ward supervisor.

## Users

- Residents and housing society members looking for a nearby waste collection point.
- Waste collectors and ward supervisors who receive reports from residents.

## Features

- Ten fictional collection points around Wagholi, Pune.
- Browser location with Haversine distance sorting, plus an area picker fallback.
- Leaflet map with OpenStreetMap tiles, status markers, popups, and a user marker.
- A route guidance panel to the nearest bin that is not marked full, with a live GPS marker, direct guide line, distance estimate, and a Google Maps walking-directions link.
- Community bin suggestions: tap a map location, enter a name and area, and save it locally in this browser.
- A WhatsApp share button that prepares a message containing the current app link.
- A WhatsApp report link for full bins and locally saved status.
- An inline report review with per-bin report-button click analytics, image upload or device-camera capture, and required human confirmation.
- A browser-local demo profile with name/email sign-in, a dedicated Wagholi Area Stars ranking view, and one star for each GPS-confirmed collection-point visit.
- A dedicated User screen opened from the navigation drawer, showing the login form when signed out and profile details when signed in.
- Mobile-first layout, keyboard focus styles, and screen-reader status announcements.

## Run

1. Open this folder in VS Code.
2. Install or enable the Live Server extension, then right-click `index.html` and choose **Open with Live Server**.
3. Use the local URL Live Server opens. Allow location access to sort from your current position; otherwise choose an area.
4. To publish, push these files to a GitHub repository, then open **Settings → Pages**, choose the branch and root folder, and save. GitHub Pages serves the app over HTTPS, which is required by most browsers for geolocation.

The app also works by opening `index.html` directly, but browser geolocation may be restricted for local files. The list, demo status, and fallback picker still work.

## Tools used

- VS Code
- GitHub Copilot
- Leaflet 1.9.4, loaded from cdnjs
- OpenStreetMap tiles
- Plain HTML, CSS, and JavaScript

## Limitations

- All collection point names and coordinates are fictional sample data, not verified municipal locations.
- Alerts are pre-filled WhatsApp messages that a person reviews and sends manually.
- Statuses are stored only in the current user's browser and do not sync to other people.
- Community suggestions are saved only in the browser that created them; sharing the app link does not share suggested-bin data with neighbors.
- Report click analytics are counts from this browser only, not verified unique people or reports from a community server.
- Login is a local demo profile, not secure authentication: no password is collected, and profiles, stars, and Area rankings are stored only in this browser. Other users and devices cannot see these rankings.
- A visit star is awarded once per navigation trip when GPS tracking confirms the signed-in user is within 50 meters. Returning to the same point on a later trip can earn another star; location fallback alone does not award stars. GPS proximity cannot prove that waste was actually deposited.
- The image is previewed locally and is not automatically sent to WhatsApp or uploaded. The user must attach it manually in WhatsApp if needed.
- Image checking is a human review only. There is no AI image classification or automatic spam detection in this static app.
- Camera capture depends on browser and device support; on some desktops the camera button opens a file or camera chooser.
- There are no live bin sensors or municipal data connections.
- The map and geolocation need internet access and browser permission; the bin list and area fallback remain available without them.
- The on-map guide line is a direct line, not a street-following route. Use **Open in Maps** for turn-by-turn walking directions; live tracking requires location permission.
- Replace `COLLECTOR_NUMBER` in `script.js` with an appropriate WhatsApp number before any demonstration involving a real recipient.

## Future scope

- Integrate verified Pune Municipal Corporation collection-point and ward data.
- Add IoT bin sensors to share live fill levels.
- Send automatic alerts through a secure backend or WhatsApp Business API.
- Add moderation, report history, and shared status updates for a ward.

## Manual test checklist

- [ ] Open the page at a narrow mobile width and confirm controls fit without horizontal scrolling.
- [ ] Select **Find nearby bins**, allow location, and confirm the cards reorder with distances to one decimal place.
- [ ] Deny location or simulate a timeout, choose an area, and confirm the nearest bins appear first.
- [ ] Confirm the map displays the sample markers, status legend, and user marker after a location is selected.
- [ ] Confirm finding a location opens the route panel for the nearest non-full bin, starts live tracking, and moves the blue marker when location updates.
- [ ] Stop tracking and confirm location updates stop; use **Open in Maps** to check the destination and walking mode.
- [ ] Select a bin name and confirm its marker popup opens at map zoom 17.
- [ ] Tap a map location, submit a name and area, and confirm the suggestion is labelled local and persists after reload.
- [ ] Use **Share** and confirm WhatsApp opens with the current app URL in the draft message.
- [ ] Create a local profile with a name and email; confirm the profile and Area leaderboard show the user.
- [ ] Choose **Area Stars** in the drawer; confirm it opens the focused area ranking interface and **Back to bins** returns to the main interface.
- [ ] Choose **User** in the drawer; confirm the focused screen shows sign-in when logged out and profile details when logged in, then use **Back to bins**.
- [ ] Select **Navigate** on a bin, allow GPS tracking, and simulate arrival within 50 meters; confirm one star is added to the profile and leaderboard.
- [ ] Simulate more GPS updates during the same trip and confirm they do not add more stars; start another trip and confirm reaching a point adds another star, including a repeat visit.
- [ ] Sign out and confirm the local profile remains ranked but is no longer active.
- [ ] Click **Report full** and confirm the inline chart increases the local click count for that bin; reopen it and confirm the count is another click.
- [ ] Try uploading an image and opening the camera; confirm a selected image previews locally and non-image or oversized files are rejected.
- [ ] Confirm submission stays disabled until an image is selected and the human-review checkbox is checked.
- [ ] Submit a reviewed photo; confirm the bin is marked full and WhatsApp opens with the pre-filled message. The photo must be attached manually in WhatsApp if needed.
- [ ] Confirm a reported bin has a disabled **Reported as full** button after reloading the page.
- [ ] Test with the network disconnected and confirm the app remains usable, with a map fallback message.
- [ ] Navigate with a keyboard and confirm visible focus indicators and live status announcements.

## Originality declaration

This project was built with AI assistance. I have reviewed and understood the implementation and can explain its behavior and limitations.