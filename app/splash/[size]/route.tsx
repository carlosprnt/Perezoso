import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params
  const [w, h] = size.split('x').map(Number)
  const width  = w || 1179
  const height = h || 2556
  const logoSize = Math.round(Math.min(width, height) * 0.28)
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
          alt=""
        />
      </div>
    ),
    {
      width,
      height,
      headers: {
        'Cache-Control': 'public, max-age=86400, immutable',
        'Content-Type': 'image/png',
      },
    }
  )
}
