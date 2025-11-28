-- CreateTable
CREATE TABLE "SalesHistory" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "costBasis" DOUBLE PRECISION NOT NULL,
    "salePricePerUnit" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalSalePrice" DOUBLE PRECISION NOT NULL,
    "grossProfit" DOUBLE PRECISION NOT NULL,
    "profitMargin" DOUBLE PRECISION NOT NULL,
    "conditionMedia" VARCHAR(50) NOT NULL,
    "conditionSleeve" VARCHAR(50) NOT NULL,
    "discogsPrice" DOUBLE PRECISION,
    "ebayPrice" DOUBLE PRECISION,
    "channel" VARCHAR(50) NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesHistory_releaseId_idx" ON "SalesHistory"("releaseId");

-- CreateIndex
CREATE INDEX "SalesHistory_lotId_idx" ON "SalesHistory"("lotId");

-- CreateIndex
CREATE INDEX "SalesHistory_soldAt_idx" ON "SalesHistory"("soldAt");

-- CreateIndex
CREATE INDEX "SalesHistory_channel_idx" ON "SalesHistory"("channel");

-- CreateIndex
CREATE INDEX "SalesHistory_profitMargin_idx" ON "SalesHistory"("profitMargin");

-- AddForeignKey
ALTER TABLE "SalesHistory" ADD CONSTRAINT "SalesHistory_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesHistory" ADD CONSTRAINT "SalesHistory_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;
