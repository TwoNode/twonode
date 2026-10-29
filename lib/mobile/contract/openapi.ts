import { z } from "zod/v4";
import {
  ENDPOINTS,
  type Access,
  type Endpoint,
  type Param,
} from "@/lib/mobile/contract/endpoints";
import {
  ERROR_CODES,
  UNCODED,
  type ErrorCode,
} from "@/lib/mobile/contract/errorCodes";
import * as S from "@/lib/mobile/contract/schemas";

/**
 * Builds the OpenAPI 3.1 document for the mobile surface from `endpoints.ts`
 * and `schemas.ts` (TASK-0015 1C.1, 1C.2). Nothing is written by hand: the
 * checked-in copy at `docs/mobile/openapi.json` is compared with this output by
 * a test, so the file cannot drift from the code.
 *
 * Versioning: `info.version` is bumped by hand when a change could break an
 * installed app (a field removed, renamed or retyped, a route moved, a code
 * changed): the major number. Anything an old app can ignore (a new field, a
 * new route) is the minor number. Record it in `docs/mobile/CHANGELOG-openapi.md`.
 */
export const OPENAPI_VERSION = "1.0.0";

const SCHEMA_URI = (id: string) => `#/components/schemas/${id}`;

/** Every named schema in `schemas.ts`, found by the `id` it was given. */
function namedSchemas() {
  const registry = z.registry<{ id: string; description?: string }>();
  for (const value of Object.values(S)) {
    if (!(value instanceof z.core.$ZodType)) continue;
    const meta = z.globalRegistry.get(value) as { id?: string } | undefined;
    if (meta?.id) registry.add(value, meta as { id: string });
  }
  return registry;
}

type Json = Record<string, unknown>;

/** The pattern zod writes for these formats is long and adds nothing a reader needs. */
const FORMATS_WITHOUT_PATTERN = new Set(["email", "uuid", "date-time"]);

/**
 * Tidies what zod emits: points a bare id (`"PlanSummary"`) at its place in the
 * document, and drops the safe-integer bounds it adds to every `.int()` and the
 * long pattern it adds to a format.
 */
function tidy(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(tidy);
  if (!value || typeof value !== "object") return value;
  const source = value as Json;
  const entries = Object.entries(source).filter(([key, inner]) => {
    if (key === "pattern" && FORMATS_WITHOUT_PATTERN.has(String(source.format)))
      return false;
    if (key === "maximum" && inner === Number.MAX_SAFE_INTEGER) return false;
    if (key === "minimum" && inner === Number.MIN_SAFE_INTEGER) return false;
    return true;
  });
  return Object.fromEntries(
    entries.map(([key, inner]) => [
      key,
      key === "$ref" && typeof inner === "string" && !inner.startsWith("#")
        ? SCHEMA_URI(inner)
        : tidy(inner),
    ])
  );
}

/** A standalone schema for a request or answer part, with the named schemas left as references. */
function inline(schema: z.ZodType): Json {
  const generated = z.toJSONSchema(schema, {
    io: "input",
    external: { registry: namedSchemas(), defs: {} },
  } as never) as Json;
  return bare(tidy(generated) as Json);
}

/** Drops the keys that only make sense at the root of a standalone schema. */
function bare(schema: Json): Json {
  const rest = { ...schema };
  delete rest.$schema;
  delete rest.$id;
  delete rest.id;
  return rest;
}

const ACCESS_TEXT: Record<Access, string> = {
  public: "No session needed.",
  surveyor:
    "A signed-in surveyor (role USER). Held at the email verification gate while enforcement is on: an unverified account whose grace has ended gets 403 EMAIL_VERIFICATION_REQUIRED.",
  "surveyor-unverified":
    "A signed-in surveyor (role USER). Allowed while the email is unverified.",
  "signed-in-unverified":
    "Any signed-in role. Allowed while the email is unverified.",
};

function parameter(param: Param): Json {
  return {
    name: param.name,
    in: param.in,
    required: param.in === "path" ? true : Boolean(param.required),
    description: param.description,
    schema: inline(param.schema),
    example: param.example,
  };
}

const errorResponse = (codes: ErrorCode[]): Json => ({
  description: codes
    .map((code) => `\`${code}\`: ${ERROR_CODES[code].meaning}`)
    .join(" "),
  content: { "application/json": { schema: { $ref: SCHEMA_URI("Error") } } },
  "x-error-codes": codes,
});

/** Failures a call can have because of how it is let in, whatever else it does. */
function commonErrors(endpoint: Endpoint): ErrorCode[] {
  const codes: ErrorCode[] = [];
  if (endpoint.access !== "public") codes.push("UNAUTHENTICATED");
  if (endpoint.access === "surveyor") codes.push("EMAIL_VERIFICATION_REQUIRED");
  if (
    endpoint.access === "surveyor" ||
    endpoint.access === "surveyor-unverified"
  )
    codes.push("FORBIDDEN");
  if (endpoint.versionGate) codes.push("APP_UPDATE_REQUIRED");
  return codes;
}

function operation(endpoint: Endpoint): Json {
  const dataEnvelope = inline(S.envelope(endpoint.data));

  const byStatus = new Map<number, ErrorCode[]>();
  const all = Array.from(
    new Set([...commonErrors(endpoint), ...(endpoint.errors ?? [])])
  );
  for (const code of all) {
    const status = ERROR_CODES[code].status;
    byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
  }

  const responses: Json = {
    "200": {
      description: "Success.",
      ...(endpoint.noStore
        ? {
            headers: {
              "Cache-Control": {
                schema: { type: "string", const: "no-store" },
              },
            },
          }
        : {}),
      content: {
        "application/json": {
          schema: dataEnvelope,
        },
      },
    },
  };
  for (const [status, codes] of [...byStatus].sort(([a], [b]) => a - b)) {
    responses[String(status)] = errorResponse(codes);
  }

  const parameters: Json[] = [];
  if (endpoint.versionGate) {
    parameters.push(
      { $ref: "#/components/parameters/AppVersion" },
      { $ref: "#/components/parameters/AppPlatform" }
    );
  }
  for (const param of endpoint.params ?? []) parameters.push(parameter(param));

  return {
    operationId: endpoint.operationId,
    tags: [endpoint.tag],
    summary: endpoint.summary,
    description: [endpoint.description, ACCESS_TEXT[endpoint.access]]
      .filter(Boolean)
      .join("\n\n"),
    ...(endpoint.access === "public"
      ? { security: [] }
      : { security: [{ bearer: [] }] }),
    ...(parameters.length ? { parameters } : {}),
    ...(endpoint.body
      ? {
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: inline(endpoint.body.schema),
                example: endpoint.body.example,
              },
            },
          },
        }
      : {}),
    responses,
  };
}

export function buildOpenApiDocument(): Json {
  const registry = namedSchemas();
  const generated = z.toJSONSchema(registry, {
    io: "input",
    uri: SCHEMA_URI,
  } as never) as { schemas: Record<string, Json> };
  const schemas = Object.fromEntries(
    Object.entries(generated.schemas)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, schema]) => [id, bare(tidy(schema) as Json)])
  );

  const paths: Record<string, Record<string, Json>> = {};
  for (const endpoint of ENDPOINTS) {
    (paths[endpoint.path] ??= {})[endpoint.method] = operation(endpoint);
  }

  const tags = Array.from(
    new Set(ENDPOINTS.map((endpoint) => endpoint.tag))
  ).map((name) => ({ name }));

  return JSON.parse(
    JSON.stringify({
      openapi: "3.1.0",
      info: {
        title: "Surfboard mobile API",
        version: OPENAPI_VERSION,
        description:
          "The calls the Surfboard mobile app makes. Generated from `lib/mobile/contract` in the API repository: do not edit by hand. Every success is `{ success: true, data }`; every failure is `{ success: false, error, code?, details? }`. Dates are ISO 8601 in UTC. Objects are open: a newer server may add a field, and an app must ignore what it does not know.",
      },
      servers: [
        { url: "/", description: "The API host the app is built for." },
      ],
      tags,
      paths,
      components: {
        securitySchemes: {
          bearer: {
            type: "http",
            scheme: "bearer",
            description:
              "The 15-minute access token from `login` or `refresh`.",
          },
        },
        parameters: {
          AppVersion: {
            name: "X-App-Version",
            in: "header",
            required: true,
            description:
              "The app's version, for example `1.4.2`. With a minimum set on the server, a call without it is refused with 426.",
            schema: { type: "string" },
          },
          AppPlatform: {
            name: "X-App-Platform",
            in: "header",
            required: true,
            description: "Which store the build is from.",
            schema: { type: "string", enum: ["android", "ios"] },
          },
        },
        schemas,
      },
      "x-error-codes": Object.fromEntries(
        Object.entries(ERROR_CODES).map(([code, entry]) => [
          code,
          {
            status: entry.status,
            meaning: entry.meaning,
            appDoes: entry.appDoes,
          },
        ])
      ),
      "x-uncoded-failures": UNCODED,
    })
  );
}
