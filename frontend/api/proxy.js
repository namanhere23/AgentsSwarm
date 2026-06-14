export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const backendIp = process.env.BACKEND_IP;
  
  if (!backendIp) {
    return res.status(500).json({ error: "Missing BACKEND_IP" });
  }

  const cleanIp = backendIp.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const targetPath = req.url.replace(/^\/api/, '');
  const targetUrl = `http://${cleanIp}${targetPath}`;

  try {
    const fetchResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        host: backendIp, // override host to prevent Vercel edge loops
      },
      // In Node.js serverless functions with bodyParser: false, req is a readable stream
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined,
      // Node 18 fetch requires duplex: 'half' for streaming requests
      duplex: req.method !== 'GET' && req.method !== 'HEAD' ? 'half' : undefined,
    });

    // Copy response headers back to client
    fetchResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    
    res.status(fetchResponse.status);

    // Stream the response back
    if (fetchResponse.body) {
      // fetchResponse.body is a ReadableStream. We can convert to Node stream or just use arrayBuffer
      const arrayBuffer = await fetchResponse.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    } else {
      res.end();
    }

  } catch (error) {
    console.error("Proxy error:", error);
    res.status(502).json({ error: "Proxy internal error: " + error.message, url: targetUrl });
  }
}
