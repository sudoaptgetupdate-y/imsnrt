// src/components/ui/CustomerCombobox.jsx

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

export function CustomerCombobox({ selectedValue, onSelect, initialCustomer }) {
  const { t } = useTranslation();
  const token = useAuthStore((state) => state.token);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCustomerDisplay, setSelectedCustomerDisplay] = useState(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (initialCustomer) {
      setSelectedCustomerDisplay(initialCustomer);
      if(!searchQuery){
        setSearchResults([initialCustomer]);
      }
    }
  }, [initialCustomer]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get("/customers", {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: debouncedSearchQuery, limit: 10 },
        });
        setSearchResults(response.data.data);
      } catch (error) {
        toast.error("Failed to search for customers.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, [debouncedSearchQuery, open, token]);
  
  useEffect(() => {
    if (selectedValue) {
        const customer = searchResults.find(c => String(c.id) === selectedValue);
        if(customer) {
            setSelectedCustomerDisplay(customer);
        }
    } else {
        setSelectedCustomerDisplay(null);
    }
  }, [selectedValue, searchResults]);


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <span className="truncate">
            {selectedValue && selectedCustomerDisplay
              ? selectedCustomerDisplay.name
              : t('select_customer')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('customer_search_placeholder')}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && <div className="p-2 text-center text-sm">Loading...</div>}
            <CommandEmpty>No customer found.</CommandEmpty>
            <CommandGroup>
              {searchResults.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={String(customer.id)}
                  onSelect={() => {
                     onSelect(String(customer.id));
                     setSelectedCustomerDisplay(customer);
                     setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === String(customer.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {customer.name} ({customer.customerCode})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}