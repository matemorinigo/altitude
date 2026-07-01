-- Add debt_target column (only used for card rectifications)
ALTER TABLE transactions
  ADD COLUMN debt_target text CHECK (debt_target IN ('current', 'statement'));

-- Rewrite trigger to include RECTIFICATION with multicurrency routing
CREATE OR REPLACE FUNCTION apply_tx_to_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Reverse OLD values on UPDATE/DELETE
  IF TG_OP IN ('UPDATE','DELETE') THEN
    CASE OLD.kind
      WHEN 'EXPENSE' THEN
        IF OLD.account_id IS NOT NULL THEN
          UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        END IF;
        IF OLD.credit_card_id IS NOT NULL THEN
          IF OLD.currency = 'USD' THEN
            UPDATE credit_cards SET current_debt_usd = current_debt_usd - OLD.amount WHERE id = OLD.credit_card_id;
          ELSE
            UPDATE credit_cards SET current_debt_ars = current_debt_ars - OLD.amount WHERE id = OLD.credit_card_id;
          END IF;
        END IF;
      WHEN 'INCOME' THEN
        IF OLD.account_id IS NOT NULL THEN
          UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        END IF;
      WHEN 'CARD_PAYMENT' THEN
        IF OLD.account_id IS NOT NULL THEN
          UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
        END IF;
        IF OLD.credit_card_id IS NOT NULL THEN
          IF OLD.currency = 'USD' THEN
            UPDATE credit_cards SET statement_debt_usd = statement_debt_usd + OLD.amount WHERE id = OLD.credit_card_id;
          ELSE
            UPDATE credit_cards SET statement_debt_ars = statement_debt_ars + OLD.amount WHERE id = OLD.credit_card_id;
          END IF;
        END IF;
      WHEN 'RECTIFICATION' THEN
        IF OLD.account_id IS NOT NULL THEN
          UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
        END IF;
        IF OLD.credit_card_id IS NOT NULL THEN
          IF COALESCE(OLD.debt_target, 'current') = 'statement' THEN
            IF OLD.currency = 'USD' THEN
              UPDATE credit_cards SET statement_debt_usd = statement_debt_usd - OLD.amount WHERE id = OLD.credit_card_id;
            ELSE
              UPDATE credit_cards SET statement_debt_ars = statement_debt_ars - OLD.amount WHERE id = OLD.credit_card_id;
            END IF;
          ELSE
            IF OLD.currency = 'USD' THEN
              UPDATE credit_cards SET current_debt_usd = current_debt_usd - OLD.amount WHERE id = OLD.credit_card_id;
            ELSE
              UPDATE credit_cards SET current_debt_ars = current_debt_ars - OLD.amount WHERE id = OLD.credit_card_id;
            END IF;
          END IF;
        END IF;
      ELSE NULL;
    END CASE;
  END IF;

  -- Apply NEW values on INSERT/UPDATE
  IF TG_OP IN ('INSERT','UPDATE') THEN
    CASE NEW.kind
      WHEN 'EXPENSE' THEN
        IF NEW.account_id IS NOT NULL THEN
          UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        END IF;
        IF NEW.credit_card_id IS NOT NULL THEN
          IF NEW.currency = 'USD' THEN
            UPDATE credit_cards SET current_debt_usd = current_debt_usd + NEW.amount WHERE id = NEW.credit_card_id;
          ELSE
            UPDATE credit_cards SET current_debt_ars = current_debt_ars + NEW.amount WHERE id = NEW.credit_card_id;
          END IF;
        END IF;
      WHEN 'INCOME' THEN
        IF NEW.account_id IS NOT NULL THEN
          UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        END IF;
      WHEN 'CARD_PAYMENT' THEN
        IF NEW.account_id IS NOT NULL THEN
          UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
        END IF;
        IF NEW.credit_card_id IS NOT NULL THEN
          IF NEW.currency = 'USD' THEN
            UPDATE credit_cards SET statement_debt_usd = statement_debt_usd - NEW.amount WHERE id = NEW.credit_card_id;
          ELSE
            UPDATE credit_cards SET statement_debt_ars = statement_debt_ars - NEW.amount WHERE id = NEW.credit_card_id;
          END IF;
        END IF;
      WHEN 'RECTIFICATION' THEN
        IF NEW.account_id IS NOT NULL THEN
          UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
        END IF;
        IF NEW.credit_card_id IS NOT NULL THEN
          IF COALESCE(NEW.debt_target, 'current') = 'statement' THEN
            IF NEW.currency = 'USD' THEN
              UPDATE credit_cards SET statement_debt_usd = statement_debt_usd + NEW.amount WHERE id = NEW.credit_card_id;
            ELSE
              UPDATE credit_cards SET statement_debt_ars = statement_debt_ars + NEW.amount WHERE id = NEW.credit_card_id;
            END IF;
          ELSE
            IF NEW.currency = 'USD' THEN
              UPDATE credit_cards SET current_debt_usd = current_debt_usd + NEW.amount WHERE id = NEW.credit_card_id;
            ELSE
              UPDATE credit_cards SET current_debt_ars = current_debt_ars + NEW.amount WHERE id = NEW.credit_card_id;
            END IF;
          END IF;
        END IF;
      ELSE NULL;
    END CASE;
    RETURN NEW;
  END IF;
  RETURN OLD;
END; $$;
