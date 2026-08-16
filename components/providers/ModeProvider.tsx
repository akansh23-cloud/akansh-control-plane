'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Mode = 'engineer' | 'recruiter';
type ModeContextValue = { mode: Mode; setMode: (mode: Mode) => void; toggle: () => void; ready: boolean };
const ModeContext = createContext<ModeContextValue>({ mode: 'engineer', setMode: () => undefined, toggle: () => undefined, ready: false });
export const MODE_STORAGE_KEY = 'cp.mode';
export const modeBootScript = `(function(){try{var m=localStorage.getItem('cp.mode');document.documentElement.dataset.mode=(m==='recruiter'||m==='engineer')?m:'engineer';}catch(e){document.documentElement.dataset.mode='engineer';}})();`;

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>('engineer');
  const [ready, setReady] = useState(false);
  useEffect(() => { const stored = document.documentElement.dataset.mode; if (stored === 'recruiter' || stored === 'engineer') setModeState(stored); setReady(true); }, []);
  const setMode = useCallback((next: Mode) => { setModeState(next); document.documentElement.dataset.mode = next; try { localStorage.setItem(MODE_STORAGE_KEY, next); } catch {} }, []);
  const toggle = useCallback(() => setMode(mode === 'engineer' ? 'recruiter' : 'engineer'), [mode, setMode]);
  const value = useMemo(() => ({ mode, setMode, toggle, ready }), [mode, setMode, toggle, ready]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}
export const useMode = () => useContext(ModeContext);
