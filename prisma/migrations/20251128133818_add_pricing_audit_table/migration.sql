-- CreateTable
CREATE TABLE "Release" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "artist" VARCHAR(255) NOT NULL,
    "label" VARCHAR(255),
    "catalogNumber" VARCHAR(100),
    "barcode" VARCHAR(20),
    "releaseYear" INTEGER,
    "genre" VARCHAR(100),
    "coverArtUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Release_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketSnapshot" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "statLow" DOUBLE PRECISION,
    "statMedian" DOUBLE PRECISION,
    "statHigh" DOUBLE PRECISION,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionTier" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "order" INTEGER NOT NULL,
    "mediaAdjustment" DOUBLE PRECISION NOT NULL,
    "sleeveAdjustment" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConditionTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPolicy" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "scope" VARCHAR(50) NOT NULL,
    "scopeValue" VARCHAR(255),
    "buyMarketSource" VARCHAR(50) NOT NULL DEFAULT 'discogs',
    "buyMarketStat" VARCHAR(50) NOT NULL DEFAULT 'median',
    "buyPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.55,
    "buyMinCap" DOUBLE PRECISION,
    "buyMaxCap" DOUBLE PRECISION,
    "offerExpiryDays" INTEGER NOT NULL DEFAULT 7,
    "sellMarketSource" VARCHAR(50) NOT NULL DEFAULT 'discogs',
    "sellMarketStat" VARCHAR(50) NOT NULL DEFAULT 'median',
    "sellPercentage" DOUBLE PRECISION NOT NULL DEFAULT 1.25,
    "sellMinCap" DOUBLE PRECISION,
    "sellMaxCap" DOUBLE PRECISION,
    "applyConditionAdjustment" BOOLEAN NOT NULL DEFAULT true,
    "mediaWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "sleeveWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "roundingIncrement" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "requiresManualReview" BOOLEAN NOT NULL DEFAULT false,
    "profitMarginTarget" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerSubmission" (
    "id" TEXT NOT NULL,
    "submissionNumber" TEXT NOT NULL,
    "sellerEmail" VARCHAR(255) NOT NULL,
    "sellerPhone" VARCHAR(20),
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending_review',
    "notes" TEXT,
    "photosUrl" TEXT,
    "expectedPayout" DOUBLE PRECISION,
    "actualPayout" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionItem" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sellerConditionMedia" VARCHAR(50) NOT NULL,
    "sellerConditionSleeve" VARCHAR(50) NOT NULL,
    "autoOfferPrice" DOUBLE PRECISION NOT NULL,
    "itemNotes" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "finalConditionMedia" VARCHAR(50),
    "finalConditionSleeve" VARCHAR(50),
    "finalOfferPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLot" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "conditionMedia" VARCHAR(50) NOT NULL,
    "conditionSleeve" VARCHAR(50) NOT NULL,
    "costBasis" DOUBLE PRECISION NOT NULL,
    "listPrice" DOUBLE PRECISION NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "availableQuantity" INTEGER NOT NULL DEFAULT 1,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingCalculationAudit" (
    "id" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "marketSnapshotId" TEXT,
    "calculationType" VARCHAR(50) NOT NULL,
    "conditionMedia" VARCHAR(50) NOT NULL,
    "conditionSleeve" VARCHAR(50) NOT NULL,
    "marketPrice" DOUBLE PRECISION,
    "calculatedPrice" DOUBLE PRECISION NOT NULL,
    "calculationDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingCalculationAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Release_barcode_idx" ON "Release"("barcode");

-- CreateIndex
CREATE INDEX "Release_artist_title_idx" ON "Release"("artist", "title");

-- CreateIndex
CREATE INDEX "Release_genre_idx" ON "Release"("genre");

-- CreateIndex
CREATE INDEX "MarketSnapshot_releaseId_idx" ON "MarketSnapshot"("releaseId");

-- CreateIndex
CREATE INDEX "MarketSnapshot_source_idx" ON "MarketSnapshot"("source");

-- CreateIndex
CREATE INDEX "MarketSnapshot_fetchedAt_idx" ON "MarketSnapshot"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketSnapshot_releaseId_source_key" ON "MarketSnapshot"("releaseId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "ConditionTier_name_key" ON "ConditionTier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ConditionTier_order_key" ON "ConditionTier"("order");

-- CreateIndex
CREATE INDEX "ConditionTier_name_idx" ON "ConditionTier"("name");

-- CreateIndex
CREATE INDEX "PricingPolicy_scope_scopeValue_idx" ON "PricingPolicy"("scope", "scopeValue");

-- CreateIndex
CREATE INDEX "PricingPolicy_isActive_idx" ON "PricingPolicy"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SellerSubmission_submissionNumber_key" ON "SellerSubmission"("submissionNumber");

-- CreateIndex
CREATE INDEX "SellerSubmission_status_idx" ON "SellerSubmission"("status");

-- CreateIndex
CREATE INDEX "SellerSubmission_sellerEmail_idx" ON "SellerSubmission"("sellerEmail");

-- CreateIndex
CREATE INDEX "SellerSubmission_createdAt_idx" ON "SellerSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "SellerSubmission_expiresAt_idx" ON "SellerSubmission"("expiresAt");

-- CreateIndex
CREATE INDEX "SubmissionItem_submissionId_idx" ON "SubmissionItem"("submissionId");

-- CreateIndex
CREATE INDEX "SubmissionItem_releaseId_idx" ON "SubmissionItem"("releaseId");

-- CreateIndex
CREATE INDEX "SubmissionItem_status_idx" ON "SubmissionItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLot_lotNumber_key" ON "InventoryLot"("lotNumber");

-- CreateIndex
CREATE INDEX "InventoryLot_releaseId_idx" ON "InventoryLot"("releaseId");

-- CreateIndex
CREATE INDEX "InventoryLot_status_idx" ON "InventoryLot"("status");

-- CreateIndex
CREATE INDEX "InventoryLot_channel_idx" ON "InventoryLot"("channel");

-- CreateIndex
CREATE INDEX "InventoryLot_listPrice_idx" ON "InventoryLot"("listPrice");

-- CreateIndex
CREATE INDEX "PricingCalculationAudit_releaseId_idx" ON "PricingCalculationAudit"("releaseId");

-- CreateIndex
CREATE INDEX "PricingCalculationAudit_policyId_idx" ON "PricingCalculationAudit"("policyId");

-- CreateIndex
CREATE INDEX "PricingCalculationAudit_createdAt_idx" ON "PricingCalculationAudit"("createdAt");

-- AddForeignKey
ALTER TABLE "MarketSnapshot" ADD CONSTRAINT "MarketSnapshot_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionItem" ADD CONSTRAINT "SubmissionItem_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SellerSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionItem" ADD CONSTRAINT "SubmissionItem_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCalculationAudit" ADD CONSTRAINT "PricingCalculationAudit_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCalculationAudit" ADD CONSTRAINT "PricingCalculationAudit_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PricingPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingCalculationAudit" ADD CONSTRAINT "PricingCalculationAudit_marketSnapshotId_fkey" FOREIGN KEY ("marketSnapshotId") REFERENCES "MarketSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
