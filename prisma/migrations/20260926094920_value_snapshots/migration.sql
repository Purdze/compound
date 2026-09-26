-- CreateTable
CREATE TABLE "ValueSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "totalValue" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValueSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValueSnapshot_userId_day_idx" ON "ValueSnapshot"("userId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ValueSnapshot_apiKeyId_day_key" ON "ValueSnapshot"("apiKeyId", "day");

-- AddForeignKey
ALTER TABLE "ValueSnapshot" ADD CONSTRAINT "ValueSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValueSnapshot" ADD CONSTRAINT "ValueSnapshot_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
