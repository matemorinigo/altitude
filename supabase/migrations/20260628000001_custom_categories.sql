-- Custom categories table
CREATE TABLE categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code       text NOT NULL,
  label      text NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('EXPENSE', 'INCOME')),
  is_system  boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own categories"
  ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own categories"
  ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own categories"
  ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete non-system categories"
  ON categories FOR DELETE USING (auth.uid() = user_id AND is_system = false);

CREATE INDEX idx_categories_user ON categories(user_id, sort_order);

-- Seed default categories for all existing users
INSERT INTO categories (user_id, code, label, kind, is_system, sort_order)
SELECT u.id, v.code, v.label, v.kind, v.is_system, v.sort_order
FROM auth.users u
CROSS JOIN (VALUES
  ('FOOD',          'FOOD',          'EXPENSE', false, 1),
  ('TRANSPORT',     'TRANSPORT',     'EXPENSE', false, 2),
  ('BILLS',         'BILLS',         'EXPENSE', false, 3),
  ('SHOPPING',      'SHOPPING',      'EXPENSE', false, 4),
  ('FUN',           'FUN',           'EXPENSE', false, 5),
  ('HEALTH',        'HEALTH',        'EXPENSE', false, 6),
  ('INVEST',        'INVEST',        'EXPENSE', false, 7),
  ('OTHER',         'OTHER',         'EXPENSE', false, 8),
  ('SALARY',        'SALARY',        'INCOME',  false, 9),
  ('FREELANCE',     'FREELANCE',     'INCOME',  false, 10),
  ('INVESTMENT',    'INV',           'INCOME',  false, 11),
  ('TRANSFER',      'TRANSFER',      'EXPENSE', true,  90),
  ('CARD_PAYMENT',  'CARD_PAYMENT',  'EXPENSE', true,  91),
  ('RECTIFICATION', 'RECTIFICATION', 'EXPENSE', true,  92)
) AS v(code, label, kind, is_system, sort_order)
ON CONFLICT (user_id, code) DO NOTHING;

-- Update handle_new_user to also seed categories for new signups
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (new.id, coalesce(new.email, new.id::text));

  INSERT INTO categories (user_id, code, label, kind, is_system, sort_order)
  VALUES
    (new.id, 'FOOD',          'FOOD',          'EXPENSE', false, 1),
    (new.id, 'TRANSPORT',     'TRANSPORT',     'EXPENSE', false, 2),
    (new.id, 'BILLS',         'BILLS',         'EXPENSE', false, 3),
    (new.id, 'SHOPPING',      'SHOPPING',      'EXPENSE', false, 4),
    (new.id, 'FUN',           'FUN',           'EXPENSE', false, 5),
    (new.id, 'HEALTH',        'HEALTH',        'EXPENSE', false, 6),
    (new.id, 'INVEST',        'INVEST',        'EXPENSE', false, 7),
    (new.id, 'OTHER',         'OTHER',         'EXPENSE', false, 8),
    (new.id, 'SALARY',        'SALARY',        'INCOME',  false, 9),
    (new.id, 'FREELANCE',     'FREELANCE',     'INCOME',  false, 10),
    (new.id, 'INVESTMENT',    'INV',           'INCOME',  false, 11),
    (new.id, 'TRANSFER',      'TRANSFER',      'EXPENSE', true,  90),
    (new.id, 'CARD_PAYMENT',  'CARD_PAYMENT',  'EXPENSE', true,  91),
    (new.id, 'RECTIFICATION', 'RECTIFICATION', 'EXPENSE', true,  92);

  RETURN new;
END; $$;
