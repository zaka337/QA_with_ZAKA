-- The Selenium course was seeded with a leftover slug from the original
-- template's demo data ("cinematography-masterclass"), unrelated to its
-- actual title. Slug isn't used for routing (that's by UUID), but Dashboard's
-- getCourseVisual() matches known slugs to pick a themed thumbnail — this
-- mismatch is why the Selenium course currently shows the generic fallback
-- gradient instead of its intended green Selenium theme.
--
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

UPDATE courses
SET slug = 'selenium-automation'
WHERE slug = 'cinematography-masterclass';

-- Verify:
SELECT id, slug, title FROM courses WHERE title ILIKE '%selenium%';
