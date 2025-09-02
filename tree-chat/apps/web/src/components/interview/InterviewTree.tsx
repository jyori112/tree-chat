import React, { useState, useRef, useEffect, useCallback } from "react";
import { InterviewCard } from "./InterviewCard";
import { UnansweredQuestionsSidebar } from "./UnansweredQuestionsSidebar";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, ChevronRight, ChevronDown } from "lucide-react";
import { useInterviewTree, InterviewQuestion } from "@/lib/interview-tree";

// リーンキャンバスフレームワークに基づく事業開発インタビューのモックデータ
const mockQuestions: InterviewQuestion = {
  id: "1",
  question: "あなたのビジネスアイデアはどの段階にありますか？",
  type: "choice",
  choices: ["アイデア段階", "課題を特定済み", "ソリューション開発中", "顧客テスト中", "スケール準備完了"],
  answer: "",
  isAnswered: false,
  priority: "high",
  allowOther: true,
  children: [
    {
      id: "2",
      question: "どのような課題を解決しようとしていますか？",
      type: "textarea",
      answer: "",
      isAnswered: false,
      priority: "high",
      suggestedAnswers: [
        "効率性の問題を解決したい",
        "コストを削減する必要がある", 
        "顧客体験を改善したい",
        "新しい収益源を作りたい"
      ],
      children: [
        {
          id: "3",
          question: "ターゲット顧客にとってこの課題はどの程度深刻ですか？",
          type: "choice",
          choices: ["軽微な不便", "中程度の問題", "大きなペインポイント", "クリティカルなビジネス課題"],
          answer: "",
          isAnswered: false,
          priority: "medium",
          allowOther: true,
          metadata: {
            level: 2,
            parentId: "2",
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'initial',
            businessImportance: 8,
            urgency: 7
          }
        },
        {
          id: "4", 
          question: "現在人々はこの課題をどのように解決していますか？",
          type: "textarea",
          answer: "",
          isAnswered: false,
          priority: "medium",
          suggestedAnswers: [
            "手動で対応している",
            "既存のツールを使用している",
            "外部の専門家に依頼している",
            "まだ解決できていない"
          ],
          metadata: {
            level: 2,
            parentId: "2",
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'initial',
            businessImportance: 7,
            urgency: 6
          }
        }
      ],
      metadata: {
        level: 1,
        parentId: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'initial',
        businessImportance: 9,
        urgency: 9
      }
    },
    {
      id: "5",
      question: "ターゲット顧客は誰ですか？",
      type: "choice",
      choices: ["個人消費者", "中小企業", "大企業", "政府・NGO", "複数セグメント"],
      answer: "",
      isAnswered: false,
      priority: "high",
      allowOther: true,
      children: [
        {
          id: "6",
          question: "アーリーアダプターの主な特徴は何ですか？",
          type: "textarea",
          answer: "",
          isAnswered: false,
          priority: "low",
          suggestedAnswers: [
            "新しい技術に興味がある",
            "現状に不満を持っている",
            "予算とリソースがある",
            "意思決定権を持っている"
          ],
          metadata: {
            level: 2,
            parentId: "5",
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'initial'
          }
        }
      ],
      metadata: {
        level: 1,
        parentId: "1",
        createdAt: new Date(),
        updatedAt: new Date(),
        source: 'initial'
      }
    }
  ],
  metadata: {
    level: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    source: 'initial'
  }
};

interface TreeNodeProps {
  question: InterviewQuestion;
  onAnswer: (questionId: string, answer: string) => void;
  level: number;
  collapsedNodes: Set<string>;
  onToggleCollapse: (nodeId: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
  question, 
  onAnswer, 
  level,
  collapsedNodes,
  onToggleCollapse
}) => {
  const isCollapsed = collapsedNodes.has(question.id);
  const hasChildren = question.children && question.children.length > 0;

  const handleToggleCollapse = () => {
    if (hasChildren) {
      onToggleCollapse(question.id);
    }
  };
  
  return (
    <div className="relative">
      <div className="flex items-start gap-6">
        {/* Left side: Current question with toggle button */}
        <div className="flex flex-col items-start gap-2 relative">
          <div className="flex items-center gap-2">
            <InterviewCard
              question={question}
              onAnswer={onAnswer}
              level={level}
            />
            
            {/* Collapse/Expand toggle button */}
            {hasChildren && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleCollapse}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Right side: Children container - only show if not collapsed and question is answered */}
        {!isCollapsed && question.isAnswered && hasChildren && (
          <div className="relative pl-8">
            {/* Connection lines using borders and pseudo-elements */}
            <div className="relative">
              {/* Parent to first child connection */}
              <div className="absolute left-0 top-6 w-6 border-t-2 border-gray-400"></div>
              
              {/* Tree structure for multiple children */}
              {question.children!.length > 1 && (
                <div 
                  className="absolute left-6 border-l-2 border-gray-400"
                  style={{ 
                    top: '24px',
                    height: `${question.children!.length * 64}px`
                  }}
                ></div>
              )}
            </div>
            
            {/* Children with individual connection lines */}
            <div className="space-y-4">
              {question.children!.map((child, index) => (
                <div key={child.id} className="relative">
                  {/* Individual branch line for each child */}
                  {question.children!.length > 1 && (
                    <div className="absolute -left-2 top-6 w-2 border-t-2 border-gray-400"></div>
                  )}
                  
                  <TreeNode
                    question={child}
                    onAnswer={onAnswer}
                    level={level + 1}
                    collapsedNodes={collapsedNodes}
                    onToggleCollapse={onToggleCollapse}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const InterviewTree: React.FC = () => {
  const { state, answerQuestion } = useInterviewTree({ 
    rootQuestion: mockQuestions 
  });
  
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Pan and zoom state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartPan, setDragStartPan] = useState({ x: 0, y: 0 });

  const handleAnswer = async (questionId: string, answer: string) => {
    try {
      await answerQuestion(questionId, answer);
    } catch (error) {
      console.error('Failed to process answer:', error);
      // UI でエラーを表示することも可能
    }
  };

  const handleToggleCollapse = (nodeId: string) => {
    setCollapsedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Zoom functions (center on viewport center)
  const handleZoomIn = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setScale(prev => Math.min(prev * 1.2, 3));
      return;
    }

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newScale = Math.min(scale * 1.2, 3);
    if (newScale === scale) return;
    
    const pointX = (centerX - pan.x) / scale;
    const pointY = (centerY - pan.y) / scale;
    
    const newPan = {
      x: centerX - pointX * newScale,
      y: centerY - pointY * newScale
    };
    
    setScale(newScale);
    setPan(newPan);
  }, [scale, pan]);

  const handleZoomOut = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setScale(prev => Math.max(prev / 1.2, 0.3));
      return;
    }

    const rect = container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const newScale = Math.max(scale / 1.2, 0.3);
    if (newScale === scale) return;
    
    const pointX = (centerX - pan.x) / scale;
    const pointY = (centerY - pan.y) / scale;
    
    const newPan = {
      x: centerX - pointX * newScale,
      y: centerY - pointY * newScale
    };
    
    setScale(newScale);
    setPan(newPan);
  }, [scale, pan]);

  const handleReset = useCallback(() => {
    setScale(1);
    setPan({ x: 100, y: 100 });
  }, []);

  // Mouse wheel zoom with mouse position as center
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, scale * delta));
    
    if (newScale === scale) return; // No change in scale
    
    // Calculate the point in the content that's under the mouse
    const pointX = (mouseX - pan.x) / scale;
    const pointY = (mouseY - pan.y) / scale;
    
    // Calculate new pan to keep the point under the mouse
    const newPan = {
      x: mouseX - pointX * newScale,
      y: mouseY - pointY * newScale
    };
    
    setScale(newScale);
    setPan(newPan);
  }, [scale, pan]);

  // Pan functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as Element).closest('.interview-card')) { // Left click only, not on cards
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragStartPan(pan);
      e.preventDefault();
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setPan({
        x: dragStartPan.x + deltaX,
        y: dragStartPan.y + deltaY,
      });
    }
  }, [isDragging, dragStart, dragStartPan]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            handleZoomIn();
            break;
          case '-':
            e.preventDefault();
            handleZoomOut();
            break;
          case '0':
            e.preventDefault();
            handleReset();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleReset]);

  const handleQuestionFocus = useCallback((questionId: string) => {
    // First, expand all parent nodes of the target question
    const expandParentsOfQuestion = (q: InterviewQuestion, targetId: string, path: string[] = []): string[] | null => {
      if (q.id === targetId) {
        return path;
      }
      if (q.children) {
        for (const child of q.children) {
          const result = expandParentsOfQuestion(child, targetId, [...path, q.id]);
          if (result) {
            return result;
          }
        }
      }
      return null;
    };

    const pathToQuestion = expandParentsOfQuestion(state.rootQuestion, questionId);
    
    if (pathToQuestion) {
      // Remove all collapsed nodes that are in the path to the target question
      setCollapsedNodes(prev => {
        const newSet = new Set(prev);
        pathToQuestion.forEach(nodeId => newSet.delete(nodeId));
        return newSet;
      });

      // After state update, move pan to focus on the target element
      setTimeout(() => {
        const targetElement = document.querySelector(`[data-question-id="${questionId}"]`);
        const container = containerRef.current;
        
        if (targetElement && container) {
          const targetRect = targetElement.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          
          // Calculate the target element's position in the transformed coordinate system
          const targetCenterX = (targetRect.left + targetRect.width / 2 - containerRect.left - pan.x) / scale;
          const targetCenterY = (targetRect.top + targetRect.height / 2 - containerRect.top - pan.y) / scale;
          
          // Calculate where we want the target to be (center of viewport)
          const viewportCenterX = containerRect.width / 2;
          const viewportCenterY = containerRect.height / 2;
          
          // Calculate new pan to center the target
          const newPan = {
            x: viewportCenterX - targetCenterX * scale,
            y: viewportCenterY - targetCenterY * scale
          };
          
          setPan(newPan);
          
          // Add temporary highlight effect
          targetElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-75');
          setTimeout(() => {
            targetElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-75');
          }, 2000);
        }
      }, 100);
    }
  }, [state.rootQuestion, pan.x, pan.y, scale]);

  return (
    <div className="w-full h-full relative">
      {/* Main Interview Area */}
      <div className="w-full h-full relative pr-80">
        {/* Control Panel */}
        <div className="absolute top-4 right-84 z-50 flex gap-2 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg">
        <Button variant="outline" size="sm" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="flex items-center px-2 text-sm font-mono min-w-16 justify-center">
          {Math.round(scale * 100)}%
        </div>
        <Button variant="outline" size="sm" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        </div>

        {/* Main Canvas */}
        <div 
          ref={containerRef}
          className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden cursor-grab select-none"
          style={{ 
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div 
            ref={contentRef}
            className="relative w-full h-full"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <div className="p-8">
              <TreeNode
                question={state.rootQuestion}
                onAnswer={handleAnswer}
                level={0}
                collapsedNodes={collapsedNodes}
                onToggleCollapse={handleToggleCollapse}
              />
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="absolute bottom-4 left-4 z-50 bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg max-w-sm">
          <h3 className="font-semibold text-sm mb-2">Controls:</h3>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• <strong>Mouse wheel:</strong> Zoom in/out</li>
            <li>• <strong>Click + drag:</strong> Pan around</li>
            <li>• <strong>Ctrl/Cmd + +/-:</strong> Zoom</li>
            <li>• <strong>Ctrl/Cmd + 0:</strong> Reset view</li>
          </ul>
        </div>
      </div>

      {/* Sidebar - positioned outside transform area */}
      <div className="fixed right-0 top-0 bottom-0 z-40">
        <UnansweredQuestionsSidebar
          questions={state.rootQuestion}
          onAnswer={handleAnswer}
          onQuestionFocus={handleQuestionFocus}
        />
      </div>
    </div>
  );
};