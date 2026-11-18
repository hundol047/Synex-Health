import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { recognizeComposition } from "../src/gym/ocr.js";
import { createWorker } from "tesseract.js";

vi.mock("tesseract.js", () => ({ createWorker: vi.fn() }));

it("requests OCR models at filenames preserved by Android packaging", async () => {
  const worker = {
    recognize: vi.fn().mockResolvedValue({ data: { text: "체중 72.4" } }),
    terminate: vi.fn(),
  };
  createWorker.mockResolvedValue(worker);
  const result = await recognizeComposition("photo", vi.fn());
  const [languages, , options] = createWorker.mock.calls[0];
  expect(languages).toEqual(["kor", "eng"]);
  expect(options.gzip).toBe(false);
  for (const language of languages) {
    const model = readFileSync(join("public", options.langPath, language + ".traineddata"));
    expect(Array.from(model.subarray(0, 2))).toEqual([0x1f, 0x8b]);
  }
  expect(result.values.weight).toBe("72.4");
  expect(worker.terminate).toHaveBeenCalledOnce();
});
