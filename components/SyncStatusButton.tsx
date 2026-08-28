"use client";

import { useState } from "react";
import type { SyncRun } from "@/lib/get-sync-runs";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU");
}

export default function SyncStatusButton({ runs }: { runs: SyncRun[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sync-status">
      <button className="sync-status__button" onClick={() => setOpen((v) => !v)}>
        Синхронизация
      </button>
      {open && (
        <div className="sync-status__panel">
          <div className="sync-status__title">Последние синхронизации</div>
          {runs.length === 0 && (
            <div className="muted" style={{ padding: "8px 12px" }}>
              Пока не было ни одной синхронизации
            </div>
          )}
          {runs.map((run) => (
            <div key={run.id} className="sync-status__row">
              <span
                className={
                  run.status === "success"
                    ? "sync-status__badge sync-status__badge--ok"
                    : "sync-status__badge sync-status__badge--error"
                }
              >
                {run.status === "success" ? "успех" : "ошибка"}
              </span>
              <div className="sync-status__details">
                <div>{formatDate(run.started_at)}</div>
                {run.status === "success" ? (
                  <div className="muted">
                    записано {run.rows_upserted} из {run.rows_in_csv}
                  </div>
                ) : (
                  <div className="muted">{run.error_message}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
