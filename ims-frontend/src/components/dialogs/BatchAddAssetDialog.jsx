// src/components/dialogs/BatchAddAssetDialog.jsx

import { useState, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { SupplierCombobox } from "@/components/ui/SupplierCombobox";
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { PlusCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const MAX_ASSETS_MANUAL = 10;

const formatMacAddress = (value) => {
    const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (cleaned.length === 0) return '';
    return cleaned.match(/.{1,2}/g)?.slice(0, 6).join(':') || cleaned;
};

const validateMacAddress = (mac) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

export default function BatchAddAssetDialog({ isOpen, setIsOpen, onSave }) {
    const { t } = useTranslation();
    const [selectedModel, setSelectedModel] = useState(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [manualItems, setManualItems] = useState([{ assetCode: '', serialNumber: '', macAddress: '' }]);
    const [listText, setListText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const token = useAuthStore((state) => state.token);

    const inputRefs = useRef([]);
    const firstInputRef = useRef(null);

    useEffect(() => {
        if (isOpen && selectedModel) {
            setTimeout(() => {
                firstInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen, selectedModel]);

    const handleModelSelect = (model) => {
        setSelectedModel(model);
    };

    // --- START: แก้ไขส่วนนี้ ---
    const handleInputChange = (e, index, field) => {
        const { value } = e.target;
        let processedValue = value;

        if (field === 'macAddress') {
            processedValue = formatMacAddress(value);
        } else {
            processedValue = value.toUpperCase();
        }

        const newItems = [...manualItems];
        newItems[index][field] = processedValue;
        setManualItems(newItems);
        // ** ลบ Logic setTimeout ที่เกี่ยวกับ scanner ออกไปทั้งหมด **
    };
    // --- END: แก้ไขส่วนนี้ ---

    const addManualItemRow = () => {
        if (manualItems.length < MAX_ASSETS_MANUAL) {
            setManualItems([...manualItems, { assetCode: '', serialNumber: '', macAddress: '' }]);
            setTimeout(() => {
                const nextIndex = manualItems.length * 3;
                inputRefs.current[nextIndex]?.focus();
            }, 100);
        } else {
            toast.info(t('max_assets_info', { max: MAX_ASSETS_MANUAL }));
        }
    };

    const removeManualItemRow = (index) => {
        const newItems = manualItems.filter((_, i) => i !== index);
        setManualItems(newItems);
    };

    const handleKeyDown = (e, index, field) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const isMacRequired = selectedModel?.category?.requiresMacAddress;
            const snIndex = index * 3 + 1;
            const macIndex = index * 3 + 2;

            if (field === 'assetCode') {
                inputRefs.current[snIndex]?.focus();
            } else if (field === 'serialNumber') {
                if (isMacRequired) {
                    inputRefs.current[macIndex]?.focus();
                } else {
                    if (index === manualItems.length - 1) {
                        addManualItemRow();
                    } else {
                        const nextAssetCodeIndex = (index + 1) * 3;
                        inputRefs.current[nextAssetCodeIndex]?.focus();
                    }
                }
            } else if (field === 'macAddress') {
                const currentItem = manualItems[index];
                
                if (isMacRequired && currentItem.macAddress.trim() !== '' && !validateMacAddress(currentItem.macAddress)) {
                    toast.error(t('error_invalid_mac'));
                    return;
                }

                if (index === manualItems.length - 1) {
                    if (!isMacRequired || (isMacRequired && currentItem.macAddress.trim() !== '')) {
                        addManualItemRow();
                    }
                } else {
                    const nextAssetCodeIndex = (index + 1) * 3;
                    inputRefs.current[nextAssetCodeIndex]?.focus();
                }
            }
        }
    };

    const handleSubmit = async (activeTab) => {
        if (!selectedModel) {
            toast.error(t('error_select_model'));
            return;
        }
        if (!selectedSupplierId) {
            toast.error(t('error_select_supplier'));
            return;
        }
        setIsLoading(true);

        let itemsPayload = [];
        let hasError = false;
        const { requiresSerialNumber, requiresMacAddress } = selectedModel.category;

        if (activeTab === 'manual') {
            itemsPayload = manualItems
                .filter(item => item.assetCode || item.serialNumber || item.macAddress)
                .map(item => {
                    if (!item.assetCode.trim()) hasError = true;
                    if (requiresSerialNumber && !item.serialNumber?.trim()) hasError = true;
                    if (requiresMacAddress && !item.macAddress?.trim()) hasError = true;
                    if (requiresMacAddress && item.macAddress && !validateMacAddress(item.macAddress)) {
                        toast.error(`${t('error_invalid_mac')} (${item.assetCode})`);
                        hasError = true;
                    }
                    return {
                        assetCode: item.assetCode.trim(),
                        serialNumber: item.serialNumber.trim() || null,
                        macAddress: item.macAddress.trim() || null,
                    }
                });
        } else {
            itemsPayload = listText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .map(line => {
                    const parts = line.split(/[,\t]/).map(part => part.trim());
                    const assetCode = parts[0];
                    if (!assetCode) hasError = true;
                    if (requiresSerialNumber && !parts[1]) hasError = true;
                    if (requiresMacAddress && !parts[2]) hasError = true;
                    if (requiresMacAddress && parts[2] && !validateMacAddress(parts[2])) {
                        toast.error(`${t('error_invalid_mac')} (${assetCode})`);
                        hasError = true;
                    }
                    return {
                        assetCode: assetCode,
                        serialNumber: parts[1] || null,
                        macAddress: parts[2] || null,
                    };
                });
        }
        
        let errorMessage = "An error occurred.";
        if (hasError) {
            if (itemsPayload.some(item => !item.assetCode)) {
                errorMessage = t('asset_code_required_error');
            } else if (requiresSerialNumber && requiresMacAddress) {
                errorMessage = "Serial Number and MAC Address are required for all items.";
            } else if (requiresSerialNumber) {
                errorMessage = "Serial Number is required for all items.";
            } else if (requiresMacAddress) {
                errorMessage = "MAC Address is required for all items.";
            }
            if (!toast.length) toast.error(errorMessage);
            setIsLoading(false);
            return;
        }
        
        if (itemsPayload.length === 0) {
            toast.error("Please add at least one asset to save.");
            setIsLoading(false);
            return;
        }

        const payload = {
            productModelId: selectedModel.id,
            supplierId: selectedSupplierId ? parseInt(selectedSupplierId) : null,
            items: itemsPayload,
        };

        try {
            const response = await axiosInstance.post('/assets/batch', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(response.data.message);
            onSave();
            handleClose();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to add assets.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClose = () => {
        setIsOpen(false);
        setSelectedModel(null);
        setSelectedSupplierId("");
        setManualItems([{ assetCode: '', serialNumber: '', macAddress: '' }]);
        setListText("");
    };

    const manualItemCount = manualItems.filter(i => i.assetCode).length;
    const listItemCount = listText.split('\n').filter(l => l.trim()).length;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{t('batch_add_asset_title')}</DialogTitle>
                    <DialogDescription>{t('batch_add_asset_description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('product_model_label')} <span className="text-red-500">*</span></Label>
                            <ProductModelCombobox onSelect={handleModelSelect} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('supplier_label')} <span className="text-red-500">*</span></Label>
                            <SupplierCombobox
                                selectedValue={selectedSupplierId}
                                onSelect={(value) => setSelectedSupplierId(value)}
                            />
                        </div>
                    </div>
                    {selectedModel && (
                        <Tabs defaultValue="manual" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual">{t('manual_add_tab')}</TabsTrigger>
                                <TabsTrigger value="list">{t('list_add_tab')}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="manual" className="mt-4">
                                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                                    <div className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
                                        <Label className="flex-1">{t('asset_code_label')}*</Label>
                                        <Label className="flex-1">{t('serial_number_label')}</Label>
                                        <Label className="flex-1">{t('mac_address_label')}</Label>
                                        <div className="w-9"></div>
                                    </div>
                                    {manualItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                ref={el => {
                                                    inputRefs.current[index * 3] = el;
                                                    if (index === 0) firstInputRef.current = el;
                                                }}
                                                placeholder={t('asset_code_placeholder')}
                                                value={item.assetCode}
                                                onChange={(e) => handleInputChange(e, index, 'assetCode')}
                                                onKeyDown={(e) => handleKeyDown(e, index, 'assetCode')}
                                                required
                                            />
                                            <Input
                                                ref={el => inputRefs.current[index * 3 + 1] = el}
                                                placeholder={t('serial_number_label')}
                                                value={item.serialNumber}
                                                onChange={(e) => handleInputChange(e, index, 'serialNumber')}
                                                onKeyDown={(e) => handleKeyDown(e, index, 'serialNumber')}
                                                disabled={!selectedModel?.category.requiresSerialNumber}
                                            />
                                            <Input
                                                ref={el => inputRefs.current[index * 3 + 2] = el}
                                                placeholder={t('mac_address_label')}
                                                value={item.macAddress}
                                                onChange={(e) => handleInputChange(e, index, 'macAddress')}
                                                onKeyDown={(e) => handleKeyDown(e, index, 'macAddress')}
                                                disabled={!selectedModel?.category.requiresMacAddress}
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => removeManualItemRow(index)} disabled={manualItems.length === 1}>
                                                <XCircle className="h-5 w-5 text-red-500" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" onClick={addManualItemRow} className="mt-3">
                                    <PlusCircle className="mr-2 h-4 w-4" /> {t('add_row_button')}
                                </Button>
                                <DialogFooter className="mt-6">
                                    <DialogClose asChild><Button type="button" variant="ghost">{t('cancel')}</Button></DialogClose>
                                    <Button onClick={() => handleSubmit('manual')} disabled={isLoading}>
                                        {isLoading ? t('saving') : t('save_assets_button', { count: manualItemCount })}
                                    </Button>
                                </DialogFooter>
                            </TabsContent>
                            <TabsContent value="list" className="mt-4">
                               <Label htmlFor="list-input">{t('list_add_label')}</Label>
                                <p className="text-xs text-muted-foreground mb-2" dangerouslySetInnerHTML={{ __html: t('list_add_description') }} />
                                <Textarea
                                    id="list-input"
                                    className="h-48 font-mono text-sm"
                                    placeholder={
`[Example from Excel or Tab-separated]
ASSET-001	SN-001	AA:BB:CC:11:11:11
ASSET-002	SN-002

[Example from Text file or Comma-separated]
ASSET-003,SN-003,DD:EE:FF:33:33:33
ASSET-004,,EE:FF:AA:44:44:44`
                                    }
                                    value={listText}
                                    onChange={(e) => setListText(e.target.value)}
                                />
                                 <DialogFooter className="mt-6">
                                    <DialogClose asChild><Button type="button" variant="ghost">{t('cancel')}</Button></DialogClose>
                                    <Button onClick={() => handleSubmit('list')} disabled={isLoading}>
                                        {isLoading ? t('saving') : t('save_assets_button', { count: listItemCount })}
                                    </Button>
                                </DialogFooter>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}