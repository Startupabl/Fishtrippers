ALTER TABLE public.journeys
  ADD COLUMN IF NOT EXISTS showcase_video_url text,
  ADD COLUMN IF NOT EXISTS showcase_audio_url text,
  ADD COLUMN IF NOT EXISTS showcase_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS featured_image_url text;