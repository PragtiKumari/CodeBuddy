const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/hint', (req, res) => {
  console.log('Hint request received:', req.body);
  res.json({ 
    hint: 'This is a test hint! Your backend is working correctly.',
    source: 'test'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running!' });
});

app.listen(3000, () => {
  console.log('🚀 Simple test server running on http://localhost:3000');
});