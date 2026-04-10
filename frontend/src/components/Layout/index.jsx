import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, Mic, Settings, PanelLeftClose, PanelLeftOpen, AudioWaveform } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

const NAV = [
  { to: '/', icon: LayoutDashboard, key: 'nav.overview', end: true },
  { to: '/speaking', icon: Mic, key: 'nav.speaking' },
  { to: '/settings', icon: Settings, key: 'nav.settings' },
]

export default function Layout({ children }) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Desktop sidebar */}
        <aside className={`hidden md:flex shrink-0 bg-sidebar border-r border-sidebar-border flex-col p-3 gap-1 transition-[width] duration-200 ${collapsed ? 'w-[52px]' : 'w-[200px]'}`}>
          <div className="flex items-center gap-2.5 px-2 py-3 overflow-hidden">
            <AudioWaveform className="w-5 h-5 shrink-0 text-primary" />
            {!collapsed && (
              <span className="text-sm font-semibold text-sidebar-foreground truncate">Echonic</span>
            )}
          </div>

          <Separator className="bg-sidebar-border mb-1" />

          <nav className="flex-1 flex flex-col gap-1">
            {NAV.map(({ to, icon: Icon, key, end }) => (
              collapsed ? (
                <Tooltip key={to}>
                  <TooltipTrigger
                    render={<NavLink to={to} end={end} />}
                    className={({ isActive }) =>
                      `flex items-center justify-center px-2 py-2 rounded-md transition-colors ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="right">{t(key)}</TooltipContent>
                </Tooltip>
              ) : (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {t(key)}
                </NavLink>
              )
            ))}
          </nav>

          <Separator className="bg-sidebar-border mt-1 mb-1" />
          <Tooltip>
            <TooltipTrigger
              onClick={() => setCollapsed(v => !v)}
              className="flex items-center px-2 py-2 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
            >
              {collapsed
                ? <PanelLeftOpen className="w-4 h-4 shrink-0" />
                : <PanelLeftClose className="w-4 h-4 shrink-0" />}
            </TooltipTrigger>
            <TooltipContent side="right">{collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}</TooltipContent>
          </Tooltip>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-14 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-sm h-14">
          {NAV.map(({ to, icon: Icon, key, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {t(key)}
            </NavLink>
          ))}
        </nav>
      </div>
    </TooltipProvider>
  )
}
