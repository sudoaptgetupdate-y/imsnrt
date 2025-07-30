// src/pages/CustomerPurchaseHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function CustomerPurchaseHistoryPage() {
    const { id: customerId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const [items, setItems] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const fetchData = async () => {
            if (!customerId || !token) return;
            try {
                setLoading(true);
                const [itemsRes, customerRes] = await Promise.all([
                    axiosInstance.get(`/customers/${customerId}/purchase-history`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/customers/${customerId}`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setItems(itemsRes.data);
                setCustomerName(customerRes.data.name);
            } catch (error) {
                toast.error("Failed to fetch purchase history.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [customerId, token]);

    if (loading) return <p>Loading purchase history...</p>;

    const totalPages = Math.ceil(items.length / itemsPerPage);
    const paginatedItems = items.slice(
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingCart className="h-6 w-6" />
                        {t('purchase_history_title')}
                    </h1>
                    <p className="text-muted-foreground mt-1">{t('purchase_history_description', { name: customerName })}</p>
                </div>
                <Button variant="outline" onClick={() => navigate(`/customers/${customerId}/history`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('purchase_history_back_button')}
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{t('purchase_history_all_items', { count: items.length })}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 hover:bg-muted/50">
                                    <th className="p-2 text-left">{t('tableHeader_category')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_brand')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_productModel')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_serialNumber')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_purchaseDate')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_saleId')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedItems.map(item => (
                                    <tr key={item.id} className="border-b">
                                        <td className="p-2">{item.productModel?.category?.name || 'N/A'}</td>
                                        <td className="p-2">{item.productModel?.brand?.name || 'N/A'}</td>
                                        <td className="p-2">{item.productModel?.modelNumber || 'N/A'}</td>
                                        <td className="p-2">{item.serialNumber || 'N/A'}</td>
                                        <td className="p-2">{item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : 'N/A'}</td>
                                        <td className="p-2">
                                            <Button variant="link" asChild className="p-0 h-auto">
                                                <Link to={`/sales/${item.transactionId}`}>
                                                    #{item.transactionId}
                                                </Link>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
                {items.length > 0 && (
                    <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
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
                            {t('pagination_info', { currentPage: currentPage, totalPages: totalPages, totalItems: items.length })}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>{t('previous')}</Button>
                            <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>{t('next')}</Button>
                        </div>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}