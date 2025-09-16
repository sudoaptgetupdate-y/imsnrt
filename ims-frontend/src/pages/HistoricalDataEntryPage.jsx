// src/pages/HistoricalDataEntryPage.jsx

import { useState, useRef } from "react";
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
import { Trash2, BookUp, PackagePlus, ListChecks } from "lucide-react";
import { DatePickerWithCustomCaption } from "@/components/ui/DatePickerWithCustomCaption";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


// --- START: 1. Reusable Component 1: ส่วน Input Form ---
// (Component นี้จะถูกเรียกใช้ใน Tab Sale และ Tab Borrow)
const HistoricalItemInputs = ({ items, setItems, t }) => {
    
    const serialNumberInputRef = useRef(null);
    const [currentItem, setCurrentItem] = useState({
        productModelId: null, productModel: null, supplierId: null, supplier: null,
        serialNumber: '', macAddress: '', notes: '',
        isSerialRequired: false, isMacRequired: false,
    });

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
    
    const handleModelSelect = (model) => {
        if (model) {
            setCurrentItem(prev => ({
                ...prev, productModel: model, productModelId: model.id,
                isSerialRequired: model.category.requiresSerialNumber, isMacRequired: model.category.requiresMacAddress,
                serialNumber: prev.serialNumber, macAddress: prev.macAddress,
            }));
        } else {
            setCurrentItem(prev => ({
                ...prev, productModel: null, productModelId: null,
                isSerialRequired: false, isMacRequired: false,
                serialNumber: '', macAddress: '', notes: '',
            }));
        }
    };
    
    const handleSupplierSelect = (supplier) => {
        if (supplier) {
            setCurrentItem(prev => ({...prev, supplierId: supplier.id, supplier: supplier }));
        } else {
            setCurrentItem(prev => ({...prev, supplierId: null, supplier: null }));
        }
    };

    const handleAddItem = () => {
        if (!currentItem.productModel || !currentItem.supplierId) {
            toast.error(t('error_select_model_and_supplier')); return;
        }
        if (currentItem.isSerialRequired && !currentItem.serialNumber.trim()) {
            toast.error(t('error_serial_required_category')); return;
        }
        if (currentItem.isMacRequired && !currentItem.macAddress.trim()) {
            toast.error(t('error_mac_required_category')); return;
        }
        if (currentItem.macAddress && !isValidMacAddress(currentItem.macAddress)) {
            toast.error(t('error_invalid_mac')); return;
        }
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

        // --- START: TRANSLATED ---
        const noteToAdd = currentItem.notes.trim() === '' ? t('historical_default_note') : currentItem.notes;
        // --- END ---
        setItems([...items, { ...currentItem, notes: noteToAdd, id: Date.now() }]);
        setCurrentItem(prev => ({
            ...prev, serialNumber: '', macAddress: '', notes: '',
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
            {/* --- START: TRANSLATED --- */}
            <div className="space-y-2">
                <Label htmlFor="notes">{t('notes_label')} <span className="text-xs text-slate-500 ml-2">{t('historical_note_placeholder_hint')}</span></Label>
                <Textarea id="notes" value={currentItem.notes} onChange={e => setCurrentItem(prev => ({...prev, notes: e.target.value}))} disabled={!currentItem.productModel} placeholder={t('historical_notes_placeholder')} rows={2} />
            </div>
            {/* --- END --- */}
            <Button onClick={handleAddItem} disabled={!currentItem.productModel}>{t('historical_add_item_button')}</Button>
        </div>
    );
};
// --- END Component 1 ---


// --- START: 2. Reusable Component 2: ส่วนแสดงผล List ---
const HistoricalItemList = ({ items, setItems, t }) => {
    const handleRemoveItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    if (items.length === 0) {
        return (
             // --- START: TRANSLATED ---
            <div className="text-center text-muted-foreground py-4">
                {t('no_items_added_yet')}
            </div>
             // --- END ---
        );
    }

    return (
        <div className="border rounded-md max-h-96 overflow-y-auto">
            {items.map(item => (
                <div key={item.id} className="flex justify-between items-start p-3 border-b last:border-b-0">
                    <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.productModel.modelNumber}</p>
                         {/* --- START: TRANSLATED --- */}
                        <p className="text-sm text-muted-foreground">{t('historical_sn_prefix')}{item.serialNumber || 'N/A'}</p>
                        {item.macAddress && <p className="text-xs text-muted-foreground">{t('historical_mac_prefix')}{item.macAddress}</p>}
                        {item.notes && <p className="text-xs text-muted-foreground italic mt-1 break-words">{t('historical_note_prefix')}{item.notes}</p>}
                         {/* --- END --- */}
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


// --- START: 3. หน้าหลัก HistoricalDataEntryPage (ใช้ Layout แบบ 2 คอลัมน์) ---
const HistoricalDataEntryPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);

    // State สำหรับ Active Tab
    const [activeTab, setActiveTab] = useState('sale');

    // State สำหรับ Tab Sale
    const [saleItems, setSaleItems] = useState([]);
    const [saleCreatedAt, setSaleCreatedAt] = useState(null);
    const [saleDate, setSaleDate] = useState(null);
    const [saleCustomerId, setSaleCustomerId] = useState("");

    // State สำหรับ Tab Borrow
    const [borrowItems, setBorrowItems] = useState([]);
    const [borrowCreatedAt, setBorrowCreatedAt] = useState(null);
    const [borrowDate, setBorrowDate] = useState(null);
    const [borrowCustomerId, setBorrowCustomerId] = useState("");
    const [dueDate, setDueDate] = useState(null);

    // --- START: Handlers สำหรับตั้งค่าวันที่อัตโนมัติ (ฟีเจอร์ล่าสุด) ---
    const handleSaleCreationDateChange = (newDate) => {
        setSaleCreatedAt(newDate); // 1. ตั้งค่าวันที่สร้าง
        setSaleDate(newDate);      // 2. ตั้งค่าวันที่ขาย (อัตโนมัติ)
    };

    const handleBorrowCreationDateChange = (newDate) => {
        setBorrowCreatedAt(newDate); // 1. ตั้งค่าวันที่สร้าง
        setBorrowDate(newDate);      // 2. ตั้งค่าวันที่ยืม (อัตโนมัติ)
    };
    // --- END: Handlers ---

    // (Helper Function: createHistoricalInventory)
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

    // (Handler: handleSubmitSale)
    const handleSubmitSale = async () => {
        if (!saleCreatedAt || !saleDate || !saleCustomerId || saleItems.length === 0) {
            toast.error(t('error_historical_all_fields_required')); return;
        }
        const newItemIds = await createHistoricalInventory(saleItems, saleCreatedAt);
        if (newItemIds && newItemIds.length > 0) {
            try {
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

    // (Handler: handleSubmitBorrow)
    const handleSubmitBorrow = async () => {
        if (!borrowCreatedAt || !borrowDate || !borrowCustomerId || borrowItems.length === 0) {
            toast.error(t('error_historical_all_fields_required')); return;
        }
        const newItemIds = await createHistoricalInventory(borrowItems, borrowCreatedAt);
        if (newItemIds && newItemIds.length > 0) {
            try {
                const borrowPayload = {
                    customerId: borrowCustomerId, inventoryItemIds: newItemIds,
                    borrowDate: borrowDate.toISOString(),
                    dueDate: dueDate ? dueDate.toISOString() : null,
                    notes: `Historical data entry (Borrow) for ${borrowItems.length} item(s).`
                };
                await axiosInstance.post('/borrowings/historical', borrowPayload, { headers: { Authorization: `Bearer ${token}` } });
                // --- START: TRANSLATED ---
                toast.success(t('success_historical_borrow_created'));
                // --- END ---
                navigate('/inventory');
            } catch (error) {
                 // --- START: TRANSLATED ---
                toast.error(error.response?.data?.error || t('error_historical_borrow_failed'));
                // --- END ---
            }
        }
    };

    // --- JSX ของหน้าหลัก (Grid Layout) ---
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
                
                {/* --- START: คอลัมน์ซ้าย (ฟอร์มหลัก) --- */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardContent className="pt-6">
                             <Tabs defaultValue="sale" className="w-full" onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-2">
                                    {/* --- START: TRANSLATED --- */}
                                    <TabsTrigger value="sale">{t('historical_tab_sale')}</TabsTrigger>
                                    <TabsTrigger value="borrow">{t('historical_tab_borrow')}</TabsTrigger>
                                    {/* --- END --- */}
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
                                                {/* ใช้ Handler ใหม่ที่นี่ */}
                                                <DatePickerWithCustomCaption value={saleCreatedAt} onChange={handleSaleCreationDateChange} />
                                            </div>
                                            <div className="space-y-2 md:col-span-1">
                                                <Label htmlFor="saleDate">{t('historical_sale_date')} *</Label>
                                                <DatePickerWithCustomCaption value={saleDate} onChange={setSaleDate} />
                                            </div>
                                        </div>
                                        <Separator />
                                        {/* เรียกใช้ Reusable Form Input (ส่ง State ของ Sale) */}
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
                                                 {/* ใช้ Handler ใหม่ที่นี่ */}
                                                <DatePickerWithCustomCaption value={borrowCreatedAt} onChange={handleBorrowCreationDateChange} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="borrowDate">{t('borrow_date_label')} *</Label>
                                                <DatePickerWithCustomCaption value={borrowDate} onChange={setBorrowDate} />
                                            </div>
                                            <div className="space-y-2 md:col-span-3"> 
                                                {/* --- START: TRANSLATED --- */}
                                                <Label htmlFor="dueDate">{t('due_date_label')} {t('optional_label')}</Label>
                                                {/* --- END --- */}
                                                <DatePickerWithCustomCaption value={dueDate} onChange={setDueDate} />
                                            </div>
                                        </div>
                                        <Separator />
                                         {/* เรียกใช้ Reusable Form Input (ส่ง State ของ Borrow) */}
                                        <HistoricalItemInputs items={borrowItems} setItems={setBorrowItems} t={t} />
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
                {/* --- END: คอลัมน์ซ้าย --- */}


                {/* --- START: คอลัมน์ขวา (สรุปรายการ และ ปุ่มบันทึก) --- */}
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-4">
                    <Card>
                        <CardHeader>
                             {/* --- START: TRANSLATED --- */}
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
                             {/* --- END --- */}
                        </CardHeader>
                        <CardContent>
                            {/* แสดงผล List ตาม Tab ที่เลือก */}
                            {activeTab === 'sale' ? (
                                <HistoricalItemList items={saleItems} setItems={setSaleItems} t={t} />
                            ) : (
                                <HistoricalItemList items={borrowItems} setItems={setBorrowItems} t={t} />
                            )}
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                             {/* --- START: TRANSLATED --- */}
                            <CardTitle>{t('historical_confirm_title')}</CardTitle>
                             {/* --- END --- */}
                        </CardHeader>
                        <CardContent>
                            {/* แสดงปุ่ม Submit ตาม Tab ที่เลือก */}
                            {activeTab === 'sale' ? (
                                <Button 
                                    size="lg" 
                                    className="w-full"
                                    onClick={handleSubmitSale} 
                                    disabled={saleItems.length === 0 || !saleCustomerId || !saleDate || !saleCreatedAt}
                                >
                                    {/* --- START: TRANSLATED --- */}
                                    {t('historical_submit_sale_button')}
                                    {/* --- END --- */}
                                </Button>
                            ) : (
                                <Button 
                                    size="lg" 
                                    className="w-full"
                                    onClick={handleSubmitBorrow} 
                                    disabled={borrowItems.length === 0 || !borrowCustomerId || !borrowDate || !borrowCreatedAt}
                                    // --- START: MODIFIED - ลบ variant="secondary" ออก ---
                                    // variant="secondary" 
                                    // --- END: MODIFIED ---
                                >
                                    {/* --- START: TRANSLATED --- */}
                                    {t('historical_submit_borrow_button')}
                                    {/* --- END --- */}
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