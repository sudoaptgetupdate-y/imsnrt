// src/pages/EditSalePage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";
import { Trash2, Edit } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "react-i18next"; // --- 1. Import useTranslation ---

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

export default function EditSalePage() {
    const { saleId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation(); // --- 2. เรียกใช้ useTranslation ---
    const token = useAuthStore((state) => state.token);

    const [initialCustomer, setInitialCustomer] = useState(null);
    const [availableItems, setAvailableItems] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);
    const [itemSearch, setItemSearch] = useState("");
    const [loading, setLoading] = useState(true);
    
    const debouncedItemSearch = useDebounce(itemSearch, 500);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (!token || !saleId) return;
            try {
                setLoading(true);
                const saleRes = await axiosInstance.get(`/sales/${saleId}`, { headers: { Authorization: `Bearer ${token}` } });
                const saleData = saleRes.data;
                
                setInitialCustomer(saleData.customer);
                setSelectedCustomerId(String(saleData.customerId));
                setSelectedItems(saleData.itemsSold);
                
                const inventoryRes = await axiosInstance.get("/inventory", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { status: 'IN_STOCK', search: '', limit: 1000 }
                });

                const selectedIds = new Set(saleData.itemsSold.map(i => i.id));
                const allAvailable = inventoryRes.data.data || [];
                
                const currentAndAvailable = [...saleData.itemsSold, ...allAvailable];
                const uniqueAvailable = Array.from(new Map(currentAndAvailable.map(item => [item.id, item])).values());

                setAvailableItems(uniqueAvailable.filter(item => !selectedIds.has(item.id)));

            } catch (error) {
                toast.error(t('error_fetch_initial_data')); // --- 3. แปลข้อความ ---
                navigate("/sales");
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [saleId, token, navigate, t]);
    
    useEffect(() => {
        if (loading || !token) return;
        const fetchInventoryOnSearch = async () => {
            try {
                const inventoryRes = await axiosInstance.get("/inventory", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { status: 'IN_STOCK', search: debouncedItemSearch, limit: 100 }
                });
                const selectedIds = new Set(selectedItems.map(i => i.id));
                setAvailableItems((inventoryRes.data.data || []).filter(item => !selectedIds.has(item.id)));
            } catch (error) {
                toast.error(t('error_fetch_inventory')); // --- 3. แปลข้อความ ---
            }
        };
        fetchInventoryOnSearch();
    }, [debouncedItemSearch, loading, token, selectedItems, t]);

    const handleAddItem = (itemToAdd) => {
        setSelectedItems(prev => [...prev, itemToAdd]);
        setAvailableItems(prev => prev.filter(item => item.id !== itemToAdd.id));
    };
    
    const handleRemoveItem = (itemToRemove) => {
        setSelectedItems(prev => prev.filter(item => item.id !== itemToRemove.id));
        setAvailableItems(prev => [itemToRemove, ...prev]);
    };

    const handleSubmit = async () => {
        if (!selectedCustomerId) { toast.error(t('error_select_customer')); return; } // --- 3. แปลข้อความ ---
        if (selectedItems.length === 0) { toast.error(t('error_add_item')); return; } // --- 3. แปลข้อความ ---
        
        const payload = {
            customerId: parseInt(selectedCustomerId),
            inventoryItemIds: selectedItems.map(item => item.id),
        };
        try {
            await axiosInstance.put(`/sales/${saleId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(t('success_sale_updated')); // --- 3. แปลข้อความ ---
            navigate(`/sales/${saleId}`);
        } catch (error) {
            toast.error(error.response?.data?.error || t('error_update_sale')); // --- 3. แปลข้อความ ---
        }
    };
    
    if (loading) return <p>{t('loading_sale_data')}</p>; // --- 3. แปลข้อความ ---

    const subtotal = selectedItems.reduce((total, item) => total + (item.productModel?.sellingPrice || 0), 0);
    const vatAmount = subtotal * 0.07;
    const total = subtotal + vatAmount;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    {/* --- 3. แปลข้อความ --- */}
                    <CardTitle>{t('edit_sale_select_items_title')}</CardTitle>
                    <CardDescription>{t('edit_sale_select_items_description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input 
                        placeholder={t('edit_sale_search_placeholder')}
                        value={itemSearch} 
                        onChange={(e) => setItemSearch(e.target.value)} 
                        className="mb-4" 
                    />
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead>{t('tableHeader_category')}</TableHead>
                                    <TableHead>{t('tableHeader_brand')}</TableHead>
                                    <TableHead>{t('tableHeader_product')}</TableHead>
                                    <TableHead>{t('tableHeader_serialNumber')}</TableHead>
                                    <TableHead className="text-right">{t('tableHeader_price')}</TableHead>
                                    <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {availableItems.map(item => (
                                <tr key={item.id} className="border-b">
                                    <td className="p-2">{item.productModel.category.name}</td>
                                    <td className="p-2">{item.productModel.brand.name}</td>
                                    <td className="p-2">{item.productModel.modelNumber}</td>
                                    <td className="p-2">{item.serialNumber || '-'}</td>
                                    <td className="p-2 text-right">{item.productModel.sellingPrice.toLocaleString()}</td>
                                    <td className="p-2 text-center"><Button size="sm" onClick={() => handleAddItem(item)}>{t('add')}</Button></td>
                                </tr>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Edit className="h-6 w-6" />
                        {t('edit_sale_card_title', { saleId: saleId })}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t('customer_label')}</Label>
                        <CustomerCombobox
                             selectedValue={selectedCustomerId}
                             onSelect={setSelectedCustomerId}
                             initialCustomer={initialCustomer}
                        />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">{t('selected_items_label', { count: selectedItems.length })}</h4>
                        <div className="h-48 overflow-y-auto space-y-2 pr-2">
                            {selectedItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-md">
                                    <div>
                                        <p className="font-semibold">{item.productModel.modelNumber}</p>
                                        <p className="text-xs text-slate-500">{item.serialNumber || t('no_serial_number')}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleRemoveItem(item)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex-col items-stretch space-y-4">
                    <Separator />
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>{t('createSale_subtotal')}</span>
                        <span>{subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>{t('createSale_vat')}</span>
                        <span>{vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                        <span>{t('createSale_total_price')}</span>
                        <span>{total.toLocaleString('en-US', { minimumFractionDigits: 2 })} THB</span>
                    </div>
                    <Button size="lg" onClick={handleSubmit}>{t('save_changes_button')}</Button>
                </CardFooter>
            </Card>
        </div>
    );
}