'use client';
import { useMode } from '@/components/providers/ModeProvider';
export default function ModeView({ engineer, recruiter }: { engineer: React.ReactNode; recruiter: React.ReactNode }) {
  const { mode, ready } = useMode();
  return <>{ready && mode === 'recruiter' ? recruiter : engineer}</>;
}
