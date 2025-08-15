import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { activityApi } from '@/services/api';
import { format } from 'date-fns';
import {
  Calendar,
  Phone,
  Mail,
  Users,
  TrendingUp,
  Sparkles,
  PlusCircle,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const activityTypes: Array<{ key: 'call'|'email'|'meeting'|'social'; label: string; icon: any; color: string }> = [
  { key: 'call', label: 'Calls', icon: Phone, color: 'text-primary-600' },
  { key: 'email', label: 'Emails', icon: Mail, color: 'text-primary-600' },
  { key: 'meeting', label: 'Meetings', icon: Users, color: 'text-emerald-600' },
  { key: 'social', label: 'Social', icon: Sparkles, color: 'text-amber-600' },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [week, setWeek] = useState<Record<string, number>>({});
  const [wow, setWoW] = useState<Record<string, { last: number; prior: number; delta: number; pct: number|null }>>({});
  const [loggingType, setLoggingType] = useState<null | 'call'|'email'|'meeting'|'social'|'other'>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const res = await activityApi.getMySummary();
      setWeek(res.data.week || {});
      setWoW(res.data.wow || {});
    } catch (error) {
      console.error('Error loading activity summary', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const logQuick = async (type: 'call'|'email'|'meeting'|'social'|'other', qty = 1) => {
    try {
      await activityApi.logEvent({ activityType: type, quantity: qty });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} +${qty}`);
      await loadSummary();
      setLoggingType(null);
      setQuantity(1);
    } catch (e) {
      toast.error('Failed to log activity');
    }
  };

  const todayStr = format(new Date(), 'EEEE, MMMM d, yyyy');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-lg p-6 text-white bg-gradient-to-r from-primary-600 via-primary-600 to-primary-700">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.12),transparent_35%)]" />
        <div className="relative">
          <h1 className="text-2xl font-bold">Good morning, {user?.firstName} — let’s make it a big week.</h1>
          <p className="mt-2 text-primary-100">{todayStr}</p>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={() => setLoggingType('call')} className="btn-primary inline-flex items-center">
              <PlusCircle className="h-4 w-4 mr-2" /> Log activity
            </button>
          </div>
        </div>
      </div>

      {/* Weekly KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {activityTypes.map(({ key, label, icon: Icon, color }) => {
          const w = week[key] || 0;
          const wRow = wow[key];
          const pct = wRow?.pct;
          const trendColor = pct == null ? 'text-gray-500' : pct >= 0 ? 'text-green-600' : 'text-amber-600';
          const trendPrefix = pct == null ? '' : pct >= 0 ? '▲' : '▼';
          return (
            <div key={key} className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Week-to-date {label}</p>
                  <p className="text-2xl font-bold">{w}</p>
                  <p className={`text-xs mt-1 ${trendColor}`}>WoW {trendPrefix}{pct == null ? '—' : `${Math.abs(pct)}%`}</p>
                </div>
                <Icon className={`h-8 w-8 ${color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Planner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Suggested split</h2>
            <span className="text-sm text-gray-500">Quick add</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {activityTypes.map(({ key, label, icon: Icon, color }) => (
              <button key={key} onClick={() => logQuick(key, 1)} className="tile">
                <div className="flex items-center">
                  <Icon className={`h-6 w-6 mr-2 ${color}`} />
                  <span className="font-medium">+1 {label}</span>
                </div>
                <CheckCircle className="h-5 w-5 text-success-600" />
              </button>
            ))}
          </div>
          {loggingType && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center gap-3">
                <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value || '1'))} className="input-field w-24" />
                <button onClick={() => logQuick(loggingType!, quantity)} className="btn-primary">Add {quantity} {loggingType}</button>
                <button onClick={() => { setLoggingType(null); setQuantity(1); }} className="btn-secondary">Cancel</button>
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">This week momentum</h2>
          <div className="space-y-3">
            {activityTypes.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center">
                  <Icon className={`h-5 w-5 mr-2 ${color}`} />
                  <span className="text-sm text-gray-700">{label}</span>
                </div>
                <div className="text-sm font-semibold">{week[key] || 0}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <TrendingUp className="h-4 w-4 mr-2 text-primary-600" />
            Keep streaks alive: aim for activity every weekday.
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/leaderboard" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <TrendingUp className="h-10 w-10 text-yellow-600 mr-3" />
            <div>
              <h3 className="font-semibold">Leaderboard</h3>
              <p className="text-sm text-gray-600">See team momentum</p>
            </div>
          </div>
        </Link>
        <Link to="/weekly-commits" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <Calendar className="h-10 w-10 text-green-600 mr-3" />
            <div>
              <h3 className="font-semibold">History</h3>
              <p className="text-sm text-gray-600">Track your progress</p>
            </div>
          </div>
        </Link>
        <Link to="/team-updates" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <Sparkles className="h-10 w-10 text-primary-600 mr-3" />
            <div>
              <h3 className="font-semibold">AE Hub</h3>
              <p className="text-sm text-gray-600">Docs & resources</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;