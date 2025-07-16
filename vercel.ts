// Vercel-specific server entry point
import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { storage } from './storage';
import { DubaiCityBot } from './bot';

const app = express();

// CORS configuration for Vercel
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://dubaicity-lilac.vercel.app', 'https://t.me', 'https://web.telegram.org']
    : ['http://localhost:3000', 'http://localhost:5000', 'https://t.me'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    telegram_token_configured: !!process.env.TELEGRAM_BOT_TOKEN
  });
});

// Initialize bot if token is available
let bot: DubaiCityBot | null = null;
if (process.env.TELEGRAM_BOT_TOKEN) {
  try {
    const webAppUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : 'https://dubaicity-lilac.vercel.app';
    bot = new DubaiCityBot(process.env.TELEGRAM_BOT_TOKEN, webAppUrl);
    console.log('Dubai City Bot initialized for Vercel');
  } catch (error) {
    console.error('Failed to initialize bot:', error);
  }
}

// All API routes for the game
app.get('/api/users', async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const user = await storage.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await storage.updateUser(parseInt(req.params.id), req.body);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Telegram Web App authentication
app.post('/api/telegram/auth', async (req, res) => {
  try {
    const { initData } = req.body;
    
    if (!initData) {
      return res.status(400).json({ error: 'Init data required' });
    }

    // In production, verify the initData with Telegram
    // For now, just parse the user data
    const urlParams = new URLSearchParams(initData);
    const userParam = urlParams.get('user');
    
    if (!userParam) {
      return res.status(400).json({ error: 'User data not found' });
    }

    const userData = JSON.parse(userParam);
    
    // Check if user exists, if not create them
    let user = await storage.getUserByTelegramId(userData.id.toString());
    
    if (!user) {
      user = await storage.createUser({
        telegramId: userData.id.toString(),
        username: userData.username || userData.first_name,
        firstName: userData.first_name,
        lastName: userData.last_name || '',
        dubaiCoin: 1000,
        tapProfit: 1,
        hourlyIncome: 0,
        level: 1,
        energy: 5000,
        maxEnergy: 5000,
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase()
      });
    }

    res.json({ user, success: true });
  } catch (error) {
    console.error('Telegram auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// TON Payment endpoint
app.post('/api/telegram/payment/create', async (req, res) => {
  try {
    const { userId, amount, description, paymentType } = req.body;
    
    if (!userId || !amount || !paymentType) {
      return res.status(400).json({ error: 'Missing required payment data' });
    }

    // TON payment URL for Telegram
    const tonWalletAddress = process.env.TON_WALLET_ADDRESS || 'UQCyQs9OCWvwYqwfcWE5rDkH0T9B4iJyp52_6Bv64_uNyVg6';
    const paymentUrl = `https://app.tonkeeper.com/transfer/${tonWalletAddress}?amount=${amount * 1000000000}&text=${encodeURIComponent(description)}`;
    
    res.json({ 
      paymentUrl,
      success: true,
      message: 'TON payment URL created successfully'
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Bulk notification endpoint
app.post('/api/telegram/notification/bulk', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!bot) {
      return res.status(503).json({ error: 'Bot not initialized' });
    }

    const users = await storage.getAllUsers();
    const telegramIds = users
      .filter(user => user.telegramId)
      .map(user => user.telegramId as string);

    if (telegramIds.length === 0) {
      return res.status(400).json({ error: 'No users with Telegram IDs found' });
    }

    await bot.sendBulkNotification(telegramIds, message);
    
    res.json({ 
      success: true, 
      sentTo: telegramIds.length,
      message: 'Bulk notification sent successfully'
    });
  } catch (error) {
    console.error('Bulk notification error:', error);
    res.status(500).json({ error: 'Failed to send bulk notification' });
  }
});

// Game-specific endpoints
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await storage.getAllTasks();
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.get('/api/skins', async (req, res) => {
  try {
    const skins = await storage.getAllSkins();
    res.json(skins);
  } catch (error) {
    console.error('Error fetching skins:', error);
    res.status(500).json({ error: 'Failed to fetch skins' });
  }
});

app.get('/api/businesses', async (req, res) => {
  try {
    const businesses = await storage.getAllBusinesses();
    res.json(businesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};