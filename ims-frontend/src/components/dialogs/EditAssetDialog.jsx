// src/components/dialogs/EditAssetDialog.jsx

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { useTranslation } from "react-i18next";
import { SupplierCombobox } from "../ui/SupplierCombobox"; // Assuming you have this component

export default function EditAssetDialog({ isOpen, setIsOpen, asset, onSave }) {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const [formData, setFormData] = useState(null);
    const [selectedModelInfo, setSelectedModelInfo] = useState(null);
    const [initialSupplier, setInitialSupplier] = useState(null);
    const [isMacRequired, setIsMacRequired] = useState(true);
    const [isSerialRequired, setIsSerialRequired] = useState(true);

    useEffect(() => {
        if (asset) {
            setFormData({
                productModelId: asset.productModelId,
                assetCode: asset.assetCode,
                serialNumber: asset.serialNumber || '',
                macAddress: asset.macAddress || '',
                status: asset.status,
                notes: asset.notes || '',
                supplierId: asset.supplierId || "",
            });
            setSelectedModelInfo(asset.productModel);
            setInitialSupplier(asset.supplier);
            setIsMacRequired(asset.productModel.category.requiresMacAddress);
            setIsSerialRequired(asset.productModel.category.requiresSerialNumber);
        }
    }, [asset]);

    const handleModelSelect = (model) => {
        if (model) {
            setFormData(prev => ({ ...prev, productModelId: model.id }));
            setSelectedModelInfo(model);
            setIsMacRequired(model.category.requiresMacAddress);
            setIsSerialRequired(model.category.requiresSerialNumber);
        }
    };
    
    const handleSupplierSelect = (supplierId) => {
        setFormData(prev => ({...prev, supplierId: supplierId}));
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
            await axiosInstance.put(`/assets/${asset.id}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(t('success_asset_updated'));
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
                    <DialogTitle>{t('edit_asset_dialog_title')}</DialogTitle>
                    <DialogDescription>{t('edit_asset_dialog_description')}</DialogDescription>
                </DialogHeader>
                {!formData ? (
                    <p>{t('loading_asset')}</p>
                ) : (
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
                        
                        <div className="space-y-2">
                           <Label>{t('supplier_label')}</Label>
                           <SupplierCombobox
                                selectedValue={formData.supplierId}
                                onSelect={handleSupplierSelect}
                                initialSupplier={initialSupplier}
                           />
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="assetCode">{t('asset_code_label')}</Label>
                                <Input id="assetCode" value={formData.assetCode} onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="serialNumber">{t('serial_number_label')} {!isSerialRequired && <span className="text-xs text-slate-500 ml-2">(Not Required)</span>}</Label>
                                <Input id="serialNumber" value={formData.serialNumber} onChange={handleInputChange} disabled={!isSerialRequired} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="macAddress">{t('mac_address_label')} {!isMacRequired && <span className="text-xs text-slate-500 ml-2">(Not Required)</span>}</Label>
                            <Input id="macAddress" value={formData.macAddress} onChange={handleInputChange} disabled={!isMacRequired} />
                        </div>
                        
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>{t('cancel')}</Button>
                            <Button type="submit">{t('save_asset_button')}</Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}