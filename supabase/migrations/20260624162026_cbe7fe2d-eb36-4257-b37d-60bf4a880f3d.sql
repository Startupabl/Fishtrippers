-- Remove the duplicate availability sync trigger; trg_bookings_sync_host_availability remains.
DROP TRIGGER IF EXISTS trg_sync_host_availability ON public.bookings;

-- Add new alert kinds used by the app
ALTER TYPE public.user_alert_kind ADD VALUE IF NOT EXISTS 'custom_offer_received';
ALTER TYPE public.user_alert_kind ADD VALUE IF NOT EXISTS 'booking_received';