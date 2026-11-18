import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Feedback } from "../src/gym/CoachPages.jsx";
import { GymProvider } from "../src/gym/GymContext.jsx";
import { freshMember, transferFor } from "../src/gym/store.js";
import { loadLocalDocument, saveLocalDocument } from "../src/shared/lib/offline.js";

vi.mock("../src/shared/lib/offline.js", () => ({
  loadLocalDocument: vi.fn(), saveLocalDocument: vi.fn(),
}));

describe("trainer workout feedback", () => {
  it("restores an idle draft, only shares the published reply, and keeps saved corrections across reloads", async () => {
    const member = freshMember("회원");
    member.logs.push({ id: "session", name: "기본 루틴", date: "2026-11-17", effort: "적당했어요" });
    let stored = { coachId: "coach", members: [member], selected: member.id };
    loadLocalDocument.mockImplementation(async () => structuredClone(stored));
    saveLocalDocument.mockImplementation(async state => { stored = structuredClone(state); });
    const open = () => render(<MemoryRouter><GymProvider><Feedback/></GymProvider></MemoryRouter>);
    const user = userEvent.setup();
    const first = open();
    await user.click(await screen.findByText("운동 코멘트 작성"));
    const draft = "다음 수업에서 시트 높이를 같이 확인해요.";
    fireEvent.change(screen.getByRole("textbox", { name: "운동 코멘트" }), { target: { value: draft } });
    await screen.findByText("이 기기에 임시 저장됨", {}, { timeout: 3000 });
    expect(transferFor(stored, "coach", stored.members[0]).workoutFeedback).toEqual([]);
    first.unmount();
    const second = open();
    await user.click(await screen.findByText("운동 코멘트 이어 쓰기"));
    const field = screen.getByRole("textbox", { name: "운동 코멘트" });
    expect(field.value).toBe(draft);
    fireEvent.change(field, { target: { value: "마지막 세트도 확인했어요." } });
    await user.click(screen.getByRole("button", { name: "운동 코멘트 저장" }));
    await waitFor(() => expect(stored.members[0].logs[0].feedback).toBe("마지막 세트도 확인했어요."));
    expect(stored.members[0].logs[0].feedbackDraft).toBeUndefined();
    second.unmount();
    open();
    await user.click(await screen.findByText("운동 코멘트 확인·수정"));
    expect(screen.getByRole("textbox", { name: "운동 코멘트" }).value).toBe("마지막 세트도 확인했어요.");
  });
});
