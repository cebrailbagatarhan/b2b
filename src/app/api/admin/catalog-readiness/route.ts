import {
  analyzeCommerceReadiness,
  catalogReadinessCsvHeader,
  catalogReadinessCsvRow,
  CSV_UTF8_BOM,
} from '@/lib/commerce-readiness'
import { iterateCommerceReadinessProducts } from '@/lib/commerce-readiness-data'
import { requireAdmin } from '@/lib/authorization'
import { AuthorizationError } from '@/lib/session'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
} as const

async function* generateCsvChunks(): AsyncGenerator<string> {
  yield CSV_UTF8_BOM + catalogReadinessCsvHeader()

  for await (const products of iterateCommerceReadinessProducts()) {
    yield products
      .map((product) => catalogReadinessCsvRow(analyzeCommerceReadiness(product)))
      .join('')
  }
}

function csvReadableStream(): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const chunks = generateCsvChunks()

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await chunks.next()
        if (next.done) {
          controller.close()
          return
        }
        controller.enqueue(encoder.encode(next.value))
      } catch (error) {
        console.error('Catalog readiness CSV stream failed:', error)
        controller.error(new Error('Katalog hazırlık raporu oluşturulamadı.'))
      }
    },
    async cancel() {
      await chunks.return(undefined)
    },
  })
}

export async function GET() {
  try {
    await requireAdmin(['SUPERADMIN', 'WAREHOUSE'])

    const date = new Date().toISOString().slice(0, 10)
    return new Response(csvReadableStream(), {
      status: 200,
      headers: {
        ...NO_STORE_HEADERS,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="kanal-hazirlik-${date}.csv"`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return Response.json(
        { success: false, error: error.message },
        { status: error.status, headers: NO_STORE_HEADERS }
      )
    }

    console.error('Catalog readiness CSV export failed:', error)
    return Response.json(
      { success: false, error: 'Katalog hazırlık raporu oluşturulamadı.' },
      { status: 500, headers: NO_STORE_HEADERS }
    )
  }
}
