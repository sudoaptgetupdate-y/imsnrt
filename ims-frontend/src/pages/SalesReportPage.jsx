import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Receipt, Landmark, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (value) => {
    if (typeof value !== 'number') {
        value = 0;
    }
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2 }).format(value);
};

// (รับ prop 't' ที่เราแก้ไข Bug ครั้งก่อน)
const StatisticCard = ({ title, value, icon, comparison, periodText, valueClassName, t }) => { 
    const isIncrease = comparison > 0;
    const isDecrease = comparison < 0;
    
    const comparisonText = t ? t('comparison_from_last', { periodText: periodText }) : '';

    return (
        // --- START: เพิ่ม Hover Effect ที่นี่ ---
        <Card className="transition-all hover:shadow-md">
        {/* --- END: เพิ่ม Hover Effect --- */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
                {comparison !== undefined && comparison !== null && ( 
                    <p className="text-xs text-muted-foreground flex items-center">
                         <span className={cn("mr-1", isIncrease ? "text-green-600" : isDecrease ? "text-red-600" : "")}>
                            {isIncrease ? <TrendingUp className="h-4 w-4" /> : isDecrease ? <TrendingDown className="h-4 w-4" /> : null}
                         </span>
                         {isIncrease && '+'}{comparison.toFixed(2)}% {comparisonText}
                    </p>
                )}
            </CardContent>
        </Card>
    );
};


export default function SalesReportPage() {
    const { t } = useTranslation(); // <-- 't' ถูก define ที่นี่
    const token = useAuthStore((state) => state.token);
    const [loading, setLoading] = useState(true);
    
    const [statsData, setStatsData] = useState({
        totalRevenue: 0,
        totalCost: 0,
        profit: 0,
        salesCount: 0,
        itemsSoldCount: 0,
        uniqueCustomers: 0,
        revenueComparison: 0,
        salesCountComparison: 0
    });
    
    const [chartData, setChartData] = useState({ topProducts: [], topCustomers: [] });
    const [periodText, setPeriodText] = useState('');
    
    const [filter, setFilter] = useState('recent'); 
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const availableYears = [2024, 2025, 2026];

    useEffect(() => {
        const loadReportData = async () => {
            setLoading(true);
            try {
                const params = { period: filter };
                if (filter === 'year') {
                    params.year = selectedYear;
                }
                
                const response = await axiosInstance.get('/reports/sales', {
                    headers: { Authorization: `Bearer ${token}` },
                    params
                });
                
                const stats = response.data.stats;
                const profit = (stats.totalRevenue || 0) - (stats.totalCost || 0);
                
                setStatsData({
                    totalRevenue: stats.totalRevenue || 0,
                    totalCost: stats.totalCost || 0, 
                    profit: profit, 
                    salesCount: stats.salesCount || 0,
                    itemsSoldCount: stats.itemsSoldCount || 0,
                    uniqueCustomers: stats.uniqueCustomers || 0,
                    revenueComparison: stats.revenueComparison || 0,
                    salesCountComparison: stats.salesCountComparison || 0,
                });

                setChartData(response.data.charts);
                setPeriodText(response.data.periodText);

            } catch (error) {
                toast.error("Failed to load sales report.");
                console.error(error);
                 setStatsData(null); 
            } finally {
                setLoading(false);
            }
        };

        loadReportData();
    }, [filter, selectedYear, token]);
    
    // (Arrays stats คงเดิม)
    const primaryStats = [
        { 
            name: t('stat_total_revenue'), 
            value: formatCurrency(statsData?.totalRevenue), 
            icon: <DollarSign className="h-4 w-4 text-muted-foreground" />, 
            comparison: statsData?.revenueComparison 
        },
        { 
            name: t('stat_total_cost'), 
            value: formatCurrency(statsData?.totalCost), 
            icon: <Receipt className="h-4 w-4 text-muted-foreground" />,
            valueClassName: "text-orange-600"
        },
        { 
            name: t('stat_total_profit'), 
            value: formatCurrency(statsData?.profit), 
            icon: <Landmark className="h-4 w-4 text-muted-foreground" />,
            valueClassName: "text-green-600"
        },
        { 
            name: t('stat_sales_transactions'), 
            value: statsData?.salesCount, 
            icon: <Scale className="h-4 w-4 text-muted-foreground" />, 
            comparison: statsData?.salesCountComparison 
        },
    ];

    const secondaryStats = [
         { name: t('stat_items_sold'), value: statsData?.itemsSoldCount, icon: <ShoppingCart className="h-4 w-4 text-muted-foreground" /> },
         { name: t('stat_unique_customers'), value: statsData?.uniqueCustomers, icon: <Users className="h-4 w-4 text-muted-foreground" /> },
    ];

    if (loading) {
        return <div className="p-4">{t('loading_report')}</div>;
    }

    if (!statsData || (statsData.salesCount === 0 && statsData.totalRevenue === 0)) {
        return (
            <div className="container mx-auto p-4 space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col md:flex-row justify-between md:items-center">
                            <div>
                                <CardTitle>{t('sales_report_title')}</CardTitle>
                                <CardDescription>{t('sales_report_description')}</CardDescription>
                            </div>
                            <div className="flex gap-2 mt-4 md:mt-0">
                                <Select value={filter} onValueChange={setFilter}>
                                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="recent">{t('filter_recent')}</SelectItem>
                                        <SelectItem value="thisMonth">{t('filter_this_month')}</SelectItem>
                                        <SelectItem value="last3Months">{t('filter_last_3_months')}</SelectItem>
                                        <SelectItem value="last6Months">{t('filter_last_6_months')}</SelectItem>
                                        <SelectItem value="year">{t('filter_by_year')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {filter === 'year' && (
                                    <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                                        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {availableYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p>{t('no_data_period')}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }


    return (
        <div className="container mx-auto p-4 space-y-6">
            <Card>
                <CardHeader>
                    {/* (Filter UI) */}
                    <div className="flex flex-col md:flex-row justify-between md:items-center">
                        <div>
                            <CardTitle>{t('sales_report_title')}</CardTitle>
                            <CardDescription>{t('sales_report_description')}</CardDescription>
                        </div>
                         <div className="flex gap-2 mt-4 md:mt-0">
                            <Select value={filter} onValueChange={setFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recent">{t('filter_recent')}</SelectItem>
                                    <SelectItem value="thisMonth">{t('filter_this_month')}</SelectItem>
                                    <SelectItem value="last3Months">{t('filter_last_3_months')}</SelectItem>
                                    <SelectItem value="last6Months">{t('filter_last_6_months')}</SelectItem>
                                    <SelectItem value="year">{t('filter_by_year')}</SelectItem>
                                </SelectContent>
                            </Select>
                            {filter === 'year' && (
                                <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableYears.map(year => (
                                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                         {primaryStats.map(stat => (
                            // (ส่ง t={t} เข้าไปที่นี่)
                            <StatisticCard 
                                key={stat.name}
                                title={stat.name}
                                value={stat.value}
                                icon={stat.icon}
                                comparison={stat.comparison}
                                periodText={periodText}
                                valueClassName={stat.valueClassName}
                                t={t} 
                            />
                         ))}
                    </div>
                     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
                         {secondaryStats.map(stat => (
                            // (ส่ง t={t} เข้าไปที่นี่)
                            <StatisticCard 
                                key={stat.name}
                                title={stat.name}
                                value={stat.value}
                                icon={stat.icon}
                                t={t}
                            />
                         ))}
                    </div>
                </CardContent>
            </Card>

            {/* (Charts และ Tables ที่เหลือคงเดิม) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>{t('chart_sales_revenue_title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                         <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={chartData.topProducts}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis />
                                <Tooltip formatter={(value, name) => [name === 'unitsSold' ? value : formatCurrency(value), name]} />
                                <Legend />
                                <Bar dataKey="unitsSold" fill="#8884d8" name="Units Sold" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                     <CardHeader>
                        <CardTitle>{t('top_10_products_title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('tableHeader_product')}</TableHead>
                                    <TableHead className="text-right">{t('units_sold', { count: '' })}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {chartData.topProducts.map(product => (
                                    <TableRow key={product.name}>
                                        <TableCell>
                                            <div className="font-medium">{product.name}</div>
                                            <div className="text-sm text-muted-foreground">{product.brand}</div>
                                        </TableCell>
                                        <TableCell className="text-right">{product.unitsSold}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    </CardContent>
                </Card>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>{t('top_10_customers_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('tableHeader_customer')}</TableHead>
                                <TableHead>{t('stat_sales_transactions')}</TableHead>
                                <TableHead className="text-right">{t('tableHeader_total_spent')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {chartData.topCustomers.map(customer => (
                                <TableRow key={customer.name}>
                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                    <TableCell>{customer.transactions}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(customer.totalSpent)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                     </Table>
                </CardContent>
            </Card>
        </div>
    );
}