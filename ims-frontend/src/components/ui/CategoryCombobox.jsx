// src/components/ui/CategoryCombobox.jsx

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

export function CategoryCombobox({ selectedValue, onSelect, initialCategory }) {
  const { t } = useTranslation();
  const token = useAuthStore((state) => state.token);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategoryDisplay, setSelectedCategoryDisplay] = useState(null);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategoryDisplay(initialCategory);
      if(!searchQuery){
        setSearchResults([initialCategory]);
      }
    }
  }, [initialCategory]);

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get("/categories", {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: debouncedSearchQuery, limit: 10 },
        });
        setSearchResults(response.data.data);
      } catch (error) {
        toast.error("Failed to search for categories.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [debouncedSearchQuery, open, token]);
  
  useEffect(() => {
    if (selectedValue) {
        const category = searchResults.find(c => String(c.id) === selectedValue);
        if(category) {
            setSelectedCategoryDisplay(category);
        }
    } else {
        setSelectedCategoryDisplay(null);
    }
  }, [selectedValue, searchResults]);


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <span className="truncate">
            {selectedValue && selectedCategoryDisplay
              ? selectedCategoryDisplay.name
              : t('select_category')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('category_search_placeholder')}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && <div className="p-2 text-center text-sm">Loading...</div>}
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              {searchResults.map((category) => (
                <CommandItem
                  key={category.id}
                  value={String(category.id)}
                  onSelect={() => {
                     onSelect(String(category.id));
                     setSelectedCategoryDisplay(category);
                     setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === String(category.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {category.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}