create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null check (length(trim(file_name)) between 1 and 500),
  mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  file_size_bytes bigint not null check (file_size_bytes > 0),
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  drive_file_id text,
  drive_web_view_link text,
  status text not null default 'queued' check (status in ('queued','processing','review_required','ready','failed')),
  page_count integer check (page_count is null or page_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, sha256)
);
create table public.document_pages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  extracted_text text,
  extraction_method text check (extraction_method in ('pdf_text','ocr','manual')),
  ocr_confidence numeric(5,4) check (ocr_confidence is null or (ocr_confidence >= 0 and ocr_confidence <= 1)),
  status text not null default 'pending' check (status in ('pending','processing','review_required','complete','failed')),
  created_at timestamptz not null default now(),
  unique(document_id, page_number),
  unique(id, owner_id)
);
create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  stage text not null check (stage in ('validate','archive','extract','ocr','segment','classify')),
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  idempotency_key text not null unique,
  error_code text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  document_page_id uuid,
  question_number text,
  question_text text not null check (length(trim(question_text)) > 0),
  board text,
  qualification text,
  subject text,
  chapter text,
  topic text,
  classification_confidence numeric(5,4) check (classification_confidence is null or (classification_confidence >= 0 and classification_confidence <= 1)),
  review_status text not null default 'needs_review' check (review_status in ('needs_review','approved','rejected')),
  created_at timestamptz not null default now(),
  constraint questions_page_owner_fk foreign key (document_page_id, owner_id)
    references public.document_pages(id, owner_id) on delete cascade
);
create index documents_owner_created_idx on public.documents(owner_id, created_at desc);
create index document_pages_document_idx on public.document_pages(document_id, page_number);
create index processing_jobs_owner_status_idx on public.processing_jobs(owner_id, status, created_at);
create index questions_owner_document_idx on public.questions(owner_id, document_id);
alter table public.documents enable row level security;
alter table public.document_pages enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.questions enable row level security;
create policy "documents_owner_all" on public.documents for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "document_pages_owner_all" on public.document_pages for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "processing_jobs_owner_all" on public.processing_jobs for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "questions_owner_all" on public.questions for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
grant select, insert, update, delete on public.documents, public.document_pages, public.processing_jobs, public.questions to authenticated;
revoke all on public.documents, public.document_pages, public.processing_jobs, public.questions from anon;
