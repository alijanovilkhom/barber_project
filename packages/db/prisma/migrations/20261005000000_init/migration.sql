-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('confirmed', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('web', 'telegram', 'admin');

-- CreateEnum
CREATE TYPE "TimeOffType" AS ENUM ('day_off', 'vacation', 'sick_leave', 'other');

-- CreateTable
CREATE TABLE "barbers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photo_url" TEXT,
    "bio" TEXT,
    "experience_years" INTEGER NOT NULL DEFAULT 0,
    "telegram_chat_id" BIGINT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "barbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barber_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_min" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barber_services" (
    "barber_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "duration_min" INTEGER,
    "price" DECIMAL(12,2),
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "barber_services_pkey" PRIMARY KEY ("barber_id","service_id")
);

-- CreateTable
CREATE TABLE "working_hours" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barber_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,

    CONSTRAINT "working_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "breaks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barber_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,

    CONSTRAINT "breaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_off" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "barber_id" UUID,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "type" "TimeOffType" NOT NULL DEFAULT 'other',
    "note" TEXT,

    CONSTRAINT "time_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "telegram_id" BIGINT,
    "telegram_chat_id" BIGINT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "barber_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "total_price" DECIMAL(12,2) NOT NULL,
    "total_duration_min" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'confirmed',
    "source" "BookingSource" NOT NULL DEFAULT 'web',
    "manage_token" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminder_day_sent_at" TIMESTAMPTZ(3),
    "reminder_30m_sent_at" TIMESTAMPTZ(3),
    "review_requested_at" TIMESTAMPTZ(3),
    "auto_completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_services" (
    "booking_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "booking_services_pkey" PRIMARY KEY ("booking_id","service_id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "booking_id" UUID NOT NULL,
    "barber_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "login" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "telegram_chat_id" BIGINT,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "barbers_slug_key" ON "barbers"("slug");

-- CreateIndex
CREATE INDEX "portfolio_items_barber_id_sort_order_idx" ON "portfolio_items"("barber_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "barber_services_service_id_idx" ON "barber_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "working_hours_barber_id_weekday_key" ON "working_hours"("barber_id", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "breaks_barber_id_weekday_start_time_key" ON "breaks"("barber_id", "weekday", "start_time");

-- CreateIndex
CREATE INDEX "time_off_barber_id_starts_at_ends_at_idx" ON "time_off"("barber_id", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "clients_phone_key" ON "clients"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "clients_telegram_id_key" ON "clients"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_manage_token_key" ON "bookings"("manage_token");

-- CreateIndex
CREATE INDEX "bookings_barber_id_starts_at_ends_at_idx" ON "bookings"("barber_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "bookings_client_id_starts_at_idx" ON "bookings"("client_id", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_status_starts_at_idx" ON "bookings"("status", "starts_at");

-- CreateIndex
CREATE INDEX "booking_services_service_id_idx" ON "booking_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "reviews_barber_id_is_public_created_at_idx" ON "reviews"("barber_id", "is_public", "created_at");

-- CreateIndex
CREATE INDEX "reviews_client_id_idx" ON "reviews"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_login_key" ON "admin_users"("login");

-- AddForeignKey
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barber_services" ADD CONSTRAINT "barber_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "breaks" ADD CONSTRAINT "breaks_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_barber_id_fkey" FOREIGN KEY ("barber_id") REFERENCES "barbers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain constraints kept in SQL because Prisma does not currently model CHECK constraints.
ALTER TABLE "barbers"
    ADD CONSTRAINT "barbers_experience_years_check" CHECK ("experience_years" >= 0);
ALTER TABLE "services"
    ADD CONSTRAINT "services_duration_min_check" CHECK ("duration_min" > 0),
    ADD CONSTRAINT "services_price_check" CHECK ("price" >= 0);
ALTER TABLE "barber_services"
    ADD CONSTRAINT "barber_services_duration_min_check" CHECK ("duration_min" IS NULL OR "duration_min" > 0),
    ADD CONSTRAINT "barber_services_price_check" CHECK ("price" IS NULL OR "price" >= 0);
ALTER TABLE "working_hours"
    ADD CONSTRAINT "working_hours_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6),
    ADD CONSTRAINT "working_hours_time_check" CHECK ("start_time" < "end_time");
ALTER TABLE "breaks"
    ADD CONSTRAINT "breaks_weekday_check" CHECK ("weekday" BETWEEN 0 AND 6),
    ADD CONSTRAINT "breaks_time_check" CHECK ("start_time" < "end_time");
ALTER TABLE "time_off"
    ADD CONSTRAINT "time_off_range_check" CHECK ("starts_at" < "ends_at");
ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_range_check" CHECK ("starts_at" < "ends_at"),
    ADD CONSTRAINT "bookings_total_price_check" CHECK ("total_price" >= 0),
    ADD CONSTRAINT "bookings_total_duration_min_check" CHECK ("total_duration_min" > 0);
ALTER TABLE "booking_services"
    ADD CONSTRAINT "booking_services_duration_min_check" CHECK ("duration_min" > 0),
    ADD CONSTRAINT "booking_services_price_check" CHECK ("price" >= 0);
ALTER TABLE "reviews"
    ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

-- Supabase exposes tables through PostgREST. RLS stays enabled with no public
-- policies; the future API connects with a privileged server-only credential.
ALTER TABLE "barbers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolio_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "barber_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "working_hours" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "breaks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "time_off" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "booking_services" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;
