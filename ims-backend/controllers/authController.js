// controllers/authController.js
const prisma = require('../prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res, next) => {
    try {
        const { email, password, name, username } = req.body;

        // --- Input Validation ---
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

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                name,
                password: hashedPassword,
            },
        });
        const userToReturn = { ...newUser };
        delete userToReturn.password;
        res.status(201).json(userToReturn);
    } catch (error) {
        next(error); // ส่งต่อ error ไปยัง Middleware
    }
};

exports.login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            const err = new Error('Username and password are required.');
            err.statusCode = 400;
            return next(err);
        }

        const user = await prisma.user.findUnique({
            where: { username },
        });

        if (!user) {
            const err = new Error('Invalid credentials');
            err.statusCode = 400;
            return next(err);
        }
        
        if (user.accountStatus !== 'ACTIVE') {
            const err = new Error('This account has been disabled.');
            err.statusCode = 403;
            return next(err);
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            const err = new Error('Invalid credentials');
            err.statusCode = 400;
            return next(err);
        }

        const payload = {
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                email: user.email,
            },
        };

        const token = jwt.sign(
            payload,
            process.env.SECRET,
            { expiresIn: '1d' }
        );
        
        res.status(200).json({
            message: 'Login successful',
            token,
            user: payload.user
        });

    } catch (error) {
        next(error); // ส่งต่อ error ไปยัง Middleware
    }
};