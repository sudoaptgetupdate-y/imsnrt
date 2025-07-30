// src/pages/CreateSalePage.jsx

import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";
import { Trash2 } from "lucide-react";
import axiosInstance from "@/api/axiosInstance";
import { useTranslation } from "react-i18next";
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


export default function CreateSalePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const token = useAuthStore((state) => state.token);

    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);

    // --- START: สร้าง excludeIds จาก selectedItems ---
    const excludeIds = selectedItems.map(item => item.id);
    // --- END ---

    const {
        data: availableItems,
        pagination,
        isLoading,
        searchTerm,
        filters,
        handleSearchChange,
        handlePageChange,
        handleItemsPerPageChange,
        handleFilterChange
    } = usePaginatedFetch(
        "/inventory", 
        10, 
        { status: "IN_STOCK", categoryId: "All", brandId: "All" },
        excludeIds // --- START: ส่ง excludeIds ไปให้ Hook ---
    );

    useEffect(() => {
        const initialItems = location.state?.initialItems || [];
        if (initialItems.length > 0) {
            setSelectedItems(initialItems);
        }
    }, [location.state]);

    const handleAddItem = (itemToAdd) => {
        if (!selectedItems.some(item => item.id === itemToAdd.id)) {
            setSelectedItems(prev => [...prev, itemToAdd]);
        }
    };

    const handleRemoveItem = (itemToRemove) => {
        setSelectedItems(prev => prev.filter(item => item.id !== itemToRemove.id));
    };

    const handleSubmit = async () => {
        if (!selectedCustomerId) {
            toast.error("Please select a customer.");
            return;
        }
        if (selectedItems.length === 0) {
            toast.error("Please add at least one item to the sale.");
            return;
        }

        const payload = {
            customerId: parseInt(selectedCustomerId),
            inventoryItemIds: selectedItems.map(item => item.id),
        };

        try {
            const response = await axiosInstance.post("/sales", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Sale created successfully!");
            navigate(`/sales/${response.data.id}`);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create sale.");
        }
    };

    const subtotal = selectedItems.reduce((sum, item) => sum + item.productModel.sellingPrice, 0);
    const vat = subtotal * 0.07;
    const total = subtotal + vat;

    // --- START: ไม่ต้องกรองข้อมูลซ้ำซ้อนใน Frontend ---
    const displayedAvailableItems = availableItems;
    // --- END ---

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>{t('createSale_title')}</CardTitle>
                    <CardDescription>{t('createSale_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <Input
                            placeholder={t('createSale_search_placeholder')}
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
                                    {/* --- START: ADDED CATEGORY HEADER --- */}
                                    <TableHead>{t('tableHeader_category')}</TableHead>
                                    {/* --- END: ADDED CATEGORY HEADER --- */}
                                    <TableHead>{t('tableHeader_brand')}</TableHead>
                                    <TableHead>{t('tableHeader_productModel')}</TableHead>
                                    <TableHead>{t('tableHeader_serialNumber')}</TableHead>
                                    <TableHead className="text-right">{t('tableHeader_price')}</TableHead>
                                    <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan="6" className="text-center h-24">Searching...</TableCell></TableRow>
                                ) : displayedAvailableItems.length > 0 ? (
                                    displayedAvailableItems.map(item => (
                                    <TableRow key={item.id}>
                                        {/* --- START: ADDED CATEGORY CELL --- */}
                                        <TableCell>{item.productModel.category.name}</TableCell>
                                        {/* --- END: ADDED CATEGORY CELL --- */}
                                        <TableCell>{item.productModel.brand.name}</TableCell>
                                        <TableCell>{item.productModel.modelNumber}</TableCell>
                                        <TableCell>{item.serialNumber || '-'}</TableCell>
                                        <TableCell className="text-right">{item.productModel.sellingPrice.toLocaleString()}</TableCell>
                                        <TableCell className="text-center">
                                            <Button variant="primary-outline" size="sm" onClick={() => handleAddItem(item)}>
                                                {t('add')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))) : (
                                     <TableRow><TableCell colSpan="6" className="text-center h-24">No available items found.</TableCell></TableRow>
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
                <CardHeader><CardTitle>{t('createSale_summary_title')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('createSale_customer_label')}</Label>
                        <CustomerCombobox selectedValue={selectedCustomerId} onSelect={setSelectedCustomerId} />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">{t('createSale_selected_items', { count: selectedItems.length })}</h4>
                        {selectedItems.length > 0 ? (
                            <div className="h-64 overflow-y-auto space-y-2 pr-2">
                                {selectedItems.map(item => (
                                    <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-md">
                                        <div>
                                            <p className="font-semibold">{item.productModel.modelNumber}</p>
                                            <p className="text-xs text-slate-500">{item.serialNumber}</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleRemoveItem(item)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        ) : (<p className="text-sm text-slate-500 text-center py-8">{t('createSale_no_items')}</p>)}
                    </div>
                    <Separator />
                     <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('createSale_subtotal')}</span><span>{subtotal.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">{t('createSale_vat')}</span><span>{vat.toLocaleString('en-US', {minimumFractionDigits: 2})}</span></div>
                        <div className="flex justify-between font-bold text-base"><span >{t('createSale_total_price')}</span><span>{total.toLocaleString('en-US', {minimumFractionDigits: 2})} THB</span></div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!selectedCustomerId || selectedItems.length === 0}>
                        {t('createSale_confirm_button')}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}