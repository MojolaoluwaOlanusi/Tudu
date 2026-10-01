export interface BreakdownResult {
  title: string;
  subtasks: string[];
  provider: 'gemini' | 'groq' | 'ollama';
  count: number;
}

export interface AiStatus {
  provider: 'gemini' | 'groq' | 'ollama';
  configured: boolean;
  envVar: string;
}