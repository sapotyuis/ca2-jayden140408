import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { authRouter } from './src/routes/authRoutes.js';
import { meRouter } from './src/routes/meRoutes.js';
import { userRouter } from './src/routes/userRoutes.js';
import { userItemRouter } from './src/routes/userItemRoutes.js';
import { itemTypeRouter } from './src/routes/itemTypeRoutes.js';
import { craftingRecipeRouter } from './src/routes/craftingRecipeRoutes.js';
import { raftUpgradeRouter } from './src/routes/raftUpgradeRoutes.js';
import { questRouter } from './src/routes/questRoutes.js';
import { userQuestRouter } from './src/routes/userQuestRoutes.js';
import { oceanEventRouter } from './src/routes/oceanEventRoutes.js';
import { userEventRouter } from './src/routes/userEventRoutes.js';
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestIdMiddleware);
if (hasFrontend && !isVercel) {
  app.use(express.static(publicPath));
}
app.use(requestLogger);

// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Public — no token required.
app.use('/api/auth', authRouter);          // register / login
app.use('/api/users', userRouter);         // read-only survivor directory & leaderboard

// Protected — every route requires a valid JWT and acts on the token's owner.
app.use('/api/me', meRouter);              // the logged-in survivor's raft, inventory & actions

// Game catalogue & records — reads are public, writes require a token.
app.use('/api/item-types', itemTypeRouter);
app.use('/api/crafting-recipes', craftingRecipeRouter);
app.use('/api/user-items', userItemRouter);
app.use('/api/raft-upgrades', raftUpgradeRouter);
app.use('/api/quests', questRouter);
app.use('/api/user-quests', userQuestRouter);
app.use('/api/ocean-events', oceanEventRouter);
app.use('/api/user-events', userEventRouter);

// Swagger API docs
if (!isVercel) {
  await setupSwagger(app);
}

// Frontend fallback: any non-API GET returns the organized login entry document so the root URL
// and client-side routes resolve on a hard refresh instead of 404ing. API and docs paths are left
// alone so they keep their real responses.
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
