'use client';

import { useEffect } from 'react';
import { BookingForm } from './BookingForm';
import { useBooking } from './BookingProvider';

/** /book page: the same form as the popup, pre-selected from ?problem= / ?treatment= / ?doctor=. */
export function BookPageForm() {
  const { applyPrefill } = useBooking();
  useEffect(() => {
    // Read after mount (not useSearchParams) so the page stays statically rendered.
    const q = new URLSearchParams(window.location.search);
    applyPrefill({ problem: q.get('problem'), treatment: q.get('treatment'), doctor: q.get('doctor') });
  }, [applyPrefill]);
  return <BookingForm variant="page" />;
}
