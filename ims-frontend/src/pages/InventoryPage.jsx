// src/pages/InventoryPage.jsx

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { MoreHorizontal, View, ShoppingCart, ArrowRightLeft, Edit, Trash2, PlusCircle, Archive, History, ShieldAlert, ArchiveRestore, ShieldCheck, ArrowUpDown, Package, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BrandCombobox } from "@/components/ui/BrandCombobox";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { useTranslation } from "react-i18next";
import BatchAddInventoryDialog from "@/components/dialogs/BatchAddInventoryDialog";
import EditInventoryDialog from "@/components/dialogs/EditInventoryDialog";


const displayFormattedMac = (mac) => {
    // ... (ฟังก์ชันนี้คงเดิม) ...
    if (!mac || mac.length !== 12) {
        return mac || '-';
    }
    return mac.match(/.{1,2}/g)?.join(':').toUpperCase() || mac;
};

// --- START: 1. อัปเดต Helper ให้เพิ่มสัญลักษณ์ ฿ ---
const formatNumber = (value) => {
    if (value === null || value === undefined) return '-';
    // เพิ่ม comma และสัญลักษณ์ Baht
    return value.toLocaleString('en-US') + ' ฿';
};
// --- END: 1. อัปเดต Helper ---

const SortableHeader = ({ children, sortKey, currentSortBy, sortOrder, onSort, className }) => (
    // ... (ฟังก์ชันนี้คงเดิม) ...
    <TableHead className={`cursor-pointer hover:bg-muted/50 ${className}`} onClick={() => onSort(sortKey)}>
        <div className="flex items-center gap-2">
            {children}
            {currentSortBy === sortKey && <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'text-slate-400' : ''}`} />}
        </div>
    </TableHead>
);


export default function InventoryPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    // ... (States และ Handlers ทั้งหมดคงเดิมเหมือนไฟล์ล่าสุดที่ Refactor ไปแล้ว) ...
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const location = useLocation();
    const initialStatus = location.state?.status || "All";

    const [isBatchAddOpen, setIsBatchAddOpen] = useState(false);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState(null);

    const [itemToDelete, setItemToDelete] = useState(null);
    const [itemToDecommission, setItemToDecommission] = useState(null);
    
    const [exportSortBy, setExportSortBy] = useState('serialNumber');
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (exportFiltered) => {
        setIsExporting(true);
        toast.info("Generating your export file, please wait...");

        try {
            const params = {
                sortBy: exportSortBy,
                sortOrder: 'asc',
                ...(exportFiltered && {
                    search: searchTerm,
                    status: filters.status,
                    categoryId: filters.categoryId,
                    brandId: filters.brandId,
                }),
            };

            const response = await axiosInstance.get('/export/inventory', {
                headers: { Authorization: `Bearer ${token}` },
                params,
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'inventory-export.csv');
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success("File has been downloaded successfully!");
        } catch (error) {
            toast.error("Failed to export data. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    const {
        data: inventoryItems, pagination, isLoading, searchTerm, filters,
        sortBy, sortOrder, handleSortChange,
        handleSearchChange, handlePageChange, handleItemsPerPageChange, handleFilterChange, refreshData
    } = usePaginatedFetch("/inventory", 10, {
        status: "IN_STOCK",
        categoryId: "All",
        brandId: "All"
    });

    const handleEditClick = (item) => {
        setEditingItemId(item.id);
        setIsEditDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await axiosInstance.delete(`/inventory/${itemToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Item deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete item.");
        } finally {
            setItemToDelete(null);
        }
    };

    const confirmDecommission = async () => {
        if (!itemToDecommission) return;
        try {
            await axiosInstance.patch(`/inventory/${itemToDecommission.id}/decommission`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Item has been decommissioned.");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to decommission item.");
        } finally {
            setItemToDecommission(null);
        }
    };

    const handleStatusChange = async (itemId, action, successMessage) => {
        try {
            await axiosInstance.patch(`/inventory/${itemId}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(successMessage);
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to update status.`);
        }
    };

    const handleReinstateItem = (itemId) => {
        handleStatusChange(itemId, 'reinstate', 'Item has been reinstated to stock.');
    };

    const handleSellItem = (itemToSell) => navigate('/sales/new', { state: { initialItems: [itemToSell] } });
    const handleBorrowItem = (itemToBorrow) => navigate('/borrowings/new', { state: { initialItems: [itemToBorrow] } });


    return (
        <Card className="shadow-sm border-subtle">
            {/* ... (CardHeader - คงเดิม) ... */}
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-6 w-6" />
                            {t('inventory')}
                        </CardTitle>
                        <CardDescription className="mt-1">{t('inventory_description')}</CardDescription>
                    </div>
                    {canManage &&
                        <div className="flex items-center gap-2">
                            <Button onClick={() => setIsBatchAddOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> {t('inventory_add_new')}
                            </Button>
                        
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" disabled={isExporting}>
                                        <Download className="mr-2 h-4 w-4" /> Export
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <Select value={exportSortBy} onValueChange={setExportSortBy}>
                                        <SelectTrigger className="w-48 mx-2 my-1 h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="serialNumber">Serial Number</SelectItem>
                                            <SelectItem value="customerName">Customer Name</SelectItem>
                                            <SelectItem value="supplierName">Supplier</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleExport(true)}>
                                        Export Filtered ({pagination?.totalItems || 0} items)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExport(false)}>
                                        Export All
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    }
                </div>
            </CardHeader>

            {/* ... (CardContent / Filters - คงเดิม) ... */}
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Input
                        placeholder={t('createSale_search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="sm:col-span-2 lg:col-span-1"
                    />
                    <CategoryCombobox
                        selectedValue={filters.categoryId}
                        onSelect={(value) => handleFilterChange('categoryId', value)}
                    />
                    <BrandCombobox
                        selectedValue={filters.brandId}
                        onSelect={(value) => handleFilterChange('brandId', value)}
                    />
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('filter_by_status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">{t('status_all')}</SelectItem>
                            <SelectItem value="IN_STOCK">{t('status_in_stock')}</SelectItem>
                            <SelectItem value="SOLD">{t('status_sold')}</SelectItem>
                            <SelectItem value="BORROWED">{t('status_borrowed')}</SelectItem>
                            <SelectItem value="RESERVED">{t('status_reserved')}</SelectItem>
                            <SelectItem value="DEFECTIVE">{t('status_defective')}</SelectItem>
                            <SelectItem value="REPAIRING">{t('status_repairing')}</SelectItem>
                            <SelectItem value="DECOMMISSIONED">{t('status_decommissioned')}</SelectItem>
                            <SelectItem value="RETURNED_TO_CUSTOMER">{t('status_serviced_customer')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="border rounded-md">
                    <Table>
                        {/* --- START: 2. อัปเดต TableHeader (ใช้ key ใหม่) --- */}
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <SortableHeader sortKey="productModel" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>{t('tableHeader_productModel')}</SortableHeader>
                                <SortableHeader sortKey="serialNumber" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>{t('tableHeader_serialNumber')}</SortableHeader>
                                <SortableHeader sortKey="macAddress" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>{t('tableHeader_macAddress')}</SortableHeader>
                                
                                <SortableHeader sortKey="purchasePrice" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>{t('tableHeader_price_cost')}</SortableHeader>
                                
                                <TableHead className="text-center">{t('tableHeader_status')}</TableHead>
                                <TableHead>{t('tableHeader_addedBy')}</TableHead>
                                <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        {/* --- END: 2. อัปเดต TableHeader --- */}

                        <TableBody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={7}><div className="h-8 bg-muted rounded animate-pulse"></div></TableCell>
                                    </TableRow>
                                ))
                            ) : inventoryItems.length > 0 ? (
                                inventoryItems.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="font-medium">{item.productModel.modelNumber}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {item.productModel.category.name} / {item.productModel.brand.name}
                                            </div>
                                        </TableCell>
                                        
                                        <TableCell>{item.serialNumber || '-'}</TableCell>
                                        <TableCell>{displayFormattedMac(item.macAddress)}</TableCell>
                                        
                                        {/* --- START: 3. สลับตำแหน่ง Price/Cost และใช้ formatNumber --- */}
                                        <TableCell>
                                            <div className="font-medium text-green-600">
                                                {`Price: ${formatNumber(item.productModel.sellingPrice)}`}
                                            </div>
                                            <div className="text-xs text-red-600">
                                                 {`Cost: ${formatNumber(item.purchasePrice)}`}
                                            </div>
                                        </TableCell>
                                        {/* --- END: 3. สลับตำแหน่ง Price/Cost --- */}

                                        <TableCell className="text-center">
                                            {/* ... (StatusBadge - คงเดิม) ... */}
                                            <StatusBadge
                                                status={item.status}
                                                className="w-24"
                                                onClick={() => {
                                                    if (item.status === 'SOLD' && item.saleId) navigate(`/sales/${item.saleId}`);
                                                    else if (item.status === 'BORROWED' && item.borrowingId) navigate(`/borrowings/${item.borrowingId}`);
                                                    else if ((item.status === 'REPAIRING' || item.status === 'RETURNED_TO_CUSTOMER') && item.repairId) navigate(`/repairs/${item.repairId}`);
                                                    else navigate(`/inventory/${item.id}/history`);
                                                }}
                                                interactive={true}
                                            />
                                        </TableCell>
                                        <TableCell>{item.addedBy.name}</TableCell>
                                        <TableCell className="text-center">
                                            {/* ... (Dropdown Menu - คงเดิม) ... */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="primary-outline" size="icon" className="h-8 w-14 p-0">
                                                        <span className="sr-only">Open menu</span>
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>{t('tableHeader_actions')}</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => navigate(`/inventory/${item.id}/history`)}>
                                                        <History className="mr-2 h-4 w-4" /> {t('history')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            if (item.status === 'SOLD') navigate(`/sales/${item.saleId}`);
                                                            if (item.status === 'BORROWED') navigate(`/borrowings/${item.borrowingId}`);
                                                        }}
                                                        disabled={item.status !== 'SOLD' && item.status !== 'BORROWED'}
                                                    >
                                                        <View className="mr-2 h-4 w-4" /> {t('details')}
                                                    </DropdownMenuItem>
                                                    {canManage && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleSellItem(item)}
                                                                disabled={item.status !== 'IN_STOCK'}
                                                            >
                                                                <ShoppingCart className="mr-2 h-4 w-4" /> {t('action_sell')}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleBorrowItem(item)}
                                                                disabled={item.status !== 'IN_STOCK'}
                                                            >
                                                                <ArrowRightLeft className="mr-2 h-4 w-4" /> {t('action_borrow')}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleEditClick(item)}
                                                                disabled={!['IN_STOCK', 'RESERVED', 'DEFECTIVE'].includes(item.status)}
                                                            >
                                                                <Edit className="mr-2 h-4 w-4" /> {t('edit')}
                                                            </DropdownMenuItem>
                                                            {item.status === 'IN_STOCK' && (
                                                                <>
                                                                    <DropdownMenuItem className="text-blue-600 focus:text-blue-500" onClick={() => handleStatusChange(item.id, 'reserve', 'Item marked as RESERVED.')}>
                                                                        <ArchiveRestore className="mr-2 h-4 w-4" /> {t('action_mark_reserved')}
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-orange-600 focus:text-orange-500" onClick={() => handleStatusChange(item.id, 'defect', 'Item marked as DEFECTIVE.')}>
                                                                        <ShieldAlert className="mr-2 h-4 w-4" /> {t('action_mark_defective')}
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                            {item.status === 'RESERVED' && (
                                                                <DropdownMenuItem className="text-green-600 focus:text-green-500" onClick={() => handleStatusChange(item.id, 'unreserve', 'Item is now IN STOCK.')}>
                                                                    <ArrowRightLeft className="mr-2 h-4 w-4" /> {t('action_unreserve')}
                                                                </DropdownMenuItem>
                                                            )}
                                                             {item.status === 'DEFECTIVE' && (
                                                                <DropdownMenuItem className="text-green-600 focus:text-green-500" onClick={() => handleStatusChange(item.id, 'in-stock', 'Item marked as IN STOCK.')}>
                                                                    <ShieldCheck className="mr-2 h-4 w-4" /> {t('action_mark_in_stock')}
                                                                </DropdownMenuItem>
                                                            )}
                                                            {item.status === 'DECOMMISSIONED' ? (
                                                                <DropdownMenuItem className="text-green-600 focus:text-green-500" onClick={() => handleReinstateItem(item.id)}>
                                                                    <ArrowRightLeft className="mr-2 h-4 w-4" /> {t('action_reinstate')}
                                                                </DropdownMenuItem>
                                                            ) : (
                                                                <DropdownMenuItem
                                                                    className="text-red-600 focus:text-red-500"
                                                                    onSelect={(e) => e.preventDefault()}
                                                                    disabled={!['IN_STOCK', 'DEFECTIVE'].includes(item.status)}
                                                                    onClick={() => setItemToDecommission(item)}
                                                                >
                                                                    <Archive className="mr-2 h-4 w-4" /> {t('action_decommission')}
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-500"
                                                                onSelect={(e) => e.preventDefault()}
                                                                disabled={!item.isDeletable}
                                                                onClick={() => setItemToDelete(item)}
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={7} className="text-center h-24">No items found.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            {/* ... (CardFooter / Pagination - คงเดิม) ... */}
            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Label htmlFor="rows-per-page">{t('rows_per_page')}</Label>
                    <Select value={pagination ? String(pagination.itemsPerPage) : "10"} onValueChange={handleItemsPerPageChange}>
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
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination || pagination.currentPage <= 1}>{t('previous')}</Button>
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination || pagination.currentPage >= pagination.totalPages}>{t('next')}</Button>
                </div>
            </CardFooter>

            {/* ... (AlertDialogs and Dialog Components - คงเดิม) ... */}
            <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the item: <strong>{itemToDelete?.serialNumber}</strong>.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>{t('confirm')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={!!itemToDecommission} onOpenChange={(isOpen) => !isOpen && setItemToDecommission(null)}>
                 <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will decommission the item: <strong>{itemToDecommission?.serialNumber || itemToDecommission?.macAddress}</strong>.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDecommission}>{t('confirm')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {isBatchAddOpen && (
                <BatchAddInventoryDialog isOpen={isBatchAddOpen} setIsOpen={setIsBatchAddOpen} onSave={refreshData} />
            )}
            
            <EditInventoryDialog 
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                onSave={() => {
                    refreshData();
                }}
                itemId={editingItemId}
            />
        </Card>
    );
}