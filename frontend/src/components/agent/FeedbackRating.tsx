'use client';

import React, { useState } from 'react';
import { Star, Check } from 'lucide-react';
import { agentApiClient } from '@/lib/api/client';
import { useToast } from '@/lib/context/ToastContext';

interface FeedbackRatingProps {
  runId?: string | null;
  initialScore?: number;
}

export function FeedbackRating({ runId, initialScore }: FeedbackRatingProps) {
  const { addToast } = useToast();
  const [rating, setRating] = useState<number>(initialScore || 0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [submitted, setSubmitted] = useState<boolean>(!!initialScore);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRate = async (score: number) => {
    if (!runId || submitted || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await agentApiClient.createFeedback({
        run_id: runId,
        key: 'user_rating',
        score,
      });
      setRating(score);
      setSubmitted(true);
      addToast({
        title: 'Feedback Recorded',
        message: `Evaluation score of ${score}/5 saved for run ${runId.slice(0, 8)}.`,
        type: 'success',
      });
    } catch {
      addToast({
        title: 'Feedback Error',
        message: 'Could not submit rating to backend evaluation store.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!runId) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950/60 border border-slate-850 text-xs font-mono select-none">
      <span className="text-[11px] text-slate-500">Rate:</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={submitted || isSubmitting}
            onMouseEnter={() => !submitted && setHoverRating(star)}
            onMouseLeave={() => !submitted && setHoverRating(0)}
            onClick={() => handleRate(star)}
            className={`p-0.5 transition-colors ${
              (hoverRating || rating) >= star
                ? 'text-amber-400 hover:scale-110'
                : 'text-slate-600 hover:text-slate-400'
            }`}
            title={`Rate ${star} / 5 stars`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                (hoverRating || rating) >= star ? 'fill-amber-400' : ''
              }`}
            />
          </button>
        ))}
      </div>
      {submitted && (
        <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 ml-1">
          <Check className="w-3 h-3" /> Saved
        </span>
      )}
    </div>
  );
}
