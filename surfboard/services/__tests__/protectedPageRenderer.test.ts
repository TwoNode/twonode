import { describe, expect, it } from "vitest";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  countPages,
  renderPage,
} from "@/surfboard/services/protectedPageRenderer";

/** A valid PDF of `pages` blank pages of 600 x 800 points, made by hand (no PDF library needed). */
function blankPdf(pages: number): Uint8Array {
  const objects: string[] = [];
  const kids = Array.from({ length: pages }, (_, i) => `${3 + i} 0 R`).join(
    " "
  );
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages} >>`);
  for (let i = 0; i < pages; i += 1) {
    objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] >>");
  }
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets)
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

/** The share of a JPEG's pixels that are not (nearly) white. */
async function inkShare(
  jpeg: Buffer
): Promise<{ share: number; width: number; height: number }> {
  const image = await loadImage(jpeg);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);
  let ink = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) ink += 1;
  }
  return {
    share: ink / (data.length / 4),
    width: image.width,
    height: image.height,
  };
}

describe("countPages", () => {
  it("counts a PDF's pages", async () => {
    expect(await countPages(blankPdf(3), "pdf")).toBe(3);
  });

  it("counts a picture as one page", async () => {
    expect(await countPages(new Uint8Array([1, 2, 3]), "png")).toBe(1);
  });

  it("refuses bytes that are not a PDF", async () => {
    await expect(
      countPages(new TextEncoder().encode("not a pdf"), "pdf")
    ).rejects.toMatchObject({
      status: 422,
      code: "FILE_NOT_VIEWABLE",
    });
  });
});

describe("renderPage: a PDF", () => {
  it("makes a JPEG of the page, scaled to a readable size", async () => {
    const jpeg = await renderPage(blankPdf(1), "pdf", 1, "Draft_AB123");
    expect([jpeg[0], jpeg[1]]).toEqual([0xff, 0xd8]);
    const { width, height } = await inkShare(jpeg);
    // 600 x 800 points is scaled up so the long side is 1400 pixels.
    expect(height).toBe(1400);
    expect(width).toBe(1050);
  });

  it("burns the watermark into the page: a BLANK page comes out marked all over, not white", async () => {
    const { share } = await inkShare(
      await renderPage(blankPdf(1), "pdf", 1, "Draft_AB123")
    );
    // The words cover a real part of the page, in every corner of it.
    expect(share).toBeGreaterThan(0.02);
  });

  it("depends on the words: another SURCON number is another picture", async () => {
    const a = await renderPage(blankPdf(1), "pdf", 1, "Draft_AB123");
    const b = await renderPage(blankPdf(1), "pdf", 1, "Draft_ZZ999");
    expect(Buffer.compare(a, b)).not.toBe(0);
  });

  it("marks every page, not only the first", async () => {
    const { share } = await inkShare(
      await renderPage(blankPdf(3), "pdf", 3, "Draft_AB123")
    );
    expect(share).toBeGreaterThan(0.02);
  });

  it("is a 404 for a page that is not there", async () => {
    for (const page of [0, 4, -1, 1.5]) {
      await expect(
        renderPage(blankPdf(3), "pdf", page, "Draft_X")
      ).rejects.toMatchObject({
        status: 404,
      });
    }
  });

  it("is refused for bytes that are not a PDF, and never a clean page", async () => {
    await expect(
      renderPage(new TextEncoder().encode("hello"), "pdf", 1, "Draft_X")
    ).rejects.toMatchObject({ status: 422, code: "FILE_NOT_VIEWABLE" });
  });
});

describe("renderPage: a picture", () => {
  async function png(width: number, height: number): Promise<Uint8Array> {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    return new Uint8Array(await canvas.encode("png"));
  }

  it("is one page, marked like a PDF page", async () => {
    const jpeg = await renderPage(await png(800, 600), "png", 1, "Draft_AB123");
    const { share, width, height } = await inkShare(jpeg);
    expect([width, height]).toEqual([800, 600]);
    expect(share).toBeGreaterThan(0.02);
  });

  it("is made smaller when it is huge, and never blown up when it is small", async () => {
    const big = await inkShare(
      await renderPage(await png(6000, 3000), "png", 1, "Draft_X")
    );
    expect(Math.max(big.width, big.height)).toBe(2400);
    const small = await inkShare(
      await renderPage(await png(200, 100), "png", 1, "Draft_X")
    );
    expect([small.width, small.height]).toEqual([200, 100]);
  }, 60_000);

  it("has no second page", async () => {
    await expect(
      renderPage(await png(100, 100), "png", 2, "Draft_X")
    ).rejects.toMatchObject({ status: 404 });
  });

  it("is refused when the bytes are not a picture", async () => {
    await expect(
      renderPage(new TextEncoder().encode("nope"), "png", 1, "Draft_X")
    ).rejects.toMatchObject({ status: 422, code: "FILE_NOT_VIEWABLE" });
  });
});
