import { ArrowLeft, CircleHelp } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[#f3f0e8] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#ded8ca] bg-[#fbfaf5] p-8 text-center shadow-[0_12px_30px_rgba(48,53,42,.07)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e4eee8] text-[#39826a]"><CircleHelp size={28} /></div>
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#347b65]">QA / dispatch control</p>
        <h1 className="mt-2 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.04em] text-[#28453d]">That page isn’t on the board</h1>
        <p className="mt-2 text-sm text-[#78827a]">The view you requested could not be found.</p>
        <Link href="/" data-testid="link-back-to-board" className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-lg bg-[#1e765e] px-4 py-2.5 text-sm font-bold text-white"><ArrowLeft size={15} /> Back to board</Link>
      </div>
    </div>
  );
}