'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()

  const links = [
    { href: '/', label: 'Add Recipe' },
    { href: '/recipes', label: 'Recipes' },
    { href: '/grocery', label: 'Grocery List' },
  ]

  return (
    <nav className="border-b border-stone-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 flex items-center gap-1 h-14">
        <span className="font-semibold text-stone-800 mr-4 text-lg">Mise</span>
        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname === link.href
                ? 'bg-stone-100 text-stone-900'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
