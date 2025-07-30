import { useEffect, useState } from 'react';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next'; // 1. Import useTranslation

export default function CompanyProfilePage() {
    const { t } = useTranslation(); // 2. Initialize t function
    const token = useAuthStore((state) => state.token);
    const [profile, setProfile] = useState({
        name: '',
        addressLine1: '',
        addressLine2: '',
        phone: '',
        taxId: ''
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) return;
            try {
                const response = await axiosInstance.get('/company-profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data) {
                    setProfile(response.data);
                }
            } catch (error) {
                toast.error("Failed to load company profile.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [token]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setProfile(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.put('/company-profile', profile, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Company profile updated successfully!");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update profile.");
        }
    };

    if (isLoading) {
        return <p>Loading company profile...</p>;
    }

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Building />
                    {t('company_profile_title')}
                </CardTitle>
                <CardDescription>
                    {t('company_profile_description')}
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('company_profile_name_label')}</Label>
                        <Input id="name" value={profile.name || ''} onChange={handleInputChange} placeholder={t('company_profile_name_placeholder')} />
                    </div>

                    <Separator />
                    
                    <div className="space-y-4">
                        <h3 className="text-md font-medium">{t('company_profile_address_info')}</h3>
                        <div className="space-y-2">
                            <Label htmlFor="addressLine1">{t('company_profile_address1_label')}</Label>
                            <Textarea id="addressLine1" value={profile.addressLine1 || ''} onChange={handleInputChange} placeholder={t('company_profile_address1_placeholder')} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="addressLine2">{t('company_profile_address2_label')}</Label>
                            <Input id="addressLine2" value={profile.addressLine2 || ''} onChange={handleInputChange} placeholder={t('company_profile_address2_placeholder')} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">{t('company_profile_phone_label')}</Label>
                                <Input id="phone" value={profile.phone || ''} onChange={handleInputChange} placeholder={t('company_profile_phone_placeholder')} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="taxId">{t('company_profile_tax_id_label')}</Label>
                                <Input id="taxId" value={profile.taxId || ''} onChange={handleInputChange} placeholder={t('company_profile_tax_id_placeholder')} />
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit">{t('company_profile_save_button')}</Button>
                </CardFooter>
            </form>
        </Card>
    );
}