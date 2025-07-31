const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: 'https://fancy-cascaron-97aca7.netlify.app',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('✅ 연결됨:', socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
  });

  socket.on('sendMessage', ({ roomId, message }) => {
    console.log('💬 메시지 수신:', message);
    io.to(roomId).emit('receiveMessage', message);
  });

  socket.on('disconnect', () => {
    console.log('❌ 연결 해제:', socket.id);
  });
});

server.listen(5000, () => {
  console.log('🚀 서버 실행 중 http://localhost:5000');
});
