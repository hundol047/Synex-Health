import React from "react";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WorkoutSession from "../src/gym/WorkoutSession.jsx";
import { HealthAPI } from "../src/shared/lib/api.js";
import { entryFor, newSession } from "../src/gym/workflow.js";
import { useGym } from "../src/gym/GymContext.jsx";

vi.mock("../src/gym/GymContext.jsx", () => ({ useGym: vi.fn() }));
vi.mock("../src/shared/lib/api.js", () => ({
  HealthAPI: { getProfile: vi.fn(), latestMeasurement: vi.fn() },
}));
vi.mock("../src/health/components/exercise/ExerciseMotion3D.jsx", () => ({
  default: ({ measurement, profile }) => <output data-testid="rendered-body">
    {JSON.stringify({ measurement, profile })}
  </output>,
}));

const dialog = HTMLDialogElement.prototype;
const polyfills = {
  showModal() { this.setAttribute("open", ""); },
  close() { this.removeAttribute("open"); },
};
const missingMethods = Object.keys(polyfills).filter(key => !dialog[key]);
beforeAll(() => {
  for (const key of missingMethods) Object.defineProperty(dialog, key, { configurable: true, value: polyfills[key] });
});
afterAll(() => { for (const key of missingMethods) delete dialog[key]; });

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function openDemo() {
  const option = { id: "standard", name: "오늘의 운동", exercises: [entryFor("squat")] };
  const session = newSession({ id: "plan" }, option);
  useGym.mockReturnValue({ state: { self: { session } }, update: vi.fn().mockResolvedValue({}) });
  render(<MemoryRouter><WorkoutSession/></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "3D 동작 시범 보기" }));
  return screen.findByTestId("rendered-body");
}

it("uses the member's most recent measurement and profile when opening a trainer's demonstration", async () => {
  const measurement = { weight: 62, skeletal_muscle_mass: 24 };
  HealthAPI.getProfile.mockResolvedValue({ gender: "female", height: 158, name: "회원" });
  HealthAPI.latestMeasurement.mockResolvedValue(measurement);
  const body = await openDemo();
  await waitFor(() => expect(JSON.parse(body.textContent)).toEqual({
    measurement, profile: { gender: "female", height_cm: 158 },
  }));
});

it("opens with profile height even when the member has never saved a measurement", async () => {
  HealthAPI.getProfile.mockResolvedValue({ gender: "unspecified", height: 185 });
  HealthAPI.latestMeasurement.mockRejectedValue(Object.assign(new Error(), { status: 404 }));
  const body = await openDemo();
  await waitFor(() => expect(JSON.parse(body.textContent)).toEqual({
    profile: { gender: "unspecified", height_cm: 185 },
  }));
});
