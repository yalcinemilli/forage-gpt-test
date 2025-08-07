import { useState } from 'react';

interface FeedbackProps {
    finalSuggestion: (suggestionText: string) => void;
    customerConversation: string;
    userInstruction: string;
    suggestion: string;
}


interface FeedbackPayload {
    customerMessage: string;
    gptSuggestion: string;
    finalResponse: string;
    userInstruction?: string;
    feedback: string;
}

export default function Feedback({ finalSuggestion, customerConversation, userInstruction, suggestion }: FeedbackProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedFeedback, setSelectedFeedback] = useState<'positive' | 'negative' | 'neutral'>()
    const [editsuggestion, setEditSuggestion] = useState<string>(suggestion);

    async function handleFeedback(feedback: 'positive' | 'negative' | 'neutral'): Promise<void> {
        const payload: FeedbackPayload = {
            customerMessage: customerConversation,
            gptSuggestion: suggestion,
            finalResponse: editsuggestion,
            userInstruction: userInstruction,
            feedback: selectedFeedback ?? ''
        };

        setSelectedFeedback(feedback);
        setIsSubmitting(true);

        try {
            await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            finalSuggestion(editsuggestion);

        } catch (error) {
            console.error('Fehler beim Senden des Feedbacks:', error);
        } finally {
            setIsSubmitting(false);
        }
    }

    if (selectedFeedback) {
        return (
            <div className={`bg-green-50 border border-green-200 rounded-md p-4`}>
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-medium text-green-800">
                            Vielen Dank für dein Feedback!
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`bg-gray-50 border border-gray-200 rounded-md p-4`}>
            <div className="w-full">
                <textarea
                    id="instruction"
                    rows={4}
                    onChange={(e) => setEditSuggestion(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"

                />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">
                War diese Antwort hilfreich?
            </h3>

            <div className="flex space-x-2">
                <button
                    onClick={() => handleFeedback('positive')}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    {isSubmitting ? 'Wird gesendet...' : 'Hilfreich'}
                </button>

                <button
                    onClick={() => handleFeedback('negative')}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                    </svg>
                    {isSubmitting ? 'Wird gesendet...' : 'Nicht hilfreich'}
                </button>

                <button
                    onClick={() => handleFeedback('neutral')}
                    disabled={isSubmitting}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {isSubmitting ? 'Wird gesendet...' : 'Neutral'}
                </button>
            </div>
        </div>
    )
}