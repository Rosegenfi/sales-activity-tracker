/**
 * Get the Monday of the current week
 */
export const getWeekStartDate = (date: Date): string => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0]; // Return YYYY-MM-DD format
};

/**
 * Get the Monday of the previous week
 */
export const getPreviousWeekStartDate = (date: Date): string => {
  const d = new Date(date);
  d.setDate(d.getDate() - 7);
  return getWeekStartDate(d);
};

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Get week range string (e.g., "Jan 1 - Jan 7, 2024")
 */
export const getWeekRangeString = (weekStart: string): string => {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  return `${startStr} - ${endStr}`;
};

/**
 * Compute ISO Monday week start string for an arbitrary date string
 */
export const getWeekStartFromDateString = (dateStr: string): string => {
  const d = new Date(dateStr);
  return getWeekStartDate(d);
};