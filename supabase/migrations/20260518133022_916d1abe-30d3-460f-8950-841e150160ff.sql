-- Extend order_status enum with 'paid'
ALTER TYPE public.order_status_t ADD VALUE IF NOT EXISTS 'paid';