import { useEffect, useMemo, useState } from 'react';
import { activityApi, leaderboardApi } from '@/services/api';
import { format, startOfWeek } from 'date-fns';
import { Calendar } from 'lucide-react';

interface AdminRow {
  userId: number;
  firstName: string;
  lastName: string;
  activities: Record<string, { thisWeek: number; lastWeek: number; wowPct: number|null }> | Record<string, number>;
}

interface HistoryWeek {
  weekStartDate: string;
  aes: Array<{
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    results: { calls: number; emails: number; meetings: number };
    targets: { calls: number; emails: number; meetings: number };
  }>;
}

const AdminActivity = () => {
  const [weekStart] = useState<string>(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [history, setHistory] = useState<HistoryWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPerf, setLoadingPerf] = useState(true);

  useEffect(() => {
    fetchData();
    fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await activityApi.getAdminOverview();
      setRows(res.data.users);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingPerf(true);
      // Fetch last 8 weeks to compute fallback targets if last week is missing
      const res = await leaderboardApi.getHistory(8);
      setHistory(res.data as HistoryWeek[]);
    } finally {
      setLoadingPerf(false);
    }
  };

  const allTypes = ['call','email','meeting','social'];

  const lastWeek = history[0];

  // Build per-user per-metric fallback targets from prior weeks (excluding last week)
  const fallbackTargetsByUser = useMemo(() => {
    const map = new Map<number, { calls?: number; emails?: number; meetings?: number }>();
    // Iterate over older weeks after the first (lastWeek)
    for (let i = 1; i < history.length; i++) {
      const wk = history[i];
      wk.aes.forEach(ae => {
        const current = map.get(ae.id) || {};
        if (!current.calls && ae.targets.calls && ae.targets.calls > 0) current.calls = ae.targets.calls;
        if (!current.emails && ae.targets.emails && ae.targets.emails > 0) current.emails = ae.targets.emails;
        if (!current.meetings && ae.targets.meetings && ae.targets.meetings > 0) current.meetings = ae.targets.meetings;
        map.set(ae.id, current);
      });
    }
    return map;
  }, [history]);

  const pct = (actual: number, target: number) => {
    if (!target || target <= 0) return 0;
    return Math.round((actual / target) * 100);
  };

  const overallPct = (r: { calls: number; emails: number; meetings: number }, t: { calls: number; emails: number; meetings: number }) => {
    const parts: number[] = [];
    parts.push(t.calls > 0 ? Math.min(100, Math.round((r.calls / t.calls) * 100)) : 0);
    parts.push(t.emails > 0 ? Math.min(100, Math.round((r.emails / t.emails) * 100)) : 0);
    parts.push(t.meetings > 0 ? Math.min(100, Math.round((r.meetings / t.meetings) * 100)) : 0);
    return Math.round(parts.reduce((a, b) => a + b, 0) / 3);
  };

  const chip = (value: number) => {
    const cls = value >= 80 ? 'bg-green-100 text-green-800' : value >= 60 ? 'bg-yellow-100 text-yellow-800' : value >= 40 ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800';
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{value}%</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Activity Overview</h1>
        <div className="text-sm text-gray-600 flex items-center"><Calendar className="h-4 w-4 mr-2 text-primary-500" /> Week of {format(new Date(weekStart), 'MMM d, yyyy')}</div>
      </div>

      <div className="card rounded-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rep</th>
                {allTypes.map(t => (
                  <th key={t} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t}</th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">WoW%</th>
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
                  const totals = allTypes.map(t => (activities[t]?.thisWeek || 0));
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
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {wowAvg === null ? '—' : (
                          <span className={wowAvg >= 0 ? 'text-green-600' : 'text-amber-600'}>
                            {wowAvg >= 0 ? '▲' : '▼'}{Math.abs(Number(wowAvg.toFixed(1)))}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Last Week Commitments vs Results */}
      <div className="card rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Last Week: Commitments vs Results</h2>
          {lastWeek && <div className="text-sm text-gray-600">Week of {format(new Date(lastWeek.weekStartDate), 'MMM d, yyyy')}</div>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rep</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Calls</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Emails</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Meetings</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Overall</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loadingPerf ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
              ) : !lastWeek ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No data</td></tr>
              ) : (
                lastWeek.aes.map((ae) => {
                  const r = ae.results;
                  const t = ae.targets;
                  const fb = fallbackTargetsByUser.get(ae.id) || {};
                  // Use last week's targets if present, otherwise fall back to prior week's non-zero targets per metric
                  const effTargets = {
                    calls: t.calls && t.calls > 0 ? t.calls : (fb.calls || 0),
                    emails: t.emails && t.emails > 0 ? t.emails : (fb.emails || 0),
                    meetings: t.meetings && t.meetings > 0 ? t.meetings : (fb.meetings || 0),
                  };
                  const overall = overallPct(r, effTargets);
                  return (
                    <tr key={ae.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold mr-3">
                            {ae.firstName[0]}{ae.lastName[0]}
                          </div>
                          <div className="text-sm font-medium text-gray-900">{ae.firstName} {ae.lastName}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm"><span className="font-semibold">{r.calls}</span><span className="text-gray-500">/{effTargets.calls}</span></div>
                        <div className="text-xs text-gray-500">{pct(r.calls, effTargets.calls)}%</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm"><span className="font-semibold">{r.emails}</span><span className="text-gray-500">/{effTargets.emails}</span></div>
                        <div className="text-xs text-gray-500">{pct(r.emails, effTargets.emails)}%</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-sm"><span className="font-semibold">{r.meetings}</span><span className="text-gray-500">/{effTargets.meetings}</span></div>
                        <div className="text-xs text-gray-500">{pct(r.meetings, effTargets.meetings)}%</div>
                      </td>
                      <td className="px-4 py-3 text-center">{chip(overall)}</td>
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