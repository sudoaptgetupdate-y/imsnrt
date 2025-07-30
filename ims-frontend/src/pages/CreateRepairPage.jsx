// src/pages/CreateRepairPage.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { ProductModelCombobox } from "@/components/ui/ProductModelCombobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Trash2, PlusCircle, UserPlus, History, Truck } from "lucide-react";
import { AddressCombobox } from "@/components/ui/AddressCombobox";
import { CustomerCombobox } from "@/components/ui/CustomerCombobox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import CustomerFormDialog from "@/components/dialogs/CustomerFormDialog";
import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

const CustomerItemDialog = ({ onAddItem }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [serialNumber, setSerialNumber] = useState("");
    const [selectedModel, setSelectedModel] = useState(null);

    const handleSubmit = () => {
        if (!serialNumber || !selectedModel) {
            toast.error("Please enter a serial number and select a product model.");
            return;
        }
        onAddItem({
            id: `customer-${Date.now()}`, // Temporary ID
            serialNumber,
            productModelId: selectedModel.id,
            productModel: selectedModel,
            isCustomerItem: true,
        });
        setIsOpen(false);
        setSerialNumber("");
        setSelectedModel(null);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <Button type="button" variant="outline" onClick={() => setIsOpen(true)}>
                <PlusCircle className="mr-2" /> {t('createRepair_register_external')}
            </Button>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('createRepair_register_external_title')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>{t('tableHeader_productModel')}</Label>
                        <ProductModelCombobox onSelect={setSelectedModel} />
                    </div>
                    <div className="space-y-2">
                        <Label>{t('tableHeader_serialNumber')}</Label>
                        <Input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value.toUpperCase())} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">{t('cancel')}</Button></DialogClose>
                    <Button onClick={handleSubmit}>{t('add')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function CreateRepairPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);

    const [repairType, setRepairType] = useState('INTERNAL'); // INTERNAL or CUSTOMER
    
    const [selectedCustomerId, setSelectedCustomerId] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
    const [purchaseHistorySearch, setPurchaseHistorySearch] = useState("");

    const [internalItems, setInternalItems] = useState([]);
    const [itemSearch, setItemSearch] = useState("");
    const debouncedItemSearch = useDebounce(itemSearch, 500);
    
    const [internalItemStatusFilter, setInternalItemStatusFilter] = useState("DEFECTIVE");
    const [isInternalItemsLoading, setIsInternalItemsLoading] = useState(false);
    const [internalCurrentPage, setInternalCurrentPage] = useState(1);
    const INTERNAL_ITEMS_PER_PAGE = 10;

    const [selectedItems, setSelectedItems] = useState([]);
    const [senderId, setSenderId] = useState("");
    const [receiverId, setReceiverId] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        setSelectedItems([]);
        if (repairType === 'INTERNAL') {
            setSelectedCustomerId("");
            setSelectedCustomer(null);
            setPurchaseHistory([]);
        } else if (repairType === 'CUSTOMER') {
            setItemSearch("");
            setInternalItems([]);
        }
    }, [repairType]);

    useEffect(() => {
        if (repairType !== 'INTERNAL' || !token) return;

        const fetchItems = async () => {
            setIsInternalItemsLoading(true);
            setInternalCurrentPage(1);
            const params = { search: debouncedItemSearch, limit: 1000 };
            
            const endpoints = {
                'DEFECTIVE': [
                    axiosInstance.get('/inventory', { headers: { Authorization: `Bearer ${token}` }, params: { ...params, status: 'DEFECTIVE' } }),
                    axiosInstance.get('/assets', { headers: { Authorization: `Bearer ${token}` }, params: { ...params, status: 'DEFECTIVE' } })
                ],
                'IN_STOCK': [axiosInstance.get('/inventory', { headers: { Authorization: `Bearer ${token}` }, params: { ...params, status: 'IN_STOCK' } })],
                'IN_WAREHOUSE': [axiosInstance.get('/assets', { headers: { Authorization: `Bearer ${token}` }, params: { ...params, status: 'IN_WAREHOUSE' } })],
            };
            
            const allEndpoints = [].concat(...Object.values(endpoints));
            const requests = internalItemStatusFilter === 'All' ? allEndpoints : (endpoints[internalItemStatusFilter] || []);

            try {
                const responses = await Promise.all(requests);
                const combined = responses.flatMap(res => res.data?.data || []);
                const selectedIds = new Set(selectedItems.map(i => i.id));
                setInternalItems(combined.filter(item => !selectedIds.has(item.id)));
            } catch (error) {
                console.error("Fetch items error:", error);
                toast.error("Failed to search for items.");
                setInternalItems([]);
            } finally {
                setIsInternalItemsLoading(false);
            }
        };
        fetchItems();
    }, [repairType, debouncedItemSearch, token, selectedItems, internalItemStatusFilter]);

    useEffect(() => {
        if (repairType !== 'CUSTOMER' || !selectedCustomerId || !token) {
            setPurchaseHistory([]);
            return;
        }

        const fetchHistory = async () => {
            try {
                const [customerRes, historyRes] = await Promise.all([
                    axiosInstance.get(`/customers/${selectedCustomerId}`, { headers: { Authorization: `Bearer ${token}` } }),
                    axiosInstance.get(`/customers/${selectedCustomerId}/purchase-history`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setSelectedCustomer(customerRes.data);
                const selectedIds = new Set(selectedItems.map(i => i.id));
                setPurchaseHistory(historyRes.data.filter(item => !selectedIds.has(item.id)));
            } catch (error) {
                toast.error("Failed to fetch customer's purchase history.");
            }
        };
        fetchHistory();
    }, [repairType, selectedCustomerId, token, selectedItems]);
    
    const handleAddItem = (itemToAdd) => {
        setSelectedItems(prev => [...prev, itemToAdd]);
    };

    const handleRemoveItem = (itemToRemove) => {
        setSelectedItems(selectedItems.filter(item => item.id !== itemToRemove.id));
    };

    const handleSubmit = async () => {
        if (!senderId || !receiverId || selectedItems.length === 0) {
            toast.error("Please select a sender, receiver, and at least one item.");
            return;
        }
        if (repairType === 'CUSTOMER' && !selectedCustomerId) {
            toast.error("Please select a customer.");
            return;
        }

        const payload = {
            senderId: parseInt(senderId),
            receiverId: parseInt(receiverId),
            notes,
            customerId: repairType === 'CUSTOMER' ? parseInt(selectedCustomerId) : null,
            items: selectedItems.map(({ id, isCustomerItem, productModelId, serialNumber }) => ({
                id, isCustomerItem: !!isCustomerItem, productModelId, serialNumber
            }))
        };
        
        try {
            const response = await axiosInstance.post('/repairs', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Repair order created successfully!");
            navigate(`/repairs/${response.data.id}`, { replace: true });
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create repair order.");
        }
    };
    
    const internalTotalPages = Math.ceil(internalItems.length / INTERNAL_ITEMS_PER_PAGE);
    const internalPaginatedItems = internalItems.slice(
        (internalCurrentPage - 1) * INTERNAL_ITEMS_PER_PAGE,
        internalCurrentPage * INTERNAL_ITEMS_PER_PAGE
    );

    const filteredPurchaseHistory = purchaseHistory.filter(item => 
        (item.serialNumber?.toLowerCase().includes(purchaseHistorySearch.toLowerCase())) ||
        (item.productModel.modelNumber.toLowerCase().includes(purchaseHistorySearch.toLowerCase()))
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('createRepair_step1_title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup value={repairType} onValueChange={setRepairType} className="flex gap-4">
                            <Label htmlFor="internal" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary w-full">
                                <RadioGroupItem value="INTERNAL" id="internal" className="sr-only" />
                                <Truck className="mb-3 h-6 w-6" />
                                {t('createRepair_type_internal')}
                            </Label>
                             <Label htmlFor="customer" className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary w-full">
                                <RadioGroupItem value="CUSTOMER" id="customer" className="sr-only" />
                                <UserPlus className="mb-3 h-6 w-6" />
                                {t('createRepair_type_customer')}
                            </Label>
                        </RadioGroup>
                    </CardContent>
                </Card>

                {repairType === 'INTERNAL' && (
                     <Card>
                        <CardHeader><CardTitle>{t('createRepair_step2_internal_title')}</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                <Input 
                                    placeholder={t('createRepair_search_asset_placeholder')} 
                                    value={itemSearch} 
                                    onChange={(e) => setItemSearch(e.target.value)}
                                    className="flex-grow"
                                />
                                <Select value={internalItemStatusFilter} onValueChange={setInternalItemStatusFilter}>
                                    <SelectTrigger className="w-full sm:w-[220px]">
                                        <SelectValue placeholder={t('filter_by_status')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">{t('status_all')}</SelectItem>
                                        <SelectItem value="DEFECTIVE">{t('status_defective')}</SelectItem>
                                        <SelectItem value="IN_STOCK">{t('status_in_stock')} (Sale)</SelectItem>
                                        <SelectItem value="IN_WAREHOUSE">{t('status_in_warehouse')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="mt-4 border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('tableHeader_brand')}</TableHead>
                                            <TableHead>{t('tableHeader_productModel')}</TableHead>
                                            <TableHead>{t('tableHeader_serialNumber')}</TableHead>
                                            <TableHead>{t('tableHeader_assetCode')}</TableHead>
                                            <TableHead>{t('tableHeader_status')}</TableHead>
                                            <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isInternalItemsLoading ? (
                                             <TableRow><TableCell colSpan={6} className="text-center h-24">Loading...</TableCell></TableRow>
                                        ) : internalPaginatedItems.map(item => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.productModel.brand.name}</TableCell>
                                                <TableCell>{item.productModel.modelNumber}</TableCell>
                                                <TableCell>{item.serialNumber || '-'}</TableCell>
                                                <TableCell>{item.assetCode || '-'}</TableCell>
                                                <TableCell><StatusBadge status={item.status} /></TableCell>
                                                <TableCell className="text-center">
                                                    <Button variant="primary-outline" size="sm" onClick={() => handleAddItem(item)}>
                                                        {t('add')}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="flex items-center justify-end gap-4 pt-4">
                                <span className="text-sm text-muted-foreground">
                                    Page {internalCurrentPage} of {internalTotalPages}
                                </span>
                                <Button variant="outline" size="sm" onClick={() => setInternalCurrentPage(p => p - 1)} disabled={internalCurrentPage <= 1}>
                                    {t('previous')}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setInternalCurrentPage(p => p + 1)} disabled={internalCurrentPage >= internalTotalPages}>
                                    {t('next')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {repairType === 'CUSTOMER' && (
                     <Card>
                        <CardHeader>
                            <CardTitle>{t('createRepair_step2_customer_title')}</CardTitle>
                            <div className="flex items-center gap-2 pt-2">
                                <div className="flex-grow"><CustomerCombobox selectedValue={selectedCustomerId} onSelect={setSelectedCustomerId} /></div>
                                <Button variant="outline" size="sm" onClick={() => setIsCustomerFormOpen(true)}><UserPlus className="mr-2" />{t('add_new')}</Button>
                            </div>
                        </CardHeader>
                        {selectedCustomerId && (
                             <CardContent>
                                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                     <CustomerItemDialog onAddItem={handleAddItem} />
                                     <Input 
                                        placeholder="Search purchase history..." 
                                        value={purchaseHistorySearch}
                                        onChange={(e) => setPurchaseHistorySearch(e.target.value)}
                                        className="flex-grow"
                                     />
                                </div>
                                 <p className="text-sm text-muted-foreground mb-2 text-center">{t('createRepair_select_from_history')}</p>
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t('tableHeader_brand')}</TableHead>
                                                <TableHead>{t('tableHeader_productModel')}</TableHead>
                                                <TableHead>{t('tableHeader_serialNumber')}</TableHead>
                                                <TableHead>{t('tableHeader_purchaseDate')}</TableHead>
                                                <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredPurchaseHistory.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.productModel.brand.name}</TableCell>
                                                    <TableCell>{item.productModel.modelNumber}</TableCell>
                                                    <TableCell>{item.serialNumber}</TableCell>
                                                    <TableCell>{new Date(item.purchaseDate).toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Button variant="primary-outline" size="sm" onClick={() => handleAddItem(item)}>
                                                            {t('add')}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                )}
            </div>
            <Card>
                <CardHeader><CardTitle>{t('createRepair_step3_title')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>{t('createRepair_sender_label')}</Label><AddressCombobox selectedValue={senderId} onSelect={setSenderId} /></div>
                        <div className="space-y-2"><Label>{t('createRepair_receiver_label')}</Label><AddressCombobox selectedValue={receiverId} onSelect={setReceiverId} /></div>
                    </div>
                    <div className="space-y-2"><Label>{t('createBorrowing_notes_label')}</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">{t('createSale_selected_items', { count: selectedItems.length })}</h4>
                        <div className="h-48 overflow-y-auto space-y-2 pr-2">
                            {selectedItems.map(item => (
                                <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-md">
                                    <div>
                                        <p className="font-semibold">{item.productModel.modelNumber}</p>
                                        <p className="text-xs text-slate-500">{item.assetCode || item.serialNumber}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleRemoveItem(item)}><Trash2 /></Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" size="lg" onClick={handleSubmit}>{t('createRepair_confirm_button')}</Button>
                </CardFooter>
            </Card>

            {isCustomerFormOpen && (
                <CustomerFormDialog 
                    isOpen={isCustomerFormOpen}
                    setIsOpen={setIsCustomerFormOpen}
                    onSave={() => {
                        // Potential combobox refresh in the future
                    }}
                />
            )}
        </div>
    );
}