import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { SupplierCombobox } from "@/components/ui/SupplierCombobox"; // --- (1. Import) ---
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';

const formatMacAddress = (value) => {
    const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
    if (cleaned.length === 0) return '';
    return cleaned.match(/.{1,2}/g)?.slice(0, 6).join(':') || cleaned;
};

const validateMacAddress = (mac) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};


export default function CreateAssetPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    
    // --- START: PHASE 5 (2. เพิ่ม purchasePrice ใน state) ---
    const [formData, setFormData] = useState({
        assetCode: '',
        serialNumber: '',
        macAddress: '',
        notes: '',
        purchasePrice: '' 
    });
    // --- END: PHASE 5 ---
    
    const [selectedModel, setSelectedModel] = useState(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState(null); // --- (3. เพิ่ม SupplierId) ---
    
    const [isLoading, setIsLoading] = useState(false);
    const [categoryInfo, setCategoryInfo] = useState({
        name: '',
        requiresSerialNumber: false,
        requiresMacAddress: false
    });

    useEffect(() => {
        if (selectedModel) {
            setCategoryInfo({
                name: selectedModel.category.name,
                requiresSerialNumber: selectedModel.category.requiresSerialNumber,
                requiresMacAddress: selectedModel.category.requiresMacAddress
            });
        } else {
            setCategoryInfo({
                name: '',
                requiresSerialNumber: false,
                requiresMacAddress: false
            });
        }
    }, [selectedModel]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const { assetCode, serialNumber, macAddress, notes, purchasePrice } = formData;

        if (!selectedModel) {
            toast.error(t('error_select_model'));
            setIsLoading(false);
            return;
        }
        
        // --- START: PHASE 5 (4. เพิ่มการตรวจสอบ Supplier) ---
        if (!selectedSupplierId) {
            toast.error(t('error_select_supplier'));
            setIsLoading(false);
            return;
        }
        // --- END: PHASE 5 ---

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
        
        // --- START: PHASE 5 (5. ตรวจสอบ purchasePrice) ---
        const parsedPurchasePrice = parseFloat(purchasePrice);
        if (purchasePrice !== '' && (isNaN(parsedPurchasePrice) || parsedPurchasePrice < 0)) {
            toast.error("Purchase Price must be a valid non-negative number.");
            setIsLoading(false);
            return;
        }
        // --- END: PHASE 5 ---
        
        try {
            // --- START: PHASE 5 (6. เพิ่ม purchasePrice และ supplierId ใน payload) ---
            const payload = {
                productModelId: selectedModel.id,
                supplierId: parseInt(selectedSupplierId),
                assetCode: assetCode.trim(),
                serialNumber: serialNumber.trim() || null,
                macAddress: macAddress.trim() || null,
                notes: notes.trim() || null,
                purchasePrice: purchasePrice ? parsedPurchasePrice : null
            };
            // --- END: PHASE 5 ---

            await axiosInstance.post('/assets', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`Asset ${assetCode} has been created successfully!`);
            navigate('/assets/list');

        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create asset.");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <Button variant="outline" size="sm" onClick={() => navigate('/assets/list')} className="mb-4">
                <ChevronLeft className="mr-2 h-4 w-4" />
                {t('create_asset_back_button')}
            </Button>
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>{t('create_asset_title')}</CardTitle>
                        <CardDescription>{t('create_asset_description')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="productModel">{t('product_model_label')} <span className="text-red-500">{t('required_field')}</span></Label>
                                <ProductModelCombobox onSelect={setSelectedModel} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">{t('category_label')}</Label>
                                <Input id="category" value={categoryInfo.name} disabled readOnly />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="assetCode">{t('asset_code_label')} <span className="text-red-500">{t('required_field')}</span></Label>
                            <Input id="assetCode" value={formData.assetCode} onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="serialNumber">
                                    {t('serial_number_label')}
                                    {categoryInfo.requiresSerialNumber ? (
                                        <span className="text-red-500 ml-1">{t('required_field')}</span>
                                    ) : (
                                        <span className="text-muted-foreground text-xs ml-1">{t('not_required_label')}</span>
                                    )}
                                </Label>
                                <Input id="serialNumber" value={formData.serialNumber} onChange={handleChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="macAddress">
                                    {t('mac_address_label')}
                                    {categoryInfo.requiresMacAddress ? (
                                        <span className="text-red-500 ml-1">{t('required_field')}</span>
                                    ) : (
                                        <span className="text-muted-foreground text-xs ml-1">{t('not_required_label')}</span>
                                    )}
                                </Label>
                                <Input id="macAddress" value={formData.macAddress} onChange={handleChange} placeholder={t('mac_address_placeholder')} />
                            </div>
                        </div>
                        
                        {/* --- START: PHASE 5 (7. เพิ่มช่องกรอก Supplier และ Purchase Price) --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label htmlFor="supplier">{t('supplier_label')} <span className="text-red-500">{t('required_field')}</span></Label>
                                <SupplierCombobox
                                    selectedValue={selectedSupplierId}
                                    onSelect={(supplier) => setSelectedSupplierId(supplier ? String(supplier.id) : null)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="purchasePrice">Purchase Price (Cost) <span className="text-muted-foreground text-xs ml-1">{t('optional_label')}</span></Label>
                                <Input 
                                    id="purchasePrice" 
                                    type="number"
                                    placeholder="Enter cost price..."
                                    value={formData.purchasePrice} 
                                    onChange={handleChange} 
                                />
                            </div>
                        </div>
                        {/* --- END: PHASE 5 --- */}

                        <div className="space-y-2">
                            <Label htmlFor="notes">{t('notes_label')} <span className="text-muted-foreground text-xs ml-1">{t('optional_label')}</span></Label>
                            <Input id="notes" value={formData.notes} onChange={handleChange} />
                        </div>

                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? t('saving') : t('add_asset_button')}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
}