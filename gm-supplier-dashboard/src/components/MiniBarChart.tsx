import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * Compare supplier SG&A% and EBIT% vs tier benchmark (PRD §5.7).
 */
export function MiniBarChart({
  sgaPct,
  ebitPct,
  benchSga,
  benchEbit,
}: {
  sgaPct: number | null
  ebitPct: number | null
  benchSga: number | null
  benchEbit: number | null
}) {
  const data = [
    {
      name: 'SG&A%',
      supplier: sgaPct != null ? sgaPct * 100 : 0,
      benchmark: benchSga != null ? benchSga * 100 : 0,
    },
    {
      name: 'EBIT%',
      supplier: ebitPct != null ? ebitPct * 100 : 0,
      benchmark: benchEbit != null ? benchEbit * 100 : 0,
    },
  ]

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11 }}
            domain={[0, 'auto']}
          />
          <ReferenceLine y={0} stroke="#ccc" />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="supplier" fill="var(--gm-blue)" name="Supplier" radius={[4, 4, 0, 0]} />
          <Bar dataKey="benchmark" fill="var(--accent-teal)" name="Tier avg" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
