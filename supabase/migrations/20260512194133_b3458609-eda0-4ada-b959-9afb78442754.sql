
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-covers', 'course-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Course covers public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-covers');

CREATE POLICY "Owners upload course covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners update course covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners delete course covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-covers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
