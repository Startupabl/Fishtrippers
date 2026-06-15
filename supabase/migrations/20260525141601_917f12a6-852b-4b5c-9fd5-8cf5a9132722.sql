
REVOKE EXECUTE ON FUNCTION public.increment_class_session_seats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_class_session_seats(uuid) TO authenticated, service_role;
