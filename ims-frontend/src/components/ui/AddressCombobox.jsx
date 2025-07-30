// src/components/ui/AddressCombobox.jsx

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
import { useTranslation } from "react-i18next"; // --- 1. Import useTranslation ---

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

export function AddressCombobox({ selectedValue, onSelect, initialAddress }) {
  const { t } = useTranslation(); // --- 2. เรียกใช้ Hook ---
  const token = useAuthStore((state) => state.token);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAddressDisplay, setSelectedAddressDisplay] = useState(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (initialAddress) {
      setSelectedAddressDisplay(initialAddress);
      if(!searchQuery){
        setSearchResults([initialAddress]);
      }
    }
  }, [initialAddress]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    const fetchAddresses = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get("/addresses", {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: debouncedSearchQuery, limit: 10 },
        });
        setSearchResults(response.data.data);
      } catch (error) {
        toast.error("Failed to search for addresses.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAddresses();
  }, [debouncedSearchQuery, open, token]);
  
  useEffect(() => {
    if (selectedValue) {
        const address = searchResults.find(a => String(a.id) === selectedValue);
        if(address) {
            setSelectedAddressDisplay(address);
        }
    } else {
        setSelectedAddressDisplay(null);
    }
  }, [selectedValue, searchResults]);


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <span className="truncate">
            {selectedValue && selectedAddressDisplay
              ? selectedAddressDisplay.name
              : t('select_address')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('address_search_placeholder')}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && <div className="p-2 text-center text-sm">Loading...</div>}
            <CommandEmpty>No address found.</CommandEmpty>
            <CommandGroup>
              {searchResults.map((address) => (
                <CommandItem
                  key={address.id}
                  value={String(address.id)}
                  onSelect={() => {
                     onSelect(String(address.id));
                     setSelectedAddressDisplay(address);
                     setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === String(address.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {address.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}