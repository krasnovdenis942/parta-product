import Link from "next/link";

const REPORTS = [
  {
    href: "/reports/gia-i-predmety",
    title: "По ГИА и предметам",
    description:
      "Сколько учеников сдают ЕГЭ/ОГЭ и сколько занимается по каждому предмету",
  },
];

export default function Home() {
  return (
    <div className="page">
      <h1>Отчёты</h1>
      <ul className="report-list">
        {REPORTS.map((report) => (
          <li key={report.href}>
            <Link href={report.href} className="report-card">
              <div className="title">{report.title}</div>
              <div className="desc">{report.description}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
