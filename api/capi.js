module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;
    if (!data || !data.event_name || !data.event_id) {
      return res.status(400).json({ status: 'error', message: 'Invalid payload' });
    }

    const pixel_id = '1069242212826477'; // Aapka Pixel ID
    const access_token = 'EAAQPoXcPCrEBSypifnOlJcvkuLxhcMIhhaskFit4LoRxeJBKQbHK3KUiTcnySTOZCZBV9ZBIfZBiALPBXiNP4jnEYdGv4fOup4FdByZBU7agtiNWNowhw0SCG1LbBp9giKJWJK0s5zhGZCOtZB5LkNy7SrhvCzHkZAUw9TqqwXTlQh2KLWx7zw7XfaZCEN5J97AZDZD'; // Aapka Access Token
    const test_event_code = 'TEST1073'; // Test poora hone ke baad ise khali '' kar dena

    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : (req.socket.remoteAddress || '');
    const userAgent = req.headers['user-agent'] || '';

    const userData = {
      client_ip_address: clientIp,
      client_user_agent: userAgent,
    };

    if (data.fbp) userData.fbp = data.fbp;
    if (data.fbc) userData.fbc = data.fbc;

    const eventPayload = {
      data: [
        {
          event_name: data.event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: data.event_id,
          event_source_url: data.event_source_url || '',
          action_source: 'website',
          user_data: userData,
        }
      ]
    };

    if (test_event_code) {
      eventPayload.test_event_code = test_event_code;
    }

    const response = await fetch(`https://graph.facebook.com/v21.0/${pixel_id}/events?access_token=${access_token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload)
    });

    const result = await response.json();
    return res.status(response.status).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
