import { useState, useEffect, useCallback, useRef } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Subscribes to a Firestore document under the "ana" collection.
 * Returns [data, save, ready].
 *
 * - data: current value (falls back to `fallback` if doc doesn't exist)
 * - save: async function to persist a new value
 * - ready: boolean — true once the first snapshot has resolved
 */
export function useFirestore(docPath, fallback) {
  const [data, setData] = useState(fallback);
  const [ready, setReady] = useState(false);
  const fallbackRef = useRef(fallback);

  useEffect(() => {
    const ref = doc(db, "ana", docPath);
    const unsub = onSnapshot(ref, snap => {
      setData(snap.exists() ? (snap.data().value ?? fallbackRef.current) : fallbackRef.current);
      setReady(true);
    });
    return unsub;
  }, [docPath]);

  const save = useCallback(
    async val => {
      const next = typeof val === "function" ? val(data) : val;
      setData(next);
      await setDoc(doc(db, "ana", docPath), { value: next });
    },
    [docPath, data]
  );

  return [data, save, ready];
}
