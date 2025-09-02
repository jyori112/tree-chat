import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { InterviewQuestion } from "@/lib/interview-tree";
import { Edit, Sparkles, Plus } from "lucide-react";

interface InterviewCardProps {
  question: InterviewQuestion;
  onAnswer: (questionId: string, answer: string) => void;
  level: number;
  readOnly?: boolean; // Add readOnly prop for sidebar display
}

export const InterviewCard: React.FC<InterviewCardProps> = ({
  question,
  onAnswer,
  level,
  readOnly = false,
}) => {
  const [currentAnswer, setCurrentAnswer] = useState(question.answer || "");
  const [isEditing, setIsEditing] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState("");

  const handleSubmit = () => {
    if (!readOnly && currentAnswer.trim()) {
      onAnswer(question.id, currentAnswer.trim());
      setIsEditing(false);
    }
  };

  const handleChoiceSelect = (choice: string) => {
    if (!readOnly) {
      if (choice === "その他") {
        setShowOtherInput(true);
        setCurrentAnswer("");
      } else {
        setCurrentAnswer(choice);
        onAnswer(question.id, choice);
        setShowOtherInput(false);
      }
    }
  };

  const handleOtherSubmit = () => {
    if (otherValue.trim()) {
      setCurrentAnswer(otherValue.trim());
      onAnswer(question.id, otherValue.trim());
      setShowOtherInput(false);
      setOtherValue("");
    }
  };

  const handleSuggestedAnswer = (suggestion: string) => {
    setCurrentAnswer(suggestion);
    onAnswer(question.id, suggestion);
  };

  const handleEdit = () => {
    if (question.isAnswered) {
      setIsEditing(true);
      setCurrentAnswer(question.answer || "");
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card 
      className={`interview-card w-64 ${question.isAnswered ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'} shadow-sm hover:shadow-md transition-all`}
      data-question-id={question.id}
    >
      <CardContent className="px-4">
        <div className="mb-3 flex items-start justify-between">
          <p className="text-sm font-medium text-gray-900 leading-tight flex-1">
            {question.question}
          </p>
          {question.priority && (
            <Badge className={`ml-2 text-xs ${getPriorityColor(question.priority)}`}>
              {question.priority === 'high' ? '高' : question.priority === 'medium' ? '中' : '低'}
            </Badge>
          )}
        </div>

        {question.isAnswered && !isEditing ? (
          <div className="text-sm text-green-700 font-medium group flex items-center justify-between">
            <span>{question.answer}</span>
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {question.type === "choice" && question.choices ? (
              <div className="space-y-1">
                {question.choices.map((choice, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2 px-2 text-xs"
                    onClick={() => handleChoiceSelect(choice)}
                    disabled={readOnly}
                  >
                    {choice}
                  </Button>
                ))}
                
                {/* Other選択肢の追加 */}
                {question.allowOther && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2 px-2 text-xs border-dashed"
                      onClick={() => handleChoiceSelect("その他")}
                      disabled={readOnly}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      その他
                    </Button>
                    
                    {showOtherInput && (
                      <div className="space-y-1">
                        <Input
                          placeholder="その他の回答を入力..."
                          value={otherValue}
                          onChange={(e) => setOtherValue(e.target.value)}
                          className="text-xs"
                          disabled={readOnly}
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && otherValue.trim()) {
                              handleOtherSubmit();
                            }
                          }}
                        />
                        <Button
                          onClick={handleOtherSubmit}
                          disabled={!otherValue.trim() || readOnly}
                          size="sm"
                          className="w-full text-xs"
                        >
                          Submit
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {/* LLM予測回答の表示 */}
                {question.suggestedAnswers && question.suggestedAnswers.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center text-xs text-gray-500 mb-1">
                      <Sparkles className="h-3 w-3 mr-1" />
                      予測回答
                    </div>
                    {question.suggestedAnswers.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left h-auto py-1 px-2 text-xs text-blue-600 hover:bg-blue-50 border border-blue-200 border-dashed"
                        onClick={() => handleSuggestedAnswer(suggestion)}
                        disabled={readOnly}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}

                {question.type === "textarea" ? (
                  <Textarea
                    placeholder="Type your answer..."
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    className="text-xs"
                    rows={2}
                    disabled={readOnly}
                  />
                ) : (
                  <Input
                    placeholder="Type your answer..."
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    className="text-xs"
                    disabled={readOnly}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && currentAnswer.trim()) {
                        handleSubmit();
                      }
                    }}
                  />
                )}
                
                <Button
                  onClick={handleSubmit}
                  disabled={!currentAnswer.trim() || readOnly}
                  size="sm"
                  className="w-full text-xs"
                >
                  Submit
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};