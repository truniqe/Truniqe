-- ============================================================
-- Truniqe — Admin Dashboard Migration
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================
-- Adds owner_name and owner_phone to properties table
-- Required for WhatsApp booking notification feature

ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_phone TEXT;

-- Optional: Add a comment for documentation
COMMENT ON COLUMN properties.owner_name  IS 'Property owner full name (for WhatsApp notifications)';
COMMENT ON COLUMN properties.owner_phone IS 'Owner WhatsApp number without country code (e.g. 9876543210)';
