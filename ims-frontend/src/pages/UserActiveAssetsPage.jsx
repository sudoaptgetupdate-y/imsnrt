// src/pages/UserActiveAssetsPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, User, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
// --- START: 1. เพิ่ม Imports สำหรับการจัดรูปแบบวันที่ ---
import { format } from "date-fns";
import { th } from "date-fns/locale";
// --- END ---

// --- START: 2. เพิ่มฟังก์ชันจัดรูปแบบวันที่ (ส่วนกลางไฟล์) ---
const formatDateByLocale = (dateString, localeCode) => {
    if (!dateString) return 'N/A'; // ป้องกัน error ถ้าวันที่เป็น null
    try {
        const date = new Date(dateString);
        if (localeCode.startsWith('th')) {
            // TH: DD/MM/BBBB (Buddhist Year)
            const buddhistYear = date.getFullYear() + 543;
            return format(date, 'dd/MM', { locale: th }) + `/${buddhistYear}`;
        }
        // EN: DD/MM/YYYY (Christian Year)
        return format(date, 'dd/MM/yyyy');
    } catch (error) {
        return "Invalid Date";
    }
};
// --- END ---

export default function UserActiveAssetsPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    // --- START: 3. แก้ไข Hook เพื่อดึง i18n มาใช้งาน ---
    const { t, i18n } = useTranslation();
    // --- END ---
    const token = useAuthStore((state) => state.token);
    const [user, setUser] = useState(null);
    const [activeAssets, setActiveAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!userId || !token) return;
            try {
                const [assetsRes, userRes] = await Promise.all([
                    axiosInstance.get(`/users/${userId}/active-assets`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setActiveAssets(assetsRes.data);
                setUser(userRes.data);
            } catch (error) {
                toast.error("Failed to fetch user's active assets.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId, token]);

    if (loading) return <p>Loading active assets...</p>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                 <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-6 w-6" /> 
                        {t('currently_assigned_assets_title')}
                    </h1>
                    <p className="text-muted-foreground mt-1">{t('user_asset_description', { name: user?.name || '...' })}</p>
                </div>
                <Button variant="outline" onClick={() => navigate(`/users/${userId}/assets`)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('back_to_full_history_button')}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('currently_assigned_assets_title')}</CardTitle>
                    <CardDescription>{t('currently_assigned_assets_desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50 hover:bg-muted/50">
                                    <th className="p-2 text-left">{t('tableHeader_assetCode')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_product')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_serialNumber')}</th>
                                    <th className="p-2 text-left">{t('tableHeader_assignedDate')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeAssets.length > 0 ? activeAssets.map(h => (
                                    <tr key={`${h.assignmentId}-${h.id}`} className="border-b">
                                        <td className="p-2 font-semibold">{h.assetCode}</td>
                                        <td className="p-2">{h.productModel.modelNumber}</td>
                                        <td className="p-2">{h.serialNumber}</td>
                                        {/* --- START: 4. ใช้งานวันที่ที่จัดรูปแบบแล้ว (ตาราง) --- */}
                                        <td className="p-2">{formatDateByLocale(h.assignedDate, i18n.language)}</td>
                                        {/* --- END --- */}
                                    </tr>
                                )) : (
                                    <tr><td colSpan="4" className="p-4 text-center text-muted-foreground">{t('no_active_assets_for_user')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}