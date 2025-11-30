// This is a server-side file.
'use server';

/**
 * @fileOverview Provides a summary of the uploaded CSV data, highlighting key trends and insights.
 *
 * - summarizeData - A function that takes CSV data as input and returns a summary.
 * - SummarizeDataInput - The input type for the summarizeData function.
 * - SummarizeDataOutput - The return type for the summarizeData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeDataInputSchema = z.object({
  csvData: z
    .string()
    .describe('The CSV data as a string.'),
});
export type SummarizeDataInput = z.infer<typeof SummarizeDataInputSchema>;

const SummarizeDataOutputSchema = z.object({
  summary: z.string().describe('A summary of the key trends and insights from the CSV data.'),
  suggestedFilters: z.array(z.string()).describe('Suggested filters based on the data.'),
  potentialCategories: z.array(z.string()).describe('Potential categories found in the CSV data'),
});
export type SummarizeDataOutput = z.infer<typeof SummarizeDataOutputSchema>;

export async function summarizeData(input: SummarizeDataInput): Promise<SummarizeDataOutput> {
  return summarizeDataFlow(input);
}

const summarizeDataPrompt = ai.definePrompt({
  name: 'summarizeDataPrompt',
  input: {schema: SummarizeDataInputSchema},
  output: {schema: SummarizeDataOutputSchema},
  prompt: `You are an expert data analyst. Please analyze the following CSV data and provide a concise summary of the key trends and insights.

CSV Data:
{{{csvData}}}

Additionally, suggest some useful filters based on the data (e.g., common values in columns) and potential categories that could be derived from the data to improve usability.

Your response MUST be a JSON object that follows this schema:
`,
});

const summarizeDataFlow = ai.defineFlow(
  {
    name: 'summarizeDataFlow',
    inputSchema: SummarizeDataInputSchema,
    outputSchema: SummarizeDataOutputSchema,
  },
  async input => {
    const {output} = await summarizeDataPrompt(input);
    return output!;
  }
);
