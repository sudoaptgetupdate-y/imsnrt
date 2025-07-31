import useAuthStore from '@/store/authStore';
import { Navigate, Outlet } from 'react-router-dom';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function AdminProtectedRoute() {
    const { t } = useTranslation();
    const { user } = useAuthStore((state) => state);
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    useEffect(() => {
        if (!isAdmin) {
            toast.error("You do not have permission to access this page.");
        }
    }, [isAdmin, t]);

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}