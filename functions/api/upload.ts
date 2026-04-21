interface Env {
  plataformaing: R2Bucket;
  API_KEY: string;
}

const uploadHandler = {
  async onRequest(context: { request: Request, env: Env }) {
  const { request, env } = context;
  const url = new URL(request.url);
  const bucket = env.plataformaing;

  if (!bucket) {
    return new Response('R2 Bucket not bound', { status: 500 });
  }

  // Serve image (GET)
  if (request.method === 'GET') {
    const file = url.searchParams.get('file');
    if (!file) return new Response('Missing file param', { status: 400 });

    const object = await bucket.get(`uploads/${file}`);
    if (!object) return new Response('Not found', { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, { headers });
  }

  // Upload image (POST)
  if (request.method === 'POST') {
    // Auth Check
    const authHeader = request.headers.get('X-API-Key');
    if (env.API_KEY && authHeader !== env.API_KEY) {
      return new Response('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const fileEntry = formData.get('file');
    
    if (!fileEntry || typeof fileEntry === 'string') {
      return new Response('No file uploaded', { status: 400 });
    }

    const file = fileEntry as unknown as File;

    const extension = file.name.split('.').pop();
    const filename = `${crypto.randomUUID()}.${extension}`;
    const key = `uploads/${filename}`;

    await bucket.put(key, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    return new Response(JSON.stringify({ 
      url: `/api/upload?file=${filename}`,
      filename 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method not allowed', { status: 405 });
}
};

export default uploadHandler;
