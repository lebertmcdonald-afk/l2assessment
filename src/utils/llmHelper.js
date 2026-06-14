import Groq from 'groq-sdk';

// Lazy singleton — only created if an API key is available so a missing key
// doesn't crash the entire app at module load time.
let _groq = null;
function getGroqClient() {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  if (!key) return null;
  if (!_groq) {
    _groq = new Groq({ apiKey: key, dangerouslyAllowBrowser: true });
  }
  return _groq;
}

const VALID_CATEGORIES = [
  'Billing Issue',
  'Technical Problem',
  'General Inquiry',
  'Feature Request',
  'Unknown',
];

const SYSTEM_PROMPT = `You are a customer support triage assistant for Relay AI, a SaaS platform that helps small businesses manage customer operations.

Your job is to read incoming customer messages and classify them into exactly one of these categories:
- "Billing Issue" — payment failures, charges, invoices, refunds, subscription cancellations
- "Technical Problem" — bugs, errors, crashes, outages, features not working
- "Feature Request" — suggestions for new features or product improvements
- "General Inquiry" — questions about the product, pricing, capabilities, or business hours
- "Unknown" — cannot be determined from the message alone

Respond ONLY with valid JSON in this exact format — no extra text, no markdown:
{
  "category": "<one of the five categories above>",
  "confidence": "<High | Medium | Low>",
  "reasoning": "<1-2 sentences explaining why you chose this category>"
}`;

/**
 * Categorize a customer support message using Groq AI.
 *
 * @param {string} message
 * @returns {Promise<{category: string, reasoning: string}>}
 */
export async function categorizeMessage(message) {
  const groq = getGroqClient();
  if (!groq) {
    return getMockCategorization(message);
  }
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      temperature: 0.1, // Low temperature = consistent, deterministic output
      response_format: { type: 'json_object' },
    });

    const raw = response.choices[0].message.content;
    const parsed = JSON.parse(raw);

    const category = VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : 'Unknown';

    const confidence = parsed.confidence ?? 'Medium';
    const reasoning = parsed.reasoning
      ? `**Confidence: ${confidence}**\n\n${parsed.reasoning}`
      : raw;

    return { category, reasoning };
  } catch (error) {
    console.warn('Groq API failed, using fallback:', error.message);
    return getMockCategorization(message);
  }
}

/**
 * Rule-based fallback when the Groq API is unavailable.
 */
function getMockCategorization(message) {
  const lower = message.toLowerCase();

  if (
    lower.includes('bill') || lower.includes('payment') ||
    lower.includes('charge') || lower.includes('invoice') ||
    lower.includes('credit card') || lower.includes('subscription') ||
    lower.includes('refund') || (lower.includes('cancel') && lower.includes('account'))
  ) {
    return {
      category: 'Billing Issue',
      reasoning: '**Confidence: High** (fallback)\n\nThe message contains billing-related keywords such as payment, charge, or subscription.',
    };
  }

  if (
    lower.includes('bug') || lower.includes('error') ||
    lower.includes('broken') || lower.includes('not working') ||
    lower.includes('crash') || lower.includes('down') ||
    lower.includes('server') || lower.includes('loading') ||
    lower.includes('slow') || lower.includes('outage')
  ) {
    return {
      category: 'Technical Problem',
      reasoning: '**Confidence: High** (fallback)\n\nThe message describes a technical error, system failure, or product malfunction.',
    };
  }

  if (
    lower.includes('feature') || lower.includes('improve') ||
    lower.includes('suggestion') || lower.includes('wish') ||
    lower.includes('enhancement') || lower.includes('would be great') ||
    lower.includes('would like to see') || lower.includes('could you add')
  ) {
    return {
      category: 'Feature Request',
      reasoning: '**Confidence: High** (fallback)\n\nThe message requests a new feature or product improvement rather than reporting a problem.',
    };
  }

  if (
    lower.includes('how') || lower.includes('what') ||
    lower.includes('when') || lower.includes('where') ||
    lower.includes('can i') || lower.includes('is there') ||
    lower.includes('?')
  ) {
    return {
      category: 'General Inquiry',
      reasoning: '**Confidence: Medium** (fallback)\n\nThe message appears to be a question or information request without signs of a technical or billing problem.',
    };
  }

  return {
    category: 'Unknown',
    reasoning: '**Confidence: Low** (fallback)\n\nThe message could not be confidently classified. Manual review is recommended.',
  };
}
