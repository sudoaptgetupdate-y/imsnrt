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
import { useTranslation } from 'react-i18next'; // --- 1. Import useTranslation ---

export default function ChangePasswordPage() {
    const { t } = useTranslation(); // --- 2. เรียกใช้ useTranslation ---
    const token = useAuthStore((state) => state.token);
    const navigate = useNavigate();
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Client-side validation
        if (newPassword !== confirmPassword) {
            toast.error(t('password_mismatch_error')); // --- 3. แปลข้อความ ---
            return;
        }
        if (newPassword.length < 6) {
             toast.error(t('password_length_error')); // --- 3. แปลข้อความ ---
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
                    {/* --- 3. แปลข้อความ --- */}
                    <CardTitle>{t('change_password_title')}</CardTitle>
                    <CardDescription>{t('change_password_description')}</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">{t('change_password_current_label')}</Label>
                            <Input 
                                id="currentPassword" 
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">{t('change_password_new_label')}</Label>
                            <Input 
                                id="newPassword" 
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">{t('change_password_confirm_label')}</Label>
                            <Input 
                                id="confirmPassword" 
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
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