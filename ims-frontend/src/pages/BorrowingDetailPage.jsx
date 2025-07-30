// src/pages/BorrowingDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, CheckSquare, Square, Printer, CornerDownLeft, ArrowRightLeft } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next";

const ReturnItemsDialog = ({ isOpen, onOpenChange, itemsToReturn, onConfirm }) => {
    const { t } = useTranslation();
    const [selectedToReturn, setSelectedToReturn] = useState([]);

    const handleToggleReturnItem = (itemId) => {
        setSelectedToReturn(prev =>
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };

    const allItemIdsToReturn = itemsToReturn.map(item => item.inventoryItemId);
    const isAllSelected = allItemIdsToReturn.length > 0 && selectedToReturn.length === allItemIdsToReturn.length;

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedToReturn([]);
        } else {
            setSelectedToReturn(allItemIdsToReturn);
        }
    };
    
    const handleConfirm = () => {
        onConfirm(selectedToReturn);
        setSelectedToReturn([]);
    };

    useEffect(() => {
        if (!isOpen) {
            setSelectedToReturn([]);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{t('dialog_receive_items_title')}</DialogTitle>
                    <DialogDescription>{t('dialog_receive_items_description')}</DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto">
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12 text-center px-2">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={handleSelectAll}
                                            aria-label="Select all"
                                        />
                                    </TableHead>
                                    <TableHead>{t('tableHeader_category')}</TableHead>
                                    <TableHead>{t('tableHeader_brand')}</TableHead>
                                    <TableHead>{t('tableHeader_product')}</TableHead>
                                    <TableHead>{t('tableHeader_serialNumber')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {itemsToReturn.map(item => (
                                    <TableRow
                                        key={item.inventoryItemId}
                                        className="cursor-pointer"
                                        onClick={() => handleToggleReturnItem(item.inventoryItemId)}
                                    >
                                        <TableCell className="text-center">
                                            <Checkbox
                                                checked={selectedToReturn.includes(item.inventoryItemId)}
                                                onCheckedChange={() => handleToggleReturnItem(item.inventoryItemId)}
                                                aria-label={`Select item ${item.inventoryItem.serialNumber}`}
                                            />
                                        </TableCell>
                                        <TableCell>{item.inventoryItem?.productModel?.category?.name || 'N/A'}</TableCell>
                                        <TableCell>{item.inventoryItem?.productModel?.brand?.name || 'N/A'}</TableCell>
                                        <TableCell>{item.inventoryItem?.productModel?.modelNumber || 'N/A'}</TableCell>
                                        <TableCell>{item.inventoryItem?.serialNumber || 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">{t('cancel')}</Button></DialogClose>
                     <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button disabled={selectedToReturn.length === 0}>
                                    {t('confirm_return_button', { count: selectedToReturn.length })}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{t('dialog_confirm_return_title')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t('dialog_confirm_return_borrow_description', { count: selectedToReturn.length })}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleConfirm}>
                                        {t('continue')}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --- START: แก้ไขส่วนนี้ ---
const PrintableHeaderCard = ({ borrowing, formattedBorrowingId, t, profile }) => (
    <Card className="hidden print:block mb-0 border-black rounded-b-none border-b-0">
        <CardHeader className="text-center p-4">
            <h1 className="text-lg font-bold">{profile.name}</h1>
            <p className="text-xs">{profile.addressLine1}</p>
            <p className="text-xs">{t('company_phone_label')}: {profile.phone}</p>
        </CardHeader>
        <CardContent className="p-2 border-y border-black">
            <h2 className="text-md font-bold text-center tracking-widest">{t('printable_header_borrow')}</h2>
        </CardContent>
        <CardContent className="p-4">
             <div className="grid grid-cols-2 gap-6 text-xs">
                <div className="space-y-1">
                    <p className="text-slate-600">{t('borrower')}</p>
                    <p className="font-semibold">{borrowing.customer?.name || 'N/A'}</p>
                    <p className="text-slate-600">{borrowing.customer?.address || "No address provided"}</p>
                    <p className="text-slate-600">{t('phone')}. {borrowing.customer?.phone || 'N/A'}</p>
                </div>
                <div className="space-y-1 text-right">
                    <p className="text-slate-600">{t('record_id')}</p>
                    <p className="font-semibold">#{formattedBorrowingId}</p>
                    <p className="text-slate-600">{t('borrow_date')}</p>
                    <p className="font-semibold">{new Date(borrowing.borrowDate).toLocaleString('th-TH')}</p>
                    <p className="text-slate-600">{t('due_date')}</p>
                    <p className="font-semibold">{borrowing.dueDate ? new Date(borrowing.dueDate).toLocaleDateString('th-TH') : 'N/A'}</p>
                    <p className="text-slate-600">{t('approved_by')}</p>
                    <p className="font-semibold">{borrowing.approvedBy?.name || 'N/A'}</p>
                </div>
            </div>
            {borrowing.notes && (
                <div className="mt-4">
                    <p className="font-semibold text-xs">{t('printable_notes')}</p>
                    <p className="whitespace-pre-wrap text-xs text-slate-700 border p-2 rounded-md bg-slate-50">{borrowing.notes}</p>
                </div>
            )}
        </CardContent>
    </Card>
);

const PrintableItemsCard = ({ borrowing, t }) => (
    <Card className="hidden print:block mt-0 font-sarabun border-black rounded-t-none">
        <CardHeader className="p-2 border-t border-black">
            <CardTitle className="text-sm">{t('printable_items_borrowed', { count: borrowing.items.length })}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b bg-muted/40">
                            <th className="p-2 text-left">{t('tableHeader_category')}</th>
                            <th className="p-2 text-left">{t('tableHeader_brand')}</th>
                            <th className="p-2 text-left">{t('tableHeader_productModel')}</th>
                            <th className="p-2 text-left">{t('tableHeader_serialNumber')}</th>
                            <th className="p-2 text-left">{t('tableHeader_macAddress')}</th>
                            <th className="p-2 text-left">{t('tableHeader_returned_status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {borrowing.items.map(boi => (
                            <tr key={boi.inventoryItemId} className="border-b">
                                <td className="p-2">{boi.inventoryItem?.productModel?.category?.name || 'N/A'}</td>
                                <td className="p-2">{boi.inventoryItem?.productModel?.brand?.name || 'N/A'}</td>
                                <td className="p-2">{boi.inventoryItem?.productModel?.modelNumber || 'N/A'}</td>
                                <td className="p-2">{boi.inventoryItem?.serialNumber || 'N/A'}</td>
                                <td className="p-2">{boi.inventoryItem?.macAddress || 'N/A'}</td>
                                <td className="p-2">
                                    {boi.returnedAt ? `${t('status_returned')} (${new Date(boi.returnedAt).toLocaleDateString('th-TH')})` : t('status_borrowed')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CardContent>
    </Card>
);
// --- END: แก้ไขส่วนนี้ ---


export default function BorrowingDetailPage() {
    const { borrowingId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const [borrowing, setBorrowing] = useState(null);
    const [companyProfile, setCompanyProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedToReturn, setSelectedToReturn] = useState([]);
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

    const fetchDetails = async () => {
        if (!borrowingId || !token) return;
        try {
            setLoading(true);
            const [response, profileRes] = await Promise.all([
                axiosInstance.get(`/borrowings/${borrowingId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axiosInstance.get('/company-profile', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setBorrowing(response.data);
            setCompanyProfile(profileRes.data);
        }
        catch (error)
        {
            toast.error("Failed to fetch borrowing details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [borrowingId, token]);

    const handleReturnItems = async (itemIdsToReturn) => {
        if (itemIdsToReturn.length === 0) {
            toast.error("Please select at least one item to return.");
            return;
        }
        try {
            await axiosInstance.patch(`/borrowings/${borrowingId}/return`,
                { itemIdsToReturn },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Items have been returned successfully.");
            setIsReturnDialogOpen(false);
            fetchDetails();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to process return.");
        }
    };

    if (loading || !borrowing || !companyProfile) return <p>Loading details...</p>;

    const itemsToReturn = borrowing.items.filter(item => !item.returnedAt && item.inventoryItem);
    const formattedBorrowingId = borrowing.id.toString().padStart(6, '0');
    
    return (
        <div>
            <div className="no-print space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ArrowRightLeft className="h-6 w-6" />
                            {t('borrowing_detail_title')}
                        </h1>
                        <p className="text-muted-foreground">{t('borrowing_detail_description', { id: formattedBorrowingId })}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => navigate(-1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {t('back_to_list')}
                        </Button>
                        <Button variant="outline" onClick={() => window.print()}>
                            <Printer className="mr-2 h-4 w-4" />
                            {t('print_pdf')}
                        </Button>
                        {itemsToReturn.length > 0 && (
                            <Button onClick={() => setIsReturnDialogOpen(true)}>
                                <CornerDownLeft className="mr-2"/> {t('receive_returned_items_button')}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     <Card className="lg:col-span-3">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                 <div>
                                    <CardTitle>{t('borrowing_details_card_title', { id: formattedBorrowingId })}</CardTitle>
                                    <CardDescription>{t('record_id')} #{formattedBorrowingId}</CardDescription>
                                </div>
                                 <StatusBadge status={borrowing.status} className="w-28 text-base"/>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">{t('borrower')}</p>
                                    <p>{borrowing.customer.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">{t('borrow_date')}</p>
                                    <p>{new Date(borrowing.borrowDate).toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">{t('approved_by')}</p>
                                    <p>{borrowing.approvedBy?.name || 'N/A'}</p>
                                </div>
                            </div>
                            {borrowing.notes && (
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">{t('notes')}</p>
                                    <p className="whitespace-pre-wrap text-sm border p-3 rounded-md bg-muted/30">{borrowing.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    
                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>{t('borrowed_items_title', { count: borrowing.items.length })}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-lg overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('tableHeader_category')}</TableHead>
                                            <TableHead>{t('tableHeader_brand')}</TableHead>
                                            <TableHead>{t('tableHeader_productModel')}</TableHead>
                                            <TableHead>{t('tableHeader_serialNumber')}</TableHead>
                                            <TableHead>{t('tableHeader_macAddress')}</TableHead>
                                            <TableHead>{t('tableHeader_status')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {borrowing.items.map(boi => (
                                            <TableRow key={boi.inventoryItemId}>
                                                <TableCell>{boi.inventoryItem?.productModel?.category?.name || 'N/A'}</TableCell>
                                                <TableCell>{boi.inventoryItem?.productModel?.brand?.name || 'N/A'}</TableCell>
                                                <TableCell>{boi.inventoryItem?.productModel?.modelNumber || 'N/A'}</TableCell>
                                                <TableCell>{boi.inventoryItem?.serialNumber || 'N/A'}</TableCell>
                                                <TableCell>{boi.inventoryItem?.macAddress || 'N/A'}</TableCell>
                                                <TableCell>
                                                    <StatusBadge status={boi.returnedAt ? 'RETURNED' : 'BORROWED'} />
                                                    {boi.returnedAt && (
                                                        <span className="text-xs text-muted-foreground ml-2">
                                                            ({t('status_returned')} {new Date(boi.returnedAt).toLocaleDateString('th-TH')})
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <ReturnItemsDialog
                    isOpen={isReturnDialogOpen}
                    onOpenChange={setIsReturnDialogOpen}
                    itemsToReturn={itemsToReturn}
                    onConfirm={handleReturnItems}
                />
            </div>
            
            <div className="hidden print:block printable-area font-sarabun">
                <PrintableHeaderCard borrowing={borrowing} formattedBorrowingId={formattedBorrowingId} t={t} profile={companyProfile} />
                <PrintableItemsCard borrowing={borrowing} t={t} />

                <div className="signature-section">
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>( {borrowing.approvedBy?.name || '.....................................................'} )</p>
                        <p>{t('printable_signature_officer')}</p>
                    </div>
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>( {borrowing.customer?.name || '.....................................................'} )</p>
                        <p>{t('printable_signature_borrower')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}