-- UPDATE "Subscription" 
-- SET "currentEnd" = '2025-10-30 23:59:59.999',
--     "updatedAt" = NOW()
-- WHERE "userId" IN (
--     SELECT id 
--     FROM "SurfboardUser" 
--     WHERE email = 'rojitech9@gmail.com'
-- );

-- SELECT s.id, s."planName", s."currentStart", s."currentEnd", u.email
-- FROM "Subscription" s
-- JOIN "SurfboardUser" u ON s."userId" = u.id
-- WHERE u.email = 'rojitech9@gmail.com';




-- Create a new GBC admin user
-- Note: You'll need to update the kindeId after the user first authenticates with Kinde
INSERT INTO "GBCUser" (
    id,
    "kindeId",
    email,
    "firstName",
    "lastName",
    role,
    "isActive",
    "createdAt",
    "updatedAt"
)
VALUES (
    gen_random_uuid()::text,  -- Generate a unique ID
    'temp_' || gen_random_uuid()::text,  -- Temporary kindeId (update after Kinde auth)
    'rojitech9@gmail.com',
    'GBC Admin',
    NULL,
    'SUPERADMIN',
    true,
    NOW(),
    NOW()
);

-- Verify the user was created
SELECT id, "kindeId", email, "firstName", "lastName", role, "createdAt"
FROM "GBCUser"
WHERE email = 'rojitech9@gmail.com';
