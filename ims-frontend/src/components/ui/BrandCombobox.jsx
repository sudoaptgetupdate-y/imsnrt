// src/components/ui/BrandCombobox.jsx

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

export function BrandCombobox({ selectedValue, onSelect, initialBrand }) {
  const { t } = useTranslation();
  const token = useAuthStore((state) => state.token);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBrandDisplay, setSelectedBrandDisplay] = useState(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (initialBrand) {
      setSelectedBrandDisplay(initialBrand);
      if(!searchQuery){
        setSearchResults([initialBrand]);
      }
    }
  }, [initialBrand]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    const fetchBrands = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get("/brands", {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: debouncedSearchQuery, limit: 10 },
        });
        setSearchResults(response.data.data);
      } catch (error) {
        toast.error("Failed to search for brands.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrands();
  }, [debouncedSearchQuery, open, token]);
  
  useEffect(() => {
    if (selectedValue) {
        const brand = searchResults.find(b => String(b.id) === selectedValue);
        if(brand) {
            setSelectedBrandDisplay(brand);
        }
    } else {
        setSelectedBrandDisplay(null);
    }
  }, [selectedValue, searchResults]);


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <span className="truncate">
            {selectedValue && selectedBrandDisplay
              ? selectedBrandDisplay.name
              : t('select_brand')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('brand_search_placeholder')}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && <div className="p-2 text-center text-sm">Loading...</div>}
            <CommandEmpty>No brand found.</CommandEmpty>
            <CommandGroup>
              {searchResults.map((brand) => (
                <CommandItem
                  key={brand.id}
                  value={String(brand.id)}
                  onSelect={() => {
                     onSelect(String(brand.id));
                     setSelectedBrandDisplay(brand);
                     setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === String(brand.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {brand.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}