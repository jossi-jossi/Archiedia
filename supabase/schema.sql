-- Archiedia 초기 스키마 (Phase 2)
-- Supabase 대시보드 → SQL Editor 에서 실행

create table content_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('movie', 'book', 'webtoon', 'drama')),
  title text not null,
  source text not null default 'manual',
  external_id text,
  poster_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  -- 사용자 지정순 정렬 기준값(오름차순 표시). 콘텐츠 타입별로 독립적이다.
  display_order double precision
);

create table user_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,
  my_rating numeric,
  my_review text,
  watch_count integer not null default 0,
  last_watched_at text,
  watch_medium text,
  tags text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create index on content_items (user_id);
create index on user_records (user_id);
create index on user_records (content_item_id);

-- RLS: 본인 데이터만 조회/수정 가능
alter table content_items enable row level security;
alter table user_records enable row level security;

create policy "content_items_owner" on content_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_records_owner" on user_records
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
