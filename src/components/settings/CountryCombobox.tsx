import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { COUNTRIES, countryByIso2, flagEmoji } from "@/lib/countries";

interface Props {
  value: string;
  onChange: (iso2: string) => void;
  id?: string;
  placeholder?: string;
  showDialCode?: boolean;
}

export function CountryCombobox({
  value,
  onChange,
  id,
  placeholder = "Search countries…",
  showDialCode = false,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = countryByIso2(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selected ? (
              <>
                <span className="mr-2">{flagEmoji(selected.iso2)}</span>
                {selected.name}
                {showDialCode && (
                  <span className="ml-1 text-muted-foreground">+{selected.dialCode}</span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Select a country</span>
            )}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => {
            // itemValue format: "ISO2|name|dial"
            return itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((c) => (
                <CommandItem
                  key={c.iso2}
                  value={`${c.iso2}|${c.name}|${c.dialCode}`}
                  onSelect={() => {
                    onChange(c.iso2);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === c.iso2 ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="mr-2">{flagEmoji(c.iso2)}</span>
                  <span className="flex-1">{c.name}</span>
                  {showDialCode && (
                    <span className="ml-2 text-xs text-muted-foreground">+{c.dialCode}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
