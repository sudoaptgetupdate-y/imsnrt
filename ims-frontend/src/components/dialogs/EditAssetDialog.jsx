import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { SupplierCombobox } from "@/components/ui/SupplierCombobox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

const formatMacAddress = (value) => {
    const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (cleaned.length === 0) return '';
    return cleaned.match(/.{1,2}/g)?.slice(0, 6).join(':') || cleaned;
};

const validateMacAddress = (mac) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

// ... (Asset statuses remain the same) ...
const ASSET_STATUSES = [
  "IN_WAREHOUSE",
  "ASSIGNED",
  "DEFECTIVE",
  "IN_REPAIR",
  "DECOMMISSIONED"
];

export default function EditAssetDialog({ assetId, isOpen, setIsOpen, onSave }) {
    const { t } = useTranslation();
    const [asset, setAsset] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    
    // --- START: PHASE 6 (1. เพิ่ม purchasePrice ใน state) ---
    const [formData, setFormData] = useState({
        assetCode: '',
        serialNumber: '',
        macAddress: '',
        notes: '',
        status: '',
        purchasePrice: '' 
    });
    // --- END: PHASE 6 ---
    
    const [selectedModel, setSelectedModel] = useState(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [categoryInfo, setCategoryInfo] = useState({
        name: '',
        requiresSerialNumber: false,
        requiresMacAddress: false
    });
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        if (selectedModel) {
            setCategoryInfo({
                name: selectedModel.category.name,
                requiresSerialNumber: selectedModel.category.requiresSerialNumber,
                requiresMacAddress: selectedModel.category.requiresMacAddress
            });
        } else {
            setCategoryInfo({ name: '', requiresSerialNumber: false, requiresMacAddress: false });
        }
    }, [selectedModel]);
    
    useEffect(() => {
        const fetchAsset = async () => {
            if (assetId && isOpen) {
                setIsFetching(true);
                try {
                    const response = await axiosInstance.get(`/assets/${assetId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const assetData = response.data;
                    setAsset(assetData);
                    
                    // --- START: PHASE 6 (2. Set purchasePrice ใน form data) ---
                    setFormData({
                        assetCode: assetData.assetCode || '',
                        serialNumber: assetData.serialNumber || '',
                        macAddress: formatMacAddress(assetData.macAddress) || '',
                        notes: assetData.notes || '',
                        status: assetData.status || '',
                        purchasePrice: assetData.purchasePrice || '' 
                    });
                    // --- END: PHASE 6 ---
                    
                    setSelectedModel(assetData.productModel);
                    setSelectedSupplierId(assetData.supplierId ? String(assetData.supplierId) : "");
                } catch (error) {
                    toast.error(t('error_fetch_asset'));
                    handleClose();
                } finally {
                    setIsFetching(false);
                }
            }
        };
        fetchAsset();
    }, [assetId, isOpen, token, t]);
    
    const handleChange = (e) => {
        const { id, value } = e.target;
        let processedValue = value;
        if (id === 'macAddress') {
            processedValue = formatMacAddress(value);
        } else if (id !== 'notes') {
            processedValue = value.toUpperCase();
        }
        setFormData(prev => ({ ...prev, [id]: processedValue }));
    };

    const handleStatusChange = (value) => {
        setFormData(prev => ({ ...prev, status: value }));
    };
    
    const handleSubmit = async () => {
        setIsLoading(true);

        const { assetCode, serialNumber, macAddress, notes, status, purchasePrice } = formData;

        if (!selectedModel) {
            toast.error(t('error_select_model'));
            setIsLoading(false);
            return;
        }
        if (!selectedSupplierId) {
            toast.error(t('error_select_supplier'));
            setIsLoading(false);
            return;
        }
        if (!assetCode.trim()) {
            toast.error(t('error_asset_code_required'));
            setIsLoading(false);
            return;
        }

        const { requiresSerialNumber, requiresMacAddress } = categoryInfo;
        if (requiresSerialNumber && !serialNumber.trim()) {
            toast.error(t('error_serial_required_category'));
            setIsLoading(false);
            return;
        }
        if (requiresMacAddress && !macAddress.trim()) {
            toast.error(t('error_mac_required_category'));
            setIsLoading(false);
            return;
        }
        if (macAddress && !validateMacAddress(macAddress.trim())) {
            toast.error(t('error_invalid_mac'));
            setIsLoading(false);
            return;
        }

        // --- START: PHASE 6 (3. ตรวจสอบ purchasePrice) ---
        const parsedPurchasePrice = parseFloat(purchasePrice);
        if (purchasePrice !== '' && (isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0)) {
            toast.error("Purchase Price must be a valid non-negative number.");
            setIsLoading(false);
            return;
        }
        // --- END: PHASE 6 ---

        try {
            // --- START: PHASE 6 (4. เพิ่ม purchasePrice และ supplierId ใน payload) ---
            const payload = {
                productModelId: selectedModel.id,
                supplierId: parseInt(selectedSupplierId),
                assetCode: assetCode.trim(),
                serialNumber: serialNumber.trim() || null,
                macAddress: macAddress.trim() || null,
                notes: notes.trim() || null,
                status: status,
                purchasePrice: purchasePrice ? parsedPurchasePrice : null
            };
            // --- END: PHASE 6 ---
            
            await axiosInstance.put(`/assets/${assetId}`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(t('success_asset_updated'));
            onSave();
            handleClose();

        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update asset.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClose = () => {
        setIsOpen(false);
        setAsset(null);
        setSelectedModel(null);
        setSelectedSupplierId("");
        // Reset form data
        setFormData({
            assetCode: '', serialNumber: '', macAddress: '', notes: '', status: '', purchasePrice: ''
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('edit_asset_dialog_title')}</DialogTitle>
                    <DialogDescription>{t('edit_asset_dialog_description')}</DialogDescription>
                </DialogHeader>

                {isFetching ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                        <span>{t('loading_asset')}</span>
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="productModel">{t('product_model_label')} <span className="text-red-500">*</span></Label>
                                <ProductModelCombobox onSelect={setSelectedModel} selectedValue={selectedModel} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">{t('category_label')}</Label>
                                <Input id="category" value={categoryInfo.name} disabled readOnly />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="assetCode">{t('asset_code_label')} <span className="text-red-500">*</span></Label>
                            <Input id="assetCode" value={formData.assetCode} onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="serialNumber">
                                    {t('serial_number_label')}
                                    {categoryInfo.requiresSerialNumber && <span className="text-red-500 ml-1">*</span>}
                                </Label>
                                <Input id="serialNumber" value={formData.serialNumber} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="macAddress">
                                    {t('mac_address_label')}
                                    {categoryInfo.requiresMacAddress && <span className="text-red-500 ml-1">*</span>}
                                </Label>
                                <Input id="macAddress" value={formData.macAddress} onChange={handleChange} placeholder={t('mac_address_placeholder')} />
                            </div>
                        </div>

                        {/* --- START: PHASE 6 (5. เพิ่มช่องกรอก Supplier และ Purchase Price) --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="supplier">{t('supplier_label')} <span className="text-red-500">*</span></Label>
                                <SupplierCombobox
                                    selectedValue={selectedSupplierId}
                                    onSelect={(supplier) => setSelectedSupplierId(supplier ? String(supplier.id) : "")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="purchasePrice">Purchase Price (Cost)</Label>
                                <Input 
                                    id="purchasePrice" 
                                    type="number"
                                    placeholder="Enter cost price..."
                                    value={formData.purchasePrice} 
                                    onChange={handleChange} 
                                />
                            </div>
                        </div>
                        {/* --- END: PHASE 6 --- */}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="status">{t('status_label')}</Label>
                                <Select onValueChange={handleStatusChange} value={formData.status}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ASSET_STATUSES.map(status => (
                                            <SelectItem key={status} value={status}>
                                                {t(`status_${status.toLowerCase()}`)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="assignedTo">{t('assigned_to_label')}</Label>
                                <Input id="assignedTo" value={asset?.assignedTo?.name || '---'} disabled readOnly />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">{t('notes_label')}</Label>
                            <Input id="notes" value={formData.notes} onChange={handleChange} />
                        </div>
                    </div>
                )}
                
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">{t('cancel')}</Button></DialogClose>
                    <Button onClick={handleSubmit} disabled={isLoading || isFetching}>
                        {isLoading ? t('saving') : t('save_asset_button')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}