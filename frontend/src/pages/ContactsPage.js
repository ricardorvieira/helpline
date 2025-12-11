import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { contactsAPI } from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
import { Label } from '../components/ui/label';
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
    Users,
    PlusCircle,
    Pencil,
    Trash2,
    Phone,
    Mail,
    Building,
    MapPin,
    Loader2,
    X,
    PhoneIncoming
} from 'lucide-react';
import { toast } from 'sonner';

export default function ContactsPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // FreePBX redirect params
    const phoneParam = searchParams.get('phone');
    const callEventIdParam = searchParams.get('callEventId');
    const isFromFreePBX = !!phoneParam;
    
    // Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        phone_number: '',
        name: '',
        email: '',
        address: '',
        company: '',
        tags: ''
    });
    
    // Auto-open create modal if coming from FreePBX with new caller
    useEffect(() => {
        if (phoneParam) {
            setFormData(prev => ({
                ...prev,
                phone_number: phoneParam
            }));
            setIsCreateOpen(true);
            toast.info(`New caller: ${phoneParam} - Please create a contact`);
        }
    }, [phoneParam]);

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const params = {};
            if (search) params.search = search;
            
            const response = await contactsAPI.getAll(params);
            setContacts(response.data);
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
            toast.error('Failed to load contacts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchContacts();
        }, 300);
        return () => clearTimeout(debounce);
    }, [search]);

    const resetForm = () => {
        setFormData({
            phone_number: '',
            name: '',
            email: '',
            address: '',
            company: '',
            tags: ''
        });
    };

    const openCreateModal = () => {
        resetForm();
        setIsCreateOpen(true);
    };

    const openEditModal = (contact) => {
        setSelectedContact(contact);
        setFormData({
            phone_number: contact.phone_number || '',
            name: contact.name || '',
            email: contact.email || '',
            address: contact.address || '',
            company: contact.company || '',
            tags: contact.tags?.join(', ') || ''
        });
        setIsEditOpen(true);
    };

    const openDeleteModal = (contact) => {
        setSelectedContact(contact);
        setIsDeleteOpen(true);
    };

    const handleCreate = async () => {
        if (!formData.phone_number.trim()) {
            toast.error('Phone number is required');
            return;
        }

        setIsSubmitting(true);
        try {
            const data = {
                phone_number: formData.phone_number.trim(),
                name: formData.name.trim() || null,
                email: formData.email.trim() || null,
                address: formData.address.trim() || null,
                company: formData.company.trim() || null,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
            };
            
            const response = await contactsAPI.create(data);
            toast.success('Contact created successfully');
            setIsCreateOpen(false);
            
            // If coming from FreePBX, redirect to call log page with contact
            if (isFromFreePBX && callEventIdParam) {
                navigate(`/calls/new?contact=${response.data.id}&phone=${phoneParam}&callEventId=${callEventIdParam}`);
            } else {
                fetchContacts();
            }
        } catch (error) {
            console.error('Failed to create contact:', error);
            toast.error(error.response?.data?.detail || 'Failed to create contact');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        setIsSubmitting(true);
        try {
            const data = {
                phone_number: formData.phone_number.trim() || null,
                name: formData.name.trim() || null,
                email: formData.email.trim() || null,
                address: formData.address.trim() || null,
                company: formData.company.trim() || null,
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
            };
            
            await contactsAPI.update(selectedContact.id, data);
            toast.success('Contact updated successfully');
            setIsEditOpen(false);
            fetchContacts();
        } catch (error) {
            console.error('Failed to update contact:', error);
            toast.error(error.response?.data?.detail || 'Failed to update contact');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await contactsAPI.delete(selectedContact.id);
            toast.success('Contact deleted successfully');
            setIsDeleteOpen(false);
            fetchContacts();
        } catch (error) {
            console.error('Failed to delete contact:', error);
            toast.error(error.response?.data?.detail || 'Failed to delete contact');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-6 animate-fade-in" data-testid="contacts-page">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Contacts
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {contacts.length} contact{contacts.length !== 1 ? 's' : ''} total
                    </p>
                </div>
                <Button 
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    onClick={openCreateModal}
                    data-testid="create-contact-btn"
                >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add Contact
                </Button>
            </div>

            {/* Search */}
            <Card className="border border-border">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, phone, email, or company..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                            data-testid="contact-search-input"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Contacts table */}
            <Card className="border border-border">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : contacts.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                            <p className="text-muted-foreground">
                                {search ? 'No contacts match your search' : 'No contacts yet'}
                            </p>
                            {!search && (
                                <Button variant="outline" className="mt-4" onClick={openCreateModal}>
                                    Add your first contact
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="data-table">
                                <TableHeader>
                                    <TableRow className="border-b border-border">
                                        <TableHead>Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Tags</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="w-24">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contacts.map((contact, index) => (
                                        <TableRow
                                            key={contact.id}
                                            className={`table-row-hover border-b border-border/50 animate-fade-in stagger-${Math.min(index + 1, 5)}`}
                                            data-testid={`contact-row-${contact.id}`}
                                        >
                                            <TableCell className="font-medium">
                                                {contact.name || <span className="text-muted-foreground italic">Not set</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                                    {contact.phone_number}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {contact.email ? (
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                                        {contact.email}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {contact.company ? (
                                                    <div className="flex items-center gap-2">
                                                        <Building className="w-3.5 h-3.5 text-muted-foreground" />
                                                        {contact.company}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {contact.tags?.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {contact.tags.slice(0, 2).map((tag) => (
                                                            <Badge key={tag} variant="secondary" className="text-xs">
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                        {contact.tags.length > 2 && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                +{contact.tags.length - 2}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {formatDate(contact.created_at)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => openEditModal(contact)}
                                                        data-testid={`edit-contact-${contact.id}`}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => openDeleteModal(contact)}
                                                        data-testid={`delete-contact-${contact.id}`}
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

            {/* Create Contact Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-md" data-testid="create-contact-modal">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Add New Contact</DialogTitle>
                        <DialogDescription>
                            Enter the contact details below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number *</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="+1 (555) 123-4567"
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    className="pl-10"
                                    data-testid="contact-phone-input"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
                            <Input
                                placeholder="Contact name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                data-testid="contact-name-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="pl-10"
                                    data-testid="contact-email-input"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Company</Label>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Company name"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    className="pl-10"
                                    data-testid="contact-company-input"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Address</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="pl-10"
                                    data-testid="contact-address-input"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tags</Label>
                            <Input
                                placeholder="vip, premium, support (comma-separated)"
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                data-testid="contact-tags-input"
                            />
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
                            data-testid="save-contact-btn"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Create Contact
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Contact Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-md" data-testid="edit-contact-modal">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Manrope, sans-serif' }}>Edit Contact</DialogTitle>
                        <DialogDescription>
                            Update the contact details below.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number *</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="+1 (555) 123-4567"
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
                            <Input
                                placeholder="Contact name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Company</Label>
                            <div className="relative">
                                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Company name"
                                    value={formData.company}
                                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Address</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tags</Label>
                            <Input
                                placeholder="vip, premium, support (comma-separated)"
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                            />
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
                            data-testid="update-contact-btn"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Update Contact
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent data-testid="delete-contact-dialog">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this contact? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-destructive/90"
                            data-testid="confirm-delete-btn"
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
