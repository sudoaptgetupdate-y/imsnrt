// src/pages/AssetPage.jsx

import { useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle, MoreHorizontal, History, Edit, ArrowRightLeft, Archive, ArrowUpDown, Layers, ShieldCheck, ShieldAlert, Trash2, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BrandCombobox } from "@/components/ui/BrandCombobox";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { useState } from "react";
import BatchAddAssetDialog from "@/components/dialogs/BatchAddAssetDialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";
import EditAssetDialog from "@/components/dialogs/EditAssetDialog";

const SkeletonRow = () => (
    <TableRow>
        <TableCell colSpan="9"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
    </TableRow>
);

const SortableHeader = ({ children, sortKey, currentSortBy, sortOrder, onSort }) => (
    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => onSort(sortKey)}>
        <div className="flex items-center gap-2">
            {children}
            {currentSortBy === sortKey && <ArrowUpDown className={`h-4 w-4 ${sortOrder === 'desc' ? 'text-slate-400' : ''}`} />}
        </div>
    </TableHead>
);

export default function AssetPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const { user: currentUser } = useAuthStore((state) => state);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
    
    const [isBatchAddOpen, setIsBatchAddOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState(null);
    const [assetToDelete, setAssetToDelete] = useState(null);

    const {
        data: assets,
        pagination,
        isLoading,
        searchTerm,
        filters,
        sortBy, 
        sortOrder,
        handleSortChange,
        handleSearchChange,
        handlePageChange,
        handleItemsPerPageChange,
        handleFilterChange,
        refreshData
    } = usePaginatedFetch("/assets", 10, {
        status: "IN_WAREHOUSE",
        categoryId: "All",
        brandId: "All"
    });

    const openEditDialog = (asset) => {
        setEditingAsset(asset);
        setIsEditDialogOpen(true);
    };

    const handleStatusChange = async (assetId, action, successMessage) => {
        try {
            await axiosInstance.patch(`/assets/${assetId}/${action}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(successMessage);
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to update asset status.`);
        }
    };
    
    const handleAssignItem = (assetToAssign) => {
        navigate('/asset-assignments/new', { state: { initialItems: [assetToAssign] } });
    };

    const confirmDelete = async () => {
        if (!assetToDelete) return;
        try {
            await axiosInstance.delete(`/assets/${assetToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("Asset deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete asset.");
        } finally {
            setAssetToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                           <Layers className="h-6 w-6" />
                           {t('assetList_title')}
                        </CardTitle>
                        <CardDescription className="mt-1">{t('assetList_description')}</CardDescription>
                    </div>
                    {canManage &&
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => setIsBatchAddOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" /> {t('asset_add_new')}
                            </Button>
                            <Button onClick={() => navigate('/asset-assignments/new')}>
                               <ArrowRightLeft className="mr-2 h-4 w-4" /> {t('assignments')}
                            </Button>
                        </div>
                    }
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <Input
                        placeholder={t('asset_search_placeholder')}
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
                            <SelectItem value="IN_WAREHOUSE">{t('status_in_warehouse')}</SelectItem>
                            <SelectItem value="ASSIGNED">{t('status_assigned')}</SelectItem>
                            <SelectItem value="DECOMMISSIONED">{t('status_archived')}</SelectItem>
                            <SelectItem value="DEFECTIVE">{t('status_defective')}</SelectItem>
                            <SelectItem value="REPAIRING">{t('status_repairing')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <SortableHeader sortKey="assetCode" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_assetCode')}
                                </SortableHeader>
                                <SortableHeader sortKey="category" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_category')}
                                </SortableHeader>
                                <SortableHeader sortKey="brand" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_brand')}
                                </SortableHeader>
                                <SortableHeader sortKey="productModel" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_productModel')}
                                </SortableHeader>
                                <SortableHeader sortKey="serialNumber" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_serialNumber')}
                                </SortableHeader>
                                <SortableHeader sortKey="macAddress" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_macAddress')}
                                </SortableHeader>
                                <TableHead className="text-center">{t('tableHeader_status')}</TableHead>
                                <TableHead>{t('tableHeader_assignedTo')}</TableHead>
                                <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : assets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan="9" className="text-center h-24">No assets found.</TableCell>
                                </TableRow>
                            ) : assets.map((asset) => (
                                <TableRow key={asset.id}>
                                    <TableCell>{asset.assetCode}</TableCell>
                                    <TableCell>{asset.productModel.category.name}</TableCell>
                                    <TableCell>{asset.productModel.brand.name}</TableCell>
                                    <TableCell>{asset.productModel?.modelNumber || 'N/A'}</TableCell>
                                    <TableCell>{asset.serialNumber || 'N/A'}</TableCell>
                                    <TableCell>{asset.macAddress || 'N/A'}</TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge
                                            status={asset.status}
                                            className="w-28"
                                            onClick={() => {
                                                if (asset.status === 'ASSIGNED' && asset.assignmentId) {
                                                    navigate(`/asset-assignments/${asset.assignmentId}`);
                                                } else if (asset.status === 'REPAIRING' && asset.repairId) {
                                                    navigate(`/repairs/${asset.repairId}`);
                                                } else {
                                                    navigate(`/assets/${asset.id}/history`);
                                                }
                                            }}
                                            interactive={true}
                                        />
                                    </TableCell>
                                    <TableCell>{asset.assignedTo?.name || '-'}</TableCell>
                                    <TableCell className="text-center">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="primary-outline" size="icon" className="h-8 w-14 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t('tableHeader_actions')}</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => navigate(`/assets/${asset.id}/history`)}>
                                                    <History className="mr-2 h-4 w-4" /> {t('action_view_history')}
                                                </DropdownMenuItem>
                                                {canManage && (
                                                    <>
                                                        <DropdownMenuItem onClick={() => openEditDialog(asset)}>
                                                            <Edit className="mr-2 h-4 w-4" /> {t('action_edit_asset')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleAssignItem(asset)}
                                                            disabled={asset.status !== 'IN_WAREHOUSE'}
                                                        >
                                                            <ArrowRightLeft className="mr-2 h-4 w-4" /> {t('action_assign_asset')}
                                                        </DropdownMenuItem>
                                                        
                                                        {asset.status === 'IN_WAREHOUSE' && (
                                                            <DropdownMenuItem className="text-orange-600 focus:text-orange-500" onClick={() => handleStatusChange(asset.id, 'defect', 'Asset marked as DEFECTIVE.')}>
                                                                <ShieldAlert className="mr-2 h-4 w-4" /> {t('action_mark_defective')}
                                                            </DropdownMenuItem>
                                                        )}

                                                        {asset.status === 'DEFECTIVE' && (
                                                            <DropdownMenuItem className="text-green-600 focus:text-green-500" onClick={() => handleStatusChange(asset.id, 'in-warehouse', 'Asset is now IN WAREHOUSE.')}>
                                                                <ShieldCheck className="mr-2 h-4 w-4" /> Mark as In Warehouse
                                                            </DropdownMenuItem>
                                                        )}

                                                        {asset.status === 'DECOMMISSIONED' ? (
                                                            <DropdownMenuItem className="text-green-600 focus:text-green-500" onClick={() => handleStatusChange(asset.id, 'reinstate', 'Asset has been reinstated.')}>
                                                                <ArchiveRestore className="mr-2 h-4 w-4" /> {t('action_reinstate')}
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                className="text-red-600 focus:text-red-500"
                                                                onSelect={(e) => e.preventDefault()}
                                                                disabled={!['IN_WAREHOUSE', 'DEFECTIVE'].includes(asset.status)}
                                                                onClick={() => handleStatusChange(asset.id, 'decommission', 'Asset has been decommissioned.')}
                                                            >
                                                                <Archive className="mr-2 h-4 w-4" /> {t('action_decommission')}
                                                            </DropdownMenuItem>
                                                        )}

                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-500"
                                                            onSelect={(e) => e.preventDefault()}
                                                            disabled={asset.status === 'ASSIGNED' || asset.status === 'REPAIRING'}
                                                            onClick={() => setAssetToDelete(asset)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
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

            {isBatchAddOpen && (
                <BatchAddAssetDialog
                    isOpen={isBatchAddOpen}
                    setIsOpen={setIsBatchAddOpen}
                    onSave={refreshData}
                />
            )}
            
            {isEditDialogOpen && (
                <EditAssetDialog
                    isOpen={isEditDialogOpen}
                    setIsOpen={setIsEditDialogOpen}
                    asset={editingAsset}
                    onSave={refreshData}
                />
            )}

            <AlertDialog open={!!assetToDelete} onOpenChange={(isOpen) => !isOpen && setAssetToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('user_alert_delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the asset: <strong>{assetToDelete?.assetCode}</strong>. This action cannot be undone and should only be used if the asset was created by mistake.
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