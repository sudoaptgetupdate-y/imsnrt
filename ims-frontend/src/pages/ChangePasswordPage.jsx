// src/pages/ChangePasswordPage.jsx

import { useState } from 'react';
import useAuthStore from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
// --- START: เพิ่มการ import ไอคอน ---
import { Eye, EyeOff } from 'lucide-react';
// --- END ---

export default function ChangePasswordPage() {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const navigate = useNavigate();
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // --- START: เพิ่ม State สำหรับการแสดงผลรหัสผ่าน ---
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    // --- END ---

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (newPassword !== confirmPassword) {
            toast.error(t('password_mismatch_error'));
            return;
        }
        if (newPassword.length < 6) {
             toast.error(t('password_length_error'));
            return;
        }

        setIsLoading(true);
        try {
            const response = await axiosInstance.patch('/users/me/password', 
                { currentPassword, newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(response.data.message);
            navigate('/profile'); 

        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to change password.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>{t('change_password_title')}</CardTitle>
                    <CardDescription>{t('change_password_description')}</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {/* --- START: ปรับปรุง Current Password Input --- */}
                        <div className="space-y-2 relative">
                            <Label htmlFor="currentPassword">{t('change_password_current_label')}</Label>
                            <Input 
                                id="currentPassword" 
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required 
                                className="pr-10"
                            />
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="absolute bottom-1 right-1 h-7 w-7"
                                onClick={() => setShowCurrentPassword(prev => !prev)}
                            >
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                <span className="sr-only">Toggle current password visibility</span>
                            </Button>
                        </div>
                        {/* --- END --- */}

                        {/* --- START: ปรับปรุง New Password Input --- */}
                        <div className="space-y-2 relative">
                            <Label htmlFor="newPassword">{t('change_password_new_label')}</Label>
                            <Input 
                                id="newPassword" 
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required 
                                className="pr-10"
                            />
                             <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="absolute bottom-1 right-1 h-7 w-7"
                                onClick={() => setShowNewPassword(prev => !prev)}
                            >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                <span className="sr-only">Toggle new password visibility</span>
                            </Button>
                        </div>
                        {/* --- END --- */}

                        {/* --- START: ปรับปรุง Confirm Password Input --- */}
                        <div className="space-y-2 relative">
                            <Label htmlFor="confirmPassword">{t('change_password_confirm_label')}</Label>
                            <Input 
                                id="confirmPassword" 
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="pr-10"
                            />
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="absolute bottom-1 right-1 h-7 w-7"
                                onClick={() => setShowConfirmPassword(prev => !prev)}
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                <span className="sr-only">Toggle confirm password visibility</span>
                            </Button>
                        </div>
                        {/* --- END --- */}
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? t('saving') : t('change_password_button')}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}   