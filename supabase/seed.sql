-- ============================================================
-- Truniqe Seed Data
-- Run AFTER schema.sql
-- Creates 4 sample properties with room types
-- ============================================================

-- First, manually set a user as admin via SQL after signing up:
-- UPDATE profiles SET role = 'admin' WHERE id = 'your-user-uuid';

-- ============================================================
-- PROPERTIES
-- ============================================================

INSERT INTO properties (id, name, tagline, story, location, state, lat, lng, angle_tags, amenities, cover_image_url, gallery_urls, status) VALUES

-- 1. Samode Haveli, Jaipur
(
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Samode Haveli',
  'A palace that remembers its Mughal courtyards',
  'Long before Instagram discovered Jaipur, the Samode family quietly maintained one of its most extraordinary havelis. Built in the 18th century as the residence of the Prime Minister of the erstwhile Jaipur state, every corridor whispers courtly intrigue. Hand-painted frescoes stretch ceiling to floor, each panel a miniature universe of hunting scenes, florals, and court life frozen mid-ceremony. The rooftop terrace — our favourite spot for pre-dinner drinks — reveals a city skyline that has changed very little in two centuries. This is not a hotel that pretends to be a palace. It is a palace that happens to take guests.',
  'Jaipur, Rajasthan',
  'Rajasthan',
  26.9124,
  75.7873,
  ARRAY['Design & Heritage'],
  ARRAY['Rooftop terrace','Swimming pool','Ayurvedic spa','Heritage tours','In-house chef','Air conditioning','WiFi','Airport transfers'],
  'https://images.unsplash.com/photo-1600011689032-8b628b8a8747?auto=format&fit=crop&w=1400&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1600011689032-8b628b8a8747?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80'
  ],
  'live'
),

-- 2. Spiti Himalayan Retreat
(
  'a1b2c3d4-0002-0002-0002-000000000002',
  'Spiti Himalayan Retreat',
  'Where the road ends, the real India begins',
  'At 4,270 metres, the air is thin and the silence is absolute. Spiti Valley resists easy access — the mountain passes close seven months a year, and the drive from Manali is not for the faint-hearted. That difficulty is precisely the point. When you arrive here, in a cluster of whitewashed stone rooms belonging to a family who has farmed barley in this valley for four generations, you understand what travel writers mean by ''untouched''. The rooms are spare — thick-walled, low-beamed, warmed by yak-dung stoves — but the views from every window are worth the hardship tenfold: a treeless plateau, a river thin as silver thread, and monasteries that predate Babur. Come in July or August. Leave your agenda at home.',
  'Kaza, Spiti Valley',
  'Himachal Pradesh',
  32.2269,
  78.0718,
  ARRAY['Offbeat Location'],
  ARRAY['Mountain views','Stargazing deck','Local home-cooked meals','Monastery treks','Motorbike hire','Traditional fire pit','Photography guides'],
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1400&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1465056836041-7f43ac27dcb5?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=1200&q=80'
  ],
  'live'
),

-- 3. Shreyas Yoga Retreat, Bangalore
(
  'a1b2c3d4-0003-0003-0003-000000000003',
  'Shreyas Retreat',
  'Silence as a luxury. Stillness as the destination.',
  'Forty-five minutes from Bengaluru''s noise, through a gate flanked by banana palms, Shreyas exists in a different time zone entirely — one measured not in hours but in breath cycles. Founded in 2002 by a family deeply committed to classical yoga, this is not a spa with a yoga mat thrown in. The programmes are designed around genuine yogic practice: pre-dawn meditation, guided asana sessions, Ayurvedic consultations that actually adjust your treatment plan as the week progresses. The cottages are spacious and cool, with private gardens for morning practice. The food — all organic, grown on the property — is medicinal without being punishing. Guests leave lighter, and not just in weight.',
  'Nelamangala, Karnataka',
  'Karnataka',
  13.1000,
  77.3900,
  ARRAY['Experience-Driven'],
  ARRAY['Yoga & meditation','Ayurvedic treatments','Organic farm','Naturopath consultations','Infinity pool','Vegetarian cuisine','No alcohol policy','Digital detox rooms'],
  'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=1400&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1473830394358-91588751b241?auto=format&fit=crop&w=1200&q=80'
  ],
  'live'
),

-- 4. Dune Eco Village, Pondicherry
(
  'a1b2c3d4-0004-0004-0004-000000000004',
  'Dune Eco Village',
  'Where the Coromandel coast meets conscious design',
  'Auroville''s most architecturally thoughtful property sits between a brackish lagoon and the Bay of Bengal, on a strip of land that has no business being this beautiful. The buildings — earthen walls, thatched roofs, recycled tile floors — were designed in partnership with the Auroville Earth Institute and require no air conditioning because they''re built to breathe. Solar-heated showers, rainwater harvesting, a kitchen garden supplying 40% of meals: sustainability here is structural, not performative. The staff are from surrounding villages, trained in-house. Every morning, birders gather at the lagoon edge. Every evening, the sea turns gold. There is a French-Tamil restaurant that will make you forget Paris.',
  'Chunnambar, Pondicherry',
  'Puducherry',
  11.8745,
  79.8370,
  ARRAY['Experience-Driven', 'Offbeat Location'],
  ARRAY['Private beach access','Lagoon kayaking','Cycling trails','Organic restaurant','Solar-powered','Birding tours','Yoga pavilion','Pottery workshop'],
  'https://images.unsplash.com/photo-1499363536502-87642509e31b?auto=format&fit=crop&w=1400&q=80',
  ARRAY[
    'https://images.unsplash.com/photo-1499363536502-87642509e31b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80'
  ],
  'live'
);

-- ============================================================
-- ROOM TYPES
-- ============================================================

-- Samode Haveli rooms
INSERT INTO room_types (id, property_id, name, description, base_price, max_guests, photos, sort_order) VALUES
(
  'r1000001-0001-0001-0001-000000000001',
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Sheesh Mahal Suite',
  'The crown of the haveli — a double-height chamber whose walls and ceiling are encrusted entirely with mirror-glass mosaic. At candlelight, the effect is a private universe of stars. King bed, attached marble bathroom, private courtyard garden.',
  18500,
  2,
  ARRAY['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80'],
  1
),
(
  'r1000001-0001-0001-0001-000000000002',
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Durbar Haveli Room',
  'A classic haveli room with hand-painted frescoes, a carved wooden alcove bed, and views over the main courtyard. The furniture is period Rajput — solid, unadorned, deeply satisfying.',
  9500,
  2,
  ARRAY['https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'],
  2
),
(
  'r1000001-0001-0001-0001-000000000003',
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Garden Pavilion',
  'A standalone garden room set among pomegranate and jasmine, with a private plunge pool. Slightly more contemporary in finishing while remaining true to Rajput aesthetics.',
  24000,
  2,
  ARRAY['https://images.unsplash.com/photo-1615460549969-36fa19521a4f?auto=format&fit=crop&w=800&q=80'],
  3
);

-- Spiti rooms
INSERT INTO room_types (id, property_id, name, description, base_price, max_guests, photos, sort_order) VALUES
(
  'r2000001-0002-0002-0002-000000000001',
  'a1b2c3d4-0002-0002-0002-000000000002',
  'Valley-View Room',
  'A stone-and-mud room with thick walls that hold the warmth through freezing nights. A wide window frames the entire Spiti Valley — 180 degrees of mountain. Locally woven blankets, wooden furniture, shared western-style bathroom.',
  3200,
  2,
  ARRAY['https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=800&q=80'],
  1
),
(
  'r2000001-0002-0002-0002-000000000002',
  'a1b2c3d4-0002-0002-0002-000000000002',
  'Family Homestay Suite',
  'Two adjoining rooms sharing a common room — ideal for families or two-couple groups. The family will cook meals in the same kitchen your room overlooks. That shared warmth is the whole point.',
  5500,
  4,
  ARRAY['https://images.unsplash.com/photo-1578894381163-e72c17f2d45f?auto=format&fit=crop&w=800&q=80'],
  2
);

-- Shreyas rooms
INSERT INTO room_types (id, property_id, name, description, base_price, max_guests, photos, sort_order) VALUES
(
  'r3000001-0003-0003-0003-000000000001',
  'a1b2c3d4-0003-0003-0003-000000000003',
  'Garden Cottage',
  'A private cottage surrounded by bamboo and banana groves with a personal garden for morning practice. King bed, attached bathroom with Ayurvedic-herb-infused bath oils. All treatments included in the programme rate.',
  14000,
  2,
  ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'],
  1
),
(
  'r3000001-0003-0003-0003-000000000002',
  'a1b2c3d4-0003-0003-0003-000000000003',
  'Forest Pool Villa',
  'The retreat''s most secluded option — a two-room villa with a private plunge pool half-hidden by coconut trees. The silence here is remarkable. Book for a minimum of three nights to honour the programme arc.',
  22000,
  2,
  ARRAY['https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80'],
  2
);

-- Dune Eco Village rooms
INSERT INTO room_types (id, property_id, name, description, base_price, max_guests, photos, sort_order) VALUES
(
  'r4000001-0004-0004-0004-000000000001',
  'a1b2c3d4-0004-0004-0004-000000000004',
  'Lagoon Cottage',
  'A thatched earthen cottage facing the lagoon — quiet, breezy, and naturally cool through an ingenious passive ventilation system. The sounds you wake to: birds, the distant sea, nothing else.',
  6800,
  2,
  ARRAY['https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80'],
  1
),
(
  'r4000001-0004-0004-0004-000000000002',
  'a1b2c3d4-0004-0004-0004-000000000004',
  'Beach Bungalow',
  'The closest accommodation to the sea — a standalone bungalow perched on a dune edge, with a private deck overlooking the Bay of Bengal. Sunsets here are the reason you left the city.',
  9500,
  3,
  ARRAY['https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80'],
  2
),
(
  'r4000001-0004-0004-0004-000000000003',
  'a1b2c3d4-0004-0004-0004-000000000004',
  'Family Earthen Villa',
  'A larger earthen villa designed for families — two bedrooms, a common sitting area, and a shaded garden courtyard. Children have space to roam; parents have peace to breathe.',
  12500,
  5,
  ARRAY['https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80'],
  3
);

-- ============================================================
-- NOTE: To make yourself admin after signing up, run:
-- UPDATE profiles SET role = 'admin' WHERE id = 'your-auth-user-uuid';
-- ============================================================
