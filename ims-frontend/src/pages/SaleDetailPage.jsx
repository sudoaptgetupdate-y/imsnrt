// src/pages/SaleDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, FileText, AlertTriangle, Printer } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
// --- START: 1. เพิ่ม Imports สำหรับการจัดรูปแบบวันที่ ---
import { format } from "date-fns";
import { th } from "date-fns/locale";
// --- END ---

// --- START: เพิ่มฟังก์ชันสำหรับจัดรูปแบบ MAC Address ---
const displayFormattedMac = (mac) => {
    if (!mac || mac.length !== 12) {
        return mac || 'N/A';
    }
    return mac.match(/.{1,2}/g)?.join(':').toUpperCase() || mac;
};
// --- END ---

// --- START: 2. แก้ไข Signature ของ Component ให้รับ 'formattedSaleDate' ---
const PrintableHeaderCard = ({ profile, sale, formattedSaleId, t, formattedSaleDate }) => (
// --- END ---
    <Card className="hidden print:block mb-0 border-black rounded-b-none border-b-0">
        <CardHeader className="text-center p-4">
            <h1 className="text-lg font-bold">{profile.name}</h1>
            <p className="text-xs">{profile.addressLine1}</p>
            <p className="text-xs">{profile.addressLine2}</p>
            <p className="text-xs mt-2">{t('company_phone_label')}: {profile.phone} {t('company_tax_id_label')}: {profile.taxId}</p>
        </CardHeader>
        <CardContent className="p-2 border-y border-black">
            <h2 className="text-md font-bold text-center tracking-widest">{t('printable_receipt_header')}</h2>
        </CardContent>
        <CardContent className="p-4">
             <div className="grid grid-cols-2 gap-6 text-xs">
                 <div className="space-y-1">
                     <p className="text-slate-600">{t('customer_label')}</p>
                     <p className="font-semibold">{sale.customer.name}</p>
                     <p className="text-slate-600">{sale.customer.address || ""}</p>
                     <p className="text-slate-600">{t('phone')}. {sale.customer.phone || "-"}</p>
                 </div>
                 <div className="space-y-1 text-right">
                     <p className="text-slate-600">{t('tableHeader_saleId')}</p>
                     <p className="font-semibold">#{formattedSaleId}</p>
                     <p className="text-slate-600">{t('tableHeader_date')}</p>
                     {/* --- START: 3. ใช้ formattedSaleDate ที่ส่งเข้ามา --- */}
                     <p className="font-semibold">{formattedSaleDate}</p>
                     {/* --- END --- */}
                     <p className="text-slate-600">{t('sold_by_label')}</p>
                     <p className="font-semibold">{sale.soldBy.name}</p>
                 </div>
             </div>
             {sale.notes && (
                 <div className="mt-4">
                     <p className="font-semibold text-xs">{t('notes')}:</p>
                     <p className="whitespace-pre-wrap text-xs text-slate-700 border p-2 rounded-md bg-slate-50">{sale.notes}</p>
                 </div>
             )}
        </CardContent>
    </Card>
);

const PrintableItemsCard = ({ sale, t }) => (
    <Card className="hidden print:block mt-0 font-sarabun border-black rounded-t-none">
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/40">
                            <th className="p-2 text-left">{t('tableHeader_category')}</th>
                            <th className="p-2 text-left">{t('tableHeader_brand')}</th>
                            <th className="p-2 text-left">{t('tableHeader_product')}</th>
                            <th className="p-2 text-left">{t('tableHeader_serialNumber')}</th>
                            <th className="p-2 text-left">{t('tableHeader_macAddress')}</th>
                            <th className="p-2 text-right">{t('tableHeader_price')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.itemsSold.map(item => (
                            <tr key={item.id} className="border-b">
                                <td className="p-2">{item.productModel.category.name}</td>
                                <td className="p-2">{item.productModel.brand.name}</td>
                                <td className="p-2">{item.productModel.modelNumber}</td>
                                <td className="p-2">{item.serialNumber || 'N/A'}</td>
                                <td className="p-2">{displayFormattedMac(item.macAddress)}</td>
                                <td className="p-2 text-right">{item.productModel.sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t font-semibold">
                            <td colSpan="5" className="p-2 text-right">{t('subtotal_label')}</td>
                            <td className="p-2 text-right">{sale.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="border-t">
                            <td colSpan="5" className="p-2 text-right">{t('vat_label')}</td>
                            <td className="p-2 text-right">{sale.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="border-t text-base font-bold bg-muted/40">
                            <td colSpan="5" className="p-2 text-right">{t('total_label')}</td>
                            <td className="p-2 text-right">{sale.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </CardContent>
    </Card>
);

// --- START: 4. เพิ่มฟังก์ชันจัดรูปแบบวันที่ ---
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

export default function SaleDetailPage() {
    const { saleId } = useParams();
    const navigate = useNavigate();
    // --- START: 5. ดึง i18n มาใช้งาน ---
    const { t, i18n } = useTranslation();
    // --- END ---
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const [sale, setSale] = useState(null);
    const [companyProfile, setCompanyProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const canVoid = currentUser?.role === 'SUPER_ADMIN';

    useEffect(() => {
        const fetchAllData = async () => {
            if (!saleId || !token) return;
            try {
                const [saleRes, profileRes] = await Promise.all([
                    axiosInstance.get(`/sales/${saleId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axiosInstance.get('/company-profile', {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);
                setSale(saleRes.data);
                setCompanyProfile(profileRes.data);
            } catch (error) {
                toast.error("Failed to fetch page details.");
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [saleId, token]);

    const handleVoidSale = async () => {
        try {
            await axiosInstance.patch(`/sales/${saleId}/void`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Sale has been voided successfully.");
            const response = await axiosInstance.get(`/sales/${saleId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSale(response.data);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to void sale.");
        } finally {
            setIsAlertOpen(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading || !sale || !companyProfile) return <p>Loading sale details...</p>;
    
    const formattedSaleId = sale.id.toString().padStart(6, '0');

    // --- START: 6. สร้างตัวแปรวันที่ที่จัดรูปแบบแล้ว ---
    const formattedSaleDate = formatDateByLocale(sale.saleDate, i18n.language);
    const formattedVoidedDate = formatDateByLocale(sale.voidedAt, i18n.language);
    // --- END ---

    return (
        <div className="space-y-6">
             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 no-print">
                 <div>
                     <h1 className="text-2xl font-bold flex items-center gap-2">
                         <FileText className="h-6 w-6" /> 
                         {t('sale_detail_title')}
                     </h1>
                     <p className="text-muted-foreground mt-1">
                         {t('sale_detail_description', { id: formattedSaleId })}
                     </p>
                 </div>
                 <div className="flex flex-wrap items-center gap-2">
                     <Button variant="outline" onClick={() => navigate('/sales')}>
                         <ArrowLeft className="mr-2 h-4 w-4" />
                         {t('back_to_sales_list')}
                     </Button>
                     <Button variant="outline" onClick={handlePrint}>
                         <Printer className="mr-2 h-4 w-4" />
                         {t('print_pdf')}
                     </Button>
                     {canVoid && sale.status === 'COMPLETED' && (
                         <Button variant="destructive" onClick={() => setIsAlertOpen(true)}>
                             <AlertTriangle className="mr-2 h-4 w-4" />
                             {t('void_sale_button')}
                         </Button>
                     )}
                 </div>
             </div>

             <div className="printable-area font-sarabun">
                {/* --- START: 7. ส่ง 'formattedSaleDate' เข้าไปใน component สำหรับพิมพ์ --- */}
                <PrintableHeaderCard 
                    profile={companyProfile} 
                    sale={sale} 
                    formattedSaleId={formattedSaleId} 
                    t={t} 
                    formattedSaleDate={formattedSaleDate} 
                />
                {/* --- END --- */}
                <PrintableItemsCard sale={sale} t={t} />
                 
                 <div className="no-print space-y-6">
                     <Card>
                         <CardHeader>
                             <div className="flex justify-between items-start">
                                 <div>
                                     <CardTitle>{t('sale_details_card_title')}</CardTitle>
                                     <CardDescription>{t('record_id')} #{formattedSaleId}</CardDescription>
                                 </div>
                                 <StatusBadge status={sale.status} className="w-28 text-base"/>
                             </div>
                         </CardHeader>
                         <CardContent className="space-y-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                     <p className="text-sm font-medium text-muted-foreground">{t('customer_label')}</p>
                                     <p>{sale.customer.name}</p>
                                 </div>
                                 <div className="space-y-1">
                                     <p className="text-sm font-medium text-muted-foreground">{t('tableHeader_saleDate')}</p>
                                     {/* --- START: 8. ใช้งานวันที่ที่จัดรูปแบบแล้ว (ในหน้าเว็บ) --- */}
                                     <p>{formattedSaleDate}</p>
                                     {/* --- END --- */}
                                 </div>
                                 <div className="space-y-1">
                                     <p className="text-sm font-medium text-muted-foreground">{t('sold_by_label')}</p>
                                     <p>{sale.soldBy.name}</p>
                                 </div>
                             </div>
                             {sale.notes && (
                                 <div className="space-y-1">
                                     <p className="text-sm font-medium text-muted-foreground">{t('notes')}</p>
                                     <p className="whitespace-pre-wrap text-sm border p-3 rounded-md bg-muted/30">{sale.notes}</p>
                                 </div>
                             )}
                         </CardContent>
                     </Card>

                     {sale.status === 'VOIDED' && (
                         <Card className="border-red-500 bg-red-50/50">
                             <CardHeader>
                                 <CardTitle className="text-red-600 text-base">{t('void_info_title')}</CardTitle>
                             </CardHeader>
                             <CardContent className="grid grid-cols-2 gap-4 text-sm pb-4">
                                 <div><p className="font-semibold">{t('voided_by_label')}</p><p>{sale.voidedBy?.name || 'N/A'}</p></div>
                                 {/* --- START: 9. ใช้งานวันที่ที่จัดรูปแบบแล้ว (สำหรับวันที่ Void) --- */}
                                 <div><p className="font-semibold">{t('voided_date_label')}</p><p>{formattedVoidedDate}</p></div>
                                 {/* --- END --- */}
                             </CardContent>
                         </Card>
                     )}

                     <Card>
                         <CardContent className="p-0">
                             <div className="border rounded-lg overflow-x-auto">
                                 <table className="w-full text-sm">
                                     <thead>
                                         <tr className="border-b bg-muted/40">
                                             <th className="p-2 text-left">{t('tableHeader_category')}</th>
                                             <th className="p-2 text-left">{t('tableHeader_brand')}</th>
                                             <th className="p-2 text-left">{t('tableHeader_product')}</th>
                                             <th className="p-2 text-left">{t('tableHeader_serialNumber')}</th>
                                             <th className="p-2 text-left">{t('tableHeader_macAddress')}</th>
                                             <th className="p-2 text-right">{t('tableHeader_price')}</th>
                                         </tr>
                                     </thead>
                                     <tbody>
                                         {/* (ส่วนนี้คงเดิมตามไฟล์ต้นฉบับของคุณ ซึ่งทำงานถูกต้อง) */}
                                         {sale.itemsSold.map(item => (
                                             <tr key={item.id} className="border-b">
                                                 <td className="p-2">{item.productModel.category.name}</td>
                                                 <td className="p-2">{item.productModel.brand.name}</td>
                                                 <td className="p-2">{item.productModel.modelNumber}</td>
                                                 <td className="p-2">{item.serialNumber || 'N/A'}</td>
                                                 <td className="p-2">{displayFormattedMac(item.macAddress)}</td>
                                                 <td className="p-2 text-right">{item.productModel.sellingPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                             </tr>
                                         ))}
                                     </tbody>
                                     <tfoot>
                                         <tr className="border-t font-semibold">
                                             <td colSpan="5" className="p-2 text-right">{t('subtotal_label')}</td>
                                             <td className="p-2 text-right">{sale.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                         </tr>
                                         <tr className="border-t">
                                             <td colSpan="5" className="p-2 text-right">{t('vat_label')}</td>
                                             <td className="p-2 text-right">{sale.vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                         </tr>
                                         <tr className="border-t text-base font-bold bg-muted/40">
                                             <td colSpan="5" className="p-2 text-right">{t('total_label')}</td>
                                             <td className="p-2 text-right">{sale.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB</td>
                                         </tr>
                                     </tfoot>
                                 </table>
                             </div>
                         </CardContent>
                     </Card>
                 </div>
                 
                 <div className="signature-section hidden">
                     <div className="signature-box">
                         <div className="signature-line"></div>
                         <p>( {sale.soldBy.name} )</p>
                         <p>{t('signature_seller')}</p>
                     </div>
                     <div className="signature-box">
                         <div className="signature-line"></div>
                         <p>( {sale.customer.name} )</p>
                         <p>{t('signature_buyer')}</p>
                     </div>
                 </div>

                 <div className="print-footer hidden text-center text-xs text-muted-foreground mt-8">
                      <p>{t('thank_you_message_1')}</p>
                      <p>{t('thank_you_message_2')}</p>
                 </div>
             </div>

             <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                 <AlertDialogContent>
                     <AlertDialogHeader>
                         <AlertDialogTitle>{t('void_dialog_title')}</AlertDialogTitle>
                         <AlertDialogDescription>
                             {t('void_dialog_description', { id: sale.id })}
                         </AlertDialogDescription>
                     </AlertDialogHeader>
                     <AlertDialogFooter>
                         <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                         <AlertDialogAction onClick={handleVoidSale}>{t('continue')}</AlertDialogAction>
                     </AlertDialogFooter>
                 </AlertDialogContent>
             </AlertDialog>
        </div>
    );
}