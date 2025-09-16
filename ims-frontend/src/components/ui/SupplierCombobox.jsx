// src/components/ui/SupplierCombobox.jsx

import { useState, useEffect, useCallback, useRef } from "react"; 
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"; 
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

export function SupplierCombobox({ selectedValue, onSelect, initialSupplier }) {
  const { t } = useTranslation();
  const token = useAuthStore((state) => state.token);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedSupplierDisplay, setSelectedSupplierDisplay] = useState(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (initialSupplier) {
      setSelectedSupplierDisplay(initialSupplier);
       if (!searchResults.some(r => r.id === initialSupplier.id)) {
           setSearchResults(prev => [initialSupplier, ...prev.filter(p => p.id !== initialSupplier.id)]);
      }
    } else {
      setSelectedSupplierDisplay(null);
    }
  }, [initialSupplier]);

  
  // --- START: MODIFIED (แก้ไขจุดนี้) ---
  const fetchSuppliers = useCallback(async (pageNum, isSearchChange = false) => {
    if (isSearchChange) {
      setIsSearching(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const response = await axiosInstance.get("/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
            search: debouncedSearchQuery, 
            limit: 20, 
            page: pageNum
        },
      });

      const { data, totalPages: newTotalPages } = response.data;
      
      setSearchResults(prev => isSearchChange ? data : [...prev, ...data]);
      setPage(pageNum);
      setTotalPages(newTotalPages);

    } catch (error) {
      toast.error(t('error_fetch_suppliers'));
      // (เพิ่มการเคลียร์ค่าตอน Error ด้วย functional update)
      setSearchResults(prev => isSearchChange ? [] : prev);
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  }, [debouncedSearchQuery, token, t]); // <-- (ไฟล์นี้ไม่มี 'searchResults' อยู่แล้ว ซึ่งถูกต้อง)
  // --- END: MODIFIED ---
  

  // (แยก useEffect สำหรับการเปิด/ปิด)
  useEffect(() => {
    if (open) {
      // (ไม่ต้อง fetch ที่นี่)
    } else {
      setSearchQuery("");
      setSearchResults(initialSupplier ? [initialSupplier] : []);
      setPage(1);
      setTotalPages(1);
    }
  }, [open, initialSupplier]);

  // (แยก useEffect สำหรับการค้นหา)
  useEffect(() => {
    if (open) {
        fetchSuppliers(1, true);
    }
    // (เราต้องการให้ fetch ใหม่ทุกครั้งที่ debouncedSearchQuery เปลี่ยน)
  }, [debouncedSearchQuery, open, fetchSuppliers]);


  // (useEffect ตัวนี้คงเดิม เพื่อซิงค์ selectedValue กับ display)
  useEffect(() => {
    if (selectedValue) {
        const supplier = searchResults.find(s => String(s.id) === String(selectedValue));
        if(supplier) {
            setSelectedSupplierDisplay(supplier);
        } else if (initialSupplier && String(initialSupplier.id) === String(selectedValue)) {
            setSelectedSupplierDisplay(initialSupplier);
        }
    } else {
        setSelectedSupplierDisplay(null);
    }
  }, [selectedValue, searchResults, initialSupplier]);


  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 50 && !isLoading && page < totalPages) {
      fetchSuppliers(page + 1);
    }
  };


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <span className="truncate">
            {selectedSupplierDisplay
              ? selectedSupplierDisplay.name
              : t('select_supplier')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('supplier_search_placeholder')}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList onScroll={handleScroll}>
            {isSearching && <div className="p-2 text-center text-sm">{t('loading')}</div>}
            
            {!isSearching && searchResults.length === 0 && <CommandEmpty>{t('no_supplier_found')}</CommandEmpty>}
            
            <CommandGroup>
              {searchResults.map((supplier) => (
                <CommandItem
                  key={supplier.id}
                  value={String(supplier.name)} // (ใช้ Name ในการค้นหาของ CMDK)
                  onSelect={(currentValue) => {
                     const selected = searchResults.find(s => 
                        s.name.toLowerCase() === currentValue.toLowerCase()
                     );
                     onSelect(selected || supplier); 
                     setSelectedSupplierDisplay(selected || supplier);
                     setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      String(selectedValue) === String(supplier.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {supplier.name}
                </CommandItem>
              ))}
            </CommandGroup>

            {isLoading && (
                 <div className="flex items-center justify-center p-2 text-xs text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('loading_more')}
                </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}