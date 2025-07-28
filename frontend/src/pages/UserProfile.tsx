import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userApi, commitmentApi, resultApi, goalApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { User as UserIcon, Phone, Mail, Users, Target } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, addDays } from 'date-fns';
import type { User, WeeklyCommitment, WeeklyResult, DailyGoal } from '@/types';

interface WeekData {
  weekStart: string;
  commitments: WeeklyCommitment | null;
  results: WeeklyResult | null;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [currentWeekGoals, setCurrentWeekGoals] = useState<DailyGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser?.id === parseInt(userId || '0');
  const canViewDetails = isOwnProfile || currentUser?.role === 'admin';

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId]);

  const fetchUserData = async () => {
    if (!canViewDetails) {
      navigate('/');
      return;
    }

    try {
      const userRes = await userApi.getUserById(parseInt(userId!));
      setUser(userRes.data);

      // Only fetch detailed data if viewing own profile or admin
      if (canViewDetails) {
        const targetUserId = parseInt(userId!);
        
        // Fetch the user's commitments and results based on who's viewing
        let commitmentsData: WeeklyCommitment[] = [];
        let resultsData: WeeklyResult[] = [];
        
        if (isOwnProfile) {
          // Own profile - use regular endpoints
          const [commitmentsRes, resultsRes] = await Promise.all([
            commitmentApi.getCommitmentHistory(8),
            resultApi.getResultHistory(8)
          ]);
          commitmentsData = commitmentsRes.data;
          resultsData = resultsRes.data;
        } else if (currentUser?.role === 'admin') {
          // Admin viewing other user - fetch their specific data
          const resultsRes = await resultApi.getUserResultHistory(targetUserId, 8);
          resultsData = resultsRes.data;
          // Note: commitments will be fetched per week below
        }

        // For admin viewing other user, fetch their history
        if (!isOwnProfile && currentUser?.role === 'admin') {
          // Get last 8 weeks of data
          const weeks: string[] = [];
          const today = new Date();
          for (let i = 0; i < 8; i++) {
            const weekStart = startOfWeek(new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 });
            weeks.push(format(weekStart, 'yyyy-MM-dd'));
          }

          // Fetch commitments and results for each week
          const weekDataPromises = weeks.map(async (weekStart) => {
            const [commitment, result] = await Promise.all([
              commitmentApi.getUserWeekCommitment(targetUserId, weekStart),
              resultApi.getUserWeekResult(targetUserId, weekStart)
            ]);
            return {
              weekStart,
              commitments: commitment.data,
              results: result.data
            };
          });

          const fetchedWeekData = await Promise.all(weekDataPromises);
          setWeekData(fetchedWeekData.filter(w => w.commitments || w.results));

          // Fetch current week goals for the user
          const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
          const goalsRes = await goalApi.getUserWeekGoals(targetUserId, currentWeekStart);
          setCurrentWeekGoals(goalsRes.data);
        } else {
          // Own profile - use existing data
          const combinedData: WeekData[] = [];
          const allWeeks = new Set([
            ...commitmentsData.map(c => c.weekStartDate),
            ...resultsData.map(r => r.weekStartDate)
          ]);

          Array.from(allWeeks).sort().reverse().forEach(weekStart => {
            combinedData.push({
              weekStart,
              commitments: commitmentsData.find(c => c.weekStartDate === weekStart) || null,
              results: resultsData.find(r => r.weekStartDate === weekStart) || null
            });
          });

          setWeekData(combinedData);

          // Fetch current week goals
          const goalsRes = await goalApi.getCurrentWeekGoals();
          setCurrentWeekGoals(goalsRes.data);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user || !canViewDetails) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">User not found or access denied</p>
      </div>
    );
  }

  // Prepare chart data - show last 6 weeks with actual results
  const chartData = weekData
    .filter(week => week.results && (week.results.callsActual > 0 || week.results.emailsActual > 0 || week.results.meetingsActual > 0))
    .slice(0, 6)
    .reverse()
    .map(week => ({
      week: format(new Date(week.weekStart), 'MMM d'),
      calls: week.results?.callsActual || 0,
      emails: week.results?.emailsActual || 0,
      meetings: week.results?.meetingsActual || 0,
      achievement: week.results?.percentages?.overall || 0
    }));

  // Calculate stats
  const totalStats = weekData.reduce((acc, week) => {
    if (week.results) {
      acc.calls += week.results.callsActual;
      acc.emails += week.results.emailsActual;
      acc.meetings += week.results.meetingsActual;
      acc.weeks++;
    }
    return acc;
  }, { calls: 0, emails: 0, meetings: 0, weeks: 0 });

  const avgStats = {
    calls: totalStats.weeks ? Math.round(totalStats.calls / totalStats.weeks) : 0,
    emails: totalStats.weeks ? Math.round(totalStats.emails / totalStats.weeks) : 0,
    meetings: totalStats.weeks ? Math.round(totalStats.meetings / totalStats.weeks) : 0
  };

  // Current week progress
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const daysCompleted = currentWeekGoals.filter(g => 
    g.callsAchieved || g.emailsAchieved || g.meetingsAchieved
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold mr-4">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-primary-100">{user.email}</p>
              <div className="flex items-center mt-2">
                <span className="px-2 py-1 bg-white/20 rounded text-sm">
                  {user.role === 'admin' ? 'Administrator' : 'Account Executive'}
                </span>
                {isOwnProfile && (
                  <span className="ml-2 text-sm text-primary-100">Your Profile</span>
                )}
              </div>
            </div>
          </div>
          <UserIcon className="h-12 w-12 text-primary-200" />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Weekly Calls</p>
              <p className="text-2xl font-bold">{avgStats.calls}</p>
            </div>
            <Phone className="h-8 w-8 text-primary-600" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Weekly Emails</p>
              <p className="text-2xl font-bold">{avgStats.emails}</p>
            </div>
            <Mail className="h-8 w-8 text-primary-600" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Weekly Meetings</p>
              <p className="text-2xl font-bold">{avgStats.meetings}</p>
            </div>
            <Users className="h-8 w-8 text-primary-600" />
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">This Week Progress</p>
              <p className="text-2xl font-bold">{daysCompleted}/5</p>
              <p className="text-xs text-gray-500">Days completed</p>
            </div>
            <Target className="h-8 w-8 text-primary-600" />
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Activity Trend (Last 6 Weeks)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="calls" stroke="#3b82f6" name="Calls" strokeWidth={2} />
              <Line type="monotone" dataKey="emails" stroke="#10b981" name="Emails" strokeWidth={2} />
              <Line type="monotone" dataKey="meetings" stroke="#f59e0b" name="Meetings" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Achievement Rate (Last 6 Weeks)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="achievement" fill="#3b82f6" name="Achievement %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Performance */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Weekly Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Week</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Calls</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Emails</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Meetings</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Achievement</th>
              </tr>
            </thead>
            <tbody>
              {weekData.slice(0, 5).map((week) => {
                const hasData = week.commitments || week.results;
                if (!hasData) return null;

                return (
                  <tr key={week.weekStart} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <p className="font-medium">
                        {format(new Date(week.weekStart), 'MMM d, yyyy')}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {week.results ? (
                        <div>
                          <span className="font-semibold">{week.results.callsActual}</span>
                          {week.commitments && (
                            <span className="text-gray-500">/{week.commitments.callsTarget}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {week.results ? (
                        <div>
                          <span className="font-semibold">{week.results.emailsActual}</span>
                          {week.commitments && (
                            <span className="text-gray-500">/{week.commitments.emailsTarget}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {week.results ? (
                        <div>
                          <span className="font-semibold">{week.results.meetingsActual}</span>
                          {week.commitments && (
                            <span className="text-gray-500">/{week.commitments.meetingsTarget}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {week.results?.percentages?.overall ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          week.results.percentages.overall >= 100 ? 'bg-green-100 text-green-800' :
                          week.results.percentages.overall >= 80 ? 'bg-yellow-100 text-yellow-800' :
                          week.results.percentages.overall >= 60 ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {week.results.percentages.overall}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Current Week Goals */}
      {isOwnProfile && currentWeekGoals.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">This Week's Daily Goals</h2>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map(dayOffset => {
              const date = addDays(currentWeekStart, dayOffset);
              const goal = currentWeekGoals.find(g => g.date === format(date, 'yyyy-MM-dd'));
              
              if (!goal) {
                return (
                  <div key={dayOffset} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">
                      {format(date, 'EEE')}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">No goals set</p>
                  </div>
                );
              }

              const totalAchieved = (goal.callsAchieved ? 1 : 0) + 
                                   (goal.emailsAchieved ? 1 : 0) + 
                                   (goal.meetingsAchieved ? 1 : 0);

              return (
                <div key={dayOffset} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">
                    {format(date, 'EEE')}
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-center">
                      <Phone className={`h-3 w-3 mr-1 ${goal.callsAchieved ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="text-xs">{goal.callsGoal}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <Mail className={`h-3 w-3 mr-1 ${goal.emailsAchieved ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="text-xs">{goal.emailsGoal}</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <Users className={`h-3 w-3 mr-1 ${goal.meetingsAchieved ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="text-xs">{goal.meetingsGoal}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className={`h-1 w-full rounded-full bg-gray-200 overflow-hidden`}>
                      <div 
                        className={`h-full transition-all ${
                          totalAchieved === 3 ? 'bg-green-500' :
                          totalAchieved > 0 ? 'bg-yellow-500' :
                          'bg-gray-300'
                        }`}
                        style={{ width: `${(totalAchieved / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;