-- Restrict the public 'avatars' storage bucket to actual images and a sane size.
-- Currently allowed_mime_types and file_size_limit are both NULL, meaning any
-- file of any size can be uploaded — the client's accept="image/*" hint is not
-- enforced server-side and is trivially bypassed.
--
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  file_size_limit = 5242880 -- 5 MB
WHERE id = 'avatars';

-- Verify it applied:
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'avatars';
