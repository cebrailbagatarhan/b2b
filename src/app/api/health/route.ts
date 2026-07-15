import { prisma } from '@/lib/prisma'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1 AS [ok]`

    return Response.json(
      { status: 'ok', services: { database: 'ok' } },
      { headers: NO_STORE_HEADERS }
    )
  } catch {
    console.error('Health check failed: database is unavailable.')
    return Response.json(
      { status: 'unavailable', services: { database: 'unavailable' } },
      { status: 503, headers: NO_STORE_HEADERS }
    )
  }
}
