-- After applying prisma schema changes, run this to backfill admin bridge columns.

UPDATE usage_logs AS ul
SET "publicUserId" = u.id
FROM users AS u
WHERE ul."publicUserId" IS NULL
  AND ul."userId" = u."supabaseId";

UPDATE viral_database AS vd
SET "publicUserId" = u.id
FROM users AS u
WHERE vd."publicUserId" IS NULL
  AND vd."userId" = u."supabaseId";
