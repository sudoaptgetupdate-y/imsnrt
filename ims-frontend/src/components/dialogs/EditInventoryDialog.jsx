//src/components/dialogs/EditInventoryDialog.jsx

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { SupplierCombobox } from "@/components/ui/SupplierCombobox";
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

// (Helper functions ย้ายมาจาก InventoryPage)
const displayFormattedMac = (mac) => {
    if (!mac || mac.length !== 12) {
        return mac || '-';
    }
    return mac.match(/.{1,2}/g)?.join(':').toUpperCase() || mac;
};

const formatMacAddress = (value) => {
  const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (cleaned.length === 0) return '';
  return cleaned.match(/.{1,2}/g)?.slice(0, 6).join(':') || cleaned;
};

const validateMacAddress = (mac) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

const initialEditFormData = {
    serialNumber: "",
    macAddress: "",
    productModelId: "",
    status: "IN_STOCK",
    supplierId: "",
    notes: "",
    purchasePrice: "" // (รวม Purchase Price)
};

export default function EditInventoryDialog({ isOpen, onClose, onSave, itemId }) {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    
    // (State ทั้งหมดที่เกี่ยวกับ Edit ถูกย้ายมาที่นี่)
    const [isEditLoading, setIsEditLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [editFormData, setEditFormData] = useState(initialEditFormData);
    const [selectedModelInfo, setSelectedModelInfo] = useState(null);
    const [initialSupplier, setInitialSupplier] = useState(null);
    const [isMacRequired, setIsMacRequired] = useState(true);
    const [isSerialRequired, setIsSerialRequired] = useState(true);

    // Fetch Item Data when Dialog Opens
    useEffect(() => {
        if (isOpen && itemId) {
            const fetchItemData = async () => {
                setIsFetching(true);
                try {
                    // (เราจะ fetch ข้อมูลล่าสุดเสมอ แทนการใช้ข้อมูลจากตารางโดยตรง เพื่อความถูกต้อง)
                    // หมายเหตุ: API GET /inventory/:id ต้องมีอยู่ (ซึ่งมีอยู่แล้วใน inventoryController.js)
                    const response = await axiosInstance.get(`/inventory/${itemId}`, {
                         headers: { Authorization: `Bearer ${token}` }
                    });
                    
                    const item = response.data; // (สมมติว่า API นี้ return item object ที่มี productModel และ supplier)

                    if (!item) {
                        toast.error("Failed to fetch item details.");
                        onClose();
                        return;
                    }
                    
                    setEditFormData({
                        serialNumber: item.serialNumber || '',
                        macAddress: item.macAddress ? displayFormattedMac(item.macAddress) : '',
                        productModelId: item.productModelId,
                        status: item.status,
                        supplierId: item.supplierId || "",
                        notes: item.notes || "",
                        purchasePrice: item.purchasePrice || ''
                    });
                    setSelectedModelInfo(item.productModel);
                    setInitialSupplier(item.supplier); // (ต้องแน่ใจว่า GET /inventory/:id include supplier)
                    setIsMacRequired(item.productModel.category.requiresMacAddress);
                    setIsSerialRequired(item.productModel.category.requiresSerialNumber);

                } catch (error) {
                    toast.error("Error fetching item data.");
                    onClose();
                } finally {
                    setIsFetching(false);
                }
            };
            fetchItemData();
        } else if (!isOpen) {
            // Reset form when closed
            setEditFormData(initialEditFormData);
            setSelectedModelInfo(null);
            setInitialSupplier(null);
        }
    }, [isOpen, itemId, token, onClose]);


    const handleEditInputChange = (e) => {
        const { id, value } = e.target;
        // Only uppercase serialNumber
        const processedValue = (id === 'serialNumber') ? value.toUpperCase() : value;
        setEditFormData({ ...editFormData, [id]: processedValue });
    };

    const handleEditMacAddressChange = (e) => {
        const formatted = formatMacAddress(e.target.value);
        setEditFormData({ ...editFormData, macAddress: formatted });
    };

    const handleEditSupplierSelect = (supplierObject) => {
        setEditFormData(prev => ({ ...prev, supplierId: supplierObject ? String(supplierObject.id) : "" }));
    };

    const handleEditModelSelect = (model) => {
        if (model) {
            setEditFormData(prev => ({ ...prev, productModelId: model.id }));
            setSelectedModelInfo(model);
            setIsMacRequired(model.category.requiresMacAddress);
            setIsSerialRequired(model.category.requiresSerialNumber);
            if (!model.category.requiresMacAddress) setEditFormData(prev => ({ ...prev, macAddress: '' }));
            if (!model.category.requiresSerialNumber) setEditFormData(prev => ({ ...prev, serialNumber: '' }));
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsEditLoading(true);
        
        if (editFormData.macAddress && !validateMacAddress(editFormData.macAddress)) {
            toast.error("Invalid MAC Address format. Please use XX:XX:XX:XX:XX:XX format.");
            setIsEditLoading(false);
            return;
        }
        if (isMacRequired && !editFormData.macAddress?.trim()) {
            toast.error("MAC Address is required for this product category.");
            setIsEditLoading(false);
            return;
        }
        if (!editFormData.productModelId) {
            toast.error("Please select a Product Model.");
            setIsEditLoading(false);
            return;
        }
        if (isSerialRequired && !editFormData.serialNumber?.trim()) {
            toast.error("Serial Number is required for this product category.");
            setIsEditLoading(false);
            return;
        }

        const parsedPurchasePrice = parseFloat(editFormData.purchasePrice);
        if (editFormData.purchasePrice && (isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0)) {
             toast.error("Purchase Price must be a valid non-negative number.");
             setIsEditLoading(false);
             return;
        }

        const payload = {
            serialNumber: editFormData.serialNumber || null,
            macAddress: editFormData.macAddress ? editFormData.macAddress.replace(/[:-\s]/g, '') : null,
            productModelId: parseInt(editFormData.productModelId, 10),
            status: editFormData.status,
            supplierId: editFormData.supplierId ? parseInt(editFormData.supplierId, 10) : null,
            notes: editFormData.notes || null,
            purchasePrice: editFormData.purchasePrice ? parsedPurchasePrice : null,
        };
        try {
            await axiosInstance.put(`/inventory/${itemId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Item updated successfully!`);
            onSave(); // (เรียก onSave เพื่อ refresh ข้อมูลในตารางแม่)
            onClose(); // (ปิด Dialog)
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save item.`);
        } finally {
            setIsEditLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>{t('edit')} Item</DialogTitle></DialogHeader>
                
                {isFetching ? (
                    <div className="flex justify-center items-center h-60">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                             <Label>{t('tableHeader_productModel')}</Label>
                             <ProductModelCombobox 
                                onSelect={handleEditModelSelect} 
                                initialModel={selectedModelInfo} 
                             />
                        </div>
                        {selectedModelInfo && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>{t('tableHeader_category')}</Label><Input value={selectedModelInfo.category.name} disabled /></div>
                                <div className="space-y-2"><Label>{t('tableHeader_brand')}</Label><Input value={selectedModelInfo.brand.name} disabled /></div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>{t('suppliers')}</Label>
                            <SupplierCombobox
                                selectedValue={editFormData.supplierId}
                                onSelect={handleEditSupplierSelect}
                                initialSupplier={initialSupplier}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="serialNumber">{t('tableHeader_serialNumber')} {isSerialRequired && <span className="text-red-500 ml-1">*</span>} {!isSerialRequired && <span className="text-xs text-slate-500 ml-2">({t('not_required_label')})</span>}</Label>
                            <Input id="serialNumber" value={editFormData.serialNumber || ''} onChange={handleEditInputChange} required={isSerialRequired} />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="macAddress">{t('tableHeader_macAddress')} {isMacRequired && <span className="text-red-500 ml-1">*</span>} {!isMacRequired && <span className="text-xs text-slate-500 ml-2">({t('not_required_label')})</span>}</Label>
                             <Input
                                id="macAddress"
                                value={editFormData.macAddress || ''}
                                onChange={handleEditMacAddressChange}
                                required={isMacRequired}
                                maxLength={17}
                                placeholder="AA:BB:CC:DD:EE:FF"
                             />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="purchasePrice">Purchase Price (Cost)</Label>
                                <Input
                                    id="purchasePrice"
                                    type="number"
                                    placeholder="Enter cost price..."
                                    value={editFormData.purchasePrice}
                                    onChange={handleEditInputChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">{t('tableHeader_status')}</Label>
                                <Input id="status" value={editFormData.status} disabled />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">{t('notes')}</Label>
                            <Textarea
                                id="notes"
                                value={editFormData.notes}
                                onChange={handleEditInputChange}
                                placeholder="Add or edit notes for this item..."
                                rows={3}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
                            <Button type="submit" disabled={isEditLoading || isFetching}>
                                {isEditLoading ? t('saving') : t('save')}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}