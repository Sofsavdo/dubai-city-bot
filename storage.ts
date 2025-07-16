import { 
  users, tasks, skins, businesses, promoCodes, notifications, teams, projects, empireLevels, userTasks, userSkins, userBusinesses, promoCodeUsage, userNotifications, teamMembers, userProjects, settings,
  type User, type InsertUser, type Task, type InsertTask, type Skin, type InsertSkin, type Business, type InsertBusiness, type PromoCode, type InsertPromoCode, type Notification, type InsertNotification, type Team, type InsertTeam, type Project, type InsertProject, type EmpireLevel, type UserTask, type UserSkin, type UserBusiness, type PromoCodeUsage, type UserNotification, type TeamMember, type UserProject, type Setting
} from "./shared/schema";
import { DatabaseStorage } from "./database-storage";
import { db } from "./db";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersWithPagination(offset: number, limit: number): Promise<User[]>;
  
  // Tasks management
  getAllTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  getUserTasks(userId: number): Promise<UserTask[]>;
  completeTask(userId: number, taskId: number): Promise<UserTask>;
  
  // Skins management
  getAllSkins(): Promise<Skin[]>;
  getSkin(id: number): Promise<Skin | undefined>;
  createSkin(skin: InsertSkin): Promise<Skin>;
  updateSkin(id: number, updates: Partial<Skin>): Promise<Skin | undefined>;
  deleteSkin(id: number): Promise<boolean>;
  getUserSkins(userId: number): Promise<UserSkin[]>;
  purchaseSkin(userId: number, skinId: number): Promise<UserSkin>;
  
  // Business management
  getAllBusinesses(): Promise<Business[]>;
  getBusiness(id: number): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: number, updates: Partial<Business>): Promise<Business | undefined>;
  deleteBusiness(id: number): Promise<boolean>;
  getUserBusinesses(userId: number): Promise<UserBusiness[]>;
  purchaseBusiness(userId: number, businessId: number): Promise<UserBusiness>;
  
  // Promo codes
  getAllPromoCodes(): Promise<PromoCode[]>;
  getPromoCode(code: string): Promise<PromoCode | undefined>;
  createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: number, updates: Partial<PromoCode>): Promise<PromoCode | undefined>;
  deletePromoCode(id: number): Promise<boolean>;
  usePromoCode(userId: number, code: string): Promise<PromoCodeUsage>;
  
  // Notifications
  getAllNotifications(): Promise<Notification[]>;
  getNotification(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: number, updates: Partial<Notification>): Promise<Notification | undefined>;
  deleteNotification(id: number): Promise<boolean>;
  getUserNotifications(userId: number): Promise<UserNotification[]>;
  
  // Teams
  getAllTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, updates: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  joinTeam(teamId: number, userId: number): Promise<TeamMember>;
  
  // Projects
  getAllProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  getUserProjects(userId: number): Promise<UserProject[]>;
  completeProject(userId: number, projectId: number): Promise<UserProject>;
  
  // Empire levels
  getAllEmpireLevels(): Promise<EmpireLevel[]>;
  getEmpireLevel(level: number): Promise<EmpireLevel | undefined>;
  
  // Settings
  getAllSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  updateSetting(key: string, value: string): Promise<Setting>;
  
  // Statistics
  getUserStats(): Promise<any>;
  getGameStats(): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tasks: Map<number, Task>;
  private skins: Map<number, Skin>;
  private businesses: Map<number, Business>;
  private promoCodes: Map<number, PromoCode>;
  private notifications: Map<number, Notification>;
  private teams: Map<number, Team>;
  private projects: Map<number, Project>;
  private empireLevels: Map<number, EmpireLevel>;
  private userTasks: Map<number, UserTask>;
  private userSkins: Map<number, UserSkin>;
  private userBusinesses: Map<number, UserBusiness>;
  private promoCodeUsage: Map<number, PromoCodeUsage>;
  private userNotifications: Map<number, UserNotification>;
  private teamMembers: Map<number, TeamMember>;
  private userProjects: Map<number, UserProject>;
  private settings: Map<string, Setting>;
  
  private currentUserIds: number;
  private currentTaskIds: number;
  private currentSkinIds: number;
  private currentBusinessIds: number;
  private currentPromoCodeIds: number;
  private currentNotificationIds: number;
  private currentTeamIds: number;
  private currentProjectIds: number;
  private currentUserTaskIds: number;
  private currentUserSkinIds: number;
  private currentUserBusinessIds: number;
  private currentPromoCodeUsageIds: number;
  private currentUserNotificationIds: number;
  private currentTeamMemberIds: number;
  private currentUserProjectIds: number;

  constructor() {
    this.users = new Map();
    this.tasks = new Map();
    this.skins = new Map();
    this.businesses = new Map();
    this.promoCodes = new Map();
    this.notifications = new Map();
    this.teams = new Map();
    this.projects = new Map();
    this.empireLevels = new Map();
    this.userTasks = new Map();
    this.userSkins = new Map();
    this.userBusinesses = new Map();
    this.promoCodeUsage = new Map();
    this.userNotifications = new Map();
    this.teamMembers = new Map();
    this.userProjects = new Map();
    this.settings = new Map();
    
    this.currentUserIds = 1;
    this.currentTaskIds = 1;
    this.currentSkinIds = 1;
    this.currentBusinessIds = 1;
    this.currentPromoCodeIds = 1;
    this.currentNotificationIds = 1;
    this.currentTeamIds = 1;
    this.currentProjectIds = 1;
    this.currentUserTaskIds = 1;
    this.currentUserSkinIds = 1;
    this.currentUserBusinessIds = 1;
    this.currentPromoCodeUsageIds = 1;
    this.currentUserNotificationIds = 1;
    this.currentTeamMemberIds = 1;
    this.currentUserProjectIds = 1;
    
    // Initialize empire levels
    this.initializeEmpireLevels();
    
    // Initialize default settings
    this.initializeSettings();
  }

  private initializeEmpireLevels() {
    const levels = [
      { level: 1, name: "Beginner", nameUz: "Yangi boshlovchi", nameRu: "Начинающий", requiredCoins: 0, hourlyIncome: 10 },
      { level: 2, name: "Entrepreneur", nameUz: "Tadbirkor", nameRu: "Предприниматель", requiredCoins: 1000, hourlyIncome: 25 },
      { level: 3, name: "Business Owner", nameUz: "Biznes egasi", nameRu: "Владелец бизнеса", requiredCoins: 5000, hourlyIncome: 50 },
      { level: 4, name: "Investor", nameUz: "Investor", nameRu: "Инвестор", requiredCoins: 15000, hourlyIncome: 100 },
      { level: 5, name: "Millionaire", nameUz: "Millioner", nameRu: "Миллионер", requiredCoins: 50000, hourlyIncome: 200 },
      { level: 6, name: "Tycoon", nameUz: "Magnat", nameRu: "Магнат", requiredCoins: 150000, hourlyIncome: 400 },
      { level: 7, name: "Corporate Giant", nameUz: "Korporativ gigant", nameRu: "Корпоративный гигант", requiredCoins: 400000, hourlyIncome: 800 },
      { level: 8, name: "Industry Leader", nameUz: "Soha lideri", nameRu: "Лидер отрасли", requiredCoins: 1000000, hourlyIncome: 1500 },
      { level: 9, name: "Global Magnate", nameUz: "Global magnat", nameRu: "Глобальный магнат", requiredCoins: 2500000, hourlyIncome: 3000 },
      { level: 10, name: "Empire Builder", nameUz: "Imperiya quruvchisi", nameRu: "Строитель империи", requiredCoins: 6000000, hourlyIncome: 6000 },
      { level: 11, name: "Economic Powerhouse", nameUz: "Iqtisodiy qudrat", nameRu: "Экономическая мощь", requiredCoins: 15000000, hourlyIncome: 12000 },
      { level: 12, name: "Financial Titan", nameUz: "Moliyaviy titan", nameRu: "Финансовый титан", requiredCoins: 35000000, hourlyIncome: 25000 },
      { level: 13, name: "Dubai Ruler", nameUz: "Dubay hukmdori", nameRu: "Правитель Дубая", requiredCoins: 80000000, hourlyIncome: 50000 },
      { level: 14, name: "Dubai King", nameUz: "Dubay shohi", nameRu: "Король Дубая", requiredCoins: 200000000, hourlyIncome: 100000 },
    ];
    
    levels.forEach((level, index) => {
      const empireLevel: EmpireLevel = {
        id: index + 1,
        level: level.level,
        name: level.name,
        nameUz: level.nameUz,
        nameRu: level.nameRu,
        requiredCoins: level.requiredCoins,
        hourlyIncome: level.hourlyIncome,
        description: `Level ${level.level} - ${level.name}`,
        icon: `level_${level.level}`,
      };
      this.empireLevels.set(index + 1, empireLevel);
    });
  }

  private initializeSettings() {
    const defaultSettings = [
      { key: "daily_bonus", value: "1000", description: "Daily login bonus coins" },
      { key: "referral_bonus", value: "5000", description: "Referral bonus coins" },
      { key: "task_completion_bonus", value: "500", description: "Bonus for completing tasks" },
      { key: "max_team_members", value: "50", description: "Maximum team members" },
      { key: "skin_discount_rate", value: "0.1", description: "Discount rate for skins" },
      { key: "business_profit_multiplier", value: "1.0", description: "Business profit multiplier" },
    ];
    
    defaultSettings.forEach(setting => {
      this.settings.set(setting.key, {
        id: Math.floor(Math.random() * 1000000),
        key: setting.key,
        value: setting.value,
        description: setting.description,
        updatedAt: new Date(),
      });
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.telegramId === telegramId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserIds++;
    const user: User = { 
      ...insertUser, 
      id,
      dubaiCoin: insertUser.dubaiCoin || 1000,
      tapProfit: insertUser.tapProfit || 1,
      hourlyIncome: insertUser.hourlyIncome || 0,
      level: insertUser.level || 1,
      energy: insertUser.energy || 5000,
      maxEnergy: insertUser.maxEnergy || 5000,
      boost: insertUser.boost || 0,
      maxBoost: insertUser.maxBoost || 3,
      energyRefill: insertUser.energyRefill || 5,
      maxEnergyRefill: insertUser.maxEnergyRefill || 5,
      premiumStatus: insertUser.premiumStatus || false,
      dailyStreak: insertUser.dailyStreak || 0,
      isActive: insertUser.isActive !== undefined ? insertUser.isActive : true,
      isAdmin: insertUser.isAdmin || false,
      language: insertUser.language || "uz",
      createdAt: new Date(),
      lastActive: new Date(),
      telegramId: insertUser.telegramId || null,
      username: insertUser.username,
      password: insertUser.password || null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      currentAvatar: insertUser.currentAvatar || null,
      premiumUntil: insertUser.premiumUntil || null,
      selectedAppearance: insertUser.selectedAppearance || null,
      lastDailyReward: insertUser.lastDailyReward || null,
      referralCode: insertUser.referralCode || null,
      referredBy: insertUser.referredBy || null,
      profileImage: insertUser.profileImage || null,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersWithPagination(offset: number, limit: number): Promise<User[]> {
    const users = Array.from(this.users.values());
    return users.slice(offset, offset + limit);
  }

  // Task methods
  async getAllTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.currentTaskIds++;
    const task: Task = { 
      ...insertTask, 
      id,
      isActive: insertTask.isActive ?? true,
      createdAt: new Date(),
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  async getUserTasks(userId: number): Promise<UserTask[]> {
    return Array.from(this.userTasks.values()).filter(ut => ut.userId === userId);
  }

  async completeTask(userId: number, taskId: number): Promise<UserTask> {
    const id = this.currentUserTaskIds++;
    const userTask: UserTask = {
      id,
      userId,
      taskId,
      completedAt: new Date(),
      rewardClaimed: false,
    };
    this.userTasks.set(id, userTask);
    return userTask;
  }

  // Skin methods
  async getAllSkins(): Promise<Skin[]> {
    return Array.from(this.skins.values());
  }

  async getSkin(id: number): Promise<Skin | undefined> {
    return this.skins.get(id);
  }

  async createSkin(insertSkin: InsertSkin): Promise<Skin> {
    const id = this.currentSkinIds++;
    const skin: Skin = { 
      ...insertSkin, 
      id,
      isActive: true,
    };
    this.skins.set(id, skin);
    return skin;
  }

  async updateSkin(id: number, updates: Partial<Skin>): Promise<Skin | undefined> {
    const skin = this.skins.get(id);
    if (!skin) return undefined;
    
    const updatedSkin = { ...skin, ...updates };
    this.skins.set(id, updatedSkin);
    return updatedSkin;
  }

  async deleteSkin(id: number): Promise<boolean> {
    return this.skins.delete(id);
  }

  async getUserSkins(userId: number): Promise<UserSkin[]> {
    return Array.from(this.userSkins.values()).filter(us => us.userId === userId);
  }

  async purchaseSkin(userId: number, skinId: number): Promise<UserSkin> {
    const id = this.currentUserSkinIds++;
    const userSkin: UserSkin = {
      id,
      userId,
      skinId,
      purchasedAt: new Date(),
      isEquipped: false,
    };
    this.userSkins.set(id, userSkin);
    return userSkin;
  }

  // Business methods
  async getAllBusinesses(): Promise<Business[]> {
    return Array.from(this.businesses.values());
  }

  async getBusiness(id: number): Promise<Business | undefined> {
    return this.businesses.get(id);
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    const id = this.currentBusinessIds++;
    const business: Business = { 
      ...insertBusiness, 
      id,
      requiredLevel: insertBusiness.requiredLevel || 1,
      isActive: true,
    };
    this.businesses.set(id, business);
    return business;
  }

  async updateBusiness(id: number, updates: Partial<Business>): Promise<Business | undefined> {
    const business = this.businesses.get(id);
    if (!business) return undefined;
    
    const updatedBusiness = { ...business, ...updates };
    this.businesses.set(id, updatedBusiness);
    return updatedBusiness;
  }

  async deleteBusiness(id: number): Promise<boolean> {
    return this.businesses.delete(id);
  }

  async getUserBusinesses(userId: number): Promise<UserBusiness[]> {
    return Array.from(this.userBusinesses.values()).filter(ub => ub.userId === userId);
  }

  async purchaseBusiness(userId: number, businessId: number): Promise<UserBusiness> {
    const id = this.currentUserBusinessIds++;
    const userBusiness: UserBusiness = {
      id,
      userId,
      businessId,
      purchasedAt: new Date(),
      lastCollected: new Date(),
      level: 1,
    };
    this.userBusinesses.set(id, userBusiness);
    return userBusiness;
  }

  // Promo code methods
  async getAllPromoCodes(): Promise<PromoCode[]> {
    return Array.from(this.promoCodes.values());
  }

  async getPromoCode(code: string): Promise<PromoCode | undefined> {
    return Array.from(this.promoCodes.values()).find(pc => pc.code === code);
  }

  async createPromoCode(insertPromoCode: InsertPromoCode): Promise<PromoCode> {
    const id = this.currentPromoCodeIds++;
    const promoCode: PromoCode = { 
      ...insertPromoCode, 
      id,
      usedCount: 0,
      isActive: true,
      createdAt: new Date(),
    };
    this.promoCodes.set(id, promoCode);
    return promoCode;
  }

  async updatePromoCode(id: number, updates: Partial<PromoCode>): Promise<PromoCode | undefined> {
    const promoCode = this.promoCodes.get(id);
    if (!promoCode) return undefined;
    
    const updatedPromoCode = { ...promoCode, ...updates };
    this.promoCodes.set(id, updatedPromoCode);
    return updatedPromoCode;
  }

  async deletePromoCode(id: number): Promise<boolean> {
    return this.promoCodes.delete(id);
  }

  async usePromoCode(userId: number, code: string): Promise<PromoCodeUsage> {
    const id = this.currentPromoCodeUsageIds++;
    const promoCode = await this.getPromoCode(code);
    if (!promoCode) throw new Error("Promo code not found");
    
    const usage: PromoCodeUsage = {
      id,
      userId,
      promoCodeId: promoCode.id,
      usedAt: new Date(),
    };
    this.promoCodeUsage.set(id, usage);
    
    // Update promo code used count
    promoCode.usedCount = (promoCode.usedCount || 0) + 1;
    this.promoCodes.set(promoCode.id, promoCode);
    
    return usage;
  }

  // Notification methods
  async getAllNotifications(): Promise<Notification[]> {
    return Array.from(this.notifications.values());
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.currentNotificationIds++;
    const notification: Notification = { 
      ...insertNotification, 
      id,
      isActive: true,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async updateNotification(id: number, updates: Partial<Notification>): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, ...updates };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }

  async deleteNotification(id: number): Promise<boolean> {
    return this.notifications.delete(id);
  }

  async getUserNotifications(userId: number): Promise<UserNotification[]> {
    return Array.from(this.userNotifications.values()).filter(un => un.userId === userId);
  }

  // Team methods
  async getAllTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = this.currentTeamIds++;
    const team: Team = { 
      ...insertTeam, 
      id,
      maxMembers: insertTeam.maxMembers || 50,
      isActive: true,
      createdAt: new Date(),
    };
    this.teams.set(id, team);
    return team;
  }

  async updateTeam(id: number, updates: Partial<Team>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (!team) return undefined;
    
    const updatedTeam = { ...team, ...updates };
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }

  async deleteTeam(id: number): Promise<boolean> {
    return this.teams.delete(id);
  }

  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(tm => tm.teamId === teamId);
  }

  async joinTeam(teamId: number, userId: number): Promise<TeamMember> {
    const id = this.currentTeamMemberIds++;
    const teamMember: TeamMember = {
      id,
      teamId,
      userId,
      role: "member",
      joinedAt: new Date(),
    };
    this.teamMembers.set(id, teamMember);
    return teamMember;
  }

  // Project methods
  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectIds++;
    const project: Project = { 
      ...insertProject, 
      id,
      isActive: true,
      createdAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }

  async getUserProjects(userId: number): Promise<UserProject[]> {
    return Array.from(this.userProjects.values()).filter(up => up.userId === userId);
  }

  async completeProject(userId: number, projectId: number): Promise<UserProject> {
    const id = this.currentUserProjectIds++;
    const userProject: UserProject = {
      id,
      userId,
      projectId,
      completedAt: new Date(),
      rewardClaimed: false,
    };
    this.userProjects.set(id, userProject);
    return userProject;
  }

  // Empire level methods
  async getAllEmpireLevels(): Promise<EmpireLevel[]> {
    return Array.from(this.empireLevels.values());
  }

  async getEmpireLevel(level: number): Promise<EmpireLevel | undefined> {
    return Array.from(this.empireLevels.values()).find(el => el.level === level);
  }

  // Settings methods
  async getAllSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    return this.settings.get(key);
  }

  async updateSetting(key: string, value: string): Promise<Setting> {
    const existing = this.settings.get(key);
    const setting: Setting = {
      id: existing?.id || Math.floor(Math.random() * 1000000),
      key,
      value,
      description: existing?.description || "",
      updatedAt: new Date(),
    };
    this.settings.set(key, setting);
    return setting;
  }

  // Statistics methods
  async getUserStats(): Promise<any> {
    const users = Array.from(this.users.values());
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const totalCoins = users.reduce((sum, u) => sum + (u.dubaiCoin || 0), 0);
    const averageLevel = users.reduce((sum, u) => sum + (u.level || 1), 0) / totalUsers;
    
    return {
      totalUsers,
      activeUsers,
      totalCoins,
      averageLevel: Math.round(averageLevel * 100) / 100,
    };
  }

  async getGameStats(): Promise<any> {
    const tasks = Array.from(this.tasks.values());
    const skins = Array.from(this.skins.values());
    const businesses = Array.from(this.businesses.values());
    const completedTasks = Array.from(this.userTasks.values()).length;
    const purchasedSkins = Array.from(this.userSkins.values()).length;
    const purchasedBusinesses = Array.from(this.userBusinesses.values()).length;
    
    return {
      totalTasks: tasks.length,
      activeTasks: tasks.filter(t => t.isActive).length,
      completedTasks,
      totalSkins: skins.length,
      purchasedSkins,
      totalBusinesses: businesses.length,
      purchasedBusinesses,
    };
  }
}

// DatabaseStorage implementation will be added here when ready

// For development, we'll use MemStorage temporarily
// Use DatabaseStorage if database is available, otherwise fallback to MemStorage
export const storage: IStorage = db ? new DatabaseStorage() : new MemStorage();
