// src/pages/AssignAssetPage.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { UserCombobox } from "@/components/ui/UserCombobox";

const SkeletonRow = () => (
    <tr className="border-b">
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2"><div className="h-5 bg-gray-200 rounded animate-pulse"></div></td>
        <td className="p-2 text-center"><div className="h-8 w-14 bg-gray-200 rounded-md animate-pulse mx-auto"></div></td>
    </tr>
);

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

export default function AssignAssetPage() {
    const navigate = useNavigate();
    const token = useAuthStore((state) => state.token);

    const [availableAssets, setAvailableAssets] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [assetSearch, setAssetSearch] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const debouncedAssetSearch = useDebounce(assetSearch, 500);

    useEffect(() => {
        const fetchAvailableAssets = async () => {
            if (!token) return;
            setIsLoading(true);
            try {
                const response = await axiosInstance.get("/assets", {
                    headers: { Authorization: `Bearer ${token}` },
                    params: { 
                        status: 'IN_WAREHOUSE',
                        search: debouncedAssetSearch,
                        limit: 100 
                    }
                });
                
                const selectedIds = new Set(selectedAssets.map(i => i.id));
                const newAvailable = response.data.data.filter(asset => !selectedIds.has(asset.id));
                setAvailableAssets(newAvailable);

            } catch (error) {
                toast.error("Failed to fetch available assets.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAvailableAssets();
    }, [token, debouncedAssetSearch]);

    const handleAddItem = (assetToAdd) => {
        setSelectedAssets(prev => [...prev, assetToAdd]);
        setAvailableAssets(prev => prev.filter(asset => asset.id !== assetToAdd.id));
    };

    const handleRemoveItem = (assetToRemove) => {
        setSelectedAssets(selectedAssets.filter(asset => asset.id !== assetToRemove.id));
        setAvailableAssets(prev => [assetToRemove, ...prev]);
    };

    const handleSubmit = async () => {
        if (!selectedUserId) {
            toast.error("Please select an employee to assign the assets to.");
            return;
        }
         if (selectedAssets.length === 0) {
            toast.error("Please add at least one asset.");
            return;
        }

        const assignPromises = selectedAssets.map(asset => 
            axiosInstance.patch(`/assets/${asset.id}/assign`, 
                { userId: selectedUserId },
                { headers: { Authorization: `Bearer ${token}` } }
            )
        );

        try {
            await Promise.all(assignPromises);
            toast.success(`${selectedAssets.length} asset(s) have been assigned successfully!`);
            navigate("/assets");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to assign assets.");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Select Assets to Assign</CardTitle>
                    <CardDescription>Search for available assets in the warehouse.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input
                        placeholder="Search by Asset Code, S/N, or Product Model..."
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                        className="mb-4"
                    />
                    <div className="h-96 overflow-y-auto border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-100">
                                <tr className="border-b">
                                    <th className="p-2 text-left">Asset Code</th>
                                    <th className="p-2 text-left">Product</th>
                                    <th className="p-2 text-left">Serial No.</th>
                                    <th className="p-2 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                                ) : availableAssets.map(asset => (
                                    <tr key={asset.id} className="border-b">
                                        <td className="p-2">{asset.assetCode}</td>
                                        <td className="p-2">{asset.productModel.modelNumber}</td>
                                        <td className="p-2">{asset.serialNumber || '-'}</td>
                                        <td className="p-2 text-center">
                                            <Button size="sm" onClick={() => handleAddItem(asset)}>Add</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Assignment Summary</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Assign To (Employee)</Label>
                        <UserCombobox
                            selectedValue={selectedUserId}
                            onSelect={setSelectedUserId}
                        />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Selected Assets ({selectedAssets.length})</h4>
                        {selectedAssets.length > 0 ? (
                            <div className="h-64 overflow-y-auto space-y-2 pr-2">
                                {selectedAssets.map(asset => (
                                    <div key={asset.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-md">
                                        <div>
                                            <p className="font-semibold">{asset.assetCode}</p>
                                            <p className="text-xs text-slate-500">{asset.productModel.modelNumber}</p>
                                        </div>
                                        <Button variant="destructive" size="sm" onClick={() => handleRemoveItem(asset)}>Remove</Button>
                                    </div>
                                ))}
                            </div>
                        ) : (<p className="text-sm text-slate-500 text-center py-8">No assets selected.</p>)}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleSubmit}
                        disabled={!selectedUserId || selectedAssets.length === 0}
                    >
                        Confirm Assignment
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}