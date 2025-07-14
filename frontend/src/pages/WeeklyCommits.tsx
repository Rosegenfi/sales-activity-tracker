import { useState, useEffect } from 'react';
import { commitmentApi, resultApi } from '@/services/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Phone, Mail, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { WeeklyCommitment, WeeklyResult } from '@/types';

interface ChartData {
  week: string;
  callsTarget: number;
  callsActual: number;
  emailsTarget: number;
  emailsActual: number;
  meetingsTarget: number;
  meetingsActual: number;
}

const WeeklyCommits = () => {
  const [commitments, setCommitments] = useState<WeeklyCommitment[]>([]);
  const [results, setResults] = useState<WeeklyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [view, setView] = useState<'all' | 'calls' | 'emails' | 'meetings'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [commitmentsRes, resultsRes] = await Promise.all([
        commitmentApi.getCommitmentHistory(12),
        resultApi.getResultHistory(12)
      ]);
      
      setCommitments(commitmentsRes.data);
      setResults(resultsRes.data);
      
      // Combine data for charts
      const combinedData = commitmentsRes.data.map(commitment => {
        const result = resultsRes.data.find(r => r.weekStartDate === commitment.weekStartDate);
        return {
          week: format(new Date(commitment.weekStartDate), 'MMM d'),
          callsTarget: commitment.callsTarget,
          callsActual: result?.callsActual || 0,
          emailsTarget: commitment.emailsTarget,
          emailsActual: result?.emailsActual || 0,
          meetingsTarget: commitment.meetingsTarget,
          meetingsActual: result?.meetingsActual || 0,
        };
      }).reverse(); // Reverse to show oldest first
      
      setChartData(combinedData);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const renderChart = () => {
    if (view === 'all') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="callsActual" stroke="#3b82f6" name="Calls" strokeWidth={2} />
            <Line type="monotone" dataKey="emailsActual" stroke="#10b981" name="Emails" strokeWidth={2} />
            <Line type="monotone" dataKey="meetingsActual" stroke="#f59e0b" name="Meetings" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );
    } else {
      const dataKey = view === 'calls' ? 'calls' : view === 'emails' ? 'emails' : 'meetings';
      const color = view === 'calls' ? '#3b82f6' : view === 'emails' ? '#10b981' : '#f59e0b';
      
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={`${dataKey}Target`} fill={`${color}50`} name="Target" />
            <Bar dataKey={`${dataKey}Actual`} fill={color} name="Actual" />
          </BarChart>
        </ResponsiveContainer>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Calendar className="h-8 w-8 mr-3" />
              Weekly Performance History
            </h1>
            <p className="mt-2 text-primary-100">
              Track your commitments and results over time
            </p>
          </div>
          <TrendingUp className="h-12 w-12 text-primary-200" />
        </div>
      </div>

      {/* Chart Controls */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Performance Trends</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setView('all')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                view === 'all' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Metrics
            </button>
            <button
              onClick={() => setView('calls')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                view === 'calls' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Calls
            </button>
            <button
              onClick={() => setView('emails')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                view === 'emails' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Emails
            </button>
            <button
              onClick={() => setView('meetings')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                view === 'meetings' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Meetings
            </button>
          </div>
        </div>
        
        {chartData.length > 0 ? renderChart() : (
          <p className="text-center text-gray-500 py-8">No data available for charts</p>
        )}
      </div>

      {/* Recent Performance */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Weekly Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Week</th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">
                  <div className="flex items-center justify-center">
                    <Phone className="h-4 w-4 mr-1" />
                    Calls
                  </div>
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">
                  <div className="flex items-center justify-center">
                    <Mail className="h-4 w-4 mr-1" />
                    Emails
                  </div>
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">
                  <div className="flex items-center justify-center">
                    <Users className="h-4 w-4 mr-1" />
                    Meetings
                  </div>
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-700">Overall</th>
              </tr>
            </thead>
            <tbody>
              {results.slice(0, 8).map((result) => {
                const commitment = commitments.find(c => c.weekStartDate === result.weekStartDate);
                const overallPercentage = result.percentages?.overall || 0;
                
                return (
                  <tr key={result.weekStartDate} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">
                          {format(new Date(result.weekStartDate), 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(result.weekStartDate), 'EEEE')}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-sm">
                        <span className="font-semibold">{result.callsActual}</span>
                        <span className="text-gray-500">/{commitment?.callsTarget || 0}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {result.percentages?.calls || 0}%
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-sm">
                        <span className="font-semibold">{result.emailsActual}</span>
                        <span className="text-gray-500">/{commitment?.emailsTarget || 0}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {result.percentages?.emails || 0}%
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="text-sm">
                        <span className="font-semibold">{result.meetingsActual}</span>
                        <span className="text-gray-500">/{commitment?.meetingsTarget || 0}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {result.percentages?.meetings || 0}%
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        overallPercentage >= 100 ? 'bg-green-100 text-green-800' :
                        overallPercentage >= 80 ? 'bg-yellow-100 text-yellow-800' :
                        overallPercentage >= 60 ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {overallPercentage}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WeeklyCommits;