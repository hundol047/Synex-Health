import React from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Schedule } from "../src/gym/CoachPages.jsx";
import { useGym } from "../src/gym/GymContext.jsx";

vi.mock("../src/gym/GymContext.jsx", () => ({ useGym: vi.fn() }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("uses the displayed week for new PT and keeps an existing PT date while browsing", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 18, 10));
  useGym.mockReturnValue({
    state: {
      selected: "member",
      members: [{
        id: "member", name: "김회원", goal: "근력 향상",
        appointments: [{ id: "pt", date: "2026-11-25", time: "19:00" }],
      }],
    },
    update: vi.fn(),
  });
  render(<MemoryRouter><Schedule /></MemoryRouter>);
  const date = screen.getByLabelText("PT 날짜");
  const click = name => fireEvent.click(screen.getByRole("button", { name, exact: true }));

  click("이전 주");
  expect(date.value).toBe("");
  click("이번 주");
  expect(date.value).toBe("2026-11-18");
  click("다음 주");
  expect(date.value).toBe("2026-11-25");
  click("2026-11-26 PT 등록");
  expect(date.value).toBe("2026-11-26");
  click("19:00 김회원");
  click("다음 주");
  expect(date.value).toBe("2026-11-25");
  click("편집 닫기");
  expect(screen.getByRole("button", { name: "2026-11-25 PT 등록" }).getAttribute("aria-pressed")).toBe("true");
});
