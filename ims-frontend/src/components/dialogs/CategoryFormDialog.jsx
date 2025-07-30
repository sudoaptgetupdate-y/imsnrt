// src/components/dialogs/CategoryFormDialog.jsx

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { toast } from 'sonner';
import { useTranslation } from "react-i18next"; // --- 1. Import useTranslation ---

const initialFormData = {
    name: '',
    requiresMacAddress: true,
    requiresSerialNumber: true
};

export default function CategoryFormDialog({ isOpen, setIsOpen, category, onSave }) {
    const { t } = useTranslation(); // --- 2. เรียกใช้ Hook ---
    const [formData, setFormData] = useState(initialFormData);
    const token = useAuthStore((state) => state.token);
    const isEditMode = !!category;

    useEffect(() => {
        if (isEditMode) {
            setFormData({
                name: category.name,
                requiresMacAddress: category.requiresMacAddress,
                requiresSerialNumber: category.requiresSerialNumber
            });
        } else {
            setFormData(initialFormData);
        }
    }, [category, isOpen]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData({ ...formData, [id]: value });
    };

    const handleSwitchChange = (id, checked) => {
        setFormData({ ...formData, [id]: checked });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode ? `/categories/${category.id}` : "/categories";
        const method = isEditMode ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Category ${isEditMode ? 'updated' : 'created'} successfully!`);
            onSave();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save category.`);
        }
    };
    
    // --- 3. เปลี่ยนข้อความเป็น t('...') ทั้งหมด ---
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? t('category_form_edit_title') : t('category_form_add_title')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('category_form_name')}</Label>
                        <Input id="name" value={formData.name} onChange={handleInputChange} required />
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="requiresSerialNumber"
                            checked={formData.requiresSerialNumber}
                            onCheckedChange={(checked) => handleSwitchChange('requiresSerialNumber', checked)}
                        />
                        <Label htmlFor="requiresSerialNumber">{t('tableHeader_requiresSn')}</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <Switch
                            id="requiresMacAddress"
                            checked={formData.requiresMacAddress}
                            onCheckedChange={(checked) => handleSwitchChange('requiresMacAddress', checked)}
                        />
                        <Label htmlFor="requiresMacAddress">{t('tableHeader_requiresMac')}</Label>
                    </div>
                    <DialogFooter>
                        <Button type="submit">{t('save')}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}