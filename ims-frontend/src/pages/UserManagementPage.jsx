// src/pages/UserManagementPage.jsx

import { useState } from "react";
import useAuthStore from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePaginatedFetch } from "@/hooks/usePaginatedFetch";
// --- START: 1. Import ไอคอน ---
import { UserPlus, Edit, Trash2, MoreHorizontal, Package, ShieldOff, ShieldCheck, Settings } from "lucide-react";
// --- END ---
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axiosInstance from '@/api/axiosInstance';
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

const SkeletonRow = () => (
    <TableRow>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell><div className="h-5 bg-gray-200 rounded animate-pulse"></div></TableCell>
        <TableCell className="text-center"><div className="h-6 w-24 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
        <TableCell className="text-center"><div className="h-6 w-20 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
        <TableCell className="text-center"><div className="h-8 w-14 bg-gray-200 rounded-md animate-pulse mx-auto"></div></TableCell>
    </TableRow>
);

const initialFormData = {
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    accountStatus: 'ACTIVE'
};

export default function UserManagementPage() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const token = useAuthStore((state) => state.token);
    const currentUser = useAuthStore((state) => state.user);
    const {
        data: users, pagination, isLoading, searchTerm, handleSearchChange, handlePageChange, handleItemsPerPageChange, refreshData
    } = usePaginatedFetch("/users", 10);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [editingUserId, setEditingUserId] = useState(null);
    const [userToToggleStatus, setUserToToggleStatus] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);

    const openDialog = (user = null) => {
        if (user) {
            setIsEditMode(true);
            setEditingUserId(user.id);
            setFormData({
                name: user.name,
                username: user.username,
                email: user.email,
                password: '', 
                role: user.role,
                accountStatus: user.accountStatus
            });
        } else {
            setIsEditMode(false);
            setFormData(initialFormData);
        }
        setIsDialogOpen(true);
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData({ ...formData, [id]: value });
    };
    
    const handleSelectChange = (id, value) => {
        setFormData({ ...formData, [id]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = isEditMode ? `/users/${editingUserId}` : "/users";
        const method = isEditMode ? 'put' : 'post';
        
        let payload = { ...formData };
        if (isEditMode) {
            if (!payload.password) {
                delete payload.password;
            }
            delete payload.username;
        }


        try {
            await axiosInstance[method](url, payload, { headers: { Authorization: `Bearer ${token}` } });
            toast.success(`User ${isEditMode ? 'updated' : 'created'} successfully!`);
            refreshData();
            setIsDialogOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to save user.`);
        }
    };
    
    const confirmToggleStatus = async () => {
        if (!userToToggleStatus) return;
        const newStatus = userToToggleStatus.accountStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        try {
            await axiosInstance.patch(`/users/${userToToggleStatus.id}/status`, 
                { accountStatus: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`User status changed to ${newStatus}.`);
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to update user status.");
        } finally {
            setUserToToggleStatus(null);
        }
    }


    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await axiosInstance.delete(`/users/${userToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("User deleted successfully!");
            refreshData();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to delete user.");
        } finally {
            setUserToDelete(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                {/* --- START: 2. ปรับปรุง CardHeader --- */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                           <Settings className="h-6 w-6" />
                           {t('userManagement')}
                        </CardTitle>
                        <CardDescription className="mt-1">{t('userManagement_description')}</CardDescription>
                    </div>
                     <Button onClick={() => openDialog()}>
                        <UserPlus className="mr-2 h-4 w-4" /> {t('user_add_new')}
                    </Button>
                </div>
                {/* --- END --- */}
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <Input
                        placeholder={t('user_search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="flex-grow"
                    />
                </div>
                {/* --- START: 3. เพิ่ม Div ครอบ Table และปรับปรุง Header --- */}
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead>{t('tableHeader_name')}</TableHead>
                                <TableHead>{t('tableHeader_email')}</TableHead>
                                <TableHead className="text-center">{t('tableHeader_role')}</TableHead>
                                <TableHead className="text-center">{t('tableHeader_status')}</TableHead>
                                <TableHead className="text-center">{t('tableHeader_actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                [...Array(pagination.itemsPerPage)].map((_, i) => <SkeletonRow key={i} />)
                            ) : users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={user.role === 'SUPER_ADMIN' ? 'destructive' : (user.role === 'ADMIN' ? 'secondary' : 'outline')}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant={user.accountStatus === 'ACTIVE' ? 'success' : 'destructive'}>
                                            {user.accountStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                       <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="primary-outline" size="icon" className="h-8 w-14 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t('tableHeader_actions')}</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => navigate(`/users/${user.id}/assets`)}>
                                                    <Package className="mr-2 h-4 w-4" /> {t('user_view_assets')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => openDialog(user)}>
                                                    <Edit className="mr-2 h-4 w-4" /> {t('user_edit')}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                 {user.id !== currentUser.id && (
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setUserToToggleStatus(user)}>
                                                        {user.accountStatus === 'ACTIVE' ? 
                                                            <><ShieldOff className="mr-2 h-4 w-4 text-red-500"/> <span className="text-red-500">{t('user_disable')}</span></> : 
                                                            <><ShieldCheck className="mr-2 h-4 w-4 text-green-500"/> <span className="text-green-500">{t('user_enable')}</span></>
                                                        }
                                                    </DropdownMenuItem>
                                                 )}
                                                {user.id !== currentUser.id && (
                                                     <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setUserToDelete(user)} className="text-red-600 focus:text-red-500">
                                                        <Trash2 className="mr-2 h-4 w-4" /> {t('user_delete')}
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {/* --- END --- */}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Label htmlFor="rows-per-page">{t('rows_per_page')}</Label>
                    <Select value={String(pagination.itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                        <SelectTrigger id="rows-per-page" className="w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {[10, 20, 50, 100].map(size => (<SelectItem key={size} value={String(size)}>{size}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                    {t('pagination_info', { currentPage: pagination.currentPage, totalPages: pagination.totalPages, totalItems: pagination.totalItems })}
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination || pagination.currentPage <= 1}>{t('previous')}</Button>
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination || pagination.currentPage >= pagination.totalPages}>{t('next')}</Button>
                </div>
            </CardFooter>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{isEditMode ? t('user_form_edit_title') : t('user_form_add_title')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">{t('tableHeader_name')}</Label>
                                <Input id="name" value={formData.name} onChange={handleInputChange} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="username">{t('user_form_username')}</Label>
                                <Input id="username" value={formData.username} onChange={handleInputChange} required disabled={isEditMode} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">{t('tableHeader_email')}</Label>
                            <Input id="email" type="email" value={formData.email} onChange={handleInputChange} required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="password">{t('user_form_password')}</Label>
                            <Input id="password" type="password" onChange={handleInputChange} placeholder={isEditMode ? t('user_form_password_placeholder') : ""} required={!isEditMode} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('tableHeader_role')}</Label>
                                <Select value={formData.role} onValueChange={(value) => handleSelectChange('role', value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="EMPLOYEE">{t('user_form_role_employee')}</SelectItem>
                                        <SelectItem value="ADMIN">{t('user_form_role_admin')}</SelectItem>
                                        <SelectItem value="SUPER_ADMIN">{t('user_form_role_super_admin')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('user_form_status')}</Label>
                                <Select value={formData.accountStatus} onValueChange={(value) => handleSelectChange('accountStatus', value)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">{t('user_form_status_active')}</SelectItem>
                                        <SelectItem value="DISABLED">{t('user_form_status_disabled')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter><Button type="submit">{t('save')}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

             <AlertDialog open={!!userToToggleStatus} onOpenChange={(isOpen) => !isOpen && setUserToToggleStatus(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('user_alert_toggle_status_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                           {t('user_alert_toggle_status_description', { action: userToToggleStatus?.accountStatus === 'ACTIVE' ? t('user_disable') : t('user_enable') })} <strong>{userToToggleStatus?.name}</strong>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmToggleStatus}>{t('confirm')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!userToDelete} onOpenChange={(isOpen) => !isOpen && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('user_alert_delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                           {t('user_alert_delete_description')} <strong>{userToDelete?.name}</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete}>{t('user_delete')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
