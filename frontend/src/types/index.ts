export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ae' | 'admin';
  isActive?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface WeeklyCommitment {
  id?: number;
  weekStartDate: string;
  callsTarget: number;
  emailsTarget: number;
  meetingsTarget: number;
  dailyAverages?: {
    calls: number;
    emails: number;
    meetings: number;
  };
}

export interface WeeklyResult {
  id?: number;
  weekStartDate: string;
  callsActual: number;
  emailsActual: number;
  meetingsActual: number;
  callsTarget?: number;
  emailsTarget?: number;
  meetingsTarget?: number;
  percentages?: {
    calls: number;
    emails: number;
    meetings: number;
    overall?: number;
  };
}

export interface DailyGoal {
  id?: number;
  date: string;
  callsGoal: number;
  emailsGoal: number;
  meetingsGoal: number;
  callsAchieved: boolean;
  emailsAchieved: boolean;
  meetingsAchieved: boolean;
}

export interface TeamUpdate {
  id: number;
  title: string;
  content?: string;
  category:
    | 'start_here'
    | 'cold_calling'
    | 'prospecting'
    | 'cos_qc_onboarding'
    | 'performance_accountability'
    | 'product_market'
    | 'training_development'
    | 'client_templates_proposals'
    | 'meetings_internal_comms'
    // Backward compatibility with existing categories
    | 'presentations'
    | 'tickets'
    | 'events'
    | 'qc_updates';
  section?: string;
  fileUrl?: string;
  externalLink?: string;
  createdBy?: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  callsActual: number;
  emailsActual: number;
  meetingsActual: number;
  callsTarget: number;
  emailsTarget: number;
  meetingsTarget: number;
  achievementPercentage: number;
  hasData: boolean;
}

export interface LeaderboardData {
  weekStartDate: string;
  leaderboard: LeaderboardEntry[];
  topCallers: Array<{
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    callsActual: number;
  }>;
  topMeetingBookers: Array<{
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    meetingsActual: number;
  }>;
}