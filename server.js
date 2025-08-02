const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// MongoDB 연결
const MONGO_URI = process.env.MONGO_URI || 'your_mongo_connection_string'; // 실제 연결 주소로 대체
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB 연결 완료'))
  .catch((err) => console.error('❌ MongoDB 연결 실패:', err));

// 메시지 스키마
const messageSchema = new mongoose.Schema({
  nickname: String,
  message: String,
  ip: String,
  time: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', messageSchema);

// CORS 설정
const corsOptions = {
  origin: 'https://fking-nice-chat.netlify.app', // Netlify 주소
  methods: ['GET', 'POST'],
  credentials: true,
};
app.use(cors(corsOptions));

// Socket.IO 설정
const io = new Server(server, {
  cors: corsOptions,
});

// 기본 라우트
app.get('/', (req, res) => {
  res.send('✅ Chat backend is live!');
});

// 소켓 연결
io.on('connection', (socket) => {
  console.log('✅ 연결됨:', socket.id);

  // 채팅방 입장 시 이전 메시지 전송
  socket.on('joinRoom', async (roomId) => {
    socket.join(roomId);
    try {
      const messages = await Message.find().sort({ time: 1 });
      socket.emit('chatHistory', messages);
    } catch (err) {
      console.error('❌ 채팅 이력 불러오기 실패:', err);
    }
  });

  // 메시지 전송 및 저장
  socket.on('sendMessage', async ({ roomId, nickname, message }) => {
    const ip = socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.handshake.address;
    const fullMessage = { nickname, message, ip, time: new Date() };
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
