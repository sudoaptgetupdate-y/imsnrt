// src/api/axiosInstance.js
import axios from 'axios';
import useAuthStore from '@/store/authStore'; // 1. Import authStore เข้ามา

const axiosInstance = axios.create({
  baseURL: '/api',
});

// 2. เพิ่ม Interceptor เพื่อดักจับ Response
axiosInstance.interceptors.response.use(
  // กรณีที่ Response สำเร็จ ก็ให้ทำงานต่อไปตามปกติ
  (response) => response,
  // กรณีที่เกิด Error
  (error) => {
    // ตรวจสอบว่าเป็น Error 401 (Unauthorized) หรือไม่
    if (error.response && error.response.status === 401) {
      // ดึงฟังก์ชัน logout จาก store
      // ใช้ .getState() เพราะเราอยู่นอก React component
      const { logout } = useAuthStore.getState();
      
      // เรียกใช้ logout เพื่อล้าง token และ user data
      logout();
      
      // บังคับให้ reload และไปที่หน้า login
      window.location.href = '/login';
    }
    
    // ส่งต่อ error ไปให้ .catch() ทำงานต่อ (เช่น แสดง toast)
    return Promise.reject(error);
  }
);

export default axiosInstance;