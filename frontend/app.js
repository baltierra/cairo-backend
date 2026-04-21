// Config
const API_BASE = window.API_BASE || `${window.location.origin}/api/v1`;
// console.log("API_BASE is:", API_BASE);

// Cache for interviews
let interviewsCache = [];

// Elements
const elMap = document.getElementById("map");
const elList = document.getElementById("list");
const elPlacesList = document.getElementById("placesList");
const btnMap = document.getElementById("btnMap");
const btnList = document.getElementById("btnList");

const btnOral = document.getElementById("btnOral");
const oralOverlay = document.getElementById("oralOverlay");
const oralSelect = document.getElementById("oralSelect");
const oralVideoContainer = document.getElementById("oralVideoContainer");

const btnFeedback = document.getElementById("btnFeedback");
const feedbackOverlay = document.getElementById("feedbackOverlay");
const feedbackForm = document.getElementById("feedbackForm");
const feedbackStatus = document.getElementById("feedbackStatus");


// Intro modal
const introOverlay = document.getElementById("introOverlay");
document.querySelectorAll("[data-close-intro]").forEach((b) => {
  b.addEventListener("click", () => {
    introOverlay.classList.remove("visible");
    startTourIfNeeded();
  });
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

// ---------- Guided tour state ----------
// Steps: Map/List, Oral Archive, Feedback
const tourSteps = [
  {
    id: "btnMap",  // Tooltip anchor stays the same
    highlightBoth: true,   // NEW FIELD
    title: "Map & List views",
    body:
      "Use these buttons to switch between the interactive map and a list of all historic places.",
  },
  {
    id: "btnOral",
    title: "Oral Archive",
    body:
      "Here you can listen to recorded interviews that document Cairo's African American history.",
  },
  {
    id: "btnFeedback",
    title: "Feedback",
    body:
      "Found an error or want to suggest a new place? Use this button to send us a message.",
  },
];

let currentTourStep = 0;
let tourTooltip = null;

// Create tooltip element once
function createTourTooltip() {
  if (tourTooltip) return;

  const div = document.createElement("div");
  div.className = "tour-tooltip";
  div.innerHTML = `
    <div class="tour-tooltip-title"></div>
    <div class="tour-tooltip-body"></div>
    <div class="tour-tooltip-footer">
      <span class="tour-tooltip-step"></span>
      <div class="tour-tooltip-buttons">
        <button type="button" class="btn btn-sm" data-tour-skip>Skip</button>
        <button type="button" class="btn primary btn-sm" data-tour-next>Next</button>
      </div>
    </div>
  `;
  document.body.appendChild(div);
  tourTooltip = div;

  const skipBtn = div.querySelector("[data-tour-skip]");
  const nextBtn = div.querySelector("[data-tour-next]");

  skipBtn.addEventListener("click", endTour);
  nextBtn.addEventListener("click", () => {
    const isLast = currentTourStep === tourSteps.length - 1;
    if (isLast) {
      endTour();
    } else {
      showTourStep(currentTourStep + 1);
    }
  });
}

function showTourStep(index) {
  const step = tourSteps[index];
  if (!step) {
    endTour();
    return;
  }

  const target = document.getElementById(step.id);
  if (!target) {
    // If this button doesn't exist, skip to next or end
    if (index + 1 < tourSteps.length) {
      showTourStep(index + 1);
    } else {
      endTour();
    }
    return;
  }

  currentTourStep = index;

  createTourTooltip();
  const tt = tourTooltip;

  // Set text
  tt.querySelector(".tour-tooltip-title").textContent = step.title;
  tt.querySelector(".tour-tooltip-body").textContent = step.body;
  tt.querySelector(
    ".tour-tooltip-step"
  ).textContent = `Step ${index + 1} of ${tourSteps.length}`;

  const nextBtn = tt.querySelector("[data-tour-next]");
  nextBtn.textContent = index === tourSteps.length - 1 ? "Finish" : "Next";

  // Position tooltip near the target button (below, centered)
  const rect = target.getBoundingClientRect();

  // temporarily make visible to measure width if needed
  tt.style.visibility = "hidden";
  tt.style.display = "block";

  const tooltipWidth = tt.offsetWidth;
  let top = rect.bottom + 8;
  let left = rect.left + rect.width / 2 - tooltipWidth / 2;

  // Clamp to viewport
  const margin = 8;
  if (left < margin) left = margin;
  const maxLeft = window.innerWidth - tooltipWidth - margin;
  if (left > maxLeft) left = maxLeft;

  tt.style.top = `${top}px`;
  tt.style.left = `${left}px`;

  tt.style.visibility = "visible";

  // Highlight target button(s)
  document.querySelectorAll(".tour-highlight, .tour-dual-highlight")
    .forEach((el) => el.classList.remove("tour-highlight", "tour-dual-highlight"));

  if (step.highlightBoth) {
    // Step 1: highlight both Map + List
    btnMap.classList.add("tour-dual-highlight");
    btnList.classList.add("tour-dual-highlight");
  } else {
    // All other steps: regular single highlight
    target.classList.add("tour-highlight");
  }
}

function endTour() {
  if (tourTooltip && tourTooltip.parentNode) {
    tourTooltip.parentNode.removeChild(tourTooltip);
    tourTooltip = null;
  }
  document
    .querySelectorAll(".tour-highlight")
    .forEach((el) => el.classList.remove("tour-highlight"));

  // Remember that the tour was seen
  try {
    window.localStorage.setItem("cairoTourSeen", "1");
  } catch (e) {
    // ignore
  }
}

function startTourIfNeeded() {
  try {
    const seen = window.localStorage.getItem("cairoTourSeen");
    if (seen === "1") return;
  } catch (e) {
    // ignore storage errors and still run tour
  }

  showTourStep(0);
}
// ---------- Guided tour state ----------

// View toggle
btnMap.addEventListener("click", () => setView("map"));
btnList.addEventListener("click", () => setView("list"));

// Open Oral Archive modal
if (btnOral && oralOverlay) {
  btnOral.addEventListener("click", async () => {
    oralOverlay.classList.add("visible");
    await loadInterviews();
  });
}

// Close Oral Archive modal
document.querySelectorAll("[data-close-oral]").forEach((btn) => {
  btn.addEventListener("click", () => {
    oralOverlay.classList.remove("visible");
    if (oralVideoContainer) oralVideoContainer.innerHTML = "";
    if (oralSelect) oralSelect.value = "";
  });
});

// Open Feedback modal
if (btnFeedback && feedbackOverlay) {
  btnFeedback.addEventListener("click", () => {
    if (feedbackForm) feedbackForm.reset();
    if (feedbackStatus) {
      feedbackStatus.textContent = "";
      feedbackStatus.className = "feedback-status";
    }
    feedbackOverlay.classList.add("visible");
  });
}

// Close Feedback modal
document.querySelectorAll("[data-close-feedback]").forEach((btn) => {
  btn.addEventListener("click", () => {
    feedbackOverlay.classList.remove("visible");
  });
});

// When an interviewee is selected, show their video
if (oralSelect) {
  oralSelect.addEventListener("change", () => {
    const selectedId = oralSelect.value;
    const interview = interviewsCache.find(
      (iv) => String(iv.id) === selectedId
    );
    renderOralVideo(interview);
  });
}

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
// Start with a reasonable default center/zoom (used only as a fallback)
const map = L.map("map", { zoomControl: false, attributionControl: true })
  .setView([37.0, -89.18], 14);

L.control.zoom({ position: "bottomleft" }).addTo(map);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
  referrerPolicy: "strict-origin-when-cross-origin"
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
  // bounds that will grow to include each marker
  const dataBounds = L.latLngBounds();

  (geojson.features || []).forEach(f => {
    placeFeatureById.set(f.id, f);
    const [lng, lat] = f.geometry.coordinates;

    // Extend bounds with this point
    dataBounds.extend([lat, lng]);

    const marker = L.circleMarker([lat, lng], {
      radius: 7,
      color: "#b10f2e",
      fillColor: "#b10f2e",
      fillOpacity: 0.9,
      weight: 1.2
    }).addTo(map);

    const tooltipHtml =
      `<strong>${escapeHtml(f.properties.name)}</strong><br/>` +
      `${escapeHtml(f.properties.brief || "")}`;
    marker.bindTooltip(tooltipHtml, { direction: "top", offset: [0, -6] });

    marker.on("click", () => openPlaceModal(f.id));
  });

  // After adding all markers, zoom to fit them nicely
  if (dataBounds.isValid()) {
    map.fitBounds(dataBounds, {
      padding: [40, 40],   // pixels of padding around the edges
      maxZoom: 17          // don't zoom *too* far in
    });
  }
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
      // placeHistory.textContent = data.history || "";
      placeHistory.innerHTML = formatRichText(data.history || "");

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

      // Show/hide Events / People sections based on content
      const eventsCol = placeEvents.closest(".col");
      const personsCol = placePersons.closest(".col");

      if (eventsCol) {
        eventsCol.style.display =
          placeEvents.children.length > 0 ? "block" : "none";
      }

      if (personsCol) {
        personsCol.style.display =
          placePersons.children.length > 0 ? "block" : "none";
      }

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

function makeYoutubeEmbed(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch (e) {
    console.warn("Invalid YouTube URL:", url);
  }
  return null;
}

async function loadInterviews() {
  // Only fetch once per page load
  if (interviewsCache.length > 0) return;

  try {
    const url = `${API_BASE}/interviews/`;
    console.log("Fetching interviews from:", url);

    const resp = await fetch(url);

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.error("Interviews HTTP error:", resp.status, text);
      throw new Error(`Failed with status ${resp.status}`);
    }

    const raw = await resp.json();
    console.log("Raw interviews JSON:", raw);

    // ✅ Handle:
    //  - paginated: { count, next, previous, results: [...] }
    //  - plain array: [ ... ]
    const items = Array.isArray(raw) ? raw : raw.results || [];

    if (!Array.isArray(items)) {
      console.error("Interviews JSON not an array:", items);
      throw new Error("Interviews payload is not an array");
    }

    interviewsCache = items;
    console.log("Interviews cache:", interviewsCache);

    populateOralSelect();
  } catch (err) {
    console.error("Failed to load interviews", err);
    alert("Could not load interviews. Please try again later.");
  }
}

function populateOralSelect() {
  if (!oralSelect) return;

  // Reset dropdown
  oralSelect.innerHTML =
    '<option value="">-- Choose an interviewee --</option>';

  // ✅ interviewsCache is guaranteed to be an array here
  const sorted = interviewsCache.slice().sort((a, b) =>
    (a.interviewee_name || "").localeCompare(b.interviewee_name || "")
  );

  for (const iv of sorted) {
    const opt = document.createElement("option");
    opt.value = String(iv.id);
    opt.textContent = iv.interviewee_name || `(Interview ${iv.id})`;
    oralSelect.appendChild(opt);
  }
}

function renderOralVideo(interview) {
  if (!oralVideoContainer) return;
  oralVideoContainer.innerHTML = "";

  if (!interview || !interview.youtube_url) {
    return;
  }

  const embedUrl = makeYoutubeEmbed(interview.youtube_url);
  if (!embedUrl) {
    const msg = document.createElement("p");
    msg.textContent = "This interview does not have a valid YouTube link.";
    oralVideoContainer.appendChild(msg);
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "oral-video-inner";

  const iframe = document.createElement("iframe");
  iframe.src = embedUrl;
  iframe.title = `Interview with ${interview.interviewee_name || "interviewee"}`;
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  wrapper.appendChild(iframe);
  oralVideoContainer.appendChild(wrapper);
}

// Feedback form -> POST to API /feedback/
if (feedbackForm) {
  feedbackForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(feedbackForm);
    const name = (formData.get("name") || "").toString().trim();
    const email = (formData.get("email") || "").toString().trim();
    const message = (formData.get("message") || "").toString().trim();

    if (!message) {
      if (feedbackStatus) {
        feedbackStatus.textContent = "Please enter a message before sending.";
        feedbackStatus.className = "feedback-status error";
      }
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/feedback/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, message }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        const detail = data.detail || `Error ${resp.status}`;
        throw new Error(detail);
      }

      if (feedbackStatus) {
        feedbackStatus.textContent = "Thanks for your contribution!";
        feedbackStatus.className = "feedback-status ok";
      }

      // Optional: clear message field after success
      feedbackForm.reset();

    } catch (err) {
      console.error("Feedback error:", err);
      if (feedbackStatus) {
        feedbackStatus.textContent =
          "Sorry, we could not send your message. Please try again later.";
        feedbackStatus.className = "feedback-status error";
      }
    }
  });
}

// Small utilities
function escapeHtml(s) {
  return (s ?? "").toString().replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[c]);
}

// If intro is not visible on load, we can start the tour immediately
if (!introOverlay || !introOverlay.classList.contains("visible")) {
  startTourIfNeeded();
}

/**
 * Turn simple plain text into basic HTML:
 * - blank lines => paragraph breaks
 * - lines starting with "- " or "• " => bullet list
 * - lines starting with "# " or "## " => headings
 */
function formatRichText(raw) {
  const text = (raw ?? "").toString();
  if (!text.trim()) return "";

  const escaped = escapeHtml(text);
  const lines = escaped.split(/\r?\n/);

  const out = [];
  let listItems = [];

  const flushList = () => {
    if (!listItems.length) return;
    out.push("<ul>");
    listItems.forEach((item) => out.push(`<li>${item}</li>`));
    out.push("</ul>");
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Blank line => paragraph break
    if (!trimmed) {
      flushList();
      continue;
    }

    // Bullets: "- something" or "• something"
    if (/^[-•]\s+/.test(trimmed)) {
      const item = trimmed.replace(/^[-•]\s+/, "");
      listItems.push(item);
      continue;
    }

    // Headings: "# Title" or "## Subtitle"
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const tag = level === 1 ? "h3" : "h4";
      out.push(`<${tag}>${content}</${tag}>`);
      continue;
    }

    // Normal paragraph
    flushList();
    out.push(`<p>${trimmed}</p>`);
  }

  flushList();
  return out.join("\n");
}
