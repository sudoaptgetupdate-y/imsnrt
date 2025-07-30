// src/pages/CustomerHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, ShoppingCart, PackageOpen, Package, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const StatCard = ({ title, value, icon, description, onClick }) => (
    <Card onClick={onClick} className={onClick ? "cursor-pointer hover:border-primary transition-colors" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

export default function CustomerHistoryPage() {
    const { id: customerId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    
    const [history, setHistory] = useState([]);
    const [summary, setSummary] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    useEffect(() => {
        const fetchData = async () => {
            if (!customerId || !token) return;
            try {
                setLoading(true);
                const [historyRes, summaryRes, customerRes] = await Promise.all([
                    axiosInstance.get(`/customers/${customerId}/history`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/customers/${customerId}/summary`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/customers/${customerId}`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setHistory(historyRes.data);
                setSummary(summaryRes.data);
                setCustomer(customerRes.data);
            } catch (error) {
                toast.error("Failed to fetch customer data.");
                navigate("/customers");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [customerId, token, navigate]);

    if (loading || !summary) return <p>Loading customer data...</p>;

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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-6 w-6" /> {t('customer_history_details_title')}
                    </h1>
                    <p className="text-muted-foreground mt-1">{t('customer_history_for_customer', { name: customer?.name || '...' })}</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/customers')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('customer_history_back_list')}
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard 
                    title={t('customer_summary_purchased')}
                    value={summary.purchaseHistory.length}
                    icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
                    description={t('customer_summary_purchased_desc')}
                    onClick={() => navigate(`/customers/${customerId}/purchase-history`)}
                />
                <StatCard 
                    title={t('customer_summary_borrowed')}
                    value={summary.currentlyBorrowedItems.length}
                    icon={<PackageOpen className="h-4 w-4 text-muted-foreground" />}
                    description={t('customer_summary_borrowed_desc')}
                     onClick={() => navigate(`/customers/${customerId}/active-borrowings`)}
                />
                <StatCard 
                    title={t('customer_summary_returned')}
                    value={summary.returnedItemsHistory.length}
                    icon={<Package className="h-4 w-4 text-muted-foreground" />}
                    description={t('customer_summary_returned_desc')}
                    onClick={() => navigate(`/customers/${customerId}/returned-history`)}
                />
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>{t('customer_log_title')}</CardTitle>
                    <CardDescription>{t('customer_log_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm">
                            <colgroup>
                                <col className="w-[120px]" />
                                <col className="w-[180px]" />
                                <col className="w-[120px]" />
                                <col className="w-auto" />
                                <col className="w-[140px]" />
                            </colgroup>
                            <thead>
                                <tr className="border-b bg-muted/50 hover:bg-muted/50">
                                    <th className="p-2 text-center">{t('tableHeader_type')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_date')}</th>
                                    <th className="p-2 text-center">{t('tableHeader_items')}</th>
                                    <th className="p-2 text-right">{t('tableHeader_total_status')}</th>
                                    <th className="p-2 text-center">{t('tableHeader_actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                     <tr><td colSpan="5" className="text-center p-4 text-muted-foreground">{t('customer_log_no_transactions')}</td></tr>
                                ) : paginatedHistory.map((item) => {
                                    return (
                                        <tr key={item.id} className="border-b">
                                            <td className="p-2 text-center">
                                                <StatusBadge status={item.type === 'SALE' ? item.details.status : item.type} className="w-20" />
                                            </td>
                                            <td className="p-2 text-left whitespace-nowrap">{new Date(item.date).toLocaleString()}</td>
                                            <td className="p-2 text-center">{item.itemCount}</td>
                                            <td className="p-2 text-right">
                                                {item.type === 'SALE' 
                                                    ? `${t('tableHeader_total')}: ${item.details.total.toLocaleString('en-US')} THB`
                                                    : item.details.status === 'RETURNED' 
                                                        ? `${t('status_returned')}: ${new Date(item.details.returnDate).toLocaleDateString()}`
                                                        : `${t('tableHeader_dueDate')}: ${item.details.dueDate ? new Date(item.details.dueDate).toLocaleDateString() : '-'}`
                                                }
                                            </td>
                                            <td className="p-2 text-center">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => navigate(item.type === 'SALE' ? `/sales/${item.details.id}` : `/borrowings/${item.details.id}`)}
                                                >
                                                    {t('details')}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
                {history.length > 0 && (
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
                            {t('pagination_info', { currentPage: currentPage, totalPages: totalPages, totalItems: history.length })}
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