-- CSB Bank (formerly Catholic Syrian Bank).
--
-- A new migration rather than an edit to 0001: that one has already run in
-- production, and a migration that has been applied is history. Changing it
-- would leave existing deployments without this row while the journal
-- claimed otherwise.
--
-- Same ON CONFLICT guard as 0001, so re-running is a no-op and an operator
-- who has already added CSB by hand is not disturbed.

INSERT INTO "banks" ("name", "code") VALUES
  ('CSB Bank', 'CSB')
ON CONFLICT ("code") DO NOTHING;
