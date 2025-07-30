// src/pages/CreateAssetAssignmentPage.jsx

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { UserCombobox } from "@/components/ui/UserCombobox";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { BrandCombobox } from "@/components/ui/BrandCombobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function CreateAssetAssignmentPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const token = useAuthStore((state) => state.token);

    const [selectedUserId, setSelectedUserId] = useState("");
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [notes, setNotes] = useState("");
    
    // --- START: สร้าง excludeIds จาก selectedAssets ---
    const excludeIds = selectedAssets.map(item => item.id);
    // --- END ---

    const {
        data: availableAssets,
        pagination,
        isLoading,
        searchTerm,
        filters,
        handleSearchChange,
        handlePageChange,
        handleItemsPerPageChange,
        handleFilterChange
    } = usePaginatedFetch(
        "/assets", 
        10, 
        { status: "IN_WAREHOUSE", categoryId: "All", brandId: "All" },
        excludeIds // --- START: ส่ง excludeIds ไปให้ Hook ---
    );

    useEffect(() => {
        const initialItems = location.state?.initialItems || [];
        if (initialItems.length > 0) {
            setSelectedAssets(initialItems);
        }
    }, [location.state]);


    const handleAddItem = (assetToAdd) => {
        if (!selectedAssets.some(asset => asset.id === assetToAdd.id)) {
            setSelectedAssets(prev => [...prev, assetToAdd]);
        }
    };

    const handleRemoveItem = (assetToRemove) => {
        setSelectedAssets(prev => prev.filter(asset => asset.id !== assetToRemove.id));
    };

    const handleSubmit = async () => {
        if (!selectedUserId) {
            toast.error("Please select an employee.");
            return;
        }
         if (selectedAssets.length === 0) {
            toast.error("Please add at least one asset.");
            return;
        }

        const payload = {
            assigneeId: parseInt(selectedUserId),
            inventoryItemIds: selectedAssets.map(item => item.id),
            notes: notes,
        };

        try {
            const response = await axiosInstance.post("/asset-assignments", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Assignment created successfully!");
            navigate(`/asset-assignments/${response.data.id}`, { replace: true });
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create assignment.");
        }
    };
    
    // --- START: ไม่ต้องกรองข้อมูลซ้ำซ้อนใน Frontend ---
    const displayedAvailableAssets = availableAssets;
    // --- END ---

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>{t('createAssignment_title')}</CardTitle>
                    <CardDescription>{t('createAssignment_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <Input
                            placeholder={t('asset_search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="sm:col-span-3 lg:col-span-1"
                        />
                        <CategoryCombobox
                            selectedValue={filters.categoryId}
                            onSelect={(value) => handleFilterChange('categoryId', value)}
                        />
                        <BrandCombobox
                            selectedValue={filters.brandId}
                            onSelect={(value) => handleFilterChange('brandId', value)}
                        />
                    </div>
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('tableHeader_assetCode')}</TableHead>
                                    {/* --- START: เพิ่มหัวตาราง Category --- */}
                                    <TableHead>{t('tableHeader_category')}</TableHead>
                                    {/* --- END: เพิ่มหัวตาราง Category --- */}
                                    <TableHead>{t('tableHeader_brand')}</TableHead>
                                    <TableHead>{t('tableHeader_productModel')}</TableHead>
                                    <TableHead>{t('tableHeader_serialNumber')}</TableHead>
                                    <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan="6" className="text-center h-24">Searching...</TableCell></TableRow>
                                ) : displayedAvailableAssets.length > 0 ? (
                                    displayedAvailableAssets.map(asset => (
                                    <TableRow key={asset.id}>
                                        <TableCell>{asset.assetCode}</TableCell>
                                        {/* --- START: เพิ่มข้อมูล Category --- */}
                                        <TableCell>{asset.productModel.category.name}</TableCell>
                                        {/* --- END: เพิ่มข้อมูล Category --- */}
                                        <TableCell>{asset.productModel.brand.name}</TableCell>
                                        <TableCell>{asset.productModel.modelNumber}</TableCell>
                                        <TableCell>{asset.serialNumber || '-'}</TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="primary-outline" size="sm" onClick={() => handleAddItem(asset)}>{t('add')}</Button>
                                        </TableCell>
                                    </TableRow>
                                ))) : (
                                    <TableRow><TableCell colSpan="6" className="text-center h-24">No available assets found.</TableCell></TableRow>
                                )
                                }
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Label htmlFor="rows-per-page">{t('rows_per_page')}</Label>
                        <Select value={String(pagination.itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                            <SelectTrigger id="rows-per-page" className="w-20"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {[10, 20, 50, 100].map(size => (<SelectItem key={size} value={String(size)}>{size}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {t('pagination_info', { currentPage: pagination.currentPage, totalPages: pagination.totalPages, totalItems: pagination.totalItems })}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination || pagination.currentPage <= 1}>{t('previous')}</Button>
                        <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination || pagination.currentPage >= pagination.totalPages}>{t('next')}</Button>
                    </div>
                </CardFooter>
            </Card>
            <Card>
                <CardHeader><CardTitle>{t('createAssignment_summary_title')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('createAssignment_assignee_label')}</Label>
                        <UserCombobox
                            selectedValue={selectedUserId}
                            onSelect={setSelectedUserId}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="notes">{t('notes')}</Label>
                        <Textarea 
                            id="notes" 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">{t('createSale_selected_items', { count: selectedAssets.length })}</h4>
                        {selectedAssets.length > 0 ? (
                            <div className="h-64 overflow-y-auto space-y-2 pr-2">
                                {selectedAssets.map(asset => (
                                    <div key={asset.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-md">
                                        <div>
                                            <p className="font-semibold">{asset.assetCode}</p>
                                            <p className="text-xs text-slate-500">{asset.productModel.modelNumber}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleRemoveItem(asset)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        ) : (<p className="text-sm text-slate-500 text-center py-8">{t('createSale_no_items')}</p>)}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleSubmit}
                        disabled={!selectedUserId || selectedAssets.length === 0}
                    >
                        {t('createAssignment_confirm_button')}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}