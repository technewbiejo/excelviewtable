'use server';
/**
 * @fileOverview This file defines a Genkit flow that suggests useful filters and categories
 * based on the uploaded CSV data using AI analysis.
 *
 * - suggestFilters - The main function to trigger the filter suggestion flow.
 * - AISuggestedFiltersInput - The input type for the suggestFilters function, expects CSV data as a string.
 * - AISuggestedFiltersOutput - The output type, which is a list of suggested filters and categories.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AISuggestedFiltersInputSchema = z.object({
  csvData: z.string().describe('The CSV data as a string.'),
});
export type AISuggestedFiltersInput = z.infer<typeof AISuggestedFiltersInputSchema>;

const AISuggestedFiltersOutputSchema = z.object({
  suggestedFilters: z.array(z.string()).describe('A list of suggested filters based on the CSV data.'),
  suggestedCategories: z.array(z.string()).describe('A list of suggested categories based on the CSV data.'),
});
export type AISuggestedFiltersOutput = z.infer<typeof AISuggestedFiltersOutputSchema>;

export async function suggestFilters(input: AISuggestedFiltersInput): Promise<AISuggestedFiltersOutput> {
  return suggestFiltersFlow(input);
}

const suggestFiltersPrompt = ai.definePrompt({
  name: 'suggestFiltersPrompt',
  input: {schema: AISuggestedFiltersInputSchema},
  output: {schema: AISuggestedFiltersOutputSchema},
  prompt: `You are an AI assistant designed to analyze CSV data and suggest useful filters and categories to the user.

  Analyze the following CSV data:
  \`\`\`
  {{{csvData}}}
  \`\`\`

  Based on this data, suggest a list of filters and categories that would be most useful for the user to explore and understand the data.

  Return the filters and categories as arrays of strings.
  Do not include any additional explanation besides the array of suggestedFilters and suggestedCategories.
  `,
});

const suggestFiltersFlow = ai.defineFlow(
  {
    name: 'suggestFiltersFlow',
    inputSchema: AISuggestedFiltersInputSchema,
    outputSchema: AISuggestedFiltersOutputSchema,
  },
  async input => {
    const {output} = await suggestFiltersPrompt(input);
    return output!;
  }
);
