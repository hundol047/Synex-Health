export function parseComposition(text) {
  // Unit brackets can be misread in compressed photos. Skip a short noisy
  // parenthesized unit only if a separate measurement follows it.
  const lines = text.normalize("NFKC").split(/\r?\n/);
  const read = (words, unit, min, max) => {
    for (const word of words) {
      const label = word.replaceAll(" ", "").split("").join("\\s*");
      const pattern = new RegExp(
        label + String.raw`[)\]]?[\s:|·=]*(?:(?:[<(]\s*(?!(?:lbs?\b|in\b|ft\b|st\b|kg\b|cm\b|%))[0-9A-Za-z%]{1,3}\s*[)>])(?=\s*[:|]?\s*\d))?(?:[([]?\s*(?:${unit})\s*[)\]]?\s*)?[:|\s]*(\d{1,3}(?:[.,]\d{1,2})?)(?![\d.,])`,
        "gi",
      );
      for (const line of lines) {
        for (const match of line.matchAll(pattern)) {
          const before = line.slice(0, match.index);
          const after = line.slice(match.index + match[0].length);
          // Reference ranges and goal weights often appear beside measured values.
          if (/(?:목표|적정|권장|표준|이전|과거|target|ideal|standard|goal|previous)\s*$/i.test(before)) continue;
          if (/[a-z가-힣]$/i.test(before) || /^\s*(?:[~–—-]|to\b)\s*\d/i.test(after)) continue;
          if (/^\s*(?:lbs?|ft|inches|inch)\b/i.test(after)) continue;
          const value = Number(match[1].replace(",", "."));
          if (value >= min && value <= max) return String(value);
        }
      }
    }
    return "";
  };
  return {
    weight: read(["체중", "Weight"], "kg|ke", 20, 300),
    skeletal_muscle_mass: read(
      ["골격근량", "Skeletal Muscle Mass", "SMM"],
      "kg|ke",
      5,
      100,
    ),
    body_fat_percentage: read(["체지방률", "체지방율", "Percent Body Fat", "PBF"], "%", 1, 70),
    height: read(["신장", "키", "Height"], "cm", 80, 230),
  };
}
export async function recognizeComposition(photo, onProgress) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["kor", "eng"], 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr",
    langPath: "/ocr",
    // Android strips .gz suffixes during packaging. Use the same stable asset
    // name on both platforms; Tesseract detects compressed bytes by signature.
    gzip: false,
    workerBlobURL: false,
    logger: (m) => {
      if (m.status === "recognizing text")
        onProgress(Math.round(m.progress * 100));
    },
  });
  try {
    const result = await worker.recognize(photo);
    return {
      text: result.data.text,
      values: parseComposition(result.data.text),
    };
  } finally {
    await worker.terminate();
  }
}
