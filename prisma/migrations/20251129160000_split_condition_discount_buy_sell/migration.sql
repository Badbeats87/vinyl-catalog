-- AlterTable - Add new buy/sell discount columns
ALTER TABLE "PolicyConditionDiscount" ADD COLUMN "buyDiscountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "PolicyConditionDiscount" ADD COLUMN "sellDiscountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Migrate data: copy old discountPercentage to buyDiscountPercentage
UPDATE "PolicyConditionDiscount"
SET "buyDiscountPercentage" = "discountPercentage"
WHERE "discountPercentage" IS NOT NULL;

-- Keep sellDiscountPercentage at default 0 (can be adjusted per policy)

-- AlterTable - Drop old column
ALTER TABLE "PolicyConditionDiscount" DROP COLUMN "discountPercentage";
