import React from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Users,
  Menu,
  Settings,
  Bell,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
}

function NavItem({ href, icon: Icon, label, active }: NavItemProps) {
  return (
    <Link 
      href={href} 
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-150 ${
        active 
          ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/25" 
          : "text-sidebar-foreground font-medium hover:bg-sidebar-accent hover:text-sidebar-foreground"
      }`}
    >
      <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? "text-primary-foreground" : "text-sidebar-foreground/60"}`} />
      <span className="text-sm">{label}</span>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/quotes", icon: FileText, label: "Quotes" },
    { href: "/products", icon: Package, label: "Products" },
    { href: "/customers", icon: Users, label: "Customers" },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-64 p-4 shadow-sm">
      <div className="flex items-center gap-3 px-2 py-4 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/25">
          <FileText className="w-4 h-4 text-primary-foreground" />
        </div>
        <h1 className="text-lg font-display font-bold tracking-tight text-sidebar-foreground">PCG_Quote_n_Price</h1>
      </div>

      <p className="px-4 mb-2 text-[11px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">Navigation</p>
      
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavItem 
            key={item.href} 
            {...item} 
            active={location === item.href || (item.href !== "/" && location.startsWith(item.href))} 
          />
        ))}
      </nav>

      <div className="mt-auto pt-4 border-t border-sidebar-border space-y-1">
        <NavItem href="/settings" icon={Settings} label="Settings" />
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sidebar-accent/60 mt-2">
          <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">SR</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">Sales Rep</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">rep@pcg.com</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed inset-y-0 left-0 z-50 h-screen">
        <SidebarContent />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all duration-300">
        {/* Top Header */}
        <header className="sticky top-0 z-40 glass w-full flex items-center justify-between px-4 sm:px-6 h-16 sm:h-20">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-r-0">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            
            <div className="hidden sm:flex items-center bg-muted/50 px-3 py-2 rounded-xl focus-within:ring-2 ring-primary/20 transition-all">
              <Search className="w-4 h-4 text-muted-foreground mr-2" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="bg-transparent border-none outline-none text-sm w-64 placeholder:text-muted-foreground/70"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground rounded-full">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-background"></span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </main>
      </div>
    </div>
  );
}
