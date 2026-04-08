import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F7F8FA] dark:bg-[#000000] px-6">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/image-error.png"
          alt=""
          width={180}
          height={180}
          className="mb-6 select-none"
          draggable={false}
        />
        <h1 className="text-[22px] font-bold text-[#121212] dark:text-[#F2F2F7] mb-1">Página no encontrada</h1>
        <p className="text-sm text-[#737373] dark:text-[#8E8E93] mb-6">
          La página que buscas no existe.
        </p>
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-[#3D3BF3] dark:text-[#8B89FF]"
        >
          Ir al inicio →
        </Link>
      </div>
    </main>
  )
}
