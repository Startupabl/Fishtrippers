ALTER TYPE public.user_alert_kind ADD VALUE IF NOT EXISTS 'reschedule_requested';
ALTER TYPE public.user_alert_kind ADD VALUE IF NOT EXISTS 'reschedule_accepted';
ALTER TYPE public.user_alert_kind ADD VALUE IF NOT EXISTS 'reschedule_declined';