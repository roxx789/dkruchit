// api/capi.js

// ---------- CONFIG ----------
const PIXEL_ID = '1069242212826477';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || 'EAAQPoXcPCrEBS5zWbj7UjcqBET43CRyxpugzBeVgf9aDdtkIuTevglxPsgBYCYceYiiHi3WgZCB0iXyY04kIdBn8y6K1Bl43om6ZAwzYxidNTN0IspbD10rebqowZAojETW24HErOoDWZAq0MBUFGncIHPBZCqzjIpHXcadDcS4n1ja5h91xxoFIxiZAqIoQZDZD';
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE || '';  // sirf testing ke waqt set karein
const ALLOWED_ORIGINS = [
  'https://dkruchit-md5t.vercel.app',
  'https://yourdomain.com'
];              // apna live domain
const ALLOWED_EVENTS = ['Lead'];
const GRAPH_VERSION = 'v21.0';
// ----------------------------

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  // Vercel domain, same host, empty origin ya ALLOWED_ORIGINS ko allow karein
  const isVercel = host.endsWith('.vercel.app') || origin.includes('.vercel.app');
  const originAllowed = !origin || 
    isVercel ||
    (host && origin.includes(host)) || 
    ALLOWED_ORIGINS.includes(origin) || 
    ALLOWED_ORIGINS.some(o => origin.startsWith(o));

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!originAllowed) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (!ACCESS_TOKEN) {
    console.error('META_ACCESS_TOKEN is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    // Agar Vercel ne req.body parse nahi kiya toh stream se data read karein
    let rawBody = req.body;
    if (rawBody === undefined || rawBody === null) {
      rawBody = await new Promise((resolve) => {
        let chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        req.on('error', () => resolve(null));
      });
    }

    let data = rawBody;
    if (Buffer.isBuffer(data)) {
      data = data.toString('utf-8');
    }
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        data = null;
      }
    }

    const validId = data && typeof data.event_id === 'string' &&
      data.event_id.length > 0 && data.event_id.length <= 100;

    if (!data || !ALLOWED_EVENTS.includes(data.event_name) || !validId) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = forwarded
      ? String(forwarded).split(',')[0].trim()
      : ((req.socket && req.socket.remoteAddress) || '');

    const userData = {
      client_ip_address: clientIp,
      client_user_agent: req.headers['user-agent'] || '',
    };
    if (typeof data.fbp === 'string' && data.fbp) userData.fbp = data.fbp;
    if (typeof data.fbc === 'string' && data.fbc) userData.fbc = data.fbc;

    const payload = {
      data: [
        {
          event_name: data.event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id: data.event_id,   // browser Pixel wali same ID: Meta isi se dedup karta hai
          event_source_url: typeof data.event_source_url === 'string' ? data.event_source_url : '',
          action_source: 'website',
          user_data: userData,
        },
      ],
      access_token: ACCESS_TOKEN,    // token body mein, URL mein nahi
    };
    if (TEST_EVENT_CODE) payload.test_event_code = TEST_EVENT_CODE;

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    const result = await response.json();

    if (!response.ok) {
      console.error('Meta CAPI error:', JSON.stringify(result));
      return res.status(502).json({ status: 'error', details: result });
    }
    return res.status(200).json({ status: 'ok', events_received: result.events_received });
  } catch (err) {
    console.error('CAPI handler failed:', err);
    return res.status(500).json({ status: 'error' });
  }
};
