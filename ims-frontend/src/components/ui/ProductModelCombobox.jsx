// src/components/ui/ProductModelCombobox.jsx

import { useState, useEffect } from "react";
import axiosInstance from '@/api/axiosInstance';
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
import useAuthStore from "@/store/authStore";
import { toast } from "sonner";
import { useTranslation } from "react-i18next"; // --- 1. Import useTranslation ---

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

export function ProductModelCombobox({ onSelect, initialModel }) {
  const { t } = useTranslation(); // --- 2. เรียกใช้ Hook ---
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedModelDisplay, setSelectedModelDisplay] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const token = useAuthStore((state) => state.token);
  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    if (initialModel) {
      setSelectedModelDisplay(initialModel);
      setResults([initialModel]);
    } else {
      setSelectedModelDisplay(null);
      setResults([]);
    }
  }, [initialModel]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    const fetchModels = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get("/product-models", {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: debouncedSearch, limit: 10 },
        });
        setResults(response.data.data);
      } catch (error) {
        toast.error("Failed to search for product models.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchModels();
    
  }, [debouncedSearch, open, token]);

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
          <CommandList>
            {isLoading && <div className="p-2 text-sm text-center">Loading...</div>}
            <CommandEmpty>No product model found.</CommandEmpty>
            <CommandGroup>
              {results.map((model) => (
                <CommandItem
                  key={model.id}
                  value={model.modelNumber}
                  onSelect={() => {
                    onSelect(model); 
                    setSelectedModelDisplay(model);
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}