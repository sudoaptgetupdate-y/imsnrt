// src/pages/CategoryPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
// --- START: 1. Import ไอคอน ---
import { Edit, Trash2, PlusCircle, Tag } from "lucide-react";
// --- END ---
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axiosInstance from '@/api/axiosInstance';
import { toast } from 'sonner';
import CategoryFormDialog from "@/components/dialogs/CategoryFormDialog";
import { useTranslation } from "react-i18next";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SkeletonRow = () => (
    <TableRow>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-5 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div></TableCell>
        <TableCell className="text-center"><div className="h-5 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div></TableCell>
        <TableCell className="text-center"><div className="h-8 w-44 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
    </TableRow>
);

export default function CategoryPage() {
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const {
        data: categories, pagination, isLoading, searchTerm, handleSearchChange, refreshData, handlePageChange, handleItemsPerPageChange
    } = usePaginatedFetch("/categories", 10); 
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryToDelete, setCategoryToDelete] = useState(null);

    const handleEdit = (category) => {
        setEditingCategory(category);
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setEditingCategory(null);
        setIsDialogOpen(true);
    };

    const handleDelete = (category) => {
        setCategoryToDelete(category);
    };

    const confirmDelete = async () => {
        if (!categoryToDelete) return;
        try {
            await axiosInstance.delete(`/categories/${categoryToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Category deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete category.");
        } finally {
            setCategoryToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                {/* --- START: 2. ปรับปรุง CardHeader --- */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Tag className="h-6 w-6" />
                            {t('categories')}
                        </CardTitle>
                        <CardDescription className="mt-1">{t('categories_description')}</CardDescription>
                    </div>
                     {canManage &&
                        <Button onClick={handleAddNew}>
                           <PlusCircle className="mr-2 h-4 w-4" /> {t('categories_add_new')}
                        </Button>
                    }
                </div>
                {/* --- END --- */}
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder={t('category_search_placeholder')}
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
                                <TableHead className="text-center">{t('tableHeader_requiresSn')}</TableHead>
                                <TableHead className="text-center">{t('tableHeader_requiresMac')}</TableHead>
                                {canManage && <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : categories.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell>{category.name}</TableCell>
                                    <TableCell className="text-center">{category.requiresSerialNumber ? t('yes') : t('no')}</TableCell>
                                    <TableCell className="text-center">{category.requiresMacAddress ? t('yes') : t('no')}</TableCell>
                                    {canManage && (
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button variant="outline" size="sm" className="w-20" onClick={() => handleEdit(category)}>
                                                    <Edit className="mr-2 h-4 w-4" /> {t('edit')}
                                                </Button>
                                                <Button variant="destructive" size="sm" className="w-20" onClick={() => handleDelete(category)}>
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

            {isDialogOpen && (
                <CategoryFormDialog
                    isOpen={isDialogOpen}
                    setIsOpen={setIsDialogOpen}
                    category={editingCategory}
                    onSave={refreshData}
                />
            )}

            <AlertDialog open={!!categoryToDelete} onOpenChange={(isOpen) => !isOpen && setCategoryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the category: <strong>{categoryToDelete?.name}</strong>.
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
