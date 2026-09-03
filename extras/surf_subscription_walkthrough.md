# Reversal Report: Surfboard Subscriptions Fix

The subscription fix script has successfully executed. 16 erroneous `SubscriptionHistory` records have been permanently deleted, and the `Subscription` state of 9 affected users has been explicitly restored.

If you notice any issues and need to revert these changes, you can use the values listed below to re-apply the previous state.

## 1. How to Reverse `Subscription` Updates
To revert any user's subscription back to its **erroneous state**, you can execute a script or run an SQL update utilizing the following values:

| User ID | Original Plan (Erroneous) | Original Amount | Original Start Date | Original End Date |
| :--- | :--- | :--- | :--- | :--- |
| `a5419e80-cc4c-45e9-934a-a1b38cddf1cc` | Monthly | 2,000,000 | `2026-04-14 22:22:05` | `2026-05-14 22:22:04` |
| `faf617ff-a566-4db1-ad0e-db70b02f08b8` | Quarterly | 7,000,000 | `2026-04-26 21:12:07` | `2026-05-26 21:12:06` |
| `29052e30-8619-48d5-a60e-e0c57ddb9273` | Quarterly | 50,000 | `2025-12-10 10:02:45` | `2026-05-30 00:00:00` |
| `5183dad1-f81b-4351-a5bc-2ca9ab2afec7` | Quarterly | 7,000,000 | `2026-04-15 09:33:43` | `2026-05-15 09:33:42` |
| `f414a23f-4da6-4ca2-b96d-e42b30988de7` | SURF_QUARTERLY | 7,000,000 | `2026-04-15 13:54:09` | `2026-05-15 13:54:08` |
| `949b517c-eaaf-443a-9e38-a43331781c45` | SURF_QUARTERLY | 10,000,000 | `2026-04-16 08:43:18` | `2026-05-16 08:43:17` |
| `9831f451-8165-407b-8fd7-e20412f204c6` | Quarterly | 10,000,000 | `2026-04-18 19:50:47` | `2026-05-18 19:50:46` |
| `18d26514-8e4d-4084-8df2-228558a94a82` | Quarterly | 7,000,000 | `2026-04-29 15:59:15` | `2026-05-29 15:59:14` |
| `00110c41-2aa8-45ea-a500-aa82b542b5ab` | Monthly | 25,000,000 | `2026-04-26 04:21:54` | `2026-05-23 00:00:00` |

## 2. How to Restore Deleted `SubscriptionHistory`
Because these records were mis-directed from other platforms (e.g., Reva, GBC, CoD), they likely shouldn't be restored into Surfboard's history. However, all the original payloads for these 16 records still exist in `extras/SurfboardHistory.json`.

If you absolutely must inject them back into the database, you can read them from `SurfboardHistory.json` by matching the `id` or `reference` and using `prisma.subscriptionHistory.create()`.

The IDs of the 16 deleted records:
```json
[
  "842e2cc0-625b-479a-a0a1-f7a1383c33ec", 
  "cffe4e95-126d-46ae-ae9b-7acc3f1fcb4f", 
  "1ee0356f-26ce-43ee-bf65-47c15b249b35", 
  "1b7a5ba2-5d1c-4c26-b93f-9d0ab5320409", 
  "f91b5089-d322-44ba-af30-4fe920ed3a2e", 
  "63e87ef8-d753-40d9-82fa-3fcb283868e0", 
  "38067add-b3c2-458c-8e91-efca502fa559", 
  "b01f75b2-ed9f-4d35-b1cc-b28dcfe0d6c0", 
  "84e5a41e-94cc-4fa5-8154-2dc8f5d04b2e", 
  "a198aa40-528a-45f1-9791-7b6d91a49626", 
  "29aa3f33-6840-4c3c-a425-96b2bc589fb2", 
  "388e9a19-cfa7-4f5a-a025-2118ff5d2749", 
  "d61aabad-c97c-4e90-aad5-8f448261d3ff", 
  "93f06498-f4a5-4c6c-91ee-b53233ad124d", 
  "2d711ac8-f7c2-4859-8cc6-3cc4a2014a94", 
  "1cc46821-b470-4ae2-8f2e-b1825dd2e541"
]
```
