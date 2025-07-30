// src/hooks/usePaginatedFetch.js

import { useState, useEffect, useCallback } from "react";
import useAuthStore from "@/store/authStore";
import { toast } from "sonner";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "@/api/axiosInstance";

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
}

export function usePaginatedFetch(apiPath, initialItemsPerPage = 10, defaultFilters = {}, excludeIds = []) {
    const token = useAuthStore((state) => state.token);
    const location = useLocation();
    const navigate = useNavigate();

    // --- START: แก้ไขส่วนนี้ใหม่ทั้งหมดเพื่อป้องกัน Bug ---
    const getInitialFilters = useCallback((locState) => {
        const locationState = locState || {};
        // Use JSON.stringify to create a stable dependency for useCallback
        return locationState.status ? { ...defaultFilters, status: locationState.status } : defaultFilters;
    }, [JSON.stringify(defaultFilters)]);

    const [filters, setFilters] = useState(() => getInitialFilters(location.state));

    // This effect should ONLY run when the location state itself changes.
    useEffect(() => {
        const newFilters = getInitialFilters(location.state);
        if (JSON.stringify(newFilters) !== JSON.stringify(filters)) {
            setFilters(newFilters);
            setPagination(p => ({ ...p, currentPage: 1 }));
        }
    }, [location.state, getInitialFilters]);
    // --- END: จบส่วนแก้ไข ---

    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: initialItemsPerPage
    });
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const [sortBy, setSortBy] = useState('updatedAt');
    const [sortOrder, setSortOrder] = useState('desc');

    const fetchData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const params = {
                page: pagination.currentPage,
                limit: pagination.itemsPerPage,
                search: debouncedSearchTerm,
                ...filters,
                sortBy,
                sortOrder,
                // --- START: เพิ่ม excludeIds เข้าไปใน params ---
                excludeIds: excludeIds.join(','),
                // --- END ---
            };
            
            const response = await axiosInstance.get(apiPath, {
                headers: { Authorization: `Bearer ${token}` },
                params,
            });

            setData(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            toast.error(`Failed to fetch data from ${apiPath}`);
        } finally {
            setIsLoading(false);
        }
    }, [token, apiPath, pagination.currentPage, pagination.itemsPerPage, debouncedSearchTerm, JSON.stringify(filters), sortBy, sortOrder, JSON.stringify(excludeIds)]); // <-- เพิ่ม excludeIds ใน dependency array

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSortChange = (newSortBy) => {
        setSortBy(newSortBy);
        setSortOrder(prevOrder => (sortBy === newSortBy && prevOrder === 'asc' ? 'desc' : 'asc'));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };
    
    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, currentPage: newPage }));
    };

    const handleItemsPerPageChange = (newSize) => {
        setPagination({
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            itemsPerPage: parseInt(newSize, 10)
        });
    };
    
    const handleFilterChange = (filterName, value) => {
        // Clear location state if user manually changes a filter
        if (location.state?.status) {
            navigate(location.pathname, { replace: true, state: {} });
        }
        setFilters(prev => ({ ...prev, [filterName]: value }));
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    };

    return {
        data,
        pagination,
        isLoading,
        searchTerm,
        filters,
        sortBy,
        sortOrder,
        handleSearchChange,
        handlePageChange,
        handleItemsPerPageChange,
        handleFilterChange,
        handleSortChange,
        refreshData: fetchData
    };
}