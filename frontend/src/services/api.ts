import axios from 'axios';
import API_CONFIG from '@/config/api';
import type { 
  AuthResponse, 
  User, 
  WeeklyCommitment, 
  WeeklyResult, 
  DailyGoal, 
  TeamUpdate, 
  LeaderboardData 
} from '@/types';

const api = axios.create(API_CONFIG);

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }) => api.post<{ user: User; temporaryPassword?: string }>('/auth/register', data),
  
  getCurrentUser: () => api.get<User>('/auth/me'),
};

// User endpoints
export const userApi = {
  getAllUsers: () => api.get<User[]>('/users'),
  getAEs: () => api.get<Array<{ id: number; firstName: string; lastName: string; fullName: string }>>('/users/aes'),
  getUserById: (id: number) => api.get<User>(`/users/${id}`),
  updateUserStatus: (id: number, isActive: boolean) =>
    api.patch(`/users/${id}/status`, { isActive }),
};

// Commitment endpoints
export const commitmentApi = {
  getCurrentCommitment: () => api.get<WeeklyCommitment | null>('/commitments/current'),
  createOrUpdateCommitment: (data: {
    callsTarget: number;
    emailsTarget: number;
    meetingsTarget: number;
  }) => api.post<WeeklyCommitment>('/commitments', data),
  getCommitmentHistory: (limit?: number) =>
    api.get<WeeklyCommitment[]>('/commitments/history', { params: { limit } }),
  getUserWeekCommitment: (userId: number, weekStart: string) =>
    api.get<WeeklyCommitment | null>(`/commitments/user/${userId}/week/${weekStart}`),
  getUserCommitmentHistory: (userId: number, limit?: number) =>
    api.get<WeeklyCommitment[]>(`/commitments/user/${userId}/history`, { params: { limit } }),
};

// Result endpoints
export const resultApi = {
  getPreviousResult: () => api.get<WeeklyResult | null>('/results/previous'),
  createOrUpdateResult: (data: {
    callsActual: number;
    emailsActual: number;
    meetingsActual: number;
  }) => api.post<WeeklyResult>('/results', data),
  getResultHistory: (limit?: number) =>
    api.get<WeeklyResult[]>('/results/history', { params: { limit } }),
  getUserWeekResult: (userId: number, weekStart: string) =>
    api.get<WeeklyResult | null>(`/results/user/${userId}/week/${weekStart}`),
  getUserResultHistory: (userId: number, limit?: number) =>
    api.get<WeeklyResult[]>(`/results/user/${userId}/history`, { params: { limit } }),
};

// Goal endpoints
export const goalApi = {
  getGoalByDate: (date: string) => api.get<DailyGoal | null>(`/goals/date/${date}`),
  createOrUpdateGoal: (data: {
    date: string;
    callsGoal: number;
    emailsGoal: number;
    meetingsGoal: number;
  }) => api.post<DailyGoal>('/goals', data),
  updateAchievement: (data: {
    date: string;
    callsAchieved?: boolean;
    emailsAchieved?: boolean;
    meetingsAchieved?: boolean;
  }) => api.patch<DailyGoal>('/goals/achievement', data),
  getCurrentWeekGoals: () => api.get<DailyGoal[]>('/goals/week/current'),
  getUserGoalByDate: (userId: number, date: string) =>
    api.get<DailyGoal | null>(`/goals/user/${userId}/date/${date}`),
  getUserWeekGoals: (userId: number, weekStart: string) =>
    api.get<DailyGoal[]>(`/goals/user/${userId}/week/${weekStart}`),
};

// Team update endpoints
export const teamUpdateApi = {
  getAll: (category?: string) =>
    api.get<TeamUpdate[]>('/team-updates', { params: { category } }),
  getCategories: () =>
    api.get<Array<{ name: string; count: number }>>('/team-updates/categories'),
  create: (data: {
    title: string;
    content?: string;
    category: TeamUpdate['category'];
    section?: string;
    fileUrl?: string;
    externalLink?: string;
  }) => api.post<TeamUpdate>('/team-updates', data),
  update: (id: number, data: Partial<TeamUpdate>) =>
    api.put<TeamUpdate>(`/team-updates/${id}`, data),
  delete: (id: number) => api.delete(`/team-updates/${id}`),
};

// Leaderboard endpoints
export const leaderboardApi = {
  getLeaderboard: () => api.get<LeaderboardData>('/leaderboard'),
  getSummary: (weekStart?: string) =>
    api.get('/leaderboard/summary', { params: { weekStart } }),
  getHistory: (weeks?: number) =>
    api.get('/leaderboard/history', { params: { weeks } }),
};

// Activity endpoints
export const activityApi = {
  logEvent: (data: { activityType: 'call'|'email'|'meeting'|'social'|'other'; quantity?: number; durationSeconds?: number; source?: string; metadata?: any; occurredAt?: string; }) =>
    api.post('/activity/events', data),
  getMySummary: () => api.get('/activity/me/summary'),
  getAdminOverview: () => api.get('/activity/admin/overview'),
  getAdminDaily: (date?: string) => api.get('/activity/admin/daily', { params: { date } }),
  getAdminWeekly: (weekStart?: string) => api.get('/activity/admin/weekly', { params: { weekStart } }),
};

export default api;