"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Lightbulb, X, Check, MessageCircle, Home } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface CanvasSection {
  title: string;
  placeholder: string;
  gridArea: string;
  color: string;
}

interface CanvasSuggestion {
  sectionId: string;
  currentValue: string;
  suggestedValue: string;
  reasoning: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  canvasSuggestions?: CanvasSuggestion[];
}

interface LeanCanvasSuggestion {
  sectionId: string;
  currentValue: string;
  suggestion: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  type: 'empty' | 'insufficient' | 'improvement';
}

const canvasSections: CanvasSection[] = [
  {
    title: "課題",
    placeholder: "顧客が抱える上位3つの課題",
    gridArea: "problem",
    color: "bg-white border-gray-200",
  },
  {
    title: "解決策",
    placeholder: "課題に対する解決策",
    gridArea: "solution",
    color: "bg-white border-gray-200",
  },
  {
    title: "主要指標",
    placeholder: "成功を測る指標",
    gridArea: "metrics",
    color: "bg-white border-gray-200",
  },
  {
    title: "価値提案",
    placeholder: "独自の価値・メリット",
    gridArea: "uvp",
    color: "bg-white border-gray-200",
  },
  {
    title: "優位性",
    placeholder: "競合との差別化要素",
    gridArea: "advantage",
    color: "bg-white border-gray-200",
  },
  {
    title: "チャネル",
    placeholder: "顧客への到達経路",
    gridArea: "channels",
    color: "bg-white border-gray-200",
  },
  {
    title: "顧客層",
    placeholder: "ターゲット顧客",
    gridArea: "segments",
    color: "bg-white border-gray-200",
  },
  {
    title: "コスト",
    placeholder: "主要コスト",
    gridArea: "cost",
    color: "bg-white border-gray-200",
  },
  {
    title: "収益",
    placeholder: "収益モデル",
    gridArea: "revenue",
    color: "bg-white border-gray-200",
  },
];

export default function LeanCanvasPage() {
  const [canvasData, setCanvasData] = useState<Record<string, string>>({});
  const [businessName, setBusinessName] = useState<string>("");
  const [suggestions, setSuggestions] = useState<LeanCanvasSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  // Check if there's a brainstorm idea in sessionStorage
  useEffect(() => {
    const brainstormIdea = sessionStorage.getItem('brainstormIdea');
    if (brainstormIdea) {
      try {
        const idea = JSON.parse(brainstormIdea);
        setBusinessName(idea.title);
        // Pre-fill some canvas sections based on the idea
        setCanvasData({
          uvp: idea.uniqueValue,
          segments: idea.targetMarket,
          solution: idea.description
        });
        // Clear the sessionStorage
        sessionStorage.removeItem('brainstormIdea');
        // Show a welcome message in chat
        setChatMessages([{
          role: 'assistant',
          content: `素晴らしいアイデアですね！「${idea.title}」のリーンキャンバスを一緒に作成しましょう。すでにいくつかの項目を入力しておきました。他の項目も一緒に埋めていきましょう。`
        }]);
      } catch (error) {
        console.error('Failed to parse brainstorm idea:', error);
      }
    }
  }, []);

  const handleSectionChange = (sectionId: string, value: string) => {
    setCanvasData((prev) => ({
      ...prev,
      [sectionId]: value,
    }));
  };

  const getSuggestions = useCallback(async () => {
    if (!businessName.trim()) return;

    setIsLoadingSuggestions(true);
    try {
      const response = await fetch('/api/lean-canvas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName,
          canvasData,
          context: {
            timestamp: new Date().toISOString(),
            requestType: 'suggestion'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.suggestions) {
          // Filter out dismissed suggestions
          const newSuggestions = result.suggestions.filter(
            (suggestion: LeanCanvasSuggestion) => 
              !dismissedSuggestions.has(`${suggestion.sectionId}-${suggestion.type}`)
          );
          setSuggestions(newSuggestions);
        }
      }
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [businessName, canvasData, dismissedSuggestions]);

  const applySuggestion = (suggestion: LeanCanvasSuggestion) => {
    setCanvasData(prev => ({
      ...prev,
      [suggestion.sectionId]: suggestion.suggestion
    }));
    dismissSuggestion(suggestion);
  };

  const dismissSuggestion = (suggestion: LeanCanvasSuggestion) => {
    const suggestionKey = `${suggestion.sectionId}-${suggestion.type}`;
    setDismissedSuggestions(prev => new Set([...prev, suggestionKey]));
    setSuggestions(prev => prev.filter(s => 
      `${s.sectionId}-${s.type}` !== suggestionKey
    ));
  };

  // Chat functionality
  const sendChatMessage = useCallback(async () => {
    if (!currentMessage.trim() || !businessName.trim()) return;

    const userMessage = currentMessage.trim();
    setCurrentMessage("");
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoadingChat(true);

    try {
      const response = await fetch('/api/business-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessName,
          canvasData,
          message: userMessage,
          chatHistory: chatMessages
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.response) {
          setChatMessages(prev => [...prev, { 
            role: 'assistant', 
            content: result.response, 
            canvasSuggestions: result.canvasSuggestions 
          }]);
        }
      }
    } catch (error) {
      console.error('Failed to send chat message:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoadingChat(false);
    }
  }, [currentMessage, businessName, canvasData, chatMessages]);

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // Function to apply canvas suggestions from chat
  const applyCanvasSuggestion = (suggestion: CanvasSuggestion, messageIndex: number, suggestionIndex: number) => {
    setCanvasData(prev => ({
      ...prev,
      [suggestion.sectionId]: suggestion.suggestedValue
    }));
    // Track which suggestions have been applied
    const suggestionKey = `${messageIndex}-${suggestionIndex}`;
    setAppliedSuggestions(prev => new Set([...prev, suggestionKey]));
  };

  // Check if canvas is complete
  const isCanvasComplete = () => {
    const requiredSections = canvasSections.map(s => s.gridArea);
    return requiredSections.every(sectionId => {
      const value = canvasData[sectionId];
      return value && value.trim().length > 0;
    });
  };

  // Check if canvas has enough content for completion
  const hasSubstantialContent = () => {
    const requiredSections = canvasSections.map(s => s.gridArea);
    return requiredSections.every(sectionId => {
      const value = canvasData[sectionId];
      return value && value.trim().length > 20; // At least 20 characters per section
    });
  };

  // Auto-generate suggestions when canvas data or business name changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      getSuggestions();
    }, 2000); // Debounce for 2 seconds

    return () => clearTimeout(timeoutId);
  }, [getSuggestions]);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden p-4">
      {/* Navigation - Fixed Position */}
      <Link 
        href="/" 
        className="fixed top-6 left-6 z-50 bg-gray-500 hover:bg-gray-600 text-white rounded-full p-3 shadow-lg transition-colors"
        title="ホームに戻る"
      >
        <Home className="w-5 h-5" />
      </Link>

      {/* Chat Icon - Fixed Position */}
      <button
        onClick={() => setIsChatOpen(!isChatOpen)}
        className="fixed top-6 right-6 z-50 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-colors"
        title="AIビジネス相談"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Business Name Input */}
      <div className="mb-4 text-center">
        <input
          type="text"
          placeholder="事業名を入力してください"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="text-2xl font-bold bg-transparent border-0 border-b-2 border-gray-300 focus:border-blue-500 focus:outline-none text-center text-gray-800 placeholder:text-gray-400 transition-colors px-4 py-2 min-w-[300px]"
        />
        
        {/* Canvas Completion Status */}
        {businessName && isCanvasComplete() && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">リーンキャンバスが完成しました！</span>
            </div>
            {hasSubstantialContent() && (
              <button
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg"
                onClick={() => {
                  // Here you could add functionality like downloading, saving, or navigating to next step
                  alert('おめでとうございます！リーンキャンバスが完成しました。次のステップに進めます。');
                }}
              >
                <span>🎉</span>
                完了 - 次へ進む
              </button>
            )}
          </div>
        )}
      </div>

      {/* Canvas Grid */}
      <div
        className="h-[calc(100vh-140px)] grid gap-3"
        style={{
          gridTemplateColumns: "repeat(5, 1fr)",
          gridTemplateRows: "repeat(3, 1fr)",
          gridTemplateAreas: `
            "problem solution metrics uvp segments"
            "problem solution metrics advantage segments"
            "cost cost revenue revenue channels"
          `,
        }}
      >
        {canvasSections.map((section) => {
          const sectionSuggestions = suggestions.filter(s => s.sectionId === section.gridArea);
          const suggestion = sectionSuggestions[0]; // Show only first suggestion per section
          const hasSuggestion = !!suggestion;
          
          return (
            <div
              key={section.gridArea}
              className={`${section.color} border rounded-xl p-3 flex flex-col transition-all hover:shadow-md shadow-sm relative`}
              style={{ gridArea: section.gridArea }}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {section.title}
                </h3>
                {isLoadingSuggestions && (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent"></div>
                )}
              </div>
              
              <textarea
                placeholder={section.placeholder}
                value={canvasData[section.gridArea] || ""}
                onChange={(e) => handleSectionChange(section.gridArea, e.target.value)}
                className="flex-1 w-full bg-transparent rounded-lg p-2 text-sm resize-none border-0 focus:outline-none focus:ring-0 transition-all placeholder:text-gray-400 mb-2"
              />

              {/* Inline Suggestion */}
              {hasSuggestion && (
                <div className="border-t border-gray-200 pt-2 mt-auto">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                    <div className="flex items-start gap-2 mb-2">
                      <Lightbulb className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-700 flex-1">
                        {suggestion.suggestion}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-5">
                      <button
                        onClick={() => applySuggestion(suggestion)}
                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
                        title="提案を適用"
                      >
                        <Check className="w-3 h-3" />
                        適用
                      </button>
                      <button
                        onClick={() => dismissSuggestion(suggestion)}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                        title="提案を却下"
                      >
                        <X className="w-3 h-3" />
                        却下
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Chat Window */}
      {isChatOpen && (
        <div className="fixed top-20 right-6 z-40 w-96 h-[500px] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-500 text-white rounded-t-lg">
            <div>
              <h3 className="font-semibold">AIビジネス相談</h3>
              <p className="text-xs text-blue-100">
                {businessName || "事業について"}相談できます
              </p>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-500 text-sm">
                <p>こんにちは！{businessName}について</p>
                <p>何でもお気軽にご相談ください。</p>
                <p className="mt-2 text-xs">Web検索も活用してお答えします。</p>
              </div>
            )}
            {chatMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
              >
                {message.role === 'user' ? (
                  <div className="max-w-[80%] p-3 rounded-lg text-sm bg-blue-500 text-white">
                    {message.content}
                  </div>
                ) : (
                  <div className="max-w-[90%]">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          // Style headings
                          h1: ({ children }) => <h1 className="text-xl font-bold text-gray-900 mb-3">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-lg font-semibold text-gray-900 mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-md font-medium text-gray-900 mb-2">{children}</h3>,
                          // Style lists
                          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="text-gray-800">{children}</li>,
                          // Style paragraphs
                          p: ({ children }) => <p className="mb-3 text-gray-800 leading-relaxed">{children}</p>,
                          // Style bold text
                          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          // Style code
                          code: ({ children, className }) => 
                            className ? (
                              <code className={`${className} text-xs`}>{children}</code>
                            ) : (
                              <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono text-gray-800">{children}</code>
                            ),
                          // Style code blocks
                          pre: ({ children }) => <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-3">{children}</pre>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Canvas Suggestions */}
                    {message.canvasSuggestions && message.canvasSuggestions.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {message.canvasSuggestions.map((suggestion, suggestionIndex) => {
                          const sectionName = canvasSections.find(s => s.gridArea === suggestion.sectionId)?.title || suggestion.sectionId;
                          const suggestionKey = `${index}-${suggestionIndex}`;
                          const isApplied = appliedSuggestions.has(suggestionKey);
                          const isDismissed = appliedSuggestions.has(`dismissed-${suggestionKey}`);
                          
                          if (isDismissed) return null; // Hide dismissed suggestions
                          
                          return (
                            <div key={suggestionIndex} className={`border rounded-lg p-3 transition-all ${
                              isApplied ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                            }`}>
                              <div className="flex items-start gap-2">
                                <Lightbulb className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                                  isApplied ? 'text-green-600' : 'text-yellow-600'
                                }`} />
                                <div className="flex-1">
                                  <div className="text-xs font-medium text-gray-700 mb-1">
                                    {sectionName}の改善提案
                                  </div>
                                  <p className="text-xs text-gray-700 mb-2">
                                    {suggestion.suggestedValue}
                                  </p>
                                  {suggestion.reasoning && (
                                    <p className="text-xs text-gray-500 mb-2">
                                      理由: {suggestion.reasoning}
                                    </p>
                                  )}
                                  <div className="flex gap-1">
                                    {isApplied ? (
                                      <div className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        適用済み
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => applyCanvasSuggestion(suggestion, index, suggestionIndex)}
                                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
                                          title="提案を適用"
                                        >
                                          <Check className="w-3 h-3" />
                                          適用
                                        </button>
                                        <button
                                          onClick={() => {
                                            const key = `${index}-${suggestionIndex}`;
                                            setAppliedSuggestions(prev => new Set([...prev, `dismissed-${key}`]));
                                          }}
                                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                                          title="提案を却下"
                                        >
                                          <X className="w-3 h-3" />
                                          却下
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoadingChat && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 p-3 rounded-lg text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                    <span>考え中...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleChatKeyPress}
                placeholder="質問を入力してください..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isLoadingChat}
              />
              <button
                onClick={sendChatMessage}
                disabled={isLoadingChat || !currentMessage.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                送信
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}