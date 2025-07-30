// src/pages/AssetAssignmentDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, User, Printer, CornerDownLeft } from "lucide-react";
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
                    <DialogTitle>{t('dialog_receive_assets_title')}</DialogTitle>
                    <DialogDescription>{t('dialog_receive_assets_description')}</DialogDescription>
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
                                    <TableHead>{t('tableHeader_assetCode')}</TableHead>
                                    <TableHead>{t('tableHeader_category')}</TableHead>
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
                                        <TableCell>{item.inventoryItem.assetCode}</TableCell>
                                        <TableCell>{item.inventoryItem.productModel.category.name}</TableCell>
                                        <TableCell>{item.inventoryItem.productModel.modelNumber}</TableCell>
                                        <TableCell>{item.inventoryItem.serialNumber || 'N/A'}</TableCell>
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
                                        {t('dialog_confirm_return_description', { count: selectedToReturn.length })}
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
const PrintableHeaderCard = ({ assignment, formattedAssignmentId, t, profile }) => (
    <Card className="hidden print:block mb-0 border-black rounded-b-none border-b-0">
        <CardHeader className="text-center p-4">
            <h1 className="text-lg font-bold">{profile.name}</h1>
            <p className="text-xs">{profile.addressLine1}</p>
            <p className="text-xs">{t('company_phone_label')}: {profile.phone}</p>
        </CardHeader>
        <CardContent className="p-2 border-y border-black">
             <h2 className="text-md font-bold text-center tracking-widest">{t('printable_header')}</h2>
        </CardContent>
        <CardContent className="p-4">
             <div className="grid grid-cols-2 gap-6 text-xs">
                <div className="space-y-1">
                    <p className="text-slate-600">{t('printable_borrower')}</p>
                    <p className="font-semibold">{assignment.assignee.name}</p>
                    <p className="text-slate-600">{t('printable_department')}: {assignment.assignee.department || 'N/A'}</p>
                </div>
                <div className="space-y-1 text-right">
                    <p className="text-slate-600">{t('printable_doc_id')}</p>
                    <p className="font-semibold">ASSIGN-{formattedAssignmentId}</p>
                    <p className="text-slate-600">{t('printable_borrow_date')}</p>
                    <p className="font-semibold">{new Date(assignment.assignedDate).toLocaleDateString('th-TH')}</p>
                </div>
            </div>
            {assignment.notes && (
                 <div className="mt-4">
                    <p className="font-semibold text-xs">{t('notes')}:</p>
                    <p className="whitespace-pre-wrap text-xs text-slate-700 border p-2 rounded-md bg-slate-50">{assignment.notes}</p>
                </div>
            )}
        </CardContent>
    </Card>
);

const PrintableItemsCard = ({ assignment, t }) => (
    <Card className="hidden print:block mt-0 font-sarabun border-black rounded-t-none">
        <CardHeader className="p-2 border-t border-black">
            <CardTitle className="text-sm">{t('printable_item_list')} ({assignment.items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                 <table className="w-full border-collapse border-black text-xs">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border border-black p-1">{t('tableHeader_no')}</th>
                            <th className="border border-black p-1">{t('tableHeader_assetCode')}</th>
                            <th className="border border-black p-1">{t('tableHeader_item')}</th>
                            <th className="border border-black p-1">{t('tableHeader_serialNumber')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assignment.items.map((record, index) => (
                            <tr key={record.inventoryItemId}>
                                <td className="border border-black p-1 text-center">{index + 1}</td>
                                <td className="border border-black p-1">{record.inventoryItem?.assetCode}</td>
                                <td className="border border-black p-1">{record.inventoryItem?.productModel?.modelNumber}</td>
                                <td className="border border-black p-1">{record.inventoryItem?.serialNumber}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </CardContent>
    </Card>
);
// --- END: แก้ไขส่วนนี้ ---


export default function AssetAssignmentDetailPage() {
    const { assignmentId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const [assignment, setAssignment] = useState(null);
    const [companyProfile, setCompanyProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

    const fetchDetails = async () => {
        if (!assignmentId || !token) return;
        try {
            setLoading(true);
            const [response, profileRes] = await Promise.all([
                 axiosInstance.get(`/asset-assignments/${assignmentId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axiosInstance.get('/company-profile', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setAssignment(response.data);
            setCompanyProfile(profileRes.data);
        } catch (error) {
            toast.error("Failed to fetch assignment details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [assignmentId, token]);

    const handleReturnItems = async (itemIdsToReturn) => {
        if (itemIdsToReturn.length === 0) {
            toast.error("Please select at least one item to return.");
            return;
        }
        try {
            await axiosInstance.patch(`/asset-assignments/${assignmentId}/return`,
                { itemIdsToReturn },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success("Assets have been returned successfully.");
            setIsReturnDialogOpen(false);
            fetchDetails();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to process return.");
        }
    };

    if (loading || !assignment || !companyProfile) return <p>Loading details...</p>;

    const itemsToReturn = assignment.items.filter(item => !item.returnedAt && item.inventoryItem);
    const formattedAssignmentId = assignment.id.toString().padStart(6, '0');

    return (
        <div>
            <div className="no-print space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <User className="h-6 w-6" />
                            {t('assignment_detail_title')}
                        </h1>
                        <p className="text-muted-foreground">{t('assignment_detail_description', { id: formattedAssignmentId })}</p>
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
                                <CornerDownLeft className="mr-2" /> {t('receive_returned_assets')}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                     <Card className="lg:col-span-3">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                 <div>
                                    <CardTitle>{t('assignment_details_card_title')}</CardTitle>
                                    <CardDescription>{t('record_id')} #{formattedAssignmentId}</CardDescription>
                                </div>
                                 <StatusBadge status={assignment.status} className="w-28 text-base"/>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <h4 className="font-semibold">{t('assignee')}</h4>
                                    <p>{assignment.assignee.name}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold">{t('assignment_date')}</h4>
                                    <p>{new Date(assignment.assignedDate).toLocaleString()}</p>
                                </div>
                                 <div>
                                    <h4 className="font-semibold">{t('assigned_by')}</h4>
                                    <p>{assignment.approvedBy?.name || 'N/A'}</p>
                                </div>
                            </div>
                             {assignment.notes && (
                                <div>
                                    <h4 className="font-semibold">{t('notes')}</h4>
                                    <p className="whitespace-pre-wrap text-sm text-muted-foreground border p-3 rounded-md bg-muted/30">{assignment.notes}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>{t('assigned_assets_title', { count: assignment.items.length })}</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="border rounded-lg overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40">
                                            <th className="p-2 text-left">{t('tableHeader_assetCode')}</th>
                                            <th className="p-2 text-left">{t('tableHeader_category')}</th>
                                            <th className="p-2 text-left">{t('tableHeader_brand')}</th>
                                            <th className="p-2 text-left">{t('tableHeader_productModel')}</th>
                                            <th className="p-2 text-left">{t('tableHeader_serialNumber')}</th>
                                            <th className="p-2 text-left">{t('tableHeader_status')}</th>
                                            <th className="p-2 text-left">{t('tableHeader_returnDate')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assignment.items.map(record => (
                                            <tr key={record.inventoryItemId} className="border-b">
                                                <td className="p-2">{record.inventoryItem?.assetCode || 'N/A'}</td>
                                                <td className="p-2">{record.inventoryItem?.productModel?.category?.name || 'N/A'}</td>
                                                <td className="p-2">{record.inventoryItem?.productModel?.brand?.name || 'N/A'}</td>
                                                <td className="p-2">{record.inventoryItem?.productModel?.modelNumber || 'N/A'}</td>
                                                <td className="p-2">{record.inventoryItem?.serialNumber || 'N/A'}</td>
                                                <td className="p-2"><StatusBadge status={record.returnedAt ? 'RETURNED' : 'ASSIGNED'} /></td>
                                                <td className="p-2">{record.returnedAt ? new Date(record.returnedAt).toLocaleString() : 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                <PrintableHeaderCard assignment={assignment} formattedAssignmentId={formattedAssignmentId} t={t} profile={companyProfile} />
                <PrintableItemsCard assignment={assignment} t={t} />

                <div className="signature-section">
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>({assignment.assignee.name})</p>
                        <p>{t('printable_borrower')}</p>
                    </div>
                    <div className="signature-box">
                        <div className="signature-line"></div>
                        <p>({assignment.approvedBy?.name || '...................................'})</p>
                        <p>{t('printable_approver')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}