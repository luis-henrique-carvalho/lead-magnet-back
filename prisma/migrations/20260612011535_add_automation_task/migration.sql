-- CreateEnum
CREATE TYPE "AutomationTaskStatus" AS ENUM ('pending', 'processing', 'completed', 'partial', 'failed', 'manual_required');

-- CreateEnum
CREATE TYPE "AutomationTaskType" AS ENUM ('marketplace_product_search', 'fetch_rendered_html', 'affiliate_link_capture', 'content_generation', 'publication');

-- CreateEnum
CREATE TYPE "AutomationErrorType" AS ENUM ('timeout', 'upstream_error', 'validation_error', 'internal_error', 'auth_error', 'throttling', 'session_invalid', 'layout_changed', 'captcha_required', 'manual_required');

-- CreateTable
CREATE TABLE "automation_task" (
    "id" TEXT NOT NULL,
    "type" "AutomationTaskType" NOT NULL,
    "marketplace" TEXT,
    "status" "AutomationTaskStatus" NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "error" TEXT,
    "errorType" "AutomationErrorType",
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_task_status_idx" ON "automation_task"("status");

-- CreateIndex
CREATE INDEX "automation_task_type_idx" ON "automation_task"("type");
