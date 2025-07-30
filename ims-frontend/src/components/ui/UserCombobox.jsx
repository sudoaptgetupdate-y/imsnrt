// src/components/ui/UserCombobox.jsx

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

export function UserCombobox({ selectedValue, onSelect, initialUser }) {
  const { t } = useTranslation(); // เพิ่ม useTranslation
  const token = useAuthStore((state) => state.token);
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUserDisplay, setSelectedUserDisplay] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (initialUser) {
      setSelectedUserDisplay(initialUser);
      if(!searchQuery){
        setSearchResults([initialUser]);
      }
    }
  }, [initialUser]);
  
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      return;
    }

    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get("/users", {
          headers: { Authorization: `Bearer ${token}` },
          params: { search: debouncedSearchQuery, limit: 10 },
        });
        // **แก้ไขกลับมาใช้ .data เหมือนเวอร์ชันที่ถูกต้องของคุณ**
        setSearchResults(response.data.data);
      } catch (error) {
        toast.error("Failed to fetch users.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, [debouncedSearchQuery, open, token]);
  
  useEffect(() => {
    if (selectedValue) {
        const user = searchResults.find(u => String(u.id) === selectedValue);
        if (user) {
            setSelectedUserDisplay(user);
        }
    } else {
        setSelectedUserDisplay(null);
    }
  }, [selectedValue, searchResults]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          <span className="truncate">
            {selectedValue && selectedUserDisplay
              ? `${selectedUserDisplay.name} (${selectedUserDisplay.username})`
              : t('select_user')} {/* แปล Placeholder */}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('user_combobox_search_placeholder')} // แปล Placeholder
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && <div className="p-2 text-center text-sm">Loading...</div>}
            <CommandEmpty>No user found.</CommandEmpty>
            <CommandGroup>
              {/* เพิ่มการป้องกัน .map เพื่อความปลอดภัย */}
              {(searchResults || []).map((user) => (
                <CommandItem
                  key={user.id}
                  value={String(user.id)}
                  onSelect={() => {
                     onSelect(String(user.id));
                     setSelectedUserDisplay(user);
                     setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === String(user.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {user.name} ({user.username})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}