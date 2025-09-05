/**
 * ID生成ユーティリティ
 * URLセーフなランダムIDを生成
 */

/**
 * ランダムな文字列を生成
 * @param length 文字列の長さ（デフォルト: 8）
 * @returns ランダムな文字列
 */
export function generateRandomId(length: number = 8): string {
  // URLセーフな文字セット（英小文字と数字）
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * セッションIDを生成
 * @returns セッションID
 */
export function generateSessionId(): string {
  return generateRandomId();
}

/**
 * ページIDを生成
 * @returns ページID
 */
export function generatePageId(): string {
  return generateRandomId();
}

/**
 * 名前がURLセーフかチェック
 * @param name チェックする名前
 * @returns URLセーフな場合true
 */
export function isUrlSafeName(name: string): boolean {
  // 英数字とハイフンのみ許可（先頭と末尾のハイフンは禁止）
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name);
}

/**
 * 名前をURLセーフに変換
 * @param name 変換する名前
 * @returns URLセーフな名前
 */
export function toUrlSafeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}