import { describe, it, expect } from "vitest";
import { distanceKm, findFacilities } from "../src/gym/facilities.js";

const local = ["봄 피트니스", "원주시 봄길 1", "", "2026-01-01", "", [37.3, 127.9, "반곡동"]];
const distant = ["서울 헬스", "서울특별시", "", "", "", [37.55, 127.05, "역삼동"]];
const noPin = ["강원 짐", "원주시 원일로", "", "", "", null];
const rows = [distant, noPin, local, ["수영장", "원주시", "", "", "", local[5]], ["만료 헬스", "원주시", "", "", "2026-01-01", local[5]]];
describe("support facility search", () => {
  const filters = { position: [37.3,127.9], gyms: true, date: "2026-11-19", query: "" };
  it("ranks registered neighbourhoods near the user and excludes expired listings", () => {
    expect(findFacilities(rows, filters).map(x=>x.name)).toEqual(["봄 피트니스"]);
    expect(distanceKm(filters.position, local[5])).toBe(0);
  });
  it("finds addresses with unknown coordinates by region and keeps sports filters separate", () => {
    expect(findFacilities(rows,{...filters,position:null,query:"원주시",gyms:false}).map(x=>x.name)).toEqual(["강원 짐","봄 피트니스","수영장"]);
    expect(findFacilities(rows,{...filters,query:"원주시 봄길"})).toHaveLength(1);
  });
});
