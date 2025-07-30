// controllers/userController.js
const prisma = require('../prisma/client');
const { ItemType } = require('@prisma/client'); // <-- Keep this line
const bcrypt = require('bcryptjs');
const userController = {};

userController.getAllUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const searchTerm = req.query.search || '';
        const skip = (page - 1) * limit;

        const where = {
            ...(searchTerm && {
                OR: [
                    { name: { contains: searchTerm } },
                    { email: { contains: searchTerm } },
                    { username: { contains: searchTerm } }
                ]
            })
        };

        const [users, totalItems] = await Promise.all([
             prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    name: true,
                    role: true,
                    accountStatus: true,
                    createdAt: true,
                }
            }),
            prisma.user.count({ where })
        ]);
       
        res.status(200).json({
            data: users,
            pagination: {
                totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                itemsPerPage: limit
            }
        });
    } catch (error) {
        next(error);
    }
};

userController.getUserById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const userId = parseInt(id);
        if (isNaN(userId)) {
            const err = new Error('Invalid User ID.');
            err.statusCode = 400;
            throw err;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, username: true, email: true, role: true }
        });
        if (!user) {
            const err = new Error('User not found');
            err.statusCode = 404;
            throw err;
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

userController.createUser = async (req, res, next) => {
    const { email, password, name, role, username } = req.body;
    try {
        // --- START: Input Validation ---
        if (!email || !password || !name || !username) {
            const err = new Error('Email, password, name, and username are required.');
            err.statusCode = 400;
            return next(err);
        }
        if (password.length < 6) {
            const err = new Error('Password must be at least 6 characters long.');
            err.statusCode = 400;
            return next(err);
        }
        if (!['ADMIN', 'EMPLOYEE', 'SUPER_ADMIN'].includes(role)) {
            const err = new Error('Invalid role specified.');
            err.statusCode = 400;
            return next(err);
        }
        // --- END: Input Validation ---

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                name,
                role,
            }
        });
        const { password: _, ...userToReturn } = newUser;
        res.status(201).json(userToReturn);
    } catch (error) {
        next(error);
    }
};

userController.updateUser = async (req, res, next) => {
    const { id } = req.params;
    const { name, email, role, username } = req.body;
    try {
        const userId = parseInt(id);
        if (isNaN(userId)) {
            const err = new Error('Invalid User ID.');
            err.statusCode = 400;
            throw err;
        }

        // --- START: Input Validation ---
        if (role && !['ADMIN', 'EMPLOYEE', 'SUPER_ADMIN'].includes(role)) {
             const err = new Error('Invalid role specified.');
            err.statusCode = 400;
            return next(err);
        }
        // --- END: Input Validation ---

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { name, email, role, username },
        });
        const { password, ...userToReturn } = updatedUser;
        res.status(200).json(userToReturn);
    } catch (error) {
        next(error);
    }
};

userController.updateUserStatus = async (req, res, next) => {
    const { id } = req.params;
    const { accountStatus } = req.body;
    try {
        const userId = parseInt(id);
        if (isNaN(userId)) {
            const err = new Error('Invalid User ID.');
            err.statusCode = 400;
            throw err;
        }

        // --- START: Input Validation ---
        if (!['ACTIVE', 'DISABLED'].includes(accountStatus)) {
            const err = new Error('Invalid account status specified.');
            err.statusCode = 400;
            return next(err);
        }
        // --- END: Input Validation ---

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { accountStatus },
            select: { id: true, name: true, accountStatus: true }
        });
        res.status(200).json(updatedUser);
    } catch (error) {
        next(error);
    }
};

userController.deleteUser = async (req, res, next) => {
    const { id } = req.params;
    try {
        const userId = parseInt(id);
        if (isNaN(userId)) {
            const err = new Error('Invalid User ID.');
            err.statusCode = 400;
            throw err;
        }
        await prisma.user.delete({
            where: { id: userId }
        });
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

userController.updateMyProfile = async (req, res, next) => {
    const { id } = req.user;
    const { name, username, email } = req.body;

    if (!name || !username || !email) {
        return res.status(400).json({ error: 'Name, Username, and Email are required.' });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { name, username, email },
        });

        const { password, ...userToReturn } = updatedUser;
        res.status(200).json(userToReturn);
        
    } catch (error) {
        next(error);
    }
};

userController.changeMyPassword = async (req, res, next) => {
    const { id } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        const err = new Error('Please provide both current and new passwords.');
        err.statusCode = 400;
        return next(err);
    }
    if (newPassword.length < 6) {
        const err = new Error('New password must be at least 6 characters long.');
        err.statusCode = 400;
        return next(err);
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!user) {
            const err = new Error('User not found.');
            err.statusCode = 404;
            throw err;
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            const err = new Error('Invalid current password.');
            err.statusCode = 400;
            throw err;
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: parseInt(id) },
            data: { password: hashedPassword },
        });

        res.status(200).json({ message: 'Password changed successfully.' });

    } catch (error) {
        next(error);
    }
};

userController.getUserAssets = async (req, res, next) => {
    const { id: userId } = req.params;
    try {
        const id = parseInt(userId);
        if (isNaN(id)) {
            const err = new Error('Invalid User ID.');
            err.statusCode = 400;
            throw err;
        }
        const history = await prisma.assetAssignmentOnItems.findMany({
            where: { assignment: { assigneeId: id } },
            include: {
                inventoryItem: { include: { productModel: true } }
            },
            orderBy: { assignedAt: 'desc' }
        });
        res.status(200).json(history);
    } catch (error) {
        next(error);
    }
};

userController.getMyAssets = async (req, res, next) => {
    const { id: userId } = req.user;
    try {
        const assets = await prisma.inventoryItem.findMany({
            where: {
                itemType: ItemType.ASSET,
                assignmentRecords: {
                    some: {
                        assignment: { assigneeId: parseInt(userId) },
                        returnedAt: null
                    }
                }
            },
            include: {
                productModel: { include: { brand: true, category: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(assets);
    } catch (error) {
        next(error);
    }
};

userController.getUserAssetSummary = async (req, res, next) => {
    const { id: userId } = req.params;
    try {
        const id = parseInt(userId);
        if (isNaN(id)) {
            const err = new Error('Invalid User ID.');
            err.statusCode = 400;
            throw err;
        }
        
        const [currentlyAssigned, totalEverAssigned] = await Promise.all([
            prisma.assetAssignmentOnItems.count({
                where: { 
                    assignment: { assigneeId: id },
                    returnedAt: null
                }
            }),
            prisma.assetAssignmentOnItems.count({
                where: { assignment: { assigneeId: id } }
            })
        ]);

        res.status(200).json({
            currentlyAssigned,
            totalEverAssigned
        });
    } catch (error) {
        next(error);
    }
};

userController.getActiveAssetsForUser = async (req, res, next) => {
    const { id: userId } = req.params;
    try {
        const id = parseInt(userId);
        if (isNaN(id)) {
            const err = new Error('Invalid User ID.');
            err.statusCode = 400;
            throw err;
        }

        const activeAssets = await prisma.inventoryItem.findMany({
            where: {
                itemType: ItemType.ASSET,
                status: 'ASSIGNED',
                assignmentRecords: {
                    some: {
                        assignment: { assigneeId: id },
                        returnedAt: null
                    }
                }
            },
            include: {
                productModel: true,
                assignmentRecords: {
                    where: { returnedAt: null },
                    include: {
                        assignment: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const formattedAssets = activeAssets.map(asset => {
            const assignmentInfo = asset.assignmentRecords[0];
            return {
                ...asset,
                assignedDate: assignmentInfo?.assignedAt,
                assignmentId: assignmentInfo?.assignmentId
            };
        });

        res.status(200).json(formattedAssets);
    } catch (error) {
        next(error);
    }
};

module.exports = userController;