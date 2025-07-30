// ims-backend/controllers/companyProfileController.js
const prisma = require('../prisma/client');

const getProfile = async (req, res, next) => {
    try {
        // ใช้ upsert เพื่อให้การทำงานเป็น atomic (ทำในขั้นตอนเดียว)
        const profile = await prisma.companyProfile.upsert({
            where: { id: 1 },
            // ข้อมูลที่จะใช้ update หากเจอ record ที่มี id: 1
            update: {}, 
            // ข้อมูลที่จะใช้ create หากไม่เจอ record ที่มี id: 1
            create: {
                id: 1,
                name: 'Your Company Name',
                addressLine1: '123 Your Street, Your City',
                addressLine2: 'Your Province, Postal Code',
                phone: 'Your Phone Number',
                taxId: 'Your Tax ID'
            },
        });
        res.status(200).json(profile);
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const profileData = req.body;
        const updatedProfile = await prisma.companyProfile.upsert({
            where: { id: 1 },
            update: profileData,
            create: { id: 1, ...profileData },
        });
        res.status(200).json(updatedProfile);
    } catch (error) {
        next(error);
    }
};

module.exports = { getProfile, updateProfile };