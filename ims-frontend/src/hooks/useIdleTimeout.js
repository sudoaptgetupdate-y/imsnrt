// src/hooks/useIdleTimeout.js

import { useEffect, useRef } from 'react';

// รายการของ Event ที่เราจะถือว่าเป็นการ "ใช้งาน"
const userActivityEvents = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'
];

export function useIdleTimeout(onIdle, timeout = 600000) { // timeout เริ่มต้น 10 นาที
  const timer = useRef(null);

  // ฟังก์ชันสำหรับรีเซ็ต Timer
  const resetTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(onIdle, timeout);
  };

  useEffect(() => {
    // เริ่มจับเวลาเมื่อ component ถูก mount
    resetTimer();

    // เพิ่ม Event Listeners เพื่อจับการใช้งานของผู้ใช้
    userActivityEvents.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup function: จะทำงานเมื่อ component ถูก unmount
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      userActivityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [onIdle, timeout]); // Rerun effect ถ้า onIdle หรือ timeout เปลี่ยน

  return null;
}