// src/components/dialogs/CustomerFormDialog.jsx

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { toast } from 'sonner';
import { useTranslation } from "react-i18next"; // --- 1. Import useTranslation ---

const initialFormData = {
    name: '',
    phone: '',
    address: ''
};

export default function CustomerFormDialog({ isOpen, setIsOpen, customer, onSave }) {
    const { t } = useTranslation(); // --- 2. เรียกใช้ useTranslation ---
    const token = useAuthStore((state) => state.token);
    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        if (customer) {
            setFormData({
                name: customer.name || '',
                phone: customer.phone || '',
                address: customer.address || ''
            });
        } else {
            setFormData(initialFormData);
        }
    }, [customer, isOpen]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = customer ? `/customers/${customer.id}` : '/customers';
        const method = customer ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // --- 3. แปลข้อความ ---
            toast.success(customer ? t('success_customer_updated') : t('success_customer_created'));
            onSave(); // Refresh the list
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || "An error occurred.");
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    {/* --- 3. แปลข้อความ --- */}
                    <DialogTitle>{customer ? t('customer_form_edit_title') : t('customer_form_add_title')}</DialogTitle>
                    <DialogDescription>
                        {t('customer_form_dialog_description')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                     <div className="space-y-2">
                        <Label htmlFor="name">{t('address_form_name_label')}</Label>
                        <Input id="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">{t('address_form_phone_label')}</Label>
                        <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">{t('address_form_address_label')}</Label>
                        <Textarea id="address" value={formData.address} onChange={handleInputChange} rows={3} />
                    </div>
                    <DialogFooter>
                        <Button type="submit">{t('save')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}