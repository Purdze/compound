-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN     "isIsa" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "CalculatorPreset" ADD COLUMN     "account" TEXT NOT NULL DEFAULT 'general';
