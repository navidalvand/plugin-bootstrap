import { type IAgentRuntime, logger, type Provider } from '@elizaos/core';

/**
 * Reads BACKEND_API_URL from .env / Settings ⇢ GET <url>/trends ⇢ returns JSON.
 * The resulting state block will be available at:
 *   {{providers.CUSTOM_TRENDS.trends}}
 */
export const customTrendsProvider: Provider = {
  name: 'CUSTOM_TRENDS',

  // called automatically by runtime.composeState()
  get: async (runtime: IAgentRuntime) => {
    const base = (runtime.getSetting('BACKEND_API_URL') as string) ?? process.env.BACKEND_API_URL;

    if (!base) {
      logger.warn('[CUSTOM_TRENDS] BACKEND_API_URL not set; returning empty trends');
      return { trends: [] };
    }

    const url = `${base.replace(/\/$/, '')}/twitter/trends`;
    logger.info(`[CUSTOM_TRENDS] Fetching trends from: ${url}`);

    try {
      const res = await fetch(url);
      logger.debug(`[CUSTOM_TRENDS] HTTP ${res.status}`);

      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      // ------▶️  *the real fix – use res.json()*
      const json = await res.json(); // 👈

      const trends = json.trends ?? json;
      logger.debug('[CUSTOM_TRENDS] Trends received:', trends);

      return {
        // three different shapes so templates/helpers can pick
        data: { trends },
        text: trends,
        values: { trends },
      };
    } catch (err) {
      logger.error('[CUSTOM_TRENDS] Fetch failed:', err);
      return { trends: [] };
    }
  },
};

/**
 * Template used by postGeneratedHandler – includes today’s trends
 * from providers.CUSTOM_TRENDS.trends (if available).
 */
export const customPostCreationTemplate = `# Task: Create a post in the voice, style, and perspective of {{agentName}} @{{twitterUserName}}.

### Example task outputs
1. A post about the importance of AI in our lives
<response>
  <thought>I am thinking about writing a post about the importance of AI in our lives</thought>
  <post>AI is changing the world and it is important to understand how it works</post>
  <imagePrompt>A futuristic cityscape with flying cars and people using AI to do things</imagePrompt>
</response>

2. A post about dogs
<response>
  <thought>I am thinking about writing a post about dogs</thought>
  <post>Dogs are man's best friend and they are loyal and loving</post>
  <imagePrompt>A dog playing with a ball in a park</imagePrompt>
</response>

3. A post about finding a new job
<response>
  <thought>Getting a job is hard, I bet there's a good tweet in that</thought>
  <post>Just keep going!</post>
  <imagePrompt>A person looking at a computer screen with a job search website</imagePrompt>
</response>

{{!-- ─────────────────────────────────────────────────────────── --}}
{{!--  NEW  : surface today’s trends from your backend            --}}
{{#if providers.CUSTOM_TRENDS.trends}}
### Today’s key trends
{{#each providers.CUSTOM_TRENDS.trends as |trend idx|}}
- {{trend}}
{{/each}}

{{/if}}
{{!-- ─────────────────────────────────────────────────────────── --}}

{{providers}}

Write a post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}.  
Do **not** add commentary or acknowledge this request, just write the post.

Guidelines:

* 1, 2, **or** 3 sentences (pick length at random)  
* No questions, no emojis, concise statements only  
* Use "\\n\\n" (double spaces) between sentences if there are several  
* **< 280 characters**

Your output **must** be a single XML block:

\`\`\`xml
<response>
  <thought>Your thought here</thought>
  <post>Your post text here</post>
  <imagePrompt>Optional image prompt here</imagePrompt>
</response>
\`\`\``;
