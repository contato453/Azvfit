import * as React from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { LogOut, Shield } from 'lucide-react'
import { Logo } from '#/components/brand/Logo'
import { COLABORADOR_BOTTOM_NAV, ADMIN_NAV, COLABORADOR_NAV } from '#/components/layout/nav-items'
import { Button } from '#/components/ui/button'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { cn } from '#/lib/utils'
import { useAuth } from '#/lib/auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'

function initials(name: string | null | undefined) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function AppShell({ children, admin = false }: { children: React.ReactNode; admin?: boolean }) {
  const { profile, isStaff, signOut } = useAuth()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const navItems = admin ? ADMIN_NAV : COLABORADOR_BOTTOM_NAV

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to={admin ? '/admin' : '/dashboard'} className="flex items-center gap-2">
            <Logo size="sm" />
          </Link>

          <div className="flex items-center gap-2">
            {isStaff && (
              <Link to={admin ? '/dashboard' : '/admin'}>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Shield className="size-4" />
                  {admin ? 'Área do colaborador' : 'Painel da comissão'}
                </Button>
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{profile?.full_name ?? 'Minha conta'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/perfil">Meu perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void signOut()} className="text-destructive">
                  <LogOut className="size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Navegação horizontal — sempre visível no admin (lista longa), só em telas largas para o colaborador */}
        <nav className={cn('mx-auto max-w-5xl gap-1 overflow-x-auto px-4 pb-2 flex', !admin && 'hidden md:flex')}>
          {(admin ? ADMIN_NAV : COLABORADOR_NAV).map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + '/')
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className={cn('mx-auto w-full max-w-5xl flex-1 px-4 pt-4', admin ? 'pb-8' : 'pb-24 md:pb-8')}>
        {children}
      </main>

      {/* Barra inferior mobile-first — só para o colaborador (admin usa a nav horizontal acima) */}
      {!admin && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-5xl items-stretch justify-between px-1 pb-[env(safe-area-inset-bottom)]">
            {navItems.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + '/')
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
