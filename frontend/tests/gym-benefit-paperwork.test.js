import { describe, expect, it } from "vitest";
import { applicationChecklist, applicationPacket } from "../src/gym/benefitPaperwork.js";

describe("NHIS document selection", () => {
  it("adds the optional assessment only when selected and includes clinic consent for delegation", () => {
    expect(applicationPacket("manage", "clinic", true)).toEqual(["manage","clinic","assessment"]);
    expect(applicationPacket("manage", "visit", false)).toEqual(["manage"]);
    expect(applicationPacket("prevent", "fax", false)).toEqual(["prevent"]);
  });
  it("distinguishes fax attachments, conditional screening records and guardian evidence", () => {
    expect(applicationChecklist("prevent","fax",false).join(" ")).toMatch(/신분증 사본.*일반건강검진 통보서.*원본/);
    expect(applicationChecklist("manage","visit",true).join(" ")).toMatch(/법정대리인 신분증 사본.*기본증명서/);
    expect(applicationChecklist("manage","online",false).join(" ")).not.toMatch(/신분증 사본/);
  });
});
