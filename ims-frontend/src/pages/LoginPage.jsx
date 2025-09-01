// src/pages/LoginPage.jsx

import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import useAuthStore from '@/store/authStore';
import axiosInstance from '@/api/axiosInstance';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// --- START: 1. Import รูปภาพ ---
import ntBackground from '@/assets/nt-background.png';
import ntLogo from '@/assets/nt-logo.png';
// --- END ---

export default function LoginPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const login = useAuthStore((state) => state.login);
    const token = useAuthStore((state) => state.token);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await axiosInstance.post('/auth/login', {
                username,
                password
            });
            
            const { token, user } = response.data;
            login(token, user);
            toast.success(t('welcome_message', { name: user.name }));
            navigate('/dashboard');

        } catch (error) {
            console.error("Login failed:", error);
            const errorMessage = error.response?.data?.error || t('login_failed_error');
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (token) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="flex items-center justify-center min-h-screen relative p-4">
             {/* --- START: 2. แก้ไข src --- */}
             <img 
                src={ntBackground}
                alt="Background"
                className="absolute inset-0 h-full w-full object-cover z-0"
            />
            {/* --- END --- */}
            
            <Card className="mx-auto w-full max-w-sm z-20 shadow-xl bg-white/80 backdrop-blur-lg border border-white/20">
                <CardHeader className="text-center flex flex-col items-center">
                    {/* --- START: 2. แก้ไข src --- */}
                    <img
                        src={ntLogo}
                        alt="Logo"
                        className="h-16 w-auto"
                    />
                    {/* --- END --- */}
                    <CardTitle className="text-2xl font-bold mt-4">
                        {t('login_title')}
                    </CardTitle>
                    <CardDescription>
                        {t('login_description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="username">{t('username_label')}</Label>
                                <Input 
                                    id="username" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)} 
                                    required
                                    autoFocus
                                    placeholder={t('username_placeholder')}
                                />
                            </div>
                            <div className="grid gap-2 relative">
                                <Label htmlFor="password">{t('password_label')}</Label>
                                <Input 
                                    id="password" 
                                    type={showPassword ? 'text' : 'password'}
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required
                                    placeholder={t('password_placeholder')}
                                    className="pr-10"
                                />
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute bottom-1 right-1 h-7 w-7"
                                    onClick={() => setShowPassword(prev => !prev)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    <span className="sr-only">{t('toggle_password_visibility')}</span>
                                </Button>
                            </div>
                            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isLoading ? t('logging_in_button') : t('login_button')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}