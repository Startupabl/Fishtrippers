DROP POLICY IF EXISTS "Learner creates own orders" ON public.orders;
REVOKE INSERT ON public.orders FROM authenticated;
REVOKE INSERT ON public.orders FROM anon;