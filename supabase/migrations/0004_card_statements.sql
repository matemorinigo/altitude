-- Add statement cycle fields to credit_cards
alter table credit_cards
  add column statement_debt numeric(14,2) not null default 0,
  add column last_closed_at date;

-- Update trigger: CARD_PAYMENT now reduces statement_debt (not current_debt)
create or replace function apply_tx_to_balance()
returns trigger language plpgsql as $$
begin
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
          update credit_cards set statement_debt = statement_debt + OLD.amount where id = OLD.credit_card_id;
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
          update credit_cards set statement_debt = statement_debt - NEW.amount where id = NEW.credit_card_id;
        end if;
      else null;
    end case;
    return NEW;
  end if;

  return OLD;
end; $$;
