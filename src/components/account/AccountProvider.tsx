'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PatientApi } from '@/lib/account/patientApi';
import { readSession, SESSION_EVENT, type PatientSession } from '@/lib/account/session';

type Ctx = {
  api: PatientApi;
  /** null until mounted (server render) and when signed out */
  session: PatientSession | null;
  /** true once the stored session has been read on the client */
  ready: boolean;
  signOut: () => void;
};

const AccountContext = createContext<Ctx | null>(null);

export function useAccount(): Ctx {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside <AccountProvider>');
  return ctx;
}

/** Patient sign-in state for the whole site (header, booking form, My account). */
export function AccountProvider({ baseUrl, clinicSlug, children }: { baseUrl: string; clinicSlug: string; children: ReactNode }) {
  const api = useMemo(() => new PatientApi(baseUrl, clinicSlug), [baseUrl, clinicSlug]);
  const [session, setSession] = useState<PatientSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setSession(readSession());
    sync();
    setReady(true);
    window.addEventListener(SESSION_EVENT, sync);
    return () => window.removeEventListener(SESSION_EVENT, sync);
  }, []);

  const signOut = useCallback(() => api.logout(), [api]);

  const value = useMemo<Ctx>(() => ({ api, session, ready, signOut }), [api, session, ready, signOut]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
