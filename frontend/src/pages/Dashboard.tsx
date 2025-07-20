import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { commitmentApi, resultApi } from '@/services/api';
import { format, isMonday } from 'date-fns';
import {
  Calendar,
  Phone,
  Mail,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Target,
  Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { WeeklyCommitment, WeeklyResult } from '@/types';

const Dashboard = () => {
  const { user } = useAuth();
  const [currentCommitment, setCurrentCommitment] = useState<WeeklyCommitment | null>(null);
  const [previousResult, setPreviousResult] = useState<WeeklyResult | null>(null);
  const [showCommitmentForm, setShowCommitmentForm] = useState(false);
  const [showResultForm, setShowResultForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const isMondayToday = isMonday(today);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [commitmentRes, resultRes] = await Promise.all([
        commitmentApi.getCurrentCommitment(),
        resultApi.getPreviousResult()
      ]);
      
      setCurrentCommitment(commitmentRes.data);
      setPreviousResult(resultRes.data);
      
      // Auto-show forms on Monday if not filled
      if (isMondayToday) {
        if (!commitmentRes.data) {
          setShowCommitmentForm(true);
        } else if (!resultRes.data) {
          setShowResultForm(true);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommitmentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await commitmentApi.createOrUpdateCommitment({
        callsTarget: parseInt(formData.get('callsTarget') as string),
        emailsTarget: parseInt(formData.get('emailsTarget') as string),
        meetingsTarget: parseInt(formData.get('meetingsTarget') as string),
      });
      
      setCurrentCommitment(response.data);
      setShowCommitmentForm(false);
      toast.success('Weekly commitments saved!');
    } catch (error) {
      toast.error('Failed to save commitments');
    }
  };

  const handleResultSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await resultApi.createOrUpdateResult({
        callsActual: parseInt(formData.get('callsActual') as string),
        emailsActual: parseInt(formData.get('emailsActual') as string),
        meetingsActual: parseInt(formData.get('meetingsActual') as string),
      });
      
      setPreviousResult(response.data);
      setShowResultForm(false);
      toast.success('Weekly results saved!');
    } catch (error) {
      toast.error('Failed to save results');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}!</h1>
        <p className="mt-2 text-primary-100">
          {isMondayToday 
            ? "It's Monday! Time to set your weekly commitments and log last week's results."
            : `Today is ${format(today, 'EEEE, MMMM d, yyyy')}`}
        </p>
      </div>

      {/* Monday Alerts */}
      {isMondayToday && (
        <div className="space-y-4">
          {!currentCommitment && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  Set Your Weekly Commitments
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  You haven't set your commitments for this week yet.
                </p>
                <button
                  onClick={() => setShowCommitmentForm(true)}
                  className="mt-2 text-sm font-medium text-yellow-800 hover:text-yellow-900"
                >
                  Set commitments →
                </button>
              </div>
            </div>
          )}

          {!previousResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  Log Last Week's Results
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  Don't forget to log your results from last week.
                </p>
                <button
                  onClick={() => setShowResultForm(true)}
                  className="mt-2 text-sm font-medium text-blue-800 hover:text-blue-900"
                >
                  Log results →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Forms */}
      {showCommitmentForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Set Weekly Commitments</h2>
          <form onSubmit={handleCommitmentSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Calls Target</label>
                <input
                  type="number"
                  name="callsTarget"
                  min="0"
                  required
                  defaultValue={currentCommitment?.callsTarget || ''}
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Emails Target</label>
                <input
                  type="number"
                  name="emailsTarget"
                  min="0"
                  required
                  defaultValue={currentCommitment?.emailsTarget || ''}
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Meetings Target</label>
                <input
                  type="number"
                  name="meetingsTarget"
                  min="0"
                  required
                  defaultValue={currentCommitment?.meetingsTarget || ''}
                  className="input-field mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCommitmentForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Commitments
              </button>
            </div>
          </form>
        </div>
      )}

      {showResultForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Log Last Week's Results</h2>
          <form onSubmit={handleResultSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Calls Made</label>
                <input
                  type="number"
                  name="callsActual"
                  min="0"
                  required
                  defaultValue={previousResult?.callsActual || ''}
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Emails Sent</label>
                <input
                  type="number"
                  name="emailsActual"
                  min="0"
                  required
                  defaultValue={previousResult?.emailsActual || ''}
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Meetings Held</label>
                <input
                  type="number"
                  name="meetingsActual"
                  min="0"
                  required
                  defaultValue={previousResult?.meetingsActual || ''}
                  className="input-field mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowResultForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Results
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Current Week Overview */}
      {currentCommitment && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">This Week's Commitments</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Calls</p>
                  <p className="text-2xl font-bold">{currentCommitment.callsTarget}</p>
                  <p className="text-xs text-gray-500">
                    {currentCommitment.dailyAverages?.calls}/day
                  </p>
                </div>
                <Phone className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Emails</p>
                  <p className="text-2xl font-bold">{currentCommitment.emailsTarget}</p>
                  <p className="text-xs text-gray-500">
                    {currentCommitment.dailyAverages?.emails}/day
                  </p>
                </div>
                <Mail className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Meetings</p>
                  <p className="text-2xl font-bold">{currentCommitment.meetingsTarget}</p>
                  <p className="text-xs text-gray-500">
                    {currentCommitment.dailyAverages?.meetings}/day
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Week's Performance */}
      {previousResult && previousResult.percentages && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Last Week's Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Calls</p>
                  <p className="text-2xl font-bold">{previousResult.percentages.calls}%</p>
                  <p className="text-xs text-gray-500">
                    {previousResult.callsActual}/{previousResult.callsTarget}
                  </p>
                </div>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  previousResult.percentages.calls >= 100 ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {previousResult.percentages.calls >= 100 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Phone className="h-5 w-5 text-gray-600" />
                  )}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Emails</p>
                  <p className="text-2xl font-bold">{previousResult.percentages.emails}%</p>
                  <p className="text-xs text-gray-500">
                    {previousResult.emailsActual}/{previousResult.emailsTarget}
                  </p>
                </div>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  previousResult.percentages.emails >= 100 ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {previousResult.percentages.emails >= 100 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Mail className="h-5 w-5 text-gray-600" />
                  )}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Meetings</p>
                  <p className="text-2xl font-bold">{previousResult.percentages.meetings}%</p>
                  <p className="text-xs text-gray-500">
                    {previousResult.meetingsActual}/{previousResult.meetingsTarget}
                  </p>
                </div>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  previousResult.percentages.meetings >= 100 ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {previousResult.percentages.meetings >= 100 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Users className="h-5 w-5 text-gray-600" />
                  )}
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Overall</p>
                  <p className="text-2xl font-bold">{previousResult.percentages.overall}%</p>
                  <p className="text-xs text-gray-500">Achievement</p>
                </div>
                <TrendingUp className={`h-8 w-8 ${
                  previousResult.percentages.overall! >= 100 ? 'text-green-600' : 'text-gray-600'
                }`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/daily-goals" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <Target className="h-10 w-10 text-primary-600 mr-3" />
            <div>
              <h3 className="font-semibold">Daily Goals</h3>
              <p className="text-sm text-gray-600">Set today's targets</p>
            </div>
          </div>
        </Link>
        <Link to="/leaderboard" className="card hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <Trophy className="h-10 w-10 text-yellow-600 mr-3" />
            <div>
              <h3 className="font-semibold">Leaderboard</h3>
              <p className="text-sm text-gray-600">View team rankings</p>
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
            <AlertCircle className="h-10 w-10 text-blue-600 mr-3" />
            <div>
              <h3 className="font-semibold">Team Updates</h3>
              <p className="text-sm text-gray-600">Latest announcements</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;