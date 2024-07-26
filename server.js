const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = 'your_secret_key';

app.use(bodyParser.json());
app.use(cors());

// MongoDB와 연결
mongoose.connect('mongodb://localhost:27017/timecapsule')
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch(err => {
    console.log('Failed to connect to MongoDB', err);
  });

// 사용자 스키마 및 모델
const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
});

const CapsuleSchema = new mongoose.Schema({
  title: String,
  content: String,
  date: Date,
  userId: mongoose.Schema.Types.ObjectId
});

const User = mongoose.model('User', UserSchema);
const Capsule = mongoose.model('Capsule', CapsuleSchema);

// 사용자 등록 엔드포인트
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).send('User registered');
  } catch (error) {
    res.status(400).send('Error registering user');
  }
});

// 로그인 엔드포인트
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ userId: user._id }, SECRET_KEY);
    res.json({ token });
  } else {
    res.status(401).send('Invalid credentials');
  }
});

// 타임캡슐 생성 엔드포인트
app.post('/api/capsules', async (req, res) => {
  const { title, content, date } = req.body;
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, SECRET_KEY);
  const capsule = new Capsule({ title, content, date, userId: decoded.userId });
  await capsule.save();
  res.status(201).send('Capsule created');
});

// 타임캡슐 수정 엔드포인트
app.put('/api/capsules/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, date } = req.body;
  await Capsule.findByIdAndUpdate(id, { title, content, date });
  res.send('Capsule updated');
});

// 타임캡슐 삭제 엔드포인트
app.delete('/api/capsules/:id', async (req, res) => {
  const { id } = req.params;
  await Capsule.findByIdAndDelete(id);
  res.send('Capsule deleted');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
