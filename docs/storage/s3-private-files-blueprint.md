# Blueprint: Private Files on AWS S3

How to store, protect and serve private user files (documents, invoices, contracts, ID scans) on **Amazon S3**: a private bucket, your backend as the only gatekeeper, and short-lived presigned URLs for the bytes.

Read this first. Then:

- [`s3-hybrid-access-blueprint.md`](./s3-hybrid-access-blueprint.md) if the same bucket must also serve public files, or needs a locked-down audit "vault".
- [`s3-private-files-lifecycle-twonode.md`](./s3-private-files-lifecycle-twonode.md) for a real system built on these ideas, including where it falls short.

Code is TypeScript on the AWS SDK for JavaScript v3. The rules do not depend on the language: section 6 is the HTTP contract, section 11 is a set of checks any implementation can run.

> **Scope.** This is written for AWS S3. Section 12 lists what changes on S3-compatible services such as Cloudflare R2 or Supabase Storage. Several controls here (Block Public Access, bucket-policy conditions, Object Lock, CloudFront OAC) exist only on AWS.

---

## 1. The rules

1. **The bucket is private.** All four Block Public Access settings on. Nobody reads a file without a signature.
2. **The server builds every key.** A client never sends a storage key. It sends a file id, and the server looks the key up.
3. **Every grant follows an ownership check, by file id.** "Missing" and "not yours" give the same `404`, so ids cannot be probed.
4. **A signed URL is a bearer token.** Anyone holding it can use it until it expires. Keep it short (default 300 s, never above 900 s), do not store it, do not log it.
5. **S3 enforces size and type at upload; the server re-checks at confirm.** A presigned `PUT` cannot cap size. A presigned `POST` can.
6. **The original file name lives in the database.** It is never part of the key or trusted in a header.
7. **Delete uses the same check as read.** A delete endpoint that trusts a key from the client is a data-loss bug.
8. **Sweep what was never finished.** Uploads that were never confirmed, deletes that half-completed.

Each rule is here because skipping it has caused a real incident (section 13).

---

## 2. The two-tier model

```
+----------------------------------------------------------------------------------+
|  Tier 1: your backend and database                                               |
|    - authenticates the caller                                                    |
|    - looks the file up by id and checks owner / share / role                     |
|    - answers 401 / 404 before S3 is involved                                     |
|                                                                                  |
|  Tier 2: S3 and Signature Version 4                                              |
|    - bucket is private, ACLs off, public access blocked                          |
|    - the backend signs a short-lived request with its own credentials            |
|    - S3 checks the signature, the expiry and (for uploads) the POST policy       |
|    - bytes flow client <-> S3, not through your server                           |
+----------------------------------------------------------------------------------+
```

Presigning is **local arithmetic inside the SDK**. Your server does not call S3 to get a URL, and S3 does not check at signing time that the key exists or that you may use it. A bad signature, a missing permission or an expired URL only shows up when the URL is used.

---

## 3. Flows

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant API as Backend API
    participant DB as Database
    participant S3 as S3 private bucket

    Note over Client,S3: A. Upload (presigned POST, S3 enforces size and type)
    Client->>API: POST /api/files/uploads (fileName, contentType, size, category)
    API->>API: Authenticate, check type allow-list and size limit
    API->>DB: Insert file row, status PENDING, server-built key
    API->>API: Sign a POST policy locally (no call to S3)
    API-->>Client: 201 fileId, upload url and fields
    Client->>S3: POST form fields then the file
    S3-->>Client: 204 (or a 4xx if size, type or expiry is wrong)
    Client->>API: POST /api/files/{fileId}/confirm
    API->>DB: Load the PENDING row owned by the caller
    API->>S3: HeadObject(key)
    S3-->>API: size, content type
    API->>DB: Mark ACTIVE (otherwise delete the object and the row)
    API-->>Client: 200

    Note over Client,S3: B. View or download
    Client->>API: GET /api/files/{fileId}/link
    API->>DB: Load the row, check owner / share / role
    alt not allowed or not found
        API-->>Client: 404
    else allowed
        API->>API: Sign a GET URL locally (300 s)
        API-->>Client: 200 url, expiresAt
        Client->>S3: GET url
        S3-->>Client: 200 bytes
    end

    Note over Client,S3: C. Delete
    Client->>API: DELETE /api/files/{fileId}
    API->>DB: Load the row, check owner, set status DELETING
    API->>S3: DeleteObject(key)
    API->>DB: Delete the row
    API-->>Client: 204
```

---

## 4. What you store

One row per file. The key never leaves the server.

| Column                          | Notes                                       |
| :------------------------------ | :------------------------------------------ |
| `id`                            | Opaque id (UUID). This is what clients see. |
| `tenant_id`, `owner_id`         | From the session, never from the request.   |
| `key`                           | Server-built (section 5). Unique.           |
| `original_name`                 | For display and `Content-Disposition` only. |
| `content_type`, `declared_size` | What the client asked for at step A.        |
| `size`                          | Real size, from `HeadObject` at confirm.    |
| `status`                        | `PENDING` → `ACTIVE` → `DELETING`.          |
| `created_at`                    | Used by the sweeper.                        |

Sharing (if you need it) is a separate table of `(file_id, user_id)` grants. Do not encode sharing in the key.

---

## 5. Key layout

```text
files/{tenantId}/{ownerId}/{category}/{uuid}.{ext}
```

- `tenantId` and `ownerId` come from the session. Prefixes let you write IAM or bucket-policy rules per area later.
- `category` is checked against an allow-list. A free-text value from the client lets a caller choose any prefix.
- `uuid` is `crypto.randomUUID()`. Timestamps collide when two uploads arrive in the same millisecond.
- `ext` comes from the allow-listed content type, never from the client's file name.
- Nothing from the client's file name goes into the key, so there is nothing to sanitise.

If you want human-readable keys, add `__{slugified-name}` after the uuid, but keep the database as the source of truth for the name.

S3 treats `/` as an ordinary character. There is no path traversal in S3 itself, but some tools normalise `..`, so never build a key from raw input.

**Overwrites.** A plain `PutObject` replaces an existing key silently. With random keys that cannot happen. If you need a stable key (for example `invoice-2026-042.pdf`), send `If-None-Match: *` so S3 refuses to overwrite, and handle `412 PreconditionFailed` and `409 ConditionalRequestConflict`.

---

## 6. HTTP contract

Language-neutral. Any backend can implement this; any client can call it.

| Call                                      | Body                                        | Success                                                                                                                 | Errors                                                                                        |
| :---------------------------------------- | :------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| `POST /api/files/uploads`                 | `{ fileName, contentType, size, category }` | `201 { fileId, upload: { url, fields }, expiresAt }`                                                                    | `400` bad category, `413` too large, `415` type not allowed                                   |
| `POST /api/files/{fileId}/confirm`        | none                                        | `200 { fileId, size }`                                                                                                  | `404` not yours or not pending, `409` nothing was uploaded, `422` size or type does not match |
| `GET /api/files/{fileId}/link?download=1` | none                                        | `200 { url, expiresAt }`                                                                                                | `404`                                                                                         |
| `GET /api/files/{fileId}/content`         | none                                        | `302` to the signed URL, with `Cache-Control: private, max-age=<TTL minus 60>` and `Vary` on your auth header or cookie | `404`                                                                                         |
| `DELETE /api/files/{fileId}`              | none                                        | `204`                                                                                                                   | `404`                                                                                         |

Rules for the contract:

- No endpoint accepts a storage key or a bucket URL.
- Use `link` (JSON) for mobile apps and single-page apps, `content` (redirect) for `<img>` and `<a>` in a browser. `fetch` drops the `Authorization` header on a cross-origin redirect, so a bearer-token client should use `link`.
- `expiresIn` on `link` is clamped to 30–900 s whatever the caller asks for.
- Return `404`, not `403`, when the caller may not see the file.

---

## 7. Signing versus encryption

| Layer                 | Job                                                                | Mechanism                                             | Who does it                          |
| :-------------------- | :----------------------------------------------------------------- | :---------------------------------------------------- | :----------------------------------- |
| Signature             | Proves who asked, that the request was not altered, and until when | HMAC-SHA256 (SigV4)                                   | Your credentials, locally in the SDK |
| Encryption at rest    | Protects the disk                                                  | AES-256 (SSE-S3 by default; SSE-KMS if you choose it) | S3                                   |
| Encryption in transit | Protects the network                                               | TLS                                                   | HTTPS                                |

The secret access key is never an encryption key. It only signs.

Every new object is encrypted with SSE-S3 by default. If you switch the bucket to **SSE-KMS**, the identity that signs also needs KMS permission: `kms:GenerateDataKey` to write, `kms:Decrypt` to read. A presigned URL runs with the signer's permissions, so without them the URL fails when used.

---

## 8. Anatomy of a presigned GET

```text
https://my-private-bucket.s3.eu-west-1.amazonaws.com/files/t_1/u_42/invoice/6f1c2e0a-8d4b-4b8e-9a53-0c5d2f7e1b11.pdf
  ?response-content-disposition=attachment%3B%20filename%3D%22invoice.pdf%22
  &X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20261103%2Feu-west-1%2Fs3%2Faws4_request
  &X-Amz-Date=20261103T145654Z
  &X-Amz-Expires=300
  &X-Amz-SignedHeaders=host
  &X-Amz-Signature=<64 hex characters>
```

| Part                           | Meaning                                                                                                                           |
| :----------------------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| `X-Amz-Credential`             | Access key id (public), date, region, service. The secret is never in the URL.                                                    |
| `X-Amz-Date`                   | When it was signed (UTC).                                                                                                         |
| `X-Amz-Expires`                | Seconds of validity. S3 checks it **when the request arrives**: a download that has started finishes, a retry after expiry fails. |
| `X-Amz-SignedHeaders`          | Headers covered by the signature.                                                                                                 |
| `X-Amz-Signature`              | HMAC over the whole request. Change any part and it fails.                                                                        |
| `response-content-disposition` | Signed too, so a caller cannot change the download name.                                                                          |

An SDK sending a `Host` of `s3.<region>.amazonaws.com` with the bucket in the path (path-style) produces `https://s3.<region>.amazonaws.com/<bucket>/<key>` instead. Both work; do not parse keys out of URLs by assuming one shape.

**How long a URL really lives**

| Signed with                                                        | Maximum                                       | Note                                                             |
| :----------------------------------------------------------------- | :-------------------------------------------- | :--------------------------------------------------------------- |
| IAM user access keys                                               | 7 days                                        |                                                                  |
| Role or STS temporary credentials (ECS, Lambda, EC2, `AssumeRole`) | Until the credentials expire, often 1–6 hours | The URL dies with the session even if `X-Amz-Expires` is longer. |

You should never need more than 900 s for a file view. If a flow seems to need hours, issue a fresh link when the user clicks.

---

## 9. Reference code

### `storage.ts` (the only file that imports the AWS SDK)

```ts
import { randomUUID } from "node:crypto";
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const BUCKET = process.env.AWS_BUCKET_NAME!;

// No credentials here on purpose. The SDK's default chain uses the task, instance or Lambda role
// on AWS, or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY where there is no role (for example Vercel).
// If you ever presign a PUT instead of a POST, also pass requestChecksumCalculation: "WHEN_REQUIRED" (section 12).
const s3 = new S3Client({ region: process.env.AWS_REGION });

export const UPLOAD_TTL_SECONDS = 300;
export const LINK_TTL = { default: 300, min: 30, max: 900 } as const;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Types the app accepts. The extension comes from here, never from the client's file name. */
export const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};
export const CATEGORIES = new Set(["invoice", "contract", "id-document"]);

export function buildKey(p: {
  tenantId: string;
  ownerId: string;
  category: string;
  contentType: string;
}): string {
  const ext = ALLOWED_TYPES[p.contentType];
  if (!ext || !CATEGORIES.has(p.category)) throw new Error("Not allowed");
  return `files/${p.tenantId}/${p.ownerId}/${p.category}/${randomUUID()}.${ext}`;
}

/** Presigned POST: S3 itself rejects a file outside the size range or with another content type. */
export function presignUpload(p: {
  key: string;
  contentType: string;
  maxBytes: number;
}) {
  return createPresignedPost(s3, {
    Bucket: BUCKET,
    Key: p.key,
    Expires: UPLOAD_TTL_SECONDS,
    Fields: { "Content-Type": p.contentType },
    Conditions: [
      ["content-length-range", 1, p.maxBytes],
      ["eq", "$Content-Type", p.contentType],
    ],
  }); // -> { url, fields }
}

export async function presignDownload(
  key: string,
  o: { seconds?: number; downloadName?: string } = {}
) {
  const seconds = Math.min(
    LINK_TTL.max,
    Math.max(LINK_TTL.min, Math.floor(o.seconds ?? LINK_TTL.default))
  );
  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ResponseContentDisposition: o.downloadName
        ? attachmentDisposition(o.downloadName)
        : undefined,
    }),
    { expiresIn: seconds }
  );
  return {
    url,
    expiresAt: new Date(Date.now() + seconds * 1000).toISOString(),
  };
}

/** null when the object is not there. Without s3:ListBucket, S3 answers a missing key with 403, not 404. */
export async function headObject(key: string) {
  try {
    const r = await s3.send(
      new HeadObjectCommand({ Bucket: BUCKET, Key: key })
    );
    return { size: r.ContentLength ?? 0, contentType: r.ContentType ?? "" };
  } catch (e: any) {
    const status = e?.$metadata?.httpStatusCode;
    if (status === 404 || status === 403) return null;
    throw e;
  }
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** A safe Content-Disposition: no quotes, slashes or control characters; UTF-8 name in filename*. */
export function attachmentDisposition(fileName: string): string {
  const clean =
    fileName
      .replace(/[\u0000-\u001f\u007f"\\/]/g, "")
      .trim()
      .slice(0, 180) || "download";
  const ascii = clean.replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}
```

### Routes (Express style; `db` is your data layer)

```ts
// POST /api/files/uploads
export async function requestUpload(req: Req, res: Res) {
  const user = req.user!; // from the session
  const { fileName, contentType, size, category } = parseUploadBody(req.body); // schema validation

  if (!ALLOWED_TYPES[contentType])
    return res.status(415).json({ error: "TYPE_NOT_ALLOWED" });
  if (!CATEGORIES.has(category))
    return res.status(400).json({ error: "BAD_CATEGORY" });
  if (!Number.isInteger(size) || size < 1 || size > MAX_UPLOAD_BYTES)
    return res.status(413).json({ error: "TOO_LARGE" });

  const key = buildKey({
    tenantId: user.tenantId,
    ownerId: user.id,
    category,
    contentType,
  });
  const file = await db.files.create({
    tenantId: user.tenantId,
    ownerId: user.id,
    key,
    originalName: String(fileName).slice(0, 200),
    contentType,
    declaredSize: size,
    status: "PENDING",
  });
  const upload = await presignUpload({ key, contentType, maxBytes: size });
  res.status(201).json({
    fileId: file.id,
    upload,
    expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000).toISOString(),
  });
}

// POST /api/files/:fileId/confirm  (never takes a key)
export async function confirmUpload(req: Req, res: Res) {
  const file = await db.files.findOne({
    id: req.params.fileId,
    ownerId: req.user!.id,
    status: "PENDING",
  });
  if (!file) return res.status(404).json({ error: "NOT_FOUND" });

  const head = await headObject(file.key);
  if (!head) return res.status(409).json({ error: "NO_UPLOAD" });
  if (
    head.size < 1 ||
    head.size > file.declaredSize ||
    head.contentType !== file.contentType
  ) {
    await deleteObject(file.key);
    await db.files.delete(file.id);
    return res.status(422).json({ error: "MISMATCH" });
  }
  await db.files.update(file.id, { status: "ACTIVE", size: head.size });
  res.json({ fileId: file.id, size: head.size });
}

// GET /api/files/:fileId/link?download=1&expiresIn=300
export async function fileLink(req: Req, res: Res) {
  const file = await db.files.findOne({
    id: req.params.fileId,
    status: "ACTIVE",
  });
  if (!file || !(await canRead(req.user!, file)))
    return res.status(404).json({ error: "NOT_FOUND" });

  const out = await presignDownload(file.key, {
    seconds: Number(req.query.expiresIn) || undefined,
    downloadName: req.query.download === "1" ? file.originalName : undefined,
  });
  res.json(out);
}

// DELETE /api/files/:fileId
export async function deleteFile(req: Req, res: Res) {
  const file = await db.files.findOne({
    id: req.params.fileId,
    ownerId: req.user!.id,
  });
  if (!file) return res.status(404).json({ error: "NOT_FOUND" });

  await db.files.update(file.id, { status: "DELETING" });
  await deleteObject(file.key); // idempotent: deleting a missing key succeeds
  await db.files.delete(file.id);
  res.status(204).end();
}
```

`canRead` is yours: owner, or an explicit share, or a staff role inside the same tenant. Keep it in one function that every read path calls.

### Browser or mobile client

```ts
async function uploadPrivateFile(file: File, category: string) {
  const r = await api.post("/api/files/uploads", {
    fileName: file.name,
    contentType: file.type,
    size: file.size,
    category,
  });

  const form = new FormData();
  for (const [k, v] of Object.entries(r.upload.fields))
    form.append(k, v as string);
  form.append("file", file); // must be the LAST field

  const put = await fetch(r.upload.url, { method: "POST", body: form });
  if (!put.ok) throw new Error("Storage rejected the upload");

  await api.post(`/api/files/${r.fileId}/confirm`, {});
  return r.fileId;
}
```

### Sweeper (runs hourly)

```ts
// PENDING rows older than 1 h: the upload never happened, or was never confirmed.
// DELETING rows older than 1 h: the delete half-finished.
for (const f of await db.files.findStale(["PENDING", "DELETING"], 60 * 60)) {
  await deleteObject(f.key);
  await db.files.delete(f.id);
}
```

---

## 10. AWS setup

Replace `BUCKET`, `REGION`, `ACCOUNT_ID`.

### 10.1 Bucket

```bash
# us-east-1 takes no --create-bucket-configuration
aws s3api create-bucket --bucket BUCKET --region REGION \
  --create-bucket-configuration LocationConstraint=REGION

aws s3api put-public-access-block --bucket BUCKET --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-ownership-controls --bucket BUCKET \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'

aws s3api put-bucket-encryption --bucket BUCKET --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
```

### 10.2 Bucket policy: TLS only, and a cap on signature age

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::BUCKET", "arn:aws:s3:::BUCKET/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    },
    {
      "Sid": "DenyOldSignatures",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::BUCKET/*",
      "Condition": { "NumericGreaterThan": { "s3:signatureAge": "900000" } }
    }
  ]
}
```

The second statement is a backstop: S3 refuses any signature older than 900 000 ms (15 minutes), whatever your code signs. The value is in milliseconds. It uses the documented [`s3:signatureAge`](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) condition.

### 10.3 IAM policy for the backend's role or user

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AppObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::BUCKET/files/*"
    }
  ]
}
```

- No `s3:ListBucket`, so the app cannot list the bucket. The cost: a missing key answers `403`, not `404`. The reference code treats both as "not there".
- A presigned URL carries **the signer's** permissions. If the signer lacks `s3:GetObject`, the URL is created without complaint and fails with `403` when used.
- On AWS compute, use a role, not access keys.

### 10.4 CORS (browser uploads only)

```json
[
  {
    "AllowedOrigins": ["https://app.example.com"],
    "AllowedMethods": ["POST", "GET"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Mobile apps ignore CORS. `GET` is needed only if a page reads the file with `fetch` or XHR, not for `<img>` or `<a>`. Add `PUT` only if you use presigned PUT.

### 10.5 Lifecycle

```json
{
  "Rules": [
    {
      "ID": "abort-incomplete-multipart",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 2 }
    }
  ]
}
```

If you turn on **versioning**, add a rule that expires non-current versions. A plain `DeleteObject` on a versioned bucket only adds a delete marker; the bytes stay.

---

## 11. Conformance checks

Run these against your own deployment. If a check fails, the system does not follow this blueprint.

| #   | Check                            | Command or action                                                                                                                                       | Expect                                                    |
| :-- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------- |
| 1   | All four public-access blocks on | `aws s3api get-public-access-block --bucket BUCKET`                                                                                                     | four `true`                                               |
| 2   | Bucket is not public             | `aws s3api get-bucket-policy-status --bucket BUCKET`                                                                                                    | `"IsPublic": false`                                       |
| 3   | ACLs off                         | `aws s3api get-bucket-ownership-controls --bucket BUCKET`                                                                                               | `BucketOwnerEnforced`                                     |
| 4   | Default encryption               | `aws s3api get-bucket-encryption --bucket BUCKET`                                                                                                       | `AES256` or `aws:kms`                                     |
| 5   | Policy is clean                  | `aws accessanalyzer validate-policy --policy-type RESOURCE_POLICY --validate-policy-resource-type AWS::S3::Bucket --policy-document file://policy.json` | no `ERROR` findings                                       |
| 6   | Raw object URL, no signature     | `curl -s -o /dev/null -w '%{http_code}' https://BUCKET.s3.REGION.amazonaws.com/KEY`                                                                     | `403`                                                     |
| 7   | Signed URL over plain HTTP       | take a working link, change `https` to `http`                                                                                                           | `403`                                                     |
| 8   | Owner gets a link                | call `link` as the owner, then fetch the URL                                                                                                            | `200` and the right bytes                                 |
| 9   | Link expires                     | fetch the same URL after TTL + 5 s                                                                                                                      | `403` (`Request has expired`)                             |
| 10  | Stranger's file id               | call `link` as another user                                                                                                                             | `404`, same body as a made-up id                          |
| 11  | Oversize upload                  | POST a file larger than the declared size                                                                                                               | rejected by S3 (4xx), nothing stored                      |
| 12  | Wrong type at upload             | POST with a different `Content-Type` than declared                                                                                                      | rejected by S3 (4xx)                                      |
| 13  | Confirm for someone else's id    | call `confirm` as another user                                                                                                                          | `404`                                                     |
| 14  | Confirm with no upload           | call `confirm` before POSTing the file                                                                                                                  | `409`                                                     |
| 15  | Delete someone else's file       | call `DELETE` as another user                                                                                                                           | `404`, and `aws s3api head-object` still finds the object |
| 16  | No endpoint takes a key          | search the API for parameters named `key`, `url`, `path`                                                                                                | none that reach S3                                        |

---

## 12. Presigned PUT, and S3-compatible services

### Presigned PUT and the default checksum (AWS SDK 3.729.0 and later)

From 3.729.0 the SDK adds a CRC32 checksum to uploads by default ([AWS](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-checksums.html)). Measured offline with SDK 3.985.0 and dummy credentials: a presigned **PUT** URL then contains `x-amz-checksum-crc32=AAAAAA==` (the CRC32 of an _empty_ body) and `x-amz-sdk-checksum-algorithm=CRC32`, because the URL is signed before any file exists. Creating the client with `requestChecksumCalculation: "WHEN_REQUIRED"` removes both. Users report that the default breaks presigned PUT uploads (`SignatureDoesNotMatch` or a checksum mismatch) on several services; whether current AWS S3 accepts such a URL with a real body was **not tested here**. If you presign PUTs, set the option and test a real upload end to end (a PUT cannot cap size, so the limit is enforced in the confirm step). The presigned POST used in this blueprint carries no checksum field and is not affected.

### Other S3-compatible services

| Service                        | What changes                                                                                                                                                                                                                                                                                                                                                                                                    |
| :----------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare R2                  | Presigned URLs work for `GET`, `HEAD`, `PUT`, `DELETE`; **presigned POST is not supported** ([Cloudflare](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)). Use presigned `PUT`, which cannot cap size, so enforce size in the confirm step and delete anything over the limit. Use region `auto` and the account endpoint. Presigned URLs only work on the S3 API domain, not on a custom domain. |
| Supabase Storage (S3 protocol) | Supports SigV4 presigned URLs ([Supabase](https://supabase.com/docs/guides/storage/s3/compatibility)). Use the endpoint and region shown in the dashboard; path-style addressing is the safe choice. No S3 versioning.                                                                                                                                                                                          |
| Any S3-compatible service      | Set `requestChecksumCalculation: "WHEN_REQUIRED"` (and `responseChecksumValidation: "WHEN_REQUIRED"`), then upload a real file and run check 8 on your service. Reports that this fixes `SignatureDoesNotMatch` are from users, not vendors.                                                                                                                                                                    |

Not available outside AWS: Block Public Access, `s3:signatureAge`, Object Lock, CloudFront OAC, IAM roles, Access Analyzer.

---

## 13. Mistakes this blueprint exists to prevent

| Mistake                                                | What it looks like                                                                                                                                                                                                                        | Rule |
| :----------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--- |
| Authorising by tenant only                             | Any user in the tenant can open any other user's file                                                                                                                                                                                     | 3    |
| Trusting a key from the client                         | A "view" or "delete" endpoint that takes `?key=` lets anyone with a key read or delete it. Keys leak through shared records, logs and error messages                                                                                      | 2, 7 |
| A confirm step that trusts the client                  | A user "confirms" someone else's key and then reads it back through the normal link                                                                                                                                                       | 2, 5 |
| Believing `ContentType` is enforced on a presigned PUT | The JS presigner leaves `content-type` out of the signature unless you pass `signableHeaders` ([README](https://raw.githubusercontent.com/aws/aws-sdk-js-v3/main/packages/s3-request-presigner/README.md)). Use presigned POST conditions | 5    |
| No size limit                                          | One user uploads a 5 GB file to your bucket                                                                                                                                                                                               | 5    |
| Free-text `category` or file name in the key           | A caller picks any prefix, including one a bucket policy treats as public                                                                                                                                                                 | 5, 6 |
| `403` for "not yours", `404` for "missing"             | Ids can be probed                                                                                                                                                                                                                         | 3    |
| Long-lived links stored in the database                | A leaked link works for days                                                                                                                                                                                                              | 4    |
| Unescaped file name in `Content-Disposition`           | Header injection, broken downloads                                                                                                                                                                                                        | 6    |
| Rendering user-uploaded HTML or SVG inline             | Phishing or script on your storage domain. Keep the type allow-list tight, or force `attachment`                                                                                                                                          | 5    |
| Never cleaning up                                      | Orphan objects and rows pile up                                                                                                                                                                                                           | 8    |
