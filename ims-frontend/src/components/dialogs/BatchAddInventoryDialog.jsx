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
const FIELDS_PER_ROW = 3; // serialNumber, macAddress, notes

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
    const [manualItems, setManualItems] = useState([{ serialNumber: '', macAddress: '', notes: '' }]);
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
        } else if (field !== 'notes') {
            processedValue = value.toUpperCase();
        }

        const newItems = [...manualItems];
        newItems[index][field] = processedValue;
        setManualItems(newItems);
    };

    const addManualItemRow = () => {
        if (manualItems.length < MAX_ITEMS_MANUAL) {
            setManualItems([...manualItems, { serialNumber: '', macAddress: '', notes: '' }]);
            setTimeout(() => {
                const nextIndex = manualItems.length * FIELDS_PER_ROW;
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

    const handleKeyDown = (e, rowIndex, fieldIndex) => {
        const currentRefIndex = rowIndex * FIELDS_PER_ROW + fieldIndex;

        const focusNext = () => {
            const nextRefIndex = currentRefIndex + 1;
            if (inputRefs.current[nextRefIndex]) {
                inputRefs.current[nextRefIndex].focus();
            } else if (rowIndex < manualItems.length - 1) { 
                const nextRowFirstInput = (rowIndex + 1) * FIELDS_PER_ROW;
                if (inputRefs.current[nextRowFirstInput]) {
                     inputRefs.current[nextRowFirstInput].focus();
                }
            }
        };

        const focusPrev = () => {
            const prevRefIndex = currentRefIndex - 1;
            if (inputRefs.current[prevRefIndex]) {
                inputRefs.current[prevRefIndex].focus();
            }
        };
        
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextRowIndex = rowIndex + 1;
            if (nextRowIndex === manualItems.length) {
                addManualItemRow();
            } else {
                const nextFieldIndex = nextRowIndex * FIELDS_PER_ROW + fieldIndex;
                inputRefs.current[nextFieldIndex]?.focus();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevRowIndex = rowIndex - 1;
            if (prevRowIndex >= 0) {
                 const prevFieldIndex = prevRowIndex * FIELDS_PER_ROW + fieldIndex;
                 inputRefs.current[prevFieldIndex]?.focus();
            }
        } else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) {
             e.preventDefault();
             focusNext();
        } else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) {
            e.preventDefault();
            focusPrev();
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
                        notes: item.notes.trim() || null,
                    }
                });
        } else {
            itemsPayload = listText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#')) // Ignore comments
                .map(line => {
                    const parts = line.split(/[,\t]/).map(part => part.trim());
                    const [serialNumber, macAddress, notes] = parts;
                    if (requiresSerialNumber && !serialNumber) hasError = true;
                    if (requiresMacAddress && !macAddress) hasError = true;
                    if (requiresMacAddress && macAddress && !validateMacAddress(macAddress)) {
                        toast.error(`Invalid MAC address format for S/N: ${serialNumber}. Please fix it before saving.`);
                        hasError = true;
                    }
                    return {
                        serialNumber: serialNumber || null,
                        macAddress: macAddress || null,
                        notes: notes || null,
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
        setManualItems([{ serialNumber: '', macAddress: '', notes: '' }]);
        setListText("");
    };

    const manualItemCount = manualItems.filter(i => i.serialNumber || i.macAddress).length;
    const listItemCount = listText.split('\n').filter(l => l.trim() && !l.startsWith('#')).length;

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
                                    <div className="grid grid-cols-[1fr_1fr_1.5fr_auto] items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
                                        <Label>{t('tableHeader_serialNumber')}</Label>
                                        <Label>{t('tableHeader_macAddress')}</Label>
                                        <Label>{t('notes')}</Label>
                                        <div className="w-9"></div>
                                    </div>
                                    {manualItems.map((item, index) => (
                                        <div key={index} className="grid grid-cols-[1fr_1fr_1.5fr_auto] items-center gap-2">
                                            <Input
                                                ref={el => {
                                                    inputRefs.current[index * FIELDS_PER_ROW] = el;
                                                    if (index === 0) firstInputRef.current = el;
                                                }}
                                                placeholder={t('tableHeader_serialNumber')}
                                                value={item.serialNumber}
                                                onChange={(e) => handleInputChange(e, index, 'serialNumber')}
                                                onKeyDown={(e) => handleKeyDown(e, index, 0)}
                                                disabled={!selectedModel?.category.requiresSerialNumber}
                                            />
                                            <Input
                                                ref={el => inputRefs.current[index * FIELDS_PER_ROW + 1] = el}
                                                placeholder={t('tableHeader_macAddress')}
                                                value={item.macAddress}
                                                onChange={(e) => handleInputChange(e, index, 'macAddress')}
                                                onKeyDown={(e) => handleKeyDown(e, index, 1)}
                                                disabled={!selectedModel?.category.requiresMacAddress}
                                            />
                                            <Input
                                                ref={el => inputRefs.current[index * FIELDS_PER_ROW + 2] = el}
                                                placeholder={t('notes')}
                                                value={item.notes}
                                                onChange={(e) => handleInputChange(e, index, 'notes')}
                                                onKeyDown={(e) => handleKeyDown(e, index, 2)}
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
                               <p className="text-xs text-muted-foreground mb-2">Each item must be on a new line. Use a <strong>Tab</strong> or a <strong>comma (,)</strong> to separate Serial Number, MAC Address, and Notes.</p>
                                <Textarea
                                    id="list-input"
                                    className="h-48 font-mono text-sm"
                                    placeholder={
`# Serial Number, MAC Address, Notes
# Use Tab or comma to separate values. Lines starting with # are ignored.

# Example 1: Full details, separated by Tab
SN-12345	AA:BB:CC:11:22:33	New stock received today.

# Example 2: Separated by comma, no MAC Address
SN-12346,,For internal testing only.

# Example 3: No notes
SN-12347	DD:EE:FF:44:55:66

# Example 4: Only Serial Number (if category allows)
SN-12348`
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