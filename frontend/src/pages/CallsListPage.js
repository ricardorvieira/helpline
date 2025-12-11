import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { callsAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import {
    Search,
    Download,
    Filter,
    PhoneCall,
    CheckCircle2,
    AlertCircle,
    Timer,
    PlusCircle,
    X,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function CallsListPage() {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    
    // Filters
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const fetchCalls = async () => {
        setLoading(true);
        try {
            const params = {};
            if (search) params.search = search;
            if (typeFilter) params.call_type = typeFilter;
            if (priorityFilter) params.priority = priorityFilter;
            if (statusFilter) params.status = statusFilter;
            
            const response = await callsAPI.getAll(params);
            setCalls(response.data);
        } catch (error) {
            console.error('Failed to fetch calls:', error);
            toast.error('Failed to load calls');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCalls();
    }, [typeFilter, priorityFilter, statusFilter]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchCalls();
        }, 300);
        return () => clearTimeout(debounce);
    }, [search]);

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = {};
            if (typeFilter) params.call_type = typeFilter;
            if (priorityFilter) params.priority = priorityFilter;
            if (statusFilter) params.status = statusFilter;
            
            const blob = await callsAPI.exportCSV(params);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `calls_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast.success('Export downloaded successfully');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export calls');
        } finally {
            setExporting(false);
        }
    };

    const clearFilters = () => {
        setSearch('');
        setTypeFilter('');
        setPriorityFilter('');
        setStatusFilter('');
    };

    const hasActiveFilters = search || typeFilter || priorityFilter || statusFilter;

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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

    return (
        <div className="space-y-6 animate-fade-in" data-testid="calls-list-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Call History
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {calls.length} call{calls.length !== 1 ? 's' : ''} total
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={exporting || calls.length === 0}
                        data-testid="export-btn"
                    >
                        {exporting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        Export CSV
                    </Button>
                    <Link to="/calls/new">
                        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" data-testid="new-call-btn">
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Log Call
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Search and Filters */}
            <Card className="border border-border">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by number, name, or notes..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                                data-testid="search-input"
                            />
                        </div>
                        
                        {/* Filter toggle */}
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                            className={showFilters ? 'bg-secondary' : ''}
                            data-testid="filter-toggle-btn"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filters
                            {hasActiveFilters && (
                                <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
                                    {[typeFilter, priorityFilter, statusFilter].filter(Boolean).length}
                                </Badge>
                            )}
                        </Button>
                    </div>

                    {/* Filter dropdowns */}
                    {showFilters && (
                        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
                            <div className="w-40">
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger data-testid="type-filter">
                                        <SelectValue placeholder="Call Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="inquiry">Inquiry</SelectItem>
                                        <SelectItem value="complaint">Complaint</SelectItem>
                                        <SelectItem value="support">Support</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-40">
                                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                    <SelectTrigger data-testid="priority-filter">
                                        <SelectValue placeholder="Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-40">
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger data-testid="status-filter">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="follow_up">Follow Up</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {hasActiveFilters && (
                                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="clear-filters-btn">
                                    <X className="w-4 h-4 mr-1" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Calls table */}
            <Card className="border border-border">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : calls.length === 0 ? (
                        <div className="text-center py-12">
                            <PhoneCall className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                {hasActiveFilters ? 'No calls match your filters' : 'No calls logged yet'}
                            </p>
                            {!hasActiveFilters && (
                                <Link to="/calls/new">
                                    <Button variant="outline" className="mt-4">
                                        Log your first call
                                    </Button>
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="data-table">
                                <TableHeader>
                                    <TableRow className="border-b border-border">
                                        <TableHead>Caller</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Agent</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {calls.map((call, index) => (
                                        <TableRow
                                            key={call.id}
                                            className={`table-row-hover border-b border-border/50 animate-fade-in stagger-${Math.min(index + 1, 5)}`}
                                            data-testid={`call-row-${call.id}`}
                                        >
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{call.contact_name || 'Unknown'}</p>
                                                    <p className="text-sm text-muted-foreground">{call.caller_number}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={`type-${call.call_type}`}>
                                                    {call.call_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={getPriorityBadgeClass(call.priority)}>
                                                    {call.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(call.status)}
                                                    <span className="text-sm capitalize">{call.status.replace('_', ' ')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {call.agent_name}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatDuration(call.duration)}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {formatDate(call.timestamp)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
