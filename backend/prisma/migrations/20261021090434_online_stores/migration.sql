-- CreateEnum
CREATE TYPE "StoreKind" AS ENUM ('physical', 'online');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "kind" "StoreKind" NOT NULL DEFAULT 'physical',
ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL;

-- A physical store has a full point, an online store has none and no address.
ALTER TABLE "stores" ADD CONSTRAINT "stores_kind_location_check" CHECK (
  ("kind" = 'physical' AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL)
  OR ("kind" = 'online' AND "latitude" IS NULL AND "longitude" IS NULL AND "address" IS NULL)
);
