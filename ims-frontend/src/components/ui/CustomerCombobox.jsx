// src/components/ui/CustomerCombobox.jsx

import { useState, useEffect, useCallback } from "react"; // (1) เพิ่ม useCallback
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"; // (1) เพิ่ม Loader2
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "react-i18next";

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

export function CustomerCombobox({ selectedValue, onSelect, initialCustomer }) {
  const { t } = useTranslation();
  const token = useAuthStore((state) => state.token);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  
  // (2) เพิ่ม States สำหรับ Pagination
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedCustomerDisplay, setSelectedCustomerDisplay] = useState(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // (5) ปรับปรุง useEffect นี้ให้เหมือน SupplierCombobox
  useEffect(() => {
    if (initialCustomer) {
      setSelectedCustomerDisplay(initialCustomer);
      if (!searchResults.some(r => r.id === initialCustomer.id)) {
           setSearchResults(prev => [initialCustomer, ...prev.filter(p => p.id !== initialCustomer.id)]);
      }
    } else {
        setSelectedCustomerDisplay(null);
    }
  }, [initialCustomer]);


  // (4) สร้าง fetchCustomers ใหม่
  const fetchCustomers = useCallback(async (pageNum, isSearchChange = false) => {
    if (isSearchChange) {
      setIsSearching(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const response = await axiosInstance.get("/customers", { // <-- Endpoint
        headers: { Authorization: `Bearer ${token}` },
        params: { 
            search: debouncedSearchQuery, 
            limit: 20, // (3) เปลี่ยน limit เป็น 20
            page: pageNum
        },
      });

      const { data, totalPages: newTotalPages } = response.data;
      
      setSearchResults(prev => isSearchChange ? data : [...prev, ...data]);
      setPage(pageNum);
      setTotalPages(newTotalPages);

    } catch (error) {
      toast.error(t('error_fetch_customers', 'Failed to search for customers.'));
      setSearchResults(prev => isSearchChange ? [] : prev);
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  }, [debouncedSearchQuery, token, t]);
  

  // (5) แยก useEffect สำหรับการเปิด/ปิด
  useEffect(() => {
    if (open) {
      // (ไม่ต้อง fetch ที่นี่)
    } else {
      setSearchQuery("");
      setSearchResults(initialCustomer ? [initialCustomer] : []);
      setPage(1);
      setTotalPages(1);
    }
  }, [open, initialCustomer]);

  // (5) แยก useEffect สำหรับการ Search
  useEffect(() => {
    if (open) {
        fetchCustomers(1, true);
    }
  }, [debouncedSearchQuery, open, fetchCustomers]);
  
  // (5) useEffect สำหรับ sync selectedValue (ใช้ pattern ที่สมบูรณ์)
  useEffect(() => {
    if (selectedValue) {
        const customer = searchResults.find(c => String(c.id) === String(selectedValue));
        if(customer) {
            setSelectedCustomerDisplay(customer);
        } else if (initialCustomer && String(initialCustomer.id) === String(selectedValue)) {
            setSelectedCustomerDisplay(initialCustomer);
        }
    } else {
        setSelectedCustomerDisplay(null);
    }
  }, [selectedValue, searchResults, initialCustomer]);


  // (6) เพิ่ม handleScroll
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 50 && !isLoading && page < totalPages) {
      fetchCustomers(page + 1);
    }
  };


  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <span className="truncate">
            {selectedCustomerDisplay
              ? selectedCustomerDisplay.name
              : t('select_customer')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" onWheelCapture={(e) => e.stopPropagation()} onTouchMoveCapture={(e) => e.stopPropagation()}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('customer_search_placeholder')}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          {/* (7) เพิ่ม onScroll และ loading states */}
          <CommandList onScroll={handleScroll} onWheelCapture={(e) => e.stopPropagation()} onTouchMoveCapture={(e) => e.stopPropagation()}>
            {isSearching && <div className="p-2 text-center text-sm">{t('loading')}</div>}
            
            {!isSearching && searchResults.length === 0 && <CommandEmpty>{t('no_customer_found', 'No customer found.')}</CommandEmpty>}
            
            <CommandGroup>
              {searchResults.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={String(customer.name)} // (7) ใช้ name
                  onSelect={(currentValue) => {
                     const selected = searchResults.find(c => 
                        c.name.toLowerCase() === currentValue.toLowerCase()
                     );
                     
                     if (selected) {
                        onSelect(String(selected.id)); // (7) ส่ง ID กลับ
                        setSelectedCustomerDisplay(selected);
                     } else {
                        onSelect(String(customer.id));
                        setSelectedCustomerDisplay(customer);
                     }
                     setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === String(customer.id) ? "opacity-100" : "opacity-0" // (7) เปรียบเทียบด้วย ID
                    )}
                  />
                  {customer.name}
                </CommandItem>
              ))}
            </CommandGroup>

            {/* (8) เพิ่มตัว Loading "loading more" */}
            {isLoading && (
                 <div className="flex items-center justify-center p-2 text-xs text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('loading_more', 'Loading more...')}
                </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}