const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const users = new Map();

async function getRecentMessages() {
  try {
    const result = await pool.query(
      'SELECT username, message, timestamp FROM messages ORDER BY id DESC LIMIT 50'
    );
    return result.rows.reverse().map(row => ({
      username: row.username,
      message: row.message,
      timestamp: new Date(row.timestamp).toLocaleTimeString()
    }));
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

async function saveMessage(username, message) {
  try {
    await pool.query(
      'INSERT INTO messages (username, message) VALUES ($1, $2)',
      [username, message]
    );
  } catch (error) {
    console.error('Error saving message:', error);
  }
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', async (username) => {
    users.set(socket.id, {
      username: username,
      id: socket.id
    });
    
    io.emit('user joined', {
      username: username,
      users: Array.from(users.values())
    });
    
    const history = await getRecentMessages();
    
    socket.emit('welcome', {
      message: `Welcome to the chat, ${username}!`,
      users: Array.from(users.values()),
      history: history
    });
  });

  socket.on('chat message', async (data) => {
    const user = users.get(socket.id);
    if (user) {
      const timestamp = new Date().toLocaleTimeString();
      
      await saveMessage(user.username, data.message);
      
      io.emit('chat message', {
        username: user.username,
        message: data.message,
        timestamp: timestamp
      });
    }
  });

  socket.on('typing', () => {
    const user = users.get(socket.id);
    if (user) {
      socket.broadcast.emit('user typing', user.username);
    }
  });

  socket.on('stop typing', () => {
    socket.broadcast.emit('user stop typing');
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      io.emit('user left', {
        username: user.username,
        users: Array.from(users.values())
      });
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Chat server running on http://0.0.0.0:${PORT}`);
});
