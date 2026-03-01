require('dotenv').config();
const express = require('express');
const cors = require('cors');

const uploadRouter = require('./routes/upload');
const chatRouter = require('./routes/chat');
const sessionRouter = require('./routes/session');
const topicsRouter = require('./routes/topics');
const coursesRouter = require('./routes/courses');
const filesRouter = require('./routes/files');
const { router: xpRouter } = require('./routes/xp');
const quizRouter = require('./routes/quiz');
const { router: achievementsRouter } = require('./routes/achievements');
const conversationsRouter = require('./routes/conversations');
const topicRoomRouter = require('./routes/topicRoom');
const studySessionsRouter = require('./routes/studySessions');
const questsRouter = require('./routes/quests');
const sideQuestsRouter = require('./routes/sideQuests');

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
app.use('/api', xpRouter);
app.use('/api', quizRouter);
app.use('/api', achievementsRouter);
app.use('/api', conversationsRouter);
app.use('/api', topicRoomRouter);
app.use('/api', studySessionsRouter);
app.use('/api/quests', questsRouter);
app.use('/api/side-quests', sideQuestsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
