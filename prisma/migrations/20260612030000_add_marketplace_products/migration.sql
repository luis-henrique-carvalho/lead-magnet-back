-- CreateTable
CREATE TABLE "marketplace_product" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "marketplace" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "imageUrl" TEXT,
    "price" DECIMAL(12,2),
    "rating" DOUBLE PRECISION,
    "reviewsCount" INTEGER,
    "salesCount" INTEGER,
    "category" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_product_search_result" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_product_search_result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketplace_product_externalId_idx" ON "marketplace_product"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_product_marketplace_originalUrl_key" ON "marketplace_product"("marketplace", "originalUrl");

-- CreateIndex
CREATE INDEX "marketplace_product_search_result_searchId_idx" ON "marketplace_product_search_result"("searchId");

-- CreateIndex
CREATE INDEX "marketplace_product_search_result_productId_idx" ON "marketplace_product_search_result"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_product_search_result_searchId_productId_key" ON "marketplace_product_search_result"("searchId", "productId");

-- AddForeignKey
ALTER TABLE "marketplace_product_search_result" ADD CONSTRAINT "marketplace_product_search_result_productId_fkey" FOREIGN KEY ("productId") REFERENCES "marketplace_product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
