import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type SyncRun = {
  id: number;
  started_at: string;
  finished_at: string;
  status: string;
  rows_in_csv: number | null;
  rows_upserted: number | null;
  duplicates_collapsed: number | null;
  error_message: string | null;
};

export async function getRecentSyncRuns(limit: number = 10): Promise<SyncRun[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from("sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }
  return (data as unknown as SyncRun[]) ?? [];
}
