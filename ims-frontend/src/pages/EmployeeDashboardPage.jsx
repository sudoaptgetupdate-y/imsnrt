// src/pages/EmployeeDashboardPage.jsx
import { useEffect, useState } from 'react';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, XCircle, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next'; // --- 1. Import useTranslation ---

export default function EmployeeDashboardPage() {
    const { t } = useTranslation(); // --- 2. เรียกใช้ useTranslation ---
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axiosInstance.get('/dashboard/employee-stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(response.data);
            } catch (error) {
                toast.error("Could not load dashboard data.");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchStats();
    }, [token]);

    if (loading) return <div>Loading Dashboard...</div>;
    if (!stats) return <div>Could not load data.</div>;

    return (
        <div className="space-y-6">
            {/* --- 3. แปลข้อความ --- */}
            <h1 className="text-2xl font-bold">{t('employee_dashboard_welcome', { name: currentUser?.name || 'Employee' })}</h1>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('stat_items_in_stock')}</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{stats.itemsInStock.toLocaleString()}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('stat_defective_items')}</CardTitle>
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-red-600">{stats.defectiveItems.toLocaleString()}</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        {t('recent_sales_title')}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 hover:bg-muted/50">
                                    <th className="p-2">{t('tableHeader_customer')}</th>
                                    <th className="p-2">{t('tableHeader_date')}</th>
                                    <th className="p-2 text-center">{t('tableHeader_items_sold')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentSales.map(sale => (
                                <tr key={sale.id} className="border-b">
                                    <td className="p-2">{sale.customer.name}</td>
                                    <td className="p-2">{new Date(sale.saleDate).toLocaleString()}</td>
                                    <td className="p-2 text-center">{sale.itemsSold.length}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}