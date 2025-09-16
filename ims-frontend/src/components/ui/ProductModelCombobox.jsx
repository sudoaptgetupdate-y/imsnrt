// src/components/ui/ProductModelCombobox.jsx

import { useState, useEffect, useCallback, useRef } from "react";
import axiosInstance from '@/api/axiosInstance';
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
import useAuthStore from "@/store/authStore";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

export function ProductModelCombobox({ onSelect, initialModel }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedModelDisplay, setSelectedModelDisplay] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSearching, setIsSearching] = useState(false); 

  const token = useAuthStore((state) => state.token);
  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    if (initialModel) {
      setSelectedModelDisplay(initialModel);
      if (!results.some(r => r.id === initialModel.id)) {
           setResults(prev => [initialModel, ...prev.filter(p => p.id !== initialModel.id)]);
      }
    } else {
      setSelectedModelDisplay(null);
    }
    // (เราเอา results ออกจาก dependency array นี้ เพื่อป้องกันการ reset ค่าโดยไม่จำเป็น)
  }, [initialModel]);


  // --- START: MODIFIED (แก้ไขจุดนี้) ---
  const fetchModels = useCallback(async (pageNum, isSearchChange = false) => {
    if (isSearchChange) {
      setIsSearching(true); 
    } else {
      setIsLoading(true); 
    }

    try {
      const response = await axiosInstance.get("/product-models", {
        headers: { Authorization: `Bearer ${token}` },
        params: { 
            search: debouncedSearch, 
            limit: 20,
            page: pageNum 
        },
      });
      
      const { data, totalPages: newTotalPages } = response.data;

      setResults(prev => isSearchChange ? data : [...prev, ...data]);
      setPage(pageNum);
      setTotalPages(newTotalPages);

    } catch (error) {
      toast.error(t('error_fetch_models'));
      // (เพิ่มการเคลียร์ค่าตอน Error ด้วย functional update)
      setResults(prev => isSearchChange ? [] : prev); 
    } finally {
       setIsSearching(false);
       setIsLoading(false);
    }
  }, [debouncedSearch, token, t]); // <-- *** แก้ไข: เอา 'results' ออกจาก array นี้ ***
  // --- END: MODIFIED ---


  useEffect(() => {
    if (open) {
      fetchModels(1, true);
    } else {
      // Reset state เมื่อปิด
      setSearchQuery("");
      // (เมื่อปิด ให้ใช้ค่า initialModel เป็นค่าเริ่มต้นใน list เสมอ)
      setResults(initialModel ? [initialModel] : []); 
      setPage(1);
      setTotalPages(1);
    }
    // (เราเอา fetchModels และ initialModel ออก เพื่อให้ useEffect นี้ทำงานเฉพาะตอน open/close)
    // (ตรรกะการ fetch เมื่อ search เปลี่ยน ถูกจัดการโดย debouncedSearch ที่เป็น dependency ของ fetchModels แล้ว)
  }, [open]); 
  
  // (แยก useEffect สำหรับการค้นหาโดยเฉพาะ)
  useEffect(() => {
    if (open) {
        fetchModels(1, true);
    }
  }, [debouncedSearch, fetchModels, open]);


  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    
    if (scrollHeight - scrollTop - clientHeight < 50 && !isLoading && page < totalPages) {
      fetchModels(page + 1);
    }
  };


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
        >
          <span className="truncate">
            {selectedModelDisplay ? selectedModelDisplay.modelNumber : t('select_product_model')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('product_model_search_placeholder')}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList onScroll={handleScroll}>
            {isSearching && <div className="p-2 text-sm text-center">{t('loading')}</div>}
            
            {!isSearching && results.length === 0 && <CommandEmpty>{t('no_product_model_found')}</CommandEmpty>}

            <CommandGroup>
              {results.map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.modelNumber} 
                  onSelect={(currentValue) => {
                    const selected = results.find(r => 
                        r.modelNumber.toLowerCase() === currentValue.toLowerCase()
                    );
                    onSelect(selected || model); 
                    setSelectedModelDisplay(selected || model);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedModelDisplay?.id === model.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{model.category.name} - {model.brand.name} - {model.modelNumber}</span>
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