/**
 * AI Tutor Feature Module
 * 
 * Consolidated exports for the AI Tutor feature.
 */

// API exports
export {
    askTutor,
    validateQuestion,
    generateMessageId,
    formatDifficulty,
    getDifficultyColor
} from './api/aiTutorService';

// Types exports
export type {
    DifficultyLevel,
    AITutorMessage,
    AITutorResponse,
    RateLimitInfo,
    AITutorError,
    TutorContext,
    StudentDifficulty,
    PromptMessage,
    AskTutorOptions
} from './types';

// Prompt builder exports
export {
    classifyDifficulty,
    buildPrompt
} from './api/promptBuilder';

// Query hooks exports
export {
    useAskTutor,
    aiTutorKeys
} from './queries/aiTutorQueries';

// Component exports
export { AITutorPanel } from './components/AITutorPanel';
export { AITutorInput } from './components/AITutorInput';
export { AITutorTyping } from './components/AITutorTyping';
