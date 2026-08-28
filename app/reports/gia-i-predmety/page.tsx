import Link from "next/link";
import { getAllStudents, parseSubjects } from "@/lib/get-students";

function countBy<T>(items: T[], keyFn: (item: T) => string): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function ReportsPage() {
  const rows = await getAllStudents("gia, produkty");

  const byGia = countBy(rows, (row) => row.gia || "не указано");

  const subjectCounts = new Map<string, number>();
  for (const row of rows) {
    for (const subject of parseSubjects(row.produkty)) {
      subjectCounts.set(subject, (subjectCounts.get(subject) ?? 0) + 1);
    }
  }
  const bySubject = [...subjectCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="page">
      <Link href="/" className="back-link">
        ← Список отчётов
      </Link>
      <h1>По ГИА и предметам</h1>
      <p className="muted">Всего учеников: {rows.length}</p>

      <h2>По ГИА</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ГИА</th>
              <th>Учеников</th>
            </tr>
          </thead>
          <tbody>
            {byGia.map(([gia, count]) => (
              <tr key={gia}>
                <td>{gia}</td>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>По предметам</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        Один ученик может изучать несколько предметов, поэтому сумма по этой
        таблице больше общего числа учеников.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Предмет</th>
              <th>Учеников</th>
            </tr>
          </thead>
          <tbody>
            {bySubject.map(([subject, count]) => (
              <tr key={subject}>
                <td>{subject}</td>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
