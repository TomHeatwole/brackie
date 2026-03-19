"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updatePoolSettingsAction,
  UpdatePoolSettingsState,
  deletePoolAction,
} from "../actions";
import ScoringSettingsForm from "../../../_components/scoring-settings-form";
import ImageUpload from "@/app/_components/image-upload";
import { PoolWithDetails, GoodyType, PoolGoody } from "@/lib/types";

const initialState: UpdatePoolSettingsState = {};

export default function PoolSettingsForm({
  poolId,
  pool,
  goodyTypes,
  poolGoodies,
  modeParam,
}: {
  poolId: string;
  pool: PoolWithDetails;
  goodyTypes: GoodyType[];
  poolGoodies: PoolGoody[];
  modeParam: string;
}) {
  const [state, action, isPending] = useActionState(updatePoolSettingsAction, initialState);
  const [poolName, setPoolName] = useState(pool.name);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const router = useRouter();

  const memberCount = pool.member_count ?? 0;

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

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

      <div className="mt-8 border-t border-card-border pt-5">
        <h2 className="text-base font-medium text-red-400 mb-2">Danger zone</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Deleting this pool cannot be undone.
        </p>
        {deleteError && (
          <p className="mb-2 text-xs text-red-400">{deleteError}</p>
        )}
        <button
          type="button"
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className={`w-full text-xs px-3 py-2 rounded-md border border-red-500/60 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-60 ${
            showDeleteDialog ? "bg-red-500/10" : ""
          }`}
        >
          {isDeleting ? "Deleting…" : "Delete pool"}
        </button>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg bg-stone-900 border border-card-border p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-stone-100 mb-2">
              Delete pool?
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              {memberCount > 1
                ? `This pool currently has ${memberCount} members. Deleting it will remove their access to this pool and its brackets.`
                : "You are the only member of this pool. Deleting it will remove it permanently."}
              {" "}Are you sure you want to delete it?
            </p>
            {deleteError && (
              <p className="mb-2 text-xs text-red-400">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-md border border-card-border text-muted hover:bg-white/5"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-500 disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteError(null);
                  startDeleteTransition(async () => {
                    const result = await deletePoolAction(poolId);
                    if (!result.success) {
                      setDeleteError(result.error ?? "Failed to delete pool.");
                      return;
                    }
                    setShowDeleteDialog(false);
                    router.push(`/pools${modeParam}`);
                  });
                }}
              >
                {isDeleting ? "Deleting…" : "Delete anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
