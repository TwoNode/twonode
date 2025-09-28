UPDATE "Subscription" 
SET "currentEnd" = '2025-10-30 23:59:59.999',
    "updatedAt" = NOW()
WHERE "userId" IN (
    SELECT id 
    FROM "SurfboardUser" 
    WHERE email = 'rojitech9@gmail.com'
);

SELECT s.id, s."planName", s."currentStart", s."currentEnd", u.email
FROM "Subscription" s
JOIN "SurfboardUser" u ON s."userId" = u.id
WHERE u.email = 'rojitech9@gmail.com';
