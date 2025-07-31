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
import { useTranslation } from "react-i18next";

const initialFormData = {
    customerCode: '',
    name: '',
    phone: '',
    address: ''
};

const ADDRESS_MAX_LENGTH = 255;

export default function CustomerFormDialog({ isOpen, setIsOpen, customer, onSave }) {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        if (customer) {
            setFormData({
                customerCode: customer.customerCode || '',
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

        if (formData.address && formData.address.length > ADDRESS_MAX_LENGTH) {
            toast.error(t('error_address_length', { maxLength: ADDRESS_MAX_LENGTH }));
            return;
        }

        const url = customer ? `/customers/${customer.id}` : '/customers';
        const method = customer ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(customer ? t('success_customer_updated') : t('success_customer_created'));
            onSave();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || "An error occurred.");
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{customer ? t('customer_form_edit_title') : t('customer_form_add_title')}</DialogTitle>
                    <DialogDescription>
                        {t('customer_form_dialog_description')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="customerCode">{t('customer_form_code')}</Label>
                            <Input id="customerCode" value={formData.customerCode} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('customer_form_name')}</Label>
                            <Input id="name" value={formData.name} onChange={handleInputChange} required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">{t('customer_form_phone')}</Label>
                        <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">{t('customer_form_address')}</Label>
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