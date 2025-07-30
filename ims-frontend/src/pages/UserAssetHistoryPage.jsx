// src/pages/UserAssetHistoryPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Package, History, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next"; // --- 1. Import useTranslation ---

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

export default function UserAssetHistoryPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation(); // --- 2. เรียกใช้ useTranslation ---
    const token = useAuthStore((state) => state.token);
    const [user, setUser] = useState(null);
    const [history, setHistory] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!userId || !token) return;
            try {
                const [historyRes, summaryRes, userRes] = await Promise.all([
                    axiosInstance.get(`/users/${userId}/assets`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/users/${userId}/assets/summary`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setHistory(historyRes.data);
                setSummary(summaryRes.data);
                setUser(userRes.data);
            } catch (error) {
                toast.error("Failed to fetch user's asset history.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId, token]);

    if (loading || !summary) return <p>Loading asset history...</p>;

    return (
        <div className="space-y-6">
            {/* --- 3. แปลข้อความ --- */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <User className="h-6 w-6" /> 
                        {t('user_asset_details_title')}
                    </h1>
                    <p className="text-muted-foreground mt-1">{t('user_asset_description', { name: user?.name || '...' })}</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/users')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('back_to_user_list_button')}
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard 
                    title={t('stat_currently_assigned')}
                    value={summary.currentlyAssigned}
                    icon={<Package className="h-4 w-4 text-muted-foreground" />}
                    description={t('stat_currently_assigned_desc')}
                    onClick={() => navigate(`/users/${userId}/active-assets`)}
                />
                <StatCard 
                    title={t('stat_total_ever_assigned')}
                    value={summary.totalEverAssigned}
                    icon={<History className="h-4 w-4 text-muted-foreground" />}
                    description={t('stat_total_ever_assigned_desc')}
                    onClick={() => navigate(`/users/${userId}/assets`)}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('full_assignment_history_title')}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 hover:bg-muted/50">
                                    <th className="p-2 text-left">{t('tableHeader_assetCode')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_product')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_assignedDate')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_returnedDate')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length > 0 ? history.map(h => (
                                    <tr key={`${h.assignmentId}-${h.inventoryItemId}`} className="border-b">
                                        <td className="p-2 font-semibold">{h.inventoryItem.assetCode}</td>
                                        <td className="p-2">{h.inventoryItem.productModel.modelNumber}</td>
                                        <td className="p-2">{new Date(h.assignedAt).toLocaleString()}</td>
                                        <td className="p-2">{h.returnedAt ? new Date(h.returnedAt).toLocaleString() : <Badge variant="warning">{t('status_in_possession')}</Badge>}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" className="p-4 text-center text-muted-foreground">{t('no_assignment_history_for_user')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}