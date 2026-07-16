import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './src/routes/authRoutes.js';
import { meRouter } from './src/routes/meRoutes.js';
import { userRouter } from './src/routes/userRoutes.js';
import { userItemRouter } from './src/routes/userItemRoutes.js';
import { itemTypeRouter } from './src/routes/itemTypeRoutes.js';
import { craftingRecipeRouter } from './src/routes/craftingRecipeRoutes.js';
import { raftUpgradeRouter } from './src/routes/raftUpgradeRoutes.js';
import { setupSwagger } from './_extras/api-docs/swagger.js';
import { errorHandler } from './src/utils/_errors.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('src/frontend'));

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

// Swagger API docs
await setupSwagger(app);

// Global error handler (must be last)
app.use(errorHandler);

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

export default app;
