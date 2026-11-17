# Blueprint: Public, Private and Vault Zones on AWS S3

How to give one application three kinds of files on Amazon S3:

| Zone        | What it holds                             | Who can read it                                                                        |
| :---------- | :---------------------------------------- | :------------------------------------------------------------------------------------- |
| **Public**  | Avatars, logos, blog and marketing images | Anyone on the internet                                                                 |
| **Private** | User documents                            | Only your backend, which hands out short-lived presigned URLs after an ownership check |
| **Vault**   | Audit and compliance records              | A dedicated security role. **Not** the backend                                         |

Read [`s3-private-files-blueprint.md`](./s3-private-files-blueprint.md) first. The private zone here _is_ that blueprint. This document adds the public zone and the vault.

> **Scope.** AWS S3 only. Every control below (bucket policy conditions, Block Public Access, CloudFront OAC, Object Lock, role sessions) is an AWS feature.

---

## 1. Decide before you build

| Option                                         | Use when                                                                                       | Trade-off                                                                                                                                                                                                |
| :--------------------------------------------- | :--------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **One bucket per zone**                        | You can create buckets freely                                                                  | Simplest and safest. Block Public Access, encryption keys, logging, lifecycle and Object Lock are bucket-level settings, so each zone gets the right ones. The vault can live in a separate AWS account. |
| **One bucket, three prefixes** (this document) | You already have one bucket with live data, or the application is tied to a single bucket name | Works, but the bucket policy has to be right. Public access cannot be fully blocked (unless the public zone goes through CloudFront), and Object Lock applies to the whole bucket.                       |

If the vault must be **immutable**, prefer a separate bucket, for two reasons. Object Lock needs **versioning on the whole bucket**, so deleting a user's private file would only add a delete marker and the bytes would stay (unless a lifecycle rule expires old versions). And a bucket-wide default retention would lock your users' files too. In a shared bucket you can only lock vault objects one at a time (section 5.4).

---

## 2. The one design rule: allow-list the public zone

**Private by default. Name what is public. Never name what is private.**

Do not write "everything is public except `private/` and `vault/`". A new prefix, or a key someone writes at the root, would then be readable by the whole internet.

With an allow-list, a forgotten prefix is private. TwoNode's [ADR-0013](../adr/0013-bucket-key-layout-public-and-private-prefixes.md) chose the same rule for the same reason: "a new folder cannot become public by accident".

```text
s3://BUCKET/
├── public/        <- readable by anyone (the only anonymous allow)
├── private/       <- no policy statement; reached only through presigned URLs
└── vault/         <- denied to everyone except two named roles
```

### Access matrix

| Prefix        | Internet |           Backend app role           |  Ingest role   |    Security role    |
| :------------ | :------: | :----------------------------------: | :------------: | :-----------------: |
| `public/*`    | **Read** |         Read, write, delete          |      none      |        none         |
| `private/*`   |   none   | Read, write, delete (and signs URLs) |      none      |        none         |
| `vault/*`     |   none   |       **none** (explicit deny)       | **Write only** | **Read only** (MFA) |
| anything else |   none   |                 none                 |      none      |        none         |

---

## 3. Public zone

Two ways to serve it. Prefer A.

### A. CloudFront with Origin Access Control (recommended)

The bucket stays fully private: all four Block Public Access settings **on**. CloudFront reads `public/*` on behalf of visitors and caches it.

```json
{
  "Sid": "AllowCloudFrontReadOfPublicPrefixOnly",
  "Effect": "Allow",
  "Principal": { "Service": "cloudfront.amazonaws.com" },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::BUCKET/public/*",
  "Condition": {
    "StringEquals": {
      "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
    }
  }
}
```

Public URLs are `https://<distribution>.cloudfront.net/public/...` (or your own domain). You get caching, a WAF option and no public bucket. Nothing in option B below applies.

### B. Direct public read of `public/*`

Simpler, and what TwoNode runs today because its website images are served by plain S3 URL. Use it when CloudFront is not an option.

```json
{
  "Sid": "PublicReadOnlyUnderPublicPrefix",
  "Effect": "Allow",
  "Principal": "*",
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::BUCKET/public/*"
}
```

Block Public Access has to be relaxed for this to work, and **two** settings matter:

| Setting                 | Value   | Why                                                                                                                                                                                                                         |
| :---------------------- | :------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BlockPublicAcls`       | on      | ACLs are not used                                                                                                                                                                                                           |
| `IgnorePublicAcls`      | on      | ACLs are not used                                                                                                                                                                                                           |
| `BlockPublicPolicy`     | **off** | Otherwise S3 refuses to save the policy above                                                                                                                                                                               |
| `RestrictPublicBuckets` | **off** | Otherwise S3 still limits a bucket with a public policy to AWS services and your own account, and visitors get `403` ([AWS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)) |

Switching off only `BlockPublicPolicy` is a common half-fix: the policy saves, but visitors still get `403`.

With these two off, **anyone who can edit the bucket policy can make more of the bucket public**. Compensate:

- Give `s3:PutBucketPolicy` and `s3:PutBucketPublicAccessBlock` to as few identities as possible; the backend role gets neither.
- Turn on the AWS Config rule `s3-bucket-public-read-prohibited` or an IAM Access Analyzer finding, and alert on it.
- Add check V-3 in section 8 to your pipeline: an object at the bucket root must answer `403`.

Either way, never grant `s3:ListBucket` to the public. Listing would reveal every key.

---

## 4. Private zone

No bucket-policy statement is needed. With no public allow, nobody can read `private/*` except identities your IAM policies allow, and only the backend role is allowed.

The backend:

1. checks the caller owns or may read the file (by file id, never by key);
2. signs a 300-second GET URL for the key it looked up;
3. returns the URL.

The reference code, key layout and flows are in the private-files blueprint. In this layout, the key is `private/{tenantId}/{ownerId}/{category}/{uuid}.{ext}`.

---

## 5. Vault zone

### 5.1 What the vault is for

Records that must survive a compromise of the application: audit logs, compliance exports, legal-hold copies. The backend can **add** records and cannot read, change or delete them. A separate security role reads them.

### 5.2 Bucket policy

Do not use `NotPrincipal`. It cannot be combined with `Principal` in one statement (the policy grammar allows one or the other), and AWS now recommends against it for new policies. Use a `Deny` with `ArnNotEquals` on `aws:PrincipalArn`, as AWS documents ([IAM: NotPrincipal alternatives](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_notprincipal.html)).

```json
{
  "Sid": "VaultOnlyIngestAndSecurityRoles",
  "Effect": "Deny",
  "Principal": "*",
  "Action": "s3:*",
  "Resource": "arn:aws:s3:::BUCKET/vault/*",
  "Condition": {
    "ArnNotEquals": {
      "aws:PrincipalArn": [
        "arn:aws:iam::ACCOUNT_ID:role/vault-ingest",
        "arn:aws:iam::ACCOUNT_ID:role/security-compliance"
      ]
    }
  }
}
```

- The backend's own role is **not** in the list, so the policy denies it even if its IAM policy says `s3:*` on `*`.
- For a role session, `aws:PrincipalArn` is the role's ARN, not the per-session ARN, so the list above works for sessions.
- A resource policy can only be edited by someone with `s3:PutBucketPolicy`. The backend role must not have it.
- If you also keep the TLS-only statement from the private-files blueprint (section 10.2), keep both in one policy.

### 5.3 Three roles

| Role                      | Can do                                                                                    | Cannot do                      | Who assumes it                       |
| :------------------------ | :---------------------------------------------------------------------------------------- | :----------------------------- | :----------------------------------- |
| **Backend role**          | Everything in `public/*` and `private/*`; `sts:AssumeRole` on `vault-ingest`              | Anything in `vault/*` directly | The application                      |
| **`vault-ingest`**        | `s3:PutObject` and `s3:PutObjectRetention` on `vault/*`                                   | Read, list, delete             | The backend, only to append a record |
| **`security-compliance`** | `s3:GetObject`, `s3:GetObjectVersion`, and `s3:ListBucket` limited to the `vault/` prefix | Write, delete                  | A person, only with MFA              |

Backend role, add an explicit deny as a second lock:

```json
{
  "Sid": "NeverTouchVaultDirectly",
  "Effect": "Deny",
  "Action": "s3:*",
  "Resource": "arn:aws:s3:::BUCKET/vault/*"
}
```

This applies to the backend role's own credentials, not to the `vault-ingest` session it assumes, which is a different principal.

`vault-ingest` identity policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:PutObjectRetention"],
      "Resource": "arn:aws:s3:::BUCKET/vault/*"
    }
  ]
}
```

`security-compliance` identity policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:GetObjectVersion"],
      "Resource": "arn:aws:s3:::BUCKET/vault/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::BUCKET",
      "Condition": { "StringLike": { "s3:prefix": ["vault/*"] } }
    }
  ]
}
```

`security-compliance` trust policy (the MFA requirement):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::ACCOUNT_ID:root" },
      "Action": "sts:AssumeRole",
      "Condition": { "Bool": { "aws:MultiFactorAuthPresent": "true" } }
    }
  ]
}
```

Never give the backend role `s3:ListBucket`. If it could list `vault/`, it would learn the names of the audit records.

### 5.4 Immutability needs Object Lock

An IAM or bucket-policy deny stops the **backend**. It does not stop whoever holds the security role, or an administrator who can rewrite the policy. If records must be _tamper-proof_, use S3 Object Lock:

- Turn on versioning and Object Lock on the bucket that holds the vault. In a shared bucket that means versioning for every zone: add a lifecycle rule that expires non-current versions of `private/` objects, or deleted private files will linger.
- Write each record with `ObjectLockMode: "COMPLIANCE"` and an `ObjectLockRetainUntilDate`. In compliance mode nobody, including the root user, can delete the version or shorten the retention until it ends.
- Use a new unique key per record and `IfNoneMatch: "*"`, so an ingest can never replace an earlier record.
- In a shared bucket, set retention **per object** (as below). Do not set a bucket-wide default retention: it would lock `public/` and `private/` objects too.

Regulation: some rules, such as SEC Rule 17a-4 for broker-dealers, require write-once storage. Others, such as HIPAA and GDPR, require audit controls and integrity but, as far as we know, not WORM, and GDPR's right to erasure pulls the other way. Check with your compliance owner before promising "immutable" to anyone.

### 5.5 What not to put in the vault

- **AWS services that write or scan** (CloudTrail, Config, S3 server access logs, Macie, Access Analyzer) are not role sessions, so the deny above blocks them. Send service logs to a separate logging bucket. If one must write to the vault, add a narrow `Allow` for its service principal and exempt it in the deny with `aws:PrincipalServiceName`, then test that a real log write succeeds.
- Records the application needs to read back. If the app needs it, it is not vault data.

---

## 6. Backend IAM policy (all zones)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicAndPrivateObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::BUCKET/public/*",
        "arn:aws:s3:::BUCKET/private/*"
      ]
    },
    {
      "Sid": "AppendToVaultViaIngestRoleOnly",
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Resource": "arn:aws:iam::ACCOUNT_ID:role/vault-ingest"
    },
    {
      "Sid": "NeverTouchVaultDirectly",
      "Effect": "Deny",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::BUCKET/vault/*"
    }
  ]
}
```

Scoped to two prefixes, not `BUCKET/*`: a compromised backend can no longer read or delete anything outside them.

---

## 7. Code

```ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { randomUUID } from "node:crypto";

const BUCKET = process.env.AWS_BUCKET_NAME!;
const REGION = process.env.AWS_REGION!;
const PUBLIC_BASE = process.env.PUBLIC_BASE_URL!; // https://<distribution>.cloudfront.net, or https://BUCKET.s3.REGION.amazonaws.com

/** Public zone: a permanent URL. Encode each path segment, or spaces and '#' break the link. */
export function publicUrl(key: string): string {
  if (!key.startsWith("public/")) throw new Error("Not a public key");
  return `${PUBLIC_BASE}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/** Private zone: keys are server-built under private/. Signing and routes: see the private-files blueprint. */
export function privateKey(parts: {
  tenantId: string;
  ownerId: string;
  category: string;
  ext: string;
}) {
  return `private/${parts.tenantId}/${parts.ownerId}/${parts.category}/${randomUUID()}.${parts.ext}`;
}

/** Vault zone: append only, through a short-lived session of the vault-ingest role. */
const ingest = new S3Client({
  region: REGION,
  credentials: fromTemporaryCredentials({
    params: {
      RoleArn: process.env.VAULT_INGEST_ROLE_ARN!,
      RoleSessionName: "app-audit-writer",
    },
  }),
});

export async function appendAuditRecord(json: string) {
  const day = new Date();
  const retainUntil = new Date(day.getTime() + 7 * 365 * 24 * 60 * 60 * 1000); // set to your retention period
  await ingest.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `vault/audit/${day.toISOString().slice(0, 10)}/${randomUUID()}.json`,
      Body: json,
      ContentType: "application/json",
      IfNoneMatch: "*",
      ObjectLockMode: "COMPLIANCE",
      ObjectLockRetainUntilDate: retainUntil,
    })
  );
}
```

The vault has no read function in the app, on purpose. An attempt to read from the vault with the backend's credentials belongs in a test (check V-5), not in the code.

Route examples:

```ts
// Public: nothing to authorise. Return the URL.
app.get("/api/users/:id/avatar", (req, res) =>
  res.json({ url: publicUrl(`public/avatars/${req.params.id}.jpg`) })
);

// Private: by file id, with an ownership check, then a signed link. See the private-files blueprint.
app.get("/api/files/:fileId/link", fileLink);
```

---

## 8. Conformance checks

Use a throwaway test object in each zone. Run as the identity named in the second column.

| #    | Check                                                        | As                    | Command                                                                                                                                                 | Expect                                       |
| :--- | :----------------------------------------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------- |
| V-1  | Public object is readable                                    | anonymous             | `curl -s -o /dev/null -w '%{http_code}' PUBLIC_URL`                                                                                                     | `200`                                        |
| V-2  | Private object is not                                        | anonymous             | `curl … https://BUCKET.s3.REGION.amazonaws.com/private/TEST`                                                                                            | `403`                                        |
| V-3  | **An object at the bucket root is not public** (fail-closed) | anonymous             | upload `test/x.txt`, then `curl …/test/x.txt`                                                                                                           | `403`                                        |
| V-4  | Vault object is not public                                   | anonymous             | `curl …/vault/TEST`                                                                                                                                     | `403`                                        |
| V-5  | Backend cannot read the vault                                | backend role          | `aws s3api get-object --bucket BUCKET --key vault/TEST /dev/null`                                                                                       | `AccessDenied`                               |
| V-6  | Backend cannot write the vault directly                      | backend role          | `aws s3api put-object --bucket BUCKET --key vault/x --body f`                                                                                           | `AccessDenied`                               |
| V-7  | Ingest can write, cannot read                                | `vault-ingest`        | `put-object` then `get-object`                                                                                                                          | write succeeds, read `AccessDenied`          |
| V-8  | Security role can read, needs MFA                            | `security-compliance` | `get-object` with and without an MFA session                                                                                                            | succeeds with MFA, assume-role fails without |
| V-9  | A record is locked                                           | `security-compliance` | `aws s3api head-object --bucket BUCKET --key vault/TEST --query '[ObjectLockMode,ObjectLockRetainUntilDate]'`                                           | `COMPLIANCE` and a date in the future        |
| V-10 | No listing for the public                                    | anonymous             | `curl https://BUCKET.s3.REGION.amazonaws.com/?list-type=2`                                                                                              | `403`                                        |
| V-11 | Policy validates                                             | you                   | `aws accessanalyzer validate-policy --policy-type RESOURCE_POLICY --validate-policy-resource-type AWS::S3::Bucket --policy-document file://policy.json` | no `ERROR` findings                          |
| V-12 | Public status is what you intended                           | you                   | `aws s3api get-bucket-policy-status --bucket BUCKET`                                                                                                    | option A: `IsPublic false`; option B: `true` |
| V-13 | IAM does what you think                                      | you                   | `aws iam simulate-principal-policy --policy-source-arn BACKEND_ROLE_ARN --action-names s3:GetObject --resource-arns arn:aws:s3:::BUCKET/vault/x`        | `explicitDeny`                               |

V-3 is the one that proves the allow-list works. If it returns `200`, someone has made the bucket public by default.

---

## 9. Mistakes this blueprint exists to prevent

| Mistake                                                    | Result                                                                            | Do this instead                                             |
| :--------------------------------------------------------- | :-------------------------------------------------------------------------------- | :---------------------------------------------------------- |
| Public by default, with a deny for `private/` and `vault/` | Any new prefix, or a key at the root, is world-readable                           | Private by default; allow `public/*` only                   |
| One statement holding both `Principal` and `NotPrincipal`  | Not a valid policy                                                                | `Deny` with `ArnNotEquals` on `aws:PrincipalArn`            |
| Turning off `BlockPublicPolicy` only                       | The policy saves but visitors still get `403`                                     | Turn off `RestrictPublicBuckets` too, or use CloudFront OAC |
| Exempting the backend role from the vault deny             | The bucket layer does not protect the vault from the backend                      | List only the ingest and security roles                     |
| Calling an IAM deny "immutable"                            | A policy editor or the security role can still delete                             | Object Lock in compliance mode                              |
| A vault the app cannot write to                            | Nobody can get records in, so people add exceptions                               | A write-only ingest role                                    |
| Policy names a role, code signs with IAM-user keys         | The user is not the role, so requests are denied or the policy is never exercised | One identity type end to end; roles on AWS compute          |
| Backend allowed on `BUCKET/*`                              | A compromised backend reads and deletes everything                                | Allow `public/*` and `private/*` only                       |
| Raw key in a public URL; unescaped download name           | Spaces and quotes break links and headers                                         | Encode each path segment; use `attachmentDisposition`       |
