-- CreateTable
CREATE TABLE "Buyer" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "phone" VARCHAR(20),
    "shippingAddress" TEXT,
    "billingAddress" TEXT,
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Buyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingCart" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shipping" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "abandonedAt" TIMESTAMP(3),

    CONSTRAINT "ShoppingCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending_payment',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "shipping" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentMethod" VARCHAR(50) NOT NULL,
    "paypalOrderId" VARCHAR(255),
    "paymentStatus" VARCHAR(50),
    "shippingAddress" TEXT NOT NULL,
    "trackingNumber" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "BuyerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "lineTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelConfig" (
    "id" TEXT NOT NULL,
    "channel" VARCHAR(50) NOT NULL,
    "displayName" VARCHAR(255) NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isSellable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Buyer_email_key" ON "Buyer"("email");

-- CreateIndex
CREATE INDEX "Buyer_email_idx" ON "Buyer"("email");

-- CreateIndex
CREATE INDEX "ShoppingCart_buyerId_idx" ON "ShoppingCart"("buyerId");

-- CreateIndex
CREATE INDEX "ShoppingCart_status_idx" ON "ShoppingCart"("status");

-- CreateIndex
CREATE INDEX "ShoppingCart_createdAt_idx" ON "ShoppingCart"("createdAt");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_lotId_idx" ON "CartItem"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_lotId_key" ON "CartItem"("cartId", "lotId");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerOrder_orderNumber_key" ON "BuyerOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "BuyerOrder_buyerId_idx" ON "BuyerOrder"("buyerId");

-- CreateIndex
CREATE INDEX "BuyerOrder_status_idx" ON "BuyerOrder"("status");

-- CreateIndex
CREATE INDEX "BuyerOrder_paymentStatus_idx" ON "BuyerOrder"("paymentStatus");

-- CreateIndex
CREATE INDEX "BuyerOrder_createdAt_idx" ON "BuyerOrder"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_lotId_idx" ON "OrderItem"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConfig_channel_key" ON "ChannelConfig"("channel");

-- CreateIndex
CREATE INDEX "ChannelConfig_isPublic_idx" ON "ChannelConfig"("isPublic");

-- AddForeignKey
ALTER TABLE "ShoppingCart" ADD CONSTRAINT "ShoppingCart_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "ShoppingCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerOrder" ADD CONSTRAINT "BuyerOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BuyerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "InventoryLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
