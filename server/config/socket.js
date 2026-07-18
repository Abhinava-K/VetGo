const jwt = require('jsonwebtoken');

module.exports = (io) => {
  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id} (${socket.user.role})`);
    
    // Join a room based on userId for private communication
    socket.join(socket.user.id);
    
    // If doctor, join doctors room to receive new requests
    if (socket.user.role === 'DOCTOR') {
      socket.join('doctors_room');
    }

    socket.on('doctor:location', (data) => {
      // Forward doctor location to the assigned user
      const { requestId, recipientUserId, lat, lng } = data;
      io.to(recipientUserId).emit('doctor:location', { requestId, lat, lng });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });
};
