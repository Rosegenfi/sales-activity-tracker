import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { leaderboardApi } from '@/services/api';
import { Trophy, Phone, Users as UsersIcon, Star, Mail, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import type { LeaderboardData } from '@/types';

interface LeaderboardSummary {
  weekStartDate: string;
  totalAEs: number;
  aesWithCommitments: number;
  aesWithResults: number;
  totals: {
    callsTarget: number;
    callsActual: number;
    emailsTarget: number;
    emailsActual: number;
    meetingsTarget: number;
    meetingsActual: number;
  };
  percentages: {
    calls: number;
    emails: number;
    meetings: number;
  };
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

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [summary, setSummary] = useState<LeaderboardSummary | null>(null);
  const [history, setHistory] = useState<HistoryWeek[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const [lbRes, sumRes, histRes] = await Promise.all([
        leaderboardApi.getLeaderboard(),
        leaderboardApi.getSummary(),
        leaderboardApi.getHistory(2),
      ]);
      setLeaderboardData(lbRes.data);
      setSummary(sumRes.data as LeaderboardSummary);
      setHistory(histRes.data as HistoryWeek[]);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const avgAndMedian = useMemo(() => {
    if (!leaderboardData) return { avg: 0, median: 0, over80: 0 };
    const values = leaderboardData.leaderboard
      .filter(e => e.hasData)
      .map(e => e.achievementPercentage)
      .sort((a, b) => a - b);
    if (values.length === 0) return { avg: 0, median: 0, over80: 0 };
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 === 0 ? Math.round((values[mid - 1] + values[mid]) / 2) : values[mid];
    const over80 = Math.round((values.filter(v => v >= 80).length / values.length) * 100);
    return { avg, median, over80 };
  }, [leaderboardData]);

  const topEmailers = useMemo(() => {
    if (!leaderboardData) return [] as Array<{ id: number; fullName: string; emailsActual: number }>;
    return leaderboardData.leaderboard
      .slice()
      .sort((a, b) => (b.emailsActual || 0) - (a.emailsActual || 0))
      .slice(0, 3)
      .map(e => ({ id: e.id, fullName: e.fullName, emailsActual: e.emailsActual }));
  }, [leaderboardData]);

  const topCallConverters = useMemo(() => {
    if (!leaderboardData) return [] as Array<{ id: number; fullName: string; rate: number; callsActual: number; meetingsActual: number }>;
    return leaderboardData.leaderboard
      .map(e => ({
        id: e.id,
        fullName: e.fullName,
        callsActual: e.callsActual,
        meetingsActual: e.meetingsActual,
        rate: e.callsActual > 0 ? (e.meetingsActual / e.callsActual) : 0,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3);
  }, [leaderboardData]);

  const topEmailConverters = useMemo(() => {
    if (!leaderboardData) return [] as Array<{ id: number; fullName: string; rate: number; emailsActual: number; meetingsActual: number }>;
    return leaderboardData.leaderboard
      .map(e => ({
        id: e.id,
        fullName: e.fullName,
        emailsActual: e.emailsActual,
        meetingsActual: e.meetingsActual,
        rate: e.emailsActual > 0 ? (e.meetingsActual / e.emailsActual) : 0,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3);
  }, [leaderboardData]);

  const wowByUser = useMemo(() => {
    const map: Record<number, { calls: number|null; emails: number|null; meetings: number|null }> = {};
    if (!history || history.length < 2) return map;
    const last = history[0];
    const prior = history[1];
    const lastMap = new Map(last.aes.map(a => [a.id, a.results]));
    const priorMap = new Map(prior.aes.map(a => [a.id, a.results]));
    const ids = new Set<number>([...lastMap.keys(), ...priorMap.keys()]);
    ids.forEach(id => {
      const l = lastMap.get(id) || { calls: 0, emails: 0, meetings: 0 };
      const p = priorMap.get(id) || { calls: 0, emails: 0, meetings: 0 };
      const pct = (lv: number, pv: number) => (pv === 0 ? null : Math.round(((lv - pv) / pv) * 1000) / 10);
      map[id] = {
        calls: pct(l.calls, p.calls),
        emails: pct(l.emails, p.emails),
        meetings: pct(l.meetings, p.meetings),
      };
    });
    return map;
  }, [history]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!leaderboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No leaderboard data available</p>
      </div>
    );
  }

  const getAchievementColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    if (percentage >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return { icon: '🥇', color: 'text-yellow-500' };
    if (index === 1) return { icon: '🥈', color: 'text-gray-400' };
    if (index === 2) return { icon: '🥉', color: 'text-orange-600' };
    return null;
  };

  const wowCell = (val: number|null|undefined) => {
    if (val === null || val === undefined) return <span className="text-gray-400">—</span>;
    const up = val >= 0;
    return (
      <span className={up ? 'text-green-600' : 'text-amber-600'}>
        {up ? '▲' : '▼'}{Math.abs(val)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Trophy className="h-8 w-8 mr-3" />
              Team Leaderboard
            </h1>
            <p className="mt-2 text-primary-100">
              Week of {format(new Date(leaderboardData.weekStartDate), 'MMMM d, yyyy')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-primary-100">Previous Week Results</p>
            <p className="text-lg font-semibold">{leaderboardData.leaderboard.length} AEs</p>
          </div>
        </div>
      </div>

      {/* Team Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Calls</p>
                <p className="text-2xl font-bold">{summary.totals.callsActual}</p>
                <p className="text-xs text-gray-600">Target {summary.totals.callsTarget} • {summary.percentages.calls}%</p>
              </div>
              <Phone className="h-8 w-8 text-primary-600" />
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Emails</p>
                <p className="text-2xl font-bold">{summary.totals.emailsActual}</p>
                <p className="text-xs text-gray-600">Target {summary.totals.emailsTarget} • {summary.percentages.emails}%</p>
              </div>
              <Mail className="h-8 w-8 text-primary-600" />
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Meetings</p>
                <p className="text-2xl font-bold">{summary.totals.meetingsActual}</p>
                <p className="text-xs text-gray-600">Target {summary.totals.meetingsTarget} • {summary.percentages.meetings}%</p>
              </div>
              <UsersIcon className="h-8 w-8 text-primary-600" />
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Participation</p>
                <p className="text-2xl font-bold">{summary.aesWithResults}/{summary.totalAEs}</p>
                <p className="text-xs text-gray-600">With targets: {summary.aesWithCommitments}/{summary.totalAEs}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary-600" />
            </div>
          </div>
        </div>
      )}

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Callers */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Phone className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold">Top Callers</h2>
          </div>
          <div className="space-y-3">
            {leaderboardData.topCallers.map((caller, index) => (
              <div key={caller.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getRankBadge(index)?.icon}</span>
                  <Link 
                    to={`/profile/${caller.id}`}
                    className="font-medium hover:text-primary-600 transition-colors"
                  >
                    {caller.fullName}
                  </Link>
                </div>
                <span className="font-bold text-primary-600">{caller.callsActual}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Emailers */}
        <div className="card">
          <div className="flex items-center mb-4">
            <Mail className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold">Top Emailers</h2>
          </div>
          <div className="space-y-3">
            {topEmailers.map((p, index) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getRankBadge(index)?.icon}</span>
                  <Link 
                    to={`/profile/${p.id}`}
                    className="font-medium hover:text-primary-600 transition-colors"
                  >
                    {p.fullName}
                  </Link>
                </div>
                <span className="font-bold text-primary-600">{p.emailsActual}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Meeting Bookers */}
        <div className="card">
          <div className="flex items-center mb-4">
            <UsersIcon className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-lg font-semibold">Top Meeting Bookers</h2>
          </div>
          <div className="space-y-3">
            {leaderboardData.topMeetingBookers.map((booker, index) => (
              <div key={booker.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getRankBadge(index)?.icon}</span>
                  <Link 
                    to={`/profile/${booker.id}`}
                    className="font-medium hover:text-primary-600 transition-colors"
                  >
                    {booker.fullName}
                  </Link>
                </div>
                <span className="font-bold text-primary-600">{booker.meetingsActual}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Conversion (Calls → Meetings) */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Top Conversion (Calls → Meetings)</h2>
            <TrendingUp className="h-6 w-6 text-primary-600" />
          </div>
          <div className="space-y-3">
            {topCallConverters.map((p, index) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getRankBadge(index)?.icon}</span>
                  <Link to={`/profile/${p.id}`} className="font-medium hover:text-primary-600 transition-colors">
                    {p.fullName}
                  </Link>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary-600">{Math.round(p.rate * 100)}</div>
                  <div className="text-xs text-gray-500">{p.meetingsActual} mtgs / {p.callsActual} calls</div>
                </div>
              </div>
            ))}
            {topCallConverters.length === 0 && (
              <p className="text-sm text-gray-500">No activity yet</p>
            )}
          </div>
        </div>

        {/* Top Conversion (Emails → Meetings) */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Top Conversion (Emails → Meetings)</h2>
            <TrendingUp className="h-6 w-6 text-primary-600" />
          </div>
          <div className="space-y-3">
            {topEmailConverters.map((p, index) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getRankBadge(index)?.icon}</span>
                  <Link to={`/profile/${p.id}`} className="font-medium hover:text-primary-600 transition-colors">
                    {p.fullName}
                  </Link>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary-600">{Math.round(p.rate * 100)}</div>
                  <div className="text-xs text-gray-500">{p.meetingsActual} mtgs / {p.emailsActual} emails</div>
                </div>
              </div>
            ))}
            {topEmailConverters.length === 0 && (
              <p className="text-sm text-gray-500">No activity yet</p>
            )}
          </div>
        </div>

        {/* Achievement Snapshot */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Achievement Snapshot</h2>
            <Star className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Average</p>
              <p className="text-2xl font-bold">{avgAndMedian.avg}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Median</p>
              <p className="text-2xl font-bold">{avgAndMedian.median}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">≥80%</p>
              <p className="text-2xl font-bold">{avgAndMedian.over80}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full Leaderboard */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Achievement Rankings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Rank</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Calls</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Emails</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Meetings</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Achievement</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.leaderboard.map((entry, index) => {
                const badge = getRankBadge(index);
                const wow = wowByUser[entry.id] || { calls: null, emails: null, meetings: null };
                return (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {badge ? (
                          <span className="text-2xl mr-2">{badge.icon}</span>
                        ) : (
                          <span className="text-gray-500 font-medium mr-2">{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link 
                        to={`/profile/${entry.id}`}
                        className="font-medium hover:text-primary-600 transition-colors flex items-center"
                      >
                        {entry.fullName}
                        {entry.achievementPercentage >= 100 && (
                          <Star className="h-4 w-4 text-yellow-500 ml-2" />
                        )}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-sm">
                        <span className="font-semibold">{entry.callsActual}</span>
                        {entry.callsTarget > 0 && (
                          <span className="text-gray-500">/{entry.callsTarget}</span>
                        )}
                      </div>
                      <div className="text-xs">{wowCell(wow.calls)}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-sm">
                        <span className="font-semibold">{entry.emailsActual}</span>
                        {entry.emailsTarget > 0 && (
                          <span className="text-gray-500">/{entry.emailsTarget}</span>
                        )}
                      </div>
                      <div className="text-xs">{wowCell(wow.emails)}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-sm">
                        <span className="font-semibold">{entry.meetingsActual}</span>
                        {entry.meetingsTarget > 0 && (
                          <span className="text-gray-500">/{entry.meetingsTarget}</span>
                        )}
                      </div>
                      <div className="text-xs">{wowCell(wow.meetings)}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {entry.hasData ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAchievementColor(entry.achievementPercentage)}`}>
                          {entry.achievementPercentage}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">No data</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Achievement Legend */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Achievement Legend</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            <span className="text-sm text-gray-600">100%+ (Goal Achieved)</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
            <span className="text-sm text-gray-600">80-99%</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
            <span className="text-sm text-gray-600">60-79%</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            <span className="text-sm text-gray-600">Below 60%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;