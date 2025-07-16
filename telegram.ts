import crypto from 'crypto';

export class TelegramWebApp {
  private botToken: string;

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  /**
   * Verify Telegram Web App data
   * @param initData - Raw init data from Telegram Web App
   * @returns Parsed and verified user data
   */
  verifyWebAppData(initData: string): any {
    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      
      if (!hash) {
        throw new Error('Hash not found in init data');
      }

      // Remove hash from params for verification
      urlParams.delete('hash');
      
      // Sort parameters and create data check string
      const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      // Create secret key from bot token
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(this.botToken)
        .digest();

      // Create signature
      const signature = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      // Verify signature
      if (signature !== hash) {
        throw new Error('Invalid signature');
      }

      // Parse user data
      const userData = urlParams.get('user');
      if (!userData) {
        throw new Error('User data not found');
      }

      const user = JSON.parse(decodeURIComponent(userData));
      
      // Check auth date (should be within 24 hours)
      const authDate = parseInt(urlParams.get('auth_date') || '0');
      const currentTime = Math.floor(Date.now() / 1000);
      const maxAge = 24 * 60 * 60; // 24 hours

      if (currentTime - authDate > maxAge) {
        throw new Error('Auth data is too old');
      }

      return {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          language_code: user.language_code,
          is_premium: user.is_premium || false,
        },
        auth_date: authDate,
        query_id: urlParams.get('query_id'),
        start_param: urlParams.get('start_param'),
        verified: true,
      };
    } catch (error) {
      console.error('Telegram Web App verification error:', error);
      return { verified: false, error: error.message };
    }
  }

  /**
   * Generate start parameter for referral system
   * @param userId - User ID for referral
   * @returns Encoded start parameter
   */
  generateStartParameter(userId: number): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const data = `${userId}_${timestamp}`;
    return Buffer.from(data).toString('base64').replace(/[+/=]/g, '');
  }

  /**
   * Parse start parameter
   * @param startParam - Start parameter from Telegram
   * @returns Parsed referral data
   */
  parseStartParameter(startParam: string): { userId: number; timestamp: number } | null {
    try {
      const decoded = Buffer.from(startParam, 'base64').toString();
      const [userId, timestamp] = decoded.split('_');
      
      return {
        userId: parseInt(userId),
        timestamp: parseInt(timestamp),
      };
    } catch (error) {
      console.error('Error parsing start parameter:', error);
      return null;
    }
  }

  /**
   * Format user display name
   * @param user - User object
   * @returns Formatted display name
   */
  formatUserDisplayName(user: any): string {
    if (user.username) {
      return `@${user.username}`;
    }
    
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    
    return `${firstName} ${lastName}`.trim() || `User ${user.id}`;
  }

  /**
   * Get user language preference
   * @param user - User object
   * @returns Language code (uz, en, ru)
   */
  getUserLanguage(user: any): string {
    const langCode = user.language_code?.toLowerCase() || 'en';
    
    // Map common language codes to supported languages
    const languageMap: { [key: string]: string } = {
      'uz': 'uz',
      'uz-latn': 'uz',
      'uz-cyrl': 'uz',
      'ru': 'ru',
      'ru-ru': 'ru',
      'en': 'en',
      'en-us': 'en',
      'en-gb': 'en',
    };

    return languageMap[langCode] || 'en';
  }
}

export const telegramWebApp = new TelegramWebApp(process.env.TELEGRAM_BOT_TOKEN || '');