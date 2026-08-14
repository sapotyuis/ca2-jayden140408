import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { authRouter } from './src/routes/authRoutes.js';
import { playerRouter } from './src/routes/playerRoutes.js';
import { survivorDirectoryRouter } from './src/routes/survivorDirectoryRoutes.js';
import { playerInventoryRouter } from './src/routes/playerInventoryRoutes.js';
import { itemCatalogRouter } from './src/routes/itemCatalogRoutes.js';
import { craftingRecipeRouter } from './src/routes/craftingRecipeRoutes.js';
import { playerRaftUpgradeRouter } from './src/routes/playerRaftUpgradeRoutes.js';
import { questBoardRouter } from './src/routes/questBoardRoutes.js';
import { playerQuestProgressRouter } from './src/routes/playerQuestProgressRoutes.js';
import { oceanEventRouter } from './src/routes/oceanEventRoutes.js';
import { playerEventHistoryRouter } from './src/routes/playerEventHistoryRoutes.js';
import { setupSwagger } from './_extras/api-docs/swagger.js';
import { errorHandler } from './src/utils/_errors.js';
import { requestErrorLogger, requestIdMiddleware, requestLogger } from './src/middlewares/requestIdMiddleware.js';

const app = express();
const entryPoint = fileURLToPath(import.meta.url);
const isVercel = Boolean(process.env.VERCEL);
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === entryPoint;

// The vanilla JavaScript frontend lives in ./public and is served directly by Express.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.join(__dirname, 'public');
const frontendEntry = path.join(publicPath, 'html', 'index.html');
const hasFrontend = fs.existsSync(frontendEntry);

const handleMalformedJson = (err, req, res, next) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON',
        status: 400,
      },
    });
  }

  next(err);
};

const handleUnknownApiRoute = (req, res, next) => {
  if (req.path === '/api' || req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'API route not found',
        status: 404,
      },
    });
  }

  next();
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(handleMalformedJson);
app.use(requestIdMiddleware);
if (hasFrontend && !isVercel) {
app.use(express.static(publicPath));
}
app.use(requestLogger);

// Clean page URLs map to the organized HTML documents under public/html.
const sendPage = (page) => (req, res) => res.sendFile(path.join(publicPath, 'html', page));
if (hasFrontend && !isVercel) {
  app.get('/camp', sendPage('camp.html'));
  app.get('/leaderboard', sendPage('leaderboard.html'));
  app.get('/voyage', sendPage('voyage.html'));
  app.get('/login', sendPage('login.html'));
  app.get('/register', sendPage('register.html'));
}

// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Public — no token required.
app.use('/api/auth', authRouter);          // register / login
app.use('/api/users', survivorDirectoryRouter);         // read-only survivor directory & leaderboard

// Protected — every route requires a valid JWT and acts on the token's owner.
app.use('/api/me', playerRouter);              // the logged-in survivor's raft, inventory & actions

// Game catalogues and player history — catalogues are public reads; player history is read-only and owner-scoped.
app.use('/api/item-types', itemCatalogRouter);
app.use('/api/crafting-recipes', craftingRecipeRouter);
app.use('/api/user-items', playerInventoryRouter);
app.use('/api/raft-upgrades', playerRaftUpgradeRouter);
app.use('/api/quests', questBoardRouter);
app.use('/api/user-quests', playerQuestProgressRouter);
app.use('/api/ocean-events', oceanEventRouter);
app.use('/api/user-events', playerEventHistoryRouter);

// Keep unknown API requests as structured JSON instead of Express's default HTML response.
app.use(handleUnknownApiRoute);

// Swagger API docs
if (!isVercel) {
  await setupSwagger(app);
}

// Frontend fallback: any other non-API GET returns the organized login entry document so the root
// URL and unknown client-side routes resolve instead of 404ing. API and docs paths are left alone
// so they keep their real responses.
if (hasFrontend && !isVercel) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/api-docs')) return next();
    res.sendFile(frontendEntry);
  });
}

// Global error handler (must be last)
app.use(requestErrorLogger);
app.use(errorHandler);

if (isDirectExecution && !isVercel) {
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API docs at http://localhost:${PORT}/api-docs`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Try a different port by setting the PORT environment variable.`);
      process.exit(1);
    }
    throw err;
  });
}

export default app;
