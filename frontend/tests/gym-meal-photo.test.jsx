import React from "react";
import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Coaching } from "../src/gym/MemberPages.jsx";
import { freshMember } from "../src/gym/store.js";
import { useGym } from "../src/gym/GymContext.jsx";
import { photoData } from "../src/gym/photos.js";

vi.mock("../src/gym/GymContext.jsx", () => ({ useGym: vi.fn() }));
vi.mock("../src/gym/photos.js", () => ({ photoData: vi.fn() }));

it("requires a fresh photo after a failed replacement while retaining the member's note", async () => {
  const update = vi.fn();
  useGym.mockReturnValue({ state: { self: freshMember() }, update });
  const jpeg = "data:image/jpeg;base64,AA==";
  photoData.mockResolvedValueOnce(jpeg).mockRejectedValueOnce(new Error("사진을 열 수 없습니다.")).mockResolvedValueOnce(jpeg);
  const user = userEvent.setup();
  render(<MemoryRouter><Coaching /></MemoryRouter>);
  const picker = screen.getByLabelText("음식 사진 선택");
  const save = screen.getByRole("button", { name: "식단 저장하기" });
  const valid = new File(["preview"], "meal.jpg", { type: "image/jpeg" });
  const note = screen.getByLabelText("짧은 메모 · 선택");
  await user.type(note, "운동 후 점심");
  await user.upload(picker, valid);
  await screen.findByAltText("저장할 식단 미리보기");
  await user.upload(picker, new File(["broken"], "bad.jpg", { type: "image/jpeg" }));
  await screen.findByRole("alert");
  expect(screen.queryByAltText("저장할 식단 미리보기")).toBeNull();
  expect(save.disabled).toBe(true);
  expect(note.value).toBe("운동 후 점심");
  expect(update).not.toHaveBeenCalled();
  await user.upload(picker, valid);
  await screen.findByAltText("저장할 식단 미리보기");
  expect(save.disabled).toBe(false);
});
