import { pgTable, serial, text, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").unique().notNull(),
  username: text("username").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  language: text("language").default("uz"),
  isActive: boolean("is_active").default(true),
  dubaiCoin: integer("dubai_coin").default(1000),
  tapProfit: integer("tap_profit").default(1),
  hourlyIncome: integer("hourly_income").default(0),
  level: integer("level").default(1),
  energy: integer("energy").default(5000),
  maxEnergy: integer("max_energy").default(5000),
  boost: integer("boost").default(0),
  maxBoost: integer("max_boost").default(3),
  energyRefill: integer("energy_refill").default(5),
  maxEnergyRefill: integer("max_energy_refill").default(5),
  profileImage: text("profile_image"),
  referralCode: text("referral_code"),
  referredBy: integer("referred_by"),
  premiumStatus: boolean("premium_status").default(false),
  premiumUntil: timestamp("premium_until"),
  dailyStreak: integer("daily_streak").default(0),
  lastDailyReward: timestamp("last_daily_reward"),
  lastActive: timestamp("last_active").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  reward: integer("reward").notNull(),
  type: text("type").notNull(), // daily, social, special
  url: text("url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Skins table
export const skins = pgTable("skins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Businesses table
export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  hourlyIncome: integer("hourly_income").notNull(),
  requiredLevel: integer("required_level").default(1),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Promo codes table
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").unique().notNull(),
  description: text("description"),
  reward: integer("reward").notNull(),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // info, warning, success, error
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  memberLimit: integer("member_limit").default(50),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects table (Daily rewards)
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  day: integer("day").notNull(),
  reward: integer("reward").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Empire levels table
export const empireLevels = pgTable("empire_levels", {
  id: serial("id").primaryKey(),
  level: integer("level").unique().notNull(),
  name: text("name").notNull(),
  requiredCoins: integer("required_coins").notNull(),
  tapProfitBonus: integer("tap_profit_bonus").default(0),
  hourlyIncomeBonus: integer("hourly_income_bonus").default(0),
  description: text("description"),
});

// Settings table
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").unique().notNull(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Junction tables
export const userTasks = pgTable("user_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  taskId: integer("task_id").references(() => tasks.id),
  rewardClaimed: boolean("reward_claimed").default(false),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const userSkins = pgTable("user_skins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  skinId: integer("skin_id").references(() => skins.id),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

export const userBusinesses = pgTable("user_businesses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  businessId: integer("business_id").references(() => businesses.id),
  level: integer("level").default(1),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

export const promoCodeUsage = pgTable("promo_code_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  promoCodeId: integer("promo_code_id").references(() => promoCodes.id),
  usedAt: timestamp("used_at").defaultNow(),
});

export const userNotifications = pgTable("user_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  notificationId: integer("notification_id").references(() => notifications.id),
  isRead: boolean("is_read").default(false),
  receivedAt: timestamp("received_at").defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id),
  userId: integer("user_id").references(() => users.id),
  role: text("role").default("member"), // leader, admin, member
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const userProjects = pgTable("user_projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type Skin = typeof skins.$inferSelect;
export type InsertSkin = typeof skins.$inferInsert;
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = typeof businesses.$inferInsert;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = typeof promoCodes.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type EmpireLevel = typeof empireLevels.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type UserTask = typeof userTasks.$inferSelect;
export type UserSkin = typeof userSkins.$inferSelect;
export type UserBusiness = typeof userBusinesses.$inferSelect;
export type PromoCodeUsage = typeof promoCodeUsage.$inferSelect;
export type UserNotification = typeof userNotifications.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type UserProject = typeof userProjects.$inferSelect;

// Zod schemas
export const insertUserSchema = createInsertSchema(users);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertSkinSchema = createInsertSchema(skins);
export const insertBusinessSchema = createInsertSchema(businesses);
export const insertPromoCodeSchema = createInsertSchema(promoCodes);
export const insertNotificationSchema = createInsertSchema(notifications);
export const insertTeamSchema = createInsertSchema(teams);
export const insertProjectSchema = createInsertSchema(projects);