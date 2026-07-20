-- ============================================================
-- Truniqe Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('guest', 'admin')),
  name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT,
  story TEXT,                          -- Curator's editorial note
  location TEXT NOT NULL,
  state TEXT,
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  angle_tags TEXT[] DEFAULT '{}',      -- ['Design & Heritage','Offbeat Location','Experience-Driven']
  amenities TEXT[] DEFAULT '{}',
  cover_image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Room Types
CREATE TABLE IF NOT EXISTS room_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  max_guests INT NOT NULL DEFAULT 2,
  photos TEXT[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability (one row per room_type per date)
CREATE TABLE IF NOT EXISTS availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_type_id UUID REFERENCES room_types(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  price_override DECIMAL(10,2),          -- NULL means use base_price
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_type_id, date)
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_type_id UUID REFERENCES room_types(id) ON DELETE RESTRICT NOT NULL,
  guest_id UUID REFERENCES auth.users(id) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests_count INT NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  guest_name TEXT,
  guest_phone TEXT,
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_angle_tags ON properties USING GIN(angle_tags);
CREATE INDEX IF NOT EXISTS idx_room_types_property ON room_types(property_id);
CREATE INDEX IF NOT EXISTS idx_availability_room_date ON availability(room_type_id, date);
CREATE INDEX IF NOT EXISTS idx_bookings_guest ON bookings(guest_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings(room_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- --- profiles ---
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id OR is_admin());

-- --- properties ---
-- Public can read live properties
CREATE POLICY "properties_select_public" ON properties
  FOR SELECT USING (status = 'live' OR is_admin());

-- Only admins can insert/update/delete
CREATE POLICY "properties_all_admin" ON properties
  FOR ALL USING (is_admin());

-- --- room_types ---
CREATE POLICY "room_types_select_public" ON room_types
  FOR SELECT USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM properties
      WHERE id = property_id AND status = 'live'
    )
  );

CREATE POLICY "room_types_all_admin" ON room_types
  FOR ALL USING (is_admin());

-- --- availability ---
CREATE POLICY "availability_select_public" ON availability
  FOR SELECT USING (true);

CREATE POLICY "availability_all_admin" ON availability
  FOR ALL USING (is_admin());

-- Guests can also upsert availability when confirming a booking (block dates)
-- This is handled via a security definer function (see below)

-- --- bookings ---
CREATE POLICY "bookings_select_own" ON bookings
  FOR SELECT USING (auth.uid() = guest_id OR is_admin());

CREATE POLICY "bookings_insert_own" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = guest_id);

CREATE POLICY "bookings_update_admin" ON bookings
  FOR UPDATE USING (is_admin());

CREATE POLICY "bookings_delete_admin" ON bookings
  FOR DELETE USING (is_admin());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    'guest'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Security-definer function to block dates after booking
-- Guests call this after successful payment
CREATE OR REPLACE FUNCTION block_dates_for_booking(
  p_room_type_id UUID,
  p_check_in DATE,
  p_check_out DATE
) RETURNS VOID AS $$
DECLARE
  d DATE;
BEGIN
  d := p_check_in;
  WHILE d < p_check_out LOOP
    INSERT INTO availability (room_type_id, date, is_blocked)
    VALUES (p_room_type_id, d, TRUE)
    ON CONFLICT (room_type_id, date)
    DO UPDATE SET is_blocked = TRUE;
    d := d + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if dates are available for a room type
CREATE OR REPLACE FUNCTION check_availability(
  p_room_type_id UUID,
  p_check_in DATE,
  p_check_out DATE
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if any date in range is blocked
  RETURN NOT EXISTS (
    SELECT 1 FROM availability
    WHERE room_type_id = p_room_type_id
      AND date >= p_check_in
      AND date < p_check_out
      AND is_blocked = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these in Supabase Storage tab or via Dashboard:
-- 1. Create bucket: "property-images" (public)
-- 2. Create bucket: "room-images" (public)
-- Policy: authenticated users can upload; public can read

INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('room-images', 'room-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read property-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY "Admins upload property-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'property-images' AND is_admin());

CREATE POLICY "Public read room-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'room-images');

CREATE POLICY "Admins upload room-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'room-images' AND is_admin());
