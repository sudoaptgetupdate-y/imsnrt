// src/components/ui/BrandCombobox.jsx

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

export function BrandCombobox({ selectedValue, onSelect, initialBrand }) {
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
  
  const [selectedBrandDisplay, setSelectedBrandDisplay] = useState(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (initialBrand) {
      setSelectedBrandDisplay(initialBrand);
      // ตรวจสอบว่า initialBrand อยู่ใน list แล้วหรือยัง
      if (!searchResults.some(r => r.id === initialBrand.id)) {
           setSearchResults(prev => [initialBrand, ...prev.filter(p => p.id !== initialBrand.id)]);
      }
    } else {
        setSelectedBrandDisplay(null);
    }
  }, [initialBrand]); // (ปรับ dependency)


  // (4) สร้าง fetchBrands ใหม่
  const fetchBrands = useCallback(async (pageNum, isSearchChange = false) => {
    if (isSearchChange) {
      setIsSearching(true);
    } else {
      setIsLoading(true); // ใช้ isLoading สำหรับการโหลดหน้าถัดไป
    }
    
    try {
      const response = await axiosInstance.get("/brands", {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
            search: debouncedSearchQuery, 
            limit: 20, // (3) เปลี่ยน limit เป็น 20
            page: pageNum
        },
      });

      const { data, totalPages: newTotalPages } = response.data;
      
      // ถ้าเป็นการ search ใหม่ ให้แทนที่ข้อมูลเดิม, ถ้าเป็นการ scroll ให้ต่อท้าย
      setSearchResults(prev => isSearchChange ? data : [...prev, ...data]);
      setPage(pageNum);
      setTotalPages(newTotalPages);

    } catch (error) {
      toast.error(t('error_fetch_brands', 'Failed to search for brands.'));
      setSearchResults(prev => isSearchChange ? [] : prev);
    } finally {
      setIsSearching(false);
      setIsLoading(false);
    }
  }, [debouncedSearchQuery, token, t]);
  

  // (5) แยก useEffect สำหรับการเปิด/ปิด
  useEffect(() => {
    if (open) {
      // ไม่ต้อง fetch ทันที (รอ effect ของ search)
    } else {
      // Reset state เมื่อปิด
      setSearchQuery("");
      setSearchResults(initialBrand ? [initialBrand] : []);
      setPage(1);
      setTotalPages(1);
    }
  }, [open, initialBrand]);

  // (5) แยก useEffect สำหรับการ Search
  useEffect(() => {
    if (open) {
        fetchBrands(1, true); // fetch หน้า 1 และตั้งค่าเป็น search ใหม่
    }
  }, [debouncedSearchQuery, open, fetchBrands]);
  
  // (5) useEffect สำหรับ sync selectedValue (เหมือนใน SupplierCombobox)
  useEffect(() => {
    if (selectedValue) {
        const brand = searchResults.find(b => String(b.id) === String(selectedValue));
        if(brand) {
            setSelectedBrandDisplay(brand);
        } else if (initialBrand && String(initialBrand.id) === String(selectedValue)) {
            setSelectedBrandDisplay(initialBrand);
        }
    } else {
        setSelectedBrandDisplay(null);
    }
  }, [selectedValue, searchResults, initialBrand]);


  // (6) เพิ่ม handleScroll
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // ถ้า scroll เกือบถึงล่างสุด, ยังไม่ loading, และยังมีหน้าต่อไป
    if (scrollHeight - scrollTop - clientHeight < 50 && !isLoading && page < totalPages) {
      fetchBrands(page + 1); // โหลดหน้าถัดไป
    }
  };


  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <span className="truncate">
            {selectedBrandDisplay // (ใช้ state ที่ sync แล้ว)
              ? selectedBrandDisplay.name
              : t('select_brand')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" onWheelCapture={(e) => e.stopPropagation()} onTouchMoveCapture={(e) => e.stopPropagation()}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('brand_search_placeholder')}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          {/* (7) เพิ่ม onScroll และ loading states */}
          <CommandList onScroll={handleScroll} onWheelCapture={(e) => e.stopPropagation()} onTouchMoveCapture={(e) => e.stopPropagation()}>
            {isSearching && <div className="p-2 text-center text-sm">{t('loading')}</div>}
            
            {!isSearching && searchResults.length === 0 && <CommandEmpty>{t('no_brand_found', 'No brand found.')}</CommandEmpty>}
            
            <CommandGroup>
              {searchResults.map((brand) => (
                <CommandItem
                  key={brand.id}
                  value={String(brand.name)} // (7) ใช้ name สำหรับการค้นหาของ cmdk
                  onSelect={(currentValue) => {
                     // (7) ค้นหา item ที่ถูกเลือกจาก name
                     const selected = searchResults.find(b => 
                        b.name.toLowerCase() === currentValue.toLowerCase()
                     );
                     // (7) ส่ง ID กลับไป (ตาม contract เดิมของ component นี้)
                     if (selected) {
                        onSelect(String(selected.id));
                        setSelectedBrandDisplay(selected);
                     } else {
                        // Fallback (เผื่อกรณีที่ไม่พบ)
                        onSelect(String(brand.id));
                        setSelectedBrandDisplay(brand);
                     }
                     setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      // (7) การเปรียบเทียบยังคงใช้ ID
                      selectedValue === String(brand.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {brand.name}
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