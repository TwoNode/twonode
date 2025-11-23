-- -- Create a new GBC admin user
-- -- Note: You'll need to update the kindeId after the user first authenticates with Kinde
-- INSERT INTO "GBCUser" (
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
-- FROM "GBCUser"
-- WHERE email = 'rojitech9@gmail.com';


UPDATE "GBCUser"
SET "isActive" = TRUE
WHERE email IN ('olamide.abowaba@twonodetechnologies.com', 'rojitech9@gmail.com');