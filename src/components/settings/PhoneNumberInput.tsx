import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, flagEmoji } from "@/lib/countries";

interface Props {
  iso2: string;
  local: string;
  onCountryChange: (iso2: string) => void;
  onLocalChange: (local: string) => void;
  id?: string;
}

export function PhoneNumberInput({ iso2, local, onCountryChange, onLocalChange, id }: Props) {
  const current = useMemo(() => COUNTRIES.find((c) => c.iso2 === iso2) ?? COUNTRIES[0], [iso2]);
  return (
    <div className="flex gap-2">
      <Select value={current.iso2} onValueChange={onCountryChange}>
        <SelectTrigger className="w-[160px] shrink-0">
          <SelectValue>
            <span className="tabular-nums">
              {flagEmoji(current.iso2)} +{current.dialCode}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {COUNTRIES.map((c) => (
            <SelectItem key={c.iso2} value={c.iso2}>
              <span className="mr-2">{flagEmoji(c.iso2)}</span>
              {c.name} <span className="text-muted-foreground">+{c.dialCode}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="555 123 4567"
        value={local}
        onChange={(e) => onLocalChange(e.target.value)}
        className="flex-1"
      />
    </div>
  );
}
