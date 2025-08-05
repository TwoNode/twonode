-- -- AlterTable
-- ALTER TABLE "OneTimeUserProperty" ALTER COLUMN "reference" SET DEFAULT concat('reva_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));

-- -- AlterTable
-- ALTER TABLE "Property" ALTER COLUMN "reference" SET DEFAULT concat('REVA_', substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));

-- Only alter OneTimeUserProperty if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'OneTimeUserProperty') THEN
        EXECUTE 'ALTER TABLE "OneTimeUserProperty" ALTER COLUMN "reference" SET DEFAULT concat(''reva_'', substring(replace(gen_random_uuid()::text, ''-'', ''''), 1, 12))';
    END IF;
END $$;

-- Only alter Property if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Property') THEN
        EXECUTE 'ALTER TABLE "Property" ALTER COLUMN "reference" SET DEFAULT concat(''REVA_'', substring(replace(gen_random_uuid()::text, ''-'', ''''), 1, 12))';
    END IF;
END $$;
