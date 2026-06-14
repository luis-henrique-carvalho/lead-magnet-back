-- DropForeignKey
ALTER TABLE "marketplace_product_search_result" DROP CONSTRAINT "marketplace_product_search_result_productId_fkey";

-- AlterTable
ALTER TABLE "marketplace_product_search_result" ALTER COLUMN "legacySearchId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "marketplace_product_search_result" ADD CONSTRAINT "marketplace_product_search_result_productId_fkey" FOREIGN KEY ("productId") REFERENCES "marketplace_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
