/**
 * Recommendation Templates — maps categories + urgency to actionable next steps.
 */

const actionTemplates = {
  'Billing Issue': {
    base: 'Route to the billing team. Verify the customer\'s payment method and subscription status in the billing portal.',
    highUrgency: 'ESCALATE IMMEDIATELY: Payment failure may be blocking account access — billing team should contact the customer within 1 hour.',
  },
  'Technical Problem': {
    base: 'Route to technical support. Ask the customer for their browser/OS, exact error message, and steps to reproduce.',
    highUrgency: 'ESCALATE IMMEDIATELY: Critical technical failure — assign to senior engineer and notify on-call team.',
  },
  'General Inquiry': {
    base: 'Reply with a link to the relevant FAQ or help article. If the question is not covered, route to a support agent.',
    highUrgency: null,
  },
  'Feature Request': {
    base: 'Thank the customer for the suggestion and log it in the product feedback tracker for the PM team to review.',
    highUrgency: null,
  },
  'Unknown': {
    base: 'Could not auto-categorize. Route to a senior support agent for manual triage.',
    highUrgency: 'ESCALATE: High urgency but unknown category — senior agent must review immediately.',
  },
};

/**
 * Returns a recommended action string based on category and urgency level.
 */
export function getRecommendedAction(category, urgency) {
  const template = actionTemplates[category] ?? actionTemplates['Unknown'];
  if (urgency === 'High' && template.highUrgency) {
    return template.highUrgency;
  }
  return template.base;
}

export function getAvailableCategories() {
  return Object.keys(actionTemplates);
}

/**
 * Determines whether a message should be escalated to a senior agent.
 * Escalation is driven by actual urgency signals, not message length.
 */
export function shouldEscalate(category, urgency, message) {
  if (urgency === 'High') return true;

  const criticalKeywords = [
    'outage', 'down', 'breach', 'data loss', 'cannot access',
    'emergency', 'production', 'critical', 'hacked',
  ];
  const lower = message.toLowerCase();
  return criticalKeywords.some(k => lower.includes(k));
}
