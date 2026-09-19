-- Bank reference data.
--
-- The application cannot function without this: the Add Card form is driven
-- by this table, and an empty list means no user can add a card at all.
--
-- It ships as a migration rather than as part of `scripts/seed.ts` because
-- that script TRUNCATES every table and must never touch production. This is
-- reference data, not fixture data, so it belongs in the schema's history.
--
-- ON CONFLICT DO NOTHING keyed on the unique `code`, so re-running is a
-- no-op and an operator may rename or deactivate a bank without this
-- migration undoing it.

INSERT INTO "banks" ("name", "code") VALUES
  ('HDFC Bank',             'HDFC'),
  ('State Bank of India',   'SBI'),
  ('ICICI Bank',            'ICICI'),
  ('Axis Bank',             'AXIS'),
  ('Kotak Mahindra Bank',   'KOTAK'),
  ('IDFC FIRST Bank',       'IDFC'),
  ('RBL Bank',              'RBL'),
  ('IndusInd Bank',         'INDUSIND'),
  ('American Express',      'AMEX'),
  ('Bank of Baroda',        'BOB'),
  ('Punjab National Bank',  'PNB'),
  ('Canara Bank',           'CANARA'),
  ('Union Bank of India',   'UNION'),
  ('Yes Bank',              'YES'),
  ('IDBI Bank',             'IDBI'),
  ('Federal Bank',          'FEDERAL'),
  ('Bank of India',         'BOI'),
  ('Indian Bank',           'INDIANBANK'),
  ('Central Bank of India', 'CENTRAL'),
  ('AU Small Finance Bank', 'AUSFB'),
  ('Bandhan Bank',          'BANDHAN'),
  ('Standard Chartered',    'SCB'),
  ('HSBC India',            'HSBC'),
  ('Citibank India',        'CITI'),
  ('DBS Bank India',        'DBS')
ON CONFLICT ("code") DO NOTHING;
