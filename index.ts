
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import "./bot"; // Initialize Telegram bot
import path from "path";

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Serve static files in production
function serveStatic(app: express.Express) {
  const staticPath = path.join(process.cwd(), "dist");
  
  app.use(express.static(staticPath));
  
  // Catch-all handler for client-side routing
  app.get("*", (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith("/api/")) {
      return next();
    }
    
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

// Setup Vite for development
async function setupVite(app: express.Express, server: any) {
  try {
    const vite = await import("vite");
    const viteServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(viteServer.ssrFixStacktrace);
    app.use(viteServer.middlewares);
  } catch (error) {
    console.warn("Vite not available, serving static files");
    serveStatic(app);
  }
}

(async () => {
  try {
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error(err);
    });

    // Setup development or production serving
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    const port = 5000;
    server.listen(port, "0.0.0.0", () => {
      log(`🚀 Server running on port ${port}`);
      log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      log(`🤖 Telegram Bot Token: ${process.env.TELEGRAM_BOT_TOKEN ? 'Found ✅' : 'Not found ❌'}`);
      log(`🗄️ Database: ${process.env.DATABASE_URL ? 'Connected ✅' : 'Using in-memory storage ⚠️'}`);
      log(`🌐 Access URL: https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
