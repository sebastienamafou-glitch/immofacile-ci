/*
  Warnings:

  - A unique constraint covering the columns `[listingId,startDate]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Booking_listingId_startDate_key" ON "Booking"("listingId", "startDate");

-- CreateIndex
CREATE INDEX "Listing_city_idx" ON "Listing"("city");

-- CreateIndex
CREATE INDEX "Listing_pricePerNight_idx" ON "Listing"("pricePerNight");

-- CreateIndex
CREATE INDEX "Listing_city_pricePerNight_idx" ON "Listing"("city", "pricePerNight");

-- CreateIndex
CREATE INDEX "Property_commune_idx" ON "Property"("commune");

-- CreateIndex
CREATE INDEX "Property_price_idx" ON "Property"("price");

-- CreateIndex
CREATE INDEX "Property_type_idx" ON "Property"("type");

-- CreateIndex
CREATE INDEX "Property_commune_price_idx" ON "Property"("commune", "price");
