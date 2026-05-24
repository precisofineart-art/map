mapboxgl.accessToken = "pk.eyJ1IjoicHJlY2lzbyIsImEiOiJjbW1yMnR4Ym0xNXo2MnFvcjF3OWhjeG0xIn0.0kik_HY1s4mLhwZE3W3aRQ";

/* =========================
   CONFIG
========================= */
const SHOP_URL = "https://precisoart.myshopify.com";
const STOREFRONT_TOKEN = "c9a152a9e40b1bbbb9e9be8367dcca4c";
const FALLBACK_IMAGE = "https://picsum.photos/800";

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

/* =========================
   STATE
========================= */
let listings = [];
let markers = [];
let activeItem = null;
let isResetting = false;
let edgeIndicatorEls = new Map();
let explodedMarkerGroup = null;
let nearbyRenderToken = 0;
let regionMenuCloseTimer = null;

const MARKER_EXPLODE_DISTANCE = 58;
const MARKER_EXPLODE_RADIUS = 62;
const MARKER_EXPLODE_MAX_ITEMS = 12;
const NEARBY_PRINT_LIMIT = 6;
const NEARBY_TRANSITION_MS = 150;
const SHEET_MARKER_TRANSITION_MS = 1250;
const REGION_TRANSITION_MS = 750;

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

function setActiveRegionChip(regionKey = "all") {
  const usaRegionKeys = new Set(["west", "south", "east", "midwest"]);

  document.querySelectorAll("[data-region]").forEach((chip) => {
    const chipRegion = chip.dataset.region;
    const isActive = chipRegion === regionKey || (chipRegion === "northAmerica" && usaRegionKeys.has(regionKey));
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

function focusRegion(regionKey) {
  const region = REGION_VIEWS[regionKey] || REGION_VIEWS.all;

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

  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  setActiveRegionChip(regionKey);

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
        openRegionMenu(group);
      } else {
        closeRegionMenus();
      }
    });

    group?.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") openRegionMenu(group);
    });
    group?.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") scheduleCloseRegionMenus();
    });
    group?.addEventListener("mouseenter", () => {
      if (canUseHoverRegionMenu()) openRegionMenu(group);
    });
    group?.addEventListener("mouseleave", () => {
      if (canUseHoverRegionMenu()) scheduleCloseRegionMenus();
    });
    group?.addEventListener("mouseover", () => {
      if (canUseHoverRegionMenu()) openRegionMenu(group);
    });
    group?.addEventListener("mouseout", (e) => {
      if (!canUseHoverRegionMenu()) return;
      if (group.contains(e.relatedTarget) || submenu?.contains(e.relatedTarget)) return;
      scheduleCloseRegionMenus();
    });
    toggle.addEventListener("focus", () => openRegionMenu(group));

    submenu?.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") window.clearTimeout(regionMenuCloseTimer);
    });
    submenu?.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") scheduleCloseRegionMenus();
    });
    submenu?.addEventListener("mouseenter", () => {
      if (canUseHoverRegionMenu()) window.clearTimeout(regionMenuCloseTimer);
    });
    submenu?.addEventListener("mouseleave", () => {
      if (canUseHoverRegionMenu()) scheduleCloseRegionMenus();
    });
    submenu?.addEventListener("mouseover", () => {
      if (canUseHoverRegionMenu()) window.clearTimeout(regionMenuCloseTimer);
    });
    submenu?.addEventListener("mouseout", (e) => {
      if (!canUseHoverRegionMenu()) return;
      if (submenu.contains(e.relatedTarget) || group?.contains(e.relatedTarget)) return;
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

function setMarkerVisibilityByZoom() {
  if (!map) return;

  markers.forEach((marker) => {
    const markerEl = marker.getElement();
    if (!markerEl) return;

    markerEl.style.display = "";
    markerEl.style.opacity = "1";
    markerEl.style.pointerEvents = "auto";
  });
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

  listings.forEach((item) => {
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
    sheet.classList.remove("level-2", "level-3", "level-4");
    sheet.classList.add("level-1");
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
  const LEVEL_1 = 80;
  const LEVEL_2 = 34;
  const LEVEL_3 = 9;
  const LEVEL_4 = 0;

  const getCurrentLevel = () => {
    if (sheet.classList.contains("level-4")) return 4;
    if (sheet.classList.contains("level-3")) return 3;
    if (sheet.classList.contains("level-2")) return 2;
    return 1;
  };

  const getLevelTranslate = (level) => {
    if (level === 4) return LEVEL_4;
    if (level === 3) return LEVEL_3;
    if (level === 2) return LEVEL_2;
    return LEVEL_1;
  };

  const clampTranslate = (value) => {
    return Math.min(LEVEL_1, Math.max(LEVEL_4, value));
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
      targetLevel = Math.max(1, currentLevel - 1);
    } else if (currentTranslate <= (LEVEL_4 + LEVEL_3) / 2) {
      targetLevel = 4;
    } else if (currentTranslate <= (LEVEL_3 + LEVEL_2) / 2) {
      targetLevel = 3;
    } else if (currentTranslate <= (LEVEL_2 + LEVEL_1) / 2) {
      targetLevel = 2;
    } else {
      targetLevel = 1;
    }

    setLevel(targetLevel);
  };

  const onPointerDown = (e) => {
    // if (!isMobileViewport()) return;
    if (sheet.classList.contains("hidden")) return;
    if (e.target.closest("button, a")) return;

    if (isMobileViewport()) {
      const isLevel1 = sheet.classList.contains("level-1");
      if (!isLevel1) {
        const rect = sheet.getBoundingClientRect();
        const dragZoneHeight = 220;
        if (e.clientY > rect.top + dragZoneHeight) return;
      }
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
  const previousActiveItem = activeItem;
  const targetRegionKey = previousActiveItem ? getRegionKeyForItem(previousActiveItem) : "all";
  const targetRegion = REGION_VIEWS[targetRegionKey] || REGION_VIEWS.all;

  activeItem = null;
  resetExplodedMarkers();

  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

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
  setActiveRegionChip(targetRegionKey);

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
    const res = await fetch(`${SHOP_URL}/api/2023-07/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN
      },
      body: JSON.stringify({
        query: `
        {
          products(first: 50) {
            edges {
              node {
                title
                handle
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
        }`
      })
    });

    if (!res.ok) {
      throw new Error(`Storefront request failed: ${res.status}`);
    }

    const json = await res.json();
    const edges = json?.data?.products?.edges || [];

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
          time: node.time?.value || "Any time"
        };

        return { ...item, id: getItemId(item) };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return [];
  }
}

/* =========================
   MAP
========================= */
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/preciso/cmmr4qr4k000i01s300a1egdu",
  center: HOME_VIEW.center,
  zoom: HOME_VIEW.zoom,
  cooperativeGestures: false
});

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

const shouldKeepGestureInMap = (target) =>
  target instanceof Element && Boolean(target.closest(MAP_GESTURE_IGNORED_SELECTOR));

function zoomMapAtPoint(clientX, clientY, nextZoom) {
  const mapRect = map.getContainer().getBoundingClientRect();
  const x = clientX - mapRect.left;
  const y = clientY - mapRect.top;
  const minZoom = map.getMinZoom?.() ?? 0;
  const maxZoom = map.getMaxZoom?.() ?? 22;
  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, nextZoom));

  map.zoomTo(clampedZoom, {
    around: map.unproject([x, y]),
    duration: 0
  });
}

function installTrackpadPinchZoom() {
  let gestureStartZoom = null;

  window.addEventListener(
    "wheel",
    (event) => {
      if (!event.ctrlKey || shouldKeepGestureInMap(event.target)) return;

      event.preventDefault();
      event.stopPropagation();

      const normalizedDelta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * 16 : event.deltaY;
      const zoomDelta = Math.max(-0.45, Math.min(0.45, -normalizedDelta * 0.01));
      zoomMapAtPoint(event.clientX, event.clientY, map.getZoom() + zoomDelta);
    },
    { capture: true, passive: false }
  );

  window.addEventListener(
    "gesturestart",
    (event) => {
      if (shouldKeepGestureInMap(event.target)) return;

      event.preventDefault();
      gestureStartZoom = map.getZoom();
    },
    { capture: true, passive: false }
  );

  window.addEventListener(
    "gesturechange",
    (event) => {
      if (gestureStartZoom === null || shouldKeepGestureInMap(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      zoomMapAtPoint(event.clientX, event.clientY, gestureStartZoom + Math.log2(event.scale) * 2);
    },
    { capture: true, passive: false }
  );

  window.addEventListener(
    "gestureend",
    () => {
      gestureStartZoom = null;
    },
    { capture: true, passive: true }
  );
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

installTrackpadPinchZoom();
installEmbeddedScrollBridge();

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
  }

  resetExplodedMarkers();
  window.location.hash = `marker=${encodeURIComponent(item.id)}`;
  activeItem = item;
  setActiveRegionChip("all");

  showPlaceSheet(item, {
    keepExpanded: keepSheetExpanded,
    animateNearby: options.smoothNearbyTransition || switchingOpenSheet
  });
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

/* =========================
   RENDER
========================= */
function render() {
  clearMarkers();

  listings.forEach((item) => {
    const shell = document.createElement("div");
    shell.className = "custom-marker-shell";
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
    shell.appendChild(offset);

    shell.addEventListener("pointerenter", () => {
      if (activeItem?.id !== item.id) {
        el.classList.add("hover");
      }
    });

    shell.addEventListener("pointerleave", () => {
      el.classList.remove("hover");
    });

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
  if (!hash.startsWith("#marker=")) return;

  const id = decodeURIComponent(hash.replace("#marker=", ""));
  const item = listings.find((entry) => entry.id === id);
  if (!item) return;

  window.setTimeout(() => {
    if (!activeItem || activeItem.id !== item.id) {
      const flyToOptions = getFlyToOptions(item);
      if (!flyToOptions) return;

      activeItem = item;
      setActiveRegionChip("all");
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
}

/* =========================
   INIT
========================= */
map.on("load", async () => {
  listings = await fetchProducts();

  render();
  setMarkerVisibilityByZoom();

  document.getElementById("skeletons")?.remove();
  document.getElementById("place-sheet")?.classList.add("hidden");
  document.body.classList.remove("marker-active");

  bindHeaderRegionPills();

  if (!window.location.hash.startsWith("#marker=")) {
    requestAnimationFrame(() => {
      focusRegion("all");
    });
  }

  openMarkerFromHash();
  initSheetDrag();
  initNearbyControls();

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
});

map.on("moveend", () => {
  setMarkerVisibilityByZoom();
  updateEdgeIndicator();
  forceActiveMarkerVisible();
});
});

window.addEventListener("hashchange", openMarkerFromHash);

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
