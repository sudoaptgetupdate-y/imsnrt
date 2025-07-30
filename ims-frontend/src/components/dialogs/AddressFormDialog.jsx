// src/components/dialogs/AddressFormDialog.jsx

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";

const ADDRESS_MAX_LENGTH = 255;

export default function AddressFormDialog({ isOpen, setIsOpen, address, onSave }) {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        if (address) {
            setFormData({
                name: address.name || '',
                contactPerson: address.contactPerson || '',
                phone: address.phone || '',
                address: address.address || ''
            });
        } else {
            setFormData({ name: '', contactPerson: '', phone: '', address: '' });
        }
    }, [address, isOpen]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.address && formData.address.length > ADDRESS_MAX_LENGTH) {
            toast.error(t('error_address_length', { maxLength: ADDRESS_MAX_LENGTH }));
            return;
        }

        const url = address ? `/addresses/${address.id}` : '/addresses';
        const method = address ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(address ? t('success_address_updated') : t('success_address_created'));
            onSave();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || t('error_address_generic'));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{address ? t('address_form_edit_title') : t('address_form_add_title')}</DialogTitle>
                     <DialogDescription>
                        {t('address_form_dialog_description')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('address_form_name_label')}</Label>
                        <Input id="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contactPerson">{t('address_form_contact_label')}</Label>
                        <Input id="contactPerson" value={formData.contactPerson} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">{t('address_form_phone_label')}</Label>
                        <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">{t('address_form_address_label')}</Label>
                        <Textarea id="address" value={formData.address} onChange={handleInputChange} rows={3} />
                        <p className={`text-xs text-right ${formData.address.length > ADDRESS_MAX_LENGTH ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {formData.address.length} / {ADDRESS_MAX_LENGTH}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button type="submit">{t('save')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}