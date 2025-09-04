// Config
const API_BASE = window.API_BASE || "http://127.0.0.1:8000/api/v1";

// Elements
const elMap = document.getElementById("map");
const elList = document.getElementById("list");
const elPlacesList = document.getElementById("placesList");
const btnMap = document.getElementById("btnMap");
const btnList = document.getElementById("btnList");

// Intro modal
const introOverlay = document.getElementById("introOverlay");
document.querySelectorAll("[data-close-intro]").forEach((b) => {
  b.addEventListener("click", () => introOverlay.classList.remove("visible"));
});

// Place modal
const placeOverlay = document.getElementById("placeOverlay");
const placeTitle = document.getElementById("placeTitle");
const placeMeta = document.getElementById("placeMeta");
const placeHistory = document.getElementById("placeHistory");
const placeEvents = document.getElementById("placeEvents");
const placePersons = document.getElementById("placePersons");

const gallery = document.getElementById("placeGallery");
const galleryImg = document.getElementById("galleryImg");
const photoCounter = document.getElementById("photoCounter");
const photoCaption = document.getElementById("photoCaption");
const prevPhoto = document.getElementById("prevPhoto");
const nextPhoto = document.getElementById("nextPhoto");

document.querySelector("[data-close-place]").addEventListener("click", () => {
  placeOverlay.classList.remove("visible");
});

// Nested detail modal (event/person)
const detailOverlay = document.getElementById("detailOverlay");
const detailTitle = document.getElementById("detailTitle");
const detailBody = document.getElementById("detailBody");
document.querySelector("[data-close-detail]").addEventListener("click", () => {
  detailOverlay.classList.remove("visible");
});

// View toggle
btnMap.addEventListener("click", () => setView("map"));
btnList.addEventListener("click", () => setView("list"));

function setView(mode) {
  if (mode === "map") {
    elMap.classList.remove("hidden");
    elList.classList.add("hidden");
    btnMap.classList.add("active");
    btnList.classList.remove("active");
  } else {
    elList.classList.remove("hidden");
    elMap.classList.add("hidden");
    btnList.classList.add("active");
    btnMap.classList.remove("active");
  }
}

// Leaflet map init
const southWest = [36.968086, -89.218329];
const northEast = [37.026953, -89.126957];
const bounds = L.latLngBounds(southWest, northEast);

const map = L.map("map", { zoomControl: true, attributionControl: true });
map.fitBounds(bounds);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors'
}).addTo(map);

// Keep data cache for reuse
const placeFeatureById = new Map();

// Fetch pins + list
fetch(`${API_BASE}/places.geojson`)
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  })
  .then(geo => {
    renderMarkers(geo);
    renderList(geo);
  })
  .catch(err => {
    console.error("Failed to fetch places:", err);
    alert("Could not load places. Check API_BASE and CORS settings.");
  });

// Render markers as red circle dots
function renderMarkers(geojson) {
  (geojson.features || []).forEach(f => {
    placeFeatureById.set(f.id, f);
    const [lng, lat] = f.geometry.coordinates;
    const marker = L.circleMarker([lat, lng], {
      radius: 7, color: "#b10f2e", fillColor: "#b10f2e", fillOpacity: 0.9, weight: 1.2
    }).addTo(map);

    const tooltipHtml = `<strong>${escapeHtml(f.properties.name)}</strong><br/>${escapeHtml(f.properties.brief || "")}`;
    marker.bindTooltip(tooltipHtml, { direction: "top", offset: [0, -6] });

    marker.on("click", () => openPlaceModal(f.id));
  });
}

function renderList(geojson) {
  elPlacesList.innerHTML = "";
  (geojson.features || []).forEach(f => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="place-name">${escapeHtml(f.properties.name)}</div>
      <div class="place-brief">${escapeHtml(f.properties.brief || "")}</div>
    `;
    li.addEventListener("click", () => openPlaceModal(f.id));
    elPlacesList.appendChild(li);
  });
}

// Fetch & open place modal
let currentPhotos = [];
let currentPhotoIdx = 0;

function openPlaceModal(placeId) {
  fetch(`${API_BASE}/places/${placeId}/details/`)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => {
      // Title & meta
      placeTitle.textContent = data.name || "Historic Place";
      const dates = [
        data.date_start ? `Start: ${data.date_start}` : null,
        data.date_end ? `End: ${data.date_end}` : null
      ].filter(Boolean).join(" · ");
      placeMeta.textContent = dates;

      // History
      placeHistory.textContent = data.history || "";

      // Photos
      currentPhotos = (data.photos || []).filter(p => !!p.url);
      currentPhotoIdx = 0;
      if (currentPhotos.length > 0) {
        gallery.style.display = "block";
        showPhoto(currentPhotoIdx);
      } else {
        gallery.style.display = "none";
      }

      // Events
      placeEvents.innerHTML = "";
      (data.events || []).forEach(ev => {
        const li = document.createElement("li");
        const date = ev.event_date || "";
        li.textContent = `${ev.event_name}${date ? " (" + date + ")" : ""}`;
        li.addEventListener("click", () => openEventModal(ev.id));
        placeEvents.appendChild(li);
      });

      // Persons
      placePersons.innerHTML = "";
      (data.persons || []).forEach(pe => {
        const li = document.createElement("li");
        li.textContent = `${pe.last_name}, ${pe.first_name}`;
        li.addEventListener("click", () => openPersonModal(pe.id));
        placePersons.appendChild(li);
      });

      placeOverlay.classList.add("visible");
    })
    .catch(err => {
      console.error("Failed to fetch place details:", err);
      alert("Could not load place details.");
    });
}

function showPhoto(idx) {
  const p = currentPhotos[idx];
  if (!p) return;
  galleryImg.src = p.url;
  photoCaption.textContent = p.caption || "";
  photoCounter.textContent = `${idx + 1} / ${currentPhotos.length}`;
}
prevPhoto.addEventListener("click", () => {
  if (!currentPhotos.length) return;
  currentPhotoIdx = (currentPhotoIdx - 1 + currentPhotos.length) % currentPhotos.length;
  showPhoto(currentPhotoIdx);
});
nextPhoto.addEventListener("click", () => {
  if (!currentPhotos.length) return;
  currentPhotoIdx = (currentPhotoIdx + 1) % currentPhotos.length;
  showPhoto(currentPhotoIdx);
});

// Nested modals
function openEventModal(eventId) {
  fetch(`${API_BASE}/events/${eventId}/details/`)
    .then(r => r.json())
    .then(ev => {
      detailTitle.textContent = ev.name || "Event";
      const parts = [];
      if (ev.date) parts.push(`Date: ${ev.date}`);
      if (ev.significance) parts.push(`Significance: ${ev.significance}`);
      if (ev.place && ev.place.name) parts.push(`Place: ${ev.place.name}`);
      const head = parts.join(" · ");

      const photos = (ev.photos || []).filter(p => p.url);
      const photoHtml = photos.length
        ? `<div class="gallery mt" style="display:block">
             <img src="${photos[0].url}" alt="">
             <div class="caption">${escapeHtml(photos[0].caption || "")}</div>
           </div>`
        : "";

      const peopleHtml = (ev.persons || []).map(pe =>
        `<li data-person-id="${pe.id}">${escapeHtml(pe.last_name)}, ${escapeHtml(pe.first_name)}</li>`
      ).join("");

      detailBody.innerHTML = `
        <div class="meta">${escapeHtml(head)}</div>
        <div class="mt">${escapeHtml(ev.description || "")}</div>
        ${photoHtml}
        <div class="mt">
          <h3>People</h3>
          <ul class="link-list" id="detailPeople">${peopleHtml || "<li>None</li>"}</ul>
        </div>
      `;

      // Attach click handlers for people in this event
      const ul = document.getElementById("detailPeople");
      if (ul) ul.querySelectorAll("li[data-person-id]").forEach(li => {
        li.addEventListener("click", () => openPersonModal(li.getAttribute("data-person-id")));
      });

      detailOverlay.classList.add("visible");
    })
    .catch(() => alert("Could not load event details."));
}

function openPersonModal(personId) {
  fetch(`${API_BASE}/persons/${personId}/details/`)
    .then(r => r.json())
    .then(pe => {
      detailTitle.textContent = `${pe.last_name}, ${pe.first_name}`;
      const head = pe.dob ? `Born: ${pe.dob}` : "";

      const photo = pe.profile_photo_url
        ? `<div class="gallery mt" style="display:block">
             <img src="${pe.profile_photo_url}" alt="">
           </div>`
        : "";

      const evHtml = (pe.events || []).map(ev =>
        `<li data-event-id="${ev.id}">${escapeHtml(ev.event_name)} (${ev.event_date || ""}) – ${escapeHtml(ev["place__place_name"] || "")}</li>`
      ).join("");

      const plHtml = (pe.places || []).map(pl =>
        `<li>${escapeHtml(pl.place_name)}</li>`
      ).join("");

      detailBody.innerHTML = `
        <div class="meta">${escapeHtml(head)}</div>
        ${photo}
        <div class="mt">
          <h3>Events</h3>
          <ul class="link-list" id="personEvents">${evHtml || "<li>None</li>"}</ul>
        </div>
        <div class="mt">
          <h3>Places</h3>
          <ul class="link-list">${plHtml || "<li>None</li>"}</ul>
        </div>
      `;

      // Attach click handlers for events listed under person
      const ul = document.getElementById("personEvents");
      if (ul) ul.querySelectorAll("li[data-event-id]").forEach(li => {
        li.addEventListener("click", () => openEventModal(li.getAttribute("data-event-id")));
      });

      detailOverlay.classList.add("visible");
    })
    .catch(() => alert("Could not load person details."));
}

// Small utilities
function escapeHtml(s) {
  return (s ?? "").toString().replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[c]);
}