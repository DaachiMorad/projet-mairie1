require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const binRoutes = require('./routes/bins');
const collectionRoutes = require('./routes/collections');
const remarkRoutes = require('./routes/remarks');
const reportRoutes = require('./routes/reports');
const sseRoutes = require('./routes/sse');

const app = express();

app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/bins', binRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/remarks', remarkRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sse', sseRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`LaRonde backend running on port ${PORT}`);
  const db = require('./config/db');
  await db.init();
});
