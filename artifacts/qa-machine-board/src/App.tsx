import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity as ActivityIcon,
  AlertCircle,
  Check,
  CheckCheck,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Filter,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import {
  getGetMachineSummaryQueryKey,
  getListMachineActivityQueryKey,
  getListMachinesQueryKey,
  useBulkCompleteMachines,
  useBulkUpdateProcess,
  useClearMachineActivity,
  useCreateMachine,
  useDeleteMachine,
  useGetMachineSummary,
  useListMachineActivity,
  useListMachines,
  useUpdateMachine,
  useUpdateMachineProcess,
  type Activity,
  type Machine,
  type MachineSummary,
  type Process,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
    },
  },
});
const PROCESS_ORDER: Process[] = ['reliability', 'laser', 'lkc', 'fuc', 'ct', 'tag'];
const PROCESS_META: Record<Process, { label: string; short: string }> = {
  reliability: { label: 'Reliability', short: 'REL' },
  laser: { label: 'Laser', short: 'LAS' },
  lkc: { label: 'LKC', short: 'LKC' },
  fuc: { label: 'FUC', short: 'FUC' },
  ct: { label: 'CT', short: 'CT' },
  tag: { label: 'Tag', short: 'TAG' },
};
const STATUS_META = {
  not_started: { label: 'Not started', tone: 'bg-[#f0ede5] text-[#66716c] border-[#dfd9cd]', dot: 'bg-[#9da49e]' },
  in_progress: { label: 'In progress', tone: 'bg-[#fff1d4] text-[#8c5d12] border-[#efd293]', dot: 'bg-[#d69727]' },
  completed: { label: 'Ready to dispatch', tone: 'bg-[#dcefe7] text-[#176653] border-[#b9ddcf]', dot: 'bg-[#288e73]' },
} as const;

function errorText(error: unknown) {
  if (!error) return 'Something went wrong. Try again.';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error && 'message' in error) return String(error.message);
  return 'The board could not reach the QA service.';
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function initials(value: string) {
  return value.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'QA';
}

function Router() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={Board} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function LoadingBoard() {
  return (
    <div className="space-y-5" data-testid="loading-board">
      <div className="h-28 animate-pulse rounded-2xl bg-[#e9e5db]" />
      <div className="grid gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-[#ece8de]" />)}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-[#ebe7dd]" />)}
      </div>
    </div>
  );
}

function BoardHeader({ person, setPerson, onAdd, refreshing }: {
  person: string; setPerson: (value: string) => void; onAdd: () => void; refreshing: boolean;
}) {
  return (
    <header className="mb-7 flex flex-col gap-5 border-b border-[#ded8ca] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.19em] text-[#307964]">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1e765e] text-[#f9f7ef]"><ShieldCheck size={14} /></span>
          QA / dispatch control
        </div>
        <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-[-.04em] text-[#213a35] sm:text-[39px]">Machine readiness</h1>
        <p className="mt-1.5 max-w-xl text-sm text-[#69736d]">A shared, live view of every bed before it leaves the floor.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-10 items-center gap-2 rounded-lg border border-[#d8d1c3] bg-[#fbfaf5] px-3 text-xs text-[#69736d] shadow-sm">
          <UserRound size={15} className="text-[#307964]" />
          <span className="hidden sm:inline">I’m</span>
          <input
            data-testid="input-current-person"
            value={person}
            onChange={(event) => setPerson(event.target.value)}
            placeholder="Your name"
            className="w-[92px] bg-transparent font-semibold text-[#243e38] outline-none placeholder:font-normal placeholder:text-[#a1a29a]"
            aria-label="Your name"
          />
        </label>
        <button
          type="button"
          data-testid="button-add-machine"
          onClick={onAdd}
          className="flex h-10 items-center gap-2 rounded-lg bg-[#1e765e] px-4 text-sm font-bold text-[#fbfaf5] shadow-[0_4px_12px_rgba(30,118,94,.2)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus size={17} /> Add machine
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d8d1c3] bg-[#fbfaf5] text-[#6e7b74]" title={refreshing ? 'Updating' : 'Live updates every 3 seconds'} aria-label={refreshing ? 'Updating' : 'Live updates every 3 seconds'}>
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </div>
      </div>
    </header>
  );
}

function SummaryStrip({ summary, machines }: { summary?: MachineSummary; machines: Machine[] }) {
  const fallback = useMemo(() => ({
    total: machines.length,
    notStarted: machines.filter((m) => m.status === 'not_started').length,
    inProgress: machines.filter((m) => m.status === 'in_progress').length,
    completed: machines.filter((m) => m.status === 'completed').length,
  }), [machines]);
  const data = summary ?? fallback;
  const stats = [
    { label: 'On the board', value: data.total, note: 'total beds', accent: '#35504a' },
    { label: 'Not started', value: data.notStarted, note: 'waiting to begin', accent: '#7c857e' },
    { label: 'In QA now', value: data.inProgress, note: 'active checks', accent: '#bd7a16' },
    { label: 'Ready next', value: data.completed, note: 'dispatch-ready', accent: '#1c7d63' },
  ];
  return (
    <section className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Board summary">
      {stats.map((stat, index) => (
        <div key={stat.label} className="board-in relative overflow-hidden rounded-xl border border-[#dfd9cd] bg-[#fbfaf5] p-4 shadow-[0_2px_10px_rgba(48,53,42,.03)]" style={{ animationDelay: `${index * 45}ms` }} data-testid={`summary-${stat.label.toLowerCase().replaceAll(' ', '-')}`}>
          <div className="absolute right-0 top-0 h-full w-1" style={{ backgroundColor: stat.accent }} />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[.13em] text-[#78817a]">{stat.label}</span>
            {index === 3 && <CheckCheck size={16} className="text-[#288e73]" />}
          </div>
          <div className="mt-1 font-['Space_Grotesk'] text-3xl font-bold tracking-[-.05em]" style={{ color: stat.accent }}>{stat.value}</div>
          <div className="mt-1 text-xs text-[#8c938c]">{stat.note}</div>
        </div>
      ))}
    </section>
  );
}

function MachineCard({ machine, selected, onSelect, person, onToggle, onEdit, onComplete, pendingKey }: {
  machine: Machine; selected: boolean; onSelect: (checked: boolean) => void; person: string;
  onToggle: (process: Process, done: boolean) => void; onEdit: () => void; onComplete: () => void; pendingKey: string | null;
}) {
  const doneCount = PROCESS_ORDER.filter((process) => machine.processes[process]?.done).length;
  const status = STATUS_META[machine.status];
  return (
    <article className={`board-in group relative overflow-hidden rounded-xl border bg-[#fbfaf5] shadow-[0_2px_12px_rgba(48,53,42,.045)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(48,53,42,.09)] ${selected ? 'border-[#2d866e] ring-2 ring-[#b9ddcf]' : 'border-[#ded8ca]'}`} data-testid={`card-machine-${machine.id}`}>
      <div className="flex items-start justify-between border-b border-[#e7e1d5] px-4 pb-3 pt-4">
        <div className="flex min-w-0 items-start gap-3">
          <label className="mt-0.5 flex cursor-pointer items-center">
            <input type="checkbox" data-testid={`checkbox-machine-${machine.id}`} checked={selected} onChange={(event) => onSelect(event.target.checked)} className="peer sr-only" />
            <span className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${selected ? 'border-[#2d866e] bg-[#2d866e] text-white' : 'border-[#c9c5b9] bg-[#f4f1e8] text-transparent peer-hover:border-[#2d866e]'}`}><Check size={13} strokeWidth={3} /></span>
          </label>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-['DM_Mono'] text-[11px] font-medium uppercase tracking-[.08em] text-[#9a9588]">Bed {machine.bedNumber}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            </div>
            <h2 className="mt-1 truncate font-['Space_Grotesk'] text-lg font-bold tracking-[-.03em] text-[#27443c]" data-testid={`text-machine-name-${machine.id}`}>{machine.name}</h2>
             <p className="mt-0.5 truncate text-[11px] text-[#8b938b]">Work {machine.workNo || '—'}</p>
          </div>
        </div>
        <button type="button" data-testid={`button-edit-machine-${machine.id}`} onClick={onEdit} className="rounded-md p-1.5 text-[#9ba099] transition-colors hover:bg-[#efebe1] hover:text-[#2c6655]" title="Edit machine"><Settings2 size={16} /></button>
      </div>
      <div className="px-4 pb-4 pt-3">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className={`rounded-full border px-2 py-1 font-semibold ${status.tone}`} data-testid={`status-machine-${machine.id}`}>{status.label}</span>
          <span className="font-['DM_Mono'] text-[11px] text-[#8f968f]">{doneCount}/6 checks</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PROCESS_ORDER.map((process) => {
            const item = machine.processes[process];
            const isPending = pendingKey === `${machine.id}-${process}`;
            return (
              <button
                type="button"
                key={process}
                data-testid={`button-process-${machine.id}-${process}`}
                onClick={() => onToggle(process, !item.done)}
                disabled={!person.trim() || isPending}
                title={item.done ? `${PROCESS_META[process].label} completed by ${item.completedBy || 'team'}` : `Mark ${PROCESS_META[process].label} complete`}
                className={`relative flex h-12 flex-col items-center justify-center rounded-lg border text-[10px] font-bold tracking-[.08em] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${item.done ? 'check-pop border-[#b9ddcf] bg-[#e1f1ea] text-[#1e765e]' : 'border-[#e3ded3] bg-[#f6f3eb] text-[#8d948c] hover:border-[#9dcdbd] hover:bg-[#edf5f0]'}`}
              >
                {isPending ? <Loader2 size={15} className="animate-spin" /> : item.done ? <Check size={15} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />}
                <span className="mt-1">{PROCESS_META[process].short}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[#eee9df] pt-3">
          <span className="flex items-center gap-1.5 text-[11px] text-[#939890]"><Clock3 size={13} /> Updated {formatTime(machine.updatedAt)}</span>
          {machine.status !== 'completed' ? (
            <button type="button" data-testid={`button-complete-machine-${machine.id}`} onClick={onComplete} disabled={!person.trim() || pendingKey === `complete-${machine.id}`} className="flex items-center gap-1 text-xs font-bold text-[#26755f] transition-colors hover:text-[#164e40] disabled:opacity-40">
              {pendingKey === `complete-${machine.id}` ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />} Complete all
            </button>
          ) : <span className="flex items-center gap-1 text-xs font-bold text-[#26836b]"><CheckCheck size={14} /> Dispatch cleared</span>}
        </div>
      </div>
    </article>
  );
}

function ActivityPanel({ activity, loading, error, onClear, clearing }: { activity?: Activity[]; loading: boolean; error?: unknown; onClear: () => void; clearing: boolean }) {
  return (
    <aside className="rounded-xl border border-[#ded8ca] bg-[#fbfaf5] shadow-[0_2px_12px_rgba(48,53,42,.04)]" data-testid="activity-panel">
      <div className="flex items-center justify-between border-b border-[#e7e1d5] px-4 py-3.5">
        <div className="flex items-center gap-2"><History size={16} className="text-[#2e7963]" /><h2 className="font-['Space_Grotesk'] text-sm font-bold text-[#2b4841]">Recent activity</h2></div>
        <div className="flex items-center gap-2">
          {activity && activity.length > 0 && <button type="button" data-testid="button-clear-history" onClick={onClear} disabled={clearing} className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9a5b51] transition-colors hover:bg-[#f9e7e2] disabled:opacity-50">{clearing ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Clear history</button>}
          <span className="rounded-full bg-[#edf3ed] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#40816d]">Live</span>
        </div>
      </div>
      <div className="max-h-[430px] overflow-auto p-2">
        {loading && <div className="space-y-3 p-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-11 animate-pulse rounded-lg bg-[#efebe2]" />)}</div>}
        {Boolean(error) && <div className="m-2 rounded-lg bg-[#f9e8e5] p-3 text-xs text-[#98453b]"><AlertCircle size={15} className="mb-1" /> Activity unavailable right now.</div>}
        {!loading && !error && (!activity || activity.length === 0) && <div className="px-4 py-12 text-center"><ActivityIcon size={23} className="mx-auto mb-2 text-[#b1b3a8]" /><p className="text-xs font-semibold text-[#747c74]">No check-offs yet</p><p className="mt-1 text-[11px] text-[#a0a49c]">Updates will appear here.</p></div>}
        {!loading && activity?.map((item) => (
          <div key={item.id} className="flex gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#f2efe7]" data-testid={`activity-item-${item.id}`}>
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${item.completed ? 'bg-[#dcefe7] text-[#1d765e]' : 'bg-[#f0e8df] text-[#976a37]'}`}>{initials(item.updatedBy)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-4 text-[#53625b]"><strong className="font-bold text-[#29483f]">{item.updatedBy}</strong> {item.completed ? 'completed' : 'reopened'} <strong className="font-bold text-[#29483f]">{PROCESS_META[item.process].label}</strong> on Bed {item.bedNumber}</p>
              <p className="mt-1 text-[10px] font-['DM_Mono'] text-[#9a9e95]">{formatTime(item.updatedAt)} · {item.machineName}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

const PUBLISHED_SHEET_URL = import.meta.env.VITE_EMBEDDED_SHEET_URL || 'https://docs.google.com/spreadsheets/d/1qESJ_m_TXZEO3PQItIL4KKYpUObsDFL0kGyTLJXU7Jg/htmlembed?widget=true&headers=false';

function SheetPanel() {
  return (
    <section className="mt-7 overflow-hidden rounded-xl border border-[#ded8ca] bg-[#fbfaf5] shadow-[0_2px_12px_rgba(48,53,42,.04)]" data-testid="sheet-panel">
      <div className="flex flex-col gap-3 border-b border-[#e7e1d5] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2"><ClipboardCheck size={16} className="text-[#2e7963]" /><h2 className="font-['Space_Grotesk'] text-sm font-bold text-[#2b4841]">Printable sheet view</h2></div><p className="mt-1 text-xs text-[#7f887f]">The dashboard rows sync to the Google Sheet automatically.</p></div>
        <a href={PUBLISHED_SHEET_URL} target="_blank" rel="noreferrer" className="flex h-9 items-center justify-center rounded-md border border-[#b7d4c6] bg-[#f7fbf8] px-3 text-xs font-bold text-[#2d725d] hover:bg-[#e8f3ed]">Open printable sheet</a>
      </div>
      <iframe title="Machine QA printable Google Sheet" src={PUBLISHED_SHEET_URL} className="h-[480px] w-full bg-white" loading="lazy" />
    </section>
  );
}

function MachineModal({ machine, onClose, onSave, onDelete, pending, deleting }: { machine?: Machine; onClose: () => void; onSave: (bedNumber: string, name: string, workNo: string, remarks: string) => void; onDelete: () => void; pending: boolean; deleting: boolean }) {
  const [bedNumber, setBedNumber] = useState(machine?.bedNumber ?? '');
  const [name, setName] = useState(machine?.name ?? '');
  const [workNo, setWorkNo] = useState(machine?.workNo ?? '');
  const [remarks, setRemarks] = useState(machine?.remarks ?? '');
  const valid = bedNumber.trim().length > 0 && name.trim().length > 0;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1e302d]/35 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="machine-modal-title">
      <div className="w-full max-w-md rounded-2xl border border-[#d8d1c3] bg-[#fbfaf5] p-6 shadow-[0_24px_70px_rgba(27,48,42,.22)]">
        <div className="mb-5 flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#347b65]">{machine ? 'Machine details' : 'New machine'}</p><h2 id="machine-modal-title" className="mt-1 font-['Space_Grotesk'] text-2xl font-bold tracking-[-.04em] text-[#24443b]">{machine ? 'Edit machine' : 'Add to the board'}</h2></div><button type="button" data-testid="button-close-machine-modal" onClick={onClose} className="rounded-lg p-1.5 text-[#8e958d] hover:bg-[#efebe1] hover:text-[#334e46]"><X size={18} /></button></div>
         <form onSubmit={(event) => { event.preventDefault(); if (valid) onSave(bedNumber.trim(), name.trim(), workNo.trim(), remarks.trim()); }} className="space-y-4">
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#53635b]">Bed number</span><input data-testid="input-bed-number" autoFocus value={bedNumber} onChange={(event) => setBedNumber(event.target.value)} placeholder="e.g. 04" className="h-11 w-full rounded-lg border border-[#d8d1c3] bg-[#f7f4ec] px-3 text-sm text-[#29483f] outline-none transition-colors focus:border-[#39866e] focus:ring-2 focus:ring-[#c9e5d9]" /></label>
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-[#53635b]">Machine name</span><input data-testid="input-machine-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Haas VF-2" className="h-11 w-full rounded-lg border border-[#d8d1c3] bg-[#f7f4ec] px-3 text-sm text-[#29483f] outline-none transition-colors focus:border-[#39866e] focus:ring-2 focus:ring-[#c9e5d9]" /></label>
           <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#53635b]">Work number</span><input data-testid="input-work-number" value={workNo} onChange={(event) => setWorkNo(event.target.value)} placeholder="e.g. WO-2044" className="h-11 w-full rounded-lg border border-[#d8d1c3] bg-[#f7f4ec] px-3 text-sm text-[#29483f] outline-none transition-colors focus:border-[#39866e] focus:ring-2 focus:ring-[#c9e5d9]" /></label><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#53635b]">Remarks</span><input data-testid="input-machine-remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional note" className="h-11 w-full rounded-lg border border-[#d8d1c3] bg-[#f7f4ec] px-3 text-sm text-[#29483f] outline-none transition-colors focus:border-[#39866e] focus:ring-2 focus:ring-[#c9e5d9]" /></label></div>
           <p className="-mt-1 text-[11px] text-[#8b938b]">Date is added automatically when the machine is created.</p>
          {machine?.status === 'completed' && <div className="rounded-lg border border-[#ead1cc] bg-[#fcf2ef] p-3 text-xs text-[#8e4d43]"><div className="flex items-start gap-2"><Trash2 size={15} className="mt-0.5 shrink-0" /><p>Ready-to-dispatch machines can be removed from the board. Their QA activity history will remain.</p></div><button type="button" data-testid={`button-delete-machine-${machine.id}`} onClick={onDelete} disabled={pending || deleting} className="mt-3 flex h-9 items-center gap-2 rounded-md border border-[#d99b91] bg-[#fffaf8] px-3 text-xs font-bold text-[#9a453b] hover:bg-[#f9e4df] disabled:opacity-50">{deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete ready machine</button></div>}
          <div className="flex gap-2 pt-2"><button type="button" data-testid="button-cancel-machine" onClick={onClose} className="h-11 flex-1 rounded-lg border border-[#d8d1c3] text-sm font-bold text-[#647068] hover:bg-[#f0ece3]">Cancel</button><button type="submit" data-testid="button-save-machine" disabled={!valid || pending || deleting} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#1e765e] text-sm font-bold text-white disabled:opacity-50">{pending && <Loader2 size={15} className="animate-spin" />} {machine ? 'Save changes' : 'Add machine'}</button></div>
        </form>
      </div>
    </div>
  );
}

function Board() {
  const queryClient = useQueryClient();
  const [person, setPersonState] = useState(() => localStorage.getItem('qa-current-person') ?? '');
  const setPerson = (value: string) => { setPersonState(value); localStorage.setItem('qa-current-person', value); };
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all');
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkProcess, setBulkProcess] = useState<Process>('reliability');
  const [modalMachine, setModalMachine] = useState<Machine | null | undefined>(undefined);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const machinesQuery = useListMachines({ query: { queryKey: getListMachinesQueryKey(), refetchInterval: 3000 } });
  const summaryQuery = useGetMachineSummary({ query: { queryKey: getGetMachineSummaryQueryKey(), refetchInterval: 3000 } });
  const activityQuery = useListMachineActivity({ query: { queryKey: getListMachineActivityQueryKey(), refetchInterval: 3000 } });
  const clearActivity = useClearMachineActivity();
  const createMachine = useCreateMachine();
  const deleteMachine = useDeleteMachine();
  const updateMachine = useUpdateMachine();
  const updateProcess = useUpdateMachineProcess();
  const bulkProcessMutation = useBulkUpdateProcess();
  const bulkComplete = useBulkCompleteMachines();

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: getListMachinesQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getGetMachineSummaryQueryKey() });
    void queryClient.invalidateQueries({ queryKey: getListMachineActivityQueryKey() });
  };
  const machines = Array.isArray(machinesQuery.data) ? machinesQuery.data : [];
  const visibleMachines = useMemo(() => machines.filter((machine) => {
    const matchesFilter = filter === 'all' || machine.status === filter;
    const query = search.trim().toLowerCase();
    return matchesFilter && (!query || machine.name.toLowerCase().includes(query) || machine.bedNumber.toLowerCase().includes(query) || machine.workNo.toLowerCase().includes(query));
  }), [machines, filter, search]);

  useEffect(() => {
    setSelected((current) => current.filter((id) => machines.some((machine) => machine.id === id)));
  }, [machines]);

  const mutateProcess = (machine: Machine, process: Process, done: boolean) => {
    if (!person.trim()) return;
    setMutationError(null);
    setPendingKey(`${machine.id}-${process}`);
    updateProcess.mutate({ machineId: machine.id, process, data: { done, updatedBy: person.trim() } }, {
      onSuccess: () => { invalidateAll(); setPendingKey(null); },
      onError: (error) => { setPendingKey(null); setMutationError(errorText(error)); },
    });
  };
  const completeMachine = (machine: Machine) => {
    if (!person.trim()) return;
    setMutationError(null);
    setPendingKey(`complete-${machine.id}`);
    bulkComplete.mutate({ data: { machineIds: [machine.id], updatedBy: person.trim() } }, {
      onSuccess: () => { invalidateAll(); setPendingKey(null); },
      onError: (error) => { setPendingKey(null); setMutationError(errorText(error)); },
    });
  };
  const submitMachine = (bedNumber: string, name: string, workNo: string, remarks: string) => {
    setMutationError(null);
    if (modalMachine) {
      updateMachine.mutate({ machineId: modalMachine.id, data: { bedNumber, name, workNo, remarks } }, { onSuccess: () => { invalidateAll(); setModalMachine(undefined); }, onError: (error) => setMutationError(errorText(error)) });
    } else {
      createMachine.mutate({ data: { bedNumber, name, workNo, remarks } }, { onSuccess: () => { invalidateAll(); setModalMachine(undefined); }, onError: (error) => setMutationError(errorText(error)) });
    }
  };
  const removeMachine = () => {
    if (!modalMachine || modalMachine.status !== 'completed') return;
    const confirmed = window.confirm(`Delete ${modalMachine.name} from the board? Its QA activity history will remain.`);
    if (!confirmed) return;
    setMutationError(null);
    deleteMachine.mutate({ machineId: modalMachine.id }, {
      onSuccess: () => { invalidateAll(); setModalMachine(undefined); },
      onError: (error) => setMutationError(errorText(error)),
    });
  };
  const runBulk = () => {
    if (!person.trim() || selected.length === 0) return;
    setMutationError(null);
    bulkProcessMutation.mutate({ data: { machineIds: selected, process: bulkProcess, done: true, updatedBy: person.trim() } }, { onSuccess: () => { invalidateAll(); setSelected([]); }, onError: (error) => setMutationError(errorText(error)) });
  };
  const runBulkComplete = () => {
    if (!person.trim() || selected.length === 0) return;
    setMutationError(null);
    bulkComplete.mutate({ data: { machineIds: selected, updatedBy: person.trim() } }, { onSuccess: () => { invalidateAll(); setSelected([]); }, onError: (error) => setMutationError(errorText(error)) });
  };
  const clearHistory = () => {
    if (!activityQuery.data?.length) return;
    const confirmed = window.confirm('Clear all recent QA activity history? This cannot be undone.');
    if (!confirmed) return;
    clearActivity.mutate(undefined, {
      onSuccess: () => { void queryClient.invalidateQueries({ queryKey: getListMachineActivityQueryKey() }); },
      onError: (error) => setMutationError(errorText(error)),
    });
  };

  const isLoading = machinesQuery.isLoading;
  const isError = machinesQuery.isError;
  return (
    <div className="grain min-h-[100dvh] bg-[#f3f0e8]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
        <BoardHeader person={person} setPerson={setPerson} onAdd={() => setModalMachine(null)} refreshing={Boolean(machinesQuery.isFetching && !isLoading)} />
        {mutationError && <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#e0c9c1] bg-[#fbefeb] px-4 py-3 text-sm text-[#914b40]" role="alert" data-testid="mutation-error"><span className="flex items-center gap-2"><AlertCircle size={16} /> {mutationError}</span><button type="button" data-testid="button-dismiss-error" onClick={() => setMutationError(null)} className="rounded-md p-1 hover:bg-[#f2ddd7]"><X size={15} /></button></div>}
        {isLoading ? <LoadingBoard /> : isError ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-[#e0c9c1] bg-[#fbfaf5] text-center" data-testid="error-board"><AlertCircle size={32} className="mb-3 text-[#b45246]" /><h2 className="font-['Space_Grotesk'] text-xl font-bold text-[#3d4c46]">The board is taking a break</h2><p className="mt-1 max-w-sm text-sm text-[#7d8179]">{errorText(machinesQuery.error)}</p><button type="button" data-testid="button-retry-board" onClick={() => void machinesQuery.refetch()} className="mt-5 flex items-center gap-2 rounded-lg bg-[#1e765e] px-4 py-2 text-sm font-bold text-white"><RefreshCw size={14} /> Try again</button></div>
        ) : (
          <>
            <SummaryStrip summary={summaryQuery.data} machines={machines} />
            <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                <label className="relative max-w-md flex-1"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8d958d]" /><input type="search" data-testid="input-search-machines" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search bed or machine..." className="h-10 w-full rounded-lg border border-[#d8d1c3] bg-[#fbfaf5] pl-9 pr-3 text-sm text-[#29483f] shadow-sm outline-none placeholder:text-[#9aa097] focus:border-[#479076] focus:ring-2 focus:ring-[#c9e5d9]" /></label>
                <div className="flex items-center gap-1 rounded-lg border border-[#d8d1c3] bg-[#fbfaf5] p-1 shadow-sm"><Filter size={14} className="ml-2 mr-1 text-[#8d958d]" />{(['all', 'not_started', 'in_progress', 'completed'] as const).map((item) => <button type="button" key={item} data-testid={`button-filter-${item}`} onClick={() => setFilter(item)} className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors sm:px-3 ${filter === item ? 'bg-[#e0eee8] text-[#236b57]' : 'text-[#7e877f] hover:bg-[#f0ede5]'}`}>{item === 'all' ? 'All' : item === 'not_started' ? 'Waiting' : item === 'in_progress' ? 'In QA' : 'Ready'}</button>)}</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#8a928b]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#2c9476]" /> Changes sync automatically</div>
            </div>
            {selected.length > 0 && <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#b8dccc] bg-[#e5f2ec] p-3 sm:flex-row sm:items-center sm:justify-between" data-testid="bulk-toolbar"><div className="flex items-center gap-2 text-sm font-bold text-[#245d4d]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2c8066] text-xs text-white">{selected.length}</span> {selected.length === 1 ? 'machine' : 'machines'} selected</div><div className="flex flex-wrap items-center gap-2"><select data-testid="select-bulk-process" value={bulkProcess} onChange={(event) => setBulkProcess(event.target.value as Process)} className="h-9 rounded-md border border-[#b7d4c6] bg-[#f7fbf8] px-2 text-xs font-semibold text-[#2b6454] outline-none">{PROCESS_ORDER.map((process) => <option key={process} value={process}>{PROCESS_META[process].label}</option>)}</select><button type="button" data-testid="button-bulk-process" onClick={runBulk} disabled={bulkProcessMutation.isPending || !person.trim()} className="h-9 rounded-md bg-[#2d8067] px-3 text-xs font-bold text-white disabled:opacity-50">{bulkProcessMutation.isPending ? 'Updating…' : 'Mark process done'}</button><button type="button" data-testid="button-bulk-complete" onClick={runBulkComplete} disabled={bulkComplete.isPending || !person.trim()} className="flex h-9 items-center gap-1 rounded-md border border-[#b7d4c6] bg-[#f7fbf8] px-3 text-xs font-bold text-[#2d725d] disabled:opacity-50"><CheckCheck size={14} /> Complete all</button><button type="button" data-testid="button-clear-selection" onClick={() => setSelected([])} className="rounded-md p-2 text-[#69917f] hover:bg-[#d5e9df]"><X size={15} /></button></div></div>}
            {visibleMachines.length === 0 ? <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d5cfc2] bg-[#fbfaf5] text-center" data-testid="empty-machines"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e4eee8] text-[#39826a]"><ClipboardCheck size={27} /></div><h2 className="font-['Space_Grotesk'] text-xl font-bold text-[#344e46]">{machines.length === 0 ? 'Your board is clear' : 'No machines match'}</h2><p className="mt-1 max-w-sm text-sm text-[#828a82]">{machines.length === 0 ? 'Add the first bed to start the shift. Every check-off will be visible to the whole team.' : 'Try a different search or status filter.'}</p>{machines.length === 0 ? <button type="button" data-testid="button-empty-add-machine" onClick={() => setModalMachine(null)} className="mt-5 flex items-center gap-2 rounded-lg bg-[#1e765e] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} /> Add first machine</button> : <button type="button" data-testid="button-reset-filters" onClick={() => { setSearch(''); setFilter('all'); }} className="mt-5 text-sm font-bold text-[#26755f] hover:underline">Reset filters</button>}</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleMachines.map((machine, index) => <div key={machine.id} style={{ animationDelay: `${index * 35}ms` }}><MachineCard machine={machine} selected={selected.includes(machine.id)} onSelect={(checked) => setSelected((current) => checked ? [...current, machine.id] : current.filter((id) => id !== machine.id))} person={person} onToggle={(process, done) => mutateProcess(machine, process, done)} onEdit={() => setModalMachine(machine)} onComplete={() => completeMachine(machine)} pendingKey={pendingKey} /></div>)}</div>}
             <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"><div className="hidden rounded-xl border border-[#ded8ca] bg-[#fbfaf5] p-4 lg:block"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#78837b]"><CircleHelp size={14} className="text-[#b3832d]" /> Quick reference</div><div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#768078]">{PROCESS_ORDER.map((process) => <span key={process} className="flex items-center gap-1.5"><span className="font-['DM_Mono'] text-[10px] font-bold text-[#437763]">{PROCESS_META[process].short}</span>{PROCESS_META[process].label}</span>)}</div></div><ActivityPanel activity={activityQuery.data} loading={activityQuery.isLoading} error={activityQuery.error} onClear={clearHistory} clearing={clearActivity.isPending} /></div>
             <SheetPanel />
          </>
        )}
      </div>
      {modalMachine !== undefined && <MachineModal machine={modalMachine ?? undefined} onClose={() => setModalMachine(undefined)} onSave={submitMachine} onDelete={removeMachine} pending={createMachine.isPending || updateMachine.isPending} deleting={deleteMachine.isPending} />}
    </div>
  );
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;