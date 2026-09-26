-- AlterTable
ALTER TABLE "CalculatorPreset" ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN     "monthly" INTEGER NOT NULL DEFAULT 500;
