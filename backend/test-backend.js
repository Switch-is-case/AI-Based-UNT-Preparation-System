const jwt = require('jsonwebtoken');
const axios = require('axios');

const secret = '7e5136d79c8d7bc51d748079dc7435ab';
const token = jwt.sign({ id: 1, email: 'test@test.com' }, secret, { expiresIn: '1h' });

async function run() {
  try {
    const res = await axios.post('http://localhost:3000/api/ai/chat', { message: 'hello' }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('OK:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('ERROR:', err.response.status, err.response.data);
    } else {
      console.error('ERROR:', err.message);
    }
  }
}

run();
