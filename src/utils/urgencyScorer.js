/**
 * Urgency Scorer - Rule-based urgency calculation
 *
 * Scores start at 50 (Medium). Keywords and signals push the score up or down.
 * Final score maps to: High (>= 65), Medium (35-64), Low (< 35).
 */

const CRITICAL_KEYWORDS = [
  'urgent', 'critical', 'emergency', 'outage', 'asap', 'immediately',
  'data loss', 'breach', 'hacked', 'compromised', 'production down',
  'server down', 'system down', 'cannot access', "can't access", 'locked out',
  'everything is broken', 'completely broken', 'nothing works',
];

const HIGH_KEYWORDS = [
  'error', 'failed', 'fail', 'failure', 'crash', 'crashed', 'broken',
  'not working', 'bug', 'issue', 'problem', 'blocked', 'stuck',
  'lost', 'missing', 'wrong', 'incorrect', 'down', 'unavailable',
];

const LOW_URGENCY_KEYWORDS = [
  'suggestion', 'feature request', 'would be nice', 'would love',
  'in the future', 'someday', 'whenever', 'no rush', 'low priority',
];

const POSITIVE_WORDS = [
  'happy', 'love', 'great', 'excellent', 'wonderful', 'amazing',
  'fantastic', 'perfect', 'awesome',
];

const POLITE_WORDS = ['please', 'thank', 'thanks', 'appreciate', 'kindly'];

export function calculateUrgency(message) {
  const lower = message.toLowerCase();
  let score = 50;

  // Critical keywords are the strongest signal — each one spikes the score
  CRITICAL_KEYWORDS.forEach(keyword => {
    if (lower.includes(keyword)) score += 25;
  });

  // High-urgency keywords raise the score moderately
  HIGH_KEYWORDS.forEach(keyword => {
    if (lower.includes(keyword)) score += 10;
  });

  // Low-urgency language lowers the score
  LOW_URGENCY_KEYWORDS.forEach(keyword => {
    if (lower.includes(keyword)) score -= 20;
  });

  // ALL CAPS = customer is stressed/shouting — raise urgency
  // (Original code subtracted 50 here — that was backwards)
  if (message === message.toUpperCase() && message.length > 10) {
    score += 20;
  }

  // Exclamation marks only raise urgency when paired with a real problem
  const exclamationCount = (message.match(/!/g) || []).length;
  const hasProblemContext = CRITICAL_KEYWORDS.some(k => lower.includes(k)) ||
                            HIGH_KEYWORDS.some(k => lower.includes(k));
  if (hasProblemContext) {
    score += Math.min(exclamationCount * 5, 15); // cap to avoid inflation
  } else {
    score -= Math.min(exclamationCount * 5, 15); // enthusiasm, not distress
  }

  // Positive sentiment signals the message is not urgent
  POSITIVE_WORDS.forEach(word => {
    if (lower.includes(word)) score -= 15;
  });

  // Polite language typically means the customer is not panicking
  POLITE_WORDS.forEach(word => {
    if (lower.includes(word)) score -= 8;
  });

  // Pure questions (no crisis keywords) are lower urgency
  // Questions with no crisis context are almost always lower urgency
  if (message.includes('?') && !hasProblemContext) {
    score -= 15;
  }

  // Very short messages with no keywords signal noise or confusion, not crisis
  if (message.trim().length < 5) {
    score -= 20;
  }

  // NOTE: Removed short-message penalty — "Server down now" is 14 chars and CRITICAL.
  // NOTE: Removed off-hours/weekend penalty — customers need help regardless of business hours.

  if (score >= 60) return 'High';
  if (score <= 40) return 'Low';
  return 'Medium';
}
