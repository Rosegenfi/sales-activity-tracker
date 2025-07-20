import { useState, useEffect } from 'react';
import { goalApi, commitmentApi } from '@/services/api';
import { Target, Phone, Mail, Users, Calendar, CheckCircle, Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek, isToday, isBefore, isAfter } from 'date-fns';
import toast from 'react-hot-toast';
import type { DailyGoal, WeeklyCommitment } from '@/types';

const DailyGoals = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekGoals, setWeekGoals] = useState<DailyGoal[]>([]);
  const [currentGoal, setCurrentGoal] = useState<DailyGoal | null>(null);
  const [weeklyCommitment, setWeeklyCommitment] = useState<WeeklyCommitment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      const [goalsRes, commitmentRes, currentGoalRes] = await Promise.all([
        goalApi.getCurrentWeekGoals(),
        commitmentApi.getCurrentCommitment(),
        goalApi.getGoalByDate(format(selectedDate, 'yyyy-MM-dd'))
      ]);
      
      setWeekGoals(goalsRes.data);
      setWeeklyCommitment(commitmentRes.data);
      setCurrentGoal(currentGoalRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (days: number) => {
    setSelectedDate(addDays(selectedDate, days));
  };

  const handleGoalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await goalApi.createOrUpdateGoal({
        date: format(selectedDate, 'yyyy-MM-dd'),
        callsGoal: parseInt(formData.get('callsGoal') as string),
        emailsGoal: parseInt(formData.get('emailsGoal') as string),
        meetingsGoal: parseInt(formData.get('meetingsGoal') as string),
      });
      
      setCurrentGoal(response.data);
      setShowForm(false);
      toast.success('Daily goals saved!');
      
      // Refresh week goals
      const goalsRes = await goalApi.getCurrentWeekGoals();
      setWeekGoals(goalsRes.data);
    } catch (error) {
      toast.error('Failed to save goals');
    }
  };

  const toggleAchievement = async (type: 'calls' | 'emails' | 'meetings') => {
    if (!currentGoal) return;
    
    const updateData: any = {
      date: format(selectedDate, 'yyyy-MM-dd'),
    };
    updateData[`${type}Achieved`] = !currentGoal[`${type}Achieved`];
    
    try {
      const response = await goalApi.updateAchievement(updateData);
      setCurrentGoal(response.data);
      toast.success('Achievement updated!');
      
      // Refresh week goals
      const goalsRes = await goalApi.getCurrentWeekGoals();
      setWeekGoals(goalsRes.data);
    } catch (error) {
      toast.error('Failed to update achievement');
    }
  };

  const getDayGoal = (date: Date) => {
    return weekGoals.find(g => g.date === format(date, 'yyyy-MM-dd'));
  };

  const getDayStatus = (date: Date) => {
    const goal = getDayGoal(date);
    if (!goal) return 'none';
    
    const total = 3;
    const achieved = (goal.callsAchieved ? 1 : 0) + 
                    (goal.emailsAchieved ? 1 : 0) + 
                    (goal.meetingsAchieved ? 1 : 0);
    
    if (achieved === total) return 'complete';
    if (achieved > 0) return 'partial';
    return 'pending';
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
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Target className="h-8 w-8 mr-3" />
              Daily Goals
            </h1>
            <p className="mt-2 text-primary-100">
              Set and track your daily targets
            </p>
          </div>
          <Calendar className="h-12 w-12 text-primary-200" />
        </div>
      </div>

      {/* Date Navigation */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => handleDateChange(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="text-center">
            <h2 className="text-xl font-semibold">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h2>
            {isToday(selectedDate) && (
              <span className="text-sm text-primary-600 font-medium">Today</span>
            )}
          </div>
          
          <button
            onClick={() => handleDateChange(1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isAfter(selectedDate, new Date())}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Week Overview */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
            const date = addDays(weekStart, dayOffset);
            const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const status = getDayStatus(date);
            const isPast = isBefore(date, new Date()) && !isToday(date);
            
            return (
              <button
                key={dayOffset}
                onClick={() => setSelectedDate(date)}
                disabled={isAfter(date, new Date())}
                className={`p-3 rounded-lg text-center transition-all ${
                  isSelected 
                    ? 'bg-primary-600 text-white shadow-lg transform scale-105' 
                    : isPast
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="text-xs font-medium">
                  {format(date, 'EEE')}
                </div>
                <div className="text-lg font-bold">
                  {format(date, 'd')}
                </div>
                {status !== 'none' && (
                  <div className="mt-1">
                    <div className={`h-2 w-2 rounded-full mx-auto ${
                      status === 'complete' ? 'bg-green-500' :
                      status === 'partial' ? 'bg-yellow-500' :
                      'bg-gray-300'
                    }`} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Daily Targets Section */}
        {weeklyCommitment && (
          <div className="bg-primary-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-primary-700 font-medium mb-2">Suggested Daily Targets</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary-600">
                  {weeklyCommitment.dailyAverages?.calls || 0}
                </p>
                <p className="text-xs text-primary-600">Calls/day</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-600">
                  {weeklyCommitment.dailyAverages?.emails || 0}
                </p>
                <p className="text-xs text-primary-600">Emails/day</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-600">
                  {weeklyCommitment.dailyAverages?.meetings || 0}
                </p>
                <p className="text-xs text-primary-600">Meetings/day</p>
              </div>
            </div>
          </div>
        )}

        {/* Goal Form or Display */}
        {showForm || !currentGoal ? (
          <form onSubmit={handleGoalSubmit} className="space-y-4">
            <h3 className="font-semibold mb-4">Set Goals for {format(selectedDate, 'MMMM d')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Calls Goal</label>
                <input
                  type="number"
                  name="callsGoal"
                  min="0"
                  required
                  defaultValue={currentGoal?.callsGoal || weeklyCommitment?.dailyAverages?.calls || ''}
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Emails Goal</label>
                <input
                  type="number"
                  name="emailsGoal"
                  min="0"
                  required
                  defaultValue={currentGoal?.emailsGoal || weeklyCommitment?.dailyAverages?.emails || ''}
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Meetings Goal</label>
                <input
                  type="number"
                  name="meetingsGoal"
                  min="0"
                  required
                  defaultValue={currentGoal?.meetingsGoal || weeklyCommitment?.dailyAverages?.meetings || ''}
                  className="input-field mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              {currentGoal && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              )}
              <button type="submit" className="btn-primary">
                Save Goals
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Goals for {format(selectedDate, 'MMMM d')}</h3>
              <button
                onClick={() => setShowForm(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Edit Goals
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-primary-600 mr-3" />
                  <div>
                    <p className="font-medium">Calls</p>
                    <p className="text-sm text-gray-600">Target: {currentGoal.callsGoal}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleAchievement('calls')}
                  className={`p-2 rounded-full transition-colors ${
                    currentGoal.callsAchieved 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                      : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                  }`}
                >
                  {currentGoal.callsAchieved ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <Circle className="h-6 w-6" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 text-primary-600 mr-3" />
                  <div>
                    <p className="font-medium">Emails</p>
                    <p className="text-sm text-gray-600">Target: {currentGoal.emailsGoal}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleAchievement('emails')}
                  className={`p-2 rounded-full transition-colors ${
                    currentGoal.emailsAchieved 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                      : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                  }`}
                >
                  {currentGoal.emailsAchieved ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <Circle className="h-6 w-6" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-primary-600 mr-3" />
                  <div>
                    <p className="font-medium">Meetings</p>
                    <p className="text-sm text-gray-600">Target: {currentGoal.meetingsGoal}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleAchievement('meetings')}
                  className={`p-2 rounded-full transition-colors ${
                    currentGoal.meetingsAchieved 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                      : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                  }`}
                >
                  {currentGoal.meetingsAchieved ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    <Circle className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyGoals;