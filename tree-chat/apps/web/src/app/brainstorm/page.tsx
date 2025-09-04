"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, Lightbulb, Send, Sparkles, RefreshCw, ArrowLeft } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface BrainstormIdea {
  id: string;
  title: string;
  description: string;
  category: 'product' | 'service' | 'platform' | 'other';
  targetMarket: string;
  uniqueValue: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  ideas?: BrainstormIdea[];
}

export default function BrainstormPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<BrainstormIdea | null>(null);
  const [userInterests, setUserInterests] = useState("");
  const [hasStarted, setHasStarted] = useState(false);

  const startBrainstorming = useCallback(async () => {
    if (!userInterests.trim()) return;
    
    setHasStarted(true);
    setIsLoading(true);
    
    const initialPrompt = `こんにちは！私の興味・関心事は以下の通りです：
${userInterests}

これらを踏まえて、私に合った事業アイデアをいくつか提案してください。`;
    
    setMessages([{ role: 'user', content: initialPrompt }]);
    
    try {
      const response = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: initialPrompt,
          chatHistory: [],
          userInterests
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: result.response,
            ideas: result.ideas 
          }]);
        }
      }
    } catch (error) {
      console.error('Failed to start brainstorming:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userInterests]);

  const sendMessage = useCallback(async () => {
    if (!currentMessage.trim() || isLoading) return;
    
    const userMessage = currentMessage.trim();
    setCurrentMessage("");
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          chatHistory: messages,
          selectedIdea,
          userInterests
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: result.response,
            ideas: result.ideas 
          }]);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '申し訳ございません。エラーが発生しました。もう一度お試しください。' 
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, messages, selectedIdea, userInterests]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const moveToCanvas = (idea: BrainstormIdea) => {
    // Store the idea in sessionStorage to pass to the Lean Canvas page
    sessionStorage.setItem('brainstormIdea', JSON.stringify(idea));
    window.location.href = '/lean-canvas';
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-8">
            <ArrowLeft className="w-4 h-4" />
            ホームに戻る
          </Link>
          
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                事業アイデア ブレインストーミング
              </h1>
              <p className="text-gray-600">
                AIと一緒にあなたの興味・スキルに合った事業アイデアを探しましょう
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 mb-2 block">
                  あなたの興味・関心・スキルを教えてください
                </span>
                <textarea
                  value={userInterests}
                  onChange={(e) => setUserInterests(e.target.value)}
                  placeholder="例：プログラミングが得意、教育に興味がある、環境問題を解決したい、飲食業の経験がある..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none h-32"
                />
              </label>

              <button
                onClick={startBrainstorming}
                disabled={!userInterests.trim()}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                ブレインストーミングを開始
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" />
            ホームに戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">
            事業アイデア ブレインストーミング
          </h1>
          <div className="w-24"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Section */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-lg flex flex-col h-[calc(100vh-120px)]">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-800">AIアドバイザーとのチャット</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div key={index}>
                  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                    {message.role === 'user' ? (
                      <div className="max-w-[80%] p-3 rounded-lg bg-blue-500 text-white">
                        {message.content}
                      </div>
                    ) : (
                      <div className="max-w-[90%]">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Idea Cards */}
                  {message.ideas && message.ideas.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      {message.ideas.map((idea) => (
                        <div
                          key={idea.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedIdea?.id === idea.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                          }`}
                          onClick={() => setSelectedIdea(idea)}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-purple-500 mt-0.5" />
                            <h3 className="font-semibold text-sm text-gray-800">
                              {idea.title}
                            </h3>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            {idea.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              {idea.category}
                            </span>
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                              {idea.targetMarket}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>考え中...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="アイデアについて質問してください..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !currentMessage.trim()}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Selected Idea Panel */}
          <div className="bg-white rounded-xl shadow-lg p-6 h-fit">
            <h2 className="font-semibold text-gray-800 mb-4">選択中のアイデア</h2>
            
            {selectedIdea ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-800 mb-2">
                    {selectedIdea.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {selectedIdea.description}
                  </p>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">カテゴリ:</span>
                      <span className="ml-2 text-gray-600">{selectedIdea.category}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">ターゲット:</span>
                      <span className="ml-2 text-gray-600">{selectedIdea.targetMarket}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">価値提案:</span>
                      <p className="mt-1 text-gray-600">{selectedIdea.uniqueValue}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => moveToCanvas(selectedIdea)}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-medium rounded-lg hover:from-green-600 hover:to-blue-600 transition-all flex items-center justify-center gap-2"
                >
                  <span>リーンキャンバスを作成</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">
                  アイデアをクリックして選択してください
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}