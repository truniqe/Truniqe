// ============================================================
// js/supabase.js — Supabase Client + All Database Helpers
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// ---- Client singleton ----
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// PROPERTIES
// ============================================================

/**
 * Fetch live properties with optional filters
 * @param {object} opts
 * @param {string[]} opts.tags - angle tag filter (any match)
 * @param {string}   opts.destination - text search on location/name
 * @param {string}   opts.sortBy - 'price_asc' | 'price_desc' | 'newest'
 * @param {number}   opts.limit
 * @param {number}   opts.offset
 */
export async function fetchProperties({ tags = [], destination = '', sortBy = 'newest', limit = 12, offset = 0 } = {}) {
  let query = supabase
    .from('properties')
    .select(`
      id, name, tagline, story, location, state,
      angle_tags, amenities, cover_image_url, status,
      room_types(base_price)
    `)
    .eq('status', 'live');

  if (destination) {
    query = query.or(`name.ilike.%${destination}%,location.ilike.%${destination}%,state.ilike.%${destination}%`);
  }

  if (tags.length > 0) {
    query = query.overlaps('angle_tags', tags);
  }

  if (sortBy === 'newest') {
    query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;

  // Attach min price from room_types
  return data.map(p => ({
    ...p,
    min_price: p.room_types?.length
      ? Math.min(...p.room_types.map(r => r.base_price))
      : null,
    room_types: undefined,
  }));
}

/**
 * Fetch a single property by ID with full details
 */
export async function fetchPropertyById(id) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch all live properties (minimal, for featured/admin list)
 */
export async function fetchAllProperties({ includesDraft = false } = {}) {
  let query = supabase
    .from('properties')
    .select('id, name, location, state, cover_image_url, status, angle_tags, created_at')
    .order('created_at', { ascending: false });

  if (!includesDraft) query = query.eq('status', 'live');

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ============================================================
// ROOM TYPES
// ============================================================

/**
 * Fetch room types for a property
 */
export async function fetchRoomTypes(propertyId) {
  const { data, error } = await supabase
    .from('room_types')
    .select('*')
    .eq('property_id', propertyId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

/**
 * Create a room type
 */
export async function createRoomType(roomType) {
  const { data, error } = await supabase
    .from('room_types')
    .insert(roomType)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update a room type
 */
export async function updateRoomType(id, updates) {
  const { data, error } = await supabase
    .from('room_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Delete a room type
 */
export async function deleteRoomType(id) {
  const { error } = await supabase.from('room_types').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// AVAILABILITY
// ============================================================

/**
 * Fetch availability for a room type over a date range
 * Returns a Map of { 'YYYY-MM-DD' => { is_blocked, price_override } }
 */
export async function fetchAvailability(roomTypeId, startDate, endDate) {
  const { data, error } = await supabase
    .from('availability')
    .select('date, is_blocked, price_override')
    .eq('room_type_id', roomTypeId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;

  const map = new Map();
  for (const row of data) {
    map.set(row.date, row);
  }
  return map;
}

/**
 * Fetch all availability for a room type (for admin calendar)
 */
export async function fetchAllAvailability(roomTypeId) {
  const { data, error } = await supabase
    .from('availability')
    .select('date, is_blocked, price_override')
    .eq('room_type_id', roomTypeId);
  if (error) throw error;

  const map = new Map();
  for (const row of data) map.set(row.date, row);
  return map;
}

/**
 * Check if all dates in range are available for a room type
 */
export async function checkAvailability(roomTypeId, checkIn, checkOut) {
  const { data, error } = await supabase.rpc('check_availability', {
    p_room_type_id: roomTypeId,
    p_check_in: checkIn,
    p_check_out: checkOut,
  });
  if (error) throw error;
  return data; // boolean
}

/**
 * Block or unblock a set of dates for a room type (admin)
 */
export async function upsertAvailability(roomTypeId, dates, isBlocked, priceOverride = null) {
  const rows = dates.map(date => ({
    room_type_id: roomTypeId,
    date,
    is_blocked: isBlocked,
    price_override: priceOverride,
  }));

  const { error } = await supabase
    .from('availability')
    .upsert(rows, { onConflict: 'room_type_id,date' });

  if (error) throw error;
}

/**
 * Block dates after a confirmed booking (calls security-definer function)
 */
export async function blockDatesForBooking(roomTypeId, checkIn, checkOut) {
  const { error } = await supabase.rpc('block_dates_for_booking', {
    p_room_type_id: roomTypeId,
    p_check_in: checkIn,
    p_check_out: checkOut,
  });
  if (error) throw error;
}

// ============================================================
// BOOKINGS
// ============================================================

/**
 * Create a booking record
 */
export async function createBooking(booking) {
  const { data, error } = await supabase
    .from('bookings')
    .insert(booking)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update booking status / payment info
 */
export async function updateBooking(id, updates) {
  const { data, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch a single booking with joined property/room info
 */
export async function fetchBookingById(id) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      room_types(
        name, base_price, max_guests,
        properties(name, location, cover_image_url)
      )
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch all bookings for the logged-in guest
 */
export async function fetchGuestBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      room_types(
        name,
        properties(name, location, cover_image_url)
      )
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Fetch all bookings (admin)
 */
export async function fetchAllBookings({ status = null } = {}) {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      room_types(
        name,
        properties(name, location)
      ),
      profiles(name, phone)
    `)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ============================================================
// ADMIN: PROPERTIES CRUD
// ============================================================

/**
 * Create a property
 */
export async function createProperty(property) {
  const { data, error } = await supabase
    .from('properties')
    .insert(property)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update a property
 */
export async function updateProperty(id, updates) {
  const { data, error } = await supabase
    .from('properties')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Delete a property
 */
export async function deleteProperty(id) {
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// STORAGE
// ============================================================

/**
 * Upload an image to Supabase Storage
 * @param {'property-images'|'room-images'} bucket
 * @param {File} file
 * @param {string} path - storage path (e.g. 'property-id/cover.jpg')
 * @returns {string} public URL
 */
export async function uploadImage(bucket, file, path) {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ============================================================
// PROFILES
// ============================================================

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

export async function upsertProfile(profile) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single();
  if (error) throw error;
  return data;
}
