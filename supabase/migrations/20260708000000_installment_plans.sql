-- Compras en cuotas: plan maestro + link de cada cuota posteada a transactions.
-- Las cuotas se postean como transactions EXPENSE normales, así el trigger
-- apply_tx_to_balance existente mantiene current_debt_ars/usd sin cambios.

create table installment_plans (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  credit_card_id     uuid not null references credit_cards(id) on delete cascade,
  name               text not null,
  category           text not null default 'SHOPPING',
  total_amount       numeric(14,2) not null check (total_amount > 0),
  currency           text not null default 'ARS' check (currency in ('ARS','USD')),
  n_installments     int not null check (n_installments between 2 and 60),
  installment_amount numeric(14,2) not null check (installment_amount > 0),
  first_due_date     date not null,
  posted_count       int not null default 0 check (posted_count >= 0),
  status             text not null default 'ACTIVE' check (status in ('ACTIVE','COMPLETED','CANCELED')),
  created_at         timestamptz not null default now()
);

alter table installment_plans enable row level security;

create policy "iplans_select_own" on installment_plans
  for select using (auth.uid() = user_id);
create policy "iplans_insert_own" on installment_plans
  for insert with check (auth.uid() = user_id);
create policy "iplans_update_own" on installment_plans
  for update using (auth.uid() = user_id);
create policy "iplans_delete_own" on installment_plans
  for delete using (auth.uid() = user_id);

create index idx_iplans_user_status on installment_plans (user_id, status);

alter table transactions
  add column installment_plan_id uuid references installment_plans(id) on delete set null,
  add column installment_number int check (installment_number >= 1);

-- Guard de idempotencia del posteo automático: una sola tx por (plan, número de cuota).
create unique index idx_tx_installment_unique
  on transactions (installment_plan_id, installment_number)
  where installment_plan_id is not null;
