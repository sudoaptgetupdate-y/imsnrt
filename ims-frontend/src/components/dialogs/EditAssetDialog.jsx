// src/components/dialogs/EditAssetDialog.jsx

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { useTranslation } from "react-i18next"; // --- 1. Import useTranslation ---

export default function EditAssetDialog({ assetId, isOpen, setIsOpen, onSave }) {
    const { t } = useTranslation(); // --- 2. เรียกใช้ useTranslation ---
    const token = useAuthStore((state) => state.token);
    const [formData, setFormData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [selectedModelInfo, setSelectedModelInfo] = useState(null);

    useEffect(() => {
        if (assetId && isOpen) {
            const fetchAsset = async () => {
                setLoading(true);
                try {
                    const response = await axiosInstance.get(`/assets/${assetId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const assetData = response.data;
                    setFormData({
                        productModelId: assetData.productModelId,
                        assetCode: assetData.assetCode,
                        serialNumber: assetData.serialNumber || '',
                        macAddress: assetData.macAddress || '',
                        status: assetData.status,
                        notes: assetData.notes || '',
                    });
                    setSelectedModelInfo(assetData.productModel); 
                } catch (error) {
                    toast.error(t('error_fetch_asset')); // --- 3. แปลข้อความ ---
                    setIsOpen(false);
                } finally {
                    setLoading(false);
                }
            };
            fetchAsset();
        }
    }, [assetId, isOpen, token, t, setIsOpen]);

    const handleModelSelect = (model) => {
        if (model) {
            setFormData(prev => ({ ...prev, productModelId: model.id }));
            setSelectedModelInfo(model);
        }
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleStatusChange = (value) => {
        setFormData(prev => ({...prev, status: value}));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.put(`/assets/${assetId}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(t('success_asset_updated')); // --- 3. แปลข้อความ ---
            onSave();
            setIsOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update asset.");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    {/* --- 3. แปลข้อความ --- */}
                    <DialogTitle>{t('edit_asset_dialog_title')}</DialogTitle>
                    <DialogDescription>{t('edit_asset_dialog_description')}</DialogDescription>
                </DialogHeader>
                {loading ? (
                    <p>{t('loading_asset')}</p>
                ) : formData ? (
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="space-y-2">
                                <Label>{t('product_model_label')}</Label>
                                <ProductModelCombobox
                                    onSelect={handleModelSelect}
                                    initialModel={selectedModelInfo}
                                />
                            </div>
                            <div className="space-y-2">
                               <Label>{t('status_label')}</Label>
                               <Select value={formData.status} onValueChange={handleStatusChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="IN_WAREHOUSE">In Warehouse</SelectItem>
                                    <SelectItem value="ASSIGNED" disabled>Assigned</SelectItem>
                                    <SelectItem value="DEFECTIVE">Defective</SelectItem>
                                    <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                                </SelectContent>
                               </Select>
                           </div>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="assetCode">{t('asset_code_label')}</Label>
                                <Input id="assetCode" value={formData.assetCode} onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="serialNumber">{t('serial_number_label')}</Label>
                                <Input id="serialNumber" value={formData.serialNumber} onChange={handleInputChange} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="macAddress">{t('mac_address_label')}</Label>
                            <Input id="macAddress" value={formData.macAddress} onChange={handleInputChange} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">{t('notes_label')}</Label>
                            <Textarea id="notes" value={formData.notes} onChange={handleInputChange} />
                        </div>
                        
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>{t('cancel')}</Button>
                            <Button type="submit">{t('save_asset_button')}</Button>
                        </DialogFooter>
                    </form>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}