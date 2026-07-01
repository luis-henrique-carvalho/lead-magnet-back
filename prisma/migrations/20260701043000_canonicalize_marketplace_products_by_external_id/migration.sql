-- Canonicalize products that represent the same marketplace item before
-- enforcing the marketplace + externalId uniqueness rule.
CREATE TEMP TABLE "_marketplace_product_external_id_duplicates" AS
SELECT
  "id" AS "duplicateId",
  FIRST_VALUE("id") OVER (
    PARTITION BY "marketplace", "externalId"
    ORDER BY "createdAt" ASC, "id" ASC
  ) AS "canonicalId"
FROM "marketplace_product"
WHERE "externalId" IS NOT NULL;

DELETE FROM "_marketplace_product_external_id_duplicates"
WHERE "duplicateId" = "canonicalId";

DROP INDEX IF EXISTS "marketplace_product_search_result_searchId_productId_key";

UPDATE "marketplace_product_search_result" AS "result"
SET "productId" = "duplicates"."canonicalId"
FROM "_marketplace_product_external_id_duplicates" AS "duplicates"
WHERE "result"."productId" = "duplicates"."duplicateId";

DELETE FROM "marketplace_product_search_result" AS "result"
USING "marketplace_product_search_result" AS "older"
WHERE
  "result"."searchId" IS NOT NULL
  AND "older"."searchId" = "result"."searchId"
  AND "older"."productId" = "result"."productId"
  AND (
    "older"."discoveredAt" < "result"."discoveredAt"
    OR (
      "older"."discoveredAt" = "result"."discoveredAt"
      AND "older"."id" < "result"."id"
    )
  );

CREATE UNIQUE INDEX "marketplace_product_search_result_searchId_productId_key"
ON "marketplace_product_search_result"("searchId", "productId");

UPDATE "affiliate_link_capture_result" AS "capture"
SET "productId" = "duplicates"."canonicalId"
FROM "_marketplace_product_external_id_duplicates" AS "duplicates"
WHERE "capture"."productId" = "duplicates"."duplicateId";

DELETE FROM "marketplace_product" AS "product"
USING "_marketplace_product_external_id_duplicates" AS "duplicates"
WHERE "product"."id" = "duplicates"."duplicateId";

DROP TABLE "_marketplace_product_external_id_duplicates";

CREATE UNIQUE INDEX "marketplace_product_marketplace_externalId_key"
ON "marketplace_product"("marketplace", "externalId");
