import React from "react";
import { it, expect, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
vi.mock("../src/gym/store.js", () => ({
  ensureGym: vi.fn(async () => {}),
  readGym: vi.fn(),
  mutateGym: vi.fn(),
}));
import { readGym } from "../src/gym/store.js";
import { GymProvider, useGym } from "../src/gym/GymContext.jsx";
function Probe() {
  return <span>Revision {useGym().state.revision}</span>;
}
it("does not let a delayed startup read overwrite a newer completed save", async () => {
  let resolve;
  readGym.mockReturnValue(new Promise((r) => (resolve = r)));
  render(
    <GymProvider>
      <Probe />
    </GymProvider>,
  );
  await act(async () => {
    window.dispatchEvent(
      new CustomEvent("synex-gym-change", { detail: { revision: 9 } }),
    );
  });
  expect(screen.getByText("Revision 9")).toBeTruthy();
  await act(async () => resolve({ revision: 1 }));
  expect(screen.getByText("Revision 9")).toBeTruthy();
  cleanup();
});
