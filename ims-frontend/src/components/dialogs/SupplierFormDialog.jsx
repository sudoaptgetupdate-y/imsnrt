// src/components/dialogs/SupplierFormDialog.jsx

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
    supplierCode: '',
    name: '',
    contactPerson: '',
    phone: '',
    address: ''
};

export default function SupplierFormDialog({ isOpen, setIsOpen, supplier, onSave }) {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        if (supplier) {
            setFormData({
                supplierCode: supplier.supplierCode || '',
                name: supplier.name || '',
                contactPerson: supplier.contactPerson || '',
                phone: supplier.phone || '',
                address: supplier.address || ''
            });
        } else {
            setFormData(initialFormData);
        }
    }, [supplier, isOpen]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = supplier ? `/suppliers/${supplier.id}` : '/suppliers';
        const method = supplier ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(supplier ? t('success_supplier_updated') : t('success_supplier_created'));
            onSave(); // Refresh the list
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || "An error occurred.");
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{supplier ? t('supplier_form_edit_title') : t('supplier_form_add_title')}</DialogTitle>
                    <DialogDescription>
                        {t('supplier_form_dialog_description')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="supplierCode">{t('supplier_form_code_label')}</Label>
                            <Input id="supplierCode" value={formData.supplierCode} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('supplier_form_name_label')}</Label>
                            <Input id="name" value={formData.name} onChange={handleInputChange} required />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contactPerson">{t('supplier_form_contact_label')}</Label>
                            <Input id="contactPerson" value={formData.contactPerson} onChange={handleInputChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">{t('supplier_form_phone_label')}</Label>
                            <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">{t('supplier_form_address_label')}</Label>
                        <Textarea id="address" value={formData.address} onChange={handleInputChange} rows={3} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>{t('cancel')}</Button>
                        <Button type="submit">{t('save')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}