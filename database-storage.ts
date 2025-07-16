
import { eq, desc, and, gte, like, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, tasks, skins, businesses, promoCodes, notifications, teams, projects, empireLevels,
  userTasks, userSkins, userBusinesses, promoCodeUsage, userNotifications, teamMembers, userProjects, settings,
  type User, type InsertUser, type Task, type InsertTask, type Skin, type InsertSkin,
  type Business, type InsertBusiness, type PromoCode, type InsertPromoCode,
  type Notification, type InsertNotification, type Team, type InsertTeam,
  type Project, type InsertProject, type EmpireLevel, type UserTask, type UserSkin,
  type UserBusiness, type PromoCodeUsage, type UserNotification, type TeamMember,
  type UserProject, type Setting
} from "../shared/schema";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) throw new Error("Database not available");
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        dubaiCoin: insertUser.dubaiCoin ?? 1000,
        tapProfit: insertUser.tapProfit ?? 1,
        hourlyIncome: insertUser.hourlyIncome ?? 0,
        level: insertUser.level ?? 1,
        energy: insertUser.energy ?? 5000,
        maxEnergy: insertUser.maxEnergy ?? 5000,
        boost: insertUser.boost ?? 0,
        maxBoost: insertUser.maxBoost ?? 3,
        energyRefill: insertUser.energyRefill ?? 5,
        maxEnergyRefill: insertUser.maxEnergyRefill ?? 5,
        premiumStatus: insertUser.premiumStatus ?? false,
        dailyStreak: insertUser.dailyStreak ?? 0,
        isActive: insertUser.isActive ?? true,
        language: insertUser.language ?? "uz",
      })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    if (!db) return [];
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersWithPagination(offset: number, limit: number): Promise<User[]> {
    if (!db) return [];
    return await db.select().from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Tasks management
  async getAllTasks(): Promise<Task[]> {
    if (!db) return [];
    return await db.select().from(tasks).where(eq(tasks.isActive, true));
  }

  async getTask(id: number): Promise<Task | undefined> {
    if (!db) return undefined;
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(task: InsertTask): Promise<Task> {
    if (!db) throw new Error("Database not available");
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    if (!db) return undefined;
    const [task] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: number): Promise<boolean> {
    if (!db) return false;
    const result = await db.update(tasks)
      .set({ isActive: false })
      .where(eq(tasks.id, id));
    return result.rowCount > 0;
  }

  async getUserTasks(userId: number): Promise<UserTask[]> {
    if (!db) return [];
    return await db.select().from(userTasks).where(eq(userTasks.userId, userId));
  }

  async completeTask(userId: number, taskId: number): Promise<UserTask> {
    if (!db) throw new Error("Database not available");

    // Check if task already completed
    const [existing] = await db.select()
      .from(userTasks)
      .where(and(eq(userTasks.userId, userId), eq(userTasks.taskId, taskId)));

    if (existing) return existing;

    const [userTask] = await db.insert(userTasks).values({
      userId,
      taskId,
      rewardClaimed: true
    }).returning();

    return userTask;
  }

  // Skins management
  async getAllSkins(): Promise<Skin[]> {
    if (!db) return [];
    return await db.select().from(skins).where(eq(skins.isActive, true));
  }

  async getSkin(id: number): Promise<Skin | undefined> {
    if (!db) return undefined;
    const [skin] = await db.select().from(skins).where(eq(skins.id, id));
    return skin || undefined;
  }

  async createSkin(skin: InsertSkin): Promise<Skin> {
    if (!db) throw new Error("Database not available");
    const [newSkin] = await db.insert(skins).values(skin).returning();
    return newSkin;
  }

  async updateSkin(id: number, updates: Partial<Skin>): Promise<Skin | undefined> {
    if (!db) return undefined;
    const [skin] = await db
      .update(skins)
      .set(updates)
      .where(eq(skins.id, id))
      .returning();
    return skin || undefined;
  }

  async deleteSkin(id: number): Promise<boolean> {
    if (!db) return false;
    const result = await db.update(skins)
      .set({ isActive: false })
      .where(eq(skins.id, id));
    return result.rowCount > 0;
  }

  async getUserSkins(userId: number): Promise<UserSkin[]> {
    if (!db) return [];
    return await db.select().from(userSkins).where(eq(userSkins.userId, userId));
  }

  async purchaseSkin(userId: number, skinId: number): Promise<UserSkin> {
    if (!db) throw new Error("Database not available");
    const [userSkin] = await db.insert(userSkins).values({
      userId,
      skinId
    }).returning();
    return userSkin;
  }

  // Business management
  async getAllBusinesses(): Promise<Business[]> {
    if (!db) return [];
    return await db.select().from(businesses).where(eq(businesses.isActive, true));
  }

  async getBusiness(id: number): Promise<Business | undefined> {
    if (!db) return undefined;
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business || undefined;
  }

  async createBusiness(business: InsertBusiness): Promise<Business> {
    if (!db) throw new Error("Database not available");
    const [newBusiness] = await db.insert(businesses).values(business).returning();
    return newBusiness;
  }

  async updateBusiness(id: number, updates: Partial<Business>): Promise<Business | undefined> {
    if (!db) return undefined;
    const [business] = await db
      .update(businesses)
      .set(updates)
      .where(eq(businesses.id, id))
      .returning();
    return business || undefined;
  }

  async deleteBusiness(id: number): Promise<boolean> {
    if (!db) return false;
    const result = await db.update(businesses)
      .set({ isActive: false })
      .where(eq(businesses.id, id));
    return result.rowCount > 0;
  }

  async getUserBusinesses(userId: number): Promise<UserBusiness[]> {
    if (!db) return [];
    return await db.select().from(userBusinesses).where(eq(userBusinesses.userId, userId));
  }

  async purchaseBusiness(userId: number, businessId: number): Promise<UserBusiness> {
    if (!db) throw new Error("Database not available");
    const [userBusiness] = await db.insert(userBusinesses).values({
      userId,
      businessId
    }).returning();
    return userBusiness;
  }

  // Promo codes
  async getAllPromoCodes(): Promise<PromoCode[]> {
    if (!db) return [];
    return await db.select().from(promoCodes).where(eq(promoCodes.isActive, true));
  }

  async getPromoCode(code: string): Promise<PromoCode | undefined> {
    if (!db) return undefined;
    const [promoCode] = await db.select().from(promoCodes).where(eq(promoCodes.code, code));
    return promoCode || undefined;
  }

  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    if (!db) throw new Error("Database not available");
    const [newPromoCode] = await db.insert(promoCodes).values(promoCode).returning();
    return newPromoCode;
  }

  async updatePromoCode(id: number, updates: Partial<PromoCode>): Promise<PromoCode | undefined> {
    if (!db) return undefined;
    const [promoCode] = await db
      .update(promoCodes)
      .set(updates)
      .where(eq(promoCodes.id, id))
      .returning();
    return promoCode || undefined;
  }

  async deletePromoCode(id: number): Promise<boolean> {
    if (!db) return false;
    const result = await db.update(promoCodes)
      .set({ isActive: false })
      .where(eq(promoCodes.id, id));
    return result.rowCount > 0;
  }

  async usePromoCode(userId: number, code: string): Promise<PromoCodeUsage> {
    if (!db) throw new Error("Database not available");

    const [promoCode] = await db.select().from(promoCodes).where(eq(promoCodes.code, code));
    if (!promoCode) throw new Error("Promo code not found");

    const [usage] = await db.insert(promoCodeUsage).values({
      userId,
      promoCodeId: promoCode.id
    }).returning();

    return usage;
  }

  // Notifications
  async getAllNotifications(): Promise<Notification[]> {
    if (!db) return [];
    return await db.select().from(notifications).where(eq(notifications.isActive, true));
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    if (!db) return undefined;
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification || undefined;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    if (!db) throw new Error("Database not available");
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async updateNotification(id: number, updates: Partial<Notification>): Promise<Notification | undefined> {
    if (!db) return undefined;
    const [notification] = await db
      .update(notifications)
      .set(updates)
      .where(eq(notifications.id, id))
      .returning();
    return notification || undefined;
  }

  async deleteNotification(id: number): Promise<boolean> {
    if (!db) return false;
    const result = await db.update(notifications)
      .set({ isActive: false })
      .where(eq(notifications.id, id));
    return result.rowCount > 0;
  }

  async getUserNotifications(userId: number): Promise<UserNotification[]> {
    if (!db) return [];
    return await db.select().from(userNotifications).where(eq(userNotifications.userId, userId));
  }

  // Teams
  async getAllTeams(): Promise<Team[]> {
    if (!db) return [];
    return await db.select().from(teams).where(eq(teams.isActive, true));
  }

  async getTeam(id: number): Promise<Team | undefined> {
    if (!db) return undefined;
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    if (!db) throw new Error("Database not available");
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async updateTeam(id: number, updates: Partial<Team>): Promise<Team | undefined> {
    if (!db) return undefined;
    const [team] = await db
      .update(teams)
      .set(updates)
      .where(eq(teams.id, id))
      .returning();
    return team || undefined;
  }

  async deleteTeam(id: number): Promise<boolean> {
    if (!db) return false;
    const result = await db.update(teams)
      .set({ isActive: false })
      .where(eq(teams.id, id));
    return result.rowCount > 0;
  }

  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    if (!db) return [];
    return await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async joinTeam(teamId: number, userId: number): Promise<TeamMember> {
    if (!db) throw new Error("Database not available");
    const [teamMember] = await db.insert(teamMembers).values({
      teamId,
      userId,
      role: "member"
    }).returning();
    return teamMember;
  }

  // Projects
  async getAllProjects(): Promise<Project[]> {
    if (!db) return [];
    return await db.select().from(projects).where(eq(projects.isActive, true));
  }

  async getProject(id: number): Promise<Project | undefined> {
    if (!db) return undefined;
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    if (!db) throw new Error("Database not available");
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    if (!db) return undefined;
    const [project] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    if (!db) return false;
    const result = await db.update(projects)
      .set({ isActive: false })
      .where(eq(projects.id, id));
    return result.rowCount > 0;
  }

  async getUserProjects(userId: number): Promise<UserProject[]> {
    if (!db) return [];
    return await db.select().from(userProjects).where(eq(userProjects.userId, userId));
  }

  async completeProject(userId: number, projectId: number): Promise<UserProject> {
    if (!db) throw new Error("Database not available");
    const [userProject] = await db.insert(userProjects).values({
      userId,
      projectId
    }).returning();
    return userProject;
  }

  // Empire levels
  async getAllEmpireLevels(): Promise<EmpireLevel[]> {
    if (!db) return [];
    return await db.select().from(empireLevels).orderBy(empireLevels.level);
  }

  async getEmpireLevel(level: number): Promise<EmpireLevel | undefined> {
    if (!db) return undefined;
    const [empireLevel] = await db.select().from(empireLevels).where(eq(empireLevels.level, level));
    return empireLevel || undefined;
  }

  // Settings
  async getAllSettings(): Promise<Setting[]> {
    if (!db) return [];
    return await db.select().from(settings);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    if (!db) return undefined;
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async updateSetting(key: string, value: string): Promise<Setting> {
    if (!db) throw new Error("Database not available");

    const [existing] = await db.select().from(settings).where(eq(settings.key, key));

    if (existing) {
      const [setting] = await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return setting;
    } else {
      const [setting] = await db.insert(settings).values({
        key,
        value,
        description: null
      }).returning();
      return setting;
    }
  }

  // Statistics
  async getUserStats(): Promise<any> {
    if (!db) return {};

    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const activeUsers = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isActive, true));

    return {
      totalUsers: totalUsers[0]?.count || 0,
      activeUsers: activeUsers[0]?.count || 0,
    };
  }

  async getGameStats(): Promise<any> {
    if (!db) return {};

    const totalTasks = await db.select({ count: sql<number>`count(*)` }).from(tasks);
    const totalSkins = await db.select({ count: sql<number>`count(*)` }).from(skins);
    const totalBusinesses = await db.select({ count: sql<number>`count(*)` }).from(businesses);

    return {
      totalTasks: totalTasks[0]?.count || 0,
      totalSkins: totalSkins[0]?.count || 0,
      totalBusinesses: totalBusinesses[0]?.count || 0,
    };
  }
}
