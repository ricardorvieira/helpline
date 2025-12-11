import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { callsAPI, contactsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
    Phone,
    Users,
    Clock,
    TrendingUp,
    PhoneCall,
    PlusCircle,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
    Timer
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const COLORS = {
    inquiry: 'hsl(210, 80%, 60%)',
    complaint: 'hsl(0, 70%, 60%)',
    support: 'hsl(150, 60%, 45%)'
};

const PRIORITY_COLORS = {
    urgent: 'hsl(0, 70%, 60%)',
    high: 'hsl(30, 90%, 55%)',
    normal: 'hsl(210, 80%, 60%)',
    low: 'hsl(150, 60%, 45%)'
};

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentCalls, setRecentCalls] = useState([]);
    const [contactCount, setContactCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, callsRes, contactsRes] = await Promise.all([
                    callsAPI.getStats(),
                    callsAPI.getAll({}),
                    contactsAPI.getAll({})
                ]);
                
                setStats(statsRes.data);
                setRecentCalls(callsRes.data.slice(0, 5));
                setContactCount(contactsRes.data.length);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getTypeChartData = () => {
        if (!stats?.calls_by_type) return [];
        return Object.entries(stats.calls_by_type).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            color: COLORS[name] || 'hsl(220, 10%, 60%)'
        }));
    };

    const getPriorityChartData = () => {
        if (!stats?.calls_by_priority) return [];
        return Object.entries(stats.calls_by_priority).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            fill: PRIORITY_COLORS[name] || 'hsl(220, 10%, 60%)'
        }));
    };

    const getPriorityBadgeClass = (priority) => {
        const classes = {
            urgent: 'priority-urgent',
            high: 'priority-high',
            normal: 'priority-normal',
            low: 'priority-low'
        };
        return classes[priority] || 'priority-normal';
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'follow_up':
                return <AlertCircle className="w-4 h-4 text-purple-500" />;
            default:
                return <Timer className="w-4 h-4 text-yellow-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in" data-testid="dashboard-page">
            {/* Welcome section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Welcome back, {user?.name?.split(' ')[0]}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Here's what's happening with your calls today.
                    </p>
                </div>
                <Link to="/calls/new">
                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium" data-testid="log-call-btn">
                        <PlusCircle className="w-4 h-4 mr-2" />
                        Log New Call
                    </Button>
                </Link>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="stat-card" data-testid="stat-total-calls">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Calls</p>
                                <p className="text-3xl font-bold mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                    {stats?.total_calls || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Phone className="w-6 h-6 text-blue-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="stat-card" data-testid="stat-calls-today">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Today</p>
                                <p className="text-3xl font-bold mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                    {stats?.calls_today || 0}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                                <TrendingUp className="w-6 h-6 text-green-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="stat-card" data-testid="stat-contacts">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Contacts</p>
                                <p className="text-3xl font-bold mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                    {contactCount}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                                <Users className="w-6 h-6 text-purple-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="stat-card" data-testid="stat-avg-duration">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Avg. Duration</p>
                                <p className="text-3xl font-bold mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                    {formatDuration(Math.round(stats?.avg_duration || 0))}
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                                <Clock className="w-6 h-6 text-orange-500" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Calls by Priority */}
                <Card className="border border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            Calls by Priority
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={getPriorityChartData()} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={70} />
                                    <Tooltip 
                                        contentStyle={{ 
                                            background: 'white', 
                                            border: '1px solid hsl(220, 10%, 88%)',
                                            borderRadius: '8px'
                                        }} 
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Calls by Type */}
                <Card className="border border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                            Calls by Type
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-64 flex items-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={getTypeChartData()}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {getTypeChartData().map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ 
                                            background: 'white', 
                                            border: '1px solid hsl(220, 10%, 88%)',
                                            borderRadius: '8px'
                                        }} 
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-3">
                                {getTypeChartData().map((item) => (
                                    <div key={item.name} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-sm text-muted-foreground">{item.name}</span>
                                        <span className="text-sm font-medium">{item.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent calls */}
            <Card className="border border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-semibold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Recent Calls
                    </CardTitle>
                    <Link to="/calls">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="view-all-calls-btn">
                            View all
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent>
                    {recentCalls.length === 0 ? (
                        <div className="text-center py-12">
                            <PhoneCall className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                            <p className="text-muted-foreground">No calls logged yet</p>
                            <Link to="/calls/new">
                                <Button variant="outline" className="mt-4">
                                    Log your first call
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full data-table">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-3 px-4">Caller</th>
                                        <th className="text-left py-3 px-4">Type</th>
                                        <th className="text-left py-3 px-4">Priority</th>
                                        <th className="text-left py-3 px-4">Status</th>
                                        <th className="text-left py-3 px-4">Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentCalls.map((call, index) => (
                                        <tr 
                                            key={call.id} 
                                            className={`table-row-hover border-b border-border/50 animate-fade-in stagger-${index + 1}`}
                                        >
                                            <td className="py-3 px-4">
                                                <div>
                                                    <p className="font-medium">{call.contact_name || 'Unknown'}</p>
                                                    <p className="text-sm text-muted-foreground">{call.caller_number}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge variant="secondary" className={`type-${call.call_type}`}>
                                                    {call.call_type}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge variant="secondary" className={getPriorityBadgeClass(call.priority)}>
                                                    {call.priority}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(call.status)}
                                                    <span className="text-sm capitalize">{call.status.replace('_', ' ')}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-muted-foreground">
                                                {formatDuration(call.duration)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
