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

  // 3. В исходной таблице встречаются повторы id_platforma (баг данных, должно быть
  //    ровно по одной строке на ученика). Схлопываем дубли, оставляя последнюю по
  //    порядку запись на каждого — иначе Postgres откажется обновлять одну и ту же
  //    строку дважды в рамках одного upsert.
  const byId = new Map<string, DbRow>();
  const duplicateNames = new Map<string, string[]>();
  for (const row of rows) {
    const id = row.id_platforma;
    if (id) {
      if (byId.has(id)) {
        const names = duplicateNames.get(id) ?? [byId.get(id)?.fi_uchenika ?? null].filter((n): n is string => !!n);
        if (row.fi_uchenika) names.push(row.fi_uchenika);
        duplicateNames.set(id, names);
      }
      byId.set(id, row);
    }
  }
  const dedupedRows = [...byId.values()];

  if (dryRun) {
    const blank = rows.filter((r) => !r.id_platforma);
    return Response.json({
      totalRows: rows.length,
      blankIdPlatforma: blank.length,
      distinctIdPlatforma: byId.size,
      duplicateIdPlatformaCount: duplicateNames.size,
      duplicateExamples: [...duplicateNames.entries()].slice(0, 5).map(([id, names]) => ({
        id_platforma: id,
        names,
      })),
    });
  }

  // 4. Заливаем всё одним запросом: обновляем существующих по id_platforma, остальных создаём
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase
    .from("students_pk")
    .upsert(dedupedRows, { onConflict: "id_platforma" });

  if (error) {
    return Response.json(
      { ok: false, rowsInCsv: rows.length, error: error.message },
      { status: 500 }
    );
  }

  return Response.json({
    ok: true,
    rowsInCsv: rows.length,
    rowsUpserted: dedupedRows.length,
    duplicatesCollapsed: rows.length - dedupedRows.length,
    duplicateIdPlatformaValues: duplicateNames.size,
  });
}
