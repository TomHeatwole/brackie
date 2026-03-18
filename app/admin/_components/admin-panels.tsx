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
  getTournamentGamesForAdminAction,
  setGameWinnerAction,
  getTournamentTeamsForAdminAction,
  updateTeamAction,
  bulkUpdateTeamsFromConfigAction,
  getPoolsWithMembersForAdminAction,
  adminRemovePoolMemberAction,
  duplicateTournamentAction,
  AdminActionResult,
  GameWithTeamNames,
  TeamConfigEntry,
  PoolWithMembersForAdmin,
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
        <div className="border-t border-card-border pt-3 mt-1">
          <Label>Bracket layout (region names per quadrant)</Label>
          <p className="text-xs text-stone-500 mb-2">Top-left, top-right, bottom-left, bottom-right. Determines who faces who in Final Four.</p>
          <div className="grid grid-cols-2 gap-2">
            <Input name="region_top_left" placeholder="East (top-left)" defaultValue="East" />
            <Input name="region_top_right" placeholder="West (top-right)" defaultValue="West" />
            <Input name="region_bottom_left" placeholder="South (bottom-left)" defaultValue="South" />
            <Input name="region_bottom_right" placeholder="Midwest (bottom-right)" defaultValue="Midwest" />
          </div>
        </div>
        <Btn type="submit" pending={pending}>Create Tournament</Btn>
        <StatusBadge result={state} />
      </form>
    </Card>
  );
}

// ── Tournament Manager (no dropdown; receives tournamentId from parent) ──

export function TournamentManagerPanel({
  tournaments,
  tournamentId,
  onTournamentIdChange,
}: {
  tournaments: Tournament[];
  tournamentId: string;
  onTournamentIdChange: (id: string) => void;
}) {
  const [statusState, statusAction, statusPending] = useActionState(updateTournamentStatusAction, emptyResult);
  const [lockState, lockAction, lockPending] = useActionState(updateTournamentLockDateAction, emptyResult);
  const [seedState, seedAction, seedPending] = useActionState(seedTournamentAction, emptyResult);
  const [duplicateState, duplicateAction, duplicatePending] = useActionState(duplicateTournamentAction, emptyResult);
  const [deleteMsg, setDeleteMsg] = useState<AdminActionResult | null>(null);
  const [clearMsg, setClearMsg] = useState<AdminActionResult | null>(null);

  useEffect(() => {
    if (tournaments.length > 0 && !tournaments.find((t) => t.id === tournamentId)) {
      onTournamentIdChange(tournaments[0].id);
    }
  }, [tournaments, tournamentId, onTournamentIdChange]);

  if (tournaments.length === 0) {
    return (
      <Card title="Manage Tournament">
        <p className="text-stone-500 text-sm">No tournaments yet. Create one above.</p>
      </Card>
    );
  }

  const selected = tournaments.find((t) => t.id === tournamentId);

  return (
    <Card title="Manage Tournament">
      <div className="mb-4">
        <Label>Select Tournament</Label>
        <Select
          value={tournamentId}
          onChange={(e) => {
            onTournamentIdChange(e.target.value);
            setDeleteMsg(null);
            setClearMsg(null);
          }}
        >
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
          <input type="hidden" name="tournament_id" value={tournamentId} />
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
          <input type="hidden" name="tournament_id" value={tournamentId} />
          <div className="flex-1">
            <Label>Update Lock Date</Label>
            <Input name="lock_date" type="datetime-local" defaultValue={selected?.lock_date?.slice(0, 16) ?? ""} />
          </div>
          <Btn type="submit" pending={lockPending}>Update</Btn>
        </form>
        <StatusBadge result={lockState} />

        {/* Seed */}
        <form action={seedAction}>
          <input type="hidden" name="tournament_id" value={tournamentId} />
          <Btn type="submit" pending={seedPending}>Seed 64 Teams + 63 Games</Btn>
        </form>
        <StatusBadge result={seedState} />

        {/* Duplicate */}
        <form action={duplicateAction} className="flex items-center gap-2">
          <input type="hidden" name="tournament_id" value={tournamentId} />
          <Btn type="submit" pending={duplicatePending}>
            Duplicate this tournament for testing
          </Btn>
        </form>
        <StatusBadge result={duplicateState} />

        {/* Clear data */}
        <div className="flex gap-2">
          <Btn
            variant="danger"
            onClick={async () => {
              if (!confirm("Delete all teams and games for this tournament?")) return;
              setClearMsg(await clearTournamentDataAction(tournamentId));
            }}
          >
            Clear Teams &amp; Games
          </Btn>
          <Btn
            variant="danger"
            onClick={async () => {
              if (!confirm("Delete this entire tournament and all related data?")) return;
              setDeleteMsg(await deleteTournamentAction(tournamentId));
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

// ── Game Results (set winner per game) ──

export function GameResultsPanel({ tournamentId }: { tournamentId: string }) {
  const [games, setGames] = useState<GameWithTeamNames[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<AdminActionResult | null>(null);

  useEffect(() => {
    if (!tournamentId) {
      setGames([]);
      return;
    }
    setLoading(true);
    getTournamentGamesForAdminAction(tournamentId).then((res) => {
      setGames(res.games);
      setLoading(false);
    });
  }, [tournamentId]);

  async function handleSetWinner(gameId: string, winnerId: string | null) {
    setMsg(null);
    const result = await setGameWinnerAction(gameId, winnerId);
    setMsg(result);
    if (result.success) {
      getTournamentGamesForAdminAction(tournamentId).then((res) => setGames(res.games));
    }
  }

  if (!tournamentId) {
    return (
      <Card title="Game Results">
        <p className="text-stone-500 text-sm">Select a tournament above.</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card title="Game Results">
        <p className="text-stone-500 text-sm">Loading games…</p>
      </Card>
    );
  }

  if (games.length === 0) {
    return (
      <Card title="Game Results">
        <p className="text-stone-500 text-sm">No games. Seed the tournament first.</p>
      </Card>
    );
  }

  const roundLabels: Record<number, string> = {
    1: "R1",
    2: "R2",
    3: "Sweet 16",
    4: "Elite 8",
    5: "Final Four",
    6: "Championship",
  };

  return (
    <Card title="Game Results">
      <p className="text-stone-500 text-xs mb-3">Set winner for each game. Overrides any scraped data.</p>
      {msg && <StatusBadge result={msg} />}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto space-y-2">
        {games.map((g) => (
          <div
            key={g.id}
            className="flex flex-wrap items-center gap-2 py-2 px-3 rounded border border-card-border bg-background text-sm"
          >
            <span className="text-stone-500 font-mono w-20 shrink-0">{roundLabels[g.round] ?? `R${g.round}`}</span>
            <span className="text-stone-400 shrink-0">{g.team1_name ?? "TBD"}</span>
            <span className="text-stone-600">vs</span>
            <span className="text-stone-400 shrink-0">{g.team2_name ?? "TBD"}</span>
            <span className="text-stone-600 text-xs shrink-0">→</span>
            <div className="flex gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => handleSetWinner(g.id, g.team1_id)}
                disabled={!g.team1_id}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  g.winner_id === g.team1_id
                    ? "bg-green-800 text-green-200"
                    : "bg-stone-700 text-stone-300 hover:bg-stone-600 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {g.team1_name ?? "TBD"}
              </button>
              <button
                type="button"
                onClick={() => handleSetWinner(g.id, g.team2_id)}
                disabled={!g.team2_id}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  g.winner_id === g.team2_id
                    ? "bg-green-800 text-green-200"
                    : "bg-stone-700 text-stone-300 hover:bg-stone-600 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
              >
                {g.team2_name ?? "TBD"}
              </button>
              <button
                type="button"
                onClick={() => handleSetWinner(g.id, null)}
                className="rounded px-2 py-0.5 text-xs font-medium bg-stone-700 text-stone-500 hover:bg-stone-600"
              >
                Clear
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Teams (edit name & picture) ──

interface TeamRow {
  id: string;
  name: string;
  seed: number;
  region: string;
  icon_url: string | null;
}

type LocalEdits = Record<string, { name?: string; icon_url?: string }>;

export function TeamsPanel({ tournamentId }: { tournamentId: string }) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadConfigPending, setLoadConfigPending] = useState(false);
  const [localEdits, setLocalEdits] = useState<LocalEdits>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<AdminActionResult | null>(null);

  useEffect(() => {
    if (!tournamentId) {
      setTeams([]);
      return;
    }
    setLoading(true);
    getTournamentTeamsForAdminAction(tournamentId).then((res) => {
      setTeams(res.teams);
      setLoading(false);
    });
  }, [tournamentId]);

  async function saveRow(t: TeamRow) {
    const name = (localEdits[t.id]?.name ?? t.name).trim();
    const icon_url = (localEdits[t.id]?.icon_url ?? t.icon_url ?? "").trim() || null;
    if (name === t.name && icon_url === (t.icon_url ?? null)) {
      setLocalEdits((prev) => {
        const next = { ...prev };
        delete next[t.id];
        return next;
      });
      return;
    }
    setMsg(null);
    setSavingId(t.id);
    const result = await updateTeamAction(t.id, {
      name: name || undefined,
      icon_url,
    });
    setMsg(result);
    setSavingId(null);
    if (result.success) {
      setLocalEdits((prev) => {
        const next = { ...prev };
        delete next[t.id];
        return next;
      });
      getTournamentTeamsForAdminAction(tournamentId).then((res) => setTeams(res.teams));
    }
  }

  if (!tournamentId) {
    return (
      <Card title="Teams (names & pictures)">
        <p className="text-stone-500 text-sm">Select a tournament above.</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card title="Teams (names & pictures)">
        <p className="text-stone-500 text-sm">Loading teams…</p>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card title="Teams (names & pictures)">
        <p className="text-stone-500 text-sm">No teams. Seed the tournament first.</p>
      </Card>
    );
  }

  async function load2026Teams() {
    setMsg(null);
    setLoadConfigPending(true);
    try {
      const res = await fetch("/2026-teams.json");
      if (!res.ok) throw new Error("Failed to fetch 2026-teams.json");
      const config = (await res.json()) as TeamConfigEntry[];
      const result = await bulkUpdateTeamsFromConfigAction(tournamentId, config);
      setMsg(result);
      if (result.success) {
        getTournamentTeamsForAdminAction(tournamentId).then((r) => setTeams(r.teams));
      }
    } catch (e) {
      setMsg({ success: false, message: e instanceof Error ? e.message : "Load failed." });
    } finally {
      setLoadConfigPending(false);
    }
  }

  return (
    <Card title="Teams (names & pictures)">
      <p className="text-stone-500 text-xs mb-3">Type in the name or icon URL; changes save when you tab or click away. Applies across pools and brackets.</p>
      <div className="flex items-center gap-2 mb-3">
        <Btn type="button" onClick={load2026Teams} pending={loadConfigPending} disabled={loadConfigPending}>
          Load 2026 teams
        </Btn>
        <span className="text-stone-500 text-xs">Overwrites names and logos from public/2026-teams.json</span>
      </div>
      {msg && <StatusBadge result={msg} />}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto space-y-2">
        {teams.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center gap-2 py-2 px-3 rounded border border-card-border bg-background text-sm"
          >
            <span className="text-stone-500 font-mono shrink-0 w-20">{t.region} #{t.seed}</span>
            <Input
              className="flex-1 min-w-[120px]"
              value={localEdits[t.id]?.name ?? t.name}
              onChange={(e) =>
                setLocalEdits((prev) => ({ ...prev, [t.id]: { ...prev[t.id], name: e.target.value } }))
              }
              onBlur={() => saveRow(t)}
              placeholder="Team name"
              disabled={savingId === t.id}
            />
            <Input
              className="flex-1 min-w-[140px] max-w-[200px]"
              value={localEdits[t.id]?.icon_url ?? t.icon_url ?? ""}
              onChange={(e) =>
                setLocalEdits((prev) => ({ ...prev, [t.id]: { ...prev[t.id], icon_url: e.target.value } }))
              }
              onBlur={() => saveRow(t)}
              placeholder="Icon URL"
              disabled={savingId === t.id}
            />
            {t.icon_url ? (
              <img src={t.icon_url} alt="" className="w-6 h-6 object-contain shrink-0" />
            ) : (
              <span className="w-6 h-6 shrink-0 text-stone-600 text-xs">—</span>
            )}
            {savingId === t.id && <span className="text-stone-500 text-xs">Saving…</span>}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Pools (admin: list pools + remove players) ──

function memberDisplayName(m: PoolWithMembersForAdmin["members"][number]): string {
  const parts = [m.first_name, m.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  if (m.username) return m.username;
  return m.user_id.slice(0, 8) + "…";
}

export function PoolsPanel({ tournamentId }: { tournamentId: string }) {
  const [pools, setPools] = useState<PoolWithMembersForAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<AdminActionResult | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  function refreshPools() {
    if (!tournamentId) return;
    setLoading(true);
    getPoolsWithMembersForAdminAction(tournamentId).then((res) => {
      setPools(res.pools ?? []);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!tournamentId) {
      setPools([]);
      setLoading(false);
      return;
    }
    refreshPools();
  }, [tournamentId]);

  async function handleRemove(poolId: string, memberUserId: string) {
    setMsg(null);
    setRemoving(`${poolId}:${memberUserId}`);
    const result = await adminRemovePoolMemberAction(poolId, memberUserId);
    setMsg(result);
    setRemoving(null);
    if (result.success) refreshPools();
  }

  if (!tournamentId) {
    return (
      <Card title="Pools (remove players)">
        <p className="text-stone-500 text-sm">Select a tournament above.</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card title="Pools (remove players)">
        <p className="text-stone-500 text-sm">Loading pools…</p>
      </Card>
    );
  }

  return (
    <Card title="Pools (remove players)">
      <p className="text-stone-500 text-xs mb-3">Remove a player from a pool. This also removes their bracket from the pool.</p>
      {msg && <StatusBadge result={msg} />}
      {pools.length === 0 ? (
        <p className="text-stone-500 text-sm">No pools for this tournament.</p>
      ) : (
        <div className="space-y-4 max-h-[420px] overflow-y-auto">
          {pools.map((pool) => (
            <div
              key={pool.id}
              className="rounded border border-card-border bg-background p-3 text-sm"
            >
              <div className="font-medium text-stone-200 mb-1">
                {pool.name}
                <span className="text-stone-500 font-mono text-xs ml-2">({pool.invite_code})</span>
              </div>
              <div className="text-stone-500 text-xs mb-2">
                {pool.member_count} member{pool.member_count !== 1 ? "s" : ""}
              </div>
              <ul className="space-y-1.5">
                {pool.members.map((m) => (
                  <li
                    key={m.user_id}
                    className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-stone-900/50"
                  >
                    <span className="text-stone-300 truncate">
                      {memberDisplayName(m)}
                    </span>
                    <Btn
                      variant="danger"
                      onClick={() => handleRemove(pool.id, m.user_id)}
                      disabled={removing !== null}
                      pending={removing === `${pool.id}:${m.user_id}`}
                    >
                      Remove
                    </Btn>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Wrapper: shared tournament selection for manager + game results + teams ──

export function AdminTournamentPanels({ tournaments }: { tournaments: Tournament[] }) {
  const [tournamentId, setTournamentId] = useState(tournaments[0]?.id ?? "");

  useEffect(() => {
    if (tournaments.length > 0 && !tournaments.find((t) => t.id === tournamentId)) {
      setTournamentId(tournaments[0].id);
    }
  }, [tournaments, tournamentId]);

  return (
    <>
      <TournamentManagerPanel
        tournaments={tournaments}
        tournamentId={tournamentId}
        onTournamentIdChange={setTournamentId}
      />
      <GameResultsPanel tournamentId={tournamentId} />
      <TeamsPanel tournamentId={tournamentId} />
      <PoolsPanel tournamentId={tournamentId} />
    </>
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
