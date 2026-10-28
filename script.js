// Replace this demo number with the collector or ward supervisor's WhatsApp number.
const COLLECTOR_NUMBER = "919999999999";

// These fictional sample locations are clustered around Wagholi, Pune.
const SPOTS = [
  { id: "wag-01", name: "Greenway Community Point", area: "Wagholi Main Road", lat: 18.5824, lng: 73.9798 },
  { id: "wag-02", name: "Kesnand Road Corner", area: "Kesnand Road", lat: 18.5882, lng: 73.9861 },
  { id: "wag-03", name: "Riverbend Collection Bay", area: "Lohegaon-Wagholi Road", lat: 18.5748, lng: 73.9872 },
  { id: "wag-04", name: "Tulja Bhawani Nagar Point", area: "Tulja Bhawani Nagar", lat: 18.5867, lng: 73.9721 },
  { id: "wag-05", name: "Bakori Road Green Stop", area: "Bakori Road", lat: 18.5791, lng: 73.9944 },
  { id: "wag-06", name: "Siddharth Nagar Bin Bay", area: "Siddharth Nagar", lat: 18.5921, lng: 73.9784 },
  { id: "wag-07", name: "Nagar Road Service Point", area: "Pune-Nagar Road", lat: 18.5685, lng: 73.9760 },
  { id: "wag-08", name: "Awhalwadi Junction Point", area: "Awhalwadi Road", lat: 18.5961, lng: 73.9910 },
  { id: "wag-09", name: "Baif Road Community Bin", area: "Baif Road", lat: 18.5770, lng: 73.9679 },
  { id: "wag-10", name: "Wagholi Market Collection Point", area: "Wagholi Market", lat: 18.5844, lng: 73.9907 }
];

const STORAGE_KEY = "binradar-status";
const binList = document.getElementById("bin-list");
const statusMessage = document.getElementById("status-message");
const findButton = document.getElementById("find-nearby");
const fallbackControl = document.getElementById("fallback-control");
const areaSelect = document.getElementById("area-select");
const resultCount = document.getElementById("result-count");
const mapElement = document.getElementById("map");
const mapFallback = document.getElementById("map-fallback");

// The status data is separate from SPOTS and is safe when browser storage is blocked.
function readStatuses() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(SPOTS.map((spot) => [spot.id, parsed[spot.id] === "full" ? "full" : "ok"]));
  } catch (error) {
    return {};
  }
}

let statuses = readStatuses();
let userPosition = null;
let map = null;
let spotMarkers = new Map();
let userMarker = null;
let sortedSpotIds = null;

// Keep storage failures quiet; the current page still reflects the in-memory status.
function saveStatuses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  } catch (error) {
    setMessage("Status updated for this visit, but this browser could not save it.", "error");
  }
}

// Haversine returns the great-circle distance between two latitude/longitude points in km.
function distanceKm(from, to) {
  const earthRadiusKm = 6371;
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lng - from.lng);
  const fromLatitude = radians(from.lat);
  const toLatitude = radians(to.lat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

// This is the only status-writing helper, so the card and map always stay in sync.
function setMessage(text, kind = "") {
  statusMessage.textContent = text;
  statusMessage.dataset.kind = kind;
}

// Build each card with DOM text nodes rather than inserting sample text as HTML.
function renderCards() {
  const visibleSpots = sortedSpotIds
    ? sortedSpotIds.map((id) => SPOTS.find((spot) => spot.id === id)).filter(Boolean)
    : SPOTS;
  binList.replaceChildren();
  resultCount.textContent = `${visibleSpots.length} sample spots`;

  visibleSpots.forEach((spot) => {
    const isFull = statuses[spot.id] === "full";
    const card = document.createElement("article");
    card.className = `bin-card${isFull ? " is-full" : ""}`;

    const top = document.createElement("div");
    top.className = "card-top";
    const nameButton = document.createElement("button");
    nameButton.type = "button";
    nameButton.className = "spot-name";
    nameButton.textContent = spot.name;
    nameButton.setAttribute("aria-label", `Show ${spot.name} on the map`);
    nameButton.addEventListener("click", () => focusSpot(spot));

    const pill = document.createElement("span");
    pill.className = `status-pill ${isFull ? "is-full" : "is-ok"}`;
    pill.textContent = isFull ? "Full" : "OK";
    top.append(nameButton, pill);

    const area = document.createElement("p");
    area.className = "spot-area";
    area.textContent = spot.area;

    const bottom = document.createElement("div");
    bottom.className = "card-bottom";
    const distance = document.createElement("span");
    distance.className = "distance";
    distance.textContent = userPosition
      ? `${distanceKm(userPosition, spot).toFixed(1)} km away`
      : "Distance appears after finding nearby bins";

    const reportButton = document.createElement("button");
    reportButton.type = "button";
    reportButton.className = "report-button";
    reportButton.textContent = isFull ? "Reported as full" : "Report full";
    reportButton.disabled = isFull;
    reportButton.setAttribute("aria-label", isFull ? `${spot.name} reported as full` : `Report ${spot.name} as full`);
    if (!isFull) reportButton.addEventListener("click", () => reportSpot(spot));

    bottom.append(distance, reportButton);
    card.append(top, area, bottom);
    binList.append(card);
  });
}

// Marker popups are assembled with text nodes to avoid HTML injection.
function popupContent(spot) {
  const content = document.createElement("div");
  const title = document.createElement("span");
  title.className = "popup-title";
  title.textContent = spot.name;
  const area = document.createElement("span");
  area.textContent = `${spot.area} · ${statuses[spot.id] === "full" ? "Full" : "OK"}`;
  content.append(title, area);
  return content;
}

// Refresh the marker icon and popup whenever a bin status changes.
function updateSpotMarker(spot) {
  const marker = spotMarkers.get(spot.id);
  if (!marker) return;
  const isFull = statuses[spot.id] === "full";
  marker.setIcon(L.divIcon({
    className: "",
    html: `<span class="bin-marker ${isFull ? "marker-full" : "marker-ok"}" aria-hidden="true"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  }));
  marker.setPopupContent(popupContent(spot));
}

// Start Leaflet only when its CDN script has loaded; the rest of the app has no dependency on it.
function initializeMap() {
  if (!window.L) {
    mapFallback.hidden = false;
    return;
  }
  map = L.map(mapElement, { scrollWheelZoom: false }).setView([18.582, 73.982], 14);
  const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  });
  tileLayer.on("tileload", () => {
    mapElement.classList.add("leaflet-has-tiles");
    mapFallback.hidden = true;
  });
  tileLayer.on("tileerror", () => {
    mapElement.classList.remove("leaflet-has-tiles");
    mapFallback.hidden = false;
    mapFallback.textContent = "Map tiles need an internet connection. Your bin list is still available below.";
  });
  tileLayer.addTo(map);
  SPOTS.forEach((spot) => {
    const marker = L.marker([spot.lat, spot.lng], {
      icon: L.divIcon({ className: "", html: '<span class="bin-marker marker-ok" aria-hidden="true"></span>', iconSize: [20, 20], iconAnchor: [10, 10] })
    }).addTo(map);
    marker.bindPopup(popupContent(spot));
    spotMarkers.set(spot.id, marker);
    updateSpotMarker(spot);
  });
  window.setTimeout(() => map.invalidateSize(), 0);
}

// Zoom from a bin card directly to that bin and open its details.
function focusSpot(spot) {
  if (!map || !spotMarkers.has(spot.id)) {
    setMessage("The map is unavailable offline, but this spot is listed below.", "error");
    return;
  }
  map.setView([spot.lat, spot.lng], 17);
  spotMarkers.get(spot.id).openPopup();
}

// Fit the map around the user's position and the nearest collection point.
function showNearest(spots) {
  if (!map || !userPosition) return;
  const nearest = spots[0];
  const bounds = L.latLngBounds([userPosition.lat, userPosition.lng], [nearest.lat, nearest.lng]);
  if (bounds.getSouthWest().equals(bounds.getNorthEast())) {
    map.setView([userPosition.lat, userPosition.lng], 16);
  } else {
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
  }
}

// Sort all sample locations from closest to farthest and place the blue user marker.
function applyPosition(position) {
  userPosition = { lat: position.lat, lng: position.lng };
  const orderedSpots = [...SPOTS].sort((first, second) => distanceKm(userPosition, first) - distanceKm(userPosition, second));
  sortedSpotIds = orderedSpots.map((spot) => spot.id);
  renderCards();

  if (map) {
    if (userMarker) map.removeLayer(userMarker);
    userMarker = L.marker([userPosition.lat, userPosition.lng], {
      icon: L.divIcon({ className: "", html: '<span class="bin-marker marker-user" aria-label="Your location"></span>', iconSize: [22, 22], iconAnchor: [11, 11] })
    }).addTo(map).bindPopup("Your location");
    showNearest(orderedSpots);
  }
  setMessage("Showing the nearest bins first.", "success");
}

// Ask the browser for location, with a ten-second timeout and a manual fallback.
function findNearby() {
  setMessage("Finding your location…");
  findButton.disabled = true;
  fallbackControl.hidden = true;
  if (!navigator.geolocation) {
    handleLocationError("Location is not supported by this browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      findButton.disabled = false;
      fallbackControl.hidden = true;
      applyPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
    },
    (error) => {
      const message = error.code === 1
        ? "Location access was denied. Choose an area below to find nearby bins."
        : error.code === 3
          ? "Your location took too long to respond. Choose an area below to find nearby bins."
          : "We couldn't get your location. Choose an area below to find nearby bins.";
      handleLocationError(message);
    },
    { timeout: 10000, enableHighAccuracy: false, maximumAge: 60000 }
  );
}

function handleLocationError(message) {
  findButton.disabled = false;
  fallbackControl.hidden = false;
  setMessage(message, "error");
  areaSelect.focus();
}

// Let people pick a sample area when GPS is unavailable or not permitted.
function populateAreaOptions() {
  SPOTS.forEach((spot) => {
    const option = document.createElement("option");
    option.value = spot.id;
    option.textContent = `${spot.area} — ${spot.name}`;
    areaSelect.append(option);
  });
}

// Report locally first, then open a pre-filled message for the user to send themselves.
function reportSpot(spot) {
  statuses[spot.id] = "full";
  saveStatuses();
  renderCards();
  updateSpotMarker(spot);
  setMessage(`${spot.name} is marked full. WhatsApp is ready for you to send the alert.`, "success");
  const message = `Alert: the waste bin at ${spot.name}, ${spot.area} is FULL. Please collect it. Location: https://maps.google.com/?q=${spot.lat},${spot.lng}`;
  window.open(`https://wa.me/${COLLECTOR_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

// Reset is intentionally a demo action and restores every spot to OK.
function resetAll() {
  statuses = Object.fromEntries(SPOTS.map((spot) => [spot.id, "ok"]));
  saveStatuses();
  renderCards();
  SPOTS.forEach(updateSpotMarker);
  setMessage("All sample bins have been reset to OK.", "success");
}

// Connect controls and draw the first page state.
findButton.addEventListener("click", findNearby);
areaSelect.addEventListener("change", () => {
  const chosenSpot = SPOTS.find((spot) => spot.id === areaSelect.value);
  if (chosenSpot) {
    fallbackControl.hidden = true;
    applyPosition({ lat: chosenSpot.lat, lng: chosenSpot.lng });
  }
});
document.getElementById("reset-all").addEventListener("click", resetAll);
populateAreaOptions();
renderCards();
initializeMap();