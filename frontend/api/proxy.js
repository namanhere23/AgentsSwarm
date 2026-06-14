export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const url = new URL(req.url);
  const backendIp = process.env.BACKEND_IP;
  
  if (!backendIp) {
    return new Response(JSON.stringify({ error: "Missing BACKEND_IP in Vercel environment variables" }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }

  // url.pathname will be something like "/api/crews"
  // We want to forward it to "http://[IP_ADDRESS]/crews"
  const targetPath = url.pathname.replace(/^\/api/, '');
  const targetUrl = `http://${backendIp}${targetPath}${url.search}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      redirect: 'manual',
    });

    return response;
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 502,
      headers: { 'content-type': 'application/json' }
    });
  }
}
