alter table accounts
  add column if not exists alias text not null default '';
