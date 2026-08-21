require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');

const leadsRouter = require('./routes/leads');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || true }));
app.use(express.json({ limit: '20kb' })); // input length limit at the transport level

app.use('/api/leads', leadsRouter);
app.use('/api/admin', adminRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

// Serve the existing frontend + admin dashboard, unmodified in design.
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`AutoMood backend running on port ${PORT}`);
});
