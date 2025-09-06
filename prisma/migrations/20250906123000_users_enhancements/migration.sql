-- Users enhancements: optional profile fields, flags, and createdAt index

-- Add optional profile/account fields
ALTER TABLE "User"
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "disabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- Index for listing/sorting users by creation time
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

