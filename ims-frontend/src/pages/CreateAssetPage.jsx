// src/pages/CreateAssetPage.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { ArrowLeft, PackagePlus } from "lucide-react";
import { useTranslation } from "react-i18next"; // --- 1. Import useTranslation ---

const formatMacAddress = (value) => {
  const cleaned = (value || '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (cleaned.length === 0) return '';
  return cleaned.match(/.{1,2}/g).slice(0, 6).join(':');
};

const validateMacAddress = (mac) => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

const initialFormData = {
    assetCode: "",
    serialNumber: "",
    macAddress: "",
    productModelId: "",
};

export default function CreateAssetPage() {
    const navigate = useNavigate();
    const { t } = useTranslation(); // --- 2. เรียกใช้ useTranslation ---
    const token = useAuthStore((state) => state.token);
    const [formData, setFormData] = useState(initialFormData);
    
    const [selectedModelInfo, setSelectedModelInfo] = useState(null);
    const [isMacRequired, setIsMacRequired] = useState(true);
    const [isSerialRequired, setIsSerialRequired] = useState(true);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        if (id === 'serialNumber' || id === 'assetCode') {
            setFormData({ ...formData, [id]: value.toUpperCase() });
        } else {
            setFormData({ ...formData, [id]: value });
        }
    };

    const handleMacAddressChange = (e) => {
        const formatted = formatMacAddress(e.target.value);
        setFormData({ ...formData, macAddress: formatted });
    };

    const handleModelSelect = (model) => {
        if (model) {
            setFormData(prev => ({ ...prev, productModelId: model.id }));
            setSelectedModelInfo(model);
            setIsMacRequired(model.category.requiresMacAddress);
            setIsSerialRequired(model.category.requiresSerialNumber);
             if (!model.category.requiresMacAddress) setFormData(prev => ({ ...prev, macAddress: '' }));
             if (!model.category.requiresSerialNumber) setFormData(prev => ({ ...prev, serialNumber: '' }));
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isMacRequired && formData.macAddress && !validateMacAddress(formData.macAddress)) {
            toast.error(t('error_invalid_mac')); // --- 3. แปลข้อความ ---
            return;
        }

        if (!formData.productModelId) {
            toast.error(t('error_select_model')); // --- 3. แปลข้อความ ---
            return;
        }
        if (!formData.assetCode) {
            toast.error(t('error_asset_code_required')); // --- 3. แปลข้อความ ---
            return;
        }
        
        try {
            await axiosInstance.post("/assets", formData, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            toast.success(`Asset has been added to the warehouse successfully!`);
            navigate("/assets");
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to add asset.`);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
             {/* --- 3. แปลข้อความ --- */}
             <Button variant="outline" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('create_asset_back_button')}
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PackagePlus className="h-6 w-6" />
                        {t('create_asset_title')}
                    </CardTitle>
                    <CardDescription className="mt-1">{t('create_asset_description')}</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                             <Label>{t('product_model_label')} <span className="text-red-500">{t('required_field')}</span></Label>
                             <ProductModelCombobox onSelect={handleModelSelect} />
                        </div>
                        {selectedModelInfo && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>{t('category_label')}</Label><Input value={selectedModelInfo.category.name} disabled /></div>
                                <div className="space-y-2"><Label>{t('brand_label')}</Label><Input value={selectedModelInfo.brand.name} disabled /></div>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="assetCode">{t('asset_code_label')} <span className="text-red-500">{t('required_field')}</span></Label>
                            <Input id="assetCode" value={formData.assetCode} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="serialNumber">{t('serial_number_label')} {!isSerialRequired && <span className="text-xs text-slate-500 ml-2">{t('not_required_label')}</span>}</Label>
                            <Input id="serialNumber" value={formData.serialNumber || ''} onChange={handleInputChange} required={isSerialRequired} disabled={!isSerialRequired} />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor="macAddress">{t('mac_address_label')} {!isMacRequired && <span className="text-xs text-slate-500 ml-2">{t('not_required_label')}</span>}</Label>
                             <Input 
                                id="macAddress" 
                                value={formData.macAddress} 
                                onChange={handleMacAddressChange} 
                                required={isMacRequired} 
                                disabled={!isMacRequired}
                                maxLength={17}
                                placeholder={t('mac_address_placeholder')}
                             />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit">{t('add_asset_button')}</Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}