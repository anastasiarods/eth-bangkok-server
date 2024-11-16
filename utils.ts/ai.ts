import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'

const openai = createOpenAI({ apiKey: process.env.OPEN_AI_API_KEY })('gpt-4o-mini')

const PARSE_NOTE_SYSTEM_PROMPT = `
You are an advanced personal assistant that helps to detect harassment in the transcript of a conversation or note.
Please analyze the following note and provide a summary and headline of the issues.

Main things to detect:
- Harassment, bullying, or discrimination
- Disputes or conflicts
- Personal information or sensitive data
- Legal or compliance issues
- Emotional or mental health issues
- Agreements or commitments that can be later used as evidence

Also add a boolean indicating false or true, where false means that there was no harassment, bullying, or discrimination in the conversation or note.
`

export const PROCESSED_NOTE_SCHEMA = z.object({
  hasHarassment: z.boolean().describe('Whether the conversation or note contains harassment, bullying, or discrimination'),
  name: z.string().describe('The name of the person involved'),
  summary: z.string().optional().describe('A short sommary of the conversation or note'),
  headline: z.string().optional().describe('A headline of the issues detected in the conversation or note'),
})

export async function detectHarassment(prompt: string) {
  return await generateObject({
    model: openai,
    system: PARSE_NOTE_SYSTEM_PROMPT,
    schema: PROCESSED_NOTE_SCHEMA,
    prompt: prompt,
  })
}