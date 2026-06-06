mapboxgl.accessToken = "pk.eyJ1IjoicHJlY2lzbyIsImEiOiJjbW1yMnR4Ym0xNXo2MnFvcjF3OWhjeG0xIn0.0kik_HY1s4mLhwZE3W3aRQ";

/* =========================
   CONFIG
========================= */
const SHOP_URL = "https://precisoart.myshopify.com";
const STOREFRONT_TOKEN = "c9a152a9e40b1bbbb9e9be8367dcca4c";
const FALLBACK_IMAGE = "https://picsum.photos/800";
const MAP_STYLE_URLS = {
  satellite: "mapbox://styles/preciso/cmmr4qr4k000i01s300a1egdu",
  standard: "mapbox://styles/mapbox/streets-v12"
};

/* =========================
   HOME VIEW
========================= */
const HOME_VIEW = {
  center: [-85.2, 43.2],
  zoom: 5.55
};

const REGION_VIEWS = {
  all: {
    center: HOME_VIEW.center,
    zoom: HOME_VIEW.zoom
  },
  west: {
    center: [-119, 40],
    zoom: 4.05
  },
  northAmerica: {
    center: [-102, 37],
    zoom: 2.15
  },
  south: {
    center: [-91, 31],
    zoom: 4.05
  },
  east: {
    center: [-74, 41],
    zoom: 4.65
  },
  midwest: {
    center: [-91, 43],
    zoom: 4.45
  },
  caribbean: {
    center: [-81.5, 19.8],
    zoom: 3.75
  },
  europe: {
    center: [17, 48.8],
    zoom: 4.15
  },
  asia: {
    center: [108, 20],
    zoom: 2.8
  }
};

const REGION_MATCH_BOUNDS = {
  northAmerica: [[-170, 15], [-52, 72]],
  west: [[-170, 15], [-104, 72]],
  south: [[-106, 15], [-75, 37.5]],
  east: [[-82, 24], [-52, 56]],
  midwest: [[-104, 36], [-80, 56]],
  caribbean: [[-89, 9], [-58, 26.5]],
  europe: [[-25, 34], [45, 72]],
  asia: [[45, -12], [180, 60]]
};

const USA_FILTER_KEY = "country:usa";
const USA_COORDINATE_BOUNDS = [[-125, 24], [-66, 50]];
const LOCATION_FILTER_PADDING = {
  top: 145,
  bottom: 150,
  left: 80,
  right: 80
};

const US_STATE_LABELS = {
  al: "Alabama",
  alabama: "Alabama",
  ak: "Alaska",
  alaska: "Alaska",
  az: "Arizona",
  arizona: "Arizona",
  ar: "Arkansas",
  arkansas: "Arkansas",
  ca: "California",
  california: "California",
  co: "Colorado",
  colorado: "Colorado",
  ct: "Connecticut",
  connecticut: "Connecticut",
  de: "Delaware",
  delaware: "Delaware",
  dc: "Washington, DC",
  "washington dc": "Washington, DC",
  "district of columbia": "Washington, DC",
  fl: "Florida",
  florida: "Florida",
  ga: "Georgia",
  georgia: "Georgia",
  hi: "Hawaii",
  hawaii: "Hawaii",
  id: "Idaho",
  idaho: "Idaho",
  il: "Illinois",
  illinois: "Illinois",
  in: "Indiana",
  indiana: "Indiana",
  ia: "Iowa",
  iowa: "Iowa",
  ks: "Kansas",
  kansas: "Kansas",
  ky: "Kentucky",
  kentucky: "Kentucky",
  la: "Louisiana",
  louisiana: "Louisiana",
  me: "Maine",
  maine: "Maine",
  md: "Maryland",
  maryland: "Maryland",
  ma: "Massachusetts",
  massachusetts: "Massachusetts",
  mi: "Michigan",
  michigan: "Michigan",
  mn: "Minnesota",
  minnesota: "Minnesota",
  ms: "Mississippi",
  mississippi: "Mississippi",
  mo: "Missouri",
  missouri: "Missouri",
  mt: "Montana",
  montana: "Montana",
  ne: "Nebraska",
  nebraska: "Nebraska",
  nv: "Nevada",
  nevada: "Nevada",
  nh: "New Hampshire",
  "new hampshire": "New Hampshire",
  nj: "New Jersey",
  "new jersey": "New Jersey",
  nm: "New Mexico",
  "new mexico": "New Mexico",
  ny: "New York",
  "new york": "New York",
  nc: "North Carolina",
  "north carolina": "North Carolina",
  nd: "North Dakota",
  "north dakota": "North Dakota",
  oh: "Ohio",
  ohio: "Ohio",
  ok: "Oklahoma",
  oklahoma: "Oklahoma",
  or: "Oregon",
  oregon: "Oregon",
  pa: "Pennsylvania",
  pennsylvania: "Pennsylvania",
  ri: "Rhode Island",
  "rhode island": "Rhode Island",
  sc: "South Carolina",
  "south carolina": "South Carolina",
  sd: "South Dakota",
  "south dakota": "South Dakota",
  tn: "Tennessee",
  tennessee: "Tennessee",
  tx: "Texas",
  texas: "Texas",
  ut: "Utah",
  utah: "Utah",
  vt: "Vermont",
  vermont: "Vermont",
  va: "Virginia",
  virginia: "Virginia",
  wa: "Washington",
  washington: "Washington",
  wv: "West Virginia",
  "west virginia": "West Virginia",
  wi: "Wisconsin",
  wisconsin: "Wisconsin",
  wy: "Wyoming",
  wyoming: "Wyoming"
};

/* =========================
   STATE
========================= */
let listings = [];
let markers = [];
let clusterMarkers = [];
let locationFilters = new Map();
let activeRegionKey = "all";
let activeItem = null;
let currentMapStyleKey = "satellite";
let isResetting = false;
let edgeIndicatorEls = new Map();
let explodedMarkerGroup = null;
let nearbyRenderToken = 0;
let regionMenuCloseTimer = null;

const MARKER_EXPLODE_DISTANCE = 58;
const MARKER_EXPLODE_RADIUS = 62;
const MARKER_EXPLODE_MAX_ITEMS = 12;
const MARKER_CLUSTER_MAX_ZOOM = 9.2;
const MARKER_CLUSTER_DISTANCE = 58;
const NEARBY_PRINT_LIMIT = 6;
const NEARBY_TRANSITION_MS = 150;
const SHEET_MARKER_TRANSITION_MS = 1650;
const REGION_MARKER_TRANSITION_MS = 2700;
const REGION_TRANSITION_MS = 1450;
const GESTURE_ZOOM_TRANSITION_MS = 140;
const DOUBLE_TAP_ZOOM_TRANSITION_MS = 420;
const DOUBLE_CLICK_ZOOM_TRANSITION_MS = 320;
const TRACKPAD_PINCH_ZOOM_RATE = 0.018;
const TRACKPAD_PINCH_MAX_DELTA = 0.72;
const SAFARI_GESTURE_ZOOM_RATE = 2.65;
const MAP_CONTROL_ZOOM_STEP = 1;
const PRODUCT_FETCH_PAGE_SIZE = 250;
const NEW_PRINT_COUNT = 6;
const PHOTO_STRIP_LIMIT = 18;

/* =========================
   HELPERS
========================= */
function getItemId(item) {
  return `${item.title}|${item.lat}|${item.lng}`;
}

function clearMarkers() {
  resetExplodedMarkers();
  markers.forEach((marker) => marker.remove());
  markers = [];
  clearClusterMarkers();
}

function clearClusterMarkers() {
  clusterMarkers.forEach((marker) => marker.remove());
  clusterMarkers = [];
}

function setMarkerStack(markerShell, isActive) {
  const markerWrapper = markerShell.closest(".mapboxgl-marker");

  if (isActive) {
    markerShell.style.setProperty("z-index", "10000", "important");

    if (markerWrapper) {
      markerWrapper.style.setProperty("z-index", "10000", "important");
      markerWrapper.style.pointerEvents = "auto";
      markerWrapper.parentElement?.appendChild(markerWrapper);
    }

    return;
  }

  markerShell.style.removeProperty("z-index");
  if (markerWrapper) {
    markerWrapper.style.removeProperty("z-index");
  }
}

function setActiveMarkerState(itemId = "") {
  document.querySelectorAll(".custom-marker-shell").forEach((markerShell) => {
    const isActive = markerShell.dataset.itemId === itemId;
    markerShell.classList.toggle("active", isActive);
    setMarkerStack(markerShell, isActive);

    const markerInner = markerShell.querySelector(".custom-marker");
    if (!markerInner) return;

    markerInner.classList.toggle("active", isActive);

    if (!isActive) {
      markerInner.classList.remove("hover", "pop");
    }
  });

  syncPhotoStripActive(itemId);
}

function forceActiveMarkerVisible() {
  if (!activeItem?.id) return;

  const markerShell = document.querySelector(`.custom-marker-shell[data-item-id="${CSS.escape(activeItem.id)}"]`);
  if (!markerShell) return;

  const markerWrapper = markerShell.closest(".mapboxgl-marker");

  markerShell.style.display = "";
  markerShell.style.opacity = "1";
  markerShell.style.pointerEvents = "auto";
  markerShell.style.setProperty("z-index", "10000", "important");
  markerShell.classList.add("active");

  const markerInner = markerShell.querySelector(".custom-marker");
  if (markerInner) {
    markerInner.style.display = "";
    markerInner.style.opacity = "1";
    markerInner.classList.add("active");
  }

  if (markerWrapper) {
    markerWrapper.style.display = "block";
    markerWrapper.style.opacity = "1";
    markerWrapper.style.pointerEvents = "auto";
    markerWrapper.style.setProperty("z-index", "10000", "important");
    markerWrapper.parentElement?.appendChild(markerWrapper);
  }
}

function triggerActiveMarkerPop(itemId) {
  if (!itemId) return;

  const markerShell = document.querySelector(`.custom-marker-shell[data-item-id="${CSS.escape(itemId)}"]`);
  const markerEl = markerShell?.querySelector(".custom-marker");
  if (!markerEl) return;

  markerEl.classList.remove("pop");
  void markerEl.offsetWidth;

  requestAnimationFrame(() => {
    markerEl.classList.add("pop");
  });

  window.setTimeout(() => {
    markerEl.classList.remove("pop");
  }, 520);
}

function clearMarkerHoverStates() {
  document.querySelectorAll(".custom-marker").forEach((markerEl) => {
    markerEl.classList.remove("hover");
  });
}

function clearEdgeIndicators() {
  edgeIndicatorEls.forEach((el) => el.remove());
  edgeIndicatorEls.clear();
}

function getItemLocationLabel(item) {
  return [item?.location2, item?.location1].filter(Boolean).join(" • ") || item?.title || "Print";
}

function getMarkerLabel(item) {
  const location = item?.location2 || item?.location1 || item?.title || "Print";
  return location.replace(/\s+/g, " ").trim();
}

function hideMarkerPreview() {
  const preview = document.getElementById("marker-preview");
  if (!preview) return;

  preview.classList.add("hidden");
  preview.setAttribute("aria-hidden", "true");
  preview.replaceChildren();
}

function showMarkerPreview(item, event) {
  if (!item || window.matchMedia("(max-width: 700px)").matches) return;

  const preview = document.getElementById("marker-preview");
  if (!preview) return;

  const copy = document.createElement("div");
  copy.className = "marker-preview-copy";

  const title = document.createElement("div");
  title.className = "marker-preview-title";
  title.textContent = getItemLocationLabel(item);

  const meta = document.createElement("div");
  meta.className = "marker-preview-meta";
  meta.textContent = item.moment || item.title || "Print";

  copy.append(title, meta);
  preview.replaceChildren(copy);
  moveMarkerPreview(event);
  preview.classList.remove("hidden");
  preview.setAttribute("aria-hidden", "false");
}

function moveMarkerPreview(event) {
  const preview = document.getElementById("marker-preview");
  if (!preview || preview.classList.contains("hidden")) return;

  const clientX = event?.clientX ?? window.innerWidth / 2;
  const clientY = event?.clientY ?? window.innerHeight / 2;
  const padding = 132;
  const x = Math.min(window.innerWidth - padding, Math.max(padding, clientX));
  const y = Math.max(96, clientY);

  preview.style.left = `${x}px`;
  preview.style.top = `${y}px`;
}

function hasValidCoordinates(item) {
  return Number.isFinite(item?.lng) && Number.isFinite(item?.lat);
}

function getDistanceMiles(a, b) {
  if (!hasValidCoordinates(a) || !hasValidCoordinates(b)) return Infinity;

  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistanceMiles(distance) {
  if (!Number.isFinite(distance)) return "";
  if (distance < 1) return "<1 mi";
  if (distance < 10) return `${distance.toFixed(1)} mi`;
  return `${Math.round(distance)} mi`;
}

function getNearbyItems(item, limit = NEARBY_PRINT_LIMIT) {
  if (!item || !listings.length) return [];

  return listings
    .filter((candidate) => candidate.id !== item.id && hasValidCoordinates(candidate))
    .map((candidate) => ({
      item: candidate,
      distance: getDistanceMiles(item, candidate)
    }))
    .filter(({ distance }) => Number.isFinite(distance))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

function getCreatedTimestamp(item) {
  const timestamp = Date.parse(item?.createdAt || "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function markNewestPrints() {
  const newestItems = listings
    .filter((item) => getCreatedTimestamp(item) > 0)
    .sort((a, b) => getCreatedTimestamp(b) - getCreatedTimestamp(a))
    .slice(0, NEW_PRINT_COUNT);
  const newestIds = new Set(newestItems.map((item) => item.id));

  listings.forEach((item) => {
    item.isNewPrint = newestIds.has(item.id);
  });
}

function formatCount(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getRegionItems(regionKey = activeRegionKey) {
  return getItemsForRegion(regionKey).filter(hasValidCoordinates);
}

function getRegionLocationCount(items) {
  return new Set(items.map((item) => getItemLocationLabel(item))).size;
}

function buildTrailItems(items) {
  const remaining = items.filter(hasValidCoordinates);
  if (remaining.length <= 2) return remaining;

  remaining.sort((a, b) => {
    const createdDelta = getCreatedTimestamp(b) - getCreatedTimestamp(a);
    return createdDelta || getMarkerLabel(a).localeCompare(getMarkerLabel(b));
  });

  const trail = [remaining.shift()];
  while (remaining.length) {
    const current = trail[trail.length - 1];
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    remaining.forEach((candidate, index) => {
      const distance = getDistanceMiles(current, candidate);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    trail.push(remaining.splice(nearestIndex, 1)[0]);
  }

  return trail;
}

function getTrailItemsForRegion(regionKey = activeRegionKey) {
  return buildTrailItems(getRegionItems(regionKey));
}

function getNextTrailItem(direction = "next") {
  if (!activeItem) return null;

  const trailItems = getTrailItemsForRegion(activeRegionKey);
  if (trailItems.length < 2) return null;

  const currentIndex = trailItems.findIndex((item) => item.id === activeItem.id);
  if (currentIndex === -1) return null;

  const offset = direction === "previous" ? -1 : 1;
  const nextIndex = (currentIndex + offset + trailItems.length) % trailItems.length;
  return trailItems[nextIndex];
}

function hideRegionIntro() {
  const intro = document.getElementById("region-intro");
  if (!intro) return;

  intro.classList.add("hidden");
  intro.setAttribute("aria-hidden", "true");
}

function renderRegionIntro(regionKey = activeRegionKey) {
  const intro = document.getElementById("region-intro");
  const title = document.getElementById("region-intro-title");
  const meta = document.getElementById("region-intro-meta");
  const exploreButton = document.getElementById("region-explore");
  if (!intro || !title || !meta) return;

  const items = getRegionItems(regionKey);
  if (!items.length) {
    hideRegionIntro();
    return;
  }

  const viewLabel = getActiveViewLabel(regionKey);
  const titleLabel = regionKey === "all" ? "Preciso Prints" : `${viewLabel} Prints`;
  const locationCount = getRegionLocationCount(items);

  title.textContent = titleLabel;
  meta.textContent = `${formatCount(locationCount, "location")} · ${formatCount(items.length, "print")}`;
  if (exploreButton) {
    exploreButton.disabled = items.length < 1;
    exploreButton.dataset.region = regionKey;
  }

  intro.classList.remove("hidden");
  intro.setAttribute("aria-hidden", "false");
  intro.classList.remove("is-fresh");
  void intro.offsetWidth;
  intro.classList.add("is-fresh");
}

function createPhotoStripButton(item, index, total) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "strip-print";
  button.dataset.itemId = item.id;
  button.setAttribute("aria-label", `Open ${item.title || "print"} ${index + 1} of ${total}`);
  if (item.isNewPrint) button.classList.add("new-print");

  const thumbnail = document.createElement("span");
  thumbnail.className = "strip-print-thumb";
  thumbnail.style.backgroundImage = `url(${item.image || FALLBACK_IMAGE})`;

  const copy = document.createElement("span");
  copy.className = "strip-print-copy";

  const title = document.createElement("span");
  title.className = "strip-print-title";
  title.textContent = getMarkerLabel(item);

  const meta = document.createElement("span");
  meta.className = "strip-print-meta";
  meta.textContent = item.moment || "Print";

  copy.append(title, meta);
  button.append(thumbnail, copy);
  button.addEventListener("click", () => {
    hideMarkerPreview();
    handleMarkerClick(item, { skipExplosion: true });
  });

  return button;
}

function hidePhotoStrip() {
  const carousel = document.getElementById("carousel");
  if (!carousel) return;

  carousel.classList.add("hidden");
  carousel.setAttribute("aria-hidden", "true");
}

function renderPhotoStrip(regionKey = activeRegionKey) {
  const carousel = document.getElementById("carousel");
  const track = document.getElementById("listings");
  if (!carousel || !track) return;

  const items = getTrailItemsForRegion(regionKey).slice(0, PHOTO_STRIP_LIMIT);
  track.replaceChildren();

  if (!items.length) {
    hidePhotoStrip();
    return;
  }

  items.forEach((item, index) => {
    track.appendChild(createPhotoStripButton(item, index, items.length));
  });

  carousel.classList.remove("hidden");
  carousel.setAttribute("aria-hidden", "false");
  carousel.setAttribute("aria-label", `${getActiveViewLabel(regionKey)} prints`);
  syncPhotoStripActive(activeItem?.id || "");
}

function syncPhotoStripActive(itemId = "") {
  document.querySelectorAll(".strip-print").forEach((button) => {
    button.classList.toggle("active", button.dataset.itemId === itemId);
  });

  const activeButton = itemId
    ? document.querySelector(`.strip-print[data-item-id="${CSS.escape(itemId)}"]`)
    : null;
  activeButton?.scrollIntoView?.({ behavior: "smooth", inline: "center", block: "nearest" });
}

function renderRegionExperience(regionKey = activeRegionKey) {
  if (activeItem) {
    hideRegionExperience();
    return;
  }

  renderRegionIntro(regionKey);
  renderPhotoStrip(regionKey);
}

function hideRegionExperience() {
  hideRegionIntro();
  hidePhotoStrip();
}

function openTrailForRegion(regionKey = activeRegionKey) {
  const trailItems = getTrailItemsForRegion(regionKey);
  if (!trailItems.length) return;

  handleMarkerClick(trailItems[0], { skipExplosion: true });
}

function getMarkerShell(itemId) {
  if (!itemId) return null;
  return document.querySelector(`.custom-marker-shell[data-item-id="${CSS.escape(itemId)}"]`);
}

function isPlaceSheetOpen() {
  const sheet = document.getElementById("place-sheet");
  return Boolean(sheet && !sheet.classList.contains("hidden"));
}

function resetExplodedMarkers() {
  document.querySelectorAll(".custom-marker-shell.exploded, .custom-marker-shell.explode-origin").forEach((markerShell) => {
    markerShell.classList.remove("exploded", "explode-origin");
    markerShell.style.removeProperty("--explode-x");
    markerShell.style.removeProperty("--explode-y");
    markerShell.style.removeProperty("z-index");
    markerShell.removeAttribute("data-explode-count");
  });

  explodedMarkerGroup = null;
  document.body.classList.remove("markers-exploded");
}

function getNearbyMarkerItems(item) {
  if (!map || !listings.length || !hasValidCoordinates(item)) return [];

  const centerPoint = map.project([item.lng, item.lat]);
  if (!Number.isFinite(centerPoint.x) || !Number.isFinite(centerPoint.y)) return [];

  const nearbyItems = listings
    .filter((candidate) => candidate.id !== item.id && hasValidCoordinates(candidate))
    .map((candidate) => {
      const point = map.project([candidate.lng, candidate.lat]);
      const deltaX = point.x - centerPoint.x;
      const deltaY = point.y - centerPoint.y;
      const distance = Math.hypot(deltaX, deltaY);

      return {
        item: candidate,
        distance,
        angle: Math.atan2(deltaY, deltaX)
      };
    })
    .filter(({ distance }) => distance <= MARKER_EXPLODE_DISTANCE)
    .sort((a, b) => a.distance - b.distance || a.angle - b.angle)
    .slice(0, MARKER_EXPLODE_MAX_ITEMS - 1)
    .map(({ item: nearbyItem }) => nearbyItem);

  return [item, ...nearbyItems];
}

function getExplodeOffset(index, count) {
  const isMobileViewport = window.matchMedia("(max-width: 700px)").matches;
  const radius = MARKER_EXPLODE_RADIUS + (isMobileViewport ? 8 : 0) + Math.min(18, Math.max(0, count - 5) * 3);

  let angle;
  if (count === 1) {
    angle = -90;
  } else if (count <= 5) {
    const spread = 220;
    angle = -90 - spread / 2 + (spread / (count - 1)) * index;
  } else {
    angle = -90 + (360 / count) * index;
  }

  const radians = angle * Math.PI / 180;
  return {
    x: Math.round(Math.cos(radians) * radius),
    y: Math.round(Math.sin(radians) * radius)
  };
}

function explodeMarkersForItem(item) {
  const groupItems = getNearbyMarkerItems(item);
  if (groupItems.length < 2) return false;

  resetExplodedMarkers();

  const itemIds = new Set(groupItems.map((groupItem) => groupItem.id));
  explodedMarkerGroup = {
    originId: item.id,
    itemIds
  };

  groupItems.forEach((groupItem, index) => {
    const markerShell = getMarkerShell(groupItem.id);
    if (!markerShell) return;

    const offset = index === 0
      ? { x: 0, y: 0 }
      : getExplodeOffset(index - 1, groupItems.length - 1);

    markerShell.style.setProperty("--explode-x", `${offset.x}px`);
    markerShell.style.setProperty("--explode-y", `${offset.y}px`);
    markerShell.style.zIndex = `${9000 + groupItems.length - index}`;
    markerShell.classList.add("exploded");

    if (groupItem.id === item.id) {
      markerShell.classList.add("explode-origin");
      markerShell.dataset.explodeCount = String(groupItems.length);
    }
  });

  clearEdgeIndicators();
  document.body.classList.add("markers-exploded");
  return true;
}

function normalizeLocationToken(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function slugifyLocationLabel(value = "") {
  return normalizeLocationToken(value).replace(/\s+/g, "-");
}

function titleCaseLocation(value = "") {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getLocationCandidates(item) {
  return [item?.location2, item?.location1, item?.title]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

function getTrailingLocationToken(candidate = "") {
  const parts = candidate
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 1 ? parts.at(-1) : "";
}

function getUsStateLabelForItem(item) {
  for (const candidate of getLocationCandidates(item)) {
    const token = getTrailingLocationToken(candidate);
    const stateLabel = US_STATE_LABELS[normalizeLocationToken(token)];
    if (stateLabel) return stateLabel;
  }

  return "";
}

function getCountryLabelForItem(item) {
  const stateLabel = getUsStateLabelForItem(item);
  if (stateLabel || pointInBounds(item.lng, item.lat, USA_COORDINATE_BOUNDS)) {
    return "USA";
  }

  for (const candidate of getLocationCandidates(item)) {
    const token = getTrailingLocationToken(candidate);
    if (token && !US_STATE_LABELS[normalizeLocationToken(token)]) {
      return titleCaseLocation(token);
    }
  }

  return "Other";
}

function buildViewForItems(items, zoom = 5.8) {
  const validItems = items.filter(hasValidCoordinates);
  if (!validItems.length) return REGION_VIEWS.all;

  const lngs = validItems.map((item) => item.lng);
  const lats = validItems.map((item) => item.lat);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const center = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];

  if (Math.abs(maxLng - minLng) < 0.08 && Math.abs(maxLat - minLat) < 0.08) {
    return { center, zoom };
  }

  return {
    bounds: [[minLng, minLat], [maxLng, maxLat]],
    padding: LOCATION_FILTER_PADDING
  };
}

function buildLocationFilters() {
  const nextFilters = new Map();
  const usaItems = [];
  const stateBuckets = new Map();
  const countryBuckets = new Map();

  listings.forEach((item) => {
    const countryLabel = getCountryLabelForItem(item);
    const countryKey = countryLabel === "USA"
      ? USA_FILTER_KEY
      : `country:${slugifyLocationLabel(countryLabel) || "other"}`;

    item.countryLabel = countryLabel;
    item.countryKey = countryKey;

    if (countryLabel === "USA") {
      usaItems.push(item);
      const stateLabel = getUsStateLabelForItem(item) || "Other USA";
      const stateKey = `state:${slugifyLocationLabel(stateLabel) || "other-usa"}`;
      item.stateLabel = stateLabel;
      item.stateKey = stateKey;

      if (!stateBuckets.has(stateKey)) {
        stateBuckets.set(stateKey, {
          key: stateKey,
          label: stateLabel,
          parentKey: USA_FILTER_KEY,
          type: "state",
          items: []
        });
      }

      stateBuckets.get(stateKey).items.push(item);
      return;
    }

    if (!countryBuckets.has(countryKey)) {
      countryBuckets.set(countryKey, {
        key: countryKey,
        label: countryLabel,
        type: "country",
        items: []
      });
    }

    countryBuckets.get(countryKey).items.push(item);
  });

  if (usaItems.length) {
    nextFilters.set(USA_FILTER_KEY, {
      key: USA_FILTER_KEY,
      label: "USA",
      type: "country",
      items: usaItems,
      view: buildViewForItems(usaItems, 4.8)
    });
  }

  [...stateBuckets.values()]
    .sort((a, b) => a.label.localeCompare(b.label))
    .forEach((filter) => {
      nextFilters.set(filter.key, {
        ...filter,
        view: buildViewForItems(filter.items, 6.8)
      });
    });

  [...countryBuckets.values()]
    .sort((a, b) => a.label.localeCompare(b.label))
    .forEach((filter) => {
      nextFilters.set(filter.key, {
        ...filter,
        view: buildViewForItems(filter.items, 5.7)
      });
    });

  locationFilters = nextFilters;
}

function getLocationFilterView(regionKey) {
  return locationFilters.get(regionKey)?.view || REGION_VIEWS[regionKey] || REGION_VIEWS.all;
}

function getItemsForRegion(regionKey = activeRegionKey) {
  if (!regionKey || regionKey === "all") return listings;
  return locationFilters.get(regionKey)?.items || listings;
}

function getVisibleItemIdSet(regionKey = activeRegionKey) {
  return new Set(getItemsForRegion(regionKey).map((item) => item.id));
}

function getClusterGroupKey(item, regionKey = activeRegionKey) {
  if (!item) return "unknown";

  if (regionKey === "all" || regionKey === USA_FILTER_KEY) {
    return item.stateKey || item.countryKey || getRegionKeyForItem(item);
  }

  if (regionKey.startsWith("state:")) {
    return item.stateKey || regionKey;
  }

  if (regionKey.startsWith("country:")) {
    return item.countryKey || regionKey;
  }

  return getRegionKeyForItem(item);
}

function getRegionHash(regionKey) {
  if (!regionKey || regionKey === "all") return "";
  if (regionKey.startsWith("country:")) return `country=${encodeURIComponent(regionKey.replace("country:", ""))}`;
  if (regionKey.startsWith("state:")) return `state=${encodeURIComponent(regionKey.replace("state:", ""))}`;
  return `view=${encodeURIComponent(regionKey)}`;
}

function setHashForRegion(regionKey, options = {}) {
  if (options.skipHash) return;

  const nextHash = getRegionHash(regionKey);
  const nextUrl = nextHash
    ? `${window.location.pathname}${window.location.search}#${nextHash}`
    : `${window.location.pathname}${window.location.search}`;

  history.replaceState(null, "", nextUrl);
}

function getRegionKeyFromHash() {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash || hash.startsWith("marker=")) return "";

  const params = new URLSearchParams(hash);
  if (params.has("country")) return `country:${params.get("country")}`;
  if (params.has("state")) return `state:${params.get("state")}`;
  if (params.has("view")) return params.get("view") || "";
  return "";
}

function getActiveViewLabel(regionKey = activeRegionKey) {
  if (!regionKey || regionKey === "all") return "My Home";
  return locationFilters.get(regionKey)?.label || REGION_VIEWS[regionKey]?.label || "Map";
}

function updateViewingPill(regionKey = activeRegionKey) {
  const pill = document.getElementById("viewing-pill");
  if (!pill) return;

  pill.textContent = `Viewing ${getActiveViewLabel(regionKey)}`;
}

function setActiveRegionKey(regionKey = "all") {
  activeRegionKey = regionKey;
  setActiveRegionChip(regionKey);
  updateViewingPill(regionKey);
}

function getResetRegionKey(item = activeItem) {
  if (activeRegionKey && activeRegionKey !== "all") {
    return activeRegionKey;
  }

  return item ? getRegionKeyForItem(item) : "all";
}

function setActiveItemRegion(item) {
  const regionKey = item ? getRegionKeyForItem(item) : "all";
  activeRegionKey = regionKey;
  setActiveRegionChip(regionKey);
}

function makeLocationMenuButton(className, filter) {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  button.dataset.region = filter.key;
  button.textContent = filter.label;
  return button;
}

function renderLocationMenus() {
  const stateFilters = [...locationFilters.values()].filter((filter) => filter.parentKey === USA_FILTER_KEY);
  const countryFilters = [...locationFilters.values()].filter((filter) => filter.type === "country" && filter.key !== USA_FILTER_KEY);

  document.querySelectorAll("[data-location-menu]").forEach((menu) => {
    const buttonClass = menu.classList.contains("sheet-region-menu") ? "sheet-region-pill" : "region-pill";
    const usaGroup = menu.querySelector("[data-country-group='usa']");
    const usaSubmenu = menu.querySelector("[data-country-submenu='usa']");
    const usaToggle = menu.querySelector("[data-country-toggle='usa']");

    menu.querySelectorAll("[data-country-filter='true']").forEach((button) => button.remove());

    if (usaToggle) {
      usaToggle.dataset.region = USA_FILTER_KEY;
      usaToggle.hidden = !locationFilters.has(USA_FILTER_KEY);
    }

    if (usaGroup) {
      usaGroup.hidden = !locationFilters.has(USA_FILTER_KEY);
    }

    if (usaSubmenu) {
      usaSubmenu.replaceChildren();
      stateFilters.forEach((filter) => {
        usaSubmenu.appendChild(makeLocationMenuButton("region-submenu-item", filter));
      });
    }

    countryFilters.forEach((filter) => {
      const button = makeLocationMenuButton(buttonClass, filter);
      button.dataset.countryFilter = "true";
      menu.appendChild(button);
    });
  });
}

function setActiveRegionChip(regionKey = "all") {
  document.querySelectorAll("[data-region]").forEach((chip) => {
    const chipRegion = chip.dataset.region;
    const activeFilter = locationFilters.get(regionKey);
    const isActive = chipRegion === regionKey || (chipRegion === activeFilter?.parentKey);
    chip.classList.toggle("active", isActive);
  });
}

function pointInBounds(lng, lat, bounds) {
  if (!bounds || bounds.length !== 2) return false;
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

function isCaribbeanCoordinate(lng, lat) {
  const inCaribbeanBounds = pointInBounds(lng, lat, REGION_MATCH_BOUNDS.caribbean);
  const isFloridaCoast = lng < -80 && lat > 24.8;
  return inCaribbeanBounds && !isFloridaCoast;
}

function getRegionKeyForItem(item) {
  if (!item) return "all";

  if (item.stateKey) {
    return item.stateKey;
  }

  if (item.countryKey) {
    return item.countryKey;
  }

  if (isCaribbeanCoordinate(item.lng, item.lat)) {
    return "caribbean";
  }
  if (pointInBounds(item.lng, item.lat, REGION_MATCH_BOUNDS.europe)) {
    return "europe";
  }
  if (pointInBounds(item.lng, item.lat, REGION_MATCH_BOUNDS.asia)) {
    return "asia";
  }
  if (pointInBounds(item.lng, item.lat, REGION_MATCH_BOUNDS.south)) {
    return "south";
  }
  if (pointInBounds(item.lng, item.lat, REGION_MATCH_BOUNDS.midwest)) {
    return "midwest";
  }
  if (pointInBounds(item.lng, item.lat, REGION_MATCH_BOUNDS.east)) {
    return "east";
  }
  if (pointInBounds(item.lng, item.lat, REGION_MATCH_BOUNDS.west)) {
    return "west";
  }

  return "all";
}

function navigateToNearestHorizontalMarker(direction) {
  if (!map || !listings.length) return;

  const currentLngLat = activeItem
    ? [activeItem.lng, activeItem.lat]
    : map.getCenter().toArray();

  const currentPoint = map.project(currentLngLat);
  const currentId = activeItem?.id || "";
  const minHorizontalDistance = 18;

  const candidates = listings
    .filter((item) => item.id !== currentId)
    .map((item) => {
      const point = map.project([item.lng, item.lat]);
      const deltaX = point.x - currentPoint.x;
      const deltaY = point.y - currentPoint.y;

      return {
        item,
        deltaX,
        score: Math.abs(deltaX) + Math.abs(deltaY) * 0.35
      };
    })
    .filter(({ deltaX }) => {
      if (direction === "right") return deltaX > minHorizontalDistance;
      return deltaX < -minHorizontalDistance;
    })
    .sort((a, b) => a.score - b.score);

  const nextItem = candidates[0]?.item;
  if (!nextItem) return;

  handleMarkerClick(nextItem, { skipExplosion: true, smoothNearbyTransition: true });
}

function navigateToNearbyMarker(direction = "next") {
  if (!activeItem) return;

  const trailTarget = getNextTrailItem(direction);
  if (trailTarget) {
    handleMarkerClick(trailTarget, { skipExplosion: true, smoothNearbyTransition: true });
    return;
  }

  const nearbyItems = getNearbyItems(activeItem);
  if (!nearbyItems.length) return;

  const target = direction === "previous"
    ? nearbyItems[nearbyItems.length - 1]?.item
    : nearbyItems[0]?.item;

  if (target) {
    handleMarkerClick(target, { skipExplosion: true, smoothNearbyTransition: true });
  }
}

function populateNearbyPrints(item, nearbyList, prevButton, nextButton, nearbySection) {
  const nearbyItems = getNearbyItems(item);
  nearbyList.replaceChildren();

  if (!nearbyItems.length) {
    nearbySection.classList.add("hidden");
    if (prevButton) prevButton.disabled = true;
    if (nextButton) nextButton.disabled = true;
    return;
  }

  nearbyItems.forEach(({ item: nearbyItem, distance }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nearby-print";
    button.setAttribute("aria-label", `Open ${nearbyItem.title || "nearby print"} ${formatDistanceMiles(distance)} away`);

    const thumbnail = document.createElement("span");
    thumbnail.className = "nearby-print-thumb";
    thumbnail.style.backgroundImage = `url(${nearbyItem.image || FALLBACK_IMAGE})`;

    const details = document.createElement("span");
    details.className = "nearby-print-details";

    const title = document.createElement("span");
    title.className = "nearby-print-title";
    title.textContent = nearbyItem.title || "Nearby print";

    const meta = document.createElement("span");
    meta.className = "nearby-print-meta";
    meta.textContent = formatDistanceMiles(distance);

    details.append(title, meta);
    button.append(thumbnail, details);
    button.addEventListener("click", () => {
      handleMarkerClick(nearbyItem, { skipExplosion: true, smoothNearbyTransition: true });
    });

    nearbyList.appendChild(button);
  });

  nearbyList.scrollTo?.({ left: 0, behavior: "smooth" });
  nearbySection.classList.remove("hidden");
  if (prevButton) prevButton.disabled = nearbyItems.length < 2;
  if (nextButton) nextButton.disabled = false;
}

function renderNearbyPrints(item, options = {}) {
  const nearbySection = document.getElementById("sheet-nearby");
  const nearbyList = document.getElementById("sheet-nearby-list");
  const prevButton = document.getElementById("nearby-prev");
  const nextButton = document.getElementById("nearby-next");
  if (!nearbySection || !nearbyList) return;

  const renderToken = ++nearbyRenderToken;

  if (!options.animate || nearbySection.classList.contains("hidden") || !nearbyList.children.length) {
    nearbySection.classList.remove("is-updating");
    populateNearbyPrints(item, nearbyList, prevButton, nextButton, nearbySection);
    return;
  }

  nearbySection.classList.add("is-updating");
  if (prevButton) prevButton.disabled = true;
  if (nextButton) nextButton.disabled = true;

  window.setTimeout(() => {
    if (renderToken !== nearbyRenderToken) return;
    populateNearbyPrints(item, nearbyList, prevButton, nextButton, nearbySection);
    requestAnimationFrame(() => {
      if (renderToken === nearbyRenderToken) {
        nearbySection.classList.remove("is-updating");
      }
    });
  }, NEARBY_TRANSITION_MS);
}

function hideNearbyPrints() {
  const nearbySection = document.getElementById("sheet-nearby");
  const nearbyList = document.getElementById("sheet-nearby-list");
  nearbySection?.classList.add("hidden");
  nearbyList?.replaceChildren();
}

function initNearbyControls() {
  const prevButton = document.getElementById("nearby-prev");
  const nextButton = document.getElementById("nearby-next");

  prevButton?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigateToNearbyMarker("previous");
  });

  nextButton?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigateToNearbyMarker("next");
  });
}

function initRegionExperienceControls() {
  const exploreButton = document.getElementById("region-explore");
  if (exploreButton) {
    exploreButton.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openTrailForRegion(exploreButton.dataset.region || activeRegionKey);
    });
  }
}

function focusRegion(regionKey, options = {}) {
  const region = getLocationFilterView(regionKey);

  activeItem = null;
  resetExplodedMarkers();
  setActiveMarkerState("");
  clearMarkerHoverStates();
  document.querySelectorAll(".custom-marker").forEach((markerEl) => {
    markerEl.classList.remove("pop");
  });
  document.querySelectorAll(".custom-marker-shell").forEach((markerShell) => {
    markerShell.classList.remove("active");
  });
  clearEdgeIndicators();

  const sheet = document.getElementById("place-sheet");
  if (sheet) {
    sheet.classList.add("hidden");
    sheet.classList.remove("level-1", "level-2", "level-3", "level-4");
  }
  document.body.classList.remove("marker-active");
  hideNearbyPrints();

  setActiveRegionKey(regionKey);
  setHashForRegion(regionKey, options);
  renderRegionExperience(regionKey);

  if (region.bounds) {
    map.fitBounds(region.bounds, {
      padding: region.padding,
      duration: REGION_TRANSITION_MS,
      essential: true
    });
    return;
  }

  map.flyTo({
    center: region.center,
    zoom: region.zoom,
    duration: REGION_TRANSITION_MS,
    curve: 1.35,
    essential: true
  });
}

function positionRegionSubmenu(group) {
  const toggle = group.querySelector("[data-region-menu-toggle]");
  const submenuId = toggle?.getAttribute("aria-controls");
  const submenu = submenuId ? document.getElementById(submenuId) : null;
  if (!toggle || !submenu) return;

  const rect = toggle.getBoundingClientRect();
  const maxLeft = window.innerWidth - 94;
  const left = Math.max(94, Math.min(maxLeft, rect.left + rect.width / 2));

  submenu.style.setProperty("--region-submenu-left", `${Math.round(left)}px`);
  submenu.style.setProperty("--region-submenu-top", `${Math.round(rect.bottom + 7)}px`);
  document.body.appendChild(submenu);
}

function getRegionSubmenuForGroup(group) {
  const toggle = group?.querySelector("[data-region-menu-toggle]");
  const submenuId = toggle?.getAttribute("aria-controls");
  return submenuId ? document.getElementById(submenuId) : null;
}

function ensureRegionGroupId(group) {
  const toggle = group?.querySelector("[data-region-menu-toggle]");
  if (!group || !toggle) return "";

  if (!group.dataset.regionGroup) {
    group.dataset.regionGroup = toggle.getAttribute("aria-controls") || `region-menu-${Date.now()}`;
  }

  return group.dataset.regionGroup;
}

function openRegionMenu(group) {
  if (!group) return;

  window.clearTimeout(regionMenuCloseTimer);
  closeRegionMenus(group);

  const groupId = ensureRegionGroupId(group);
  const toggle = group.querySelector("[data-region-menu-toggle]");
  const submenu = getRegionSubmenuForGroup(group);

  group.classList.add("open");
  toggle?.setAttribute("aria-expanded", "true");

  if (submenu) {
    submenu.dataset.ownerGroup = groupId;
    submenu.classList.add("open");
  }

  positionRegionSubmenu(group);
}

function scheduleCloseRegionMenus() {
  window.clearTimeout(regionMenuCloseTimer);
  regionMenuCloseTimer = window.setTimeout(() => {
    closeRegionMenus();
  }, 160);
}

function isRegionMenuPinned(group) {
  return group?.dataset.regionClickOpen === "true";
}

function canUseHoverRegionMenu() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function closeRegionMenus(exceptGroup = null) {
  if (!exceptGroup) {
    window.clearTimeout(regionMenuCloseTimer);
  }

  document.querySelectorAll(".region-menu-group.open").forEach((group) => {
    if (group === exceptGroup) return;

    group.classList.remove("open");
    delete group.dataset.regionClickOpen;
    group.querySelector("[data-region-menu-toggle]")?.setAttribute("aria-expanded", "false");
  });

  document.querySelectorAll(".region-submenu.open").forEach((submenu) => {
    const ownerGroup = submenu.dataset.ownerGroup ? document.querySelector(`[data-region-group="${submenu.dataset.ownerGroup}"]`) : null;
    if (ownerGroup === exceptGroup) return;
    submenu.classList.remove("open");
  });
}

function bindHeaderRegionPills() {
  document.querySelectorAll("[data-region-menu-toggle]").forEach((toggle) => {
    if (toggle.dataset.regionMenuBound === "true") return;

    toggle.dataset.regionMenuBound = "true";
    const group = toggle.closest(".region-menu-group");
    const submenu = getRegionSubmenuForGroup(group);

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const shouldOpen = !group?.classList.contains("open");
      if (shouldOpen) {
        const regionKey = toggle.dataset.region || "all";
        focusRegion(regionKey);
        openRegionMenu(group);
        if (group) group.dataset.regionClickOpen = "true";
      } else {
        closeRegionMenus();
      }
    });

    group?.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") openRegionMenu(group);
    });
    group?.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse" && !isRegionMenuPinned(group)) scheduleCloseRegionMenus();
    });
    group?.addEventListener("mouseenter", () => {
      if (canUseHoverRegionMenu()) openRegionMenu(group);
    });
    group?.addEventListener("mouseleave", () => {
      if (canUseHoverRegionMenu() && !isRegionMenuPinned(group)) scheduleCloseRegionMenus();
    });
    group?.addEventListener("mouseover", () => {
      if (canUseHoverRegionMenu()) openRegionMenu(group);
    });
    group?.addEventListener("mouseout", (e) => {
      if (!canUseHoverRegionMenu()) return;
      if (group.contains(e.relatedTarget) || submenu?.contains(e.relatedTarget)) return;
      if (isRegionMenuPinned(group)) return;
      scheduleCloseRegionMenus();
    });
    toggle.addEventListener("focus", () => openRegionMenu(group));

    submenu?.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") window.clearTimeout(regionMenuCloseTimer);
    });
    submenu?.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse" && !isRegionMenuPinned(group)) scheduleCloseRegionMenus();
    });
    submenu?.addEventListener("mouseenter", () => {
      if (canUseHoverRegionMenu()) window.clearTimeout(regionMenuCloseTimer);
    });
    submenu?.addEventListener("mouseleave", () => {
      if (canUseHoverRegionMenu() && !isRegionMenuPinned(group)) scheduleCloseRegionMenus();
    });
    submenu?.addEventListener("mouseover", () => {
      if (canUseHoverRegionMenu()) window.clearTimeout(regionMenuCloseTimer);
    });
    submenu?.addEventListener("mouseout", (e) => {
      if (!canUseHoverRegionMenu()) return;
      if (submenu.contains(e.relatedTarget) || group?.contains(e.relatedTarget)) return;
      if (isRegionMenuPinned(group)) return;
      scheduleCloseRegionMenus();
    });
  });

  document.querySelectorAll("[data-region]").forEach((chip) => {
    if (chip.dataset.regionBound === "true") return;
    if (chip.matches("[data-region-menu-toggle]")) return;

    chip.dataset.regionBound = "true";
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const regionKey = chip.dataset.region || "all";
      focusRegion(regionKey);
      closeRegionMenus();
    });
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest(".region-menu-group")) return;
    closeRegionMenus();
  });

  window.addEventListener("resize", () => closeRegionMenus());
  setActiveRegionChip("all");
}

function setMarkerShellVisibility(itemId, isVisible) {
  const markerShell = getMarkerShell(itemId);
  if (!markerShell) return;

  const markerWrapper = markerShell.closest(".mapboxgl-marker");
  const display = isVisible ? "" : "none";
  markerShell.style.display = display;
  markerWrapper?.style.setProperty("display", isVisible ? "block" : "none");
}

function fitItemsOnMap(items, options = {}) {
  const validItems = items.filter(hasValidCoordinates);
  if (!validItems.length) return;

  if (validItems.length === 1) {
    map.flyTo({
      center: [validItems[0].lng, validItems[0].lat],
      zoom: Math.max(map.getZoom() + 2, 10),
      duration: options.duration ?? 850,
      curve: 1.25,
      essential: true
    });
    return;
  }

  const bounds = new mapboxgl.LngLatBounds();
  validItems.forEach((item) => bounds.extend([item.lng, item.lat]));
  map.fitBounds(bounds, {
    padding: options.padding ?? 96,
    maxZoom: options.maxZoom ?? 12.5,
    duration: options.duration ?? 850,
    essential: true
  });
}

function shouldClusterMarkers() {
  return (
    map &&
    listings.length > 1 &&
    map.getZoom() < MARKER_CLUSTER_MAX_ZOOM &&
    !activeItem &&
    !isPlaceSheetOpen() &&
    !explodedMarkerGroup
  );
}

function createClusterElement(cluster) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "marker-cluster";
  el.dataset.count = String(cluster.items.length);
  el.dataset.clusterGroup = cluster.groupKey;
  el.style.backgroundImage = `url(${cluster.items[0]?.image || FALLBACK_IMAGE})`;
  el.setAttribute("aria-label", `Zoom to ${cluster.items.length} nearby prints`);

  el.addEventListener("pointerenter", (event) => {
    showMarkerPreview({
      ...cluster.items[0],
      moment: `${cluster.items.length} nearby prints`,
      location2: getItemLocationLabel(cluster.items[0])
    }, event);
  });
  el.addEventListener("pointermove", moveMarkerPreview);
  el.addEventListener("pointerleave", hideMarkerPreview);
  el.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    hideMarkerPreview();
    fitItemsOnMap(cluster.items);
  });

  return el;
}

function updateMarkerClusters() {
  clearClusterMarkers();
  const visibleItemIds = getVisibleItemIdSet();

  markers.forEach((marker) => {
    const item = marker.item;
    if (item?.id) setMarkerShellVisibility(item.id, visibleItemIds.has(item.id));
  });
}

function setMarkerVisibilityByZoom() {
  if (!map) return;

  markers.forEach((marker) => {
    const markerEl = marker.getElement();
    if (!markerEl) return;

    markerEl.style.display = "";
    markerEl.style.opacity = "1";
    markerEl.style.pointerEvents = "auto";
  });

  updateMarkerClusters();
}

function updateEdgeIndicator() {
  if (!map || !listings.length) {
    clearEdgeIndicators();
    return;
  }

  if (explodedMarkerGroup) {
    clearEdgeIndicators();
    return;
  }

  const mapEl = document.getElementById("map");
  const sheet = document.getElementById("place-sheet");
  const header = document.getElementById("header");
  const sheetIsOpen = sheet && !sheet.classList.contains("hidden");

  if (activeItem || sheetIsOpen) {
    clearEdgeIndicators();
    return;
  }
  if (!mapEl) {
    clearEdgeIndicators();
    return;
  }

  const mapRect = mapEl.getBoundingClientRect();
  const headerRect = header?.getBoundingClientRect();

  const leftSafe = 18;
  const rightSafe = Math.max(leftSafe, mapRect.width - 18);
  const topSafe = Math.max(18, Math.round((headerRect?.bottom || 0) - mapRect.top + 12));
  const bottomSafe = mapRect.height - 18;

  const nextVisibleIds = new Set();

  getItemsForRegion().forEach((item) => {
    const point = map.project([item.lng, item.lat]);
    const isOffscreen = (
      point.x < leftSafe ||
      point.x > rightSafe ||
      point.y < topSafe ||
      point.y > bottomSafe
    );

    if (!isOffscreen) {
      const existingEl = edgeIndicatorEls.get(item.id);
      if (existingEl) {
        existingEl.style.display = "none";
        existingEl.classList.remove("active");
        delete existingEl.dataset.edge;
      }
      return;
    }

    let indicatorEl = edgeIndicatorEls.get(item.id);
    if (!indicatorEl) {
      indicatorEl = document.createElement("button");
      indicatorEl.type = "button";
      indicatorEl.className = "edge-indicator";
      indicatorEl.setAttribute("aria-label", `Show marker for ${item.title || "location"}`);
      indicatorEl.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleMarkerClick(item, { skipExplosion: true });
      });
      document.body.appendChild(indicatorEl);
      edgeIndicatorEls.set(item.id, indicatorEl);
    }

    const clampY = Math.min(bottomSafe, Math.max(topSafe, point.y));
    const distLeft = Math.abs(point.x - leftSafe);
    const distRight = Math.abs(point.x - rightSafe);
    const distBottom = Math.abs(point.y - bottomSafe);

    let x;
    let y;

    if (point.y > bottomSafe || (distBottom <= distLeft && distBottom <= distRight)) {
      x = Math.min(rightSafe, Math.max(leftSafe, point.x));
      y = bottomSafe;
      indicatorEl.dataset.edge = "bottom";
    } else if (point.x < leftSafe || distLeft <= distRight) {
      x = leftSafe;
      y = clampY;
      indicatorEl.dataset.edge = "left";
    } else {
      x = rightSafe;
      y = clampY;
      indicatorEl.dataset.edge = "right";
    }

    indicatorEl.style.display = "block";
    indicatorEl.style.left = `${mapRect.left + x}px`;
    indicatorEl.style.top = `${mapRect.top + y}px`;
    indicatorEl.style.backgroundImage = `url(${item.image || FALLBACK_IMAGE})`;
    indicatorEl.classList.toggle("active", activeItem?.id === item.id);

    nextVisibleIds.add(item.id);
  });

  edgeIndicatorEls.forEach((el, id) => {
    if (!nextVisibleIds.has(id)) {
      el.style.display = "none";
      el.classList.remove("active");
      delete el.dataset.edge;
    }
  });
}

function getSheetOffset() {
  const sheet = document.getElementById("place-sheet");
  const header = document.getElementById("header");
  const isMobileViewport = window.matchMedia("(max-width: 700px)").matches;

  if (!sheet) {
    return [0, 0];
  }

  const sheetIsHidden = sheet.classList.contains("hidden");
  if (sheetIsHidden) {
    return [0, 0];
  }

  if (!isMobileViewport) {
    const rect = sheet.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const visibleSheetWidth = Math.max(0, rect.right - rect.left);
    const freeMapWidth = Math.max(0, viewportWidth - visibleSheetWidth);
    const targetX = visibleSheetWidth + freeMapWidth * 0.45;
    const viewportCenterX = viewportWidth / 2;
    const offsetX = Math.round(targetX - viewportCenterX);
    return [offsetX, 0];
  }

  const sheetRect = sheet.getBoundingClientRect();
  const headerRect = header?.getBoundingClientRect();

  const topSafe = Math.round((headerRect?.bottom || 0) + (isMobileViewport ? 36 : 20));
  const bottomSafe = Math.round(sheetRect.top - (isMobileViewport ? 102 : 72));

  const desiredY = bottomSafe > topSafe
    ? Math.round((topSafe + bottomSafe) / 2)
    : topSafe;

  const viewportCenterY = Math.round(window.innerHeight / 2);
  const offsetY = desiredY - viewportCenterY;

  return [0, offsetY];
}

function nudgeActiveMarkerIntoView() {
  if (!map || !activeItem || !hasValidCoordinates(activeItem)) return;

  const markerPoint = map.project([activeItem.lng, activeItem.lat]);
  if (!Number.isFinite(markerPoint.x) || !Number.isFinite(markerPoint.y)) return;

  const sheet = document.getElementById("place-sheet");
  const header = document.getElementById("header");
  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  const mapRect = mapEl.getBoundingClientRect();
  const sheetRect = sheet && !sheet.classList.contains("hidden")
    ? sheet.getBoundingClientRect()
    : null;
  const headerRect = header?.getBoundingClientRect();

  const isMobileViewport = window.matchMedia("(max-width: 700px)").matches;
  const padding = 72;

  const safeLeft = sheetRect && !isMobileViewport
    ? sheetRect.right - mapRect.left + padding
    : padding;

  const safeRight = mapRect.width - padding;
  const safeTop = Math.max(padding, Math.round((headerRect?.bottom || 0) - mapRect.top + (isMobileViewport ? 42 : 32)));
  const safeBottom = sheetRect && isMobileViewport
    ? sheetRect.top - mapRect.top - 102
    : mapRect.height - padding;

  let panX = 0;
  let panY = 0;

  if (markerPoint.x < safeLeft) {
    panX = markerPoint.x - safeLeft;
  } else if (markerPoint.x > safeRight) {
    panX = markerPoint.x - safeRight;
  }

  if (markerPoint.y < safeTop) {
    panY = markerPoint.y - safeTop;
  } else if (markerPoint.y > safeBottom) {
    panY = markerPoint.y - safeBottom;
  }

  if (!Number.isFinite(panX) || !Number.isFinite(panY)) return;

  if (Math.abs(panX) > 1 || Math.abs(panY) > 1) {
    map.panBy([panX, panY], {
      duration: 220,
      essential: true
    });
  }
}

function getFlyToOptions(item, zoom) {
  if (!hasValidCoordinates(item)) return null;

  const sheet = document.getElementById("place-sheet");
  const isMobileViewport = window.matchMedia("(max-width: 700px)").matches;

  let mobileZoom = 15.6;

  if (sheet?.classList.contains("level-2")) {
    mobileZoom = 15.2;
  }

  return {
    center: [item.lng, item.lat],
    zoom: zoom ?? (isMobileViewport ? mobileZoom : 16.5),
    offset: getSheetOffset(),
    speed: 0.55,
    curve: 1.42,
    essential: true
  };
}

function keepActiveMarkerVisible() {
  if (!map || !activeItem || !hasValidCoordinates(activeItem)) return;

  const sheet = document.getElementById("place-sheet");
  const isMobileViewport = window.matchMedia("(max-width: 700px)").matches;

  const easeOptions = {
    center: [activeItem.lng, activeItem.lat],
    offset: getSheetOffset(),
    duration: 260,
    essential: true
  };

  if (isMobileViewport) {
    easeOptions.zoom = sheet?.classList.contains("level-2") ? 15.2 : 15.6;
  }

  map.easeTo(easeOptions);
  setTimeout(() => {
    updateEdgeIndicator();
    forceActiveMarkerVisible();
  }, 300);
}

function showPlaceSheet(item, options = {}) {
  const sheet = document.getElementById("place-sheet");
  if (!sheet) return;

  hideRegionExperience();

  const keepExpanded = options.keepExpanded && (
    sheet.classList.contains("level-2") ||
    sheet.classList.contains("level-3") ||
    sheet.classList.contains("level-4")
  );
  const title = document.getElementById("sheet-title");
  const time = document.getElementById("sheet-time");
  const subtitle = document.getElementById("sheet-subtitle");
  const location2 = document.getElementById("sheet-location-2");
  const image = document.getElementById("sheet-image-main");
  const productLink = document.getElementById("sheet-product-link");
  const closeButton = document.getElementById("sheet-close");

  if (title) title.textContent = item.moment || "Explore";
  if (subtitle) subtitle.textContent = item.location1 || "";
  if (location2) location2.textContent = item.location2 || "";
  if (time) time.textContent = item.time || "Any time";

  if (image) {
    image.src = item.image || FALLBACK_IMAGE;
    image.alt = item.title || "";
    image.onerror = () => {
      image.onerror = null;
      image.src = FALLBACK_IMAGE;
    };
  }

  if (productLink) {
    productLink.href = item.link || "#";
    productLink.setAttribute("aria-label", `Buy ${item.title || "product"}`);
  }

  renderNearbyPrints(item, { animate: options.animateNearby });
  setActiveMarkerState(item.id);
  forceActiveMarkerVisible();

  document.body.classList.add("marker-active");
  sheet.classList.remove("hidden");
  if (keepExpanded) {
    const nextLevel = sheet.classList.contains("level-4")
      ? "level-4"
      : sheet.classList.contains("level-3")
        ? "level-3"
        : "level-2";
    sheet.classList.remove("level-1", "level-2", "level-3", "level-4");
    sheet.classList.add(nextLevel);
  } else {
    sheet.classList.remove("level-1", "level-3", "level-4");
    sheet.classList.add("level-2");
    closeButton?.focus({ preventScroll: true });
  }
}

function openSheetToLevel2() {
  const sheet = document.getElementById("place-sheet");
  if (!sheet) return;

  sheet.classList.remove("hidden", "level-1", "level-3", "level-4");
  sheet.classList.add("level-2");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      keepActiveMarkerVisible();
      window.setTimeout(nudgeActiveMarkerIntoView, 280);
    });
  });

  window.setTimeout(() => {
    keepActiveMarkerVisible();
    window.setTimeout(nudgeActiveMarkerIntoView, 280);
  }, 360);
}

function initSheetDrag() {
  const sheet = document.getElementById("place-sheet");
  const handle = sheet?.querySelector(".place-sheet-handle");
  const header = sheet?.querySelector(".place-sheet-header");
  if (!sheet || !handle) return;

  let startX = 0;
  let startY = 0;
  let startTranslate = 0;
  let currentTranslate = 0;
  let isDragging = false;
  let activePointerId = null;
  let lastY = 0;
  let lastTime = 0;
  let velocityY = 0;
  let hasHorizontalIntent = false;

  const isMobileViewport = () => window.matchMedia("(max-width: 700px)").matches;
  const LEVEL_2 = 34;
  const LEVEL_3 = 9;
  const LEVEL_4 = 0;

  const getCurrentLevel = () => {
    if (sheet.classList.contains("level-4")) return 4;
    if (sheet.classList.contains("level-3")) return 3;
    return 2;
  };

  const getLevelTranslate = (level) => {
    if (level === 4) return LEVEL_4;
    if (level === 3) return LEVEL_3;
    return LEVEL_2;
  };

  const clampTranslate = (value) => {
    return Math.min(LEVEL_2, Math.max(LEVEL_4, value));
  };

  const setLevel = (level) => {
    sheet.style.transition = "";
    sheet.style.transform = "";
    sheet.classList.remove("level-1", "level-2", "level-3", "level-4");
    sheet.classList.add(`level-${level}`);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        keepActiveMarkerVisible();
      });
    });

    window.setTimeout(() => {
      keepActiveMarkerVisible();
    }, 180);
  };

  const onPointerMove = (ev) => {
    if (!isDragging) return;
    if (activePointerId !== null && ev.pointerId !== activePointerId) return;

    const now = performance.now();
    const deltaX = ev.clientX - startX;
    const deltaY = ev.clientY - startY;

    if (!hasHorizontalIntent && Math.abs(deltaX) > 18 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      hasHorizontalIntent = true;
    }

    if (hasHorizontalIntent) {
      if (isMobileViewport()) {
        sheet.style.transform = `translateX(${deltaX * 0.12}px) translateY(${startTranslate}%)`;
      } else {
        sheet.style.transform = `translateX(${deltaX * 0.12}px) translateY(-50%)`;
      }
    } else if (isMobileViewport()) {
      const viewportHeight = Math.max(window.innerHeight, 1);
      const deltaPercent = (deltaY / viewportHeight) * 100;
      currentTranslate = clampTranslate(startTranslate + deltaPercent);
      sheet.style.transform = `translateY(${currentTranslate}%)`;
    }

    const dt = now - lastTime;
    if (dt > 0) {
      velocityY = (ev.clientY - lastY) / dt;
    }

    lastY = ev.clientY;
    lastTime = now;
    ev.preventDefault();
  };

  const onPointerUp = (ev) => {
    if (activePointerId !== null && ev?.pointerId != null && ev.pointerId !== activePointerId) {
      return;
    }

    if (activePointerId !== null) {
      handle.releasePointerCapture?.(activePointerId);
      header?.releasePointerCapture?.(activePointerId);
      sheet.releasePointerCapture?.(activePointerId);
    }

    const deltaX = ev?.clientX != null ? ev.clientX - startX : 0;
    const deltaY = ev?.clientY != null ? ev.clientY - startY : 0;
    const didHorizontalSwipe = Math.abs(deltaX) > 70 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;
    const didTapHandle = ev?.target?.closest?.(".place-sheet-handle") && Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8;

    isDragging = false;
    activePointerId = null;
    velocityY = 0;
    sheet.style.transition = "";

    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);

    if (didHorizontalSwipe) {
      sheet.style.transform = "";
      const direction = deltaX < 0 ? "right" : "left";
      navigateToNearestHorizontalMarker(direction);
      return;
    }

    if (!isMobileViewport()) {
      sheet.style.transform = "";
      return;
    }

    if (didTapHandle) {
      setLevel(Math.min(4, getCurrentLevel() + 1));
      return;
    }

    const flickUp = velocityY < -0.35;
    const flickDown = velocityY > 0.35;
    const currentLevel = getCurrentLevel();

    let targetLevel;
    if (flickUp) {
      targetLevel = Math.min(4, currentLevel + 1);
    } else if (flickDown) {
      targetLevel = Math.max(2, currentLevel - 1);
    } else if (currentTranslate <= (LEVEL_4 + LEVEL_3) / 2) {
      targetLevel = 4;
    } else if (currentTranslate <= (LEVEL_3 + LEVEL_2) / 2) {
      targetLevel = 3;
    } else {
      targetLevel = 2;
    }

    setLevel(targetLevel);
  };

  const onPointerDown = (e) => {
    // if (!isMobileViewport()) return;
    if (sheet.classList.contains("hidden")) return;
    if (e.target.closest("button, a")) return;

    if (isMobileViewport()) {
      const rect = sheet.getBoundingClientRect();
      const dragZoneHeight = 220;
      if (e.clientY > rect.top + dragZoneHeight) return;
    }

    startX = e.clientX;
    startY = e.clientY;
    startTranslate = isMobileViewport() ? getLevelTranslate(getCurrentLevel()) : 0;
    currentTranslate = startTranslate;
    isDragging = true;
    activePointerId = e.pointerId;
    lastY = e.clientY;
    lastTime = performance.now();
    velocityY = 0;
    hasHorizontalIntent = false;

    sheet.style.transition = "none";

    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);

    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  handle.addEventListener("pointerdown", onPointerDown);
  header?.addEventListener("pointerdown", onPointerDown);
  sheet.addEventListener("pointerdown", onPointerDown);
}

function resetView() {
  isResetting = true;
  const targetRegionKey = getResetRegionKey();
  const targetRegion = getLocationFilterView(targetRegionKey);

  activeItem = null;
  resetExplodedMarkers();

  const sheet = document.getElementById("place-sheet");
  if (sheet) {
    sheet.classList.add("hidden");
    sheet.classList.remove("level-1", "level-2", "level-3", "level-4");
  }
  document.body.classList.remove("marker-active");
  hideNearbyPrints();

  setActiveMarkerState("");
  clearMarkerHoverStates();
  document.querySelectorAll(".custom-marker").forEach((markerEl) => {
    markerEl.classList.remove("pop");
  });
  document.querySelectorAll(".custom-marker-shell").forEach((markerShell) => {
    markerShell.classList.remove("active");
  });
  clearEdgeIndicators();
  setActiveRegionKey(targetRegionKey);
  setHashForRegion(targetRegionKey);
  renderRegionExperience(targetRegionKey);

  if (targetRegion.bounds) {
    map.fitBounds(targetRegion.bounds, {
      padding: targetRegion.padding,
      duration: REGION_TRANSITION_MS,
      essential: true
    });
  } else {
    map.flyTo({
      center: targetRegion.center,
      zoom: targetRegion.zoom,
      duration: REGION_TRANSITION_MS,
      curve: 1.35,
      essential: true
    });
  }

  window.setTimeout(() => {
    isResetting = false;
  }, REGION_TRANSITION_MS + 50);
}

/* =========================
   FETCH PRODUCTS
========================= */
async function fetchProducts() {
  try {
    const edges = [];
    let afterCursor = null;

    do {
      const res = await fetch(`${SHOP_URL}/api/2023-07/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN
        },
        body: JSON.stringify({
          query: `
          query Products($first: Int!, $after: String) {
            products(first: $first, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  title
                  handle
                  createdAt
                  images(first: 1) {
                    edges { node { url } }
                  }
                  lat: metafield(namespace: "custom", key: "lat") { value }
                  lng: metafield(namespace: "custom", key: "lng") { value }
                  moment: metafield(namespace: "custom", key: "moment") { value }
                  time: metafield(namespace: "custom", key: "time") { value }
                  location1: metafield(namespace: "custom", key: "location_1") { value }
                  location2: metafield(namespace: "custom", key: "location_2") { value }
                }
              }
            }
          }`,
          variables: {
            first: PRODUCT_FETCH_PAGE_SIZE,
            after: afterCursor
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Storefront request failed: ${res.status}`);
      }

      const json = await res.json();
      if (json.errors?.length) {
        throw new Error(`Storefront GraphQL failed: ${json.errors.map((error) => error.message).join("; ")}`);
      }

      const page = json?.data?.products;
      edges.push(...(page?.edges || []));
      afterCursor = page?.pageInfo?.hasNextPage ? page.pageInfo.endCursor : null;
    } while (afterCursor);

    return edges
      .map(({ node }) => {
        const lat = parseFloat(node.lat?.value);
        const lng = parseFloat(node.lng?.value);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

        const location1 = node.location1?.value?.trim();
        const location2 = node.location2?.value?.trim();
        const sheetTitle = [location2, location1].filter(Boolean).join(" • ") || node.title;

        const item = {
          title: node.title,
          sheetTitle,
          location1,
          location2,
          lat,
          lng,
          image: node.images?.edges?.[0]?.node?.url || FALLBACK_IMAGE,
          link: `${SHOP_URL}/products/${node.handle}`,
          moment: node.moment?.value || "Explore",
          time: node.time?.value || "Any time",
          createdAt: node.createdAt || ""
        };

        return { ...item, id: getItemId(item) };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return [];
  }
}

let resizeMapForViewport = () => {};

function syncAppViewport() {
  const viewport = window.visualViewport;
  const height = Math.round(viewport?.height || window.innerHeight);
  const top = Math.max(0, Math.round(viewport?.offsetTop || 0));
  const bottom = Math.max(0, Math.round(window.innerHeight - height - top));
  const root = document.documentElement;

  root.style.setProperty("--app-height", `${height}px`);
  root.style.setProperty("--app-top", `${top}px`);
  root.style.setProperty("--app-bottom", `${bottom}px`);
  resizeMapForViewport();
}

function installAppViewportSync() {
  syncAppViewport();

  window.visualViewport?.addEventListener("resize", syncAppViewport, { passive: true });
  window.visualViewport?.addEventListener("scroll", syncAppViewport, { passive: true });
  window.addEventListener("resize", syncAppViewport, { passive: true });
  window.addEventListener("orientationchange", () => window.setTimeout(syncAppViewport, 250), { passive: true });
  window.addEventListener("pageshow", syncAppViewport, { passive: true });
}

installAppViewportSync();

/* =========================
   MAP
========================= */
const map = new mapboxgl.Map({
  container: "map",
  style: MAP_STYLE_URLS.satellite,
  center: HOME_VIEW.center,
  zoom: HOME_VIEW.zoom,
  cooperativeGestures: false
});

resizeMapForViewport = () => {
  requestAnimationFrame(() => {
    map.resize();
  });
};
syncAppViewport();

map.dragPan.enable();
map.scrollZoom.disable();
map.touchZoomRotate.enable();
map.touchZoomRotate.disableRotation();
map.doubleClickZoom.disable();
map.dragRotate.disable();
map.keyboard.disable();
map.boxZoom.disable();
map.touchPitch?.disable();

const MAP_GESTURE_IGNORED_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  ".mapboxgl-marker",
  ".mapboxgl-control-container",
  ".place-sheet",
  "#carousel",
  "#header"
].join(",");

const MAP_PINCH_IGNORED_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  ".mapboxgl-control-container",
  ".place-sheet",
  "#carousel",
  "#header"
].join(",");

const shouldKeepGestureInMap = (target) =>
  target instanceof Element && Boolean(target.closest(MAP_GESTURE_IGNORED_SELECTOR));

const shouldSkipTrackpadPinch = (target) =>
  target instanceof Element && Boolean(target.closest(MAP_PINCH_IGNORED_SELECTOR));

function hasValidClientPoint(clientX, clientY) {
  return Number.isFinite(clientX) && Number.isFinite(clientY);
}

function isPointInsideMap(clientX, clientY) {
  if (!hasValidClientPoint(clientX, clientY)) return false;

  const mapRect = map.getContainer().getBoundingClientRect();
  return (
    clientX >= mapRect.left &&
    clientX <= mapRect.right &&
    clientY >= mapRect.top &&
    clientY <= mapRect.bottom
  );
}

function getGestureClientPoint(event) {
  if (hasValidClientPoint(event.clientX, event.clientY)) {
    return {
      clientX: event.clientX,
      clientY: event.clientY
    };
  }

  const mapRect = map.getContainer().getBoundingClientRect();
  return {
    clientX: mapRect.left + mapRect.width / 2,
    clientY: mapRect.top + mapRect.height / 2
  };
}

function zoomMapAtPoint(clientX, clientY, nextZoom, options = {}) {
  const mapRect = map.getContainer().getBoundingClientRect();
  const x = clientX - mapRect.left;
  const y = clientY - mapRect.top;
  const minZoom = map.getMinZoom?.() ?? 0;
  const maxZoom = map.getMaxZoom?.() ?? 22;
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, nextZoom));

  map.zoomTo(clampedZoom, {
    around: map.unproject([x, y]),
    duration: options.duration ?? GESTURE_ZOOM_TRANSITION_MS,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    essential: true
  });
}

function zoomMapFromControl(delta) {
  const mapRect = map.getContainer().getBoundingClientRect();
  zoomMapAtPoint(
    mapRect.left + mapRect.width / 2,
    mapRect.top + mapRect.height / 2,
    map.getZoom() + delta,
    { duration: 220 }
  );
}

function updateMapControlState() {
  const zoomInButton = document.getElementById("gm-zoom-in");
  const zoomOutButton = document.getElementById("gm-zoom-out");
  if (!zoomInButton || !zoomOutButton) return;

  const zoom = map.getZoom();
  const minZoom = map.getMinZoom?.() ?? 0;
  const maxZoom = map.getMaxZoom?.() ?? 22;

  zoomInButton.disabled = zoom >= maxZoom - 0.01;
  zoomOutButton.disabled = zoom <= minZoom + 0.01;
}

function initMapControls() {
  const zoomInButton = document.getElementById("gm-zoom-in");
  const zoomOutButton = document.getElementById("gm-zoom-out");
  const resetButton = document.getElementById("gm-reset");

  const stopMapControlGesture = (event) => {
    event.stopPropagation();
  };

  [zoomInButton, zoomOutButton, resetButton].forEach((button) => {
    button?.addEventListener("pointerdown", stopMapControlGesture);
    button?.addEventListener("wheel", (event) => {
      event.stopPropagation();
    }, { passive: true });
  });

  zoomInButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    zoomMapFromControl(MAP_CONTROL_ZOOM_STEP);
  });

  zoomOutButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    zoomMapFromControl(-MAP_CONTROL_ZOOM_STEP);
  });

  resetButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    resetView();
  });

  updateMapControlState();
}

function installDoubleClickZoom() {
  map.getCanvasContainer().addEventListener("dblclick", (event) => {
    if (shouldKeepGestureInMap(event.target)) return;

    event.preventDefault();
    event.stopPropagation();

    const zoomDirection = event.altKey ? -1 : 1;
    zoomMapAtPoint(event.clientX, event.clientY, map.getZoom() + zoomDirection, {
      duration: DOUBLE_CLICK_ZOOM_TRANSITION_MS
    });
  }, { capture: true });
}

function setMapStyle(styleKey) {
  const nextStyle = MAP_STYLE_URLS[styleKey] ? styleKey : "satellite";
  if (nextStyle === currentMapStyleKey) return;

  currentMapStyleKey = nextStyle;
  map.setStyle(MAP_STYLE_URLS[nextStyle]);
  document.querySelectorAll("[data-map-style]").forEach((button) => {
    const isActive = button.dataset.mapStyle === nextStyle;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function initMapModeToggle() {
  document.querySelectorAll("[data-map-style]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setMapStyle(button.dataset.mapStyle);
    });
  });
}

function getSearchText(item) {
  return normalizeLocationToken([
    item.title,
    item.moment,
    item.location1,
    item.location2,
    item.stateLabel,
    item.countryLabel
  ].filter(Boolean).join(" "));
}

function getSearchMatches(query) {
  const normalizedQuery = normalizeLocationToken(query);
  if (!normalizedQuery) return [];

  const queryParts = normalizedQuery.split(/\s+/).filter(Boolean);
  return listings
    .map((item) => {
      const text = item.searchText || getSearchText(item);
      const hasAllParts = queryParts.every((part) => text.includes(part));
      if (!hasAllParts) return null;

      const title = normalizeLocationToken(item.title || "");
      const location = normalizeLocationToken(getItemLocationLabel(item));
      const score = (title.startsWith(normalizedQuery) ? 0 : 2)
        + (location.startsWith(normalizedQuery) ? 0 : 1)
        + Math.abs((item.title || "").length - query.length) / 100;

      return { item, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)
    .map(({ item }) => item);
}

function hideSearchResults() {
  const results = document.getElementById("map-search-results");
  results?.classList.add("hidden");
  results?.replaceChildren();
  document.body.classList.remove("search-open");
}

function renderSearchResults(query) {
  const results = document.getElementById("map-search-results");
  if (!results) return [];

  const matches = getSearchMatches(query);
  results.replaceChildren();

  if (!matches.length) {
    results.classList.add("hidden");
    document.body.classList.remove("search-open");
    return matches;
  }

  matches.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `gm-search-result${index === 0 ? " active" : ""}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", index === 0 ? "true" : "false");

    const thumb = document.createElement("span");
    thumb.className = "gm-search-result-thumb";
    thumb.style.backgroundImage = `url(${item.image || FALLBACK_IMAGE})`;

    const text = document.createElement("span");
    text.className = "gm-search-result-text";

    const title = document.createElement("span");
    title.className = "gm-search-result-title";
    title.textContent = item.moment || item.title || "Print";

    const meta = document.createElement("span");
    meta.className = "gm-search-result-meta";
    meta.textContent = getItemLocationLabel(item);

    text.append(title, meta);
    button.append(thumb, text);
    button.addEventListener("click", () => {
      document.getElementById("map-search-input").value = item.title || "";
      hideSearchResults();
      handleMarkerClick(item, { skipExplosion: true });
    });

    results.appendChild(button);
  });

  results.classList.remove("hidden");
  document.body.classList.add("search-open");
  return matches;
}

function initSearch() {
  const form = document.getElementById("map-search");
  const input = document.getElementById("map-search-input");
  const clearButton = document.getElementById("map-search-clear");
  if (!form || !input) return;

  let latestMatches = [];

  input.addEventListener("input", () => {
    latestMatches = renderSearchResults(input.value);
  });

  input.addEventListener("focus", () => {
    latestMatches = renderSearchResults(input.value);
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    latestMatches = latestMatches.length ? latestMatches : renderSearchResults(input.value);
    const item = latestMatches[0];
    if (!item) return;

    input.value = item.title || "";
    hideSearchResults();
    handleMarkerClick(item, { skipExplosion: true });
  });

  clearButton?.addEventListener("click", () => {
    input.value = "";
    hideSearchResults();
    input.focus();
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("#map-search")) return;
    hideSearchResults();
  });
}

function installTrackpadPinchZoom() {
  let gestureStartZoom = null;
  const mapContainer = map.getContainer();
  const mapCanvas = map.getCanvas();
  const mapCanvasContainer = map.getCanvasContainer?.();

  const shouldHandleMapPinch = (event) => {
    if (shouldSkipTrackpadPinch(event.target)) return false;
    if (event.target instanceof Node && mapContainer.contains(event.target)) return true;
    if (!hasValidClientPoint(event.clientX, event.clientY)) return false;
    return isPointInsideMap(event.clientX, event.clientY);
  };

  const handlePinchWheel = (event) => {
    const isPinchWheel = event.ctrlKey || event.metaKey || Math.abs(event.deltaZ || 0) > 0;
    if (!isPinchWheel || !shouldHandleMapPinch(event)) return;

    event.preventDefault();
    event.stopPropagation();

    const normalizedDelta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY;
    const zoomDelta = Math.max(
      -TRACKPAD_PINCH_MAX_DELTA,
      Math.min(TRACKPAD_PINCH_MAX_DELTA, -normalizedDelta * TRACKPAD_PINCH_ZOOM_RATE)
    );
    const { clientX, clientY } = getGestureClientPoint(event);

    zoomMapAtPoint(clientX, clientY, map.getZoom() + zoomDelta, {
      duration: GESTURE_ZOOM_TRANSITION_MS
    });
  };

  const addPinchListener = (target, eventName, handler, options = { capture: true, passive: false }) => {
    target?.addEventListener?.(eventName, handler, options);
  };

  [window, document, mapContainer, mapCanvasContainer, mapCanvas].forEach((target) => {
    addPinchListener(target, "wheel", handlePinchWheel);
  });

  const handleGestureStart = (event) => {
    if (!shouldHandleMapPinch(event)) return;

    event.preventDefault();
    gestureStartZoom = map.getZoom();
  };

  const handleGestureChange = (event) => {
    if (gestureStartZoom === null || !shouldHandleMapPinch(event)) return;

    event.preventDefault();
    event.stopPropagation();

    const { clientX, clientY } = getGestureClientPoint(event);
    zoomMapAtPoint(clientX, clientY, gestureStartZoom + Math.log2(event.scale) * SAFARI_GESTURE_ZOOM_RATE, {
      duration: GESTURE_ZOOM_TRANSITION_MS
    });
  };

  const handleGestureEnd = () => {
    gestureStartZoom = null;
  };

  [window, document, mapContainer, mapCanvasContainer, mapCanvas].forEach((target) => {
    addPinchListener(target, "gesturestart", handleGestureStart);
    addPinchListener(target, "gesturechange", handleGestureChange);
    addPinchListener(target, "gestureend", handleGestureEnd, { capture: true, passive: true });
  });
}

function installEmbeddedScrollBridge() {
  if (window.parent === window) return;

  let lastTouchPoint = null;
  let isVerticalPageScroll = false;
  let dragPanPausedForScroll = false;

  const scrollParentPage = (deltaX, deltaY) => {
    window.parent.postMessage(
      {
        type: "preciso-map-scroll",
        deltaX,
        deltaY
      },
      "*"
    );
  };

  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) return;
      if (shouldKeepGestureInMap(event.target)) return;
      scrollParentPage(event.deltaX, event.deltaY);
    },
    { capture: true, passive: true }
  );

  window.addEventListener(
    "touchstart",
    (event) => {
      isVerticalPageScroll = false;
      if (event.touches.length !== 1 || shouldKeepGestureInMap(event.target)) {
        lastTouchPoint = null;
        return;
      }

      const touch = event.touches[0];
      lastTouchPoint = { x: touch.clientX, y: touch.clientY };
    },
    { capture: true, passive: true }
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (!lastTouchPoint || event.touches.length !== 1 || shouldKeepGestureInMap(event.target)) return;

      const touch = event.touches[0];
      const deltaX = lastTouchPoint.x - touch.clientX;
      const deltaY = lastTouchPoint.y - touch.clientY;
      lastTouchPoint = { x: touch.clientX, y: touch.clientY };

      if (!isVerticalPageScroll) {
        isVerticalPageScroll = Math.abs(deltaY) > 6 && Math.abs(deltaY) > Math.abs(deltaX) * 1.15;
      }

      if (!isVerticalPageScroll) return;

      if (!dragPanPausedForScroll) {
        map.dragPan.disable();
        dragPanPausedForScroll = true;
      }

      event.preventDefault();
      event.stopPropagation();
      scrollParentPage(0, deltaY);
    },
    { capture: true, passive: false }
  );

  window.addEventListener(
    "touchend",
    () => {
      if (dragPanPausedForScroll) {
        map.dragPan.enable();
      }

      lastTouchPoint = null;
      isVerticalPageScroll = false;
      dragPanPausedForScroll = false;
    },
    { capture: true, passive: true }
  );

  window.addEventListener(
    "touchcancel",
    () => {
      if (dragPanPausedForScroll) {
        map.dragPan.enable();
      }

      lastTouchPoint = null;
      isVerticalPageScroll = false;
      dragPanPausedForScroll = false;
    },
    { capture: true, passive: true }
  );
}

function installMobileDoubleTapZoomGuard() {
  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;

  window.addEventListener(
    "touchend",
    (event) => {
      if (!window.matchMedia("(max-width: 700px)").matches) return;
      if (event.touches.length > 0 || event.changedTouches.length !== 1) return;
      if (shouldKeepGestureInMap(event.target)) return;

      const touch = event.changedTouches[0];
      const now = Date.now();
      const deltaTime = now - lastTapTime;
      const deltaX = touch.clientX - lastTapX;
      const deltaY = touch.clientY - lastTapY;
      const isDoubleTap = deltaTime > 0 && deltaTime < 320 && Math.hypot(deltaX, deltaY) < 28;

      if (isDoubleTap) {
        event.preventDefault();
        event.stopPropagation();
        zoomMapAtPoint(touch.clientX, touch.clientY, map.getZoom() + 1, {
          duration: DOUBLE_TAP_ZOOM_TRANSITION_MS
        });
        lastTapTime = 0;
        return;
      }

      lastTapTime = now;
      lastTapX = touch.clientX;
      lastTapY = touch.clientY;
    },
    { capture: true, passive: false }
  );
}

installTrackpadPinchZoom();
installEmbeddedScrollBridge();
installMobileDoubleTapZoomGuard();
installDoubleClickZoom();
initMapControls();
initMapModeToggle();

/* =========================
   MARKER CLICK
========================= */
function handleMarkerClick(item, options = {}) {
  const flyToOptions = getFlyToOptions(item);
  if (!flyToOptions) return;
  const sheet = document.getElementById("place-sheet");
  const keepSheetExpanded = Boolean(
    sheet &&
    window.matchMedia("(max-width: 700px)").matches &&
    !sheet.classList.contains("hidden") &&
    (
      sheet.classList.contains("level-2") ||
      sheet.classList.contains("level-3") ||
      sheet.classList.contains("level-4")
    ) &&
    activeItem &&
    activeItem.id !== item.id
  );
  const switchingOpenSheet = Boolean(
    sheet &&
    !sheet.classList.contains("hidden") &&
    activeItem &&
    activeItem.id !== item.id
  );
  const shouldDelaySheetUntilZoom = Boolean(
    sheet &&
    sheet.classList.contains("hidden") &&
    !switchingOpenSheet &&
    !options.smoothNearbyTransition
  );

  const shouldOpenExplodedMarker = explodedMarkerGroup?.itemIds?.has(item.id);
  const canExplode = !options.skipExplosion && !activeItem && !isPlaceSheetOpen() && !shouldOpenExplodedMarker;
  if (canExplode && explodeMarkersForItem(item)) {
    return;
  }

  if (activeItem?.id === item.id && !document.getElementById("place-sheet")?.classList.contains("hidden")) {
    return;
  }

  if (options.smoothNearbyTransition || switchingOpenSheet) {
    flyToOptions.duration = SHEET_MARKER_TRANSITION_MS;
    flyToOptions.curve = 1.12;
    delete flyToOptions.speed;
  } else if (shouldDelaySheetUntilZoom) {
    flyToOptions.duration = REGION_MARKER_TRANSITION_MS;
    flyToOptions.curve = 1.18;
    delete flyToOptions.speed;
  }

  resetExplodedMarkers();
  window.location.hash = `marker=${encodeURIComponent(item.id)}`;
  activeItem = item;
  setActiveItemRegion(item);
  hideRegionExperience();

  if (shouldDelaySheetUntilZoom) {
    sheet.classList.add("hidden");
    sheet.classList.remove("level-1", "level-2", "level-3", "level-4");
    document.body.classList.remove("marker-active");
    hideNearbyPrints();
    setActiveMarkerState(item.id);
    forceActiveMarkerVisible();
  } else {
    showPlaceSheet(item, {
      keepExpanded: keepSheetExpanded,
      animateNearby: options.smoothNearbyTransition || switchingOpenSheet
    });
  }

  map.flyTo(flyToOptions);
  let didRevealSheet = false;
  const revealSheet = () => {
    if (didRevealSheet || activeItem?.id !== item.id) return;

    didRevealSheet = true;
    showPlaceSheet(item, {
      keepExpanded: keepSheetExpanded,
      animateNearby: false
    });
    openSheetToLevel2();
    window.setTimeout(() => {
      triggerActiveMarkerPop(item.id);
    }, 40);
  };

  map.once("moveend", () => {
    if (activeItem?.id === item.id) {
      if (shouldDelaySheetUntilZoom) {
        revealSheet();
      } else {
        openSheetToLevel2();
        window.setTimeout(() => {
          triggerActiveMarkerPop(item.id);
        }, 40);
      }
    }
  });
  if (shouldDelaySheetUntilZoom) {
    window.setTimeout(revealSheet, REGION_MARKER_TRANSITION_MS + 450);
  }
  setTimeout(() => {
    updateEdgeIndicator();
    if (!shouldDelaySheetUntilZoom) {
      nudgeActiveMarkerIntoView();
    }
  }, shouldDelaySheetUntilZoom ? REGION_MARKER_TRANSITION_MS + 120 : 300);
}

/* =========================
   RENDER
========================= */
function render() {
  clearMarkers();

  listings.forEach((item) => {
    const shell = document.createElement("div");
    shell.className = "custom-marker-shell";
    if (item.isNewPrint) {
      shell.classList.add("new-print", "new-print-pulse");
    }
    shell.dataset.itemId = item.id;
    shell.setAttribute("role", "button");
    shell.setAttribute("tabindex", "0");
    shell.setAttribute("aria-label", item.title || "Map marker");

    const el = document.createElement("div");
    el.className = "custom-marker";
    el.style.backgroundImage = `url(${item.image})`;

    const offset = document.createElement("div");
    offset.className = "custom-marker-offset";
    offset.appendChild(el);

    const label = document.createElement("div");
    label.className = "custom-marker-label";
    label.textContent = getMarkerLabel(item);

    shell.appendChild(offset);
    shell.appendChild(label);

    shell.addEventListener("pointerenter", (event) => {
      if (activeItem?.id !== item.id) {
        el.classList.add("hover");
      }
      showMarkerPreview(item, event);
    });

    shell.addEventListener("pointerleave", () => {
      el.classList.remove("hover");
      hideMarkerPreview();
    });

    shell.addEventListener("pointermove", moveMarkerPreview);

    shell.addEventListener("pointerdown", () => {
      if (activeItem?.id !== item.id) {
        el.classList.add("hover");
      }
    });

    shell.addEventListener("pointerup", () => {
      if (activeItem?.id !== item.id) {
        el.classList.remove("hover");
      }
    });

    shell.addEventListener("pointercancel", () => {
      el.classList.remove("hover");
    });

    shell.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove("hover");
      hideMarkerPreview();
      handleMarkerClick(item);
    });

    shell.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.classList.remove("hover");
        handleMarkerClick(item);
      }
    });

    const marker = new mapboxgl.Marker({ element: shell })
      .setLngLat([item.lng, item.lat])
      .addTo(map);
    marker.item = item;

    markers.push(marker);
  });

  setMarkerVisibilityByZoom();
  updateEdgeIndicator();
}

/* =========================
   HASH LINKING
========================= */
function openMarkerFromHash() {
  const hash = window.location.hash;
  if (!hash.startsWith("#marker=")) return false;

  const id = decodeURIComponent(hash.replace("#marker=", ""));
  const item = listings.find((entry) => entry.id === id);
  if (!item) return false;

  window.setTimeout(() => {
    if (!activeItem || activeItem.id !== item.id) {
      const flyToOptions = getFlyToOptions(item);
      if (!flyToOptions) return;
      flyToOptions.duration = REGION_MARKER_TRANSITION_MS;
      flyToOptions.curve = 1.18;
      delete flyToOptions.speed;

      activeItem = item;
      setActiveItemRegion(item);
      showPlaceSheet(item);
      map.flyTo(flyToOptions);
      map.once("moveend", () => {
        if (activeItem?.id === item.id) {
          openSheetToLevel2();
          window.setTimeout(() => {
            triggerActiveMarkerPop(item.id);
          }, 40);
        }
      });
      setTimeout(() => {
        updateEdgeIndicator();
        nudgeActiveMarkerIntoView();
      }, 300);
    }
  }, 200);

  return true;
}

function openRegionFromHash() {
  const regionKey = getRegionKeyFromHash();
  if (!regionKey) return false;

  focusRegion(regionKey, { skipHash: true });
  return true;
}

/* =========================
   INIT
========================= */
map.on("load", async () => {
  listings = await fetchProducts();
  markNewestPrints();
  buildLocationFilters();
  listings.forEach((item) => {
    item.searchText = getSearchText(item);
  });
  renderLocationMenus();

  render();
  setMarkerVisibilityByZoom();

  document.getElementById("skeletons")?.remove();
  document.getElementById("place-sheet")?.classList.add("hidden");
  document.body.classList.remove("marker-active");

  bindHeaderRegionPills();
  initSearch();

  const openedMarkerFromHash = openMarkerFromHash();
  const openedRegionFromHash = openedMarkerFromHash ? false : openRegionFromHash();

  if (!openedMarkerFromHash && !openedRegionFromHash) {
    requestAnimationFrame(() => {
      focusRegion("all");
    });
  }

  initSheetDrag();
  initNearbyControls();
  initRegionExperienceControls();

  map.on("movestart", () => {
    if (explodedMarkerGroup) {
      resetExplodedMarkers();
    }
  });

  map.on("move", () => {
    updateEdgeIndicator();
  });

map.on("zoom", () => {
  setMarkerVisibilityByZoom();
  updateEdgeIndicator();
  forceActiveMarkerVisible();
  updateMapControlState();
});

map.on("moveend", () => {
  setMarkerVisibilityByZoom();
  updateEdgeIndicator();
  forceActiveMarkerVisible();
  updateMapControlState();
});
});

window.addEventListener("hashchange", () => {
  if (!openMarkerFromHash()) {
    openRegionFromHash();
  }
});

const closeBtn = document.getElementById("sheet-close");
if (closeBtn) {
  closeBtn.addEventListener("click", resetView);
}

window.addEventListener("resize", () => {
  const sheet = document.getElementById("place-sheet");
  const isSheetOpen = sheet && !sheet.classList.contains("hidden");

  if (isSheetOpen && activeItem) {
    keepActiveMarkerVisible();
  }

  setMarkerVisibilityByZoom();
  resetExplodedMarkers();
  updateEdgeIndicator();
});

map.on("click", (e) => {
  if (isResetting) return;
  if (e.originalEvent?.target?.closest?.(".custom-marker-shell")) return;
  if (e.originalEvent?.target?.closest?.("#place-sheet")) return;
  if (explodedMarkerGroup) {
    resetExplodedMarkers();
    updateEdgeIndicator();
    return;
  }
  resetView();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    resetView();
  }
});
