import { describe, expect, it } from "vitest";
import { ENDPOINTS } from "@/lib/mobile/contract/endpoints";
import { ERROR_CODES } from "@/lib/mobile/contract/errorCodes";
import { buildOpenApiDocument } from "@/lib/mobile/contract/openapi";

type Doc = ReturnType<typeof buildOpenApiDocument> & {
  paths: Record<
    string,
    Record<
      string,
      {
        operationId: string;
        parameters?: { name?: string; in?: string; $ref?: string }[];
        responses: Record<string, { "x-error-codes"?: string[] }>;
      }
    >
  >;
  components: {
    schemas: Record<string, unknown>;
    parameters: Record<string, unknown>;
  };
};
const doc = buildOpenApiDocument() as Doc;

/** Every `$ref` in a value. */
function refs(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((item) => refs(item, out));
  else if (value && typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      if (key === "$ref" && typeof inner === "string") out.push(inner);
      else refs(inner, out);
    }
  }
  return out;
}

describe("the published OpenAPI document", () => {
  it("is the checked-in file docs/mobile/openapi.json (run `npm run docs:openapi` after a deliberate change)", async () => {
    await expect(`${JSON.stringify(doc, null, 2)}\n`).toMatchFileSnapshot(
      "../../../../docs/mobile/openapi.json"
    );
  });

  it("describes every endpoint once, with a unique operation id", () => {
    const ids = Object.values(doc.paths).flatMap((methods) =>
      Object.values(methods).map((op) => op.operationId)
    );
    expect(ids).toHaveLength(ENDPOINTS.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(ENDPOINTS.map((e) => `${e.method} ${e.path}`)).size).toBe(
      ENDPOINTS.length
    );
  });

  it("has no reference that points nowhere", () => {
    const missing = refs(doc).filter((ref) => {
      const [, kind, name] =
        /^#\/components\/(schemas|parameters)\/(.+)$/.exec(ref) ?? [];
      return (
        !kind ||
        !(
          name in
          (doc.components as Record<string, Record<string, unknown>>)[kind]
        )
      );
    });
    expect(missing).toEqual([]);
  });

  it("declares every {placeholder} in a path as a path parameter", () => {
    for (const [route, methods] of Object.entries(doc.paths)) {
      const placeholders = Array.from(
        route.matchAll(/\{(\w+)\}/g),
        (m) => m[1]
      );
      for (const op of Object.values(methods)) {
        const declared = (op.parameters ?? [])
          .filter((p) => p.in === "path")
          .map((p) => p.name);
        expect(declared.sort(), `${op.operationId}`).toEqual(
          [...placeholders].sort()
        );
      }
    }
  });

  it("leaves no stray JSON Schema root keys in the components", () => {
    for (const [name, schema] of Object.entries(doc.components.schemas)) {
      expect(Object.keys(schema as object), name).not.toContain("$schema");
      expect(Object.keys(schema as object), name).not.toContain("$id");
      expect(Object.keys(schema as object), name).not.toContain("id");
    }
  });

  it("only names failure codes that are in the catalogue, with the status the catalogue gives", () => {
    for (const methods of Object.values(doc.paths)) {
      for (const op of Object.values(methods)) {
        for (const [status, response] of Object.entries(op.responses)) {
          for (const code of response["x-error-codes"] ?? []) {
            expect(ERROR_CODES, `${op.operationId} ${code}`).toHaveProperty(
              code
            );
            expect(
              String(ERROR_CODES[code as keyof typeof ERROR_CODES].status)
            ).toBe(status);
          }
        }
      }
    }
  });

  it("says the app headers are required on exactly the version-gated calls", () => {
    for (const endpoint of ENDPOINTS) {
      const op = doc.paths[endpoint.path][endpoint.method];
      const gated = (op.parameters ?? []).some(
        (p) => p.$ref === "#/components/parameters/AppVersion"
      );
      expect(gated, endpoint.operationId).toBe(endpoint.versionGate);
    }
  });
});
