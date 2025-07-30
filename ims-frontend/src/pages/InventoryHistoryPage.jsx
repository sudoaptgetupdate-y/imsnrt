// src/pages/InventoryHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
    ArrowLeft, ShoppingCart, ArrowRightLeft, CornerUpLeft, Package, 
    ArchiveX, Wrench, ShieldCheck, History as HistoryIcon, PlusCircle, Edit, ArchiveRestore, ShieldAlert, Printer 
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getStatusProperties } from "@/lib/statusUtils";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";

const eventConfig = {
    CREATE: { icon: <PlusCircle className="h-4 w-4" /> },
    UPDATE: { icon: <Edit className="h-4 w-4" /> },
    SALE: { icon: <ShoppingCart className="h-4 w-4" /> },
    VOID: { icon: <ArchiveX className="h-4 w-4" /> },
    BORROW: { icon: <ArrowRightLeft className="h-4 w-4" /> },
    RETURN_FROM_BORROW: { icon: <CornerUpLeft className="h-4 w-4" /> },
    ASSIGN: { icon: <ArrowRightLeft className="h-4 w-4" /> },
    RETURN_FROM_ASSIGN: { icon: <CornerUpLeft className="h-4 w-4" /> },
    DECOMMISSION: { icon: <ArchiveX className="h-4 w-4" /> },
    REINSTATE: { icon: <ArchiveRestore className="h-4 w-4" /> },
    REPAIR_SENT: { icon: <Wrench className="h-4 w-4" /> },
    REPAIR_RETURNED: { icon: <ShieldCheck className="h-4 w-4" /> },
    REPAIR_SUCCESS: { icon: <ShieldCheck className="h-4 w-4" /> },
    REPAIR_FAILED: { icon: <ShieldAlert className="h-4 w-4" /> },
};


export default function InventoryHistoryPage() {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const [itemDetails, setItemDetails] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const fetchData = async () => {
            if (!itemId || !token) return;
            try {
                const response = await axiosInstance.get(`/history/${itemId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setItemDetails(response.data.itemDetails);
                setHistory(response.data.history);
            } catch (error) {
                toast.error("Failed to fetch item history.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [itemId, token]);

    const getTransactionLink = (eventType, details) => {
        if (!details) return null;
        switch (eventType) {
            case 'SALE':
            case 'VOID':
                return `/sales/${details.saleId}`;
            case 'BORROW':
            case 'RETURN_FROM_BORROW':
                return `/borrowings/${details.borrowingId}`;
            case 'REPAIR_SENT':
            case 'REPAIR_RETURNED':
                return `/repairs/${details.repairId}`;
            default:
                return null;
        }
    };

    if (loading) return <p>Loading history...</p>;
    if (!itemDetails) return <p>Item not found.</p>;

    const totalPages = Math.ceil(history.length / itemsPerPage);
    const paginatedHistory = history.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleItemsPerPageChange = (newSize) => {
        setItemsPerPage(parseInt(newSize, 10));
        setCurrentPage(1);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center no-print">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <HistoryIcon className="h-6 w-6" />
                    {t('item_history_title')}
                </h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/inventory')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('item_history_back_button')}
                    </Button>
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        {t('print')}
                    </Button>
                </div>
            </div>

            <div className="printable-area">
                 <div className="print-header hidden">
                    <h1 className="text-xl font-bold">{t('item_history_title')}</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <Package className="h-6 w-6" />
                            <span>{itemDetails.productModel.modelNumber}</span>
                        </CardTitle>
                        <CardDescription>
                            {t('item_history_description_title')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Separator />
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6 mt-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">{t('tableHeader_serialNumber')}</p>
                                <p className="font-semibold text-foreground">{itemDetails.serialNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">{t('tableHeader_macAddress')}</p>
                                <p className="font-semibold text-foreground">{itemDetails.macAddress || 'N/A'}</p>
                            </div>
                            {itemDetails.supplier && (
                                <div>
                                    <p className="text-muted-foreground">{t('purchased_from')}</p>
                                    <p className="font-semibold text-foreground">{itemDetails.supplier.name}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>{t('item_history_log_title')}</CardTitle>
                        <CardDescription>{t('item_history_log_description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg overflow-x-auto">
                            <table className="w-full text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b bg-muted/50 hover:bg-muted/50">
                                        <th className="p-2 text-left">{t('tableHeader_date')}</th>
                                        <th className="p-2 text-left">{t('tableHeader_details')}</th>
                                        <th className="p-2 text-left print-hide">{t('tableHeader_handledBy')}</th>
                                        <th className="p-2 text-center w-40 print-hide">{t('tableHeader_event')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedHistory.length > 0 ? paginatedHistory.map((event) => {
                                        const link = getTransactionLink(event.eventType, event.details);
                                        const getDisplayInfo = (historyEvent) => {
                                            if (historyEvent.eventType === 'REPAIR_RETURNED') {
                                                if (historyEvent.details.outcome === 'REPAIRED_SUCCESSFULLY') return { status: 'REPAIR_SUCCESS' };
                                                if (historyEvent.details.outcome === 'UNREPAIRABLE') return { status: 'REPAIR_FAILED' };
                                            }
                                            return { status: historyEvent.eventType };
                                        };
                                        const { status: displayStatus } = getDisplayInfo(event);
                                        const eventIcon = eventConfig[displayStatus]?.icon;
                                        const { label: eventLabel } = getStatusProperties(displayStatus);
                                        return (
                                        <tr key={event.id} className="border-b">
                                            <td className="p-2">{new Date(event.createdAt).toLocaleString()}</td>
                                            <td className="p-2" title={event.details?.details || 'N/A'}>
                                                {event.details?.details || 'N/A'}
                                            </td>
                                            <td className="p-2 print-hide">{event.user?.name || 'System'}</td>
                                            <td className="p-2 text-center print-hide">
                                                <StatusBadge status={displayStatus} className="w-36" {...(link && { onClick: () => navigate(link) })}>
                                                    {eventIcon}
                                                    <span className="ml-1.5">{eventLabel}</span>
                                                </StatusBadge>
                                            </td>
                                        </tr>
                                    )}) : (
                                        <tr><td colSpan="4" className="p-4 text-center text-muted-foreground">{t('item_history_no_history')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                    {history.length > 0 && (
                        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 no-print">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Label htmlFor="rows-per-page">{t('rows_per_page')}</Label>
                                <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                                    <SelectTrigger id="rows-per-page" className="w-20"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {[10, 20, 50, 100].map(size => (<SelectItem key={size} value={String(size)}>{size}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {t('pagination_info', { currentPage, totalPages, totalItems: history.length })}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>{t('previous')}</Button>
                                <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>{t('next')}</Button>
                            </div>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </div>
    );
}