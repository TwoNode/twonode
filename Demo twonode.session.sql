-- Create a new GBC admin user
-- Note: You'll need to update the kindeId after the user first authenticates with Kinde
-- INSERT INTO "SurfboardUser" (
--     id,
--     "kindeId",
--     email,
--     "firstName",
--     "lastName",
--     role,
--     "createdAt",
--     "updatedAt"
-- )
-- VALUES (
--     gen_random_uuid()::text,  -- Generate a unique ID
--     'temp_' || gen_random_uuid()::text,  -- Temporary kindeId (update after Kinde auth)
--     'olamide.abowaba@twonodetechnologies.com',
--     'Olamide',
--     'Abowaba',
--     'SUPERADMIN',
--     NOW(),
--     NOW()
-- );

-- -- Verify the user was created
-- SELECT id, "kindeId", email, "firstName", "lastName", role, "createdAt"
-- FROM "SurfboardUser"
-- WHERE email IN ('olamide.abowaba@twonodetechnologies.com', 'rojitech9@gmail.com');


-- UPDATE "SurfboardUser"
-- SET "role" = 'SUPERADMIN'
-- WHERE email IN ('olamide.abowaba@twonodetechnologies.com', 'rojitech9@gmail.com');

-- Update Batch Amounts for Testing/Demo
-- Record 1: cfb9badb-e31b-4cde-a88e-cb3141e07043
UPDATE "CertificateOfDepositBatch"
SET "totalAmount" = 2000,
    "totalFees" = 1818,
    "systemCharges" = 182
WHERE id = 'cfb9badb-e31b-4cde-a88e-cb3141e07043';

-- Record 2: 54ab0c89-385e-4a4a-b5ec-f3c44a256e33
UPDATE "CertificateOfDepositBatch"
SET "totalAmount" = 100,
    "totalFees" = 91,
    "systemCharges" = 9
WHERE id = '54ab0c89-385e-4a4a-b5ec-f3c44a256e33';
