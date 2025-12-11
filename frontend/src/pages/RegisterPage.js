import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Phone, Loader2 } from 'lucide-react';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (password !== confirmPassword) {
            setErrorMsg('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setErrorMsg('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        const result = await register(name, email, password);
        
        if (result.success) {
            navigate('/dashboard');
        } else {
            setErrorMsg(result.error);
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex" data-testid="register-page">
            {/* Left side - Background image */}
            <div 
                className="hidden lg:flex lg:w-1/2 relative"
                style={{
                    backgroundImage: 'url(https://images.unsplash.com/photo-1762433813475-e6b761cc23d0?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMG1pbmltYWwlMjBnZW9tZXRyaWMlMjBhcmNoaXRlY3R1cmFsJTIwYmFja2dyb3VuZCUyMG5ldXRyYWwlMjB0b25lc3xlbnwwfHx8fDE3NjUwNTczNzJ8MA&ixlib=rb-4.1.0&q=85)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary/60" />
                <div className="relative z-10 flex flex-col justify-center px-12 text-white">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Phone className="w-6 h-6" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>HelplineOS</span>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Join Your Team<br />Today
                    </h1>
                    <p className="text-lg text-white/80 max-w-md leading-relaxed">
                        Create your agent account and start managing customer calls efficiently.
                    </p>
                </div>
            </div>

            {/* Right side - Register form */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
                <div className="w-full max-w-md animate-fade-in">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <Phone className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>HelplineOS</span>
                    </div>

                    <Card className="border-0 shadow-none lg:shadow-sm lg:border">
                        <CardHeader className="space-y-1 pb-6">
                            <CardTitle className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                                Create account
                            </CardTitle>
                            <CardDescription className="text-muted-foreground">
                                Enter your details to get started
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {errorMsg && (
                                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="register-error">
                                        {errorMsg}
                                    </div>
                                )}
                                
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Full Name
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        className="h-11"
                                        data-testid="register-name-input"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="agent@helpline.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="h-11"
                                        data-testid="register-email-input"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Password
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Min. 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="h-11"
                                        data-testid="register-password-input"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider text-muted-foreground">
                                        Confirm Password
                                    </Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="Confirm your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="h-11"
                                        data-testid="register-confirm-password-input"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                                    disabled={isLoading}
                                    data-testid="register-submit-btn"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Creating account...
                                        </>
                                    ) : (
                                        'Create Account'
                                    )}
                                </Button>
                            </form>

                            <div className="mt-6 text-center text-sm text-muted-foreground">
                                Already have an account?{' '}
                                <Link 
                                    to="/login" 
                                    className="text-accent font-medium hover:underline"
                                    data-testid="login-link"
                                >
                                    Sign in
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
