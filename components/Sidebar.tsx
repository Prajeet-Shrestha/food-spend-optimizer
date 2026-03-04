'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/logs', label: 'Logs', icon: FileText },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 hidden" id="sidebar-overlay" />
      
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-card border-r border-border z-50 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">₹</span>
              </div>
              <div>
                <h1 className="font-bold text-sm text-foreground">Food Spend</h1>
                <p className="text-xs text-muted-foreground">Optimizer</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-lg">₹</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'animate-scale-in' : ''}`} />
                {!collapsed && (
                  <span className="font-medium text-sm animate-fade-in">{item.label}</span>
                )}
                {isActive && !collapsed && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-6 right-4 w-8 h-8 rounded-full bg-muted hover:bg-border transition-colors flex items-center justify-center group"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </button>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          {!collapsed && (
            <div className="text-xs text-muted-foreground text-center animate-fade-in">
              <p className="font-medium">v1.0.0</p>
              <p className="mt-1">Made with ❤️</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
