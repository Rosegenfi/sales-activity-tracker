import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { activityApi, commitmentApi, resultApi } from '@/services/api';
import { format } from 'date-fns';
import {
  Calendar,
  Phone,
  Mail,
  Users,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

const activityTypes: Array<{ key: 'call'|'email'|'meeting'|'social'; label: string; icon: any; color: string }> = [
  { key: 'call', label: 'Calls', icon: Phone, color: 'text-primary-500' },
  { key: 'email', label: 'Emails', icon: Mail, color: 'text-primary-500' },
  { key: 'meeting', label: 'Meetings', icon: Users, color: 'text-emerald-600' },
  { key: 'social', label: 'Social', icon: Sparkles, color: 'text-amber-600' },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wow, setWoW] = useState<Record<string, { last: number; prior: number; delta: number; pct: number|null }>>({});
  const [weeklyCommitment, setWeeklyCommitment] = useState<{ callsTarget: number; emailsTarget: number; meetingsTarget: number } | null>(null);
  const [creatingCommitment, setCreatingCommitment] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState(false);
  const [lastWeekActivity, setLastWeekActivity] = useState<{ callsActual: number; emailsActual: number; meetingsActual: number }>({ callsActual: 0, emailsActual: 0, meetingsActual: 0 });
  const [savingLastWeek, setSavingLastWeek] = useState(false);

  useEffect(() => {
    loadSummary();
    loadCommitment();
    loadPreviousResult();
  }, []);

  const loadCommitment = async () => {
    try {
      const res = await commitmentApi.getCurrentCommitment();
      if (res.data) {
        setWeeklyCommitment({
          callsTarget: res.data.callsTarget,
          emailsTarget: res.data.emailsTarget,
          meetingsTarget: res.data.meetingsTarget,
        });
      } else {
        setWeeklyCommitment(null);
      }
    } catch (e) {
      // ignore
    }
  };

  const loadSummary = async () => {
    try {
      const res = await activityApi.getMySummary();
      setWoW(res.data.wow || {});
    } catch (error) {
      console.error('Error loading activity summary', error);
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadPreviousResult = async () => {
    try {
      const res = await resultApi.getPreviousResult();
      if (res.data) {
        setLastWeekActivity({
          callsActual: res.data.callsActual,
          emailsActual: res.data.emailsActual,
          meetingsActual: res.data.meetingsActual,
        });
      }
    } catch (e) {
      // ignore
    }
  };

  const handleCommitmentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      callsTarget: parseInt((form.get('callsTarget') as string) || '0', 10),
      emailsTarget: parseInt((form.get('emailsTarget') as string) || '0', 10),
      meetingsTarget: parseInt((form.get('meetingsTarget') as string) || '0', 10),
    };
    try {
      setCreatingCommitment(true);
      await commitmentApi.createOrUpdateCommitment(payload);
      toast.success('Weekly goals saved');
      setWeeklyCommitment(payload);
      setEditingCommitment(false);
    } catch (e) {
      toast.error('Failed to save weekly goals');
    } finally {
      setCreatingCommitment(false);
    }
  };

  const handleResultSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      callsActual: parseInt((form.get('callsActual') as string) || '0', 10),
      emailsActual: parseInt((form.get('emailsActual') as string) || '0', 10),
      meetingsActual: parseInt((form.get('meetingsActual') as string) || '0', 10),
    };
    try {
      setSavingLastWeek(true);
      await resultApi.createOrUpdateResult(payload);
      toast.success("Last week's activity saved");
      setLastWeekActivity(payload);
      // Refresh dashboard summary after saving
      loadSummary();
    } catch (e) {
      toast.error("Failed to save last week's activity");
    } finally {
      setSavingLastWeek(false);
    }
  };

  const todayStr = format(new Date(), 'EEEE, MMMM d, yyyy');

  const dailySplit = weeklyCommitment
    ? {
        calls: Math.max(0, Math.ceil(weeklyCommitment.callsTarget / 5)),
        emails: Math.max(0, Math.ceil(weeklyCommitment.emailsTarget / 5)),
        meetings: Math.max(0, Math.ceil(weeklyCommitment.meetingsTarget / 5)),
      }
    : null;

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
      <div className="rounded-xl p-6 text-white bg-primary-600">
        <h1 className="text-2xl font-bold">Good morning, {user?.firstName}</h1>
        <p className="mt-2 text-primary-100">{todayStr}</p>
      </div>

      {/* Last Week KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {activityTypes.map(({ key, label, icon: Icon, color }) => {
          const wRow = wow[key];
          const last = wRow?.last || 0;
          const pct = wRow?.pct;
          const trendColor = pct == null ? 'text-gray-500' : pct >= 0 ? 'text-green-600' : 'text-amber-600';
          const trendPrefix = pct == null ? '' : pct >= 0 ? '▲' : '▼';
          return (
            <div key={key} className="stat-card rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Last week {label}</p>
                  <p className="text-2xl font-bold">{last}</p>
                  <p className={`text-xs mt-1 ${trendColor}`}>WoW {trendPrefix}{pct == null ? '—' : `${Math.abs(pct)}%`}</p>
                </div>
                <Icon className={`h-8 w-8 ${color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested Daily Plan and Weekly Goals */}
      <div className="grid grid-cols-1 gap-4">
        <div className="card rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Suggested daily plan</h2>
          {weeklyCommitment ? (
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Calls/day</p>
                <p className="text-2xl font-bold text-primary-700">{dailySplit?.calls}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Emails/day</p>
                <p className="text-2xl font-bold text-primary-700">{dailySplit?.emails}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Meetings/day</p>
                <p className="text-2xl font-bold text-primary-700">{dailySplit?.meetings}</p>
              </div>
              <div className="col-span-3 text-right mt-4">
                <button
                  type="button"
                  onClick={() => setEditingCommitment((v) => !v)}
                  className="text-sm text-primary-700 hover:underline"
                >
                  {editingCommitment ? 'Hide weekly goals form' : 'Edit weekly goals'}
                </button>
              </div>
              {editingCommitment && (
                <form onSubmit={handleCommitmentSubmit} className="space-y-3 mt-4">
                  <div className="grid grid-cols-3 gap-3">
                    <input name="callsTarget" type="number" min={0} placeholder="Calls" className="input-field" required defaultValue={weeklyCommitment.callsTarget} />
                    <input name="emailsTarget" type="number" min={0} placeholder="Emails" className="input-field" required defaultValue={weeklyCommitment.emailsTarget} />
                    <input name="meetingsTarget" type="number" min={0} placeholder="Meetings" className="input-field" required defaultValue={weeklyCommitment.meetingsTarget} />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={creatingCommitment} className="btn-primary rounded-lg">{creatingCommitment ? 'Saving...' : 'Save weekly goals'}</button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-3">Set your weekly goals to see your daily plan</p>
              <form onSubmit={handleCommitmentSubmit} className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <input name="callsTarget" type="number" min={0} placeholder="Calls" className="input-field" required />
                  <input name="emailsTarget" type="number" min={0} placeholder="Emails" className="input-field" required />
                  <input name="meetingsTarget" type="number" min={0} placeholder="Meetings" className="input-field" required />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={creatingCommitment} className="btn-primary rounded-lg">{creatingCommitment ? 'Saving...' : 'Save weekly goals'}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Last Week Activity Entry */}
      <div className="grid grid-cols-1 gap-4">
        <div className="card rounded-xl">
          <h2 className="text-lg font-semibold mb-4">Enter last week's activity</h2>
          <form onSubmit={handleResultSubmit} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <input name="callsActual" type="number" min={0} placeholder="Calls" className="input-field" required defaultValue={lastWeekActivity.callsActual} />
              <input name="emailsActual" type="number" min={0} placeholder="Emails" className="input-field" required defaultValue={lastWeekActivity.emailsActual} />
              <input name="meetingsActual" type="number" min={0} placeholder="Meetings" className="input-field" required defaultValue={lastWeekActivity.meetingsActual} />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={savingLastWeek} className="btn-primary rounded-lg">{savingLastWeek ? 'Saving...' : "Save last week's activity"}</button>
            </div>
          </form>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/leaderboard" className="card hover:shadow-md transition-shadow rounded-xl">
          <div className="flex items-center">
            <TrendingUp className="h-10 w-10 text-yellow-600 mr-3" />
            <div>
              <h3 className="font-semibold">Leaderboard</h3>
              <p className="text-sm text-gray-600">See team momentum</p>
            </div>
          </div>
        </Link>
        <Link to="/weekly-commits" className="card hover:shadow-md transition-shadow rounded-xl">
          <div className="flex items-center">
            <Calendar className="h-10 w-10 text-green-600 mr-3" />
            <div>
              <h3 className="font-semibold">History</h3>
              <p className="text-sm text-gray-600">Track your progress</p>
            </div>
          </div>
        </Link>
        <Link to="/team-updates" className="card hover:shadow-md transition-shadow rounded-xl">
          <div className="flex items-center">
            <Sparkles className="h-10 w-10 text-primary-500 mr-3" />
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