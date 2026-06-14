-- Preserve the old free-form identifier before introducing the relational search key.
ALTER TABLE "marketplace_product_search_result"
RENAME COLUMN "searchId" TO "legacySearchId";

DROP INDEX "marketplace_product_search_result_searchId_idx";
DROP INDEX "marketplace_product_search_result_searchId_productId_key";

-- CreateTable
CREATE TABLE "automation_task_attempt" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "AutomationTaskStatus" NOT NULL DEFAULT 'processing',
    "error" TEXT,
    "errorType" "AutomationErrorType",
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "automation_task_attempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "automation_task_dependency" (
    "id" TEXT NOT NULL,
    "predecessorId" TEXT NOT NULL,
    "successorId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "automation_task_dependency_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "automation_task_dependency_not_self" CHECK ("predecessorId" <> "successorId")
);

CREATE TABLE "marketplace_product_search" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "marketplace" TEXT NOT NULL,
    "query" TEXT,
    "category" TEXT,
    "requestedLimit" INTEGER NOT NULL,
    "foundCount" INTEGER NOT NULL DEFAULT 0,
    "savedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "marketplace_product_search_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "marketplace_product_search_result" ADD COLUMN "searchId" TEXT;

CREATE TABLE "affiliate_link_capture_result" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "productId" TEXT,
    "marketplace" TEXT NOT NULL,
    "originalProductUrl" TEXT NOT NULL,
    "capturedAffiliateUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "affiliate_link_capture_result_pkey" PRIMARY KEY ("id")
);

-- Backfill only when the task result contains the exact legacy search identifier.
INSERT INTO "marketplace_product_search" (
    "id", "taskId", "marketplace", "requestedLimit", "foundCount", "savedCount", "createdAt", "completedAt"
)
SELECT
    task."result"->>'searchId',
    task."id",
    COALESCE(task."marketplace", 'unknown'),
    CASE WHEN task."result"->>'requestedCount' ~ '^\d+$' THEN (task."result"->>'requestedCount')::INTEGER ELSE 0 END,
    CASE WHEN task."result"->>'foundCount' ~ '^\d+$' THEN (task."result"->>'foundCount')::INTEGER ELSE 0 END,
    CASE WHEN task."result"->>'savedCount' ~ '^\d+$' THEN (task."result"->>'savedCount')::INTEGER ELSE 0 END,
    task."createdAt",
    task."finishedAt"
FROM "automation_task" task
WHERE task."type" = 'marketplace_product_search'
  AND task."result" IS NOT NULL
  AND task."result"->>'searchId' IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE "marketplace_product_search_result" result
SET "searchId" = result."legacySearchId"
WHERE EXISTS (
    SELECT 1 FROM "marketplace_product_search" search
    WHERE search."id" = result."legacySearchId"
);

INSERT INTO "affiliate_link_capture_result" (
    "id", "taskId", "sourceProductId", "productId", "marketplace",
    "originalProductUrl", "capturedAffiliateUrl", "createdAt"
)
SELECT
    task."id",
    task."id",
    task."result"->>'productId',
    product."id",
    COALESCE(task."result"->>'marketplace', task."marketplace", 'unknown'),
    task."result"->>'originalProductUrl',
    task."result"->>'capturedAffiliateUrl',
    COALESCE(task."finishedAt", task."createdAt")
FROM "automation_task" task
LEFT JOIN "marketplace_product" product
  ON product."id" = task."result"->>'productId'
WHERE task."type" = 'affiliate_link_capture'
  AND task."result"->>'productId' IS NOT NULL
  AND task."result"->>'originalProductUrl' IS NOT NULL
  AND task."result"->>'capturedAffiliateUrl' IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "automation_task_attempt_taskId_number_key" ON "automation_task_attempt"("taskId", "number");
CREATE INDEX "automation_task_attempt_taskId_startedAt_idx" ON "automation_task_attempt"("taskId", "startedAt");
CREATE INDEX "automation_task_attempt_jobId_idx" ON "automation_task_attempt"("jobId");
CREATE UNIQUE INDEX "automation_task_dependency_predecessorId_successorId_key" ON "automation_task_dependency"("predecessorId", "successorId");
CREATE INDEX "automation_task_dependency_successorId_idx" ON "automation_task_dependency"("successorId");
CREATE UNIQUE INDEX "marketplace_product_search_taskId_key" ON "marketplace_product_search"("taskId");
CREATE INDEX "marketplace_product_search_marketplace_createdAt_idx" ON "marketplace_product_search"("marketplace", "createdAt");
CREATE INDEX "marketplace_product_search_result_searchId_idx" ON "marketplace_product_search_result"("searchId");
CREATE UNIQUE INDEX "marketplace_product_search_result_searchId_productId_key" ON "marketplace_product_search_result"("searchId", "productId");
CREATE UNIQUE INDEX "affiliate_link_capture_result_taskId_key" ON "affiliate_link_capture_result"("taskId");
CREATE INDEX "affiliate_link_capture_result_productId_idx" ON "affiliate_link_capture_result"("productId");

ALTER TABLE "automation_task_attempt" ADD CONSTRAINT "automation_task_attempt_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "automation_task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "automation_task_dependency" ADD CONSTRAINT "automation_task_dependency_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "automation_task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "automation_task_dependency" ADD CONSTRAINT "automation_task_dependency_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "automation_task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketplace_product_search" ADD CONSTRAINT "marketplace_product_search_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "automation_task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "marketplace_product_search_result" ADD CONSTRAINT "marketplace_product_search_result_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "marketplace_product_search"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_link_capture_result" ADD CONSTRAINT "affiliate_link_capture_result_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "automation_task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "affiliate_link_capture_result" ADD CONSTRAINT "affiliate_link_capture_result_productId_fkey" FOREIGN KEY ("productId") REFERENCES "marketplace_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
