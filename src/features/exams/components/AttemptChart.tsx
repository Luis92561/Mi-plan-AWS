import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useT } from '@/lib/i18n/useT';

export interface AttemptChartPoint {
  id: string;
  /** Etiqueta ya formateada (fecha corta). */
  label: string;
  score: number;
}

export interface AttemptChartProps {
  points: AttemptChartPoint[];
  /** Mínimo aprobatorio de la certificación filtrada, si hay una sola. */
  passingScore: number | null;
}

/**
 * Evolución de puntajes (§7.5). Recharts con tokens del tema: nunca un hex.
 */
export function AttemptChart({ points, passingScore }: AttemptChartProps) {
  const { t } = useT();

  return (
    <div className="h-56 w-full" role="img" aria-label={t('practice.chart.label')}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 14, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--line)"
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            domain={[100, 1000]}
            ticks={[100, 400, 700, 1000]}
            stroke="var(--line)"
            tick={{ fill: 'var(--muted)', fontSize: 11 }}
            tickLine={false}
            width={46}
          />
          {passingScore !== null ? (
            <ReferenceLine
              y={passingScore}
              stroke="var(--line-strong)"
              strokeDasharray="4 4"
              label={{
                value: t('practice.chart.passing', { score: passingScore }),
                fill: 'var(--muted)',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />
          ) : null}
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
          />
          <Line
            type="monotone"
            dataKey="score"
            name={t('practice.chart.series')}
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--accent)', stroke: 'var(--panel)' }}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
