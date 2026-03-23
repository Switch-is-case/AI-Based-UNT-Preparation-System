const axios = require('axios');

async function testDify() {
  const url = 'https://api.dify.ai/v1/chat-messages';
  const key = 'app-WaygXVIOCoZa2vA963FB59LF';

  try {
    console.log('Sending request to:', url);
    const response = await axios.post(
      url,
      {
        inputs: { language: 'ru' },
        query: 'hello',
        response_mode: 'blocking',
        user: 'user_test'
      },
      {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );
    console.log('Success!', response.data);
  } catch (err) {
    if (err.response) {
      console.error('API Error Response:', err.response.status, err.response.data);
    } else if (err.request) {
      console.error('No response received! Network error or timeout.', err.message);
    } else {
      console.error('Request setup error:', err.message);
    }
  }
}

testDify();
