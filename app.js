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
  center: [-83.04, 42.315],
  zoom: 4
};

/* =========================
   STATE
========================= */
let listings = [];
let markers = [];
let activeItem = null;
let isResetting = false;

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

function setActiveMarkerState(itemId = "") {
  document.querySelectorAll(".custom-marker").forEach((markerEl) => {
    markerEl.classList.toggle("active", markerEl.dataset.itemId === itemId);
  });
}

function clearMarkerHoverStates() {
  document.querySelectorAll(".custom-marker").forEach((markerEl) => {
    markerEl.classList.remove("hover");
  });
}

function getSheetOffset() {
  const sheet = document.getElementById("place-sheet");
  const header = document.getElementById("header");
  const isMobileViewport = window.matchMedia("(max-width: 979px)").matches;

  if (!sheet || !isMobileViewport) {
    return [0, 0];
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
  const isMobileViewport = window.matchMedia("(max-width: 979px)").matches;

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
  const isMobileViewport = window.matchMedia("(max-width: 979px)").matches;

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
  sheet.classList.remove("level-2");
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

  const isMobileViewport = () => window.matchMedia("(max-width: 979px)").matches;
  const LEVEL_1 = 68;
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
    sheet.classList.remove("level-1", "level-2");
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
  activeItem = null;

  if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }

  const sheet = document.getElementById("place-sheet");
  if (sheet) {
    sheet.classList.add("hidden");
    sheet.classList.remove("level-1", "level-2");
  }

  setActiveMarkerState("");
  clearMarkerHoverStates();

  map.flyTo({
    center: HOME_VIEW.center,
    zoom: HOME_VIEW.zoom,
    speed: 0.38,
    curve: 1.7,
    essential: true
  });

  window.setTimeout(() => {
    isResetting = false;
  }, 450);
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
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/satellite-streets-v12",
  center: HOME_VIEW.center,
  zoom: HOME_VIEW.zoom
});

const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
const mapContainer = map.getContainer();

if (isTouchDevice) {
  map.dragPan.enable();
  map.touchZoomRotate.enable();
  map.touchZoomRotate.disableRotation();
  if (mapContainer) {
    mapContainer.style.touchAction = "none";
  }
} else {
  map.dragPan.enable();
  map.touchZoomRotate.enable();
  map.touchZoomRotate.disableRotation();
}

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

  showPlaceSheet(item);
  map.flyTo(getFlyToOptions(item));
}

/* =========================
   RENDER
========================= */
function render() {
  clearMarkers();

  listings.forEach((item) => {
    const el = document.createElement("div");
    el.className = "custom-marker";
    el.style.backgroundImage = `url(${item.image})`;
    el.dataset.itemId = item.id;
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", item.title || "Map marker");

    el.addEventListener("pointerenter", () => {
      if (activeItem?.id !== item.id) {
        el.classList.add("hover");
      }
    });

    el.addEventListener("pointerleave", () => {
      el.classList.remove("hover");
    });

    el.addEventListener("pointerdown", () => {
      if (activeItem?.id !== item.id) {
        el.classList.add("hover");
      }
    });

    el.addEventListener("pointerup", () => {
      if (activeItem?.id !== item.id) {
        el.classList.remove("hover");
      }
    });

    el.addEventListener("pointercancel", () => {
      el.classList.remove("hover");
    });

    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove("hover");
      handleMarkerClick(item);
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.classList.remove("hover");
        handleMarkerClick(item);
      }
    });

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([item.lng, item.lat])
      .addTo(map);

    markers.push(marker);
  });
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
      showPlaceSheet(item);
      map.flyTo(getFlyToOptions(item));
    }
  }, 200);
}

/* =========================
   INIT
========================= */
map.on("load", async () => {
  listings = await fetchProducts();
  render();

  document.getElementById("place-sheet")?.classList.add("hidden");

  openMarkerFromHash();
  initSheetDrag();
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
  if (e.originalEvent?.target?.closest?.(".custom-marker")) return;
  if (e.originalEvent?.target?.closest?.("#place-sheet")) return;
  resetView();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    resetView();
  }
});