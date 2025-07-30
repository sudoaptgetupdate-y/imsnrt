// src/pages/ActiveBorrowingsPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
// --- START: 1. Import CardFooter และส่วนประกอบสำหรับ Pagination ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// --- END ---
import { toast } from "sonner";
import { ArrowLeft, CheckSquare, Square, PackageOpen } from "lucide-react";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";

export default function ActiveBorrowingsPage() {
    const { id: customerId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    
    const [allItems, setAllItems] = useState([]); 
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [selectedToReturn, setSelectedToReturn] = useState([]);

    // --- START: 2. เพิ่ม State สำหรับจัดการ Pagination ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    // --- END ---

    const fetchData = async () => {
        if (!customerId || !token) return;
        try {
            setLoading(true);
            const [borrowingsRes, customerRes] = await Promise.all([
                axiosInstance.get(`/customers/${customerId}/active-borrowings`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axiosInstance.get(`/customers/${customerId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            
            const flattenedItems = borrowingsRes.data.flatMap(transaction => 
                transaction.items.map(item => ({
                    ...item,
                    borrowingId: transaction.id
                }))
            );
            setAllItems(flattenedItems);
            setCustomer(customerRes.data);
        } catch (error) {
            toast.error("Failed to fetch data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [customerId, token]);

    const handleToggleReturnItem = (itemId) => {
        setSelectedToReturn(prev =>
            prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
        );
    };
    
    const handleReturnSelectedItems = async () => {
        if (selectedToReturn.length === 0) {
            toast.error("Please select at least one item to return.");
            return;
        }

        const itemsByBorrowing = selectedToReturn.reduce((acc, itemId) => {
            const item = allItems.find(i => i.id === itemId);
            if (item) {
                const { borrowingId } = item;
                if (!acc[borrowingId]) {
                    acc[borrowingId] = [];
                }
                acc[borrowingId].push(itemId);
            }
            return acc;
        }, {});

        const returnPromises = Object.entries(itemsByBorrowing).map(([borrowingId, itemIds]) =>
            axiosInstance.patch(`/borrowings/${borrowingId}/return`,
                { itemIdsToReturn: itemIds },
                { headers: { Authorization: `Bearer ${token}` } }
            )
        );

        try {
            await Promise.all(returnPromises);
            toast.success(`${selectedToReturn.length} item(s) have been returned successfully.`);
            fetchData();
            setSelectedToReturn([]);
        } catch (error) {
            toast.error("An error occurred while returning items.");
        }
    };

    if (loading) return <p>Loading active borrowings...</p>;

    // --- START: 3. เพิ่ม Logic สำหรับคำนวณและแบ่งหน้าข้อมูล ---
    const totalPages = Math.ceil(allItems.length / itemsPerPage);
    const paginatedItems = allItems.slice(
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
    // --- END ---

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <PackageOpen className="h-6 w-6" />
                        Active Borrowed Items
                    </h1>
                    <p className="text-muted-foreground mt-1">For Customer: {customer?.name || '...'}</p>
                </div>
                <Button variant="outline" onClick={() => navigate(`/customers/${customerId}/history`, { state: { defaultTab: 'summary' } })}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Summary
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Borrowed Items ({allItems.length})</CardTitle>
                    <CardDescription>
                        Select items to return. You can return items from different borrowing records at the same time.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 hover:bg-muted/50">
                                    <th className="p-2 w-12 text-center">Return</th>
                                    <th className="p-2 text-left">Product</th>
                                    <th className="p-2 text-left">Serial Number</th>
                                    <th className="p-2 text-left">From Borrowing ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* --- START: 4. เปลี่ยนไปใช้ข้อมูลที่แบ่งหน้าแล้ว --- */}
                                {allItems.length > 0 ? (
                                    paginatedItems.map(item => (
                                        <tr 
                                            key={item.id} 
                                            className="border-b cursor-pointer hover:bg-slate-50"
                                            onClick={() => handleToggleReturnItem(item.id)}
                                        >
                                            <td className="p-2 text-center">
                                                {selectedToReturn.includes(item.id) 
                                                    ? <CheckSquare className="h-5 w-5 text-primary mx-auto" /> 
                                                    : <Square className="h-5 w-5 text-muted-foreground mx-auto" />
                                                }
                                            </td>
                                            <td className="p-2">{item.productModel.modelNumber}</td>
                                            <td className="p-2">{item.serialNumber || 'N/A'}</td>
                                            <td className="p-2">#{item.borrowingId}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="p-4 text-center text-muted-foreground">
                                            This customer has no active borrowings.
                                        </td>
                                    </tr>
                                )}
                                {/* --- END --- */}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
                {allItems.length > 0 && (
                    <CardFooter className="pt-6 flex-col sm:flex-row items-center justify-between gap-4">
                        {/* --- START: 5. เพิ่มส่วนควบคุม Pagination และปุ่ม Confirm --- */}
                        <div className="flex-1">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button disabled={selectedToReturn.length === 0}>
                                        Confirm Return ({selectedToReturn.length} items)
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirm Return</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            You are about to return {selectedToReturn.length} item(s). This will change their status back to "IN_STOCK". Are you sure?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleReturnSelectedItems}>
                                            Continue
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
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
                            {t('pagination_info', { currentPage: currentPage, totalPages: totalPages, totalItems: allItems.length })}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>{t('previous')}</Button>
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>{t('next')}</Button>
                        </div>
                        {/* --- END --- */}
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
