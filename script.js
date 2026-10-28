// Replace the demo number with your collector's WhatsApp number.
const COLLECTOR_NUMBER = "919999999999";

// These fictional sample collection points sit around Wagholi, Pune.
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
const COMMUNITY_STORAGE_KEY = "binradar-community-spots";
const REPORT_ANALYTICS_KEY = "binradar-report-clicks";
const USERS_STORAGE_KEY = "binradar-local-users";
const binList = document.getElementById("bin-list");
const statusMessage = document.getElementById("status-message");
const findButton = document.getElementById("find-nearby");
const permissionButton = document.getElementById("allow-permission");
const permissionStrip = document.getElementById("permission-strip");
const permissionText = document.getElementById("permission-text");
const fallbackControl = document.getElementById("fallback-control");
const areaSelect = document.getElementById("area-select");
const resultCount = document.getElementById("result-count");
const summaryLine = document.getElementById("summary-line");
const emptyState = document.getElementById("empty-state");
const mapElement = document.getElementById("map");
const mapFallback = document.getElementById("map-fallback");
const filterAllButton = document.getElementById("filter-all");
const filterFullButton = document.getElementById("filter-full");
const menuToggle = document.getElementById("menu-toggle");
const mobileNav = document.getElementById("mobile-nav");
const drawerBackdrop = document.getElementById("drawer-backdrop");
const drawerAvatar = document.getElementById("drawer-avatar");
const drawerName = document.getElementById("drawer-name");
const drawerStars = document.getElementById("drawer-stars");
const routePanel = document.getElementById("route-panel");
const routeState = document.getElementById("route-state");
const routeDestination = document.getElementById("route-destination");
const routeDistance = document.getElementById("route-distance");
const routeEta = document.getElementById("route-eta");
const routeInstruction = document.getElementById("route-instruction");
const trackStart = document.getElementById("track-start");
const trackStop = document.getElementById("track-stop");
const externalDirections = document.getElementById("external-directions");
const suggestForm = document.getElementById("suggest-form");
const suggestName = document.getElementById("suggest-name");
const suggestArea = document.getElementById("suggest-area");
const suggestCoordinates = document.getElementById("suggest-coordinates");
const suggestCancel = document.getElementById("suggest-cancel");
const loginForm = document.getElementById("login-form");
const loginName = document.getElementById("login-name");
const loginEmail = document.getElementById("login-email");
const areaTotalVisits = document.getElementById("area-total-visits");
const areaMemberCount = document.getElementById("area-member-count");
const areaLeaderName = document.getElementById("area-leader-name");
const areaUserName = document.getElementById("area-user-name");
const areaUserVisits = document.getElementById("area-user-visits");
const areaSigninLink = document.getElementById("area-signin-link");
const areaBackButton = document.getElementById("area-back");
const profileView = document.getElementById("profile-view");
const profileAvatar = document.getElementById("profile-avatar");
const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profileStars = document.getElementById("profile-stars");
const profileActivity = document.getElementById("profile-activity");
const leaderboard = document.getElementById("leaderboard");
const logoutButton = document.getElementById("logout-button");

// Read local suggestions safely and keep only valid named coordinates.
function readCommunitySpots() {
	try {
		const saved = localStorage.getItem(COMMUNITY_STORAGE_KEY);
		const parsed = saved ? JSON.parse(saved) : [];
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((spot) => spot
			&& typeof spot.id === "string"
			&& typeof spot.name === "string"
			&& typeof spot.area === "string"
			&& Number.isFinite(spot.lat)
			&& Number.isFinite(spot.lng))
			.map((spot) => ({ ...spot, isCommunity: true }));
	} catch (error) {
		return [];
	}
}

let communitySpots = readCommunitySpots();

function getAllSpots() {
	return [...SPOTS, ...communitySpots];
}

// Read only known statuses and use defaults if browser storage is blocked.
function readStatuses() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		const parsed = saved ? JSON.parse(saved) : {};
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
		return Object.fromEntries(getAllSpots().map((spot) => [spot.id, parsed[spot.id] === "full" ? "full" : "ok"]));
	} catch (error) {
		return {};
	}
}

let statuses = readStatuses();
let userPosition = null;
let map = null;
let spotMarkers = new Map();
let userMarker = null;
let radarRings = [];
let guideLine = null;
let destinationSpot = null;
let sortedSpots = getAllSpots();
let showFullOnly = false;
let watchId = null;
let suggestionPosition = null;
let suggestionMarker = null;
let reportAnalytics = readReportAnalytics();
let activeReportRow = null;
let activeReportObjectUrl = null;
let userData = readUserData();
let currentUser = userData.users.find((user) => user.email === userData.currentEmail) || null;
let pendingDestinationId = "";
let gpsPositionVerified = false;
let arrivalAwardedThisTrip = false;

// Load browser-local demo profiles; this is not secure authentication.
function readUserData() {
	try {
		const parsed = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "{}");
		const users = Array.isArray(parsed.users) ? parsed.users.filter((user) => user
			&& typeof user.email === "string"
			&& typeof user.name === "string").map((user) => ({
			...user,
			visits: Array.isArray(user.visits)
				? user.visits.filter((visit) => visit && typeof visit.spotId === "string" && typeof visit.spotName === "string")
				: Array.isArray(user.visitedSpotIds)
					? user.visitedSpotIds.map((spotId) => ({
						spotId,
						spotName: getAllSpots().find((spot) => spot.id === spotId)?.name || "Collection point",
						area: "Wagholi, Pune",
						visitedAt: 0
					}))
					: []
		})) : [];
		return { users, currentEmail: typeof parsed.currentEmail === "string" ? parsed.currentEmail : "" };
	} catch (error) {
		return { users: [], currentEmail: "" };
	}
}

function saveUserData() {
	try {
		localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(userData));
		return true;
	} catch (error) {
		return false;
	}
}

// Read local report-button click counts, keeping safe defaults if storage is blocked.
function readReportAnalytics() {
	try {
		const saved = localStorage.getItem(REPORT_ANALYTICS_KEY);
		const parsed = saved ? JSON.parse(saved) : {};
		const bySpot = parsed && parsed.bySpot && typeof parsed.bySpot === "object" && !Array.isArray(parsed.bySpot)
			? parsed.bySpot
			: {};
		return {
			total: Number.isSafeInteger(parsed?.total) && parsed.total > 0 ? parsed.total : 0,
			bySpot: Object.fromEntries(Object.entries(bySpot).map(([id, count]) => [id, Number.isSafeInteger(count) && count > 0 ? count : 0]))
		};
	} catch (error) {
		return { total: 0, bySpot: {} };
	}
}

function saveReportAnalytics() {
	try {
		localStorage.setItem(REPORT_ANALYTICS_KEY, JSON.stringify(reportAnalytics));
	} catch (error) {
		// Counts remain available for this visit even when storage is disabled.
	}
}

// Save the statuses but keep the current visit working if storage is unavailable.
function saveStatuses() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
	} catch (error) {
		setMessage("Status changed for this visit, but this browser could not save it.", "error");
	}
}

// Calculate the great-circle distance between coordinates in kilometers.
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

function setMessage(text, kind = "") {
	statusMessage.textContent = text;
	statusMessage.dataset.kind = kind;
}

// Create the trash icon from fixed SVG nodes.
function createBinIcon() {
	const namespace = "http://www.w3.org/2000/svg";
	const icon = document.createElementNS(namespace, "svg");
	icon.setAttribute("viewBox", "0 0 24 24");
	icon.setAttribute("aria-hidden", "true");
	const shape = document.createElementNS(namespace, "path");
	shape.setAttribute("d", "M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5");
	icon.append(shape);
	return icon;
}

// Render the list, filter state, and summary using text nodes.
function renderCards() {
	const allSpots = getAllSpots();
	const fullCount = allSpots.filter((spot) => statuses[spot.id] === "full").length;
	const visibleSpots = sortedSpots.filter((spot) => !showFullOnly || statuses[spot.id] === "full");
	binList.replaceChildren();
	summaryLine.textContent = `${SPOTS.length} sample spots, ${communitySpots.length} local suggestions, ${fullCount} full`;
	resultCount.textContent = `${visibleSpots.length} shown`;
	emptyState.hidden = visibleSpots.length !== 0;
	binList.hidden = visibleSpots.length === 0;

	visibleSpots.forEach((spot) => {
		const isFull = statuses[spot.id] === "full";
		const row = document.createElement("article");
		row.className = `bin-row${isFull ? " is-full" : ""}`;

		const iconTile = document.createElement("span");
		iconTile.className = "bin-icon-tile";
		iconTile.append(createBinIcon());

		const details = document.createElement("div");
		details.className = "bin-details";
		const nameButton = document.createElement("button");
		nameButton.type = "button";
		nameButton.className = "row-name";
		nameButton.textContent = spot.name;
		nameButton.setAttribute("aria-label", `Show ${spot.name} on the map`);
		nameButton.addEventListener("click", () => focusSpot(spot));

		const meta = document.createElement("div");
		meta.className = "row-meta";
		const area = document.createElement("span");
		area.className = "row-area";
		area.textContent = spot.isCommunity ? `${spot.area} - Local suggestion` : spot.area;
		const distance = document.createElement("span");
		distance.className = "row-distance";
		distance.textContent = userPosition ? `${distanceKm(userPosition, spot).toFixed(1)} km away` : "Distance not available";
		meta.append(area, distance);
		details.append(nameButton, meta);

		const actions = document.createElement("div");
		actions.className = "row-actions";
		const pill = document.createElement("span");
		pill.className = `status-pill${isFull ? " is-full" : ""}`;
		pill.textContent = isFull ? "Full" : "OK";
		const navigateButton = document.createElement("button");
		navigateButton.type = "button";
		navigateButton.className = "navigate-button";
		navigateButton.textContent = "Navigate";
		navigateButton.setAttribute("aria-label", `Navigate to ${spot.name}`);
		navigateButton.addEventListener("click", () => navigateToSpot(spot));
		const reportButton = document.createElement("button");
		reportButton.type = "button";
		reportButton.className = "report-button";
		reportButton.textContent = isFull ? "Reported" : "Report full";
		reportButton.disabled = isFull;
		reportButton.setAttribute("aria-label", isFull ? `${spot.name} reported` : `Report ${spot.name} as full`);
		if (!isFull) reportButton.addEventListener("click", () => toggleReportPanel(spot, row));
		actions.append(pill, navigateButton, reportButton);

		row.append(iconTile, details, actions);
		binList.append(row);
	});
	renderProfile();
}

// Show the signed-in profile and rank local browser profiles by earned stars.
function renderProfile() {
	loginForm.hidden = Boolean(currentUser);
	profileView.hidden = !currentUser;
	drawerAvatar.textContent = currentUser ? currentUser.name.trim().charAt(0).toUpperCase() || "?" : "?";
	drawerName.textContent = currentUser ? currentUser.name : "Guest user";
	drawerStars.textContent = currentUser
		? `${currentUser.visits.length} ${currentUser.visits.length === 1 ? "star" : "stars"} earned`
		: "Sign in to earn stars";
	if (currentUser) {
		profileName.textContent = currentUser.name;
		profileEmail.textContent = currentUser.email;
		profileAvatar.textContent = currentUser.name.trim().charAt(0).toUpperCase() || "?";
		profileStars.textContent = String(currentUser.visits.length);
		profileActivity.textContent = currentUser.visits.length
			? `You have completed ${currentUser.visits.length} verified ${currentUser.visits.length === 1 ? "collection-point visit" : "collection-point visits"}.`
			: "Visit a collection point with GPS tracking to earn your first star.";
	}
	areaUserName.textContent = currentUser ? currentUser.name : "Guest member";
	areaUserVisits.textContent = currentUser
		? `${currentUser.visits.length} ${currentUser.visits.length === 1 ? "verified visit" : "verified visits"} - ${currentUser.visits.length} ${currentUser.visits.length === 1 ? "star" : "stars"}`
		: "Sign in to track your visits and earn stars.";
	areaSigninLink.hidden = Boolean(currentUser);
	const totalVisits = userData.users.reduce((total, user) => total + user.visits.length, 0);
	const rankedUsers = [...userData.users].sort((first, second) => second.visits.length - first.visits.length || first.name.localeCompare(second.name));
	areaTotalVisits.textContent = String(totalVisits);
	areaMemberCount.textContent = String(userData.users.length);
	areaLeaderName.textContent = rankedUsers.length && rankedUsers[0].visits.length ? rankedUsers[0].name : "Be first";
	leaderboard.replaceChildren();
	if (!rankedUsers.length) {
		const emptyItem = document.createElement("li");
		emptyItem.className = "leaderboard-empty";
		emptyItem.textContent = "No local profiles yet. Sign in on this device to appear here.";
		leaderboard.append(emptyItem);
		return;
	}
	rankedUsers.forEach((user, index) => {
		const item = document.createElement("li");
		item.className = "leaderboard-item";
		const rank = document.createElement("span");
		rank.className = "leaderboard-rank";
		rank.textContent = String(index + 1);
		const name = document.createElement("span");
		name.className = "leaderboard-name";
		name.textContent = user.name;
		const points = document.createElement("span");
		points.className = "leaderboard-points";
		points.textContent = `${user.visits.length} ${user.visits.length === 1 ? "star" : "stars"}`;
		const detail = document.createElement("span");
		detail.className = "leaderboard-visits";
		detail.textContent = `${user.visits.length} verified ${user.visits.length === 1 ? "visit" : "visits"}`;
		item.append(rank, name, points, detail);
		leaderboard.append(item);
	});
}

// Create or reopen a browser-local demo profile without collecting passwords.
function signIn(event) {
	event.preventDefault();
	const name = loginName.value.trim();
	const email = loginEmail.value.trim().toLowerCase();
	if (!name || !email) return;
	let user = userData.users.find((entry) => entry.email === email);
	if (!user) {
		user = { name, email, visits: [] };
		userData.users.push(user);
	} else {
		user.name = name;
		if (!Array.isArray(user.visits)) user.visits = [];
	}
	userData.currentEmail = email;
	currentUser = user;
	const saved = saveUserData();
	loginForm.reset();
	renderProfile();
	setMessage(saved ? `Signed in locally as ${user.name}.` : "Profile active for this visit; browser storage is unavailable.", saved ? "success" : "error");
}

function signOut() {
	userData.currentEmail = "";
	currentUser = null;
	saveUserData();
	renderProfile();
	setMessage("You have signed out of this device.", "success");
}

// Award one star per completed GPS-tracked trip, including repeat visits to a bin.
function awardVisitStar() {
	if (arrivalAwardedThisTrip || !currentUser || !destinationSpot || !gpsPositionVerified) return false;
	arrivalAwardedThisTrip = true;
	currentUser.visits.push({
		spotId: destinationSpot.id,
		spotName: destinationSpot.name,
		area: destinationSpot.area,
		visitedAt: Date.now()
	});
	userData.currentEmail = currentUser.email;
	const saved = saveUserData();
	renderProfile();
	routeState.textContent = "Collection point reached";
	routeInstruction.textContent = saved
		? `You earned a star for reaching ${destinationSpot.name}.`
		: `You reached ${destinationSpot.name}; the star is only saved for this visit because browser storage is unavailable.`;
	setMessage(`Star earned for reaching ${destinationSpot.name}.`, "success");
	return true;
}

// Let the visitor route to a specific listed bin instead of only the nearest one.
function navigateToSpot(spot) {
	pendingDestinationId = spot.id;
	if (userPosition) {
		openRouteGuide(Boolean(gpsPositionVerified), spot);
		return;
	}
	findNearby();
}

// Build a small, honest chart of report-button clicks recorded on this device.
function createReportChart(spot) {
	const count = reportAnalytics.bySpot[spot.id] || 0;
	const share = reportAnalytics.total ? count / reportAnalytics.total : 0;
	const chart = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	chart.setAttribute("viewBox", "0 0 42 42");
	chart.setAttribute("role", "img");
	chart.setAttribute("aria-label", `${count} report button clicks for this bin on this device; ${reportAnalytics.total} total clicks`);
	chart.classList.add("report-chart");
	const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	track.setAttribute("cx", "21");
	track.setAttribute("cy", "21");
	track.setAttribute("r", "16");
	track.classList.add("chart-track");
	const value = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	value.setAttribute("cx", "21");
	value.setAttribute("cy", "21");
	value.setAttribute("r", "16");
	value.setAttribute("stroke-dasharray", "100.53");
	value.setAttribute("stroke-dashoffset", String(100.53 * (1 - share)));
	value.setAttribute("transform", "rotate(-90 21 21)");
	value.classList.add("chart-value");
	const number = document.createElementNS("http://www.w3.org/2000/svg", "text");
	number.setAttribute("x", "21");
	number.setAttribute("y", "23");
	number.setAttribute("text-anchor", "middle");
	number.classList.add("chart-number");
	number.textContent = String(count);
	chart.append(track, value, number);
	return chart;
}

// Build an inline photo review and reporting panel for a selected bin.
function createReportPanel(spot) {
	const panel = document.createElement("section");
	panel.className = "report-panel";
	panel.setAttribute("aria-label", `Report ${spot.name} as full`);

	const heading = document.createElement("div");
	heading.className = "report-panel-heading";
	const title = document.createElement("h3");
	title.textContent = "Review before reporting";
	const close = document.createElement("button");
	close.type = "button";
	close.className = "report-panel-close";
	close.setAttribute("aria-label", "Close report details");
	close.textContent = "×";
	heading.append(title, close);

	const analytics = document.createElement("div");
	analytics.className = "report-analytics";
	analytics.append(createReportChart(spot));
	const analyticsText = document.createElement("p");
	analyticsText.textContent = `${reportAnalytics.bySpot[spot.id] || 0} clicks for this bin; ${reportAnalytics.total} total report button clicks on this device.`;
	analytics.append(analyticsText);

	const form = document.createElement("form");
	form.className = "report-review-form";
	const photoTitle = document.createElement("h4");
	photoTitle.textContent = "Add a photo for manual review";
	const photoHelp = document.createElement("p");
	photoHelp.className = "report-photo-help";
	photoHelp.textContent = "Choose an existing image or take a photo. BinRadar does not automatically detect fullness or spam.";

	const inputId = `report-photo-${spot.id}`;
	const cameraId = `report-camera-${spot.id}`;
	const fileInput = document.createElement("input");
	fileInput.id = inputId;
	fileInput.type = "file";
	fileInput.accept = "image/*";
	fileInput.className = "visually-hidden";
	fileInput.tabIndex = -1;
	fileInput.setAttribute("aria-label", "Choose a bin photo");
	const cameraInput = document.createElement("input");
	cameraInput.id = cameraId;
	cameraInput.type = "file";
	cameraInput.accept = "image/*";
	cameraInput.setAttribute("capture", "environment");
	cameraInput.className = "visually-hidden";
	cameraInput.tabIndex = -1;
	cameraInput.setAttribute("aria-label", "Take a bin photo with your camera");

	const photoActions = document.createElement("div");
	photoActions.className = "report-photo-actions";
	const chooseButton = document.createElement("button");
	chooseButton.type = "button";
	chooseButton.className = "photo-action";
	chooseButton.textContent = "Upload image";
	chooseButton.addEventListener("click", () => fileInput.click());
	const cameraButton = document.createElement("button");
	cameraButton.type = "button";
	cameraButton.className = "photo-action photo-camera-action";
	cameraButton.textContent = "Open camera";
	cameraButton.addEventListener("click", () => cameraInput.click());
	photoActions.append(chooseButton, cameraButton);

	const preview = document.createElement("img");
	preview.className = "report-photo-preview";
	preview.alt = `Photo preview for ${spot.name}`;
	preview.hidden = true;
	const fileStatus = document.createElement("p");
	fileStatus.className = "report-file-status";
	fileStatus.setAttribute("aria-live", "polite");
	fileStatus.textContent = "A photo is required before submitting this report.";

	const confirmationLabel = document.createElement("label");
	confirmationLabel.className = "report-confirm-label";
	const confirmation = document.createElement("input");
	confirmation.type = "checkbox";
	confirmation.required = true;
	const confirmationText = document.createElement("span");
	confirmationText.textContent = "I reviewed this photo and confirm the bin appears full.";
	confirmationLabel.append(confirmation, confirmationText);

	const privacyNote = document.createElement("p");
	privacyNote.className = "report-privacy-note";
	privacyNote.textContent = "The photo stays on this device. To send it to the collector, attach it manually in WhatsApp.";
	const submit = document.createElement("button");
	submit.type = "submit";
	submit.className = "report-submit";
	submit.textContent = "Confirm report and open WhatsApp";
	submit.disabled = true;

	function updateSubmitState() {
		submit.disabled = !fileInput.files.length && !cameraInput.files.length || !confirmation.checked;
	}

	function showSelectedImage(event) {
		const file = event.target.files[0];
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			event.target.value = "";
			fileStatus.textContent = "Please choose an image file.";
			return;
		}
		if (file.size > 8 * 1024 * 1024) {
			event.target.value = "";
			fileStatus.textContent = "This image is over 8 MB. Choose a smaller image.";
			return;
		}
		const otherInput = event.target === fileInput ? cameraInput : fileInput;
		otherInput.value = "";
		if (activeReportObjectUrl) URL.revokeObjectURL(activeReportObjectUrl);
		activeReportObjectUrl = URL.createObjectURL(file);
		preview.src = activeReportObjectUrl;
		preview.hidden = false;
		fileStatus.textContent = `${file.name} - ready for your review.`;
		updateSubmitState();
	}

	fileInput.addEventListener("change", showSelectedImage);
	cameraInput.addEventListener("change", showSelectedImage);
	confirmation.addEventListener("change", updateSubmitState);
	close.addEventListener("click", () => {
		panel.remove();
		clearReportPhotoPreview();
		activeReportRow = null;
	});
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const photo = fileInput.files[0] || cameraInput.files[0];
		if (!photo || !confirmation.checked) return;
		panel.remove();
		clearReportPhotoPreview();
		activeReportRow = null;
		reportSpot(spot, true);
	});

	form.append(photoTitle, photoHelp, fileInput, cameraInput, photoActions, preview, fileStatus, confirmationLabel, privacyNote, submit);
	panel.append(heading, analytics, form);
	return panel;
}

function clearReportPhotoPreview() {
	if (activeReportObjectUrl) URL.revokeObjectURL(activeReportObjectUrl);
	activeReportObjectUrl = null;
}

// Record each report-button click locally and toggle its details panel.
function toggleReportPanel(spot, row) {
	reportAnalytics.total += 1;
	reportAnalytics.bySpot[spot.id] = (reportAnalytics.bySpot[spot.id] || 0) + 1;
	saveReportAnalytics();
	const existingPanel = row.querySelector(".report-panel");
	if (existingPanel) {
		existingPanel.remove();
		clearReportPhotoPreview();
		activeReportRow = null;
		return;
	}
	binList.querySelectorAll(".report-panel").forEach((panel) => panel.remove());
	clearReportPhotoPreview();
	activeReportRow = row;
	row.append(createReportPanel(spot));
}

// Put safe text into each map popup.
function popupContent(spot) {
	const content = document.createElement("div");
	const title = document.createElement("span");
	title.className = "popup-title";
	title.textContent = spot.name;
	const details = document.createElement("span");
	details.textContent = `${spot.area} - ${statuses[spot.id] === "full" ? "Full" : "OK"}${spot.isCommunity ? " - Local suggestion" : ""}`;
	content.append(title, details);
	return content;
}

function iconForSpot(spot) {
	const state = statuses[spot.id] === "full" ? "marker-full" : "marker-ok";
	return L.divIcon({ className: "", html: `<span class="bin-marker ${state}" aria-hidden="true"></span>`, iconSize: [44, 44], iconAnchor: [22, 22] });
}

// Refresh the marker after its status changes.
function updateSpotMarker(spot) {
	const marker = spotMarkers.get(spot.id);
	if (!marker) return;
	marker.setIcon(iconForSpot(spot));
	marker.setPopupContent(popupContent(spot));
}

// Initialize Leaflet and keep the map size correct when the layout changes.
function initializeMap() {
	if (!window.L) {
		mapFallback.hidden = false;
		mapFallback.textContent = "The map needs an internet connection. Your bin list is still available below.";
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
	getAllSpots().forEach((spot) => {
		const marker = L.marker([spot.lat, spot.lng], { icon: iconForSpot(spot) }).addTo(map);
		marker.bindPopup(popupContent(spot));
		spotMarkers.set(spot.id, marker);
	});
	map.on("click", (event) => openSuggestionForm(event.latlng));
	requestAnimationFrame(() => map.invalidateSize());
	window.addEventListener("resize", invalidateMapSize);
	if ("ResizeObserver" in window) {
		const observer = new ResizeObserver(invalidateMapSize);
		observer.observe(document.querySelector(".map-card"));
	}
}

function invalidateMapSize() {
	if (map) requestAnimationFrame(() => map.invalidateSize());
}

// Draw a direct guide line and blue radar rings around the user's current position.
function drawTrackerLayers() {
	if (!map || !userPosition) return;
	const blue = getComputedStyle(document.documentElement).getPropertyValue("--blue-600").trim();
	if (guideLine) map.removeLayer(guideLine);
	if (destinationSpot) {
		guideLine = L.polyline([[userPosition.lat, userPosition.lng], [destinationSpot.lat, destinationSpot.lng]], {
			color: blue,
			weight: 4,
			dashArray: "8 8",
			opacity: 0.9
		}).addTo(map);
	}
	radarRings.forEach((ring) => map.removeLayer(ring));
	radarRings = [250, 500, 1000].map((radius) => L.circle([userPosition.lat, userPosition.lng], {
		radius,
		color: blue,
		weight: 1,
		fillColor: blue,
		fillOpacity: 0,
		interactive: false
	}).addTo(map));
}

// Fit the map around the user and three nearest sample points.
function showNearest(spots) {
	if (!map || !userPosition) return;
	const nearby = spots.slice(0, 3);
	const bounds = L.latLngBounds([[userPosition.lat, userPosition.lng], ...nearby.map((spot) => [spot.lat, spot.lng])]);
	map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
}

// Open the guide panel for the closest available bin and update directions.
function openRouteGuide(autoTrack = false, preferredSpot = null) {
	if (!userPosition) return;
	arrivalAwardedThisTrip = false;
	destinationSpot = preferredSpot
		|| getAllSpots().find((spot) => spot.id === pendingDestinationId)
		|| sortedSpots.find((spot) => statuses[spot.id] !== "full")
		|| sortedSpots[0];
	pendingDestinationId = "";
	if (!destinationSpot) return;
	routePanel.hidden = false;
	routeState.textContent = statuses[destinationSpot.id] === "full" ? "Nearest point (reported full)" : "Nearest available collection point";
	routeDestination.textContent = `${destinationSpot.name} - ${destinationSpot.area}`;
	updateRouteReadout();
	updateDirectionsLink();
	drawTrackerLayers();
	if (map) {
		const focusBounds = L.latLngBounds([[userPosition.lat, userPosition.lng], [destinationSpot.lat, destinationSpot.lng]]);
		map.fitBounds(focusBounds, { padding: [40, 40], maxZoom: 16 });
		spotMarkers.get(destinationSpot.id)?.openPopup();
	}
	if (autoTrack && distanceKm(userPosition, destinationSpot) >= 0.03) startTracking();
	routePanel.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
}

function updateRouteReadout() {
	if (!userPosition || !destinationSpot) return;
	const directDistance = distanceKm(userPosition, destinationSpot);
	routeDistance.textContent = `${directDistance.toFixed(1)} km`;
	routeEta.textContent = `${Math.max(1, Math.ceil(directDistance / 4 * 60))} min`;
	if (directDistance < 0.05) {
		if (!arrivalAwardedThisTrip) {
			if (!awardVisitStar()) {
				routeInstruction.textContent = currentUser
					? `You reached ${destinationSpot.name}.`
					: `You reached ${destinationSpot.name}. Sign in to earn a visit star.`;
				routeState.textContent = "Collection point reached";
				arrivalAwardedThisTrip = true;
			}
		}
		stopTracking();
	} else {
		routeInstruction.textContent = "Follow the blue guide line toward the marker. For street-by-street directions, open Maps.";
	}
}

function updateDirectionsLink() {
	if (!destinationSpot) return;
	const destination = `${destinationSpot.lat},${destinationSpot.lng}`;
	const origin = userPosition ? `&origin=${userPosition.lat},${userPosition.lng}` : "";
	externalDirections.href = `https://www.google.com/maps/dir/?api=1&destination=${destination}${origin}&travelmode=walking`;
}

// Update the user's dot and guide line whenever GPS reports a new position.
function updateTrackedPosition(position) {
	userPosition = { lat: position.coords.latitude, lng: position.coords.longitude };
	gpsPositionVerified = true;
	sortedSpots = getAllSpots().sort((first, second) => distanceKm(userPosition, first) - distanceKm(userPosition, second));
	renderCards();
	if (map) {
		if (!userMarker) {
			userMarker = L.marker([userPosition.lat, userPosition.lng], {
				icon: L.divIcon({ className: "", html: '<span class="bin-marker marker-user" aria-label="Your location"></span>', iconSize: [44, 44], iconAnchor: [22, 22] })
			}).addTo(map).bindPopup("Your location");
		} else {
			userMarker.setLatLng([userPosition.lat, userPosition.lng]);
		}
		drawTrackerLayers();
		if (destinationSpot) map.fitBounds(L.latLngBounds([[userPosition.lat, userPosition.lng], [destinationSpot.lat, destinationSpot.lng]]), { padding: [40, 40], maxZoom: 16 });
	}
	updateRouteReadout();
	updateDirectionsLink();
	setMessage("Your location is updating as you move.", "success");
}

// Watch the device location while the visitor follows the route.
function startTracking() {
	if (!navigator.geolocation || watchId !== null) return;
	watchId = navigator.geolocation.watchPosition(updateTrackedPosition, () => {
		routeState.textContent = "Live tracking paused";
		routeInstruction.textContent = "We lost the live location signal. Open Maps for navigation or try tracking again.";
		stopTracking();
	}, { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 });
	trackStart.hidden = true;
	trackStop.hidden = false;
	routeState.textContent = "Live location tracking";
}

function stopTracking() {
	if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
	watchId = null;
	trackStart.hidden = false;
	trackStop.hidden = true;
}

// Both find buttons request location with a ten-second timeout.
function findNearby() {
	setMessage("Finding your location…");
	findButton.disabled = true;
	permissionButton.disabled = true;
	fallbackControl.hidden = true;
	if (!navigator.geolocation) {
		handleLocationError("This browser does not support location.");
		return;
	}
	navigator.geolocation.getCurrentPosition((position) => {
		findButton.disabled = false;
		permissionButton.disabled = false;
		permissionStrip.hidden = true;
		applyPosition({ lat: position.coords.latitude, lng: position.coords.longitude }, true);
	}, (error) => {
		const message = error.code === 1
			? "Location permission was denied. Choose an area below to find nearby bins."
			: error.code === 3
				? "Location took too long to respond. Choose an area below to find nearby bins."
				: "We could not get your location. Choose an area below to find nearby bins.";
		handleLocationError(message);
	}, { timeout: 10000, enableHighAccuracy: false, maximumAge: 60000 });
}

function applyPosition(position, fromDevice = false) {
	userPosition = { lat: position.lat, lng: position.lng };
	gpsPositionVerified = fromDevice;
	sortedSpots = getAllSpots().sort((first, second) => distanceKm(userPosition, first) - distanceKm(userPosition, second));
	renderCards();
	if (map) {
		if (userMarker) map.removeLayer(userMarker);
		userMarker = L.marker([userPosition.lat, userPosition.lng], {
			icon: L.divIcon({ className: "", html: '<span class="bin-marker marker-user" aria-label="Your location"></span>', iconSize: [44, 44], iconAnchor: [22, 22] })
		}).addTo(map).bindPopup("Your location");
	}
	if (fromDevice) permissionStrip.hidden = true;
	openRouteGuide(fromDevice);
	setMessage("Showing the nearest bins first.", "success");
}

function handleLocationError(message) {
	findButton.disabled = false;
	permissionButton.disabled = false;
	permissionStrip.hidden = false;
	permissionText.textContent = "Location is blocked. Pick your area instead.";
	fallbackControl.hidden = false;
	setMessage(message, "error");
	areaSelect.focus();
}

// Add each sample area to the fallback picker.
function populateAreaOptions() {
	getAllSpots().forEach((spot) => {
		const option = document.createElement("option");
		option.value = spot.id;
		option.textContent = `${spot.area} — ${spot.name}`;
		areaSelect.append(option);
	});
}

// Persist community suggestions separately from the built-in sample locations.
function saveCommunitySpots() {
	try {
		localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(communitySpots));
		return true;
	} catch (error) {
		return false;
	}
}

// Open the form at the exact map point the visitor selected.
function openSuggestionForm(latlng) {
	suggestionPosition = { lat: latlng.lat, lng: latlng.lng };
	suggestCoordinates.textContent = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
	suggestForm.hidden = false;
	if (suggestionMarker) map.removeLayer(suggestionMarker);
	suggestionMarker = L.circleMarker(latlng, {
		radius: 9,
		color: getComputedStyle(document.documentElement).getPropertyValue("--green-900").trim(),
		weight: 3,
		fillColor: getComputedStyle(document.documentElement).getPropertyValue("--lime-300").trim(),
		fillOpacity: 1
	}).addTo(map);
	suggestName.focus();
	requestAnimationFrame(() => map.invalidateSize());
}

function closeSuggestionForm() {
	suggestForm.reset();
	suggestForm.hidden = true;
	suggestionPosition = null;
	if (suggestionMarker && map) map.removeLayer(suggestionMarker);
	suggestionMarker = null;
	requestAnimationFrame(() => map?.invalidateSize());
}

// Save the new point on this device and immediately add it to the list and map.
function saveSuggestion(event) {
	event.preventDefault();
	const name = suggestName.value.trim();
	const area = suggestArea.value.trim();
	if (!suggestionPosition || !name || !area) return;

	const spot = {
		id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		name,
		area,
		lat: suggestionPosition.lat,
		lng: suggestionPosition.lng,
		isCommunity: true
	};
	communitySpots.push(spot);
	statuses[spot.id] = "ok";
	const saved = saveCommunitySpots();
	saveStatuses();
	if (userPosition) sortedSpots = getAllSpots().sort((first, second) => distanceKm(userPosition, first) - distanceKm(userPosition, second));
	else sortedSpots = getAllSpots();
	if (map) {
		const marker = L.marker([spot.lat, spot.lng], { icon: iconForSpot(spot) }).addTo(map);
		marker.bindPopup(popupContent(spot));
		spotMarkers.set(spot.id, marker);
		map.setView([spot.lat, spot.lng], 17);
		marker.openPopup();
	}
	const option = document.createElement("option");
	option.value = spot.id;
	option.textContent = `${spot.area} - ${spot.name} (local)`;
	areaSelect.append(option);
	closeSuggestionForm();
	renderCards();
	setMessage(saved ? "Suggested bin saved on this device only." : "Suggested bin added for this visit. Browser storage is unavailable, so it was not saved.", saved ? "success" : "error");
}

// Zoom to a bin, open its popup, and bring the map into view.
function focusSpot(spot) {
	if (!map || !spotMarkers.has(spot.id)) {
		setMessage("The map is unavailable offline, but this bin is still listed.", "error");
		return;
	}
	map.setView([spot.lat, spot.lng], 17);
	spotMarkers.get(spot.id).openPopup();
	mapElement.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
	requestAnimationFrame(() => map.invalidateSize());
}

// Mark a full bin and open WhatsApp with a ready-to-send message.
function reportSpot(spot, hasPhoto = false) {
	statuses[spot.id] = "full";
	saveStatuses();
	renderCards();
	updateSpotMarker(spot);
	setMessage(hasPhoto
		? `${spot.name} is marked full. WhatsApp is ready; attach the photo manually if you want to send it.`
		: `${spot.name} is marked full. WhatsApp is ready for you to send the alert.`, "success");
	const message = `Alert: the waste bin at ${spot.name}, ${spot.area} is FULL. Please collect it. Location: https://maps.google.com/?q=${spot.lat},${spot.lng}`;
	window.open(`https://wa.me/${COLLECTOR_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
}

function setFilterButtons() {
	filterAllButton.classList.toggle("is-selected", !showFullOnly);
	filterFullButton.classList.toggle("is-selected", showFullOnly);
	filterAllButton.setAttribute("aria-pressed", String(!showFullOnly));
	filterFullButton.setAttribute("aria-pressed", String(showFullOnly));
}

function setMenuOpen(isOpen) {
	menuToggle.setAttribute("aria-expanded", String(isOpen));
	menuToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
	mobileNav.classList.toggle("is-open", isOpen);
	mobileNav.setAttribute("aria-hidden", String(!isOpen));
	mobileNav.inert = !isOpen;
	drawerBackdrop.hidden = !isOpen;
	document.body.classList.toggle("drawer-open", isOpen);
	if (isOpen) mobileNav.querySelector(".nav-link")?.focus();
	else menuToggle.focus();
}

function setActiveNav(href) {
	document.querySelectorAll(".nav-link").forEach((link) => {
		const active = link.getAttribute("href") === href;
		link.classList.toggle("is-active", active);
		if (active) link.setAttribute("aria-current", "page");
		else link.removeAttribute("aria-current");
	});
}

// Open Area Stars as its own focused screen and restore the usual app view on exit.
function setFocusedView(view) {
	document.body.classList.toggle("area-view-active", view === "area");
	document.body.classList.toggle("user-view-active", view === "user");
	if (view) {
		window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
		const headingId = view === "area" ? "area-title" : "user-title";
		document.getElementById(headingId).focus({ preventScroll: true });
	} else {
		window.scrollTo({ top: 0, behavior: "auto" });
	}
}

// Connect the location, route, filters, reset, and navigation controls.
findButton.addEventListener("click", findNearby);
permissionButton.addEventListener("click", findNearby);
areaSelect.addEventListener("change", () => {
	const spot = getAllSpots().find((entry) => entry.id === areaSelect.value);
	if (spot) {
		fallbackControl.hidden = true;
		applyPosition({ lat: spot.lat, lng: spot.lng });
	}
});
document.getElementById("route-close").addEventListener("click", () => {
	stopTracking();
	routePanel.hidden = true;
	if (guideLine && map) map.removeLayer(guideLine);
	guideLine = null;
});
trackStart.addEventListener("click", () => {
	if (!userPosition) return;
	if (navigator.geolocation) startTracking();
	else findNearby();
});
trackStop.addEventListener("click", stopTracking);
filterAllButton.addEventListener("click", () => { showFullOnly = false; setFilterButtons(); renderCards(); });
filterFullButton.addEventListener("click", () => { showFullOnly = true; setFilterButtons(); renderCards(); });
loginForm.addEventListener("submit", signIn);
logoutButton.addEventListener("click", signOut);
suggestForm.addEventListener("submit", saveSuggestion);
suggestCancel.addEventListener("click", closeSuggestionForm);
menuToggle.addEventListener("click", () => setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true"));
drawerBackdrop.addEventListener("click", () => setMenuOpen(false));
document.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
	const href = link.getAttribute("href");
	setActiveNav(href);
	setFocusedView(href === "#area-section" ? "area" : href === "#user-section" ? "user" : null);
	setMenuOpen(false);
}));
areaBackButton.addEventListener("click", () => {
	setActiveNav("#bin-section");
	setFocusedView(null);
	document.getElementById("bin-section").scrollIntoView({ behavior: "smooth", block: "start" });
});
document.getElementById("user-back").addEventListener("click", () => {
	setActiveNav("#bin-section");
	setFocusedView(null);
	document.getElementById("bin-section").scrollIntoView({ behavior: "smooth", block: "start" });
});
areaSigninLink.addEventListener("click", (event) => {
	event.preventDefault();
	setActiveNav("#user-section");
	setFocusedView("user");
});
document.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
		setMenuOpen(false);
		menuToggle.focus();
	}
});

populateAreaOptions();
setFilterButtons();
renderCards();
initializeMap();