import { describe, expect, it } from "vitest";
import { readUploadApiErrorMessage } from "@/lib/api-upload-error";

describe("readUploadApiErrorMessage", () => {
  it("returns tooLarge message for 413", async () => {
    const res = new Response("<html>413</html>", { status: 413 });
    const msg = await readUploadApiErrorMessage(res, {
      fallback: "Upload failed",
      tooLarge: "File too large for proxy",
    });
    expect(msg).toBe("File too large for proxy");
  });

  it("parses JSON error body", async () => {
    const res = new Response(JSON.stringify({ error: "Unsupported file type" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
    const msg = await readUploadApiErrorMessage(res, {
      fallback: "Upload failed",
      tooLarge: "too large",
    });
    expect(msg).toBe("Unsupported file type");
  });
});
