import { useEffect, useState } from 'react';
import { activityApi } from '@/services/api';
import { format, startOfWeek } from 'date-fns';
import { Calendar } from 'lucide-react';

interface AdminRow {
  userId: number;
  firstName: string;
  lastName: string;
  activities: Record<string, { thisWeek: number; lastWeek: number; wowPct: number|null }> | Record<string, number>;
}

type Mode = 'daily' | 'weekly';

const AdminActivity = () => {
  const [mode, setMode] = useState<Mode>('weekly');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [weekStart] = useState<string>(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, date, weekStart]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (mode === 'daily') {
        const res = await activityApi.getAdminDaily(date);
        setRows(res.data.users);
      } else {
        const res = await activityApi.getAdminOverview();
        setRows(res.data.users);
      }
    } finally {
      setLoading(false);
    }
  };

  const allTypes = ['call','email','meeting','social'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Activity Overview</h1>
        <div className="flex items-center gap-3">
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="input-field w-36">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly (WoW)</option>
          </select>
          {mode === 'daily' ? (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
          ) : (
            <div className="text-sm text-gray-600 flex items-center"><Calendar className="h-4 w-4 mr-2" /> Week of {format(new Date(weekStart), 'MMM d, yyyy')}</div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rep</th>
                {allTypes.map(t => (
                  <th key={t} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t}</th>
                ))}
                {mode === 'weekly' && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">WoW%</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No data</td></tr>
              ) : (
                rows.map((row) => {
                  const activities: any = row.activities || {};
                  const totals = allTypes.map(t => (mode === 'daily' ? (activities[t] || 0) : (activities[t]?.thisWeek || 0)));
                  const wowPcts = allTypes
                    .map(t => activities[t]?.wowPct)
                    .filter((v: number | null | undefined) => v !== null && v !== undefined) as number[];
                  const wowAvg = wowPcts.length ? (wowPcts.reduce((a,b) => a+b, 0) / wowPcts.length) : null;
                  return (
                    <tr key={row.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold mr-3">
                            {row.firstName[0]}{row.lastName[0]}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{row.firstName} {row.lastName}</div>
                            <div className="text-xs text-gray-500">Rep</div>
                          </div>
                        </div>
                      </td>
                      {totals.map((v, idx) => (
                        <td key={idx} className="px-4 py-3 text-right text-sm text-gray-900 font-medium">{v}</td>
                      ))}
                      {mode === 'weekly' && (
                        <td className="px-4 py-3 text-right text-sm font-medium">
                          {wowAvg === null ? '—' : (
                            <span className={wowAvg >= 0 ? 'text-green-600' : 'text-amber-600'}>
                              {wowAvg >= 0 ? '▲' : '▼'}{Math.abs(Number(wowAvg.toFixed(1)))}%
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminActivity;