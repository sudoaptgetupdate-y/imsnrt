// src/components/auth/DashboardRedirect.jsx
import useAuthStore from "@/store/authStore";
import AdminDashboardPage from "@/pages/DashboardPage";
import EmployeeDashboardPage from "@/pages/EmployeeDashboardPage";

const DashboardRedirect = () => {
    const currentUser = useAuthStore((state) => state.user);
    
    // ตรวจสอบ Role แล้วเลือกแสดง Component ที่เหมาะสม
    if (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN') {
        return <AdminDashboardPage />;
    }

    return <EmployeeDashboardPage />;
};

export default DashboardRedirect;