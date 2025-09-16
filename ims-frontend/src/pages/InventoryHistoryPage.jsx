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
// --- START: 1. เพิ่ม Icon (DollarSign) ---
import { 
    ArrowLeft, ShoppingCart, ArrowRightLeft, CornerUpLeft, Package, 
    ArchiveX, Wrench, ShieldCheck, History as HistoryIcon, PlusCircle, Edit, ArchiveRestore, ShieldAlert, Printer, DollarSign 
} from "lucide-react";
// --- END ---
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getStatusProperties } from "@/lib/statusUtils";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { th } from "date-fns/locale";

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

const displayFormattedMac = (mac) => {
    if (!mac || mac.length !== 12) {
        return mac || 'N/A';
    }
    return mac.match(/.{1,2}/g)?.join(':').toUpperCase() || mac;
};

// --- START: 2. เพิ่ม Helper จัดรูปแบบเงิน ---
const formatCurrency = (value) => {
    if (typeof value !== 'number' || value === null) {
        return 'N/A';
    }
    return new Intl.NumberFormat('th-TH', { 
        style: 'currency', 
        currency: 'THB', 
        minimumFractionDigits: 2 
    }).format(value);
};
// --- END ---


export default function InventoryHistoryPage() {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
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
                // Endpoint นี้จะไปเรียก getHistoryByItemId ที่เราแก้ไขแล้ว
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

    const formatDateByLocale = (dateString, localeCode) => {
        try {
            const date = new Date(dateString);
            if (localeCode.startsWith('th')) {
                const buddhistYear = date.getFullYear() + 543;
                return format(date, 'dd/MM', { locale: th }) + `/${buddhistYear}`;
            }
            return format(date, 'dd/MM/yyyy');
        } catch (error) {
            return "Invalid Date";
        }
    };

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

    // --- START: 3. อัปเดต Logic การแสดงราคา (แก้ไขใหม่ทั้งหมด) ---
    const isSold = itemDetails.status === 'SOLD';
    const costPrice = itemDetails.purchasePrice; // ต้นทุน (ถูกต้องเสมอ)

    let displayPrice;
    let priceLabel;

    if (isSold && itemDetails.saleItem) {
        // สถานะ: SOLD และมีข้อมูลการขาย (saleItem)
        // นี่คือ "ราคาที่ขายไปจริง" จากตาราง SaleItem
        displayPrice = itemDetails.saleItem.price;
        priceLabel = t('historical_sold_price'); // "ราคาที่ขายไป" (อย่าลืมเพิ่มคำนี้ใน translation.json)
    } else {
        // สถานะ: IN_STOCK หรือสถานะอื่นๆ
        // นี่คือ "ราคาขายปัจจุบัน" จากตาราง ProductModel
        displayPrice = itemDetails.productModel.sellingPrice;
        priceLabel = t('product_model_form_selling_price'); // "ราคาขาย (ปัจจุบัน)"
    }
    // --- END: 3. จบการอัปเดต Logic ---

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
                            {/* หมายเหตุ: โค้ดนี้ตั้งสมมติฐานว่า productModel ถูก include มาแบบเต็ม
                                (จากโค้ด controller ก่อนหน้านี้)
                                ถ้า controller ของคุณ include แค่ 'productModel: true' 
                                คุณอาจจะต้องปรับ productModel.modelNumber เป็น productModel.name หรือ field ที่มีอยู่
                                แต่ถ้าคุณใช้ controller ที่ผมแก้ให้ (ที่มี include ซ้อน) โค้ดนี้จะทำงานได้เลย
                            */}
                            <span>{itemDetails.productModel.modelNumber || itemDetails.productModel.name}</span>
                        </CardTitle>
                        <CardDescription>
                            {t('item_history_description_title')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Separator />
                        {/* --- START: 4. แก้ไข Grid แสดงผล (เพิ่ม 2 ช่อง) --- */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6 mt-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">{t('tableHeader_serialNumber')}</p>
                                <p className="font-semibold text-foreground">{itemDetails.serialNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">{t('tableHeader_macAddress')}</p>
                                <p className="font-semibold text-foreground">{displayFormattedMac(itemDetails.macAddress)}</p>
                            </div>
                            {itemDetails.supplier && (
                                <div>
                                    <p className="text-muted-foreground">{t('purchased_from')}</p>
                                    <p className="font-semibold text-foreground">{itemDetails.supplier.name}</p>
                                </div>
                            )}
                            
                            {/* --- เพิ่ม 2 ช่องนี้ (ใช้ตัวแปรจาก Logic ที่แก้ไข) --- */}
                            <div>
                                <p className="text-muted-foreground flex items-center gap-1">
                                    <DollarSign className="h-4 w-4 text-red-500" /> {t('stat_total_cost')}
                                </p>
                                <p className="font-semibold text-red-600">{formatCurrency(costPrice)}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground flex items-center gap-1">
                                    <DollarSign className="h-4 w-4 text-green-500" /> 
                                    {priceLabel} {/* <--- ใช้ป้ายกำกับ (Label) แบบ Dynamic */}
                                </p>
                                <p className="font-semibold text-green-600">
                                    {formatCurrency(displayPrice)} {/* <--- ใช้ราคา (Price) แบบ Dynamic */}
                                </p>
                            </div>
                            {/* --- สิ้นสุดส่วนที่เพิ่ม --- */}

                        </div>
                        {/* --- END: 4. จบการแก้ไข Grid --- */}
                        
                        {itemDetails.notes && (
                             <div className="mt-6">
                                <h4 className="font-semibold">{t('notes')}</h4>
                                <p className="whitespace-pre-wrap text-sm text-muted-foreground border p-3 rounded-md bg-muted/30">{itemDetails.notes}</p>
                            </div>
                        )}
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
                                    {/* หมายเหตุ: โค้ดส่วนนี้ตั้งสมมติฐานว่า `history` (ที่มาจาก eventLog)
                                        มี eventType และ details.details ซึ่งอาจจะไม่ตรงกับ `eventLog`
                                        คุณอาจจะต้องปรับ `event.details.details` เป็น `event.details` หรือ `event.message`
                                        ขึ้นอยู่กับโครงสร้างตาราง `eventLog` ของคุณ
                                    */}
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
                                            <td className="p-2">{formatDateByLocale(event.createdAt, i18n.language)}</td>
                                            <td className="p-2" title={event.details?.details || 'N/A'}>
                                                {event.details?.details || event.details || 'N/A'} {/* <--- อาจจะต้องปรับส่วนนี้ */}
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