-- ---------- profiles ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  base_currency text not null default 'ARS',
  payday_kind text not null default 'NTH_BUSINESS_DAY' check (payday_kind in ('NTH_BUSINESS_DAY','DAY_OF_MONTH')),
  payday_nth_business_day int default 1 check (payday_nth_business_day between 1 and 25),
  payday_day_of_month int check (payday_day_of_month between 1 and 31),
  payday_expected_amount numeric(14,2),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "profiles_self" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- ---------- accounts ----------
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  type text not null check (type in ('BANK','WALLET')),
  currency text not null default 'ARS',
  balance numeric(14,2) not null default 0,
  sort_order int not null default 0,
  is_archived bool not null default false,
  created_at timestamptz not null default now()
);

alter table accounts enable row level security;
create policy "accounts_select_own" on accounts for select using (auth.uid() = user_id);
create policy "accounts_insert_own" on accounts for insert with check (auth.uid() = user_id);
create policy "accounts_update_own" on accounts for update using (auth.uid() = user_id);
create policy "accounts_delete_own" on accounts for delete using (auth.uid() = user_id);

-- ---------- credit_cards ----------
create table credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  name text not null,
  close_day int not null check (close_day between 1 and 31),
  due_day int not null check (due_day between 1 and 31),
  currency text not null default 'ARS',
  current_debt numeric(14,2) not null default 0,
  sort_order int not null default 0,
  is_archived bool not null default false,
  created_at timestamptz not null default now()
);

alter table credit_cards enable row level security;
create policy "credit_cards_select_own" on credit_cards for select using (auth.uid() = user_id);
create policy "credit_cards_insert_own" on credit_cards for insert with check (auth.uid() = user_id);
create policy "credit_cards_update_own" on credit_cards for update using (auth.uid() = user_id);
create policy "credit_cards_delete_own" on credit_cards for delete using (auth.uid() = user_id);

-- ---------- recurring_templates ----------
create table recurring_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('EXPENSE','INCOME')),
  name text not null,
  amount numeric(14,2),
  prompt_for_amount bool not null default false,
  account_id uuid references accounts(id) on delete set null,
  credit_card_id uuid references credit_cards(id) on delete set null,
  category text not null default 'OTHER',
  description text,
  schedule_kind text not null check (schedule_kind in ('DAY_OF_MONTH','NTH_BUSINESS_DAY')),
  day_of_month int check (day_of_month between 1 and 31),
  nth_business_day int check (nth_business_day between 1 and 25),
  is_active bool not null default true,
  is_payday bool not null default false,
  last_generated_for date,
  created_at timestamptz not null default now()
);

alter table recurring_templates enable row level security;
create policy "recurring_select_own" on recurring_templates for select using (auth.uid() = user_id);
create policy "recurring_insert_own" on recurring_templates for insert with check (auth.uid() = user_id);
create policy "recurring_update_own" on recurring_templates for update using (auth.uid() = user_id);
create policy "recurring_delete_own" on recurring_templates for delete using (auth.uid() = user_id);

-- ---------- scheduled_events ----------
create table scheduled_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references recurring_templates(id) on delete cascade,
  due_date date not null,
  status text not null default 'PENDING' check (status in ('PENDING','CONFIRMED','SKIPPED')),
  confirmed_transaction_id uuid,
  created_at timestamptz not null default now(),
  unique (template_id, due_date)
);

create index idx_sched_pending on scheduled_events (user_id, status, due_date);

alter table scheduled_events enable row level security;
create policy "sched_select_own" on scheduled_events for select using (auth.uid() = user_id);
create policy "sched_insert_own" on scheduled_events for insert with check (auth.uid() = user_id);
create policy "sched_update_own" on scheduled_events for update using (auth.uid() = user_id);
create policy "sched_delete_own" on scheduled_events for delete using (auth.uid() = user_id);

-- ---------- transactions ----------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  credit_card_id uuid references credit_cards(id) on delete set null,
  kind text not null check (kind in ('EXPENSE','INCOME','TRANSFER','CARD_PAYMENT')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'ARS',
  category text not null,
  description text,
  occurred_at timestamptz not null default now(),
  recurring_template_id uuid references recurring_templates(id) on delete set null,
  scheduled_event_id uuid references scheduled_events(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_tx_user_date on transactions (user_id, occurred_at desc);

alter table transactions enable row level security;
create policy "tx_select_own" on transactions for select using (auth.uid() = user_id);
create policy "tx_insert_own" on transactions for insert with check (auth.uid() = user_id);
create policy "tx_update_own" on transactions for update using (auth.uid() = user_id);
create policy "tx_delete_own" on transactions for delete using (auth.uid() = user_id);

-- FK from scheduled_events to transactions (added after both tables exist)
alter table scheduled_events
  add constraint sched_confirmed_tx
  foreign key (confirmed_transaction_id) references transactions(id) on delete set null;

-- ---------- tickers ----------
create table tickers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  quantity numeric(18,4) not null check (quantity >= 0),
  asset_class text,
  instrument_kind text not null check (instrument_kind in (
    'CEDEAR','STOCK_AR','BOND_AR','NOTE_AR','CORP_AR','STOCK_USA','ADR_USA'
  )),
  last_price numeric(18,4),
  last_price_currency text,
  last_price_at timestamptz,
  notes text,
  sort_order int not null default 0,
  is_archived bool not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

alter table tickers enable row level security;
create policy "tickers_select_own" on tickers for select using (auth.uid() = user_id);
create policy "tickers_insert_own" on tickers for insert with check (auth.uid() = user_id);
create policy "tickers_update_own" on tickers for update using (auth.uid() = user_id);
create policy "tickers_delete_own" on tickers for delete using (auth.uid() = user_id);

-- ---------- trigger: crear profile al registrarse ----------
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name) values (new.id, new.email);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- trigger: mantener balance / current_debt ----------
create or replace function apply_tx_to_balance()
returns trigger language plpgsql as $$
declare
  delta      numeric(14,2) := 0;
  card_delta numeric(14,2) := 0;
  old_row    transactions;
begin
  -- On DELETE use OLD, on INSERT use NEW, on UPDATE handle both
  if TG_OP = 'DELETE' then
    old_row := OLD;
  end if;

  -- Reverse old values on UPDATE/DELETE
  if TG_OP in ('UPDATE','DELETE') then
    case OLD.kind
      when 'EXPENSE' then
        if OLD.account_id is not null then
          update accounts set balance = balance + OLD.amount where id = OLD.account_id;
        end if;
        if OLD.credit_card_id is not null then
          update credit_cards set current_debt = current_debt - OLD.amount where id = OLD.credit_card_id;
        end if;
      when 'INCOME' then
        if OLD.account_id is not null then
          update accounts set balance = balance - OLD.amount where id = OLD.account_id;
        end if;
      when 'CARD_PAYMENT' then
        if OLD.account_id is not null then
          update accounts set balance = balance + OLD.amount where id = OLD.account_id;
        end if;
        if OLD.credit_card_id is not null then
          update credit_cards set current_debt = current_debt + OLD.amount where id = OLD.credit_card_id;
        end if;
      else null;
    end case;
  end if;

  -- Apply new values on INSERT/UPDATE
  if TG_OP in ('INSERT','UPDATE') then
    case NEW.kind
      when 'EXPENSE' then
        if NEW.account_id is not null then
          update accounts set balance = balance - NEW.amount where id = NEW.account_id;
        end if;
        if NEW.credit_card_id is not null then
          update credit_cards set current_debt = current_debt + NEW.amount where id = NEW.credit_card_id;
        end if;
      when 'INCOME' then
        if NEW.account_id is not null then
          update accounts set balance = balance + NEW.amount where id = NEW.account_id;
        end if;
      when 'CARD_PAYMENT' then
        if NEW.account_id is not null then
          update accounts set balance = balance - NEW.amount where id = NEW.account_id;
        end if;
        if NEW.credit_card_id is not null then
          update credit_cards set current_debt = current_debt - NEW.amount where id = NEW.credit_card_id;
        end if;
      else null;
    end case;
    return NEW;
  end if;

  return OLD;
end; $$;

create trigger tx_balance_after_insert
  after insert on transactions
  for each row execute function apply_tx_to_balance();

create trigger tx_balance_after_update
  after update on transactions
  for each row execute function apply_tx_to_balance();

create trigger tx_balance_before_delete
  before delete on transactions
  for each row execute function apply_tx_to_balance();
