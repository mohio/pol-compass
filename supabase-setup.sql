-- ══════════════════════════════════════════════
--  УЛСТӨРИЙН ЛУУЖИН — Supabase тохиргоо
-- ══════════════════════════════════════════════
-- supabase.com → Project → SQL Editor дээр
-- доорх кодыг бүтнээр нь ажиллуулна уу.

create table if not exists submissions (
  id        bigserial primary key,
  ts        timestamptz default now(),
  age       integer,
  gender    text,
  education text,
  econ      numeric,
  soc       numeric,
  quad      text
);

-- Row Level Security идэвхжүүлэх
alter table submissions enable row level security;

-- Хэн ч бичиж болно (quiz оролцогчид)
create policy "public insert" on submissions
  for insert with check (true);

-- Хэн ч унших боломжтой (admin panel)
create policy "public select" on submissions
  for select using (true);

-- Хэн ч устгах боломжтой (admin clear)
create policy "public delete" on submissions
  for delete using (true);

-- ══════════════════════════════════════════════
--  Дуусгасны дараа:
--  Project → Settings → API → URL болон anon key-г
--  Vercel → Settings → Environment Variables-д нэмнэ:
--
--  VITE_SUPABASE_URL  =  https://xxxx.supabase.co
--  VITE_SUPABASE_KEY  =  eyJhbGciOiJIUzI1NiIs...
-- ══════════════════════════════════════════════
