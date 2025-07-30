import useAuthStore from '@/store/authStore';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
    const token = useAuthStore((state) => state.token);

    // ถ้ามี Token, ให้แสดง Component ลูก (ผ่าน Outlet)
    // ถ้าไม่มี, ให้ส่งกลับไปหน้า Login
    return token ? <Outlet /> : <Navigate to="/login" replace />;
}