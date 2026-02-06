import type { HostHistory } from './types';

/**
 * Calculates priority score for a host
 * Lower score = higher priority (called first)
 * 
 * Never accepted hosts get highest priority (-9999)
 * Recently accepted hosts get lower priority
 */
export function calculatePriorityScore(history: HostHistory): number {
  const currentWeek = getCurrentWeekNumber();
  
  // Never accepted = highest priority (score -9999)
  if (history.lastAcceptedWeek === null) {
    return -9999;
  }
  
  // Calculate weeks since last acceptance
  let weeksSince = currentWeek - history.lastAcceptedWeek;
  
  // Handle year rollover (if negative, add 52 weeks)
  if (weeksSince < 0) {
    weeksSince += 52;
  }
  
  // More weeks since acceptance = higher priority (lower score)
  // Multiply by -1 so lower score = higher priority
  return weeksSince * -1;
}

/**
 * Get current week number (1-52)
 */
export function getCurrentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek) + 1;
}

/**
 * Get week number for a specific date
 */
export function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.floor(diff / oneWeek) + 1;
}

/**
 * Randomize hosts within priority tiers
 * Tier = every 5 weeks
 * This ensures fair distribution within each tier
 */
export function randomizeWithinTiers(
  hosts: Array<{ hostId: string; priorityScore: number }>
): Array<{ hostId: string; priorityScore: number }> {
  // Group by priority tier (every 5 weeks is one tier)
  const tiers = new Map<number, typeof hosts>();
  
  hosts.forEach(host => {
    const tier = Math.floor(host.priorityScore / 5);
    if (!tiers.has(tier)) {
      tiers.set(tier, []);
    }
    tiers.get(tier)!.push(host);
  });
  
  // Randomize within each tier
  const result: typeof hosts = [];
  const sortedTiers = Array.from(tiers.keys()).sort((a, b) => a - b);
  
  sortedTiers.forEach(tier => {
    const tierHosts = tiers.get(tier)!;
    // Fisher-Yates shuffle
    for (let i = tierHosts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tierHosts[i], tierHosts[j]] = [tierHosts[j], tierHosts[i]];
    }
    result.push(...tierHosts);
  });
  
  return result;
}

/**
 * Determine if a date is a special Shabbat
 * (Passover, Succos, Shavuot, etc.)
 * Can be customized with Hebrew calendar
 */
export async function isSpecialShabbat(date: string): Promise<boolean> {
  // Placeholder - implement with Hebrew calendar library if needed
  // For now, treat all Shabatot equally
  return false;
}

/**
 * Calculate fairness score for a host
 * Takes into account acceptances, declines, and time since last call
 */
export function calculateFairnessScore(history: HostHistory): number {
  let score = 0;
  
  // Primary factor: weeks since last acceptance (more is better)
  const weeksSince = history.lastAcceptedWeek ? 
    getCurrentWeekNumber() - history.lastAcceptedWeek : 
    52; // Max out at 52 weeks never accepted
  
  score += weeksSince * 10; // Weight: 10 points per week
  
  // Secondary factor: total acceptances (fewer is better)
  score -= history.totalAcceptances * 5; // Penalty: 5 points per acceptance
  
  // Tertiary factor: decline ratio (higher ratio is negative)
  const declineRatio = history.totalDeclines / Math.max(history.totalAcceptances, 1);
  score -= declineRatio * 2;
  
  return score;
}
