import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'; // 1. Import persist เข้ามา

const useAuthStore = create(
    // 2. นำ persist มาครอบ store ของเรา
    persist(
        (set) => ({
            token: null,
            user: null,
            login: (token, user) => set({ token, user }),
            // 3. เพิ่มฟังก์ชัน logout สำหรับล้างข้อมูล
            logout: () => set({ token: null, user: null }),
        }),
        {
            name: 'auth-storage', // นี่คือชื่อ key ที่จะใช้ใน localStorage
            storage: createJSONStorage(() => localStorage), // กำหนดให้ใช้ localStorage ในการเก็บข้อมูล
        }
    )
);

export default useAuthStore;