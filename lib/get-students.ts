import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type StudentRow = Record<string, string | null>;

// Supabase (PostgREST) отдаёт не больше 1000 строк за один запрос —
// поэтому забираем данные пачками, пока не дойдём до конца таблицы.
export async function getAllStudents(columns: string = "*"): Promise<StudentRow[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const pageSize = 1000;
  const allRows: StudentRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("students_pk")
      .select(columns)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }
    if (!data || data.length === 0) {
      break;
    }

    // Supabase не может статически вывести тип строк по произвольной
    // строке columns без описания схемы базы — говорим TypeScript доверять нам.
    allRows.push(...(data as unknown as StudentRow[]));
    if (data.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return allRows;
}

// "Продукты" в таблице — это склеенный текст вида
// "Математика - Шамиль Д - Стандарт, Русский язык - Майя - Стандарт".
// Разбираем на отдельные предметы: берём часть до первого " - " в каждом
// куске между запятыми. Данные не идеальные (иногда куратор пустой или
// в его поле затесался тип экзамена), но название предмета всегда идёт
// первым, так что этот разбор устойчив к такому мусору.
export function parseSubjects(produkty: string | null): string[] {
  if (!produkty) return [];
  return produkty
    .split(",")
    .map((part) => part.trim().split(" - ")[0].trim())
    .filter(Boolean);
}
