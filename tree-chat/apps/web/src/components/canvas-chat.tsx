'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFileSystem } from '@/lib/data-store';
import { MessageCircle, Send, X, Lightbulb, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: CanvasSuggestion[];
}

interface CanvasSuggestion {
  sectionId: string;
  currentValue: string;
  suggestedValue: string;
  reasoning: string;
}

interface CanvasChatProps {
  sessionId: string;
  pageId: string;
  canvasData: Record<string, string>;
  businessName: string;
}

export function CanvasChat({ sessionId, pageId, canvasData, businessName }: CanvasChatProps) {
  const fs = useFileSystem();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const chatPath = `/sessions/${sessionId}/pages/${pageId}/chat`;
  const suggestionsPath = `/sessions/${sessionId}/pages/${pageId}/suggestions`;

  // チャット履歴の読み込み
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        // チャットディレクトリが存在するか確認
        const exists = await fs.exists(chatPath);
        if (!exists) {
          await fs.mkdir(chatPath);
          return;
        }

        // メッセージファイルを読み込み
        const files = await fs.ls(chatPath);
        const loadedMessages: ChatMessage[] = [];
        
        for (const file of files.sort()) {
          const message = await fs.read(`${chatPath}/${file}`);
          loadedMessages.push(JSON.parse(message));
        }
        
        setMessages(loadedMessages);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    };

    loadChatHistory();
  }, [fs, chatPath]);

  // スクロール制御
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // メッセージ送信
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    // メッセージをFileSystemに保存
    await fs.write(`${chatPath}/${userMessage.id}.json`, JSON.stringify(userMessage));
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // AI応答を取得
      const response = await fetch('/api/business-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          canvas: {
            businessName,
            ...canvasData
          },
          chatHistory: messages
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          suggestions: data.suggestions
        };

        // AI応答を保存
        await fs.write(`${chatPath}/${assistantMessage.id}.json`, JSON.stringify(assistantMessage));
        setMessages(prev => [...prev, assistantMessage]);

        // サジェストがあれば保存
        if (data.suggestions && data.suggestions.length > 0) {
          await fs.write(`${suggestionsPath}/latest.json`, JSON.stringify(data.suggestions));
        }
      }
    } catch (error) {
      console.error('Failed to get AI response:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // サジェスト適用
  const applySuggestion = async (suggestion: CanvasSuggestion, messageId: string) => {
    const fieldPath = `/sessions/${sessionId}/pages/${pageId}/fields/${suggestion.sectionId}`;
    await fs.write(fieldPath, suggestion.suggestedValue);
    
    const suggestionKey = `${messageId}-${suggestion.sectionId}`;
    setAppliedSuggestions(prev => new Set([...prev, suggestionKey]));
  };

  return (
    <>
      {/* Chat Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 right-6 z-50 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-colors"
        title="AIビジネス相談"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed right-0 top-0 h-full w-[400px] bg-white shadow-2xl z-40 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <h2 className="font-semibold">AIビジネス相談</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-lg p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`${
                  message.role === 'user' 
                    ? 'ml-auto bg-blue-50 text-right' 
                    : 'mr-auto bg-gray-50 text-left'
                } rounded-lg p-3 max-w-[85%]`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.suggestions.map((suggestion, idx) => {
                      const suggestionKey = `${message.id}-${suggestion.sectionId}`;
                      const isApplied = appliedSuggestions.has(suggestionKey);
                      
                      return (
                        <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                          <div className="flex items-start gap-2 mb-1">
                            <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5" />
                            <div className="flex-1 text-xs">
                              <span className="font-semibold">{suggestion.sectionId}:</span>
                              <p className="text-gray-700 mt-1">{suggestion.reasoning}</p>
                              <p className="text-gray-600 italic mt-1">→ {suggestion.suggestedValue}</p>
                            </div>
                          </div>
                          {!isApplied ? (
                            <button
                              onClick={() => applySuggestion(suggestion, message.id)}
                              className="mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 transition-colors flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              適用
                            </button>
                          ) : (
                            <div className="mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs rounded inline-flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              適用済み
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                <span className="text-sm">AIが考えています...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="メッセージを入力..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}