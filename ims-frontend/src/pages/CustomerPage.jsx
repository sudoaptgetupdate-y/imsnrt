// src/pages/CustomerPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { History, Edit, UserPlus, Users } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axiosInstance from '@/api/axiosInstance';
import { toast } from 'sonner';
import CustomerFormDialog from "@/components/dialogs/CustomerFormDialog";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SkeletonRow = () => (
    <TableRow>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        {/* --- START: เพิ่ม Skeleton สำหรับ Address --- */}
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        {/* --- END --- */}
        <TableCell className="text-center"><div className="h-8 w-44 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
    </TableRow>
);

export default function CustomerPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const {
        data: customers, pagination, isLoading, searchTerm, handleSearchChange, 
        handlePageChange, handleItemsPerPageChange, refreshData
    } = usePaginatedFetch("/customers", 10);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [customerToDelete, setCustomerToDelete] = useState(null);

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setIsDialogOpen(true);
    };

    const handleAddNew = () => {
        setEditingCustomer(null);
        setIsDialogOpen(true);
    };

    const handleDelete = (customer) => {
        setCustomerToDelete(customer);
    };

    const confirmDelete = async () => {
        if (!customerToDelete) return;
        try {
            await axiosInstance.delete(`/customers/${customerToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Customer deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete customer.");
        } finally {
            setCustomerToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-6 w-6" /> 
                            {t('customers_title')}
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {t('customers_description')}
                        </CardDescription>
                    </div>
                    {canManage && 
                        <Button onClick={handleAddNew}>
                            <UserPlus className="mr-2 h-4 w-4" /> {t('customers_add_new')}
                        </Button>
                    }
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder={t('customers_search_placeholder')}
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
                                <TableHead>{t('tableHeader_phone')}</TableHead>
                                {/* --- START: เพิ่ม Header ของ Address --- */}
                                <TableHead>{t('tableHeader_address')}</TableHead>
                                {/* --- END --- */}
                                {canManage && <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : customers.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell>{customer.customerCode}</TableCell>
                                    <TableCell>{customer.name}</TableCell>
                                    <TableCell>{customer.phone}</TableCell>
                                    {/* --- START: เพิ่ม Cell ของ Address พร้อม Tooltip --- */}
                                    <TableCell>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="max-w-xs truncate">
                                                        {customer.address || '-'}
                                                    </div>
                                                </TooltipTrigger>
                                                {customer.address && (
                                                    <TooltipContent>
                                                        <p className="max-w-md">{customer.address}</p>
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                    {/* --- END --- */}
                                    {canManage && (
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => navigate(`/customers/${customer.id}/history`)}>
                                                    <History className="mr-2 h-4 w-4" /> {t('history')}
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(customer)}>
                                                    <Edit className="mr-2 h-4 w-4" /> {t('edit')}
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

            {isDialogOpen && (
                <CustomerFormDialog
                    isOpen={isDialogOpen}
                    setIsOpen={setIsDialogOpen}
                    customer={editingCustomer}
                    onSave={refreshData}
                />
            )}

            <AlertDialog open={!!customerToDelete} onOpenChange={(isOpen) => !isOpen && setCustomerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete customer: <strong>{customerToDelete?.name}</strong>.
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