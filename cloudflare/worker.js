// ...Cloudflare Worker (tách ra khỏi test)...
addEventListener('fetch', event => {
  event.respondWith(handle(event.request))
})

async function handle(request) {
  const url = new URL(request.url)

  if (url.protocol === 'http:') {
    url.protocol = 'https:'
    return Response.redirect(url.toString(), 301)
  }

  if (url.pathname.startsWith('/admin')) {
    const token = request.headers.get('x-admin-token') || ''
    // ADMIN_TOKEN must be set as a Worker secret/binding
    if (typeof ADMIN_TOKEN === 'undefined' || token !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  const originResp = await fetch(request)

  const newHeaders = new Headers(originResp.headers)
  newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  newHeaders.set('X-Frame-Options', 'DENY')
  newHeaders.set('X-Content-Type-Options', 'nosniff')
  newHeaders.set('Referrer-Policy', 'no-referrer-when-downgrade')
  newHeaders.set('Permissions-Policy', 'geolocation=(), microphone=()')
  newHeaders.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data: https:; script-src 'self' https:; style-src 'self' 'unsafe-inline' https:;")

  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/admin')) {
    newHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  }

  return new Response(originResp.body, {
    status: originResp.status,
    statusText: originResp.statusText,
    headers: newHeaders
  })
}