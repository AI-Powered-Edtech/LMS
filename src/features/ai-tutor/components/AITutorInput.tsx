/**
 * AI Tutor Input Component
 *
 * Question input with validation, rate limit display, and send functionality.
 */

import { AlertCircle, Clock, Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type AITutorError, validateQuestion } from "@/features/ai-tutor";
import { cn } from "@/utils/cn";

interface AITutorInputProps {
  onSendQuestion: (question: string) => Promise<void>;
  isLoading: boolean;
  error?: AITutorError | null;
  disabled?: boolean;
  lessonTitle?: string;
}

export function AITutorInput({
  onSendQuestion,
  isLoading,
  error,
  disabled = false,
  lessonTitle,
}: AITutorInputProps) {
  const [question, setQuestion] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [question]);

  // Clear validation error when question changes
  useEffect(() => {
    if (validationError && question.trim()) {
      setValidationError(null);
    }
  }, [question, validationError]);

  const handleSubmit = async () => {
    // Validate
    const validation = validateQuestion(question);
    if (!validation.valid) {
      setValidationError(validation.error || "Invalid question");
      return;
    }

    setValidationError(null);
    await onSendQuestion(question);

    // Clear input after successful send
    setQuestion("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && question.trim() && !disabled) {
        void handleSubmit();
      }
    }
  };

  const displayError = validationError || error?.message;

  return (
    <div
      ref={inputContainerRef}
      className={cn(
        "bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4",
        disabled && "opacity-50 pointer-events-none",
      )}
    >
      {/* Error Display */}
      {displayError && (
        <div className="mb-3 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{displayError}</p>
            {error?.code === "RATE_LIMIT_MINUTE" && error?.retryAfter && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Coba lagi dalam {error.retryAfter} detik
              </p>
            )}
            {error?.code === "RATE_LIMIT_DAILY" && (
              <p className="text-xs text-red-500 mt-1">
                Diskusi dengan guru atau coba lagi besok.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Context hint */}
      {lessonTitle && !question && (
        <div className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          Bertanya tentang:{" "}
          <span className="text-slate-600 dark:text-slate-400 font-medium">
            {lessonTitle}
          </span>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-3">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tulis pertanyaan Anda tentang materi ini..."
            disabled={disabled || isLoading}
            rows={1}
            className={cn(
              "w-full px-4 py-3 pr-12 rounded-2xl border-2 bg-slate-50 dark:bg-slate-800 resize-none",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-700 dark:text-slate-200",
              "focus:outline-none focus:ring-0",
              validationError
                ? "border-red-300 dark:border-red-600 focus:border-red-400 dark:focus:border-red-500"
                : "border-slate-200 dark:border-slate-700 focus:border-blue-400 dark:focus:border-blue-500",
              (disabled || isLoading) && "cursor-not-allowed",
            )}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!question.trim() || isLoading || disabled}
          aria-label="Kirim pertanyaan"
          className={cn(
            "shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
            question.trim() && !isLoading && !disabled
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25"
              : "bg-slate-100 text-slate-300 cursor-not-allowed",
          )}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Helper text */}
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <span>Tekan Enter untuk mengirim, Shift+Enter untuk baris baru</span>
        <span>{question.length}/2000</span>
      </div>
    </div>
  );
}
