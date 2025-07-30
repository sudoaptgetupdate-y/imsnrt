// src/pages/BorrowingPage.jsx

import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
import { PlusCircle, ArrowUpDown, ArrowRightLeft } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";

const SkeletonRow = () => (
    <TableRow>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
        <TableCell className="text-center"><div className="h-5 w-24 bg-gray-200 rounded animate-pulse mx-auto"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-8 w-[76px] bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
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

export default function BorrowingPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const currentUser = useAuthStore((state) => state.user);
    const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

    const location = useLocation();
    const initialStatus = location.state?.status || "All";

    const { 
        data: borrowings, 
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
        handleFilterChange
    } = usePaginatedFetch("/borrowings", 10, { status: initialStatus });

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowRightLeft className="h-6 w-6" />
                            {t('borrowing_title')}
                        </CardTitle>
                        <CardDescription className="mt-1">{t('borrowingDescription')}</CardDescription>
                    </div>
                    {canManage && (
                        <Button onClick={() => navigate('/borrowings/new')}>
                            <PlusCircle className="mr-2 h-4 w-4" /> {t('borrowing_create_new')}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder={t('borrowing_search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-grow"
                    />
                    <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder={t('filter_by_status')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">{t('status_all')}</SelectItem>
                            <SelectItem value="BORROWED">{t('status_borrowed')}</SelectItem>
                            <SelectItem value="RETURNED">{t('status_returned')}</SelectItem>
                            <SelectItem value="OVERDUE">{t('status_overdue')}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <SortableHeader sortKey="id" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_recordId')}
                                </SortableHeader>
                                <SortableHeader sortKey="customer" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_customer')}
                                </SortableHeader>
                                <SortableHeader sortKey="borrowDate" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_borrowDate')}
                                </SortableHeader>
                                <SortableHeader sortKey="dueDate" currentSortBy={sortBy} sortOrder={sortOrder} onSort={handleSortChange}>
                                    {t('tableHeader_dueDate')}
                                </SortableHeader>
                                <TableHead className="text-center">{t('tableHeader_status')}</TableHead>
                                <TableHead className="text-center">{t('tableHeader_itemStatus')}</TableHead>
                                <TableHead className="text-left">{t('tableHeader_approvedBy')}</TableHead>
                                <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : borrowings.map((b) => (
                                <TableRow key={b.id}>
                                    <TableCell>#{b.id}</TableCell>
                                    <TableCell>{b.customer?.name || 'N/A'}</TableCell>
                                    <TableCell>{new Date(b.borrowDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{b.dueDate ? new Date(b.dueDate).toLocaleDateString() : 'N/A'}</TableCell>
                                    <TableCell className="text-center">
                                        <StatusBadge 
                                            status={b.status} 
                                            className="w-24" 
                                            onClick={() => navigate(`/borrowings/${b.id}`)}
                                            interactive
                                        />
                                    </TableCell>
                                    <TableCell className="text-center">{b.returnedItemCount}/{b.totalItemCount} {t('item_status_returned')}</TableCell>
                                    <TableCell>{b.approvedBy?.name || 'N/A'}</TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="outline" size="sm" onClick={() => navigate(`/borrowings/${b.id}`)}>
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