// TASK-0011 Phase 2: new REVA uploads go under private/reva/<request>/ so the
// bucket policy can keep them private; they are opened through the REVA file
// gateway (/api/v1/reva/files/view) or the one-time download code.

/** A file name that cannot climb out of its folder or hide as a dot file. */
export function safeUploadFileName(name: string): string {
  const cleaned = name
    .replace(/[\\/\0]/g, "_")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/^\.+/, "")
    .trim();
  return cleaned || "file";
}

/** The folder segment for a request: its reference, or a catch-all before one exists. */
function folderFor(reference: string): string {
  const cleaned = reference.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
  return cleaned || "unassigned";
}

export function revaUploadKey(input: {
  reference?: string;
  fileName: string;
  /** Keep the file's own name (reports) instead of a unique prefix. */
  direct?: boolean;
  uniqueSuffix: string;
}): string {
  const name = safeUploadFileName(input.fileName);
  const folder = folderFor(input.reference ?? "");
  return input.direct
    ? `private/reva/${folder}/${name}`
    : `private/reva/${folder}/${input.uniqueSuffix}-${name}`;
}
