// src/pages/RepairPage.jsx

import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle, Wrench } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTranslation } from "react-i18next";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

const SkeletonRow = () => (
    <TableRow>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-6 w-32 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
        <TableCell className="text-center"><div className="h-5 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div></TableCell>
        <TableCell className="text-center"><div className="h-8 w-[76px] bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
    </TableRow>
);

export default function RepairListPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user: currentUser } = useAuthStore((state) => state);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const location = useLocation();
    const initialStatus = location.state?.status || "All";

    const {
        data: repairs,
        pagination,
        isLoading,
        searchTerm,
        filters,
        handleSearchChange,
        handlePageChange,
        handleItemsPerPageChange,
        handleFilterChange
    } = usePaginatedFetch("/repairs", 10, { status: initialStatus });

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Wrench className="h-6 w-6" />
                            {t('repairOrders')}
                        </CardTitle>
                        <CardDescription className="mt-1">{t('repairDescription')}</CardDescription>
                    </div>
                     {canManage && (
                        <Button onClick={() => navigate('/repairs/new')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> {t('repair_create_new')}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder={t('repair_search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-grow"
                    />
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger className="w-full sm:w-[220px]">
                            <SelectValue placeholder={t('filter_by_status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">{t('status_all')}</SelectItem>
                            <SelectItem value="REPAIRING">{t('status_repairing')}</SelectItem>
                            <SelectItem value="PARTIALLY_RETURNED">{t('status_partially_returned')}</SelectItem>
                            <SelectItem value="COMPLETED">{t('status_completed')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead>{t('tableHeader_repairId')}</TableHead>
                                <TableHead>{t('tableHeader_owner')}</TableHead>
                                <TableHead>{t('tableHeader_sentTo')}</TableHead>
                                <TableHead>{t('tableHeader_repairDate')}</TableHead>
                                <TableHead className="text-center">{t('tableHeader_status')}</TableHead>
                                <TableHead className="text-center">{t('tableHeader_itemStatus')}</TableHead>
                                <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : repairs.map((r) => (
                                <TableRow key={r.id}>
                                    <TableCell>#{r.id}</TableCell>
                                    <TableCell>{r.owner || 'N/A'}</TableCell>
                                    <TableCell>{r.receiver?.name || 'N/A'}</TableCell>
                                    <TableCell>{new Date(r.repairDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge
                                            status={r.status}
                                            className="w-32"
                                            onClick={() => navigate(`/repairs/${r.id}`)}
                                            interactive
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">{r.returnedItemCount}/{r.totalItemCount} {t('item_status_returned')}</TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="outline" size="sm" onClick={() => navigate(`/repairs/${r.id}`)}>
                                            {t('details')}
                                        </Button>
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
        </Card>
    );
}