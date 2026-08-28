import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import { COLUMN_MAP } from "@/lib/students-pk-columns";

const SHEET_CSV_URL = process.env.SHEET_CSV_URL!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type SheetRow = Record<string, string>;
type DbRow = Record<string, string | null>;

export async function GET(request: Request) {
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  const startedAt = new Date().toISOString();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 1. Скачиваем CSV — то же самое, что уже делает главная страница
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    const csvText = await res.text();
    const parsed = Papa.parse<SheetRow>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    // 2. Переименовываем колонки из русских заголовков в имена колонок Supabase
    const now = new Date().toISOString();
    const rows: DbRow[] = parsed.data.map((sheetRow) => {
      const dbRow: DbRow = { synced_at: now };
      for (const [sheetHeader, dbColumn] of Object.entries(COLUMN_MAP)) {
        const value = sheetRow[sheetHeader];
        dbRow[dbColumn] = value && value.trim() !== "" ? value.trim() : null;
      }
      return dbRow;
    });

    // 3. Схлопываем дубли id_platforma (баг данных, должно быть по одной строке
    //    на ученика) — иначе Postgres откажется обновлять одну строку дважды
    //    в рамках одного upsert.
    const byId = new Map<string, DbRow>();
    for (const row of rows) {
      const id = row.id_platforma;
      if (id) byId.set(id, row);
    }
    const dedupedRows = [...byId.values()];

    if (dryRun) {
      const blank = rows.filter((r) => !r.id_platforma);
      return Response.json({
        totalRows: rows.length,
        blankIdPlatforma: blank.length,
        distinctIdPlatforma: byId.size,
      });
    }

    // 4. Заливаем всё одним запросом: обновляем существующих по id_platforma,
    //    остальных создаём
    const { error } = await supabase
      .from("students_pk")
      .upsert(dedupedRows, { onConflict: "id_platforma" });

    if (error) {
      throw new Error(error.message);
    }

    // 5. Записываем результат в журнал синхронизаций — чтобы кнопка на сайте
    //    могла показать историю запусков (это не влияет на исход, поэтому
    //    ошибку самой записи в журнал просто игнорируем, а не роняем весь sync)
    await supabase.from("sync_runs").insert({
      started_at: startedAt,
      status: "success",
      rows_in_csv: rows.length,
      rows_upserted: dedupedRows.length,
      duplicates_collapsed: rows.length - dedupedRows.length,
    });

    return Response.json({
      ok: true,
      rowsInCsv: rows.length,
      rowsUpserted: dedupedRows.length,
      duplicatesCollapsed: rows.length - dedupedRows.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (!dryRun) {
      await supabase.from("sync_runs").insert({
        started_at: startedAt,
        status: "error",
        error_message: message,
      });
    }

    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
