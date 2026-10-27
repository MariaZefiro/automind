CREATE TABLE "UserAudit" (
  "id" UUID NOT NULL,
  "actorId" UUID,
  "targetUserId" UUID NOT NULL,
  "action" TEXT NOT NULL,
  "changes" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserAudit_targetUserId_createdAt_idx" ON "UserAudit"("targetUserId", "createdAt");
CREATE INDEX "UserAudit_actorId_createdAt_idx" ON "UserAudit"("actorId", "createdAt");

ALTER TABLE "UserAudit" ADD CONSTRAINT "UserAudit_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserAudit" ADD CONSTRAINT "UserAudit_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
