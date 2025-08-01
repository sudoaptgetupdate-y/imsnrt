// ims-backend/server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// --- START: Import middleware ใหม่ ---
const errorHandler = require('./middlewares/errorHandlerMiddleware');
// --- END: Import middleware ใหม่ ---

// --- START: Import routes ใหม่ ---
const addressRoute = require('./routes/addressRoute');
const repairRoute = require('./routes/repairRoute');
// --- END: Import routes ใหม่ ---

const historyRoute = require('./routes/historyRoute');
const assetAssignmentRoute = require('./routes/assetAssignmentRoute');
const assetRoute = require('./routes/assetRoute');
const categoryRoute = require('./routes/categoryRoute');
const customerRoute = require('./routes/customerRoute');
const authRoute = require('./routes/authRoute');
const productModelRoute = require('./routes/productModelRoute');
const inventoryRoute = require('./routes/inventoryRoute');
const brandRoute = require('./routes/brandRoute');
const saleRoute = require('./routes/saleRoute');
const dashboardRoute = require('./routes/dashboardRoute');
const reportRoute = require('./routes/reportRoute');
const userRoute = require('./routes/userRoute');
const borrowingRoute = require('./routes/borrowingRoute');
const supplierRoute = require('./routes/supplierRoute');
const companyProfileRoute = require('./routes/companyProfileRoute');
const exportRoute = require('./routes/exportRoute');


const app = express();

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// --- API Routes ---
app.use('/api/assets', assetRoute);
app.use('/api/inventory', inventoryRoute);
app.use('/api/history', historyRoute);
app.use('/api/asset-assignments', assetAssignmentRoute);
app.use('/api/categories', categoryRoute);
app.use('/api/customers', customerRoute);
app.use('/api/auth', authRoute);
app.use('/api/product-models', productModelRoute);
app.use('/api/brands', brandRoute);
app.use('/api/sales', saleRoute);
app.use('/api/dashboard', dashboardRoute);
app.use('/api/reports', reportRoute);
app.use('/api/users', userRoute);
app.use('/api/borrowings', borrowingRoute);
app.use('/api/addresses', addressRoute);
app.use('/api/repairs', repairRoute);
app.use('/api/suppliers', supplierRoute);
app.use('/api/company-profile', companyProfileRoute);
app.use('/api/export', exportRoute);

app.use(errorHandler);



const port = process.env.PORT || 5001;
app.listen(port, () => console.log(`Server is running on port ${port}`));