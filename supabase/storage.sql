-- Run in Supabase SQL editor after the project is created.
-- The backend uses the service role key to upload generator previews.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generator-previews',
  'generator-previews',
  true,
  5242880,
  array['image/svg+xml', 'image/png', 'image/jpeg', 'application/json']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

