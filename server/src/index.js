require('dotenv').config();
const express = require('express');
const cors = require('cors');

const uploadRouter = require('./routes/upload');
const chatRouter = require('./routes/chat');
const sessionRouter = require('./routes/session');
const topicsRouter = require('./routes/topics');
const coursesRouter = require('./routes/courses');
const filesRouter = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', uploadRouter);
app.use('/api', chatRouter);
app.use('/api', sessionRouter);
app.use('/api', topicsRouter);
app.use('/api', coursesRouter);
app.use('/api', filesRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
