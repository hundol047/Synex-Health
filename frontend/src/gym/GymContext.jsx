import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { ensureGym, readGym, mutateGym } from "./store.js";
const Context = createContext(null);
export function GymProvider({ children }) {
  const [state, setState] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const accept = (s) => {
      if (active)
        setState((prev) =>
          !prev || (s.revision || 0) >= (prev.revision || 0) ? s : prev,
        );
    };
    const changed = (e) => {
      if (e.detail) accept(e.detail);
      else load();
    };
    const load = () =>
      readGym()
        .then((s) => {
          accept(s);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    ensureGym()
      .then(load)
      .catch((e) => setError(e.message));
    window.addEventListener("synex-gym-change", changed);
    return () => {
      active = false;
      window.removeEventListener("synex-gym-change", changed);
    };
  }, []);
  const update = useCallback(async (fn) => {
    try {
      const s = await mutateGym(fn);
      setState((prev) =>
        !prev || (s.revision || 0) >= (prev.revision || 0)
          ? structuredClone(s)
          : prev,
      );
      return s;
    } catch (e) {
      throw e;
    }
  }, []);
  if (error)
    return (
      <div role="alert">
        {error}
        <button onClick={() => location.reload()}>다시 열기</button>
      </div>
    );
  if (!state) return <p role="status">트레이닝 공간을 준비하고 있어요.</p>;
  return (
    <Context.Provider value={{ state, update }}>{children}</Context.Provider>
  );
}
export const useGym = () => useContext(Context);
