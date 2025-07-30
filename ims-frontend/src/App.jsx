import { Outlet } from "react-router-dom";
import { Toaster } from "sonner"; // ตรวจสอบว่า import มาจาก "sonner" ถูกต้อง

function App() {
  return (
    <>
      {/* Toaster ต้องถูก render ไว้ที่นี่เพื่อให้ toast แสดงผลได้ */}
      <Toaster position="top-center" richColors />

      <main>
        <Outlet />
      </main>
    </>
  );
}

export default App;