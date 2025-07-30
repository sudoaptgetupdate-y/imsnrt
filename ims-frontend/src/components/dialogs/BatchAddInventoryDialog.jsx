// src/components/dialogs/BatchAddInventoryDialog.jsx

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

const MAX_ITEMS_MANUAL = 10;

const formatMacAddress = (value) => {
    const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (cleaned.length === 0) return '';
    return cleaned.match(/.{1,2}/g)?.slice(0, 6).join(':') || cleaned;
};

const validateMacAddress = (mac) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

export default function BatchAddInventoryDialog({ isOpen, setIsOpen, onSave }) {
    const { t } = useTranslation();
    const [selectedModel, setSelectedModel] = useState(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [manualItems, setManualItems] = useState([{ serialNumber: '', macAddress: '' }]);
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
    };

    const addManualItemRow = () => {
        if (manualItems.length < MAX_ITEMS_MANUAL) {
            setManualItems([...manualItems, { serialNumber: '', macAddress: '' }]);
            setTimeout(() => {
                const nextIndex = manualItems.length * 2;
                inputRefs.current[nextIndex]?.focus();
            }, 100);
        } else {
            toast.info(`You can add a maximum of ${MAX_ITEMS_MANUAL} items at a time.`);
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

            if (field === 'serialNumber') {
                if (isMacRequired) {
                    const macInputIndex = index * 2 + 1;
                    inputRefs.current[macInputIndex]?.focus();
                } else {
                     if (index === manualItems.length - 1) {
                        addManualItemRow();
                    } else {
                        const nextSnInputIndex = (index + 1) * 2;
                        inputRefs.current[nextSnInputIndex]?.focus();
                    }
                }
            } else if (field === 'macAddress') {
                const currentItem = manualItems[index];
                
                if (isMacRequired && currentItem.macAddress.trim() !== '' && !validateMacAddress(currentItem.macAddress)) {
                    toast.error("Invalid MAC Address format. Please use XX:XX:XX:XX:XX:XX format.");
                    return; 
                }

                if (index === manualItems.length - 1) {
                    if (!isMacRequired || (isMacRequired && currentItem.macAddress.trim() !== '')) {
                        addManualItemRow();
                    }
                } else {
                    const nextSnInputIndex = (index + 1) * 2;
                    inputRefs.current[nextSnInputIndex]?.focus();
                }
            }
        }
    };

    const handleSubmit = async (activeTab) => {
        if (!selectedModel) {
            toast.error("Please select a Product Model first.");
            return;
        }
        if (!selectedSupplierId) {
            toast.error("Please select a Supplier.");
            return;
        }

        setIsLoading(true);

        let itemsPayload = [];
        let hasError = false;

        const { requiresSerialNumber, requiresMacAddress } = selectedModel.category;

        if (activeTab === 'manual') {
            itemsPayload = manualItems
                .filter(item => item.serialNumber || item.macAddress)
                .map(item => {
                    if (requiresSerialNumber && !item.serialNumber?.trim()) hasError = true;
                    if (requiresMacAddress && !item.macAddress?.trim()) hasError = true;
                    if (requiresMacAddress && item.macAddress && !validateMacAddress(item.macAddress)) {
                        toast.error(`Invalid MAC address format for S/N: ${item.serialNumber || '(empty)'}. Please fix it before saving.`);
                        hasError = true;
                    }
                    return {
                        serialNumber: item.serialNumber || null,
                        macAddress: item.macAddress || null,
                    }
                });
        } else {
            itemsPayload = listText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .map(line => {
                    const parts = line.split(/[,\t]/).map(part => part.trim());
                    if (requiresSerialNumber && !parts[0]) hasError = true;
                    if (requiresMacAddress && !parts[1]) hasError = true;
                    if (requiresMacAddress && parts[1] && !validateMacAddress(parts[1])) {
                        toast.error(`Invalid MAC address format for S/N: ${parts[0]}. Please fix it before saving.`);
                        hasError = true;
                    }
                    return {
                        serialNumber: parts[0] || null,
                        macAddress: parts[1] || null,
                    };
                });
        }

        if (hasError) {
            let errorMessage = "An error occurred.";
            if (requiresSerialNumber && requiresMacAddress) {
                errorMessage = "Serial Number and MAC Address are required for all items.";
            } else if (requiresSerialNumber) {
                errorMessage = "Serial Number is required for all items.";
            } else if (requiresMacAddress) {
                errorMessage = "MAC Address is required for all items.";
            }
            if(!toast.length) toast.error(errorMessage);
            setIsLoading(false);
            return;
        }
        
        if (itemsPayload.length === 0) {
            toast.error("Please add at least one item to save.");
            setIsLoading(false);
            return;
        }

        const payload = {
            productModelId: selectedModel.id,
            supplierId: selectedSupplierId ? parseInt(selectedSupplierId) : null,
            items: itemsPayload,
        };

        try {
            const response = await axiosInstance.post('/inventory/batch', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(response.data.message);
            onSave();
            handleClose();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to add items.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setSelectedModel(null);
        setSelectedSupplierId("");
        setManualItems([{ serialNumber: '', macAddress: '' }]);
        setListText("");
    };

    const manualItemCount = manualItems.filter(i => i.serialNumber || i.macAddress).length;
    const listItemCount = listText.split('\n').filter(l => l.trim()).length;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t('batch_add_inventory_title')}</DialogTitle>
                    <DialogDescription>{t('batch_add_inventory_description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('tableHeader_productModel')} <span className="text-red-500">*</span></Label>
                            <ProductModelCombobox onSelect={(model) => setSelectedModel(model)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('suppliers')} <span className="text-red-500">*</span></Label>
                            <SupplierCombobox
                                selectedValue={selectedSupplierId}
                                onSelect={(value) => setSelectedSupplierId(value)}
                            />
                        </div>
                    </div>
                    {selectedModel && (
                        <Tabs defaultValue="manual" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="manual">{t('batch_add_manual_tab')}</TabsTrigger>
                                <TabsTrigger value="list">{t('batch_add_list_tab')}</TabsTrigger>
                            </TabsList>
                            <TabsContent value="manual" className="mt-4">
                                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                                    {manualItems.map((item, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                ref={el => {
                                                    inputRefs.current[index * 2] = el;
                                                    if (index === 0) firstInputRef.current = el;
                                                }}
                                                placeholder={t('tableHeader_serialNumber')}
                                                value={item.serialNumber}
                                                onChange={(e) => handleInputChange(e, index, 'serialNumber')}
                                                onKeyDown={(e) => handleKeyDown(e, index, 'serialNumber')}
                                                disabled={!selectedModel?.category.requiresSerialNumber}
                                            />
                                            <Input
                                                ref={el => inputRefs.current[index * 2 + 1] = el}
                                                placeholder={t('tableHeader_macAddress')}
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
                                    <PlusCircle className="mr-2 h-4 w-4" /> {t('batch_add_row_button')}
                                </Button>
                                <DialogFooter className="mt-6">
                                    <DialogClose asChild><Button type="button" variant="ghost">{t('cancel')}</Button></DialogClose>
                                    <Button onClick={() => handleSubmit('manual')} disabled={isLoading}>
                                        {isLoading ? t('saving') : t('batch_add_save_button', { count: manualItemCount })}
                                    </Button>
                                </DialogFooter>
                            </TabsContent>
                            <TabsContent value="list" className="mt-4">
                               <Label htmlFor="list-input">{t('batch_add_list_label')}</Label>
                                <p className="text-xs text-muted-foreground mb-2" dangerouslySetInnerHTML={{ __html: t('batch_add_list_description') }} />
                                <Textarea
                                    id="list-input"
                                    className="h-48 font-mono text-sm"
                                    placeholder={
`[Example from Excel or Tab-separated]
SN-FROM-EXCEL	AA:BB:CC:11:22:33
SN-WITH-NO-MAC

[Example from Text file or Comma-separated]
SN-FROM-TEXT,DD:EE:FF:44:55:66
,EE:FF:AA:77:88:99`
                                    }
                                    value={listText}
                                    onChange={(e) => setListText(e.target.value)}
                                />
                                 <DialogFooter className="mt-6">
                                    <DialogClose asChild><Button type="button" variant="ghost">{t('cancel')}</Button></DialogClose>
                                    <Button onClick={() => handleSubmit('list')} disabled={isLoading}>
                                        {isLoading ? t('saving') : `Save ${listItemCount} Items`}
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