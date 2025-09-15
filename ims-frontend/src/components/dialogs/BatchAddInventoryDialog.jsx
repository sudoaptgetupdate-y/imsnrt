import { useState, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { SupplierCombobox } from "@/components/ui/SupplierCombobox";
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { PlusCircle, XCircle, Download, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import Papa from 'papaparse';

const MAX_ITEMS_MANUAL = 50;
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
    const [isLoading, setIsLoading] = useState(false);
    const token = useAuthStore((state) => state.token);

    const inputRefs = useRef([]);
    const firstInputRef = useRef(null);
    const fileInputRef = useRef(null);

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
            toast.info(`You can add or import a maximum of ${MAX_ITEMS_MANUAL} items at a time.`);
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
            if (inputRefs.current[nextRefIndex]) inputRefs.current[nextRefIndex].focus();
        };
        const focusPrev = () => {
            const prevRefIndex = currentRefIndex - 1;
            if (inputRefs.current[prevRefIndex]) inputRefs.current[prevRefIndex].focus();
        };
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            const nextRowIndex = rowIndex + 1;
            if (nextRowIndex === manualItems.length) addManualItemRow();
            else inputRefs.current[nextRowIndex * FIELDS_PER_ROW + fieldIndex]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevRowIndex = rowIndex - 1;
            if (prevRowIndex >= 0) inputRefs.current[prevRowIndex * FIELDS_PER_ROW + fieldIndex]?.focus();
        } else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length) {
            e.preventDefault();
            focusNext();
        } else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0) {
            e.preventDefault();
            focusPrev();
        }
    };

    const handleDownloadTemplate = () => {
        const headers = ["SerialNumber", "MACAddress", "Notes"];
        const csv = Papa.unparse([headers]);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "inventory_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const importedData = results.data.map(row => ({
                    serialNumber: row.SerialNumber || '',
                    macAddress: row.MACAddress || '',
                    notes: row.Notes || '',
                }));
                const existingItems = manualItems.filter(item => item.serialNumber || item.macAddress || item.notes);
                const combinedItems = [...existingItems, ...importedData];
                if (combinedItems.length > MAX_ITEMS_MANUAL) {
                    toast.error(`Cannot import ${importedData.length} items. The total would exceed the limit of ${MAX_ITEMS_MANUAL}.`);
                    return;
                }
                setManualItems(combinedItems.length > 0 ? combinedItems : [{ serialNumber: '', macAddress: '', notes: '' }]);
                toast.success(`${importedData.length} rows imported successfully.`);
            },
            error: (error) => toast.error("Failed to parse CSV file: " + error.message)
        });
        event.target.value = null;
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            if (!selectedModel) throw new Error(t('error_select_model'));
            if (!selectedSupplierId) throw new Error(t('error_select_supplier'));

            const { requiresSerialNumber, requiresMacAddress } = selectedModel.category;
            let errorMessages = [];

            const processItem = (item, identifier) => {
                if (requiresSerialNumber && !item.serialNumber?.trim()) {
                    errorMessages.push(`Serial Number is required for: ${identifier}`);
                }
                if (requiresMacAddress && !item.macAddress?.trim()) {
                    errorMessages.push(`MAC Address is required for: ${identifier}`);
                }
                if (item.macAddress && !validateMacAddress(item.macAddress.trim())) {
                    errorMessages.push(`Invalid MAC Address format for: ${identifier}`);
                }
                return {
                    serialNumber: item.serialNumber?.trim() || null,
                    macAddress: item.macAddress?.trim() || null,
                    notes: item.notes?.trim() || null,
                };
            };

            const itemsPayload = manualItems
                .filter(item => item.serialNumber?.trim() || item.macAddress?.trim())
                .map((item, index) => processItem(item, item.serialNumber || `Row ${index + 1}`));

            if (errorMessages.length > 0) {
                throw new Error([...new Set(errorMessages)].join('\n'));
            }

            if (itemsPayload.length === 0) {
                throw new Error("Please add at least one valid item to save.");
            }

            const payload = {
                productModelId: selectedModel.id,
                supplierId: parseInt(selectedSupplierId),
                items: itemsPayload,
            };

            const response = await axiosInstance.post('/inventory/batch', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(response.data.message);
            onSave();
            handleClose();

        } catch (error) {
            toast.error(error.response?.data?.error || error.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setSelectedModel(null);
        setSelectedSupplierId("");
        setManualItems([{ serialNumber: '', macAddress: '', notes: '' }]);
    };

    const manualItemCount = manualItems.filter(i => i.serialNumber?.trim() || i.macAddress?.trim()).length;

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
                                onSelect={(supplierObject) => setSelectedSupplierId(supplierObject ? String(supplierObject.id) : "")}
                            />
                        </div>
                    </div>
                    {selectedModel && (
                        <div>
                            <div className="flex justify-end gap-2 mb-4">
                                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Template
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => fileInputRef.current.click()}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Import CSV
                                </Button>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileImport} />
                            </div>
                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 border rounded-md p-2">
                                <div className="grid grid-cols-[1fr_1fr_1.5fr_auto] items-center gap-2 px-1 text-xs font-medium text-muted-foreground sticky top-0 bg-background py-1">
                                    <Label>
                                        {t('tableHeader_serialNumber')}
                                        {selectedModel.category.requiresSerialNumber && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    <Label>
                                        {t('tableHeader_macAddress')}
                                        {selectedModel.category.requiresMacAddress && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    <Label>{t('notes')}</Label>
                                    <div className="w-9"></div>
                                </div>
                                {manualItems.map((item, index) => (
                                    <div key={index} className="grid grid-cols-[1fr_1fr_1.5fr_auto] items-center gap-2">
                                        <Input
                                            ref={el => { inputRefs.current[index * FIELDS_PER_ROW] = el; if (index === 0) firstInputRef.current = el; }}
                                            placeholder={t('tableHeader_serialNumber')}
                                            value={item.serialNumber}
                                            onChange={(e) => handleInputChange(e, index, 'serialNumber')}
                                            onKeyDown={(e) => handleKeyDown(e, index, 0)}
                                            disabled={!selectedModel}
                                        />
                                        <Input
                                            ref={el => inputRefs.current[index * FIELDS_PER_ROW + 1] = el}
                                            placeholder={t('tableHeader_macAddress')}
                                            value={item.macAddress}
                                            onChange={(e) => handleInputChange(e, index, 'macAddress')}
                                            onKeyDown={(e) => handleKeyDown(e, index, 1)}
                                            disabled={!selectedModel}
                                        />
                                        <Input
                                            ref={el => inputRefs.current[index * FIELDS_PER_ROW + 2] = el}
                                            placeholder={t('notes')}
                                            value={item.notes}
                                            onChange={(e) => handleInputChange(e, index, 'notes')}
                                            onKeyDown={(e) => handleKeyDown(e, index, 2)}
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeManualItemRow(index)} disabled={manualItems.length === 1 && !manualItems[0].serialNumber && !manualItems[0].macAddress}>
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-3">
                                <p className="text-xs text-muted-foreground">Showing {manualItems.length} of {MAX_ITEMS_MANUAL} rows.</p>
                                <Button variant="outline" size="sm" onClick={addManualItemRow}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> {t('add_row_button')}
                                </Button>
                            </div>
                            <DialogFooter className="mt-6">
                                <DialogClose asChild><Button type="button" variant="ghost">{t('cancel')}</Button></DialogClose>
                                <Button onClick={handleSubmit} disabled={isLoading}>
                                    {isLoading ? t('saving') : t('batch_add_save_button', { count: manualItemCount })}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
