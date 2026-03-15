"use client";

import { useActionState, useState } from "react";
import { updatePoolSettingsAction, UpdatePoolSettingsState } from "../actions";
import ScoringSettingsForm from "../../../_components/scoring-settings-form";
import ImageUpload from "@/app/_components/image-upload";
import { Pool, GoodyType, PoolGoody } from "@/lib/types";

const initialState: UpdatePoolSettingsState = {};

export default function PoolSettingsForm({
  poolId,
  pool,
  goodyTypes,
  poolGoodies,
  modeParam,
}: {
  poolId: string;
  pool: Pool;
  goodyTypes: GoodyType[];
  poolGoodies: PoolGoody[];
  modeParam: string;
}) {
  const [state, action, isPending] = useActionState(updatePoolSettingsAction, initialState);
  const [poolName, setPoolName] = useState(pool.name);

  return (
    <form action={action} noValidate className="flex flex-col gap-6 w-full">
      <input type="hidden" name="pool_id" value={poolId} />
      {modeParam && <input type="hidden" name="mode" value="test" />}

      <div>
        <label htmlFor="pool-name" className="block text-xs font-medium mb-1.5 text-muted-foreground">
          Pool Name
        </label>
        <input
          id="pool-name"
          name="name"
          type="text"
          placeholder="e.g. Office Pool 2026"
          maxLength={50}
          value={poolName}
          onChange={(e) => setPoolName(e.target.value)}
          className="input-field"
          style={state.fieldErrors?.name ? { borderColor: "#f87171" } : undefined}
        />
        {state.fieldErrors?.name && (
          <p className="mt-1.5 text-xs text-red-400">{state.fieldErrors.name}</p>
        )}
      </div>

      <ImageUpload
        name="image_url"
        label="Pool icon"
        initialValue={pool.image_url}
        previewShape="rounded"
        storagePath="pools"
      />

      <div className="border-t border-card-border pt-5">
        <h2 className="text-base font-medium text-stone-200 mb-4">Scoring Settings</h2>
        <ScoringSettingsForm
          roundPoints={pool.round_points}
          upsetPointsEnabled={pool.upset_points_enabled}
          upsetMultipliers={pool.upset_multipliers}
          goodiesEnabled={pool.goodies_enabled}
          goodyTypes={goodyTypes}
          poolGoodies={poolGoodies}
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}
      {state.success && (
        <p className="text-sm text-green-400">Settings saved.</p>
      )}

      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}
