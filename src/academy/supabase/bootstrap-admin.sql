-- Run in the Supabase SQL editor AFTER thanfo@gmail.com has a verified Auth account.
-- This grants the existing account admin rights; it does not create or email an account.
do $$
declare admin_id uuid;
begin
  select id into admin_id from auth.users
  where lower(email) = 'thanfo@gmail.com' and email_confirmed_at is not null;
  if admin_id is null then
    raise exception 'Create and verify the Auth account for thanfo@gmail.com before granting administrator access.';
  end if;
  insert into public.awds_admins (user_id) values (admin_id) on conflict do nothing;
end;
$$;
