import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useT } from '@/lib/i18n/useT';

export interface SpendPoint {
  /** `YYYY-MM` */
  month: string;
  /** Acumulado hasta ese mes. */
  amount: number;
}

export interface SpendChartProps {
  points: SpendPoint[];
}

/**
 * Gasto acumulado (§7.6). Recharts con tokens del tema: `var(--accent)` y
 * `var(--line)`; nunca un color literal.
 */
export function SpendChart({ points }: SpendChartProps) {
  const { t, f } = useT();
  const data = points.map((point) => ({
    label: f.dateShort(`${point.month}-01`),
    amount: point.amount,
  }));

  return (
    <div className="h-52 w-full" role="img" aria-label={t('budget.chart.label')}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 14, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--line)"
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickLine={false}
            minTickGap={16}
          />
          <YAxis
            stroke="var(--line)"
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickLine={false}
            width={56}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--line)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--text)',
            }}
            labelStyle={{ color: 'var(--muted)' }}
            itemStyle={{ color: 'var(--text)' }}
            cursor={{ stroke: 'var(--line)' }}
            formatter={(value) => (typeof value === 'number' ? f.currency(value) : String(value))}
          />
          <Area
            type="monotone"
            dataKey="amount"
            name={t('budget.chart.series')}
            stroke="var(--accent)"
            strokeWidth={2}
            fill="var(--accent)"
            fillOpacity={0.12}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
