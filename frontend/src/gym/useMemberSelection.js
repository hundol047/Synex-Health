import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useGym } from "./GymContext.jsx";
export default function useMemberSelection() {
  const { state, update } = useGym();
  const [params] = useSearchParams();
  const requested = params.get("member");
  const valid = (id) => state.members.some((m) => m.id === id);
  const [id, setId] = useState(() =>
    valid(requested)
      ? requested
      : valid(state.selected)
        ? state.selected
        : state.members[0]?.id || "",
  );
  const [error, setError] = useState("");
  useEffect(() => {
    if (requested && state.members.some((m) => m.id === requested))
      setId(requested);
  }, [requested]);
  async function select(value) {
    setId(value);
    setError("");
    try {
      await update((s) => {
        s.selected = value;
      });
    } catch (e) {
      setError(e.message);
    }
  }
  return [id, select, error];
}
