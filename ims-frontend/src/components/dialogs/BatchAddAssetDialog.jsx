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
import { PlusCircle, XCircle, Download, Upload, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import Papa from 'papaparse';

// (Helper functions formatMacAddress, validateMacAddress - คงเดิม)
const formatMacAddress = (value) => {
    const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (cleaned.length === 0) return '';
    return cleaned.match(/.{1,2}/g)?.slice(0, 6).join(':') || cleaned;
};

const validateMacAddress = (mac) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

const MAX_ASSETS_MANUAL = 50; 
const FIELDS_PER_ROW = 4; // assetCode, serialNumber, macAddress, notes

// --- START: (Helpers สำหรับฟอร์แมต Comma) ---
const parseFormattedValue = (val) => String(val).replace(/,/g, '');

const handlePriceChange = (e, setter) => {
    const { value } = e.target;
    const rawValue = parseFormattedValue(value);

    if (rawValue === '' || /^[0-9]*\.?[0-9]*$/.test(rawValue)) {
        const parts = rawValue.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        setter(parts.join('.'));
    }
};
// --- END: (Helpers) ---


export default function BatchAddAssetDialog({ isOpen, setIsOpen, onSave }) {
    const { t } = useTranslation();
    const [selectedModel, setSelectedModel] = useState(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    
    const [batchPurchasePrice, setBatchPurchasePrice] = useState("");
    const [isCostLoading, setIsCostLoading] = useState(false);

    const [masterSellingPrice, setMasterSellingPrice] = useState("");

    const [manualItems, setManualItems] = useState([{ assetCode: '', serialNumber: '', macAddress: '', notes: '' }]);
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

    useEffect(() => {
        const fetchLastCost = async () => {
            if (selectedModel?.id && selectedSupplierId) {
                setIsCostLoading(true);
                try {
                    const response = await axiosInstance.get('/inventory/last-cost', {
                        headers: { Authorization: `Bearer ${token}` },
                        params: { 
                            modelId: selectedModel.id, 
                            supplierId: selectedSupplierId 
                        }
                    });
                    if (response.data.lastCost !== null) {
                        setBatchPurchasePrice(response.data.lastCost.toLocaleString('en-US'));
                    } else {
                        setBatchPurchasePrice("");
                    }
                } catch (error) {
                    // --- MODIFIED ---
                    toast.error(t('error_fetch_last_cost'));
                    setBatchPurchasePrice("");
                } finally {
                    setIsCostLoading(false);
                }
            }
        };

        fetchLastCost();
    }, [selectedModel?.id, selectedSupplierId, token, t]); // <-- เพิ่ม t

    const handleModelSelect = (model) => {
        setSelectedModel(model);
        setBatchPurchasePrice(""); 
        setMasterSellingPrice(model ? (model.sellingPrice !== null ? model.sellingPrice.toLocaleString('en-US') : "") : "");
    };
    
    const handleSupplierSelect = (supplierObject) => {
        const newId = supplierObject ? String(supplierObject.id) : "";
        setSelectedSupplierId(newId);
        setBatchPurchasePrice(""); 
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
        if (manualItems.length < MAX_ASSETS_MANUAL) {
            setManualItems([...manualItems, { assetCode: '', serialNumber: '', macAddress: '', notes: '' }]);
            setTimeout(() => {
                const nextIndex = manualItems.length * FIELDS_PER_ROW; 
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

    const handleDownloadTemplate = () => {
        const headers = ["AssetCode", "SerialNumber", "MACAddress", "Notes"];
        const csv = Papa.unparse([headers]);
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "asset_template.csv");
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
                    assetCode: row.AssetCode || '',
                    serialNumber: row.SerialNumber || '',
                    macAddress: row.MACAddress || '',
                    notes: row.Notes || '',
                }));
                
                const existingItems = manualItems.filter(item => item.assetCode || item.serialNumber || item.macAddress || item.notes);
                const combinedItems = [...existingItems, ...importedData];

                if (combinedItems.length > MAX_ASSETS_MANUAL) {
                    // --- MODIFIED ---
                    toast.error(t('error_import_limit_exceeded', { 
                        count: importedData.length, 
                        max: MAX_ASSETS_MANUAL 
                    }));
                    return;
                }
                
                setManualItems(combinedItems.length > 0 ? combinedItems : [{ assetCode: '', serialNumber: '', macAddress: '', notes: '' }]);
                // --- MODIFIED ---
                toast.success(t('success_import_rows', { count: importedData.length }));
            },
            error: (error) => {
                // --- MODIFIED ---
                toast.error(t('error_parse_csv') + error.message);
            }
        });
        event.target.value = null; 
    };


    const handleSubmit = async () => {
        if (!selectedModel) {
            toast.error(t('error_select_model'));
            return;
        }
        if (!selectedSupplierId) {
            toast.error(t('error_select_supplier'));
            return;
        }
        
        // --- MODIFIED ---
        const parsedPurchasePrice = parseFloat(parseFormattedValue(batchPurchasePrice));
        if (batchPurchasePrice === "" || isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0) {
             toast.error(t('error_purchase_price_required')); // <-- ใช้ toast.error ดีกว่า throw
             return;
        }
        
        // --- MODIFIED ---
        const parsedSellingPrice = parseFloat(parseFormattedValue(masterSellingPrice));
         if (masterSellingPrice === "" || isNaN(parsedSellingPrice) || parsedSellingPrice < 0) {
             toast.error(t('error_selling_price_required')); // <-- ใช้ toast.error ดีกว่า throw
             return;
         }

        setIsLoading(true);

        let errorMessages = [];
        const { requiresSerialNumber, requiresMacAddress } = selectedModel.category;

        const processItem = (item, identifier) => {
            let hasValidationError = false;
            
            if (!item.assetCode || !item.assetCode.trim()) {
                // --- MODIFIED ---
                errorMessages.push(t('error_asset_code_required_for'));
                hasValidationError = true;
            }
            if (requiresSerialNumber && (!item.serialNumber || !item.serialNumber.trim())) {
                // --- MODIFIED ---
                errorMessages.push(t('error_serial_required_for', { identifier }));
                hasValidationError = true;
            }
            if (requiresMacAddress && (!item.macAddress || !item.macAddress.trim())) {
                // --- MODIFIED ---
                errorMessages.push(t('error_mac_required_for', { identifier }));
                hasValidationError = true;
            }
            if (item.macAddress && !validateMacAddress(item.macAddress.trim())) {
                // --- MODIFIED ---
                errorMessages.push(t('error_invalid_mac_for', { identifier }));
                hasValidationError = true;
            }
            
            return hasValidationError ? null : {
                assetCode: item.assetCode.trim(),
                serialNumber: item.serialNumber?.trim() || null,
                macAddress: item.macAddress?.trim() ? item.macAddress.trim().replace(/[:-\s]/g, '') : null, // (แก้ไข: เพิ่ม .replace)
                notes: item.notes?.trim() || null,
            };
        };

        const itemsPayload = manualItems
            .filter(item => item.assetCode?.trim() || item.serialNumber?.trim() || item.macAddress?.trim())
            .map((item, index) => processItem(item, item.assetCode || `Row ${index + 1}`))
            .filter(Boolean);
        
        if (errorMessages.length > 0) {
            const uniqueErrors = [...new Set(errorMessages)];
            toast.error(uniqueErrors.join('\n'));
            setIsLoading(false);
            return;
        }
        
        if (itemsPayload.length === 0) {
            // --- MODIFIED ---
            toast.error(t('error_no_valid_assets'));
            setIsLoading(false);
            return;
        }

        const payload = {
            productModelId: selectedModel.id,
            supplierId: selectedSupplierId ? parseInt(selectedSupplierId) : null,
            items: itemsPayload,
            purchasePrice: parsedPurchasePrice,
            sellingPrice: parsedSellingPrice, 
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
        setManualItems([{ assetCode: '', serialNumber: '', macAddress: '', notes: '' }]);
        setBatchPurchasePrice("");
        setMasterSellingPrice(""); 
    };

    const manualItemCount = manualItems.filter(i => i.assetCode?.trim()).length;

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
                                onSelect={handleSupplierSelect}
                            />
                        </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 relative">
                            {/* --- MODIFIED --- */}
                            <Label htmlFor="batchPurchasePrice">{t('batch_purchase_price_label')} <span className="text-red-500">*</span></Label>
                            <Input 
                                id="batchPurchasePrice" 
                                type="text"
                                inputMode="decimal"
                                placeholder={t('placeholder_enter_cost')} // (แนะนำให้เพิ่ม key นี้ด้วย)
                                value={batchPurchasePrice}
                                onChange={(e) => handlePriceChange(e, setBatchPurchasePrice)}
                                disabled={isCostLoading || !selectedModel || !selectedSupplierId}
                            />
                            {isCostLoading && (
                                <div className="absolute right-2 top-7">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            )}
                            {/* --- MODIFIED --- */}
                            <p className="text-xs text-muted-foreground">{t('smart_cost_helper')}</p>
                        </div>
                        
                         <div className="space-y-2 relative">
                            {/* --- MODIFIED --- */}
                            <Label htmlFor="masterSellingPrice">{t('master_selling_price_label')} <span className="text-red-500">*</span></Label>
                            <Input 
                                id="masterSellingPrice" 
                                type="text"
                                inputMode="decimal"
                                placeholder={t('placeholder_enter_selling_price')} // (แนะนำให้เพิ่ม key นี้ด้วย)
                                value={masterSellingPrice}
                                onChange={(e) => handlePriceChange(e, setMasterSellingPrice)}
                                disabled={!selectedModel}
                            />
                            {/* --- MODIFIED --- */}
                             <p className="text-xs text-muted-foreground">{t('smart_price_helper')}</p>
                        </div>
                    </div>

                    {selectedModel && (
                        <div>
                            <div className="flex justify-end gap-2 mb-4">
                                {/* --- MODIFIED --- */}
                                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                                    <Download className="mr-2 h-4 w-4" />
                                    {t('download_template_button')}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => fileInputRef.current.click()}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {t('import_csv_button')}
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv"
                                    onChange={handleFileImport}
                                />
                            </div>
                            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 border rounded-md p-2">
                                <div className="grid grid-cols-[1fr_1fr_1fr_1.5fr_auto] items-center gap-2 px-1 text-xs font-medium text-muted-foreground sticky top-0 bg-background py-1">
                                    <Label>{t('asset_code_label')}*</Label>
                                    <Label>
                                        {t('serial_number_label')}
                                        {selectedModel.category.requiresSerialNumber && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    <Label>
                                        {t('mac_address_label')}
                                        {selectedModel.category.requiresMacAddress && <span className="text-red-500 ml-1">*</span>}
                                    </Label>
                                    <Label>{t('notes')}</Label>
                                    <div className="w-9"></div>
                                </div>
                                {manualItems.map((item, index) => (
                                    <div key={index} className="grid grid-cols-[1fr_1fr_1fr_1.5fr_auto] items-center gap-2">
                                        <Input
                                            ref={el => {
                                                inputRefs.current[index * FIELDS_PER_ROW] = el;
                                                if (index === 0) firstInputRef.current = el;
                                            }}
                                            placeholder={t('asset_code_placeholder')}
                                            value={item.assetCode}
                                            onChange={(e) => handleInputChange(e, index, 'assetCode')}
                                            onKeyDown={(e) => handleKeyDown(e, index, 0)}
                                        />
                                        <Input
                                            ref={el => inputRefs.current[index * FIELDS_PER_ROW + 1] = el}
                                            placeholder={t('serial_number_label')}
                                            value={item.serialNumber}
                                            onChange={(e) => handleInputChange(e, index, 'serialNumber')}
                                            onKeyDown={(e) => handleKeyDown(e, index, 1)}
                                            disabled={!selectedModel}
                                        />
                                        <Input
                                            ref={el => inputRefs.current[index * FIELDS_PER_ROW + 2] = el}
                                            placeholder={t('mac_address_label')}
                                            value={item.macAddress}
                                            onChange={(e) => handleInputChange(e, index, 'macAddress')}
                                            onKeyDown={(e) => handleKeyDown(e, index, 2)}
                                            disabled={!selectedModel}
                                        />
                                        <Input
                                            ref={el => inputRefs.current[index * FIELDS_PER_ROW + 3] = el}
                                            placeholder={t('notes')}
                                            value={item.notes}
                                            onChange={(e) => handleInputChange(e, index, 'notes')}
                                            onKeyDown={(e) => handleKeyDown(e, index, 3)}
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeManualItemRow(index)} disabled={manualItems.length === 1 && !manualItems[0].assetCode && !manualItems[0].serialNumber && !manualItems[0].macAddress}>
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-3">
                                {/* --- MODIFIED --- */}
                                <p className="text-xs text-muted-foreground">
                                    {t('showing_rows_count', { count: manualItems.length, max: MAX_ASSETS_MANUAL })}
                                </p>
                                <Button variant="outline" size="sm" onClick={addManualItemRow}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> {t('add_row_button')}
                                </Button>
                            </div>
                            <DialogFooter className="mt-6">
                                <DialogClose asChild><Button type="button" variant="ghost">{t('cancel')}</Button></DialogClose>
                                <Button onClick={handleSubmit} disabled={isLoading}>
                                    {isLoading ? t('saving') : t('save_assets_button', { count: manualItemCount })}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}