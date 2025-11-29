-- CreateTable for policy condition discounts
CREATE TABLE "PolicyConditionDiscount" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "conditionTierId" TEXT NOT NULL,
    "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyConditionDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PolicyConditionDiscount_policyId_conditionTierId_key" ON "PolicyConditionDiscount"("policyId", "conditionTierId");

-- CreateIndex
CREATE INDEX "PolicyConditionDiscount_policyId_idx" ON "PolicyConditionDiscount"("policyId");

-- CreateIndex
CREATE INDEX "PolicyConditionDiscount_conditionTierId_idx" ON "PolicyConditionDiscount"("conditionTierId");

-- AddForeignKey
ALTER TABLE "PolicyConditionDiscount" ADD CONSTRAINT "PolicyConditionDiscount_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PricingPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyConditionDiscount" ADD CONSTRAINT "PolicyConditionDiscount_conditionTierId_fkey" FOREIGN KEY ("conditionTierId") REFERENCES "ConditionTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default discounts (0% discount) for Test policy for all condition tiers
INSERT INTO "PolicyConditionDiscount" (id, "policyId", "conditionTierId", "discountPercentage", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  p.id,
  ct.id,
  0,
  NOW(),
  NOW()
FROM "PricingPolicy" p, "ConditionTier" ct
WHERE p.name = 'Test';
