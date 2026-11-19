import { PDFDocument } from "pdf-lib";
import { Capacitor, registerPlugin } from "@capacitor/core";

const exporter = registerPlugin("BenefitPdf");
// PDF points measured from the top of the December 2025 NHIS appendix pages.
// Draw only in applicant fields. Signatures, consent and issuer certification stay blank.
const fields = {
  prevent: [["name", 130, 163, 190], ["phone", 196, 189, 305], ["address", 130, 233, 390], ["name", 365, 390, 95]],
  manage: [["name", 138, 204, 138], ["phone", 199, 253, 307], ["address", 160, 287, 362]],
  assessment: [["name", 185, 167, 100]],
  program: [["name", 160, 114, 115]],
  conversion: [["name", 145, 177, 84], ["phone", 236, 177, 136], ["address", 145, 218, 364], ["name", 335, 368, 80], ["mark", 399, 84, 16]],
};
const clinicDelegate = [["birth", 305, 198, 77], ["name", 237, 475, 101], ["birth", 395, 475, 122]];
function stamp(context, value, x, y, width) {
  if (!value) return;
  const size = Math.min(11, 11 * width / Math.max(1, context.measureText(value).width));
  context.save();
  context.font = size + 'px sans-serif';
  context.fillText(value, x, y + 10, width);
  context.restore();
}

export async function createBenefitPdf(forms, input) {
  const doc = await PDFDocument.create();
  const data = { ...input, mark: "✓" };
  for (const kind of forms) {
    const response = await fetch("/nhis/" + kind + ".pdf");
    if (!response.ok) throw Error("공단 서식을 열 수 없습니다.");
    const template = await PDFDocument.load(await response.arrayBuffer());
    const pages = await doc.copyPages(template, template.getPageIndices());
    pages.forEach(page => doc.addPage(page));
    const layout = [...(fields[kind] || [])];
    if (kind === "manage" && forms.includes("clinic")) layout.push(...clinicDelegate);
    if (!layout.length) continue;
    const page = pages[0];
    const { width, height } = page.getSize();
    const canvas = document.createElement("canvas");
    canvas.width = width * 3;
    canvas.height = height * 3;
    const context = canvas.getContext("2d");
    context.scale(3, 3);
    context.font = "11px sans-serif";
    for (const [key, x, y, maxWidth] of layout) stamp(context, data[key], x, y, maxWidth);
    const overlay = await doc.embedPng(canvas.toDataURL("image/png"));
    page.drawImage(overlay, { x: 0, y: 0, width, height });
  }
  doc.setTitle("건강생활실천지원금제 서류");
  return doc;
}

export async function saveBenefitPdf(forms, input, filename) {
  const doc = await createBenefitPdf(forms, input);
  if (Capacitor.getPlatform() === "android") {
    const result = await exporter.save({ filename, data: await doc.saveAsBase64() });
    return result.saved;
  }
  const blob = new Blob([await doc.save()], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}
