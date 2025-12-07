const socket = io();

const loginContainer = document.getElementById('login-container');
const chatContainer = document.getElementById('chat-container');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const messagesList = document.getElementById('messages');
const usersList = document.getElementById('users-list');
const currentUserSpan = document.getElementById('current-user');
const typingIndicator = document.getElementById('typing-indicator');

let currentUsername = '';
let typingTimeout;

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  if (username) {
    currentUsername = username;
    socket.emit('join', username);
    loginContainer.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    currentUserSpan.textContent = username;
    messageInput.focus();
  }
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const message = messageInput.value.trim();
  if (message) {
    socket.emit('chat message', { message });
    socket.emit('stop typing');
    messageInput.value = '';
  }
});

messageInput.addEventListener('input', () => {
  socket.emit('typing');
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop typing');
  }, 1000);
});

socket.on('welcome', (data) => {
  if (data.history && data.history.length > 0) {
    data.history.forEach(msg => addMessage(msg));
  }
  addSystemMessage(data.message);
  updateUsersList(data.users);
});

socket.on('user joined', (data) => {
  addSystemMessage(`${data.username} joined the chat`);
  updateUsersList(data.users);
});

socket.on('user left', (data) => {
  addSystemMessage(`${data.username} left the chat`);
  updateUsersList(data.users);
});

socket.on('chat message', (data) => {
  addMessage(data);
});

socket.on('user typing', (username) => {
  typingIndicator.classList.remove('hidden');
  typingIndicator.querySelector('span').textContent = `${username} is typing...`;
});

socket.on('user stop typing', () => {
  typingIndicator.classList.add('hidden');
});

function addMessage(data) {
  const li = document.createElement('li');
  const isOwnMessage = data.username === currentUsername;
  
  if (isOwnMessage) {
    li.classList.add('own-message');
  }
  
  li.innerHTML = `
    <div class="message-header">
      <strong>${escapeHtml(data.username)}</strong>
      <span>${escapeHtml(data.timestamp)}</span>
    </div>
    <div class="message-content">${escapeHtml(data.message)}</div>
  `;
  
  messagesList.appendChild(li);
  scrollToBottom();
}

function addSystemMessage(message) {
  const li = document.createElement('li');
  li.classList.add('system-message');
  li.textContent = message;
  messagesList.appendChild(li);
  scrollToBottom();
}

function updateUsersList(users) {
  usersList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.textContent = user.username;
    if (user.username === currentUsername) {
      li.textContent += ' (You)';
    }
    usersList.appendChild(li);
  });
}

function scrollToBottom() {
  const container = document.getElementById('messages-container');
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
