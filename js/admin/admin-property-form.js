// ============================================================
// js/admin/admin-property-form.js — Add/Edit Property Form
// ============================================================

import { initAuth, isLoggedIn, requireAuth, isAdmin, requireAdmin, getProfile, showToast } from '../auth.js';
import {
  fetchPropertyById, createProperty, updateProperty,
  fetchRoomTypes, createRoomType, updateRoomType, deleteRoomType,
  uploadImage,
} from '../supabase.js';
import { ANGLE_TAGS, AMENITY_OPTIONS } from '../config.js';

const params = new URLSearchParams(window.location.search);
const editId = params.get('id'); // null = create mode
let existingRoomTypes = [];
let pendingRoomTypes  = []; // new rooms not yet saved
let coverImageFile    = null;
let galleryFiles      = [];
let existingGallery   = [];
let saving            = false;

async function init() {
  await initAuth();
  if (!isLoggedIn()) { requireAuth(); return; }
  if (!isAdmin()) {
    console.warn('[Truniqe] Not admin. Profile:', JSON.stringify(getProfile?.()));
    return;
  }
  setupSidebarToggle();

  renderTagSelector();
  renderAmenitySelector();
  setupImageUploads();
  setupAddRoomType();
  setupForm();

  if (editId) {
    await loadProperty(editId);
  } else {
    addNewRoomTypeEditor(); // start with one empty room
  }
}

function setupSidebarToggle() {
  const toggle  = document.getElementById('admin-menu-toggle');
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('admin-overlay');
  toggle?.addEventListener('click', () => { sidebar?.classList.toggle('open'); overlay?.classList.toggle('open'); });
  overlay?.addEventListener('click', () => { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); });
}

// ---- Load existing property ----
async function loadProperty(id) {
  document.getElementById('form-title').textContent = 'Edit Property';

  try {
    const [prop, rooms] = await Promise.all([
      fetchPropertyById(id),
      fetchRoomTypes(id),
    ]);

    existingRoomTypes = rooms;

    // Fill in form fields
    setValue('prop-name', prop.name);
    setValue('prop-tagline', prop.tagline);
    setValue('prop-location', prop.location);
    setValue('prop-state', prop.state);
    setValue('prop-lat', prop.lat);
    setValue('prop-lng', prop.lng);
    setValue('prop-story', prop.story);
    setValue('prop-owner-name', prop.owner_name);
    setValue('prop-owner-phone', prop.owner_phone);

    // Tags
    (prop.angle_tags || []).forEach(tag => {
      document.querySelector(`.tag-option[data-value="${tag}"]`)?.classList.add('selected');
    });

    // Amenities
    (prop.amenities || []).forEach(a => {
      document.querySelector(`.amenity-option[data-value="${a}"]`)?.classList.add('selected');
    });

    // Status
    setStatus(prop.status);

    // Gallery preview
    existingGallery = prop.gallery_urls || [];
    if (prop.cover_image_url) showCoverPreview(prop.cover_image_url);
    renderGalleryPreviews();

    // Existing rooms
    rooms.forEach(r => addExistingRoomEditor(r));

  } catch (err) {
    showToast('Error', 'Could not load property: ' + err.message, 'error');
  }
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el && val != null) el.value = val;
}

// ---- Angle tag selector ----
function renderTagSelector() {
  const container = document.getElementById('tag-selector');
  if (!container) return;

  const tagMeta = {
    'Design & Heritage': { cls: 'heritage', icon: '🏛' },
    'Offbeat Location':  { cls: 'offbeat',  icon: '🏔' },
    'Experience-Driven': { cls: 'experience', icon: '✨' },
  };

  container.innerHTML = ANGLE_TAGS.map(tag => {
    const m = tagMeta[tag] || { cls: '', icon: '' };
    return `<div class="tag-option ${m.cls}" data-value="${tag}">${m.icon} ${tag}</div>`;
  }).join('');

  container.querySelectorAll('.tag-option').forEach(el => {
    el.addEventListener('click', () => el.classList.toggle('selected'));
  });
}

// ---- Amenity selector ----
function renderAmenitySelector() {
  const container = document.getElementById('amenity-selector');
  if (!container) return;

  container.innerHTML = AMENITY_OPTIONS.map(a => `
    <div class="amenity-option" data-value="${a}">${a}</div>
  `).join('');

  container.querySelectorAll('.amenity-option').forEach(el => {
    el.addEventListener('click', () => el.classList.toggle('selected'));
  });
}

// ---- Status ----
function setStatus(status) {
  document.querySelectorAll('.status-option').forEach(el => {
    el.classList.toggle('selected', el.dataset.value === status);
  });
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.status-option')) {
    const opt = e.target.closest('.status-option');
    document.querySelectorAll('.status-option').forEach(el => el.classList.remove('selected'));
    opt.classList.add('selected');
  }
});

// ---- Cover image upload ----
function setupImageUploads() {
  const coverZone  = document.getElementById('cover-upload-zone');
  const coverInput = document.getElementById('cover-image-input');
  const galleryZone  = document.getElementById('gallery-upload-zone');
  const galleryInput = document.getElementById('gallery-image-input');

  coverInput?.addEventListener('change', () => {
    if (coverInput.files[0]) {
      coverImageFile = coverInput.files[0];
      showCoverPreview(URL.createObjectURL(coverImageFile));
    }
  });

  galleryInput?.addEventListener('change', () => {
    for (const file of galleryInput.files) {
      galleryFiles.push(file);
    }
    renderGalleryPreviews();
    galleryInput.value = '';
  });

  // Drag and drop for cover
  coverZone?.addEventListener('dragover', (e) => { e.preventDefault(); coverZone.classList.add('drag-over'); });
  coverZone?.addEventListener('dragleave', () => coverZone.classList.remove('drag-over'));
  coverZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    coverZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) {
      coverImageFile = file;
      showCoverPreview(URL.createObjectURL(file));
    }
  });
}

function showCoverPreview(url) {
  const preview = document.getElementById('cover-preview');
  if (!preview) return;
  preview.innerHTML = `
    <div class="upload-preview-item" style="width:100%;max-width:320px">
      <img src="${url}" alt="Cover">
      <button class="upload-preview-remove" onclick="clearCover()">✕</button>
    </div>
  `;
}

window.clearCover = () => {
  coverImageFile = null;
  document.getElementById('cover-preview').innerHTML = '';
};

function renderGalleryPreviews() {
  const container = document.getElementById('gallery-previews');
  if (!container) return;

  const existingHtml = existingGallery.map((url, i) => `
    <div class="upload-preview-item">
      <img src="${url}" alt="Gallery ${i+1}">
      <button class="upload-preview-remove" onclick="removeExistingGallery(${i})">✕</button>
    </div>
  `).join('');

  const newHtml = galleryFiles.map((file, i) => `
    <div class="upload-preview-item">
      <img src="${URL.createObjectURL(file)}" alt="New ${i+1}">
      <button class="upload-preview-remove" onclick="removeNewGallery(${i})">✕</button>
    </div>
  `).join('');

  container.innerHTML = existingHtml + newHtml;
}

window.removeExistingGallery = (i) => {
  existingGallery.splice(i, 1);
  renderGalleryPreviews();
};
window.removeNewGallery = (i) => {
  galleryFiles.splice(i, 1);
  renderGalleryPreviews();
};

// ---- Room Type Editors ----
let roomEditorCount = 0;

function setupAddRoomType() {
  document.getElementById('add-room-btn')?.addEventListener('click', addNewRoomTypeEditor);
}

function addNewRoomTypeEditor(prefill = null) {
  const id = `room-editor-${++roomEditorCount}`;
  const container = document.getElementById('room-editors');
  const div = document.createElement('div');
  div.className = 'room-type-editor';
  div.id = id;

  div.innerHTML = `
    <div class="room-type-editor-header" onclick="toggleRoomEditor('${id}')">
      <span class="room-type-editor-title">${prefill?.name || `Room Type ${roomEditorCount}`}</span>
      <button type="button" onclick="event.stopPropagation();removeRoomEditor('${id}')"
        style="background:none;border:none;color:var(--text-muted);font-size:18px;cursor:pointer">✕</button>
    </div>
    <div class="room-type-editor-body" id="${id}-body">
      <div class="form-group">
        <label class="form-label">Room Name <span class="required">*</span></label>
        <input type="text" class="form-input" name="room-name" placeholder="e.g. Sheesh Mahal Suite"
          value="${prefill?.name || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" name="room-desc" rows="3"
          placeholder="Editorial room description">${prefill?.description || ''}</textarea>
      </div>
      <div class="input-row">
        <div class="form-group">
          <label class="form-label">Base Price (₹/night) <span class="required">*</span></label>
          <input type="number" class="form-input" name="room-price" min="500" step="100"
            value="${prefill?.base_price || ''}" placeholder="5000">
        </div>
        <div class="form-group">
          <label class="form-label">Max Guests <span class="required">*</span></label>
          <input type="number" class="form-input" name="room-max-guests" min="1" max="20"
            value="${prefill?.max_guests || 2}">
        </div>
      </div>
      ${prefill?.id ? `<input type="hidden" name="room-id" value="${prefill.id}">` : ''}
    </div>
  `;

  container.appendChild(div);
}

function addExistingRoomEditor(room) {
  addNewRoomTypeEditor(room);
}

window.toggleRoomEditor = (id) => {
  document.getElementById(`${id}-body`)?.classList.toggle('collapsed');
};

window.removeRoomEditor = (id) => {
  document.getElementById(id)?.remove();
};

// ---- Form submit ----
function setupForm() {
  document.getElementById('property-form')?.addEventListener('submit', handleSubmit);
}

async function handleSubmit(e) {
  e.preventDefault();
  if (saving) return;
  saving = true;

  const saveBtn = document.getElementById('save-btn');
  saveBtn.classList.add('btn-loading');
  saveBtn.disabled = true;

  try {
    // Collect values
    const name     = document.getElementById('prop-name').value.trim();
    const tagline  = document.getElementById('prop-tagline').value.trim();
    const location = document.getElementById('prop-location').value.trim();
    const state    = document.getElementById('prop-state').value.trim();
    const lat      = parseFloat(document.getElementById('prop-lat').value) || null;
    const lng      = parseFloat(document.getElementById('prop-lng').value) || null;
    const story    = document.getElementById('prop-story').value.trim();

    if (!name || !location) throw new Error('Property name and location are required.');

    const angle_tags = Array.from(document.querySelectorAll('.tag-option.selected')).map(el => el.dataset.value);
    const amenities  = Array.from(document.querySelectorAll('.amenity-option.selected')).map(el => el.dataset.value);
    const status     = document.querySelector('.status-option.selected')?.dataset.value || 'draft';

    // Upload images
    let coverUrl = null;
    if (coverImageFile) {
      const path = `${Date.now()}-cover.${coverImageFile.name.split('.').pop()}`;
      coverUrl = await uploadImage('property-images', coverImageFile, path);
    }

    const newGalleryUrls = [];
    for (const file of galleryFiles) {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
      const url = await uploadImage('property-images', file, path);
      newGalleryUrls.push(url);
    }
    const galleryUrls = [...existingGallery, ...newGalleryUrls];

    const propertyData = {
      name, tagline, location, state, lat, lng, story,
      angle_tags, amenities, status,
      owner_name: document.getElementById('prop-owner-name')?.value.trim() || null,
      owner_phone: document.getElementById('prop-owner-phone')?.value.trim() || null,
      ...(coverUrl ? { cover_image_url: coverUrl } : {}),
      gallery_urls: galleryUrls,
    };

    let propertyId = editId;
    if (editId) {
      await updateProperty(editId, propertyData);
    } else {
      const created = await createProperty(propertyData);
      propertyId = created.id;
    }

    // Save room types
    const editors = document.querySelectorAll('.room-type-editor');
    for (const editor of editors) {
      const roomName   = editor.querySelector('[name="room-name"]')?.value.trim();
      const roomDesc   = editor.querySelector('[name="room-desc"]')?.value.trim();
      const roomPrice  = parseFloat(editor.querySelector('[name="room-price"]')?.value);
      const roomGuests = parseInt(editor.querySelector('[name="room-max-guests"]')?.value, 10);
      const roomId     = editor.querySelector('[name="room-id"]')?.value;

      if (!roomName || !roomPrice) continue;

      const roomData = {
        name: roomName,
        description: roomDesc,
        base_price: roomPrice,
        max_guests: roomGuests || 2,
        property_id: propertyId,
      };

      if (roomId) {
        await updateRoomType(roomId, roomData);
      } else {
        await createRoomType(roomData);
      }
    }

    showToast('Saved!', `Property "${name}" has been ${editId ? 'updated' : 'created'}.`);
    setTimeout(() => window.location.href = 'properties.html', 1500);

  } catch (err) {
    showToast('Error', err.message, 'error');
  } finally {
    saveBtn.classList.remove('btn-loading');
    saveBtn.disabled = false;
    saving = false;
  }
}

document.addEventListener('DOMContentLoaded', init);
