// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Package, ArrowRightLeft, Wrench, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

// -- Reusable component for the main statistic cards with inline charts --
const StatCard = ({ title, value, trendValue, trendDirection, icon: Icon, chartData, onClick, trendText }) => (
    <Card 
        className={cn("shadow-sm border-subtle", onClick && "cursor-pointer hover:bg-muted/50 transition-colors")}
        onClick={onClick}
    >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className="h-5 w-5 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-3xl font-bold">{value}</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                        {trendDirection === 'up' ? (
                            <ArrowUp className="h-3 w-3 mr-1 text-emerald-500" />
                        ) : (
                            <ArrowDown className="h-3 w-3 mr-1 text-red-500" />
                        )}
                        <span className={trendDirection === 'up' ? 'text-emerald-500' : 'text-red-500'}>{trendValue}</span>
                        <span>&nbsp;{trendText}</span>
                    </div>
                </div>
                <div className="h-12 w-24">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke={trendDirection === 'up' ? "hsl(var(--primary))" : "#ef4444"}
                                strokeWidth={2} 
                                dot={false} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </CardContent>
    </Card>
);

// -- Reusable component for displaying recent activity tables --
const RecentActivityTable = ({ title, description, data, columns, viewAllLink, viewAllText }) => {
    const navigate = useNavigate();

    return (
        <Card className="shadow-sm border-subtle h-full flex flex-col">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col) => (
                                <TableHead key={col.key} className={col.className}>{col.header}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data && data.map((row) => (
                            <TableRow 
                                key={row.id} 
                                className="cursor-pointer" 
                                onClick={() => navigate(`${viewAllLink}/${row.id}`)}
                            >
                                {columns.map((col) => (
                                    <TableCell key={`${row.id}-${col.key}`} className={col.className}>
                                        {col.render(row)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
            <CardFooter>
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => navigate(viewAllLink)}>
                    {viewAllText} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
};


export default function DashboardPage() {
    const { t } = useTranslation();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const navigate = useNavigate();
    
    const mockTrendData = {
        revenue: [{value: 3}, {value: 4}, {value: 2}, {value: 5}, {value: 8}, {value: 10}],
        stock: [{value: 10}, {value: 8}, {value: 9}, {value: 7}, {value: 6}, {value: 5}],
        borrowing: [{value: 2}, {value: 3}, {value: 3}, {value: 4}, {value: 5}, {value: 5}],
        repairs: [{value: 1}, {value: 2}, {value: 1}, {value: 3}, {value: 2}, {value: 4}],
    };
    
    useEffect(() => {
        const fetchStats = async () => {
            if (!token) return;
            try {
                const response = await axiosInstance.get('/dashboard/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(response.data);
            } catch (error) {
                toast.error("Failed to load dashboard data.");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [token]);

    const navigateWithFilter = (path, status) => {
        navigate(path, { state: { status: status } });
    };

    if (loading) {
        return <p>Loading dashboard...</p>;
    }
    if (!stats) {
        return <p>Could not load dashboard data.</p>;
    }

    // --- START: แก้ไขคอลัมน์ของตาราง Sales ---
    const salesColumns = [
        { key: 'customer', header: t('tableHeader_customer'), render: (row) => row.customer.name, className: "font-medium" },
        { key: 'status', header: t('tableHeader_status'), render: (row) => <StatusBadge status={row.status} />, className: "text-center" },
        { key: 'total', header: t('tableHeader_total'), render: (row) => new Intl.NumberFormat('th-TH').format(row.total), className: "text-right" },
    ];
    // --- END: แก้ไขคอลัมน์ของตาราง Sales ---
    
    const borrowingColumns = [
        { key: 'borrower', header: t('customers'), render: (row) => row.customer.name, className: "font-medium" },
        { key: 'status', header: t('tableHeader_status'), render: (row) => <StatusBadge status={row.status} />, className: "text-center" },
        { key: 'date', header: t('tableHeader_borrowDate'), render: (row) => new Date(row.borrowDate).toLocaleDateString('en-GB'), className: "text-right text-muted-foreground" },
    ];

    const repairColumns = [
        { key: 'receiver', header: t('tableHeader_sentTo'), render: (row) => row.receiver.name, className: "font-medium" },
        { key: 'status', header: t('tableHeader_status'), render: (row) => <StatusBadge status={row.status} />, className: "text-center" },
        { key: 'date', header: t('tableHeader_repairDate'), render: (row) => new Date(row.repairDate).toLocaleDateString('en-GB'), className: "text-right text-muted-foreground" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t('welcomeBack', { name: currentUser?.name.split(' ')[0] })}</h1>
                <p className="text-muted-foreground">{t('dashboardDescription')}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title={t('totalRevenue')}
                    value={new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 0 }).format(stats.totalRevenue || 0)}
                    trendValue="+12.5%"
                    trendDirection="up"
                    icon={DollarSign}
                    chartData={mockTrendData.revenue}
                    trendText={t('vsLastWeek')}
                />
                <StatCard 
                    title={t('itemsInStock')}
                    value={stats.itemsInStock || 0}
                    trendValue="-2.1%"
                    trendDirection="down"
                    icon={Package}
                    chartData={mockTrendData.stock}
                    onClick={() => navigate('/inventory')}
                    trendText={t('vsLastWeek')}
                />
                <StatCard 
                    title={t('activeBorrowings')}
                    value={stats.activeBorrowings || 0}
                    trendValue="+1 new"
                    trendDirection="up"
                    icon={ArrowRightLeft}
                    chartData={mockTrendData.borrowing}
                    onClick={() => navigateWithFilter('/borrowings', 'BORROWED')}
                    trendText={t('vsLastWeek')}
                />
                <StatCard 
                    title={t('activeRepairs')}
                    value={stats.activeRepairs || 0}
                    trendValue="+2 new"
                    trendDirection="up"
                    icon={Wrench}
                    chartData={mockTrendData.repairs}
                    onClick={() => navigateWithFilter('/repairs', 'REPAIRING')}
                    trendText={t('vsLastWeek')}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <RecentActivityTable
                        title={t('latestSales')}
                        description={t('salesDescription')}
                        data={stats.recentSales}
                        columns={salesColumns}
                        viewAllLink="/sales"
                        viewAllText={t('viewAll')}
                    />
                </div>
                <div className="lg:col-span-1">
                     <RecentActivityTable
                        title={t('latestBorrowings')}
                        description={t('borrowingDescription')}
                        data={stats.recentBorrowings}
                        columns={borrowingColumns}
                        viewAllLink="/borrowings"
                        viewAllText={t('viewAll')}
                    />
                </div>
                <div className="lg:col-span-1">
                     <RecentActivityTable
                        title={t('latestRepairOrders')}
                        description={t('repairDescription')}
                        data={stats.recentRepairs}
                        columns={repairColumns}
                        viewAllLink="/repairs"
                        viewAllText={t('viewAll')}
                    />
                </div>
            </div>
        </div>
    );
}