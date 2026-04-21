interface Env {
  EDD_STORAGE: R2Bucket;
  API_KEY: string;
}

export const onRequest = async (context: { request: Request, env: Env }) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get('key'); // e.g. 'products', 'materials'
  
  if (!key) {
    return new Response('Missing key', { status: 400 });
  }

  // Basic API Key Security
  const authHeader = request.headers.get('X-API-Key');
  if (env.API_KEY && authHeader !== env.API_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  const bucket = env.EDD_STORAGE;
  if (!bucket) {
    return new Response('R2 Bucket not bound', { status: 500 });
  }

  const storageKey = `${key}.json`;

  if (request.method === 'GET') {
    const object = await bucket.get(storageKey);
    if (!object) {
      return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(object.body, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'POST') {
    const body = await request.text();
    // Validate JSON
    try {
      JSON.parse(body);
    } catch (e) {
      return new Response('Invalid JSON', { status: 400 });
    }

    await bucket.put(storageKey, body);
    return new Response('Saved', { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
};
