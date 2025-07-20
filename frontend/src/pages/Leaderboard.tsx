import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leaderboardApi } from '@/services/api';
import { Trophy, Phone, Users as UsersIcon, Star } from 'lucide-react';
import { format } from 'date-fns';
import type { LeaderboardData } from '@/types';

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await leaderboardApi.getLeaderboard();
      setLeaderboardData(response.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
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

  if (!leaderboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No leaderboard data available</p>
      </div>
    );
  }

  const getAchievementColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600 bg-green-50';
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-50';
    if (percentage >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return { icon: '🥇', color: 'text-yellow-500' };
    if (index === 1) return { icon: '🥈', color: 'text-gray-400' };
    if (index === 2) return { icon: '🥉', color: 'text-orange-600' };
    return null;
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

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-sm">
                        <span className="font-semibold">{entry.emailsActual}</span>
                        {entry.emailsTarget > 0 && (
                          <span className="text-gray-500">/{entry.emailsTarget}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-sm">
                        <span className="font-semibold">{entry.meetingsActual}</span>
                        {entry.meetingsTarget > 0 && (
                          <span className="text-gray-500">/{entry.meetingsTarget}</span>
                        )}
                      </div>
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