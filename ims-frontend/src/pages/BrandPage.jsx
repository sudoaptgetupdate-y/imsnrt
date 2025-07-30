// src/pages/BrandPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
// --- START: 1. Import ไอคอน ---
import { Edit, Trash2, PlusCircle, Building2 } from "lucide-react";
// --- END ---
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axiosInstance from '@/api/axiosInstance';
import { toast } from 'sonner';
import { useTranslation } from "react-i18next";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SkeletonRow = () => (
    <TableRow>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-8 w-44 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
    </TableRow>
);

export default function BrandPage() {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const {
        data: brands, pagination, isLoading, searchTerm, handleSearchChange, refreshData, handlePageChange, handleItemsPerPageChange
    } = usePaginatedFetch("/brands", 10); 
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState({ name: '' });
    const [editingBrandId, setEditingBrandId] = useState(null);
    const [brandToDelete, setBrandToDelete] = useState(null);

    const handleEdit = (brand) => {
        setIsEditMode(true);
        setEditingBrandId(brand.id);
        setFormData({ name: brand.name });
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setIsEditMode(false);
        setFormData({ name: '' });
        setIsDialogOpen(true);
    };

    const handleDelete = (brand) => {
        setBrandToDelete(brand);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode ? `/brands/${editingBrandId}` : "/brands";
        const method = isEditMode ? 'put' : 'post';

        try {
            await axiosInstance[method](url, formData, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`Brand ${isEditMode ? 'updated' : 'created'} successfully!`);
            refreshData();
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save brand.`);
        }
    };

    const confirmDelete = async () => {
        if (!brandToDelete) return;
        try {
            await axiosInstance.delete(`/brands/${brandToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Brand deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete brand.");
        } finally {
            setBrandToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                {/* --- START: 2. ปรับปรุง CardHeader --- */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                           <Building2 className="h-6 w-6" />
                           {t('brands')}
                        </CardTitle>
                        <CardDescription className="mt-1">{t('brands_description')}</CardDescription>
                    </div>
                    {canManage && 
                        <Button onClick={handleAddNew}>
                            <PlusCircle className="mr-2 h-4 w-4" /> {t('brands_add_new')}
                        </Button>
                    }
                </div>
                {/* --- END --- */}
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder={t('brand_search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-grow"
                    />
                </div>
                {/* --- START: 3. เพิ่ม Div ครอบ Table และปรับปรุง Header --- */}
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead>{t('tableHeader_name')}</TableHead>
                                {canManage && <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : brands.map((brand) => (
                                <TableRow key={brand.id}>
                                    <TableCell>{brand.name}</TableCell>
                                    {canManage && (
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button variant="outline" size="sm" className="w-20" onClick={() => handleEdit(brand)}>
                                                    <Edit className="mr-2 h-4 w-4" /> {t('edit')}
                                                </Button>
                                                <Button variant="destructive" size="sm" className="w-20" onClick={() => handleDelete(brand)}>
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
                {/* --- END --- */}
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
                    <DialogHeader><DialogTitle>{isEditMode ? t('brand_form_edit_title') : t('brand_form_add_title')}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">{t('brand_form_name')}</Label>
                            <Input id="name" value={formData.name} onChange={(e) => setFormData({ name: e.target.value })} required />
                        </div>
                        <DialogFooter><Button type="submit">{t('save')}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!brandToDelete} onOpenChange={(isOpen) => !isOpen && setBrandToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the brand: <strong>{brandToDelete?.name}</strong>.
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
