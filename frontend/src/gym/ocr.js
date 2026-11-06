export function parseComposition(text) {
  const flat = text.replace(/\r/g, "");
  const read = (words, min, max) => {
    for (const word of words) {
      const label = word.split("").join("\\s*");
      const r = new RegExp(
        label + "[^0-9\\n]{0,25}(\\d{1,3}(?:[.,]\\d{1,2})?)",
        "i",
      );
      const m = flat.match(r);
      if (m) {
        const v = Number(m[1].replace(",", "."));
        if (v >= min && v <= max) return String(v);
      }
    }
    return "";
  };
  return {
    weight: read(["체중", "Weight"], 20, 300),
    skeletal_muscle_mass: read(
      ["골격근량", "Skeletal Muscle Mass", "SMM"],
      5,
      100,
    ),
    body_fat_percentage: read(["체지방률", "Percent Body Fat", "PBF"], 1, 70),
    height: read(["신장", "Height"], 80, 230),
  };
}
export async function recognizeComposition(photo, onProgress) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["kor", "eng"], 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr",
    langPath: "/ocr",
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
