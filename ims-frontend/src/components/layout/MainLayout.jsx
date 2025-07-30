// src/components/layout/MainLayout.jsx

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
    LogOut, Menu, User, ArrowRightLeft, Building2, 
    ShoppingCart, Settings, Package, Boxes, Tag, Users as UsersIcon, 
    HardDrive, Layers, Wrench, BookUser, Truck, Building, BarChart2
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useAuthStore from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { toast } from 'sonner';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';


const Footer = () => {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="bg-white border-t mt-auto no-print hidden md:flex">
            <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                <div className="flex justify-center items-center text-sm text-muted-foreground">
                    <p>
                        &copy; {currentYear} Inventory Management System by the Engineering Team of NTPLC, Nakhon Si Thammarat. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

const NavItem = ({ to, icon, text, isCollapsed, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) => cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-colors relative font-medium",
            "text-slate-600 hover:bg-slate-200 hover:text-slate-900",
            isCollapsed && "justify-center",
            isActive && "bg-blue-100 text-blue-700"
        )}
    >
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    {icon}
                </TooltipTrigger>
                {isCollapsed && (
                    <TooltipContent side="right">
                        <p>{text}</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>

        <span className={cn(
            "whitespace-nowrap transition-opacity duration-200",
            isCollapsed ? "opacity-0 hidden" : "opacity-100"
        )}>
            {text}
        </span>
    </NavLink>
);


const MainLayout = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const logout = useAuthStore((state) => state.logout);
    const currentUser = useAuthStore((state) => state.user);
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const navRef = useRef(null);
    const scrollPos = useRef(null);

    // --- START: โค้ดส่วนจัดการ Idle Timeout ---
    const handleIdle = useCallback(() => {
        console.log("handleIdle function called. Logging out...");
        toast.warning("You have been logged out due to inactivity.");
        logout();
        navigate('/login');
    }, [navigate, logout]);

    // ตั้งเวลา 10 นาที (10 * 60 * 1000 = 600000 ms)
    // หากต้องการทดสอบ ให้เปลี่ยนเป็น 60000 (1 นาที)
    useIdleTimeout(handleIdle, 600000); 
    // --- END: โค้ดส่วนจัดการ Idle Timeout ---

    const handleNavLinkClick = () => {
        if (navRef.current) {
            scrollPos.current = navRef.current.scrollTop;
        }
    };
    
    useEffect(() => {
        if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false);
        }
    }, [location.pathname]);

    useLayoutEffect(() => {
        if (navRef.current) {
            navRef.current.scrollTop = scrollPos.current;
        }
    });


    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full relative">
            <Link to="/dashboard" className="p-4 border-b flex items-center gap-3 h-[65px] hover:bg-muted/50 transition-colors">
                <div className="bg-primary p-2 rounded-lg">
                    <Layers className="text-primary-foreground" size={24}/>
                </div>
                <h1 className={cn("text-lg font-bold text-slate-800 transition-all whitespace-nowrap", isSidebarCollapsed && "opacity-0 hidden")}>
                    Engineer IMS
                </h1>
            </Link>
            
            <nav ref={navRef} className="sidebar-nav h-[calc(100vh-65px)] px-3 py-4 space-y-1.5 overflow-y-auto">
                 <NavItem to="/dashboard" icon={<Boxes size={18} />} text={t('dashboard')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                <NavItem to="/reports/sales" icon={<BarChart2 size={18}/>} text="Reports" isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                <div>
                    <p className={cn("px-3 mt-4 mb-2 text-slate-400 text-xs font-semibold uppercase tracking-wider", isSidebarCollapsed && "text-center")}>
                        {isSidebarCollapsed ? 'T' : 'Transactions'}
                    </p>
                    <div className="space-y-1">
                        <NavItem to="/sales" icon={<ShoppingCart size={18}/>} text={t('sales')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                        <NavItem to="/borrowings" icon={<ArrowRightLeft size={18}/>} text={t('borrowing')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                        <NavItem to="/asset-assignments" icon={<HardDrive size={18}/>} text={t('assignments')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                        <NavItem to="/repairs" icon={<Wrench size={18}/>} text={t('repairOrders')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                    </div>
                </div>

                <div>
                    <p className={cn("px-3 mt-4 mb-2 text-slate-400 text-xs font-semibold uppercase tracking-wider", isSidebarCollapsed && "text-center")}>
                         {isSidebarCollapsed ? 'M' : 'Master Data'}
                    </p>
                     <div className="space-y-1">
                        <NavItem to="/inventory" icon={<Package size={18}/>} text={t('inventory')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                        <NavItem to="/assets" icon={<Layers size={18}/>} text={t('assetList')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                        <NavItem to="/product-models" icon={<Boxes size={18}/>} text={t('models')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                        <NavItem to="/brands" icon={<Building2 size={18}/>} text={t('brands')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                        <NavItem to="/categories" icon={<Tag size={18}/>} text={t('categories')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                        <NavItem to="/customers" icon={<UsersIcon size={18}/>} text={t('customers')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                        <NavItem to="/suppliers" icon={<Truck size={18}/>} text={t('suppliers')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                        <NavItem to="/addresses" icon={<BookUser size={18}/>} text={t('addressBook')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                    </div>
                </div>

                {isSuperAdmin && (
                     <div className="pt-2">
                        <p className={cn("px-3 mt-4 mb-2 text-slate-400 text-xs font-semibold uppercase tracking-wider", isSidebarCollapsed && "text-center")}>
                            {isSidebarCollapsed ? t('system').charAt(0) : t('system')}
                        </p>
                        <div className="space-y-1">
                            <NavItem to="/users" icon={<Settings size={18}/>} text={t('userManagement')} isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                            <NavItem to="/company-profile" icon={<Building size={18}/>} text="Company Profile" isCollapsed={isSidebarCollapsed} onClick={handleNavLinkClick} />
                        </div>
                    </div>
                )}
            </nav>
        </div>
    );

    return (
        <div className="relative min-h-screen md:flex bg-slate-50">
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-20 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            <aside
                className={cn(
                    "bg-white border-r",
                    "fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out",
                    "md:relative md:translate-x-0",
                    "transition-all duration-300 ease-in-out", 
                    isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full",
                    isSidebarCollapsed ? "md:w-20" : "md:w-64"
                )}
            >
                <SidebarContent />
            </aside>
            
            <div className="flex-1 flex flex-col max-h-screen font-sarabun">
                <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b flex justify-between items-center px-4 h-[65px]">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                            <Menu className="h-6 w-6" />
                        </Button>
                        <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
                            <Menu className="h-6 w-6" />
                        </Button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <LanguageToggle />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2 h-10 px-3">
                                    <User className="h-5 w-5 text-muted-foreground" />
                                    <span className="hidden sm:inline-block font-medium">{currentUser?.name}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{currentUser?.name}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{currentUser?.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate('/profile')}>
                                    <User className="mr-2 h-4 w-4" />
                                    <span>{t('profile_details')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Logout</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 15 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
                
                <Footer />

            </div>
        </div>
    );
};

export default MainLayout;