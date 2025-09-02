import React from "react";
import { CheckCircle2 } from "lucide-react";
import { InterviewQuestion, FlattenedQuestion, TreeUtils } from "@/lib/interview-tree";
import { InterviewCard } from "./InterviewCard";

interface UnansweredQuestionsSidebarProps {
  questions: InterviewQuestion;
  onAnswer: (questionId: string, answer: string) => void;
  onQuestionFocus?: (questionId: string) => void;
}

// Remove the local FlattenedQuestion interface and flattenQuestions function
// We now use the ones from the TreeUtils

const QuestionItem: React.FC<{
  question: FlattenedQuestion;
  onAnswer: (questionId: string, answer: string) => void;
  onFocus?: (questionId: string) => void;
}> = ({ question, onAnswer, onFocus }) => {
  const handleFocus = (e: React.MouseEvent) => {
    // Prevent event from reaching InterviewCard's buttons
    e.preventDefault();
    e.stopPropagation();
    onFocus?.(question.id);
  };

  // Create a dummy onAnswer function that does nothing for sidebar cards
  const handleSidebarAnswer = () => {
    // Do nothing - this is just for display in sidebar
  };

  return (
    <div 
      className="mb-3 cursor-pointer" 
      onClick={handleFocus}
      onMouseDown={(e) => e.preventDefault()} // Prevent focus changes
    >
      <InterviewCard
        question={question}
        onAnswer={handleSidebarAnswer}
        level={question.level}
        readOnly={true}
      />
    </div>
  );
};

export const UnansweredQuestionsSidebar: React.FC<UnansweredQuestionsSidebarProps> = ({
  questions,
  onAnswer,
  onQuestionFocus
}) => {
  const flatQuestions = TreeUtils.flattenQuestions(questions);
  const unansweredQuestions = flatQuestions.filter(q => !q.isAnswered);
  const totalQuestions = flatQuestions.length;
  const answeredCount = totalQuestions - unansweredQuestions.length;

  return (
    <div className="w-80 h-full bg-background border-l border-border flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm mb-2">Interview Progress</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="text-green-600 font-medium">
            {answeredCount}/{totalQuestions}
          </div>
          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-green-600 h-1.5 rounded-full transition-all"
              style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {unansweredQuestions.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              All questions answered!
            </div>
          ) : (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Unanswered Questions ({unansweredQuestions.length})
              </h4>
              {unansweredQuestions.map((question) => (
                <QuestionItem
                  key={question.id}
                  question={question}
                  onAnswer={onAnswer}
                  onFocus={onQuestionFocus}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};