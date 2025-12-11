import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
    Phone,
    LayoutDashboard,
    PhoneCall,
    Users,
    PlusCircle,
    LogOut,
    Menu,
    X,
    ChevronDown,
    Shield,
    Settings
} from 'lucide-react';

const getNavItems = (role) => {
    const items = [
        { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/calls/new', label: 'Log Call', icon: PlusCircle },
        { path: '/calls', label: 'Call History', icon: PhoneCall },
        { path: '/contacts', label: 'Contacts', icon: Users },
    ];
    
    // Add admin link for admin users
    if (role === 'admin') {
        items.push({ path: '/admin', label: 'Admin', icon: Shield });
    }
    
    return items;
};

const getRoleBadgeColor = (role) => {
    switch (role) {
        case 'admin':
            return 'bg-red-100 text-red-700';
        case 'supervisor':
            return 'bg-purple-100 text-purple-700';
        default:
            return 'bg-blue-100 text-blue-700';
    }
};

export const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navItems = getNavItems(user?.role);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = (name) => {
        return name
            ?.split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'AG';
    };

    return (
        <div className="min-h-screen bg-background" data-testid="app-layout">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                data-testid="sidebar"
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-6 border-b border-border">
                        <Link to="/dashboard" className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                                <Phone className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                HelplineOS
                            </span>
                        </Link>
                        <button
                            className="lg:hidden p-1 hover:bg-muted rounded-md"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path || 
                                (item.path === '/admin' && location.pathname.startsWith('/admin'));
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`sidebar-link flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
                                        isActive
                                            ? 'active'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    onClick={() => setSidebarOpen(false)}
                                    data-testid={`nav-${item.path.replace('/', '')}`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-border">
                        <div className="flex items-center gap-3 px-2">
                            <Avatar className="w-9 h-9">
                                <AvatarFallback className="bg-secondary text-secondary-foreground text-sm font-medium">
                                    {getInitials(user?.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user?.name}</p>
                                <Badge variant="secondary" className={`text-xs ${getRoleBadgeColor(user?.role)}`}>
                                    {user?.role}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Header */}
                <header className="sticky top-0 z-30 glass-header h-16 flex items-center justify-between px-6">
                    <button
                        className="lg:hidden p-2 -ml-2 hover:bg-muted rounded-md"
                        onClick={() => setSidebarOpen(true)}
                        data-testid="mobile-menu-btn"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="flex-1" />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="flex items-center gap-2" data-testid="user-menu-btn">
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
                                        {getInitials(user?.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden sm:block text-sm font-medium">{user?.name}</span>
                                <Badge variant="secondary" className={`hidden sm:flex text-xs ${getRoleBadgeColor(user?.role)}`}>
                                    {user?.role}
                                </Badge>
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <div className="px-3 py-2">
                                <p className="text-sm font-medium">{user?.name}</p>
                                <p className="text-xs text-muted-foreground">{user?.email}</p>
                            </div>
                            <DropdownMenuSeparator />
                            {user?.role === 'admin' && (
                                <>
                                    <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                                        <Shield className="w-4 h-4 mr-2" />
                                        Admin Dashboard
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
                            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer" data-testid="logout-btn">
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </header>

                {/* Page content */}
                <main className="p-6 max-w-7xl mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};
