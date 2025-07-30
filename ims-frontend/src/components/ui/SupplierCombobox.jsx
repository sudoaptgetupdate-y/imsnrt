// src/components/ui/SupplierCombobox.jsx

import { useState, useEffect } from "react";
import axiosInstance from '@/api/axiosInstance';
import useAuthStore from "@/store/authStore";
import { toast } from "sonner";
import { Check, ChevronsUpDown } from "lucide-react";
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
  const [selectedSupplierDisplay, setSelectedSupplierDisplay] = useState(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (initialSupplier) {
      setSelectedSupplierDisplay(initialSupplier);
      if(!searchQuery){
        setSearchResults([initialSupplier]);
      }
    }
  }, [initialSupplier]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    const fetchSuppliers = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get("/suppliers", {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: debouncedSearchQuery, limit: 10 },
        });
        setSearchResults(response.data.data);
      } catch (error) {
        toast.error("Failed to search for suppliers.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuppliers();
  }, [debouncedSearchQuery, open, token]);
  
  useEffect(() => {
    if (selectedValue) {
        const supplier = searchResults.find(s => String(s.id) === selectedValue);
        if(supplier) {
            setSelectedSupplierDisplay(supplier);
        }
    } else {
        setSelectedSupplierDisplay(null);
    }
  }, [selectedValue, searchResults]);


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <span className="truncate">
            {selectedValue && selectedSupplierDisplay
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
          <CommandList>
            {isLoading && <div className="p-2 text-center text-sm">Loading...</div>}
            <CommandEmpty>No supplier found.</CommandEmpty>
            <CommandGroup>
              {searchResults.map((supplier) => (
                <CommandItem
                  key={supplier.id}
                  value={String(supplier.id)}
                  onSelect={() => {
                     onSelect(String(supplier.id));
                     setSelectedSupplierDisplay(supplier);
                     setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === String(supplier.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {supplier.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}