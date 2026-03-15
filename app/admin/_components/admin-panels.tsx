"use client";

import { useActionState, useState, useEffect } from "react";
import { Tournament } from "@/lib/types";
import {
  createTournamentAction,
  updateTournamentStatusAction,
  updateTournamentLockDateAction,
  deleteTournamentAction,
  seedTournamentAction,
  clearTournamentDataAction,
  rawSelectAction,
  AdminActionResult,
} from "../actions";

const emptyResult: AdminActionResult = { success: false, message: "" };
const emptyQuery = { success: false, message: "", rows: [] as Record<string, unknown>[] };

function StatusBadge({ result }: { result: AdminActionResult }) {
  if (!result.message) return null;
  return (
    <p
      className="text-xs mt-2"
      style={{ color: result.success ? "#4ade80" : "#f87171" }}
    >
      {result.message}
    </p>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-stone-400 mb-1">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="input-field rounded py-1.5"
    />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="input-field rounded py-1.5 cursor-pointer"
    >
      {children}
    </select>
  );
}

function Btn({
  children,
  pending,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean; variant?: "primary" | "danger" }) {
  return (
    <button
      {...props}
      disabled={pending || props.disabled}
      className={`rounded px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-60 cursor-pointer ${
        variant === "danger" ? "bg-red-900 hover:bg-red-800" : "btn-primary"
      }`}
    >
      {pending ? "…" : children}
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card rounded-lg p-4">
      <h2 className="text-sm font-semibold text-stone-200 mb-3">{title}</h2>
      {children}
    </div>
  );
}

// ── Create Tournament ──

export function CreateTournamentPanel() {
  const [state, action, pending] = useActionState(createTournamentAction, emptyResult);
  return (
    <Card title="Create Tournament">
      <form action={action} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Name</Label>
            <Input name="name" placeholder="NCAA March Madness 2026" required />
          </div>
          <div>
            <Label>Year</Label>
            <Input name="year" type="number" placeholder="2026" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Lock Date</Label>
            <Input name="lock_date" type="datetime-local" />
          </div>
          <div>
            <Label>Status</Label>
            <Select name="status">
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
        </div>
        <Btn type="submit" pending={pending}>Create Tournament</Btn>
        <StatusBadge result={state} />
      </form>
    </Card>
  );
}

// ── Tournament Manager ──

export function TournamentManagerPanel({ tournaments }: { tournaments: Tournament[] }) {
  const [statusState, statusAction, statusPending] = useActionState(updateTournamentStatusAction, emptyResult);
  const [lockState, lockAction, lockPending] = useActionState(updateTournamentLockDateAction, emptyResult);
  const [seedState, seedAction, seedPending] = useActionState(seedTournamentAction, emptyResult);
  const [deleteMsg, setDeleteMsg] = useState<AdminActionResult | null>(null);
  const [clearMsg, setClearMsg] = useState<AdminActionResult | null>(null);
  const [selectedId, setSelectedId] = useState(tournaments[0]?.id ?? "");

  useEffect(() => {
    if (tournaments.length > 0 && !tournaments.find((t) => t.id === selectedId)) {
      setSelectedId(tournaments[0].id);
    }
  }, [tournaments, selectedId]);

  if (tournaments.length === 0) {
    return (
      <Card title="Manage Tournament">
        <p className="text-stone-500 text-sm">No tournaments yet. Create one above.</p>
      </Card>
    );
  }

  const selected = tournaments.find((t) => t.id === selectedId);

  return (
    <Card title="Manage Tournament">
      <div className="mb-4">
        <Label>Select Tournament</Label>
        <Select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setDeleteMsg(null); setClearMsg(null); }}>
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.status})
            </option>
          ))}
        </Select>
        {selected && (
          <p className="text-[10px] text-stone-600 mt-1 font-mono break-all">{selected.id}</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Status */}
        <form action={statusAction} className="flex items-end gap-2">
          <input type="hidden" name="tournament_id" value={selectedId} />
          <div className="flex-1">
            <Label>Update Status</Label>
            <Select name="status" defaultValue={selected?.status}>
              <option value="upcoming">Upcoming</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
          <Btn type="submit" pending={statusPending}>Update</Btn>
        </form>
        <StatusBadge result={statusState} />

        {/* Lock date */}
        <form action={lockAction} className="flex items-end gap-2">
          <input type="hidden" name="tournament_id" value={selectedId} />
          <div className="flex-1">
            <Label>Update Lock Date</Label>
            <Input name="lock_date" type="datetime-local" defaultValue={selected?.lock_date?.slice(0, 16) ?? ""} />
          </div>
          <Btn type="submit" pending={lockPending}>Update</Btn>
        </form>
        <StatusBadge result={lockState} />

        {/* Seed */}
        <form action={seedAction}>
          <input type="hidden" name="tournament_id" value={selectedId} />
          <Btn type="submit" pending={seedPending}>Seed 64 Teams + 63 Games</Btn>
        </form>
        <StatusBadge result={seedState} />

        {/* Clear data */}
        <div className="flex gap-2">
          <Btn
            variant="danger"
            onClick={async () => {
              if (!confirm("Delete all teams and games for this tournament?")) return;
              setClearMsg(await clearTournamentDataAction(selectedId));
            }}
          >
            Clear Teams &amp; Games
          </Btn>
          <Btn
            variant="danger"
            onClick={async () => {
              if (!confirm("Delete this entire tournament and all related data?")) return;
              setDeleteMsg(await deleteTournamentAction(selectedId));
            }}
          >
            Delete Tournament
          </Btn>
        </div>
        {clearMsg && <StatusBadge result={clearMsg} />}
        {deleteMsg && <StatusBadge result={deleteMsg} />}
      </div>
    </Card>
  );
}

// ── Raw Table Viewer ──

export function RawTablePanel() {
  const [state, action, pending] = useActionState(rawSelectAction, emptyQuery);

  return (
    <Card title="Query Table">
      <form action={action} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <Label>Table</Label>
            <Select name="table">
              <option value="tournaments">tournaments</option>
              <option value="teams">teams</option>
              <option value="tournament_games">tournament_games</option>
              <option value="brackets">brackets</option>
              <option value="bracket_picks">bracket_picks</option>
              <option value="pools">pools</option>
              <option value="pool_members">pool_members</option>
              <option value="pool_brackets">pool_brackets</option>
              <option value="user_info">user_info</option>
            </Select>
          </div>
          <div>
            <Label>Filter Column</Label>
            <Input name="filter_col" placeholder="e.g. tournament_id" />
          </div>
          <div>
            <Label>Filter Value</Label>
            <Input name="filter_val" placeholder="uuid or value" />
          </div>
          <div>
            <Label>Limit</Label>
            <Input name="limit" type="number" defaultValue="20" />
          </div>
        </div>
        <Btn type="submit" pending={pending}>Query</Btn>
        <StatusBadge result={state} />
      </form>

      {state.rows.length > 0 && (
        <div className="mt-3 overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {Object.keys(state.rows[0]).map((key) => (
                  <th key={key} className="text-left px-2 py-1 text-stone-400 font-medium border-b border-card-border">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.rows.map((row, i) => (
                <tr key={i} className="hover:bg-stone-900">
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="px-2 py-1 text-stone-300 border-b border-card-border max-w-[200px] truncate font-mono">
                      {val === null ? <span className="text-stone-600">null</span> : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
