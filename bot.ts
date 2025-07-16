import TelegramBot from 'node-telegram-bot-api';
import { storage } from './storage';
import { telegramWebApp } from './telegram';

class DubaiCityBot {
  private bot: TelegramBot;
  private webAppUrl: string;

  constructor(token: string, webAppUrl: string) {
    this.bot = new TelegramBot(token, { polling: true });
    this.webAppUrl = webAppUrl;
    this.setupCommands();
  }

  private setupCommands() {
    // Handle pre-checkout query (required for payments)
    this.bot.on('pre_checkout_query', async (query) => {
      try {
        // Always approve pre-checkout queries
        await this.bot.answerPreCheckoutQuery(query.id, true);
      } catch (error) {
        console.error('Pre-checkout query error:', error);
        await this.bot.answerPreCheckoutQuery(query.id, false, 'Payment failed');
      }
    });

    // Handle successful payment
    this.bot.on('successful_payment', async (msg) => {
      try {
        const chatId = msg.chat.id;
        const telegramId = msg.from?.id.toString();
        const payment = msg.successful_payment;

        if (!telegramId || !payment) return;

        // Get user
        const user = await storage.getUserByTelegramId(telegramId);
        if (!user) return;

        // Process payment based on payload
        const payload = payment.invoice_payload;
        let updateData = {};
        let successMessage = '';

        if (payload.includes('premium')) {
          updateData = { premiumStatus: true, premiumUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) };
          successMessage = '🎉 Premium status faollashtirildi! Sizga +50% daromad bonusi berildi!';
        } else if (payload.includes('activation')) {
          updateData = { isActive: true };
          successMessage = '✅ Bot to\'liq faollashtirildi! Barcha imkoniyatlar ochildi!';
        } else if (payload.includes('coins')) {
          const coinAmount = 1000000; // 1M coins for $1
          updateData = { dubaiCoin: (user.dubaiCoin || 0) + coinAmount };
          successMessage = `💰 ${coinAmount.toLocaleString()} coin hisobingizga qo'shildi!`;
        }

        // Update user
        await storage.updateUser(user.id, updateData);

        // Send success message
        await this.bot.sendMessage(chatId, successMessage);

      } catch (error) {
        console.error('Payment processing error:', error);
      }
    });

    // Start command
    this.bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();
      const username = msg.from?.username;
      const firstName = msg.from?.first_name || '';
      const lastName = msg.from?.last_name || '';
      const referralCode = match?.[1]; // Extract referral code from /start command

      if (!telegramId) {
        return;
      }

      try {
        // Get or create user
        let user = await storage.getUserByTelegramId(telegramId);
        let isNewUser = false;

        if (!user) {
          // Generate unique referral code for new user
          const userReferralCode = `DC${telegramId.slice(-6)}`;

          // Create new user
          const newUser = {
            telegramId,
            username: username || `user_${telegramId}`,
            firstName,
            lastName,
            language: 'uz',
            isActive: true,
            dubaiCoin: 1000, // Starting bonus
            level: 1,
            profileImage: null,
            referralCode: userReferralCode,
            referredBy: referralCode ? parseInt(referralCode) : null,
            premiumStatus: false,
          };

          user = await storage.createUser(newUser);
          isNewUser = true;

          // If user came from referral, give bonus to both users
              if (referralCode) {
                try {
                  const referrerId = parseInt(referralCode);
                  const referrer = await storage.getUser(referrerId);
                  if (referrer) {
                    // Give referral bonus to referrer (10000 coins)
                    await storage.updateUser(referrer.id, {
                      dubaiCoin: (referrer.dubaiCoin || 0) + 10000
                    });

                    // Give welcome bonus to new user (5000 extra coins)
                    await storage.updateUser(user.id, {
                      dubaiCoin: (user.dubaiCoin || 1000) + 5000
                    });

                // Notify referrer
                try {
                  await this.bot.sendMessage(referrer.telegramId!, 
                    `🎉 Sizning taklifingiz orqali yangi foydalanuvchi qo'shildi!\n` +
                    `💰 +10000 coin bonus olindingiz!\n` +
                    `👤 Yangi foydalanuvchi: ${firstName}\n` +
                    `🔗 Umumiy takliflar soni oshdi!`
                  );
                } catch (notifyError) {
                  console.error('Error notifying referrer:', notifyError);
                }
              }
            } catch (parseError) {
              console.error('Error parsing referral code:', parseError);
            }
          }
        }

        // Welcome message
        const welcomeMessage = isNewUser
          ? `🎉 Xush kelibsiz Dubai City Bot ga, ${firstName}!\n\n` +
            `🏙️ Sizning Dubai imperiyangizni qurishni boshlang!\n\n` +
            `💰 Boshlang'ich coinlar: ${(user.dubaiCoin || 0).toLocaleString()}\n` +
            `🏆 Sizning darajangiz: ${user.level}\n` +
            `🎁 Sizning taklif kodingiz: ${user.referralCode}\n` +
            `📊 Kanal: https://t.me/DubaiCity_live\n\n` +
            `O'yinni boshlash uchun quyidagi tugmani bosing:`
          : `🎮 Yana xush kelibsiz, ${firstName}!\n\n` +
            `💰 Coinlaringiz: ${(user.dubaiCoin || 0).toLocaleString()}\n` +
            `🏆 Darajangiz: ${user.level}\n` +
            `📊 Kanal: https://t.me/DubaiCity_live\n\n` +
            `O'yinni davom ettirish uchun quyidagi tugmani bosing:`;

        await this.bot.sendMessage(chatId, welcomeMessage, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🎮 O\'yinni boshlash',
                  web_app: {
                    url: this.webAppUrl
                  }
                }
              ],
              [
                {
                  text: '📊 Profil',
                  callback_data: 'profile'
                },
                {
                  text: '🎁 Taklif qilish',
                  callback_data: 'referral'
                }
              ]
            ]
          }
        });

      } catch (error) {
        console.error('Error in start command:', error);
        await this.bot.sendMessage(chatId, '❌ Xatolik yuz berdi. Qayta urinib ko\'ring.');
      }
    });

    // Profile command
    this.bot.onText(/\/profile/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramId = msg.from?.id.toString();

      if (!telegramId) {
        return;
      }

      try {
        const user = await storage.getUserByTelegramId(telegramId);

        if (!user) {
          await this.bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi. /start buyrug\'ini bosing.');
          return;
        }

        // Count referrals for this user
        const allUsers = await storage.getAllUsers();
        const referralCount = allUsers.filter(u => u.referredBy === user.id).length;

        const profileMessage = 
          `👤 Sizning profilingiz:\n\n` +
          `📛 Ism: ${user.firstName} ${user.lastName || ''}\n` +
          `👤 Username: @${user.username}\n` +
          `💰 Coinlar: ${(user.dubaiCoin || 0).toLocaleString()}\n` +
          `🏆 Daraja: ${user.level}\n` +
          `👥 Takliflar soni: ${referralCount}\n` +
          `📊 Holat: ${user.isActive ? 'Faol' : 'Nofaol'}\n` +
          `🎁 Taklif kodi: ${user.referralCode || 'Yaratilmoqda...'}\n` +
          `🌟 Premium: ${user.premiumStatus ? 'Ha ✅' : 'Yo\'q ❌'}\n` +
          `📊 Kanal: https://t.me/DubaiCity_live`;

        await this.bot.sendMessage(chatId, profileMessage, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🎮 O\'yinni ochish',
                  web_app: {
                    url: this.webAppUrl
                  }
                }
              ],
              [
                {
                  text: '🎁 Do\'st taklif qilish',
                  callback_data: 'referral'
                }
              ]
            ]
          }
        });

      } catch (error) {
        console.error('Error in profile command:', error);
        await this.bot.sendMessage(chatId, '❌ Profil ma\'lumotlarini olishda xatolik.');
      }
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;

      const helpMessage = 
        `🆘 Dubai City Bot Yordam:\n\n` +
        `🎮 /start - O'yinni boshlash\n` +
        `👤 /profile - Profilingizni ko'rish\n` +
        `🆘 /help - Yordam\n\n` +
        `🏙️ Dubai City Bot - bu Dubai shahrida o'zingizning imperiyangizni qurishga yo'naltirilgan o'yin!\n\n` +
        `💰 Coinlar to'plang\n` +
        `🏆 Darajangizni oshiring\n` +
        `🏢 Bizneslar sotib oling\n` +
        `👥 Do'stlaringizni taklif qiling\n` +
        `🎁 Topshiriqlarni bajaring`;

      await this.bot.sendMessage(chatId, helpMessage);
    });

    // Callback query handler
    this.bot.on('callback_query', async (query) => {
      const chatId = query.message?.chat.id;
      const telegramId = query.from.id.toString();
      const data = query.data;

      if (!chatId) {
        return;
      }

      try {
        if (data?.startsWith('copy_referral_')) {
          await this.bot.answerCallbackQuery(query.id, {
            text: '✅ Havola nusxalandi!',
            show_alert: true
          });
          return;
        }

        switch (data) {
          case 'profile':
            const user = await storage.getUserByTelegramId(telegramId);
            if (user) {
              const allUsers = await storage.getAllUsers();
              const referralCount = allUsers.filter(u => u.referredBy === user.id).length;

              const profileMessage = 
                `👤 Profil ma'lumotlari:\n\n` +
                `💰 Coinlar: ${(user.dubaiCoin || 0).toLocaleString()}\n` +
                `🏆 Daraja: ${user.level}\n` +
                `👥 Takliflar: ${referralCount}\n` +
                `🎁 Taklif kodi: ${user.referralCode || 'Yaratilmoqda...'}\n` +
                `🌟 Premium: ${user.premiumStatus ? 'Ha ✅' : 'Yo\'q ❌'}`;

              await this.bot.editMessageText(profileMessage, {
                chat_id: chatId,
                message_id: query.message?.message_id,
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: '🎮 O\'yinni ochish',
                        web_app: {
                          url: this.webAppUrl
                        }
                      }
                    ],
                    [
                      {
                        text: '🎁 Do\'st taklif qilish',
                        callback_data: 'referral'
                      }
                    ]
                  ]
                }
              });
            }
            break;

          case 'referral':
            const referralUser = await storage.getUserByTelegramId(telegramId);
            if (referralUser) {
              const allUsers = await storage.getAllUsers();
              const referralCount = allUsers.filter(u => u.referredBy === referralUser.id).length;
              const totalEarned = referralCount * 5000; // 5000 coins per referral

              const referralMessage = 
                `🎁 Do'stlaringizni taklif qiling!\n\n` +
                `💎 Har bir do'st uchun: 5000 coin\n` +
                `👥 Taklif qilganlar: ${referralCount}\n` +
                `💰 Jami ishlab topganingiz: ${totalEarned.toLocaleString()} coin\n\n` +
                `🔗 Sizning taklif havolangiz:\n` +
                `https://t.me/DubaiCITY_robot?start=${referralUser.id}\n\n` +
                `📊 Bizning kanal: https://t.me/DubaiCity_live`;

              await this.bot.editMessageText(referralMessage, {
                chat_id: chatId,
                message_id: query.message?.message_id,
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: '📤 Havola yuborish',
                        switch_inline_query: `🎮 Dubai City Bot ga qo'shiling va birgalikda boylik to'playmiz! 💰\n\nhttps://t.me/DubaiCITY_robot?start=${referralUser.id}`
                      }
                    ],
                    [
                      {
                        text: '📋 Havola nusxalash',
                        callback_data: `copy_referral_${referralUser.id}`
                      }
                    ]
                  ]
                }
              });
            }
            break;
        }

        await this.bot.answerCallbackQuery(query.id);
      } catch (error) {
        console.error('Error in callback query:', error);
        await this.bot.answerCallbackQuery(query.id, {
          text: '❌ Xatolik yuz berdi',
          show_alert: true
        });
      }
    });

    // Error handling
    this.bot.on('error', (error) => {
      console.error('Telegram bot error:', error);
    });

    // Polling error
    this.bot.on('polling_error', (error) => {
      console.error('Telegram bot polling error:', error);
    });
  }

  public async sendNotification(telegramId: string, message: string) {
    try {
      await this.bot.sendMessage(telegramId, message);
      return true;
    } catch (error) {
      console.error(`Error sending notification to ${telegramId}:`, error);
      return false;
    }
  }

  public async sendBulkNotification(telegramIds: string[], message: string) {
    const results = [];

    for (const telegramId of telegramIds) {
      const success = await this.sendNotification(telegramId, message);
      results.push({ telegramId, success });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }
}

// Initialize bot if token is available
let dubaiCityBot: DubaiCityBot | null = null;

if (process.env.TELEGRAM_BOT_TOKEN) {
  // Use the current Replit URL for Web App
  const webAppUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'https://workspace.didore2664.repl.co';

  dubaiCityBot = new DubaiCityBot(process.env.TELEGRAM_BOT_TOKEN, webAppUrl);
  console.log('Dubai City Bot initialized successfully');
  console.log('Web App URL:', webAppUrl);
} else {
  console.warn('TELEGRAM_BOT_TOKEN not found, bot will not be initialized');
}

export { dubaiCityBot };