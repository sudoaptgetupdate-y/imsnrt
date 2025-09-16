// src/pages/HistoricalDataEntryPage.jsx

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { SupplierCombobox } from "@/components/ui/SupplierCombobox";
import { Trash2, BookUp, PackagePlus, ListChecks, Loader2 } from "lucide-react"; // 1. เพิ่ม Loader2
import { DatePickerWithCustomCaption } from "@/components/ui/DatePickerWithCustomCaption";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


// --- START: 2. เพิ่ม Helpers สำหรับฟอร์แมตราคา (เหมือนใน BatchAdd) ---
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
// --- END Helpers ---


// --- START: 3. Reusable Component 1: HistoricalItemInputs (แก้ไขใหม่ทั้งหมด) ---
const HistoricalItemInputs = ({ items, setItems, t }) => {
    
    const serialNumberInputRef = useRef(null);
    const token = useAuthStore((state) => state.token); // ดึง Token มาใช้งาน
    const [isCostLoading, setIsCostLoading] = useState(false);

    // เพิ่ม purchasePrice และ sellingPrice โดยมี default = '0'
    const [currentItem, setCurrentItem] = useState({
        productModelId: null, productModel: null, supplierId: null, supplier: null,
        serialNumber: '', macAddress: '', notes: '',
        purchasePrice: '0', 
        sellingPrice: '0',
        isSerialRequired: false, isMacRequired: false,
    });

    // Logic ดึง "ต้นทุนล่าสุด" (Smart Cost) เมื่อ Model และ Supplier ถูกเลือก
    useEffect(() => {
        const fetchLastCost = async () => {
            if (currentItem.productModelId && currentItem.supplierId) {
                setIsCostLoading(true);
                try {
                    const response = await axiosInstance.get('/inventory/last-cost', {
                        headers: { Authorization: `Bearer ${token}` },
                        params: { modelId: currentItem.productModelId, supplierId: currentItem.supplierId }
                    });
                    if (response.data.lastCost !== null) {
                        setCurrentItem(prev => ({ ...prev, purchasePrice: response.data.lastCost.toLocaleString('en-US') }));
                    } else {
                        setCurrentItem(prev => ({ ...prev, purchasePrice: '0' }));
                    }
                } catch (error) {
                    toast.error("Failed to fetch last cost price.");
                    setCurrentItem(prev => ({ ...prev, purchasePrice: '0' }));
                } finally {
                    setIsCostLoading(false);
                }
            }
        };
        fetchLastCost();
    }, [currentItem.productModelId, currentItem.supplierId, token]);


    // (Helper Functions: formatMacAddress, isValidMacAddress, handleMacAddressChange - คงเดิม)
    const formatMacAddress = (value) => {
        const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
        if (cleaned.length === 0) return '';
        return cleaned.match(/.{1,2}/g)?.slice(0, 6).join(':') || '';
    };

    const isValidMacAddress = (mac) => {
        if (!mac) return true;
        const cleanMac = mac.replace(/[:-\s]/g, '');
        return /^[0-9a-fA-F]{12}$/.test(cleanMac);
    };

    const handleMacAddressChange = (e) => {
        const input = e.target.value;
        const formatted = formatMacAddress(input);
        setCurrentItem(prev => ({...prev, macAddress: formatted}));
    };
    
    // อัปเดต handleModelSelect ให้ดึง "ราคาขาย" (Smart Price) มาใส่ด้วย
    const handleModelSelect = (model) => {
        if (model) {
            setCurrentItem(prev => ({
                ...prev, productModel: model, productModelId: model.id,
                isSerialRequired: model.category.requiresSerialNumber, isMacRequired: model.category.requiresMacAddress,
                serialNumber: prev.serialNumber, macAddress: prev.macAddress,
                sellingPrice: model.sellingPrice !== null ? model.sellingPrice.toLocaleString('en-US') : '0', // <-- อัปเดตราคาขาย
                purchasePrice: '0', // รีเซ็ต cost รอเลือก supplier
            }));
        } else {
             // Reset ทั้งหมด
            setCurrentItem(prev => ({
                ...prev, productModel: null, productModelId: null,
                isSerialRequired: false, isMacRequired: false,
                serialNumber: '', macAddress: '', notes: '',
                purchasePrice: '0', sellingPrice: '0',
            }));
        }
    };
    
    const handleSupplierSelect = (supplier) => {
        if (supplier) {
            setCurrentItem(prev => ({...prev, supplierId: supplier.id, supplier: supplier, purchasePrice: '0' })); // Reset cost เพื่อรอ fetch ใหม่
        } else {
            setCurrentItem(prev => ({...prev, supplierId: null, supplier: null, purchasePrice: '0' }));
        }
    };

    // อัปเดต handleAddItem ให้ตรวจสอบและเพิ่ม cost/price
    const handleAddItem = () => {
        if (!currentItem.productModel || !currentItem.supplierId) {
            toast.error(t('error_select_model_and_supplier')); return;
        }
        // (Validation อื่นๆ คงเดิม)
        if (currentItem.isSerialRequired && !currentItem.serialNumber.trim()) {
            toast.error(t('error_serial_required_category')); return;
        }
        if (currentItem.isMacRequired && !currentItem.macAddress.trim()) {
            toast.error(t('error_mac_required_category')); return;
        }
        if (currentItem.macAddress && !isValidMacAddress(currentItem.macAddress)) {
            toast.error(t('error_invalid_mac')); return;
        }
        
        // เพิ่ม Validation สำหรับ Cost และ Price
        const parsedPurchasePrice = parseFloat(parseFormattedValue(currentItem.purchasePrice));
        const parsedSellingPrice = parseFloat(parseFormattedValue(currentItem.sellingPrice));

        if (isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0) {
            toast.error(t('error_historical_cost_required')); return;
        }
        if (isNaN(parsedSellingPrice) || parsedSellingPrice < 0) {
            toast.error("Selling price must be a valid non-negative number."); return;
        }

        // (Validation Duplicate S/N และ MAC คงเดิม)
        if (currentItem.serialNumber.trim()) {
            const isSerialDuplicate = items.some(item => item.serialNumber.trim() === currentItem.serialNumber.trim());
            if (isSerialDuplicate) {
                toast.error(t('error_historical_duplicate_serial', { serial: currentItem.serialNumber })); return;
            }
        }
        if (currentItem.macAddress.trim()) {
            const cleanNewMac = currentItem.macAddress.replace(/[:-\s]/g, '');
            const isMacDuplicate = items.some(item => item.macAddress && item.macAddress.replace(/[:-\s]/g, '') === cleanNewMac);
            if (isMacDuplicate) {
                toast.error(t('error_historical_duplicate_mac', { mac: currentItem.macAddress })); return;
            }
        }

        const noteToAdd = currentItem.notes.trim() === '' ? t('historical_default_note') : currentItem.notes;
        
        // เพิ่ม cost/price (ที่เป็นตัวเลข) เข้าไปใน Object ที่จะ add ลง List
        setItems([...items, { 
            ...currentItem, 
            notes: noteToAdd, 
            id: Date.now(),
            purchasePrice: parsedPurchasePrice, // ส่งเป็น Number
            sellingPrice: parsedSellingPrice  // ส่งเป็น Number
        }]);

        // Reset state (กลับไปเป็นค่า default 0 หรือค่าจาก Model)
        setCurrentItem(prev => ({
            ...prev, 
            serialNumber: '', 
            macAddress: '', 
            notes: '',
            purchasePrice: '0', 
            sellingPrice: prev.productModel ? (prev.productModel.sellingPrice !== null ? prev.productModel.sellingPrice.toLocaleString('en-US') : '0') : '0'
        }));
        serialNumberInputRef.current?.focus();
    };

    return (
        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
            <h3 className="font-semibold flex items-center gap-2">
                <PackagePlus className="h-5 w-5" />
                {t('historical_add_item_button')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>{t('product_model_label')} *</Label>
                    <ProductModelCombobox onSelect={handleModelSelect} initialModel={currentItem.productModel} />
                </div>
                <div className="space-y-2">
                    <Label>{t('supplier_label')} *</Label>
                    <SupplierCombobox selectedValue={currentItem.supplierId} onSelect={handleSupplierSelect} initialSupplier={currentItem.supplier} />
                </div>
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="serialNumber">
                        {t('serial_number_label')}
                        {currentItem.isSerialRequired && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Input ref={serialNumberInputRef} id="serialNumber" value={currentItem.serialNumber} onChange={e => setCurrentItem(prev => ({...prev, serialNumber: e.target.value.toUpperCase()}))} required={currentItem.isSerialRequired} disabled={!currentItem.productModel} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="macAddress">
                        {t('mac_address_label')}
                        {currentItem.isMacRequired && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Input id="macAddress" value={currentItem.macAddress} onChange={handleMacAddressChange} required={currentItem.isMacRequired} disabled={!currentItem.productModel} maxLength={17} placeholder={t('mac_address_placeholder')} />
                </div>
            </div>

            {/* --- START: 4. เพิ่ม JSX Input สำหรับ Cost และ Price --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                    <Label htmlFor="purchasePrice">{t('stat_total_cost')} (Cost) *</Label>
                    <Input 
                        id="purchasePrice" 
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={currentItem.purchasePrice}
                        onChange={(e) => handlePriceChange(e, (val) => setCurrentItem(p => ({...p, purchasePrice: val})))}
                        disabled={isCostLoading || !currentItem.productModel}
                    />
                    {isCostLoading && <Loader2 className="absolute right-2 top-7 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="sellingPrice">{t('product_model_form_selling_price')} *</Label>
                    <Input 
                        id="sellingPrice" 
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={currentItem.sellingPrice}
                        onChange={(e) => handlePriceChange(e, (val) => setCurrentItem(p => ({...p, sellingPrice: val})))}
                        disabled={!currentItem.productModel}
                    />
                </div>
            </div>
            {/* --- END: 4. สิ้นสุดส่วนที่เพิ่ม --- */}

            <div className="space-y-2">
                <Label htmlFor="notes">{t('notes_label')} <span className="text-xs text-slate-500 ml-2">{t('historical_note_placeholder_hint')}</span></Label>
                <Textarea id="notes" value={currentItem.notes} onChange={e => setCurrentItem(prev => ({...prev, notes: e.target.value}))} disabled={!currentItem.productModel} placeholder={t('historical_notes_placeholder')} rows={2} />
            </div>
            <Button onClick={handleAddItem} disabled={!currentItem.productModel}>{t('historical_add_item_button')}</Button>
        </div>
    );
};
// --- END Component 1 ---


// --- START: 5. Reusable Component 2: HistoricalItemList (แก้ไขให้แสดง Cost/Price) ---
const HistoricalItemList = ({ items, setItems, t }) => {
    const handleRemoveItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    if (items.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-4">
                {t('no_items_added_yet')}
            </div>
        );
    }

    return (
        <div className="border rounded-md max-h-96 overflow-y-auto">
            {items.map(item => (
                <div key={item.id} className="flex justify-between items-start p-3 border-b last:border-b-0">
                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.productModel.modelNumber}</p>
                        <p className="text-sm text-muted-foreground">{t('historical_sn_prefix')}{item.serialNumber || 'N/A'}</p>
                        {item.macAddress && <p className="text-xs text-muted-foreground">{t('historical_mac_prefix')}{item.macAddress}</p>}
                        
                        {/* --- เพิ่มการแสดง Cost/Price --- */}
                        <div className="flex gap-4 mt-1">
                             <p className="text-xs text-red-600 font-medium">Cost: {item.purchasePrice.toLocaleString('en-US')}</p>
                             <p className="text-xs text-green-600 font-medium">Price: {item.sellingPrice.toLocaleString('en-US')}</p>
                        </div>
                         {/* --- จบส่วนที่เพิ่ม --- */}

                        {item.notes && <p className="text-xs text-muted-foreground italic mt-1 break-words">{t('historical_note_prefix')}{item.notes}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="ml-2 shrink-0" onClick={() => handleRemoveItem(item.id)}>
                        <Trash2 className="h-4 w-4 text-red-500"/>
                    </Button>
                </div>
            ))}
        </div>
    );
};
// --- END Component 2 ---


// --- START: 6. หน้าหลัก HistoricalDataEntryPage (แก้ไข Logic การ Submit) ---
const HistoricalDataEntryPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);

    const [activeTab, setActiveTab] = useState('sale');
    const [saleItems, setSaleItems] = useState([]);
    const [saleCreatedAt, setSaleCreatedAt] = useState(null);
    const [saleDate, setSaleDate] = useState(null);
    const [saleCustomerId, setSaleCustomerId] = useState("");

    const [borrowItems, setBorrowItems] = useState([]);
    const [borrowCreatedAt, setBorrowCreatedAt] = useState(null);
    const [borrowDate, setBorrowDate] = useState(null);
    const [borrowCustomerId, setBorrowCustomerId] = useState("");
    const [dueDate, setDueDate] = useState(null);

    const handleSaleCreationDateChange = (newDate) => {
        setSaleCreatedAt(newDate);
        setSaleDate(newDate);
    };

    const handleBorrowCreationDateChange = (newDate) => {
        setBorrowCreatedAt(newDate);
        setBorrowDate(newDate);
    };
    
    // --- Helper Function: อัปเดตราคา Model (เหมือนใน BatchAdd) ---
    const updateModelPriceIfNeeded = async (itemsList) => {
        if (itemsList.length === 0) return true; 

        const modelId = itemsList[0].productModelId;
        const newPrice = itemsList[0].sellingPrice;
        const currentModelPrice = itemsList[0].productModel.sellingPrice;

        // ตรวจสอบว่าทุกรายการใช้ Model เดียวกันและราคาเดียวกัน
        const consistentPrice = itemsList.every(
            item => item.productModelId === modelId && item.sellingPrice === newPrice
        );

        if (!consistentPrice) {
            // หากผู้ใช้ป้อนข้อมูลย้อนหลังที่มีหลาย Model หรือหลายราคาใน Batch เดียว (ซึ่งหน้านี้อนุญาต)
            // เราจะไม่สามารถอัปเดต Master Price ได้อย่างปลอดภัย
            // ให้เราแจ้งเตือน แต่ยังอนุญาตให้ดำเนินการต่อ (เพราะการขายย้อนหลังควรยึดตามราคาที่กรอก)
            // *** หมายเหตุ: Logic ที่ดีที่สุดคือ Backend (createHistoricalSale) ควรรับ 'price snapshot' ไปเลย ***
            // แต่เนื่องจาก Backend (saleController) ปัจจุบันดึงราคาจาก Model สดๆ
            // การ Update Model Price ก่อนจึงจำเป็น
            toast.warning("Items have inconsistent models or selling prices. Cannot update master price. Historical sale will proceed using the current model price.");
            // **การแก้ไขที่นี่** หากราคาไม่สอดคล้องกัน ให้ข้ามการอัปเดตราคา Model ไปเลย
            // return false; // << เปลี่ยนจาก false เป็น true เพื่อให้ทำงานต่อได้
            return true; // อนุญาตให้ดำเนินการต่อ แต่ไม่ update ราคา
        }

        // หากราคาใหม่ (ที่สอดคล้องกัน) ต่างจากราคา Model ปัจจุบัน ให้ Update
        if (newPrice !== currentModelPrice) {
            try {
                await axiosInstance.put(`/product-models/${modelId}`, {
                    modelNumber: itemsList[0].productModel.modelNumber,
                    description: itemsList[0].productModel.description,
                    categoryId: itemsList[0].productModel.categoryId,
                    brandId: itemsList[0].productModel.brandId,
                    sellingPrice: newPrice // ราคาใหม่
                }, { headers: { Authorization: `Bearer ${token}` } });
                
                toast.info(`Product Model price for ${itemsList[0].productModel.modelNumber} updated to ${newPrice.toLocaleString()}.`);
            } catch (err) {
                toast.error("Failed to update Product Model price before submission.");
                return false; // หยุดการทำงานหากอัปเดตราคา Model ไม่สำเร็จ
            }
        }
        return true; // สำเร็จ (หรือ ไม่จำเป็นต้องอัปเดต)
    };

    // (Helper Function: createHistoricalInventory (แก้ไขให้ส่ง purchasePrice))
    const createHistoricalInventory = async (items, createdAt) => {
        try {
            const inventoryPayload = {
                createdAt: createdAt.toISOString(),
                items: items.map(item => ({
                    productModelId: item.productModelId,
                    supplierId: item.supplierId,
                    serialNumber: item.serialNumber,
                    macAddress: item.macAddress ? item.macAddress.replace(/[:-\s]/g, '') : '',
                    notes: item.notes,
                    purchasePrice: item.purchasePrice // <-- นี่คือส่วนที่แก้ไข/เพิ่มเข้ามา (จาก Goal 2)
                })),
            };
            const inventoryResponse = await axiosInstance.post('/inventory/historical', inventoryPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return inventoryResponse.data.data.map(item => item.id);
        } catch (error) {
            toast.error(error.response?.data?.error || t('error_historical_failed'));
            return null;
        }
    };

    // (Handler: handleSubmitSale (เพิ่มการเรียก updateModelPriceIfNeeded))
    const handleSubmitSale = async () => {
        if (!saleCreatedAt || !saleDate || !saleCustomerId || saleItems.length === 0) {
            toast.error(t('error_historical_all_fields_required')); return;
        }

        // 1. อัปเดตราคา Model ก่อน (ถ้าจำเป็น)
        const priceUpdateSuccess = await updateModelPriceIfNeeded(saleItems);
        if (!priceUpdateSuccess) return; // หยุดถ้าอัปเดตราคาไม่สำเร็จ

        // 2. สร้าง Inventory (พร้อม Cost)
        const newItemIds = await createHistoricalInventory(saleItems, saleCreatedAt);
        
        if (newItemIds && newItemIds.length > 0) {
            try {
                // 3. สร้าง Sale (Backend จะดึงราคา Model ที่เราเพิ่งอัปเดตไปสร้าง Snapshot)
                 const salePayload = {
                    customerId: saleCustomerId, inventoryItemIds: newItemIds,
                    saleDate: saleDate.toISOString(),
                    notes: `Historical data entry (Sale) for ${saleItems.length} item(s).`
                };
                await axiosInstance.post('/sales/historical', salePayload, { headers: { Authorization: `Bearer ${token}` } });
                toast.success(t('success_historical_created'));
                navigate('/inventory');
            } catch (error) {
                 toast.error(error.response?.data?.error || 'Failed to create historical sale record.');
            }
        }
    };

    // (Handler: handleSubmitBorrow (เพิ่มการเรียก updateModelPriceIfNeeded))
    const handleSubmitBorrow = async () => {
        if (!borrowCreatedAt || !borrowDate || !borrowCustomerId || borrowItems.length === 0) {
            toast.error(t('error_historical_all_fields_required')); return;
        }

        // 1. อัปเดตราคา Model ก่อน (ถ้าจำเป็น - เผื่อ Model นี้ยังไม่เคยตั้งราคา)
        const priceUpdateSuccess = await updateModelPriceIfNeeded(borrowItems);
        if (!priceUpdateSuccess) return;

        // 2. สร้าง Inventory (พร้อม Cost)
        const newItemIds = await createHistoricalInventory(borrowItems, borrowCreatedAt);

        if (newItemIds && newItemIds.length > 0) {
            try {
                // 3. สร้าง Borrowing
                const borrowPayload = {
                    customerId: borrowCustomerId, inventoryItemIds: newItemIds,
                    borrowDate: borrowDate.toISOString(),
                    dueDate: dueDate ? dueDate.toISOString() : null,
                    notes: `Historical data entry (Borrow) for ${borrowItems.length} item(s).`
                };
                await axiosInstance.post('/borrowings/historical', borrowPayload, { headers: { Authorization: `Bearer ${token}` } });
                toast.success(t('success_historical_borrow_created'));
                navigate('/inventory');
            } catch (error) {
                toast.error(error.response?.data?.error || t('error_historical_borrow_failed'));
            }
        }
    };

    // --- JSX ของหน้าหลัก (ส่วนนี้เหมือนเดิม ไม่ต้องแก้ไข) ---
    return (
        <div className="max-w-7xl mx-auto space-y-4">
            <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                    <BookUp className="h-6 w-6" />
                    {t('historical_entry_title')}
                </CardTitle>
                <CardDescription>
                    {t('historical_entry_description')}
                </CardDescription>
            </CardHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* --- คอลัมน์ซ้าย (ฟอร์มหลัก) --- */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardContent className="pt-6">
                             <Tabs defaultValue="sale" className="w-full" onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="sale">{t('historical_tab_sale')}</TabsTrigger>
                                    <TabsTrigger value="borrow">{t('historical_tab_borrow')}</TabsTrigger>
                                </TabsList>
                                
                                {/* --- TAB 1: SALE FORM --- */}
                                <TabsContent value="sale">
                                    <div className="space-y-6 pt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2 md:col-span-1">
                                                <Label>{t('customer_label')} *</Label>
                                                <CustomerCombobox selectedValue={saleCustomerId} onSelect={setSaleCustomerId} />
                                            </div>
                                            <div className="space-y-2 md:col-span-1">
                                                <Label htmlFor="saleCreatedAt">{t('historical_item_creation_date')} *</Label>
                                                <DatePickerWithCustomCaption value={saleCreatedAt} onChange={handleSaleCreationDateChange} />
                                            </div>
                                            <div className="space-y-2 md:col-span-1">
                                                <Label htmlFor="saleDate">{t('historical_sale_date')} *</Label>
                                                <DatePickerWithCustomCaption value={saleDate} onChange={setSaleDate} />
                                            </div>
                                        </div>
                                        <Separator />
                                        {/* เรียกใช้ Reusable Form Input (ที่แก้ไขแล้ว) */}
                                        <HistoricalItemInputs items={saleItems} setItems={setSaleItems} t={t} />
                                    </div>
                                </TabsContent>

                                {/* --- TAB 2: BORROW FORM --- */}
                                <TabsContent value="borrow">
                                    <div className="space-y-6 pt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('customer_label')} *</Label>
                                                <CustomerCombobox selectedValue={borrowCustomerId} onSelect={setBorrowCustomerId} />
                                            </div>
                                             <div className="space-y-2">
                                                <Label htmlFor="borrowCreatedAt">{t('historical_item_creation_date')} *</Label>
                                                <DatePickerWithCustomCaption value={borrowCreatedAt} onChange={handleBorrowCreationDateChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="borrowDate">{t('borrow_date_label')} *</Label>
                                                <DatePickerWithCustomCaption value={borrowDate} onChange={setBorrowDate} />
                                            </div>
                                            <div className="space-y-2 md:col-span-3"> 
                                                <Label htmlFor="dueDate">{t('due_date_label')} {t('optional_label')}</Label>
                                                <DatePickerWithCustomCaption value={dueDate} onChange={setDueDate} />
                                            </div>
                                        </div>
                                        <Separator />
                                         {/* เรียกใช้ Reusable Form Input (ที่แก้ไขแล้ว) */}
                                        <HistoricalItemInputs items={borrowItems} setItems={setBorrowItems} t={t} />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
                {/* --- END: คอลัมน์ซ้าย --- */}


                {/* --- คอลัมน์ขวา (สรุปรายการ และ ปุ่มบันทึก) --- */}
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ListChecks className="h-5 w-5" />
                                {t('historical_summary_title')}
                            </CardTitle>
                            <CardDescription>
                                {activeTab === 'sale' ? 
                                    t('historical_summary_desc_sale', { count: saleItems.length }) : 
                                    t('historical_summary_desc_borrow', { count: borrowItems.length })
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* แสดงผล List ตาม Tab (ที่แก้ไขแล้ว) */}
                            {activeTab === 'sale' ? (
                                <HistoricalItemList items={saleItems} setItems={setSaleItems} t={t} />
                            ) : (
                                <HistoricalItemList items={borrowItems} setItems={setBorrowItems} t={t} />
                            )}
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('historical_confirm_title')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* แสดงปุ่ม Submit ตาม Tab */}
                            {activeTab === 'sale' ? (
                                <Button 
                                    size="lg" 
                                    className="w-full"
                                    onClick={handleSubmitSale} 
                                    disabled={saleItems.length === 0 || !saleCustomerId || !saleDate || !saleCreatedAt}
                                >
                                    {t('historical_submit_sale_button')}
                                </Button>
                            ) : (
                                <Button 
                                    size="lg" 
                                    className="w-full"
                                    onClick={handleSubmitBorrow} 
                                    disabled={borrowItems.length === 0 || !borrowCustomerId || !borrowDate || !borrowCreatedAt}
                                >
                                    {t('historical_submit_borrow_button')}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
                {/* --- END: คอลัมน์ขวา --- */}

            </div>
        </div>
    );
};

export default HistoricalDataEntryPage;