import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const w = Number(searchParams.get('w') ?? 1170)
  const h = Number(searchParams.get('h') ?? 2532)
  const logoSize = Math.round(Math.min(w, h) * 0.28)

  const logoUrl = new URL('/logo.png', req.url).toString()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          width={logoSize}
          height={logoSize}
          style={{ borderRadius: logoSize * 0.22 }}
          alt="Perezoso"
        />
      </div>
    ),
    { width: w, height: h }
  )
}
