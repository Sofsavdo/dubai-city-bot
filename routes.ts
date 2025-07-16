import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { telegramWebApp } from "./telegram";
import { insertUserSchema, insertTaskSchema, insertSkinSchema, insertBusinessSchema, insertPromoCodeSchema, insertNotificationSchema, insertTeamSchema, insertProjectSchema } from "./shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // ================= ADMIN ROUTES =================
  
  // Admin Dashboard Statistics
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const userStats = await storage.getUserStats();
      const gameStats = await storage.getGameStats();
      
      res.json({
        success: true,
        data: {
          users: userStats,
          game: gameStats,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching stats" });
    }
  });

  // ================= TELEGRAM WEB APP ROUTES =================
  
  // Telegram Web App Payment Routes (TON kashalok)
  app.post("/api/telegram/payment/create", async (req, res) => {
    try {
      const { title, description, payload, amount } = req.body;
      
      // Validate required fields
      if (!title || !description || !payload || !amount) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required payment fields" 
        });
      }

      // TON kashalok uchun to'lov ma'lumotlari
      const tonPayment = {
        title,
        description,
        payload,
        amount: parseFloat(amount), // TON miqdori
        currency: "TON",
        recipient: process.env.TON_WALLET_ADDRESS || "UQCyQs9OCWvwYqwfcWE5rDkH0T9B4iJyp52_6Bv64_uNyVg6", // Sizning TON kashalok manzili
        comment: `DubaiCity: ${title}`,
        timestamp: Date.now()
      };

      // Telegram Web App TON to'lov URL yaratish
      const tonUrl = `ton://transfer/${tonPayment.recipient}?amount=${tonPayment.amount * 1000000000}&text=${encodeURIComponent(tonPayment.comment)}`;
      
      res.json({
        success: true,
        data: {
          tonPayment,
          tonUrl,
          webAppUrl: `https://wallet.ton.org/transfer/${tonPayment.recipient}?amount=${tonPayment.amount}&text=${encodeURIComponent(tonPayment.comment)}`
        }
      });
    } catch (error) {
      console.error("TON payment creation error:", error);
      res.status(500).json({ success: false, message: "TON payment creation failed" });
    }
  });

  // Handle payment confirmation
  app.post("/api/telegram/payment/confirm", async (req, res) => {
    try {
      const { telegramId, paymentType, amount, transactionId } = req.body;
      
      if (!telegramId || !paymentType) {
        return res.status(400).json({ 
          success: false, 
          message: "Missing required payment confirmation fields" 
        });
      }

      // Get user
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Process payment based on type
      let updatedUser = { ...user };
      
      switch (paymentType) {
        case 'PREMIUM_STATUS':
          updatedUser.isPremium = true;
          break;
        case 'BOT_ACTIVATION':
          updatedUser.isActive = true;
          break;
        case 'COINS_PURCHASE':
          updatedUser.coins = (updatedUser.coins || 0) + amount;
          break;
        default:
          return res.status(400).json({ 
            success: false, 
            message: "Invalid payment type" 
          });
      }

      // Update user in storage
      await storage.updateUser(user.id, updatedUser);

      res.json({
        success: true,
        data: {
          user: updatedUser,
          message: "Payment confirmed successfully"
        }
      });
    } catch (error) {
      console.error("Payment confirmation error:", error);
      res.status(500).json({ success: false, message: "Payment confirmation failed" });
    }
  });

  // Telegram Web App Authentication
  app.post("/api/telegram/auth", async (req, res) => {
    try {
      const { initData } = req.body;
      
      if (!initData) {
        return res.status(400).json({ success: false, message: "Init data is required" });
      }

      const verificationResult = telegramWebApp.verifyWebAppData(initData);
      
      if (!verificationResult.verified) {
        return res.status(401).json({ success: false, message: "Invalid Telegram data" });
      }

      // Get or create user
      const telegramUser = verificationResult.user;
      let user = await storage.getUserByTelegramId(telegramUser.id.toString());

      if (!user) {
        // Create new user
        const newUser = {
          telegramId: telegramUser.id.toString(),
          username: telegramUser.username || `user_${telegramUser.id}`,
          firstName: telegramUser.first_name || "",
          lastName: telegramUser.last_name || "",
          language: telegramWebApp.getUserLanguage(telegramUser),
          isActive: true,
          coins: 0,
          empireLevel: 1,
          profileImage: null,
          referralCode: null,
          referredBy: null,
          isPremium: telegramUser.is_premium || false,
        };

        user = await storage.createUser(newUser);
      }

      res.json({
        success: true,
        data: {
          user,
          telegram: {
            id: telegramUser.id,
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            isPremium: telegramUser.is_premium,
          },
        },
      });
    } catch (error) {
      console.error("Telegram auth error:", error);
      res.status(500).json({ success: false, message: "Authentication failed" });
    }
  });

  // Get Telegram Web App user info
  app.get("/api/telegram/user/:telegramId", async (req, res) => {
    try {
      const { telegramId } = req.params;
      const user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ success: false, message: "Error fetching user" });
    }
  });

  // ================= USER MANAGEMENT =================
  
  // Get all users (admin)
  app.get("/api/admin/users", async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      const users = await storage.getUsersWithPagination(offset, Number(limit));
      const totalUsers = await storage.getAllUsers();
      
      res.json({
        success: true,
        data: users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalUsers.length,
          totalPages: Math.ceil(totalUsers.length / Number(limit)),
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching users" });
    }
  });

  // Get user by ID
  app.get("/api/admin/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(Number(req.params.id));
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching user" });
    }
  });

  // Create user (admin)
  app.post("/api/admin/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({ success: false, message: "Invalid user data" });
    }
  });

  // Update user (admin)
  app.put("/api/admin/users/:id", async (req, res) => {
    try {
      const user = await storage.updateUser(Number(req.params.id), req.body);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error updating user" });
    }
  });

  // ================= TASK MANAGEMENT =================
  
  // Get all tasks (admin)
  app.get("/api/admin/tasks", async (req, res) => {
    try {
      const tasks = await storage.getAllTasks();
      res.json({ success: true, data: tasks });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching tasks" });
    }
  });

  // Create task (admin)
  app.post("/api/admin/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(validatedData);
      res.status(201).json({ success: true, data: task });
    } catch (error) {
      res.status(400).json({ success: false, message: "Invalid task data" });
    }
  });

  // Update task (admin)
  app.put("/api/admin/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateTask(Number(req.params.id), req.body);
      if (!task) {
        return res.status(404).json({ success: false, message: "Task not found" });
      }
      res.json({ success: true, data: task });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error updating task" });
    }
  });

  // Delete task (admin)
  app.delete("/api/admin/tasks/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTask(Number(req.params.id));
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Task not found" });
      }
      res.json({ success: true, message: "Task deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error deleting task" });
    }
  });

  // ================= SKIN MANAGEMENT =================
  
  // Get all skins (admin)
  app.get("/api/admin/skins", async (req, res) => {
    try {
      const skins = await storage.getAllSkins();
      res.json({ success: true, data: skins });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching skins" });
    }
  });

  // Create skin (admin)
  app.post("/api/admin/skins", async (req, res) => {
    try {
      const validatedData = insertSkinSchema.parse(req.body);
      const skin = await storage.createSkin(validatedData);
      res.status(201).json({ success: true, data: skin });
    } catch (error) {
      res.status(400).json({ success: false, message: "Invalid skin data" });
    }
  });

  // Update skin (admin)
  app.put("/api/admin/skins/:id", async (req, res) => {
    try {
      const skin = await storage.updateSkin(Number(req.params.id), req.body);
      if (!skin) {
        return res.status(404).json({ success: false, message: "Skin not found" });
      }
      res.json({ success: true, data: skin });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error updating skin" });
    }
  });

  // Delete skin (admin)
  app.delete("/api/admin/skins/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSkin(Number(req.params.id));
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Skin not found" });
      }
      res.json({ success: true, message: "Skin deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error deleting skin" });
    }
  });

  // ================= BUSINESS MANAGEMENT =================
  
  // Get all businesses (admin)
  app.get("/api/admin/businesses", async (req, res) => {
    try {
      const businesses = await storage.getAllBusinesses();
      res.json({ success: true, data: businesses });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching businesses" });
    }
  });

  // Create business (admin)
  app.post("/api/admin/businesses", async (req, res) => {
    try {
      const validatedData = insertBusinessSchema.parse(req.body);
      const business = await storage.createBusiness(validatedData);
      res.status(201).json({ success: true, data: business });
    } catch (error) {
      res.status(400).json({ success: false, message: "Invalid business data" });
    }
  });

  // Update business (admin)
  app.put("/api/admin/businesses/:id", async (req, res) => {
    try {
      const business = await storage.updateBusiness(Number(req.params.id), req.body);
      if (!business) {
        return res.status(404).json({ success: false, message: "Business not found" });
      }
      res.json({ success: true, data: business });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error updating business" });
    }
  });

  // Delete business (admin)
  app.delete("/api/admin/businesses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBusiness(Number(req.params.id));
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Business not found" });
      }
      res.json({ success: true, message: "Business deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error deleting business" });
    }
  });

  // ================= PROMO CODE MANAGEMENT =================
  
  // Get all promo codes (admin)
  app.get("/api/admin/promocodes", async (req, res) => {
    try {
      const promoCodes = await storage.getAllPromoCodes();
      res.json({ success: true, data: promoCodes });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching promo codes" });
    }
  });

  // Create promo code (admin)
  app.post("/api/admin/promocodes", async (req, res) => {
    try {
      const validatedData = insertPromoCodeSchema.parse(req.body);
      const promoCode = await storage.createPromoCode(validatedData);
      res.status(201).json({ success: true, data: promoCode });
    } catch (error) {
      res.status(400).json({ success: false, message: "Invalid promo code data" });
    }
  });

  // Update promo code (admin)
  app.put("/api/admin/promocodes/:id", async (req, res) => {
    try {
      const promoCode = await storage.updatePromoCode(Number(req.params.id), req.body);
      if (!promoCode) {
        return res.status(404).json({ success: false, message: "Promo code not found" });
      }
      res.json({ success: true, data: promoCode });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error updating promo code" });
    }
  });

  // Delete promo code (admin)
  app.delete("/api/admin/promocodes/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePromoCode(Number(req.params.id));
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Promo code not found" });
      }
      res.json({ success: true, message: "Promo code deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error deleting promo code" });
    }
  });

  // ================= NOTIFICATION MANAGEMENT =================
  
  // Get all notifications (admin)
  app.get("/api/admin/notifications", async (req, res) => {
    try {
      const notifications = await storage.getAllNotifications();
      res.json({ success: true, data: notifications });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching notifications" });
    }
  });

  // Create notification (admin)
  app.post("/api/admin/notifications", async (req, res) => {
    try {
      const validatedData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(validatedData);
      res.status(201).json({ success: true, data: notification });
    } catch (error) {
      res.status(400).json({ success: false, message: "Invalid notification data" });
    }
  });

  // Update notification (admin)
  app.put("/api/admin/notifications/:id", async (req, res) => {
    try {
      const notification = await storage.updateNotification(Number(req.params.id), req.body);
      if (!notification) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }
      res.json({ success: true, data: notification });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error updating notification" });
    }
  });

  // Delete notification (admin)
  app.delete("/api/admin/notifications/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteNotification(Number(req.params.id));
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }
      res.json({ success: true, message: "Notification deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error deleting notification" });
    }
  });

  // ================= TEAM MANAGEMENT =================
  
  // Get all teams (admin)
  app.get("/api/admin/teams", async (req, res) => {
    try {
      const teams = await storage.getAllTeams();
      res.json({ success: true, data: teams });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching teams" });
    }
  });

  // Create team (admin)
  app.post("/api/admin/teams", async (req, res) => {
    try {
      const validatedData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validatedData);
      res.status(201).json({ success: true, data: team });
    } catch (error) {
      res.status(400).json({ success: false, message: "Invalid team data" });
    }
  });

  // Update team (admin)
  app.put("/api/admin/teams/:id", async (req, res) => {
    try {
      const team = await storage.updateTeam(Number(req.params.id), req.body);
      if (!team) {
        return res.status(404).json({ success: false, message: "Team not found" });
      }
      res.json({ success: true, data: team });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error updating team" });
    }
  });

  // Delete team (admin)
  app.delete("/api/admin/teams/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTeam(Number(req.params.id));
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Team not found" });
      }
      res.json({ success: true, message: "Team deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error deleting team" });
    }
  });

  // Get team members (admin)
  app.get("/api/admin/teams/:id/members", async (req, res) => {
    try {
      const members = await storage.getTeamMembers(Number(req.params.id));
      res.json({ success: true, data: members });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching team members" });
    }
  });

  // ================= PROJECT MANAGEMENT =================
  
  // Get all projects (admin)
  app.get("/api/admin/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json({ success: true, data: projects });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching projects" });
    }
  });

  // Create project (admin)
  app.post("/api/admin/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      res.status(400).json({ success: false, message: "Invalid project data" });
    }
  });

  // Update project (admin)
  app.put("/api/admin/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(Number(req.params.id), req.body);
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }
      res.json({ success: true, data: project });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error updating project" });
    }
  });

  // Delete project (admin)
  app.delete("/api/admin/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(Number(req.params.id));
      if (!deleted) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }
      res.json({ success: true, message: "Project deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error deleting project" });
    }
  });

  // ================= EMPIRE LEVELS =================
  
  // Get all empire levels
  app.get("/api/empire-levels", async (req, res) => {
    try {
      const levels = await storage.getAllEmpireLevels();
      res.json({ success: true, data: levels });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching empire levels" });
    }
  });

  // ================= SETTINGS =================
  
  // Get all settings (admin)
  app.get("/api/admin/settings", async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching settings" });
    }
  });

  // Update setting (admin)
  app.put("/api/admin/settings/:key", async (req, res) => {
    try {
      const { value } = req.body;
      if (!value) {
        return res.status(400).json({ success: false, message: "Value is required" });
      }
      
      const setting = await storage.updateSetting(req.params.key, value);
      res.json({ success: true, data: setting });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error updating setting" });
    }
  });

  // ================= GAME API ROUTES (for frontend) =================
  
  // Get user by telegram ID (for game frontend)
  app.get("/api/game/user/:telegramId", async (req, res) => {
    try {
      const user = await storage.getUserByTelegramId(req.params.telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching user" });
    }
  });

  // Tap action (for tap-to-earn)
  app.post("/api/game/tap", async (req, res) => {
    try {
      const { telegramId, amount } = req.body;
      
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (user.energy < 1) {
        return res.status(400).json({ success: false, message: "Insufficient energy" });
      }

      const updatedUser = await storage.updateUser(user.id, {
        dubaiCoin: (user.dubaiCoin || 0) + amount,
        energy: Math.max(0, (user.energy || 5000) - 1),
        lastActive: new Date(),
      });

      res.json({ 
        success: true, 
        data: {
          user: updatedUser,
          earned: amount,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error processing tap" });
    }
  });

  // Get available businesses for purchase
  app.get("/api/game/businesses", async (req, res) => {
    try {
      const businesses = await storage.getAllBusinesses();
      const activeBusinesses = businesses.filter(b => b.isActive);
      res.json({ success: true, data: activeBusinesses });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching businesses" });
    }
  });

  // Buy business
  app.post("/api/game/business/buy", async (req, res) => {
    try {
      const { telegramId, businessId } = req.body;
      
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const business = await storage.getBusiness(businessId);
      if (!business) {
        return res.status(404).json({ success: false, message: "Business not found" });
      }

      if ((user.dubaiCoin || 0) < business.price) {
        return res.status(400).json({ success: false, message: "Insufficient coins" });
      }

      if ((user.level || 1) < business.requiredLevel) {
        return res.status(400).json({ success: false, message: "Level too low" });
      }

      // Purchase business
      const userBusiness = await storage.purchaseBusiness(user.id, businessId);
      
      // Update user coins and hourly income
      const updatedUser = await storage.updateUser(user.id, {
        dubaiCoin: (user.dubaiCoin || 0) - business.price,
        hourlyIncome: (user.hourlyIncome || 0) + business.hourlyIncome,
      });

      res.json({ 
        success: true, 
        data: {
          userBusiness,
          user: updatedUser,
          business,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error purchasing business" });
    }
  });

  // Get user's purchased businesses
  app.get("/api/game/user/:telegramId/businesses", async (req, res) => {
    try {
      const user = await storage.getUserByTelegramId(req.params.telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const userBusinesses = await storage.getUserBusinesses(user.id);
      res.json({ success: true, data: userBusinesses });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching user businesses" });
    }
  });

  // Claim daily reward
  app.post("/api/game/daily-reward", async (req, res) => {
    try {
      const { telegramId, day } = req.body;
      
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Check if already claimed today
      const today = new Date();
      const lastClaim = user.lastDailyReward;
      
      if (lastClaim && 
          lastClaim.getDate() === today.getDate() &&
          lastClaim.getMonth() === today.getMonth() &&
          lastClaim.getFullYear() === today.getFullYear()) {
        return res.status(400).json({ success: false, message: "Already claimed today" });
      }

      const dailyRewards = [1000, 2000, 3000, 5000, 8000, 10000, 15000, 20000, 25000, 30000, 50000, 100000];
      const reward = dailyRewards[Math.min(day - 1, dailyRewards.length - 1)] || 1000;

      const updatedUser = await storage.updateUser(user.id, {
        dubaiCoin: (user.dubaiCoin || 0) + reward,
        lastDailyReward: today,
        dailyStreak: (user.dailyStreak || 0) + 1,
      });

      res.json({ 
        success: true, 
        data: {
          user: updatedUser,
          reward,
          day,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error claiming daily reward" });
    }
  });

  // Get leaderboard
  app.get("/api/game/leaderboard", async (req, res) => {
    try {
      const { limit = 100 } = req.query;
      const users = await storage.getAllUsers();
      
      const leaderboard = users
        .filter(u => u.isActive)
        .sort((a, b) => (b.dubaiCoin || 0) - (a.dubaiCoin || 0))
        .slice(0, Number(limit))
        .map((user, index) => ({
          rank: index + 1,
          telegramId: user.telegramId,
          username: user.username,
          firstName: user.firstName,
          dubaiCoin: user.dubaiCoin,
          level: user.level,
        }));

      res.json({ success: true, data: leaderboard });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching leaderboard" });
    }
  });

  // Get available tasks for user
  app.get("/api/game/tasks/:telegramId", async (req, res) => {
    try {
      const user = await storage.getUserByTelegramId(req.params.telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const allTasks = await storage.getAllTasks();
      const userTasks = await storage.getUserTasks(user.id);
      const completedTaskIds = userTasks.map(ut => ut.taskId);
      
      const availableTasks = allTasks.filter(task => 
        task.isActive && !completedTaskIds.includes(task.id)
      );

      res.json({ 
        success: true, 
        data: {
          available: availableTasks,
          completed: userTasks,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching tasks" });
    }
  });

  // Complete task
  app.post("/api/game/tasks/complete", async (req, res) => {
    try {
      const { telegramId, taskId } = req.body;
      
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ success: false, message: "Task not found" });
      }

      // Check if already completed
      const userTasks = await storage.getUserTasks(user.id);
      const alreadyCompleted = userTasks.some(ut => ut.taskId === taskId);
      
      if (alreadyCompleted) {
        return res.status(400).json({ success: false, message: "Task already completed" });
      }

      // Complete task
      const userTask = await storage.completeTask(user.id, taskId);
      
      // Update user coins
      const updatedUser = await storage.updateUser(user.id, {
        dubaiCoin: (user.dubaiCoin || 0) + task.reward,
      });

      res.json({ 
        success: true, 
        data: {
          userTask,
          user: updatedUser,
          reward: task.reward,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error completing task" });
    }
  });

  // Redeem promo code
  app.post("/api/game/promo/redeem", async (req, res) => {
    try {
      const { telegramId, code } = req.body;
      
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      const promoCode = await storage.getPromoCode(code);
      if (!promoCode) {
        return res.status(404).json({ success: false, message: "Invalid promo code" });
      }

      if (!promoCode.isActive) {
        return res.status(400).json({ success: false, message: "Promo code is inactive" });
      }

      if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
        return res.status(400).json({ success: false, message: "Promo code usage limit reached" });
      }

      if (promoCode.expiresAt && new Date() > promoCode.expiresAt) {
        return res.status(400).json({ success: false, message: "Promo code has expired" });
      }

      // Use promo code
      const usage = await storage.usePromoCode(user.id, code);
      
      // Update user coins
      const updatedUser = await storage.updateUser(user.id, {
        dubaiCoin: (user.dubaiCoin || 0) + promoCode.reward,
      });

      res.json({ 
        success: true, 
        data: {
          usage,
          user: updatedUser,
          reward: promoCode.reward,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error redeeming promo code" });
    }
  });

  // Get empire levels
  app.get("/api/game/empire-levels", async (req, res) => {
    try {
      const levels = await storage.getAllEmpireLevels();
      res.json({ success: true, data: levels });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching empire levels" });
    }
  });

  // ================= LEGACY API ROUTES =================
  
  // User authentication/registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { telegramId, username, firstName, lastName, referralCode, language } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByTelegramId(telegramId);
      if (existingUser) {
        return res.json({ success: true, data: existingUser });
      }
      
      // Create new user
      const userData = {
        telegramId,
        username,
        firstName,
        lastName,
        referralCode: referralCode || Math.random().toString(36).substring(2, 15),
        language: language || "en",
      };
      
      const user = await storage.createUser(userData);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({ success: false, message: "Error creating user" });
    }
  });

  // Get user profile
  app.get("/api/user/:telegramId", async (req, res) => {
    try {
      const user = await storage.getUserByTelegramId(req.params.telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching user" });
    }
  });

  // Update user profile
  app.put("/api/user/:telegramId", async (req, res) => {
    try {
      const user = await storage.getUserByTelegramId(req.params.telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(user.id, req.body);
      res.json({ success: true, data: updatedUser });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error updating user" });
    }
  });

  // Get user tasks
  app.get("/api/user/:telegramId/tasks", async (req, res) => {
    try {
      const user = await storage.getUserByTelegramId(req.params.telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const allTasks = await storage.getAllTasks();
      const userTasks = await storage.getUserTasks(user.id);
      const completedTaskIds = userTasks.map(ut => ut.taskId);
      
      const availableTasks = allTasks.filter(task => 
        task.isActive && !completedTaskIds.includes(task.id)
      );
      
      res.json({ 
        success: true, 
        data: {
          available: availableTasks,
          completed: userTasks,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching tasks" });
    }
  });

  // Complete task
  app.post("/api/user/:telegramId/tasks/:taskId/complete", async (req, res) => {
    try {
      const user = await storage.getUserByTelegramId(req.params.telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const task = await storage.getTask(Number(req.params.taskId));
      if (!task) {
        return res.status(404).json({ success: false, message: "Task not found" });
      }
      
      const userTask = await storage.completeTask(user.id, task.id);
      
      // Update user coins
      const updatedUser = await storage.updateUser(user.id, {
        coins: (user.coins || 0) + task.reward,
      });
      
      res.json({ 
        success: true, 
        data: {
          userTask,
          user: updatedUser,
          reward: task.reward,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error completing task" });
    }
  });

  // Get available skins
  app.get("/api/skins", async (req, res) => {
    try {
      const skins = await storage.getAllSkins();
      const activeSkins = skins.filter(skin => skin.isActive);
      res.json({ success: true, data: activeSkins });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching skins" });
    }
  });

  // Get user skins
  app.get("/api/user/:telegramId/skins", async (req, res) => {
    try {
      const user = await storage.getUserByTelegramId(req.params.telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const userSkins = await storage.getUserSkins(user.id);
      res.json({ success: true, data: userSkins });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching user skins" });
    }
  });

  // Purchase skin
  app.post("/api/user/:telegramId/skins/:skinId/purchase", async (req, res) => {
    try {
      const user = await storage.getUserByTelegramId(req.params.telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const skin = await storage.getSkin(Number(req.params.skinId));
      if (!skin) {
        return res.status(404).json({ success: false, message: "Skin not found" });
      }
      
      if ((user.coins || 0) < skin.price) {
        return res.status(400).json({ success: false, message: "Insufficient coins" });
      }
      
      const userSkin = await storage.purchaseSkin(user.id, skin.id);
      
      // Update user coins
      const updatedUser = await storage.updateUser(user.id, {
        coins: (user.coins || 0) - skin.price,
      });
      
      res.json({ 
        success: true, 
        data: {
          userSkin,
          user: updatedUser,
          cost: skin.price,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error purchasing skin" });
    }
  });

  // Get available businesses
  app.get("/api/businesses", async (req, res) => {
    try {
      const businesses = await storage.getAllBusinesses();
      const activeBusinesses = businesses.filter(business => business.isActive);
      res.json({ success: true, data: activeBusinesses });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching businesses" });
    }
  });

  // Get user businesses
  app.get("/api/user/:telegramId/businesses", async (req, res) => {
    try {
      const user = await storage.getUserByTelegramId(req.params.telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const userBusinesses = await storage.getUserBusinesses(user.id);
      res.json({ success: true, data: userBusinesses });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error fetching user businesses" });
    }
  });

  // Purchase business
  app.post("/api/user/:telegramId/businesses/:businessId/purchase", async (req, res) => {
    try {
      const user = await storage.getUserByTelegramId(req.params.telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const business = await storage.getBusiness(Number(req.params.businessId));
      if (!business) {
        return res.status(404).json({ success: false, message: "Business not found" });
      }
      
      if ((user.coins || 0) < business.price) {
        return res.status(400).json({ success: false, message: "Insufficient coins" });
      }
      
      if ((user.empireLevel || 1) < business.requiredLevel) {
        return res.status(400).json({ success: false, message: "Insufficient empire level" });
      }
      
      const userBusiness = await storage.purchaseBusiness(user.id, business.id);
      
      // Update user coins
      const updatedUser = await storage.updateUser(user.id, {
        coins: (user.coins || 0) - business.price,
      });
      
      res.json({ 
        success: true, 
        data: {
          userBusiness,
          user: updatedUser,
          cost: business.price,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error purchasing business" });
    }
  });

  // Use promo code
  app.post("/api/user/:telegramId/promo/:code", async (req, res) => {
    try {
      const user = await storage.getUserByTelegramId(req.params.telegramId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      const promoCode = await storage.getPromoCode(req.params.code);
      if (!promoCode) {
        return res.status(404).json({ success: false, message: "Invalid promo code" });
      }
      
      if (!promoCode.isActive) {
        return res.status(400).json({ success: false, message: "Promo code is not active" });
      }
      
      if (promoCode.usageLimit && promoCode.usedCount >= promoCode.usageLimit) {
        return res.status(400).json({ success: false, message: "Promo code usage limit exceeded" });
      }
      
      if (promoCode.expiresAt && new Date() > promoCode.expiresAt) {
        return res.status(400).json({ success: false, message: "Promo code has expired" });
      }
      
      const usage = await storage.usePromoCode(user.id, req.params.code);
      
      // Update user coins
      const updatedUser = await storage.updateUser(user.id, {
        coins: (user.coins || 0) + promoCode.reward,
      });
      
      res.json({ 
        success: true, 
        data: {
          usage,
          user: updatedUser,
          reward: promoCode.reward,
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Error using promo code" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
