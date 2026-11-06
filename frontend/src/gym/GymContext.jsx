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
    const load = () =>
      readGym()
        .then((s) => {
          if (active) setState(s);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    ensureGym()
      .then(load)
      .catch((e) => setError(e.message));
    window.addEventListener("synex-gym-change", load);
    return () => {
      active = false;
      window.removeEventListener("synex-gym-change", load);
    };
  }, []);
  const update = useCallback(async (fn) => {
    try {
      const s = await mutateGym(fn);
      setState(structuredClone(s));
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
