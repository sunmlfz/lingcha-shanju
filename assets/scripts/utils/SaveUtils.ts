/**
 * SaveUtils - 存档工具
 * 封装 localStorage 存取，提供数据版本管理和简单防篡改校验
 */

const SAVE_KEY      = 'lingcha_game_data';
const SETTINGS_KEY  = 'lingcha_settings';
const LAST_ONLINE_KEY = 'lingcha_last_online';
const CURRENT_VERSION = 1;

interface SaveFile {
  version: number;
  data: any;
  checksum: string;
  savedAt: number;
}

/**
 * 生成简单 checksum（非加密，仅防止意外损坏）
 */
function calcChecksum(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
}

export class SaveUtils {
  /**
   * 保存游戏数据
   */
  static save(data: any): void {
    try {
      const checksum = calcChecksum(data);
      const saveFile: SaveFile = {
        version: CURRENT_VERSION,
        data,
        checksum,
        savedAt: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveFile));
    } catch (e) {
      console.error('[SaveUtils] 保存失败:', e);
    }
  }

  /**
   * 读取游戏数据
   * @returns 游戏数据，或 null（读取失败/校验失败）
   */
  static load(): any | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;

      const saveFile: SaveFile = JSON.parse(raw);

      // 版本检查
      if (saveFile.version !== CURRENT_VERSION) {
        console.warn(`[SaveUtils] 存档版本不匹配: ${saveFile.version} vs ${CURRENT_VERSION}，尝试迁移`);
        return SaveUtils.migrate(saveFile);
      }

      // Checksum 验证
      const expectedChecksum = calcChecksum(saveFile.data);
      if (saveFile.checksum !== expectedChecksum) {
        console.warn('[SaveUtils] 存档 checksum 不匹配，可能已损坏，使用默认数据');
        return null;
      }

      return saveFile.data;
    } catch (e) {
      console.error('[SaveUtils] 读取失败:', e);
      return null;
    }
  }

  /**
   * 存档版本迁移（未来版本升级使用）
   */
  private static migrate(saveFile: SaveFile): any | null {
    // v1 -> v2 迁移示例（当前仅 v1，预留）
    if (saveFile.version === 1) {
      return saveFile.data;
    }
    console.warn('[SaveUtils] 不支持的存档版本，使用默认数据');
    return null;
  }

  /**
   * 清除存档（重置游戏）
   */
  static clear(): void {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(LAST_ONLINE_KEY);
  }

  /**
   * 存储单个 key-value（用于离线时间戳等）
   */
  static setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error(`[SaveUtils] setItem 失败 (${key}):`, e);
    }
  }

  /**
   * 读取单个 key
   */
  static getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error(`[SaveUtils] getItem 失败 (${key}):`, e);
      return null;
    }
  }

  /**
   * 导出存档为 JSON 字符串（调试/备份用）
   */
  static export(): string {
    return localStorage.getItem(SAVE_KEY) ?? '{}';
  }

  /**
   * 导入存档（调试/恢复用）
   * @param json JSON 字符串
   * @returns 是否成功
   */
  static import(json: string): boolean {
    try {
      JSON.parse(json); // 验证 JSON 格式
      localStorage.setItem(SAVE_KEY, json);
      return true;
    } catch (e) {
      console.error('[SaveUtils] 导入失败，格式无效:', e);
      return false;
    }
  }

  /**
   * 检查是否有存档
   */
  static hasSave(): boolean {
    return !!localStorage.getItem(SAVE_KEY);
  }

  /**
   * 获取存档元信息
   */
  static getSaveMeta(): { savedAt: number; version: number } | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const saveFile: SaveFile = JSON.parse(raw);
      return { savedAt: saveFile.savedAt, version: saveFile.version };
    } catch {
      return null;
    }
  }
}
