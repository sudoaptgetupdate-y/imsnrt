// src/pages/HistoricalDataEntryPage.jsx

import { useState } from "react";
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
import { Trash2, BookUp } from "lucide-react";

const HistoricalDataEntryPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);

    // Form States
    const [createdAt, setCreatedAt] = useState('');
    const [saleDate, setSaleDate] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [items, setItems] = useState([]);
    const [currentItem, setCurrentItem] = useState({
        productModelId: null,
        productModel: null,
        supplierId: null,
        serialNumber: '',
        macAddress: '',
        isSerialRequired: false,
        isMacRequired: false,
    });

    // Helper function to format MAC address
    const formatMacAddress = (value) => {
        const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
        if (cleaned.length === 0) return '';
        return cleaned.match(/.{1,2}/g)?.slice(0, 6).join(':') || '';
    };

    // Helper function to validate MAC address
    const isValidMacAddress = (mac) => {
        if (!mac) return true; // MAC is optional, so empty/null is valid
        const cleanMac = mac.replace(/[:-\s]/g, ''); // Remove separators for validation
        return /^[0-9a-fA-F]{12}$/.test(cleanMac); // Must be 12 hex characters
    };

    const handleMacAddressChange = (e) => {
        const input = e.target.value;
        const formatted = formatMacAddress(input);
        setCurrentItem(prev => ({...prev, macAddress: formatted}));
    };

    const handleModelSelect = (model) => {
        if (model) {
            setCurrentItem(prev => ({
                ...prev,
                productModel: model,
                productModelId: model.id,
                isSerialRequired: model.category.requiresSerialNumber,
                isMacRequired: model.category.requiresMacAddress,
                serialNumber: model.category.requiresSerialNumber ? prev.serialNumber : '',
                macAddress: model.category.requiresMacAddress ? prev.macAddress : ''
            }));
        } else {
            setCurrentItem(prev => ({
                ...prev,
                productModel: null,
                productModelId: null,
                isSerialRequired: false,
                isMacRequired: false,
                serialNumber: '',
                macAddress: ''
            }));
        }
    };

    const handleAddItem = () => {
        if (!currentItem.productModel || !currentItem.supplierId) {
            toast.error(t('error_select_model_and_supplier'));
            return;
        }
        if (currentItem.isSerialRequired && !currentItem.serialNumber) {
            toast.error(t('error_serial_required_category'));
            return;
        }
        if (currentItem.isMacRequired && !currentItem.macAddress) {
            toast.error(t('error_mac_required_category'));
            return;
        }
        if (currentItem.macAddress && !isValidMacAddress(currentItem.macAddress)) {
            toast.error(t('error_invalid_mac'));
            return;
        }

        setItems([...items, { ...currentItem, id: Date.now() }]);
        setCurrentItem({
            productModelId: null,
            productModel: null,
            supplierId: null,
            serialNumber: '',
            macAddress: '',
            isSerialRequired: false,
            isMacRequired: false
        });
    };
    
    const handleRemoveItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleSubmit = async () => {
        if (!createdAt || !saleDate || !selectedCustomerId || items.length === 0) {
            toast.error(t('error_historical_all_fields_required'));
            return;
        }

        for (const item of items) {
            if (item.isMacRequired && !item.macAddress) {
                 toast.error(t('error_mac_required_for_item', { model: item.productModel?.modelNumber, sn: item.serialNumber }));
                return;
            }
            if (item.macAddress && !isValidMacAddress(item.macAddress)) {
                 toast.error(t('error_historical_invalid_mac', { mac: item.macAddress, model: item.productModel?.modelNumber, sn: item.serialNumber }));
                return;
            }
        }

        try {
            const inventoryPayload = {
                createdAt,
                items: items.map(item => ({
                    productModelId: item.productModelId,
                    supplierId: item.supplierId,
                    serialNumber: item.serialNumber,
                    macAddress: item.macAddress ? item.macAddress.replace(/[:-\s]/g, '') : '',
                })),
            };
            const inventoryResponse = await axiosInstance.post('/inventory/historical', inventoryPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const newItemIds = inventoryResponse.data.data.map(item => item.id);
            const salePayload = {
                customerId: selectedCustomerId,
                inventoryItemIds: newItemIds,
                saleDate,
                notes: `Historical data entry for ${items.length} item(s).`
            };
             await axiosInstance.post('/sales/historical', salePayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(t('success_historical_created'));
            navigate('/inventory');

        } catch (error) {
             toast.error(error.response?.data?.error || t('error_historical_failed'));
        }
    };


    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BookUp className="h-6 w-6" />
                    {t('historical_entry_title')}
                </CardTitle>
                <CardDescription>
                    {t('historical_entry_description')}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="createdAt">{t('historical_item_creation_date')} *</Label>
                        <Input id="createdAt" type="date" value={createdAt} onChange={e => setCreatedAt(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="saleDate">{t('historical_sale_date')} *</Label>
                        <Input id="saleDate" type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('customer_label')} *</Label>
                        <CustomerCombobox selectedValue={selectedCustomerId} onSelect={setSelectedCustomerId} />
                    </div>
                </div>

                <Separator />
                
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-semibold">{t('historical_add_item_to_sale')}</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>{t('product_model_label')} *</Label>
                            <ProductModelCombobox onSelect={handleModelSelect} />
                         </div>
                         <div className="space-y-2">
                            <Label>{t('supplier_label')} *</Label>
                            <SupplierCombobox 
                                selectedValue={currentItem.supplierId} 
                                onSelect={(id) => setCurrentItem(prev => ({...prev, supplierId: id}))} 
                            />
                         </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="serialNumber">
                                {t('serial_number_label')}
                                {currentItem.isSerialRequired && <span className="text-red-500 ml-1">*</span>}
                                {!currentItem.isSerialRequired && currentItem.productModel && <span className="text-xs text-slate-500 ml-2">({t('not_required_label')})</span>}
                            </Label>
                            <Input 
                                id="serialNumber" 
                                value={currentItem.serialNumber} 
                                onChange={e => setCurrentItem(prev => ({...prev, serialNumber: e.target.value.toUpperCase()}))} 
                                required={currentItem.isSerialRequired}
                                disabled={!currentItem.productModel}
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="macAddress">
                                {t('mac_address_label')}
                                {currentItem.isMacRequired && <span className="text-red-500 ml-1">*</span>}
                                {!currentItem.isMacRequired && currentItem.productModel && <span className="text-xs text-slate-500 ml-2">({t('not_required_label')})</span>}
                            </Label>
                            <Input 
                                id="macAddress" 
                                value={currentItem.macAddress} 
                                onChange={handleMacAddressChange}
                                required={currentItem.isMacRequired}
                                disabled={!currentItem.productModel}
                                maxLength={17}
                                placeholder={t('mac_address_placeholder')}
                            />
                        </div>
                     </div>
                     <Button onClick={handleAddItem} disabled={!currentItem.productModel}>{t('historical_add_item_button')}</Button>
                </div>
                
                <div>
                    <h3 className="font-semibold mb-2">{t('historical_items_to_create', { count: items.length })}</h3>
                    <div className="border rounded-md max-h-60 overflow-y-auto">
                        {items.map(item => (
                             <div key={item.id} className="flex justify-between items-center p-2 border-b">
                                <div>
                                    <p className="font-medium">{item.productModel.modelNumber}</p>
                                    <p className="text-sm text-muted-foreground">S/N: {item.serialNumber}</p>
                                    {item.macAddress && <p className="text-xs text-muted-foreground">MAC: {item.macAddress}</p>}
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)}>
                                    <Trash2 className="h-4 w-4 text-red-500"/>
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

            </CardContent>
            <CardFooter>
                <Button size="lg" onClick={handleSubmit}>{t('historical_submit_button')}</Button>
            </CardFooter>
        </Card>
    );
};

export default HistoricalDataEntryPage;

