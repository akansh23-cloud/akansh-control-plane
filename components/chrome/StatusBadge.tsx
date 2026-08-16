'use client';
import { useState } from 'react';
import { profile } from '@/data/profile';
export default function StatusBadge() {
  const [open, setOpen] = useState(false);
  return <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}><button type="button" onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onClick={() => setOpen(v => !v)} aria-expanded={open} className="flex items-center gap-2 border border-line px-2.5 py-1.5"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full rounded-full bg-pulse opacity-60 engineer-only motion-safe:animate-ping" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pulse" /></span><span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-chalk">Available</span></button>{open && <div className="surface absolute right-0 top-[calc(100%+0.5rem)] w-56 p-3"><p className="label mb-2">Open to</p><ul className="space-y-1">{profile.primaryCapabilities.slice(0,6).map(item => <li key={item} className="mono-sm text-mist">{item}</li>)}</ul></div>}</div>;
}
