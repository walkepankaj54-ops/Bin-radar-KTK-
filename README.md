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
- A WhatsApp report link for full bins, locally saved status, and a demo reset.
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
- There are no live bin sensors or municipal data connections.
- The map and geolocation need internet access and browser permission; the bin list and area fallback remain available without them.
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
- [ ] Select a bin name and confirm its marker popup opens at map zoom 17.
- [ ] Report an OK bin as full; confirm its card and marker turn red and WhatsApp opens with the correct pre-filled message.
- [ ] Confirm a reported bin has a disabled **Reported as full** button after reloading the page.
- [ ] Select **Reset all (demo)** and confirm every card and marker returns to OK.
- [ ] Test with the network disconnected and confirm the app remains usable, with a map fallback message.
- [ ] Navigate with a keyboard and confirm visible focus indicators and live status announcements.

## Originality declaration

This project was built with AI assistance. I have reviewed and understood the implementation and can explain its behavior and limitations.