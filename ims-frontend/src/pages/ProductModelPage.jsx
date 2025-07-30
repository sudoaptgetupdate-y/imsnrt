// src/pages/ProductModelPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle, Edit, Trash2, ArrowUpDown, Boxes } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axiosInstance from '@/api/axiosInstance';
import { toast } from 'sonner';
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { BrandCombobox } from "@/components/ui/BrandCombobox";
import { useTranslation } from "react-i18next";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // <-- เพิ่ม Import

const DESCRIPTION_MAX_LENGTH = 255;

const SkeletonRow = () => (
    <TableRow>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-8 w-44 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
    </TableRow>
);

const SortableHeader = ({ children, sortKey, currentSortBy, sortOrder, onSort, className = "" }) => (
    <TableHead className={`cursor-pointer hover:bg-muted/50 ${className}`} onClick={() => onSort(sortKey)}>
        <div className="flex items-center gap-2">
            {children}
            {currentSortBy === sortKey && <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'text-slate-400' : ''}`} />}
        </div>
    </TableHead>
);

const initialFormData = {
    modelNumber: "",
    description: "",
    sellingPrice: "",
    categoryId: "",
    brandId: "",
};

export default function ProductModelPage() {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const {
        data: productModels, pagination, isLoading, searchTerm, filters,
        sortBy, sortOrder, handleSortChange,
        handleSearchChange, handlePageChange, handleItemsPerPageChange, handleFilterChange, refreshData
    } = usePaginatedFetch("/product-models", 10, { categoryId: "All", brandId: "All" });
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [editingModelId, setEditingModelId] = useState(null);
    const [modelToDelete, setModelToDelete] = useState(null);
    const [initialCategory, setInitialCategory] = useState(null);
    const [initialBrand, setInitialBrand] = useState(null);

    const openDialog = (model = null) => {
        if (model) {
            setIsEditMode(true);
            setEditingModelId(model.id);
            setFormData({
                modelNumber: model.modelNumber,
                description: model.description || "",
                sellingPrice: model.sellingPrice.toLocaleString('en-US'),
                categoryId: model.categoryId,
                brandId: model.brandId
            });
            setInitialCategory(model.category);
            setInitialBrand(model.brand);
        } else {
            setIsEditMode(false);
            setFormData(initialFormData);
            setInitialCategory(null);
            setInitialBrand(null);
        }
        setIsDialogOpen(true);
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData({ ...formData, [id]: value });
    };

    const handlePriceInputChange = (e) => {
        const { value } = e.target;
        const cleanValue = value.replace(/[^0-9.]/g, '');
        const parts = cleanValue.split('.');
        if (parts.length > 2) return;
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const formattedValue = parts[1] !== undefined ? `${integerPart}.${parts[1]}` : integerPart;
        setFormData({ ...formData, sellingPrice: formattedValue });
    };

    const handleComboboxSelect = (type, value) => {
        setFormData(prev => ({ ...prev, [type]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.description && formData.description.length > DESCRIPTION_MAX_LENGTH) {
            toast.error(`Description cannot exceed ${DESCRIPTION_MAX_LENGTH} characters.`);
            return;
        }

        if (!formData.categoryId || !formData.brandId) {
            toast.error("Please select both a Category and a Brand.");
            return;
        }

        const url = isEditMode ? `/product-models/${editingModelId}` : "/product-models";
        const method = isEditMode ? 'put' : 'post';
        
        const cleanPrice = formData.sellingPrice.replace(/,/g, '');

        const payload = {
            ...formData,
            sellingPrice: parseFloat(cleanPrice),
            categoryId: parseInt(formData.categoryId, 10),
            brandId: parseInt(formData.brandId, 10),
        };

        try {
            await axiosInstance[method](url, payload, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Product Model ${isEditMode ? 'updated' : 'created'} successfully!`);
            refreshData();
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save product model.`);
        }
    };

    const confirmDelete = async () => {
        if (!modelToDelete) return;
        try {
            await axiosInstance.delete(`/product-models/${modelToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Product Model deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete product model.");
        } finally {
            setModelToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                           <Boxes className="h-6 w-6" />
                           {t('models')}
                        </CardTitle>
                        <CardDescription className="mt-1">{t('product_models_description')}</CardDescription>
                    </div>
                    {canManage &&
                        <Button onClick={() => openDialog()}>
                            <PlusCircle className="mr-2 h-4 w-4" /> {t('product_models_add_new')}
                        </Button>
                    }
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <Input
                        placeholder={t('product_model_search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="lg:col-span-1"
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
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <SortableHeader sortKey="category" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_category')}
                                </SortableHeader>
                                <SortableHeader sortKey="brand" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_brand')}
                                </SortableHeader>
                                <SortableHeader sortKey="modelNumber" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_productModel')}
                                </SortableHeader>
                                <TableHead>{t('product_model_form_description')}</TableHead>
                                <SortableHeader sortKey="sellingPrice" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange} className="text-right">
                                    {t('tableHeader_price')}
                                </SortableHeader>
                                {canManage && <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : productModels.map((model) => (
                                <TableRow key={model.id}>
                                    <TableCell>{model.category.name}</TableCell>
                                    <TableCell>{model.brand.name}</TableCell>
                                    <TableCell>{model.modelNumber}</TableCell>
                                    <TableCell>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <p className="truncate max-w-[200px]">{model.description || '-'}</p>
                                                </TooltipTrigger>
                                                {model.description && (
                                                    <TooltipContent>
                                                        <p className="max-w-xs">{model.description}</p>
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                    <TableCell className="text-right">{model.sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                    {canManage && (
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button variant="outline" size="sm" className="w-20" onClick={() => openDialog(model)}>
                                                    <Edit className="mr-2 h-4 w-4" /> {t('edit')}
                                                </Button>
                                                <Button variant="destructive" size="sm" className="w-20" onClick={() => setModelToDelete(model)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
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

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? t('product_model_form_edit_title') : t('product_model_form_add_title')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="modelNumber">{t('product_model_form_model_number')}</Label>
                            <Input id="modelNumber" value={formData.modelNumber} onChange={handleInputChange} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">{t('product_model_form_description')}</Label>
                            <Input id="description" value={formData.description} onChange={handleInputChange} />
                            <p className={`text-xs text-right ${formData.description.length > DESCRIPTION_MAX_LENGTH ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {formData.description.length} / {DESCRIPTION_MAX_LENGTH}
                            </p>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="sellingPrice">{t('product_model_form_selling_price')}</Label>
                            <Input id="sellingPrice" type="text" value={formData.sellingPrice} onChange={handlePriceInputChange} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('tableHeader_category')}</Label>
                                <CategoryCombobox
                                    selectedValue={formData.categoryId}
                                    onSelect={(value) => handleComboboxSelect('categoryId', value)}
                                    initialCategory={initialCategory}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('tableHeader_brand')}</Label>
                                <BrandCombobox
                                    selectedValue={formData.brandId}
                                    onSelect={(value) => handleComboboxSelect('brandId', value)}
                                    initialBrand={initialBrand}
                                />
                            </div>
                        </div>
                        <DialogFooter><Button type="submit">{t('save')}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!modelToDelete} onOpenChange={(isOpen) => !isOpen && setModelToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the product model: <strong>{modelToDelete?.modelNumber}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>{t('confirm')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}