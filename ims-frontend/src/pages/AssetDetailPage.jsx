// src/pages/AssetDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Edit, CornerUpLeft, Archive, User, Calendar, Hash, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next"; // --- 1. Import useTranslation ---

const StatCard = ({ title, value, icon, description }) => (
    <Card>
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

export default function AssetDetailPage() {
    const { assetId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation(); // --- 2. เรียกใช้ useTranslation ---
    const token = useAuthStore((state) => state.token);
    const [asset, setAsset] = useState(null);
    const [history, setHistory] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!assetId || !token) return;
        try {
            setLoading(true);
            const [assetRes, historyRes, summaryRes] = await Promise.all([
                axiosInstance.get(`/assets/${assetId}`, { headers: { Authorization: `Bearer ${token}` } }),
                axiosInstance.get(`/assets/${assetId}/history`, { headers: { Authorization: `Bearer ${token}` } }),
                axiosInstance.get(`/assets/${assetId}/summary`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setAsset(assetRes.data);
            setHistory(historyRes.data);
            setSummary(summaryRes.data);
        } catch (error) {
            toast.error("Failed to fetch asset details.");
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, [assetId, token]);

    const handleAction = async (actionType) => {
        try {
            await axiosInstance.patch(`/assets/${assetId}/${actionType}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Asset action successful.`);
            fetchData(); // Refresh all data
        } catch (error) {
            toast.error(`Failed to ${actionType} asset.`);
        }
    };
    
    const getStatusVariant = (status) => {
        switch (status) {
            case 'IN_WAREHOUSE': return 'success';
            case 'ASSIGNED': return 'warning';
            case 'DECOMMISSIONED': return 'secondary';
            case 'DEFECTIVE': return 'destructive';
            default: return 'outline';
        }
    };

    if (loading || !asset || !summary) return <p>Loading asset details...</p>;

    return (
        <div className="space-y-6">
            {/* --- 3. แปลข้อความ --- */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-6 w-6" />
                        {t('asset_detail_title')}
                    </h1>
                    <p className="text-muted-foreground mt-1">{t('asset_detail_description', { code: asset.assetCode })}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/assets')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('back_to_list')}
                    </Button>
                     <Button variant="outline" onClick={() => navigate(`/assets/edit/${asset.id}`)}>
                        <Edit className="mr-2 h-4 w-4" />
                        {t('asset_detail_edit_button')}
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard 
                    title={t('stat_current_status')}
                    value={<Badge variant={getStatusVariant(asset.status)}>{asset.status}</Badge>}
                    icon={<User className="h-4 w-4 text-muted-foreground" />}
                    description={asset.assignedTo ? t('stat_current_status_desc_assigned', { name: asset.assignedTo.name }) : t('stat_current_status_desc_available')}
                />
                <StatCard 
                    title={t('stat_total_assignments')}
                    value={summary.totalAssignments}
                    icon={<Hash className="h-4 w-4 text-muted-foreground" />}
                    description={t('stat_total_assignments_desc')}
                />
                 <StatCard 
                    title={t('stat_last_assigned_date')}
                    value={summary.lastAssignedDate ? new Date(summary.lastAssignedDate).toLocaleDateString() : 'N/A'}
                    icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
                    description={t('stat_last_assigned_date_desc')}
                />
            </div>
            
            <div className="flex gap-4">
                {asset.status === 'ASSIGNED' && (
                    <Button onClick={() => handleAction('return')}><CornerUpLeft className="mr-2 h-4 w-4" />{t('return_to_warehouse_button')}</Button>
                )}
                {asset.status === 'IN_WAREHOUSE' && (
                    <Button variant="destructive" onClick={() => handleAction('decommission')}><Archive className="mr-2 h-4 w-4" />{t('decommission_button')}</Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('assignment_history_title')}</CardTitle>
                    <CardDescription>{t('assignment_history_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 hover:bg-muted/50">
                                    <th className="p-2 text-left">{t('tableHeader_assignedTo')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_assignedDate')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_returnedDate')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length > 0 ? history.map(h => (
                                    <tr key={h.id} className="border-b">
                                        <td className="p-2">{h.assignedTo.name}</td>
                                        <td className="p-2">{new Date(h.assignedAt).toLocaleString()}</td>
                                        <td className="p-2">{h.returnedAt ? new Date(h.returnedAt).toLocaleString() : <span className="italic text-muted-foreground">{t('status_in_possession')}</span>}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="3" className="p-4 text-center text-muted-foreground">{t('no_assignment_history')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}