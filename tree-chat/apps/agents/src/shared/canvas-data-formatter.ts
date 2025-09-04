/**
 * Canvas Data Formatter
 * ビジネスキャンバスデータをYAML形式にフォーマットする共通ユーティリティ
 */

/**
 * オブジェクトをYAML風のテキスト形式に変換
 * @param data キーバリューペアのデータ
 * @param labels 各キーに対する日本語ラベル（オプション）
 * @param emptyValue 空値の表示文字列
 * @returns YAML形式のテキスト
 */
export function formatDataToYaml(
  data: Record<string, any>,
  labels?: Record<string, string>,
  emptyValue: string = '（未入力）'
): string {
  const lines: string[] = [];
  
  Object.entries(data).forEach(([key, value]) => {
    const label = labels?.[key] || key;
    
    // 値の処理
    let formattedValue: string;
    if (value === null || value === undefined || value === '') {
      formattedValue = emptyValue;
    } else if (typeof value === 'object') {
      // ネストされたオブジェクトの場合
      formattedValue = '\n' + formatDataToYaml(value, labels, emptyValue)
        .split('\n')
        .map(line => '  ' + line)
        .join('\n');
    } else {
      formattedValue = String(value).trim() || emptyValue;
    }
    
    lines.push(`${label}: ${formattedValue}`);
  });
  
  return lines.join('\n');
}

/**
 * リーンキャンバス用のラベル定義
 */
export const LEAN_CANVAS_LABELS: Record<string, string> = {
  problem: '課題',
  solution: '解決策',
  metrics: '主要指標',
  uvp: '価値提案',
  advantage: '優位性',
  channels: 'チャネル',
  segments: '顧客層',
  cost: 'コスト',
  revenue: '収益',
  channel: 'チャネル',  // 別名対応
  customer: '顧客層'     // 別名対応
};

/**
 * SWOT分析用のラベル定義
 */
export const SWOT_LABELS: Record<string, string> = {
  strengths: '強み (Strengths)',
  weaknesses: '弱み (Weaknesses)', 
  opportunities: '機会 (Opportunities)',
  threats: '脅威 (Threats)'
};

/**
 * リーンキャンバスデータをYAML形式にフォーマット
 */
export function formatLeanCanvasData(canvasData: Record<string, string>): string {
  return formatDataToYaml(canvasData, LEAN_CANVAS_LABELS);
}

/**
 * SWOT分析データをYAML形式にフォーマット
 */
export function formatSwotData(swotData: {
  strengths?: string;
  weaknesses?: string;
  opportunities?: string;
  threats?: string;
}): string {
  return formatDataToYaml(swotData, SWOT_LABELS);
}

/**
 * ビジネス情報全体をYAML形式にフォーマット
 * @param businessName 事業名
 * @param data キャンバスデータ
 * @param dataType データタイプ（'lean-canvas' | 'swot'）
 */
export function formatBusinessData(
  businessName: string,
  data: Record<string, any>,
  dataType: 'lean-canvas' | 'swot'
): string {
  const header = `事業名: ${businessName || '（未入力）'}`;
  
  let dataSection = '';
  if (dataType === 'lean-canvas') {
    dataSection = `\nリーンキャンバス:\n${formatLeanCanvasData(data)
      .split('\n')
      .map(line => '  ' + line)
      .join('\n')}`;
  } else if (dataType === 'swot') {
    dataSection = `\nSWOT分析:\n${formatSwotData(data)
      .split('\n')
      .map(line => '  ' + line)
      .join('\n')}`;
  }
  
  return header + dataSection;
}

