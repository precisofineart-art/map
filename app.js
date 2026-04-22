mapboxgl.accessToken = "pk.eyJ1IjoicHJlY2lzbyIsImEiOiJjbW1yMnR4Ym0xNXo2MnFvcjF3OWhjeG0xIn0.0kik_HY1s4mLhwZE3W3aRQ";

/* =========================
   CONFIG
========================= */
const SHOP_URL = "https://precisoart.myshopify.com";
const STOREFRONT_TOKEN = "c9a152a9e40b1bbbb9e9be8367dcca4c";
const FALLBACK_IMAGE = "https://picsum.photos/800";
console.log("NEW APP.JS LOADED");
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
  northAmerica: {
    bounds: [[-135, 18], [-48, 61]],
    padding: { top: 100, right: 70, bottom: 70, left: 70 }
  },
  caribbean: {
    bounds: [[-89, 8], [-58, 29]],
    padding: { top: 120, right: 80, bottom: 80, left: 80 }
  },
  europe: {
    bounds: [[-12, 35], [35, 72]],
    padding: { top: 120, right: 80, bottom: 80, left: 80 }
  },
  asia: {
    bounds: [[25, -5], [150, 62]],
    padding: { top: 120, right: 80, bottom: 80, left: 80 }
  }
};

/* =========================
   STATE
========================= */
let listings = [];
let markers = [];
let clusterMarkers = new Map();
let activeItem = null;
let isResetting = false;
let edgeIndicatorEls = new Map();

const MARKER_SHOW_ZOOM = 13;

/* =========================
   HELPERS
========================= */
function getItemId(item) {
  return `${item.title}|${item.lat}|${item.lng}`;
}

function clearMarkers() {
  markers.forEach((marker) => marker.remove());
  markers = [];
}

function clearClusterMarkers() {
  clusterMarkers.forEach((marker) => marker.remove());
  clusterMarkers.clear();
}

function createClusterPreviewMarker(feature, previewImage) {
  const clusterId = feature.properties.cluster_id;
  const pointCount = feature.properties.point_count_abbreviated || feature.properties.point_count || "";

  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", `Zoom into cluster of ${pointCount} locations`);
  button.style.position = "relative";
  button.style.width = "44px";
  button.style.height = "44px";
  button.style.padding = "0";
  button.style.border = "0";
  button.style.borderRadius = "999px";
  button.style.background = "transparent";
  button.style.cursor = "pointer";
  button.style.boxShadow = "none";

  const glow = document.createElement("span");
  glow.style.position = "absolute";
  glow.style.inset = "-6px";
  glow.style.borderRadius = "999px";
  glow.style.background = "rgba(12, 52, 122, 0.18)";
  glow.style.filter = "blur(8px)";
  glow.style.pointerEvents = "none";

  const image = document.createElement("span");
  image.style.position = "absolute";
  image.style.inset = "0";
  image.style.borderRadius = "999px";
  image.style.backgroundImage = `url(${previewImage || FALLBACK_IMAGE})`;
  image.style.backgroundSize = "cover";
  image.style.backgroundPosition = "center";
  image.style.border = "2px solid rgba(255,255,255,0.95)";
  image.style.boxShadow = "0 8px 18px rgba(0, 0, 0, 0.18)";

  const badge = document.createElement("span");
  badge.textContent = `${pointCount}`;
  badge.style.position = "absolute";
  badge.style.right = "-4px";
  badge.style.bottom = "-2px";
  badge.style.minWidth = "20px";
  badge.style.height = "20px";
  badge.style.padding = "0 6px";
  badge.style.display = "inline-flex";
  badge.style.alignItems = "center";
  badge.style.justifyContent = "center";
  badge.style.borderRadius = "999px";
  badge.style.background = "#0c347a";
  badge.style.color = "#ffffff";
  badge.style.fontSize = "10px";
  badge.style.fontWeight = "700";
  badge.style.lineHeight = "1";
  badge.style.border = "1px solid rgba(255,255,255,0.92)";
  badge.style.boxShadow = "0 4px 10px rgba(0,0,0,0.18)";
  badge.style.pointerEvents = "none";

  button.appendChild(glow);
  button.appendChild(image);
  button.appendChild(badge);

  button.addEventListener("mouseenter", () => {
    image.style.transform = "scale(1.04)";
    image.style.transition = "transform 0.18s ease";
  });

  button.addEventListener("mouseleave", () => {
    image.style.transform = "scale(1)";
  });

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const source = map.getSource("listings-cluster");
    if (!source) return;

    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;

      map.easeTo({
        center: feature.geometry.coordinates,
        zoom,
        duration: 700,
        curve: 1.55,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        essential: true
      });
    });
  });

  return new mapboxgl.Marker({ element: button, anchor: "center" })
    .setLngLat(feature.geometry.coordinates);
}

function updateClusterMarkers() {
  if (!map) return;

  const showClusters = map.getZoom() < MARKER_SHOW_ZOOM;
  if (!showClusters) {
    clearClusterMarkers();
    return;
  }

  const source = map.getSource("listings-cluster");
  if (!source || !map.getLayer("clusters-hit-area") || !map.isSourceLoaded("listings-cluster")) {
    return;
  }

  const features = map
    .querySourceFeatures("listings-cluster")
    .filter((feature) => feature.properties && feature.properties.cluster);

  const seenClusterIds = new Set();

  features.forEach((feature) => {
    const clusterId = feature.properties.cluster_id;
    if (seenClusterIds.has(clusterId)) return;
    seenClusterIds.add(clusterId);

    const existingMarker = clusterMarkers.get(clusterId);
    if (existingMarker) {
      existingMarker.setLngLat(feature.geometry.coordinates);
      return;
    }

    source.getClusterLeaves(clusterId, 1, 0, (err, leaves) => {
      if (err || !leaves || !leaves.length) return;
      if (map.getZoom() >= MARKER_SHOW_ZOOM) return;
      if (clusterMarkers.has(clusterId)) return;

      const previewImage = leaves[0].properties?.image || FALLBACK_IMAGE;
      const marker = createClusterPreviewMarker(feature, previewImage).addTo(map);
      clusterMarkers.set(clusterId, marker);
    });
  });

  clusterMarkers.forEach((marker, clusterId) => {
    if (!seenClusterIds.has(clusterId)) {
      marker.remove();
      clusterMarkers.delete(clusterId);
    }
  });
}

function setActiveMarkerState(itemId = "") {
  document.querySelectorAll(".custom-marker-shell").forEach((markerShell) => {
    const isActive = markerShell.dataset.itemId === itemId;
    markerShell.classList.toggle("active", isActive);

    const markerInner = markerShell.querySelector(".custom-marker");
    if (!markerInner) return;

    markerInner.classList.toggle("active", isActive);

    if (!isActive) {
      markerInner.classList.remove("hover", "pop");
    }
  });
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

function setActiveRegionChip(regionKey = "all") {
  document.querySelectorAll("[data-region]").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.region === regionKey);
  });
}

function pointInBounds(lng, lat, bounds) {
  if (!bounds || bounds.length !== 2) return false;
  const [[minLng, minLat], [maxLng, maxLat]] = bounds;
  return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
}

function getRegionKeyForItem(item) {
  if (!item) return "all";

  if (pointInBounds(item.lng, item.lat, REGION_VIEWS.caribbean?.bounds)) {
    return "caribbean";
  }
  if (pointInBounds(item.lng, item.lat, REGION_VIEWS.europe?.bounds)) {
    return "europe";
  }
  if (pointInBounds(item.lng, item.lat, REGION_VIEWS.asia?.bounds)) {
    return "asia";
  }
  if (pointInBounds(item.lng, item.lat, REGION_VIEWS.northAmerica?.bounds)) {
    return "northAmerica";
  }

  return "all";
}

function focusRegion(regionKey) {
  const region = REGION_VIEWS[regionKey] || REGION_VIEWS.all;

  activeItem = null;
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
    sheet.classList.remove("level-1", "level-2", "level-3");
  }

  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  setActiveRegionChip(regionKey);

  if (region.bounds) {
    map.fitBounds(region.bounds, {
      padding: region.padding,
      duration: 1300,
      essential: true
    });
    return;
  }

  map.flyTo({
    center: region.center,
    zoom: region.zoom,
    speed: 0.22,
    curve: 1.55,
    essential: true
  });
}

function bindHeaderRegionPills() {
  document.querySelectorAll("[data-region]").forEach((chip) => {
    if (chip.dataset.regionBound === "true") return;

    chip.dataset.regionBound = "true";
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const regionKey = chip.dataset.region || "all";
      focusRegion(regionKey);
    });
  });

  setActiveRegionChip("all");
}

function setMarkerVisibilityByZoom() {
  if (!map) return;

  const showMarkers = map.getZoom() >= MARKER_SHOW_ZOOM;

  markers.forEach((marker) => {
    const markerEl = marker.getElement();
    if (!markerEl) return;
    markerEl.style.display = showMarkers ? "" : "none";
  });

  if (!showMarkers) {
    clearEdgeIndicators();
  }
}

function updateEdgeIndicator() {
  if (!map || !listings.length || map.getZoom() < 13) {
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
        handleMarkerClick(item);
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

  const topSafe = Math.round((headerRect?.bottom || 0) + 20);
  const bottomSafe = Math.round(sheetRect.top - 28);

  const desiredY = bottomSafe > topSafe
    ? Math.round((topSafe + bottomSafe) / 2)
    : topSafe;

  const viewportCenterY = Math.round(window.innerHeight / 2);
  const offsetY = desiredY - viewportCenterY;

  return [0, offsetY];
}

function getFlyToOptions(item, zoom) {
  const sheet = document.getElementById("place-sheet");
  const isMobileViewport = window.matchMedia("(max-width: 700px)").matches;

  let mobileZoom = 13.8;

  if (sheet?.classList.contains("level-2")) {
    mobileZoom = 12.8;
  }

  return {
    center: [item.lng, item.lat],
    zoom: zoom ?? (isMobileViewport ? mobileZoom : 15),
    offset: getSheetOffset(),
    speed: 0.55,
    curve: 1.42,
    essential: true
  };
}

function keepActiveMarkerVisible() {
  if (!activeItem) return;

  const sheet = document.getElementById("place-sheet");
  const isMobileViewport = window.matchMedia("(max-width: 700px)").matches;

  let zoom;
  if (isMobileViewport) {
    zoom = sheet?.classList.contains("level-2") ? 12.8 : 13.8;
  }

  map.easeTo({
    center: [activeItem.lng, activeItem.lat],
    zoom,
    offset: getSheetOffset(),
    duration: 260,
    essential: true
  });
  setTimeout(updateEdgeIndicator, 300);
}

function showPlaceSheet(item) {
  const sheet = document.getElementById("place-sheet");
  if (!sheet) return;

  const title = document.getElementById("sheet-title");
  const time = document.getElementById("sheet-time");
  const subtitle = document.getElementById("sheet-subtitle");
  const image = document.getElementById("sheet-image-main");
  const productLink = document.getElementById("sheet-product-link");
  const closeButton = document.getElementById("sheet-close");

  if (title) title.textContent = item.title || "";
  if (time) time.textContent = item.time || "Any time";
  if (subtitle) subtitle.textContent = item.moment || "Explore";

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

  setActiveMarkerState(item.id);

  sheet.classList.remove("hidden");
  sheet.classList.remove("level-2", "level-3");
  sheet.classList.add("level-1");
  closeButton?.focus({ preventScroll: true });
}

function initSheetDrag() {
  const sheet = document.getElementById("place-sheet");
  const handle = sheet?.querySelector(".place-sheet-handle");
  const header = sheet?.querySelector(".place-sheet-header");
  if (!sheet || !handle) return;

  let startY = 0;
  let startTranslate = 0;
  let currentTranslate = 0;
  let isDragging = false;
  let activePointerId = null;
  let lastY = 0;
  let lastTime = 0;
  let velocityY = 0;

  const isMobileViewport = () => window.matchMedia("(max-width: 700px)").matches;
  const LEVEL_1 = 80;
  const LEVEL_2 = 24;

  const getCurrentLevel = () => {
    if (sheet.classList.contains("level-2")) return 2;
    return 1;
  };

  const getLevelTranslate = (level) => {
    return level === 2 ? LEVEL_2 : LEVEL_1;
  };

  const clampTranslate = (value) => {
    return Math.min(LEVEL_1, Math.max(LEVEL_2, value));
  };

  const setLevel = (level) => {
    sheet.style.transition = "";
    sheet.style.transform = "";
    sheet.classList.remove("level-1", "level-2", "level-3");
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
    const deltaY = ev.clientY - startY;
    const viewportHeight = Math.max(window.innerHeight, 1);
    const deltaPercent = (deltaY / viewportHeight) * 100;

    currentTranslate = clampTranslate(startTranslate + deltaPercent);
    sheet.style.transform = `translateY(${currentTranslate}%)`;

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

    const midpoint = (LEVEL_1 + LEVEL_2) / 2;
    const flickUp = velocityY < -0.35;
    const flickDown = velocityY > 0.35;

    let targetLevel;
    if (flickUp) {
      targetLevel = 2;
    } else if (flickDown) {
      targetLevel = 1;
    } else {
      targetLevel = currentTranslate <= midpoint ? 2 : 1;
    }

    isDragging = false;
    activePointerId = null;
    velocityY = 0;
    sheet.style.transition = "";

    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);

    setLevel(targetLevel);
  };

  const onPointerDown = (e) => {
    if (!isMobileViewport()) return;
    if (sheet.classList.contains("hidden")) return;
    if (e.target.closest("button, a")) return;

    const isLevel1 = sheet.classList.contains("level-1");
    if (!isLevel1) {
      const rect = sheet.getBoundingClientRect();
      const dragZoneHeight = 220;
      if (e.clientY > rect.top + dragZoneHeight) return;
    }

    startY = e.clientY;
    startTranslate = getLevelTranslate(getCurrentLevel());
    currentTranslate = startTranslate;
    isDragging = true;
    activePointerId = e.pointerId;
    lastY = e.clientY;
    lastTime = performance.now();
    velocityY = 0;

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

  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  const sheet = document.getElementById("place-sheet");
  if (sheet) {
    sheet.classList.add("hidden");
    sheet.classList.remove("level-1", "level-2", "level-3");
  }

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
      duration: 1300,
      essential: true
    });
  } else {
    map.flyTo({
      center: targetRegion.center,
      zoom: targetRegion.zoom,
      speed: 0.22,
      curve: 1.55,
      essential: true
    });
  }

  window.setTimeout(() => {
    isResetting = false;
  }, 1350);
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

        const item = {
          title: node.title,
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
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/preciso/cmmr4qr4k000i01s300a1egdu",
  center: HOME_VIEW.center,
  zoom: HOME_VIEW.zoom,
  cooperativeGestures: isTouchDevice
});
const mapContainer = map.getContainer();

map.dragPan.enable();

if (isTouchDevice) {
  map.scrollZoom.disable();
} else {
  map.scrollZoom.enable();
}

map.touchZoomRotate.enable();
map.touchZoomRotate.disableRotation();
map.doubleClickZoom.enable();


/* =========================
   MARKER CLICK
========================= */
function handleMarkerClick(item) {
  if (activeItem?.id === item.id && !document.getElementById("place-sheet")?.classList.contains("hidden")) {
    return;
  }

  window.location.hash = `marker=${encodeURIComponent(item.id)}`;
  activeItem = item;
  setActiveRegionChip("all");

  showPlaceSheet(item);
  map.flyTo(getFlyToOptions(item));
  map.once("moveend", () => {
    if (activeItem?.id === item.id) {
      window.setTimeout(() => {
        triggerActiveMarkerPop(item.id);
      }, 40);
    }
  });
  setTimeout(updateEdgeIndicator, 300);
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

    shell.appendChild(el);

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
  updateClusterMarkers();
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
      activeItem = item;
      setActiveRegionChip("all");
      showPlaceSheet(item);
      map.flyTo(getFlyToOptions(item));
      map.once("moveend", () => {
        if (activeItem?.id === item.id) {
          window.setTimeout(() => {
            triggerActiveMarkerPop(item.id);
          }, 40);
        }
      });
      setTimeout(updateEdgeIndicator, 300);
    }
  }, 200);
}

/* =========================
   INIT
========================= */
map.on("load", async () => {
  listings = await fetchProducts();

  const geojson = {
    type: "FeatureCollection",
    features: listings.map((item) => ({
      type: "Feature",
      properties: {
        id: item.id,
        title: item.title,
        image: item.image || FALLBACK_IMAGE
      },
      geometry: {
        type: "Point",
        coordinates: [item.lng, item.lat]
      }
    }))
  };

  map.addSource("listings-cluster", {
    type: "geojson",
    data: geojson,
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 50
  });

  map.addLayer({
    id: "clusters-hit-area",
    type: "circle",
    source: "listings-cluster",
    filter: ["has", "point_count"],
    paint: {
      "circle-radius": 1,
      "circle-opacity": 0
    }
  });

  render();
  setMarkerVisibilityByZoom();
  updateClusterMarkers();

  document.getElementById("place-sheet")?.classList.add("hidden");

  bindHeaderRegionPills();

  // Reset to active region after load (default = "all" / Home)
  requestAnimationFrame(() => {
    focusRegion("all");
  });

  openMarkerFromHash();
  initSheetDrag();
  map.on("move", () => {
    updateClusterMarkers();
    updateEdgeIndicator();
  });

  map.on("zoom", () => {
    setMarkerVisibilityByZoom();
    updateClusterMarkers();
    updateEdgeIndicator();
  });

  map.on("moveend", () => {
    updateClusterMarkers();
    updateEdgeIndicator();
  });

  map.on("idle", () => {
    updateClusterMarkers();
  });

  map.on("sourcedata", (event) => {
    if (event.sourceId === "listings-cluster" && event.isSourceLoaded) {
      updateClusterMarkers();
    }
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
});

map.on("click", (e) => {
  if (isResetting) return;
  if (e.originalEvent?.target?.closest?.(".custom-marker-shell")) return;
  if (e.originalEvent?.target?.closest?.("#place-sheet")) return;
  resetView();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    resetView();
  }
});