import storageHandler from '../functions/api/storage';
import uploadHandler from '../functions/api/upload';

export interface Env {
  plataformaing: R2Bucket;
  API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route API calls
    if (url.pathname.startsWith('/api/storage')) {
      return storageHandler.onRequest({ request, env } as any);
    }
    
    if (url.pathname.startsWith('/api/upload')) {
      return uploadHandler.onRequest({ request, env } as any);
    }

    // Default to serving static assets (handled by Cloudflare if assets are enabled)
    return new Response("Not Found", { status: 404 });
  },
};
