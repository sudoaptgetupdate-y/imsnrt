// ims-backend/prisma/client.js
const { PrismaClient } = require('@prisma/client');

// ประกาศตัวแปร global สำหรับเก็บ instance ของ Prisma
const globalForPrisma = globalThis || {};

// ตรวจสอบว่ามี instance ของ Prisma อยู่ใน global หรือยัง
// ถ้ายังไม่มี ให้สร้างใหม่, ถ้ามีแล้ว ให้ใช้ตัวเดิม
const prisma = globalForPrisma.prisma || new PrismaClient();

// ถ้าเราไม่ได้อยู่ในโหมด Production, ให้เก็บ instance ไว้ใน global
// เพื่อป้องกันการสร้าง instance ใหม่ซ้ำๆ ในระหว่างการพัฒนา (Hot Reload)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;