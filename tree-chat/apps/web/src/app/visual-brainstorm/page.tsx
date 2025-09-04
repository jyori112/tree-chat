"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Plus, X, Home, Lightbulb, Target, TrendingUp } from "lucide-react";

interface Question {
  id: string;
  text: string;
  icon: React.ReactNode;
  category: 'interest' | 'problem' | 'skill' | 'market';
}

interface Keyword {
  id: string;
  text: string;
  x: number;
  y: number;
  category: 'interest' | 'problem' | 'skill' | 'market';
  size: 'small' | 'medium' | 'large';
}

interface IdeaCard {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  x: number;
  y: number;
}

const INITIAL_QUESTIONS: Question[] = [
  {
    id: '1',
    text: 'どんな分野に興味がありますか？',
    icon: <Lightbulb className="w-5 h-5" />,
    category: 'interest'
  },
  {
    id: '2',
    text: '解決したい問題は何ですか？',
    icon: <Target className="w-5 h-5" />,
    category: 'problem'
  },
  {
    id: '3',
    text: 'あなたの強みは何ですか？',
    icon: <TrendingUp className="w-5 h-5" />,
    category: 'skill'
  }
];

const categoryColors = {
  interest: 'bg-blue-100 border-blue-300 text-blue-800',
  problem: 'bg-red-100 border-red-300 text-red-800',
  skill: 'bg-green-100 border-green-300 text-green-800',
  market: 'bg-purple-100 border-purple-300 text-purple-800'
};

export default function VisualBrainstormPage() {
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [ideas, setIdeas] = useState<IdeaCard[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [selectedIdea, setSelectedIdea] = useState<IdeaCard | null>(null);

  // Set canvas size on mount
  useEffect(() => {
    const updateSize = () => {
      setCanvasSize({
        width: window.innerWidth - 400, // Subtract sidebar width
        height: window.innerHeight - 100 // Subtract header height
      });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleQuestionClick = (question: Question) => {
    setSelectedQuestion(question);
  };

  const submitAnswer = useCallback(async () => {
    if (!currentAnswer.trim() || !selectedQuestion) return;

    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/visual-brainstorm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: selectedQuestion.text,
          answer: currentAnswer,
          category: selectedQuestion.category,
          existingKeywords: keywords,
          existingIdeas: ideas
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Add new keywords with random positions
        if (result.keywords) {
          const newKeywords = result.keywords.map((kw: any) => ({
            ...kw,
            x: Math.random() * (canvasSize.width - 150) + 75,
            y: Math.random() * (canvasSize.height - 100) + 50,
            id: `kw-${Date.now()}-${Math.random()}`
          }));
          setKeywords(prev => [...prev, ...newKeywords]);
        }

        // Add new ideas
        if (result.ideas) {
          const newIdeas = result.ideas.map((idea: any) => ({
            ...idea,
            x: Math.random() * (canvasSize.width - 250) + 125,
            y: Math.random() * (canvasSize.height - 150) + 75,
            id: `idea-${Date.now()}-${Math.random()}`
          }));
          setIdeas(prev => [...prev, ...newIdeas]);
        }

        // Update questions
        if (result.newQuestions) {
          setQuestions(result.newQuestions);
        }
      }
    } catch (error) {
      console.error('Failed to process answer:', error);
    } finally {
      setIsProcessing(false);
      setCurrentAnswer("");
      setSelectedQuestion(null);
    }
  }, [currentAnswer, selectedQuestion, keywords, ideas, canvasSize]);

  const moveToCanvas = (idea: IdeaCard) => {
    // Store the idea in sessionStorage
    const brainstormIdea = {
      id: idea.id,
      title: idea.title,
      description: idea.description,
      category: 'other',
      targetMarket: '未定義',
      uniqueValue: idea.description
    };
    sessionStorage.setItem('brainstormIdea', JSON.stringify(brainstormIdea));
    window.location.href = '/lean-canvas';
  };

  const removeKeyword = (id: string) => {
    setKeywords(prev => prev.filter(k => k.id !== id));
  };

  const removeIdea = (id: string) => {
    setIdeas(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden flex">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 z-20 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            title="ホームに戻る"
          >
            <Home className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">ビジュアル ブレインストーミング</h1>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <span className="text-sm text-gray-600">AIがあなたのアイデアを形にします</span>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative mt-16">
        <div className="absolute inset-0 p-8">
          {/* Keywords */}
          {keywords.map((keyword) => (
            <div
              key={keyword.id}
              className={`absolute border-2 rounded-lg p-3 shadow-md hover:shadow-lg transition-all cursor-move ${categoryColors[keyword.category]}`}
              style={{
                left: keyword.x,
                top: keyword.y,
                fontSize: keyword.size === 'large' ? '18px' : keyword.size === 'medium' ? '14px' : '12px'
              }}
            >
              <button
                onClick={() => removeKeyword(keyword.id)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-red-100"
              >
                <X className="w-3 h-3 text-gray-600" />
              </button>
              {keyword.text}
            </div>
          ))}

          {/* Idea Cards */}
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="absolute bg-white border-2 border-purple-300 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all cursor-pointer w-64"
              style={{
                left: idea.x,
                top: idea.y
              }}
              onClick={() => setSelectedIdea(idea)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeIdea(idea.id);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-red-100"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
              <h3 className="font-bold text-sm text-gray-800 mb-2">{idea.title}</h3>
              <p className="text-xs text-gray-600 mb-2">{idea.description}</p>
              <div className="flex flex-wrap gap-1">
                {idea.keywords.slice(0, 3).map((kw, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {/* Center help text when empty */}
          {keywords.length === 0 && ideas.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Sparkles className="w-12 h-12 text-purple-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">右側の質問に答えて、ブレインストーミングを始めましょう</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-96 bg-white border-l border-gray-200 mt-16 p-6 overflow-y-auto">
        {/* Questions Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">質問を選んで答えてください</h2>
          <div className="space-y-3">
            {questions.map((question) => (
              <button
                key={question.id}
                onClick={() => handleQuestionClick(question)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedQuestion?.id === question.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-purple-500 mt-0.5">{question.icon}</div>
                  <p className="text-sm text-gray-700">{question.text}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Answer Input */}
        {selectedQuestion && (
          <div className="mb-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
            <p className="text-sm font-medium text-gray-700 mb-3">{selectedQuestion.text}</p>
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="あなたの答えを入力してください..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-24 text-sm"
              disabled={isProcessing}
            />
            <button
              onClick={submitAnswer}
              disabled={isProcessing || !currentAnswer.trim()}
              className="mt-3 w-full py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>処理中...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>回答を追加</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Selected Idea */}
        {selectedIdea && (
          <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border-2 border-purple-200">
            <h3 className="font-semibold text-gray-800 mb-2">{selectedIdea.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{selectedIdea.description}</p>
            <button
              onClick={() => moveToCanvas(selectedIdea)}
              className="w-full py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all flex items-center justify-center gap-2"
            >
              <span>リーンキャンバスを作成</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{keywords.length}</p>
              <p className="text-xs text-gray-500">キーワード</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">{ideas.length}</p>
              <p className="text-xs text-gray-500">アイデア</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}