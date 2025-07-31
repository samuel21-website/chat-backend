const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/chatdb';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB 연결 완료'))
  .catch((err) => console.error('❌ MongoDB 연결 실패:', err));

// 메시지 스키마 정의
const messageSchema = new mongoose.Schema({
  nickname: String,
  message: String,
  ip: String,
  time: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: 'https://fancy-cascaron-97aca7.netlify.app', // ← 너의 Netlify 주소
    methods: ['GET', 'POST'],
  },
});

app.get('/', (req, res) => {
  res.send('✅ Chat backend is live!');
});

io.on('connection', (socket) => {
  console.log('✅ 연결됨:', socket.id);

  socket.on('joinRoom', async (roomId) => {
    socket.join(roomId);

    try {
      const messages = await Message.find().sort({ time: 1 });
      socket.emit('chatHistory', messages);
    } catch (err) {
      console.error('❌ 채팅 이력 불러오기 실패:', err);
    }
  });

  socket.on('sendMessage', async ({ roomId, nickname, message }) => {
    const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.handshake.address;

    const fullMessage = {
      nickname,
      message,
      ip,
    };

    try {
      await Message.create(fullMessage);
    } catch (err) {
      console.error('❌ 메시지 저장 실패:', err);
    }

    io.to(roomId).emit('receiveMessage', fullMessage);
  });

  socket.on('disconnect', () => {
    console.log('❌ 연결 해제:', socket.id);
  });
});

server.listen(5000, () => {
  console.log('🚀 서버 실행 중 http://localhost:5000');
});
