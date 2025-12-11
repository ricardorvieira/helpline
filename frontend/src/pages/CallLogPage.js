import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { callsAPI, contactsAPI, freepbxAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
    Phone,
    Clock,
    User,
    Building,
    Mail,
    MapPin,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Plus,
    PhoneIncoming
} from 'lucide-react';

export default function CallLogPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [contactFound, setContactFound] = useState(null);
    const [existingContact, setExistingContact] = useState(null);
    const [isFromFreePBX, setIsFromFreePBX] = useState(false);
    
    // Query params from FreePBX redirect
    const contactIdParam = searchParams.get('contact');
    const phoneParam = searchParams.get('phone');
    const callEventIdParam = searchParams.get('callEventId');
    
    // Call form state
    const [callerNumber, setCallerNumber] = useState('');
    const [duration, setDuration] = useState('');
    const [callType, setCallType] = useState('inquiry');
    const [priority, setPriority] = useState('normal');
    const [status, setStatus] = useState('completed');
    const [notes, setNotes] = useState('');
    const [resolutionNotes, setResolutionNotes] = useState('');
    
    // New contact form state (for when contact doesn't exist)
    const [newContactName, setNewContactName] = useState('');
    const [newContactEmail, setNewContactEmail] = useState('');
    const [newContactAddress, setNewContactAddress] = useState('');
    const [newContactCompany, setNewContactCompany] = useState('');

    // Timer state
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);

    // Initialize from FreePBX redirect params
    useEffect(() => {
        const initFromParams = async () => {
            if (phoneParam) {
                setCallerNumber(phoneParam);
                setIsFromFreePBX(true);
                
                // If contact ID is provided, fetch contact details
                if (contactIdParam) {
                    try {
                        const response = await contactsAPI.getById(contactIdParam);
                        setExistingContact(response.data);
                        setContactFound(true);
                        toast.success(`Incoming call from ${response.data.name || phoneParam}`);
                    } catch (error) {
                        console.error('Failed to fetch contact:', error);
                        setContactFound(false);
                    }
                } else {
                    // New caller - contact will be created
                    setContactFound(false);
                    toast.info(`New caller: ${phoneParam}`);
                }
                
                // Auto-start timer for FreePBX calls
                setTimerRunning(true);
            }
        };
        
        initFromParams();
    }, [phoneParam, contactIdParam]);

    useEffect(() => {
        let interval;
        if (timerRunning) {
            interval = setInterval(() => {
                setTimerSeconds((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerRunning]);

    const formatTimerDisplay = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePhoneSearch = async () => {
        if (!callerNumber.trim()) {
            toast.error('Please enter a phone number');
            return;
        }

        setIsSearching(true);
        try {
            const response = await contactsAPI.getByPhone(callerNumber.trim());
            if (response.data.found) {
                setContactFound(true);
                setExistingContact(response.data.contact);
                toast.success('Contact found!');
            } else {
                setContactFound(false);
                setExistingContact(null);
                toast.info('New caller - contact will be created automatically');
            }
        } catch (error) {
            console.error('Error searching contact:', error);
            toast.error('Failed to search for contact');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!callerNumber.trim()) {
            toast.error('Please enter a caller number');
            return;
        }

        setIsSubmitting(true);

        try {
            const callData = {
                caller_number: callerNumber.trim(),
                duration: timerSeconds || parseInt(duration) || 0,
                call_type: callType,
                priority,
                status,
                notes: notes.trim() || null,
                resolution_notes: resolutionNotes.trim() || null,
                contact_id: existingContact?.id || contactIdParam || null
            };

            // Create the call (pass callEventId if from FreePBX)
            const callResponse = await callsAPI.create(callData, callEventIdParam);

            // If contact was auto-created and user provided extra info, update it
            if (contactFound === false && (newContactName || newContactEmail || newContactAddress || newContactCompany)) {
                const contactId = callResponse.data.contact_id;
                await contactsAPI.update(contactId, {
                    name: newContactName || null,
                    email: newContactEmail || null,
                    address: newContactAddress || null,
                    company: newContactCompany || null
                });
            }

            // Mark FreePBX event as processed
            if (callEventIdParam) {
                try {
                    await freepbxAPI.markProcessed(callEventIdParam);
                } catch (err) {
                    console.error('Failed to mark call event as processed:', err);
                }
            }

            toast.success('Call logged successfully!');
            navigate('/calls');
        } catch (error) {
            console.error('Error logging call:', error);
            toast.error(error.response?.data?.detail || 'Failed to log call');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleTimer = () => {
        if (timerRunning) {
            setTimerRunning(false);
            setDuration(timerSeconds.toString());
        } else {
            setTimerRunning(true);
            setTimerSeconds(0);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in" data-testid="call-log-page">
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Log New Call
                    </h1>
                    {isFromFreePBX && (
                        <Badge variant="secondary" className="bg-green-50 text-green-700 gap-1">
                            <PhoneIncoming className="w-3 h-3" />
                            Incoming Call
                        </Badge>
                    )}
                </div>
                <p className="text-muted-foreground mt-1">
                    {isFromFreePBX 
                        ? 'Incoming call detected. Timer started automatically.' 
                        : 'Record call details. New contacts are created automatically.'}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit}>
                        <Card className="border border-border">
                            <CardHeader>
                                <CardTitle className="text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                    Call Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Caller Number with Search */}
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Caller Number *</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                type="tel"
                                                placeholder="+1 (555) 123-4567"
                                                value={callerNumber}
                                                onChange={(e) => {
                                                    setCallerNumber(e.target.value);
                                                    if (!isFromFreePBX) {
                                                        setContactFound(null);
                                                        setExistingContact(null);
                                                    }
                                                }}
                                                className="pl-10 h-11"
                                                required
                                                disabled={isFromFreePBX}
                                                data-testid="caller-number-input"
                                            />
                                        </div>
                                        {!isFromFreePBX && (
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={handlePhoneSearch}
                                                disabled={isSearching || !callerNumber.trim()}
                                                data-testid="search-contact-btn"
                                            >
                                                {isSearching ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    'Lookup'
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                    {contactFound !== null && (
                                        <div className={`flex items-center gap-2 text-sm ${contactFound ? 'text-green-600' : 'text-amber-600'}`}>
                                            {contactFound ? (
                                                <><CheckCircle2 className="w-4 h-4" /> Contact found</>    
                                            ) : (
                                                <><AlertCircle className="w-4 h-4" /> New contact will be created</>    
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Duration with Timer */}
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Duration</Label>
                                    <div className="flex gap-2 items-center">
                                        <Button
                                            type="button"
                                            variant={timerRunning ? 'destructive' : 'outline'}
                                            onClick={toggleTimer}
                                            className="w-32"
                                            data-testid="timer-btn"
                                        >
                                            <Clock className="w-4 h-4 mr-2" />
                                            {timerRunning ? 'Stop' : 'Start Timer'}
                                        </Button>
                                        {(timerRunning || timerSeconds > 0) && (
                                            <span className="text-2xl font-mono font-bold text-primary" data-testid="timer-display">
                                                {formatTimerDisplay(timerSeconds)}
                                            </span>
                                        )}
                                        {!timerRunning && timerSeconds === 0 && (
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className="text-muted-foreground">or</span>
                                                <Input
                                                    type="number"
                                                    placeholder="Duration in seconds"
                                                    value={duration}
                                                    onChange={(e) => setDuration(e.target.value)}
                                                    className="h-11 max-w-40"
                                                    data-testid="duration-input"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Call Type, Priority, Status */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Call Type</Label>
                                        <Select value={callType} onValueChange={setCallType}>
                                            <SelectTrigger className="h-11" data-testid="call-type-select">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="inquiry">Inquiry</SelectItem>
                                                <SelectItem value="complaint">Complaint</SelectItem>
                                                <SelectItem value="support">Support</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Priority</Label>
                                        <Select value={priority} onValueChange={setPriority}>
                                            <SelectTrigger className="h-11" data-testid="priority-select">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="urgent">Urgent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
                                        <Select value={status} onValueChange={setStatus}>
                                            <SelectTrigger className="h-11" data-testid="status-select">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="in_progress">In Progress</SelectItem>
                                                <SelectItem value="completed">Completed</SelectItem>
                                                <SelectItem value="follow_up">Follow Up</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Call Notes</Label>
                                    <Textarea
                                        placeholder="Describe the call details..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        data-testid="notes-textarea"
                                    />
                                </div>

                                {/* Resolution Notes */}
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Resolution Notes</Label>
                                    <Textarea
                                        placeholder="How was the issue resolved?"
                                        value={resolutionNotes}
                                        onChange={(e) => setResolutionNotes(e.target.value)}
                                        rows={2}
                                        data-testid="resolution-textarea"
                                    />
                                </div>

                                {/* Submit */}
                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
                                    disabled={isSubmitting || timerRunning}
                                    data-testid="submit-call-btn"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Logging Call...</>
                                    ) : (
                                        'Log Call'
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </form>
                </div>

                {/* Contact Info Panel */}
                <div className="lg:col-span-1">
                    {existingContact ? (
                        <Card className="border border-border sticky top-24">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                    <User className="w-5 h-5" />
                                    Contact Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Name</p>
                                    <p className="font-medium">{existingContact.name || 'Not set'}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Phone</p>
                                    <p className="font-medium">{existingContact.phone_number}</p>
                                </div>
                                {existingContact.email && (
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Email</p>
                                        <p className="text-sm">{existingContact.email}</p>
                                    </div>
                                )}
                                {existingContact.company && (
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Company</p>
                                        <p className="text-sm">{existingContact.company}</p>
                                    </div>
                                )}
                                {existingContact.tags?.length > 0 && (
                                    <div>
                                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Tags</p>
                                        <div className="flex flex-wrap gap-1">
                                            {existingContact.tags.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="text-xs">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : contactFound === false ? (
                        <Card className="border border-border sticky top-24">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                    <Plus className="w-5 h-5" />
                                    New Contact
                                </CardTitle>
                                <CardDescription>
                                    Add details for the new contact (optional)
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Contact name"
                                            value={newContactName}
                                            onChange={(e) => setNewContactName(e.target.value)}
                                            className="pl-10"
                                            data-testid="new-contact-name-input"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            type="email"
                                            placeholder="Email address"
                                            value={newContactEmail}
                                            onChange={(e) => setNewContactEmail(e.target.value)}
                                            className="pl-10"
                                            data-testid="new-contact-email-input"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Company</Label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Company name"
                                            value={newContactCompany}
                                            onChange={(e) => setNewContactCompany(e.target.value)}
                                            className="pl-10"
                                            data-testid="new-contact-company-input"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Address</Label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Address"
                                            value={newContactAddress}
                                            onChange={(e) => setNewContactAddress(e.target.value)}
                                            className="pl-10"
                                            data-testid="new-contact-address-input"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border border-border border-dashed sticky top-24">
                            <CardContent className="py-12 text-center">
                                <Phone className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                                <p className="text-muted-foreground">Enter a phone number and click Lookup to see contact info</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
