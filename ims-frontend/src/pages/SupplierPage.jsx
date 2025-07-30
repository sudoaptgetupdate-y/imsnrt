// src/pages/SupplierPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle, Edit, Trash2, Truck } from "lucide-react";
import {
 AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
 AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axiosInstance from '@/api/axiosInstance';
import { toast } from 'sonner';
import SupplierFormDialog from "@/components/dialogs/SupplierFormDialog";
import { useTranslation } from "react-i18next";
import {
 Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SkeletonRow = () => (
 <TableRow>
  <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div></TableCell>
  <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div></TableCell>
  <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse w-1/2"></div></TableCell>
  <TableCell className="text-center"><div className="h-8 w-44 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
 </TableRow>
);

export default function SupplierPage() {
 const { t } = useTranslation();
 const token = useAuthStore((state) => state.token);
 const currentUser = useAuthStore((state) => state.user);
 const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

 const {
  data: suppliers, isLoading, searchTerm, handleSearchChange, refreshData, pagination, handlePageChange, handleItemsPerPageChange
 } = usePaginatedFetch("/suppliers", 10);

 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [editingSupplier, setEditingSupplier] = useState(null);
 const [supplierToDelete, setSupplierToDelete] = useState(null);

 const handleEdit = (supplier) => {
  setEditingSupplier(supplier);
  setIsDialogOpen(true);
 };

 const handleAddNew = () => {
  setEditingSupplier(null);
  setIsDialogOpen(true);
 };

 const handleDelete = (supplier) => {
  setSupplierToDelete(supplier);
 };

 const confirmDelete = async () => {
  if (!supplierToDelete) return;
  try {
   await axiosInstance.delete(`/suppliers/${supplierToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
   toast.success("Supplier deleted successfully!");
   refreshData();
  } catch (error) {
   toast.error(error.response?.data?.error || "Failed to delete supplier.");
  } finally {
   setSupplierToDelete(null);
  }
 };

 return (
  <Card>
   <CardHeader>
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
     <div>
      <CardTitle className="flex items-center gap-2">
       <Truck className="h-6 w-6" />
       {t('suppliers_title')}
      </CardTitle>
      <CardDescription className="mt-1">{t('suppliers_description')}</CardDescription>
     </div>
     {canManage &&
      <Button onClick={handleAddNew}>
       <PlusCircle className="mr-2 h-4 w-4" /> {t('suppliers_add_new')}
      </Button>
     }
    </div>
   </CardHeader>
   <CardContent>
    <div className="flex flex-col sm:flex-row gap-4 mb-4">
     <Input
      placeholder={t('suppliers_search_placeholder')}
      value={searchTerm}
      onChange={(e) => handleSearchChange(e.target.value)}
      className="flex-grow"
     />
    </div>
    <div className="border rounded-md">
     <Table>
      <TableHeader>
       <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableHead>{t('tableHeader_code')}</TableHead>
        <TableHead>{t('tableHeader_name')}</TableHead>
        <TableHead>{t('tableHeader_address')}</TableHead>
        <TableHead>{t('tableHeader_contactPerson')}</TableHead>
        <TableHead>{t('tableHeader_phone')}</TableHead>
        {canManage && <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>}
       </TableRow>
      </TableHeader>
      <TableBody>
       {isLoading ? (
        Array.from({ length: pagination?.itemsPerPage || 10 }).map((_, i) => <SkeletonRow key={i} />)
       ) : suppliers.map((supplier) => (
        <TableRow key={supplier.id}>
         <TableCell>{supplier.supplierCode}</TableCell>
         <TableCell>{supplier.name}</TableCell>
         <TableCell>
          <TooltipProvider>
           <Tooltip>
            <TooltipTrigger asChild>
             <div className="max-w-xs truncate">
              {supplier.address || '-'}
             </div>
            </TooltipTrigger>
            {supplier.address && (
             <TooltipContent>
              <p className="max-w-md">{supplier.address}</p>
             </TooltipContent>
            )}
           </Tooltip>
          </TooltipProvider>
         </TableCell>
         <TableCell>{supplier.contactPerson || '-'}</TableCell>
         <TableCell>{supplier.phone || '-'}</TableCell>
         {canManage && (
          <TableCell className="text-center">
           <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" className="w-20" onClick={() => handleEdit(supplier)}>
             <Edit className="mr-2 h-4 w-4" /> {t('edit')}
            </Button>
            <Button variant="destructive" size="sm" className="w-20" onClick={() => handleDelete(supplier)}>
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
     <Select value={String(pagination?.itemsPerPage || 10)} onValueChange={handleItemsPerPageChange}>
      <SelectTrigger id="rows-per-page" className="w-20"><SelectValue /></SelectTrigger>
      <SelectContent>
       {[10, 20, 50, 100].map(size => (<SelectItem key={size} value={String(size)}>{size}</SelectItem>))}
      </SelectContent>
     </Select>
    </div>
    <div className="text-sm text-muted-foreground">
     {t('pagination_info', { currentPage: pagination?.currentPage || 1, totalPages: pagination?.totalPages || 1, totalItems: pagination?.totalItems || 0 })}
    </div>
    <div className="flex items-center gap-2">
     <Button variant="outline" size="sm" onClick={() => handlePageChange((pagination?.currentPage || 1) - 1)} disabled={!pagination || (pagination?.currentPage || 1) <= 1}>{t('previous')}</Button>
     <Button variant="outline" size="sm" onClick={() => handlePageChange((pagination?.currentPage || 1) + 1)} disabled={!pagination || (pagination?.currentPage || 1) >= (pagination?.totalPages || 1)}>{t('next')}</Button>
    </div>
   </CardFooter>

   {isDialogOpen && (
    <SupplierFormDialog
     isOpen={isDialogOpen}
     setIsOpen={setIsDialogOpen}
     supplier={editingSupplier}
     onSave={refreshData}
    />
   )}

   <AlertDialog open={!!supplierToDelete} onOpenChange={(isOpen) => !isOpen && setSupplierToDelete(null)}>
    <AlertDialogContent>
     <AlertDialogHeader>
      <AlertDialogTitle>{t('supplier_delete_dialog_title')}</AlertDialogTitle>
      <AlertDialogDescription dangerouslySetInnerHTML={{ __html: t('supplier_delete_dialog_description', { name: supplierToDelete?.name }) }} />
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