alter table accounts
  add column if not exists exclude_from_total bool not null default false;
