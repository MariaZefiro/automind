CREATE TYPE "Role" AS ENUM ('USER', 'REVIEWER', 'ADMIN');
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'AWAITING_REVIEW', 'APPROVED', 'FORWARDED', 'RESOLVED', 'CANCELLED');
CREATE TYPE "RequestCategory" AS ENUM ('ACCESS', 'HARDWARE', 'SOFTWARE', 'INFRASTRUCTURE', 'FINANCE', 'HUMAN_RESOURCES', 'OTHER');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ClassificationSource" AS ENUM ('MANUAL', 'AI');

CREATE TABLE "Department" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "User" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "departmentId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Request" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "authorId" UUID NOT NULL,
  "departmentId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RequestClassification" (
  "id" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "category" "RequestCategory" NOT NULL,
  "priority" "Priority" NOT NULL,
  "suggestedDepartmentId" UUID,
  "summary" TEXT NOT NULL,
  "suggestedAction" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION,
  "source" "ClassificationSource" NOT NULL DEFAULT 'MANUAL',
  "reviewedById" UUID,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestClassification_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RequestHistory" (
  "id" UUID NOT NULL,
  "requestId" UUID NOT NULL,
  "userId" UUID,
  "action" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RequestHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");
CREATE INDEX "Request_authorId_createdAt_idx" ON "Request"("authorId", "createdAt");
CREATE INDEX "Request_status_createdAt_idx" ON "Request"("status", "createdAt");
CREATE INDEX "Request_departmentId_idx" ON "Request"("departmentId");
CREATE INDEX "RequestClassification_requestId_createdAt_idx" ON "RequestClassification"("requestId", "createdAt");
CREATE INDEX "RequestClassification_suggestedDepartmentId_idx" ON "RequestClassification"("suggestedDepartmentId");
CREATE INDEX "RequestHistory_requestId_createdAt_idx" ON "RequestHistory"("requestId", "createdAt");
CREATE INDEX "RequestHistory_userId_createdAt_idx" ON "RequestHistory"("userId", "createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RequestClassification" ADD CONSTRAINT "RequestClassification_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequestClassification" ADD CONSTRAINT "RequestClassification_suggestedDepartmentId_fkey" FOREIGN KEY ("suggestedDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RequestClassification" ADD CONSTRAINT "RequestClassification_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RequestHistory" ADD CONSTRAINT "RequestHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RequestHistory" ADD CONSTRAINT "RequestHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
