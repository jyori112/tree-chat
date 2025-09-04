'use client';

import Link from 'next/link';
import { FileText, Target, Home } from 'lucide-react';

export default function TestTemplatesPage() {
  // テスト用の固定セッションID・ページID
  const testSessionId = 'test-session-001';
  const testPages = {
    leanCanvas: 'page-lean-001',
    swot: 'page-swot-001',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 mb-8 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <Home className="w-4 h-4" />
          ホームに戻る
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">思考テンプレート一覧</h1>
        <p className="text-gray-600 mb-8">ビジネス開発のための各種フレームワーク</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* リーンキャンバス */}
          <Link
            href={`/sessions/${testSessionId}/pages/${testPages.leanCanvas}/lean-canvas`}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 border border-gray-200"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">リーンキャンバス</h2>
                <p className="text-gray-600 text-sm mb-3">
                  ビジネスモデルを1枚のキャンバスで可視化。課題、解決策、価値提案などを整理します。
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">9つの要素</span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">スタートアップ向け</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">AIサジェスト対応</span>
                </div>
              </div>
            </div>
          </Link>

          {/* SWOT分析 */}
          <Link
            href={`/sessions/${testSessionId}/pages/${testPages.swot}/swot-analysis`}
            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 border border-gray-200"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">SWOT分析</h2>
                <p className="text-gray-600 text-sm mb-3">
                  強み・弱み・機会・脅威の4象限で戦略を分析。内部環境と外部環境を整理します。
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">4つの象限</span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">戦略立案</span>
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">NEW</span>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">💡 開発メモ</h3>
          <p className="text-blue-800 text-sm mb-3">
            新しいテンプレートの作成時間を測定中です。
          </p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• リーンキャンバス: 既存実装（ベースライン）</li>
            <li>• SWOT分析: 新規実装（作成時間を測定）</li>
            <li>• 共通コンポーネントの再利用度を評価</li>
          </ul>
        </div>
      </div>
    </div>
  );
}