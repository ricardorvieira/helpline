import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';
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
    Users,
    UserPlus,
    Shield,
    ShieldCheck,
    UserCog,
    Search,
    Pencil,
    Trash2,
    Key,
    Phone,
    Mail,
    Loader2,
    CheckCircle2,
    XCircle,
    TrendingUp,
    PhoneCall
} from 'lucide-react';
import { toast } from 'sonner';

const ROLES = [
    { value: 'admin', label: 'Admin', icon: ShieldCheck, color: 'text-red-600 bg-red-50' },
    { value: 'supervisor', label: 'Supervisor', icon: Shield, color: 'text-purple-600 bg-purple-50' },
    { value: 'agent', label: 'Agent', icon: UserCog, color: 'text-blue-600 bg-blue-50' },
];

export default function AdminPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'agent'
    });
    const [newPassword, setNewPassword] = useState('');

    const fetchUsers = async () => {
        try {
            const params = {};
            if (search) params.search = search;
            if (roleFilter) params.role = roleFilter;
            if (statusFilter) params.status = statusFilter;
            
            const response = await adminAPI.getUsers(params);
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            toast.error('Failed to load users');
        }
    };

    const fetchStats = async () => {
        try {
            const response = await adminAPI.getStats();
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    };

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([fetchUsers(), fetchStats()]);
            setLoading(false);
        };
        init();
    }, []);

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchUsers();
        }, 300);
        return () => clearTimeout(debounce);
    }, [search, roleFilter, statusFilter]);

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'agent'
        });
    };

    const openCreateModal = () => {
        resetForm();
        setIsCreateOpen(true);
    };

    const openEditModal = (userItem) => {
        setSelectedUser(userItem);
        setFormData({
            name: userItem.name || '',
            email: userItem.email || '',
            password: '',
            role: userItem.role || 'agent'
        });
        setIsEditOpen(true);
    };

    const openDeleteModal = (userItem) => {
        setSelectedUser(userItem);
        setIsDeleteOpen(true);
    };

    const openResetPasswordModal = (userItem) => {
        setSelectedUser(userItem);
        setNewPassword('');
        setIsResetPasswordOpen(true);
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.email || !formData.password) {
            toast.error('Please fill all required fields');
            return;
        }

        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setIsSubmitting(true);
        try {
            await adminAPI.createUser(formData);
            toast.success('User created successfully');
            setIsCreateOpen(false);
            fetchUsers();
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to create user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        setIsSubmitting(true);
        try {
            const updateData = {
                name: formData.name,
                email: formData.email,
                role: formData.role
            };
            await adminAPI.updateUser(selectedUser.id, updateData);
            toast.success('User updated successfully');
            setIsEditOpen(false);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (userItem) => {
        const newStatus = userItem.status === 'active' ? 'inactive' : 'active';
        try {
            await adminAPI.updateUser(userItem.id, { status: newStatus });
            toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update user status');
        }
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await adminAPI.deleteUser(selectedUser.id);
            toast.success('User deleted successfully');
            setIsDeleteOpen(false);
            fetchUsers();
            fetchStats();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete user');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async () => {
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }

        setIsSubmitting(true);
        try {
            await adminAPI.resetPassword(selectedUser.id, { new_password: newPassword });
            toast.success('Password reset successfully');
            setIsResetPasswordOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to reset password');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRoleBadge = (role) => {
        const roleConfig = ROLES.find(r => r.value === role) || ROLES[2];
        const Icon = roleConfig.icon;
        return (
            <Badge variant="secondary" className={`${roleConfig.color} gap-1`}>
                <Icon className="w-3 h-3" />
                {roleConfig.label}
            </Badge>
        );
    };

    const formatDate = (isoString) => {
        if (!isoString) return 'Never';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in" data-testid="admin-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage users, roles, and system settings
                    </p>
                </div>
                <Button 
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={openCreateModal}
                    data-testid="create-user-btn"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add User
                </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="stat-card" data-testid="stat-total-users">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Users</p>
                                    <p className="text-3xl font-bold mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                        {stats.users.total}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="stat-card">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Active Users</p>
                                    <p className="text-3xl font-bold mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                        {stats.users.active}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="stat-card">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Total Contacts</p>
                                    <p className="text-3xl font-bold mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                        {stats.contacts.total}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                                    <Phone className="w-6 h-6 text-purple-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="stat-card">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Calls (7 days)</p>
                                    <p className="text-3xl font-bold mt-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                        {stats.calls.last_7_days}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                                    <PhoneCall className="w-6 h-6 text-orange-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Users by Role */}
            {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {ROLES.map(role => (
                        <Card key={role.value} className="border border-border">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg ${role.color} flex items-center justify-center`}>
                                    <role.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{role.label}s</p>
                                    <p className="text-xl font-bold">{stats.users.by_role[role.value] || 0}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Search and Filters */}
            <Card className="border border-border">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                                data-testid="user-search-input"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={roleFilter} onValueChange={setRoleFilter}>
                                <SelectTrigger className="w-36" data-testid="role-filter">
                                    <SelectValue placeholder="All Roles" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="agent">Agent</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-36" data-testid="status-filter">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="border border-border">
                <CardHeader>
                    <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        User Management
                    </CardTitle>
                    <CardDescription>
                        {users.length} user{users.length !== 1 ? 's' : ''} found
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {users.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                            <p className="text-muted-foreground">No users found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="data-table">
                                <TableHeader>
                                    <TableRow className="border-b border-border">
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Last Login</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="w-32">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((userItem, index) => (
                                        <TableRow
                                            key={userItem.id}
                                            className={`table-row-hover border-b border-border/50 animate-fade-in stagger-${Math.min(index + 1, 5)}`}
                                            data-testid={`user-row-${userItem.id}`}
                                        >
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{userItem.name}</p>
                                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {userItem.email}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getRoleBadge(userItem.role)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant="secondary" 
                                                    className={userItem.status === 'active' 
                                                        ? 'bg-green-50 text-green-600' 
                                                        : 'bg-gray-100 text-gray-600'
                                                    }
                                                >
                                                    {userItem.status === 'active' ? (
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    ) : (
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                    )}
                                                    {userItem.status || 'active'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {formatDate(userItem.last_login)}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {formatDate(userItem.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => openEditModal(userItem)}
                                                        disabled={userItem.id === user?.id}
                                                        title="Edit user"
                                                        data-testid={`edit-user-${userItem.id}`}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => openResetPasswordModal(userItem)}
                                                        title="Reset password"
                                                        data-testid={`reset-password-${userItem.id}`}
                                                    >
                                                        <Key className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`h-8 w-8 ${userItem.status === 'active' ? 'text-amber-600' : 'text-green-600'}`}
                                                        onClick={() => handleToggleStatus(userItem)}
                                                        disabled={userItem.id === user?.id}
                                                        title={userItem.status === 'active' ? 'Deactivate' : 'Activate'}
                                                        data-testid={`toggle-status-${userItem.id}`}
                                                    >
                                                        {userItem.status === 'active' ? (
                                                            <XCircle className="w-4 h-4" />
                                                        ) : (
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => openDeleteModal(userItem)}
                                                        disabled={userItem.id === user?.id}
                                                        title="Delete user"
                                                        data-testid={`delete-user-${userItem.id}`}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create User Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-md" data-testid="create-user-modal">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Create New User</DialogTitle>
                        <DialogDescription>
                            Add a new user to the system.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name *</Label>
                            <Input
                                placeholder="Full name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                data-testid="create-user-name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email *</Label>
                            <Input
                                type="email"
                                placeholder="user@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                data-testid="create-user-email"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password *</Label>
                            <Input
                                type="password"
                                placeholder="Min. 6 characters"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                data-testid="create-user-password"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Role</Label>
                            <Select 
                                value={formData.role} 
                                onValueChange={(value) => setFormData({ ...formData, role: value })}
                            >
                                <SelectTrigger data-testid="create-user-role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="agent">Agent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleCreate} 
                            disabled={isSubmitting}
                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
                            data-testid="save-new-user-btn"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Create User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit User Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-md" data-testid="edit-user-modal">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user details and role.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
                            <Input
                                placeholder="Full name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                            <Input
                                type="email"
                                placeholder="user@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Role</Label>
                            <Select 
                                value={formData.role} 
                                onValueChange={(value) => setFormData({ ...formData, role: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="supervisor">Supervisor</SelectItem>
                                    <SelectItem value="agent">Agent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleUpdate} 
                            disabled={isSubmitting}
                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
                            data-testid="update-user-btn"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Update User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reset Password Modal */}
            <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
                <DialogContent className="sm:max-w-md" data-testid="reset-password-modal">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Reset Password</DialogTitle>
                        <DialogDescription>
                            Set a new password for {selectedUser?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">New Password</Label>
                            <Input
                                type="password"
                                placeholder="Min. 6 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                data-testid="new-password-input"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleResetPassword} 
                            disabled={isSubmitting}
                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
                            data-testid="confirm-reset-password-btn"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Reset Password
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent data-testid="delete-user-dialog">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete User</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedUser?.name}? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-destructive/90"
                            data-testid="confirm-delete-user-btn"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
