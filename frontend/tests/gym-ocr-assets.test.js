import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { parseComposition, recognizeComposition } from "../src/gym/ocr.js";
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

it("reads measured values after goal, range and unrelated labels", () => {
  const text = [
    "목표 체중 65.0", "체중 조절 26", "적정체중 69", "체중 60–80",
    "체 중 (ke) 72.4", "Standard Skeletal Muscle Mass 33",
    "골 격 근 량 (㎏) 31,2", "체지방률 (%) 18.5", "키 (007) 176",
  ].join("\n");
  expect(parseComposition(text)).toEqual({
    weight: "72.4", skeletal_muscle_mass: "31.2",
    body_fat_percentage: "18.5", height: "176",
  });
  expect(parseComposition("Target Weight 65.0\nWeight Control 25.0").weight).toBe("");
});
