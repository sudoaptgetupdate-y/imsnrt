import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { SupplierCombobox } from "@/components/ui/SupplierCombobox";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";
import { UserCombobox } from "@/components/ui/UserCombobox";
import { DatePickerWithCustomCaption } from "@/components/ui/DatePickerWithCustomCaption";
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { useTranslation } from "react-i18next";
import { X, Plus, AlertTriangle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


const formatMacAddress = (value) => {
    const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (cleaned.length === 0) return '';
    return cleaned.match(/.{1,2}/g)?.slice(0, 6).join(':') || cleaned;
};

const validateMacAddress = (mac) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

const INITIAL_NEW_ITEM_STATE = {
    productModel: null,
    supplier: null,
    serialNumber: '',
    macAddress: '',
    purchasePrice: '', // <-- START: PHASE 5 (1. เพิ่ม purchasePrice)
    notes: ''
};

export default function HistoricalDataEntryPage() {
    const { t } = useTranslation();
    const { token, user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    // Common state
    const [itemsToCreate, setItemsToCreate] = useState([]);
    const [newItem, setNewItem] = useState(INITIAL_NEW_ITEM_STATE);

    // Sale specific state
    const [saleDate, setSaleDate] = useState(null);
    const [saleCustomer, setSaleCustomer] = useState(null);
    const [saleNotes, setSaleNotes] = useState('');
    
    // Borrow specific state
    const [borrowDate, setBorrowDate] = useState(null);
    const [borrowDueDate, setBorrowDueDate] = useState(null);
    const [borrowCustomer, setBorrowCustomer] = useState(null);
    const [borrowNotes, setBorrowNotes] = useState('');
    const [borrowApproverId, setBorrowApproverId] = useState(null);


    const handleNewItemChange = (field, value) => {
        let processedValue = value;
        if (field === 'macAddress') {
            processedValue = formatMacAddress(value);
        } else if (field === 'serialNumber') {
            processedValue = value.toUpperCase();
        }
        setNewItem(prev => ({ ...prev, [field]: processedValue }));
    };

    const handleAddItem = () => {
        const { productModel, supplier, serialNumber, macAddress, purchasePrice } = newItem; // <-- PHASE 5 (2. ดึงค่า)
        
        try {
            if (!productModel || !supplier) {
                throw new Error(t('error_select_model_and_supplier'));
            }
            if (productModel.category.requiresSerialNumber && !serialNumber.trim()) {
                throw new Error(t('error_serial_required_category'));
            }
            
            // --- START: PHASE 5 (3. ตรวจสอบ purchasePrice) ---
            const parsedPurchasePrice = parseFloat(purchasePrice);
            if (purchasePrice === '' || isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0) {
                 throw new Error(t('error_historical_cost_required'));
            }
            // --- END: PHASE 5 ---
            
            const cleanMac = macAddress.trim();
            if (productModel.category.requiresMacAddress && !cleanMac) {
                const errorMsg = t('error_mac_required_for_item', { model: productModel.modelNumber, sn: serialNumber || 'N/A' });
                throw new Error(errorMsg);
            }
            if (cleanMac && !validateMacAddress(cleanMac)) {
                const errorMsg = t('error_historical_invalid_mac', { mac: cleanMac, model: productModel.modelNumber, sn: serialNumber || 'N/A' });
                throw new Error(errorMsg);
            }

            setItemsToCreate(prev => [
                ...prev, 
                {
                    ...newItem,
                    serialNumber: serialNumber.trim(),
                    macAddress: cleanMac,
                    purchasePrice: parsedPurchasePrice // <-- PHASE 5 (4. บันทึกค่าที่แปลงแล้ว)
                }
            ]);
            setNewItem(INITIAL_NEW_ITEM_STATE);
            
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleRemoveItem = (index) => {
        setItemsToCreate(prev => prev.filter((_, i) => i !== index));
    };
    
    const resetSaleForm = () => {
        setItemsToCreate([]);
        setNewItem(INITIAL_NEW_ITEM_STATE);
        setSaleDate(null);
        setSaleCustomer(null);
        setSaleNotes('');
    };
    
    // ... (resetBorrowForm remains the same) ...
     const resetBorrowForm = () => {
        setItemsToCreate([]);
        setNewItem(INITIAL_NEW_ITEM_STATE);
        setBorrowDate(null);
        setBorrowDueDate(null);
        setBorrowCustomer(null);
        setBorrowNotes('');
        setBorrowApproverId(null);
    };

    // --- START: PHASE 5 (5. อัปเดต payload ให้มี purchasePrice) ---
    const handleSubmitHistoricalSale = async () => {
        setIsLoading(true);
        try {
            if (!saleCustomer || !saleDate || itemsToCreate.length === 0) {
                throw new Error(t('error_historical_all_fields_required'));
            }

            const payload = {
                customerId: saleCustomer.id,
                saleDate: saleDate,
                notes: saleNotes.trim() || t('historical_default_note'),
                items: itemsToCreate.map(item => ({
                    productModelId: item.productModel.id,
                    supplierId: item.supplier.id,
                    serialNumber: item.serialNumber,
                    macAddress: item.macAddress,
                    purchasePrice: item.purchasePrice, // <-- ส่งต้นทุน
                    notes: item.notes
                }))
            };
            
            await axiosInstance.post('/sales/historical', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            toast.success(t('success_historical_created'));
            resetSaleForm();

        } catch (error) {
            toast.error(error.response?.data?.error || error.message || t('error_historical_failed'));
        } finally {
            setIsLoading(false);
        }
    };
    // --- END: PHASE 5 ---

    // --- START: PHASE 5 (6. อัปเดต payload ให้มี purchasePrice) ---
     const handleSubmitHistoricalBorrow = async () => {
        setIsLoading(true);
         try {
            if (!borrowCustomer || !borrowDate || !borrowApproverId || itemsToCreate.length === 0) {
                throw new Error(t('error_historical_all_fields_required'));
            }
            
            const payload = {
                customerId: borrowCustomer.id,
                borrowDate: borrowDate,
                dueDate: borrowDueDate,
                approvedById: borrowApproverId,
                notes: borrowNotes.trim() || t('historical_default_note'),
                items: itemsToCreate.map(item => ({
                    productModelId: item.productModel.id,
                    supplierId: item.supplier.id,
                    serialNumber: item.serialNumber,
                    macAddress: item.macAddress,
                    purchasePrice: item.purchasePrice, // <-- ส่งต้นทุน
                    notes: item.notes
                }))
            };
            
             await axiosInstance.post('/borrowing/historical', payload, {
                 headers: { Authorization: `Bearer ${token}` }
             });

            toast.success(t('success_historical_borrow_created'));
            resetBorrowForm();

         } catch (error)
         {
             toast.error(error.response?.data?.error || error.message || t('error_historical_borrow_failed'));
         } finally {
            setIsLoading(false);
         }
     };
    // --- END: PHASE 5 ---


    return (
        <div className="container mx-auto p-4">
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>{t('historical_entry_title')}</CardTitle>
                    <CardDescription>{t('historical_entry_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="sale" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="sale">{t('historical_tab_sale')}</TabsTrigger>
                            <TabsTrigger value="borrow">{t('historical_tab_borrow')}</TabsTrigger>
                        </TabsList>
                        
                        {/* ==================== HISTORICAL SALE TAB ==================== */}
                        <TabsContent value="sale">
                            <div className="space-y-6 p-1">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('historical_add_item_to_sale')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('product_model_label')} <span className="text-red-500">*</span></Label>
                                                <ProductModelCombobox onSelect={(model) => handleNewItemChange('productModel', model)} selectedValue={newItem.productModel} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('supplier_label')} <span className="text-red-500">*</span></Label>
                                                <SupplierCombobox onSelect={(supplier) => handleNewItemChange('supplier', supplier)} selectedValue={newItem.supplier?.id} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('serial_number_label')}</Label>
                                                <Input value={newItem.serialNumber} onChange={(e) => handleNewItemChange('serialNumber', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('mac_address_label')}</Label>
                                                <Input value={newItem.macAddress} onChange={(e) => handleNewItemChange('macAddress', e.target.value)} />
                                            </div>
                                            {/* --- START: PHASE 5 (7. เพิ่มช่องกรอก Purchase Price) --- */}
                                            <div className="space-y-2">
                                                <Label>Purchase Price (Cost) <span className="text-red-500">*</span></Label>
                                                <Input type="number" value={newItem.purchasePrice} onChange={(e) => handleNewItemChange('purchasePrice', e.target.value)} />
                                            </div>
                                            {/* --- END: PHASE 5 --- */}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('notes_label')} <span className="text-muted-foreground text-xs ml-1">{t('optional_label')}</span></Label>
                                            <Input value={newItem.notes} onChange={(e) => handleNewItemChange('notes', e.target.value)} placeholder={t('historical_notes_placeholder')}/>
                                        </div>
                                        <Button onClick={handleAddItem}><Plus className="mr-2 h-4 w-4" /> {t('historical_add_item_button')}</Button>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('historical_summary_title')}</CardTitle>
                                        <CardDescription>{t('historical_summary_desc_sale', { count: itemsToCreate.length })}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {itemsToCreate.length === 0 ? (
                                            <p className="text-muted-foreground">{t('no_items_added_yet')}</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {itemsToCreate.map((item, index) => (
                                                    <li key={index} className="flex justify-between items-center p-2 border rounded-md">
                                                        <div>
                                                            <p className="font-medium">{item.productModel.modelNumber}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {t('historical_sn_prefix')} {item.serialNumber || 'N/A'} | {t('historical_mac_prefix')} {item.macAddress || 'N/A'}
                                                            </p>
                                                            {/* --- START: PHASE 5 (8. แสดง Price ที่เพิ่ม) --- */}
                                                            <p className="text-sm text-muted-foreground">
                                                                Cost: {item.purchasePrice} | Supplier: {item.supplier.name}
                                                            </p>
                                                            {/* --- END: PHASE 5 --- */}
                                                            {item.notes && <p className="text-xs text-blue-600">{t('historical_note_prefix')} {item.notes}</p>}
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                                            <X className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                    <div className="space-y-2">
                                        <Label>{t('customer_label')} <span className="text-red-500">*</span></Label>
                                        <CustomerCombobox onSelect={setSaleCustomer} selectedValue={saleCustomer?.id} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('historical_sale_date')} <span className="text-red-500">*</span></Label>
                                        <DatePickerWithCustomCaption date={saleDate} setDate={setSaleDate} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('notes_label')}</Label>
                                    <Textarea 
                                        value={saleNotes} 
                                        onChange={(e) => setSaleNotes(e.target.value)} 
                                        placeholder={t('historical_note_placeholder_hint')}
                                    />
                                </div>
                                
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button 
                                            className="w-full" 
                                            disabled={isLoading || itemsToCreate.length === 0 || !saleCustomer || !saleDate}
                                        >
                                            {isLoading ? t('saving') : t('historical_submit_sale_button')}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('historical_confirm_title')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                 {t('historical_summary_desc_sale', { count: itemsToCreate.length })}. {t('dialog_confirm_return_description_continue')}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleSubmitHistoricalSale} disabled={isLoading}>
                                                {t('confirm')}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TabsContent>
                        
                        {/* ==================== HISTORICAL BORROW TAB (No changes needed here for purchasePrice, but included for context) ==================== */}
                        <TabsContent value="borrow">
                             <div className="space-y-6 p-1">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('historical_add_item_to_sale')}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('product_model_label')} <span className="text-red-500">*</span></Label>
                                                <ProductModelCombobox onSelect={(model) => handleNewItemChange('productModel', model)} selectedValue={newItem.productModel} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('supplier_label')} <span className="text-red-500">*</span></Label>
                                                <SupplierCombobox onSelect={(supplier) => handleNewItemChange('supplier', supplier)} selectedValue={newItem.supplier?.id} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label>{t('serial_number_label')}</Label>
                                                <Input value={newItem.serialNumber} onChange={(e) => handleNewItemChange('serialNumber', e.target.value)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>{t('mac_address_label')}</Label>
                                                <Input value={newItem.macAddress} onChange={(e) => handleNewItemChange('macAddress', e.target.value)} />
                                            </div>
                                             {/* --- START: PHASE 5 (9. เพิ่มช่องกรอก Purchase Price) --- */}
                                            <div className="space-y-2">
                                                <Label>Purchase Price (Cost) <span className="text-red-500">*</span></Label>
                                                <Input type="number" value={newItem.purchasePrice} onChange={(e) => handleNewItemChange('purchasePrice', e.target.value)} />
                                            </div>
                                            {/* --- END: PHASE 5 --- */}
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('notes_label')} <span className="text-muted-foreground text-xs ml-1">{t('optional_label')}</span></Label>
                                            <Input value={newItem.notes} onChange={(e) => handleNewItemChange('notes', e.target.value)} placeholder={t('historical_notes_placeholder')}/>
                                        </div>
                                        <Button onClick={handleAddItem}><Plus className="mr-2 h-4 w-4" /> {t('historical_add_item_button')}</Button>
                                    </CardContent>
                                </Card>
                                
                                <Card>
                                    <CardHeader>
                                        <CardTitle>{t('historical_summary_title')}</CardTitle>
                                        <CardDescription>{t('historical_summary_desc_borrow', { count: itemsToCreate.length })}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {itemsToCreate.length === 0 ? (
                                            <p className="text-muted-foreground">{t('no_items_added_yet')}</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {itemsToCreate.map((item, index) => (
                                                    <li key={index} className="flex justify-between items-center p-2 border rounded-md">
                                                        <div>
                                                            <p className="font-medium">{item.productModel.modelNumber}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {t('historical_sn_prefix')} {item.serialNumber || 'N/A'} | {t('historical_mac_prefix')} {item.macAddress || 'N/A'}
                                                            </p>
                                                            {/* --- START: PHASE 5 (10. แสดง Price ที่เพิ่ม) --- */}
                                                            <p className="text-sm text-muted-foreground">
                                                                Cost: {item.purchasePrice} | Supplier: {item.supplier.name}
                                                            </p>
                                                            {/* --- END: PHASE 5 --- */}
                                                            {item.notes && <p className="text-xs text-blue-600">{t('historical_note_prefix')} {item.notes}</p>}
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                                            <X className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </CardContent>
                                </Card>
                                
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                    <div className="space-y-2">
                                        <Label>{t('borrower')} <span className="text-red-500">*</span></Label>
                                        <CustomerCombobox onSelect={setBorrowCustomer} selectedValue={borrowCustomer?.id} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('approved_by')} <span className="text-red-500">*</span></Label>
                                        <UserCombobox onSelect={(user) => setBorrowApproverId(user ? user.id : null)} selectedValue={borrowApproverId} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                    <div className="space-y-2">
                                        <Label>{t('borrow_date_label')} <span className="text-red-500">*</span></Label>
                                        <DatePickerWithCustomCaption date={borrowDate} setDate={setBorrowDate} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('due_date_label')} <span className="text-muted-foreground text-xs ml-1">{t('optional_label')}</span></Label>
                                        <DatePickerWithCustomCaption date={borrowDueDate} setDate={setBorrowDueDate} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('notes_label')}</Label>
                                    <Textarea 
                                        value={borrowNotes} 
                                        onChange={(e) => setBorrowNotes(e.target.value)} 
                                        placeholder={t('historical_note_placeholder_hint')}
                                    />
                                </div>
                                
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button 
                                            className="w-full" 
                                            disabled={isLoading || itemsToCreate.length === 0 || !borrowCustomer || !borrowDate || !borrowApproverId}
                                        >
                                            {isLoading ? t('saving') : t('historical_submit_borrow_button')}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('historical_confirm_title')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {t('historical_summary_desc_borrow', { count: itemsToCreate.length })}. {t('dialog_confirm_return_description_continue')}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleSubmitHistoricalBorrow} disabled={isLoading}>
                                                {t('confirm')}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}