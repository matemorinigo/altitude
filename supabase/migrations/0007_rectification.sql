-- Add RECTIFICATION kind: balance adjustment that is not income or expense.
-- Amount is signed (positive = increases balance, negative = decreases it).

alter table transactions drop constraint if exists transactions_kind_check;
alter table transactions add constraint transactions_kind_check
  check (kind in ('EXPENSE', 'INCOME', 'TRANSFER', 'CARD_PAYMENT', 'RECTIFICATION'));

alter table transactions drop constraint if exists transactions_amount_check;
alter table transactions add constraint transactions_amount_check
  check (amount > 0 or kind = 'RECTIFICATION');

create or replace function apply_tx_to_balance()
returns trigger language plpgsql as $$
begin
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
          update credit_cards set statement_debt = statement_debt + OLD.amount where id = OLD.credit_card_id;
        end if;
      when 'RECTIFICATION' then
        if OLD.account_id is not null then
          update accounts set balance = balance - OLD.amount where id = OLD.account_id;
        end if;
        if OLD.credit_card_id is not null then
          update credit_cards set current_debt = current_debt - OLD.amount where id = OLD.credit_card_id;
        end if;
      else null;
    end case;
  end if;

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
          update credit_cards set statement_debt = statement_debt - NEW.amount where id = NEW.credit_card_id;
        end if;
      when 'RECTIFICATION' then
        if NEW.account_id is not null then
          update accounts set balance = balance + NEW.amount where id = NEW.account_id;
        end if;
        if NEW.credit_card_id is not null then
          update credit_cards set current_debt = current_debt + NEW.amount where id = NEW.credit_card_id;
        end if;
      else null;
    end case;
    return NEW;
  end if;

  return OLD;
end; $$;
