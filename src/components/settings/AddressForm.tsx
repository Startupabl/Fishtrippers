import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountryCombobox } from "@/components/settings/CountryCombobox";
import { useProfileStore } from "@/stores/useProfileStore";

export interface AddressFormValue {
  address_line1: string;
  address_line2: string;
  city: string;
  state_province: string;
  postal_code: string;
}

interface Props {
  value: AddressFormValue;
  onChange: (next: AddressFormValue) => void;
}

export function AddressForm({ value, onChange }: Props) {
  const country = useProfileStore((s) => s.country);
  const setCountry = useProfileStore((s) => s.setCountry);
  const isUS = country === "US";
  const stateLabel = isUS ? "State" : "Province / Region";
  const postalLabel = isUS ? "ZIP Code" : "Postal Code";
  const update = (patch: Partial<AddressFormValue>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="addr-country">Country</Label>
        <CountryCombobox id="addr-country" value={country || "US"} onChange={setCountry} />
      </div>
      <div>
        <Label htmlFor="addr-line1">Street Address</Label>
        <Input
          id="addr-line1"
          value={value.address_line1}
          onChange={(e) => update({ address_line1: e.target.value })}
          autoComplete="address-line1"
        />
      </div>
      <div>
        <Label htmlFor="addr-line2">
          Apt, Suite, etc. <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="addr-line2"
          value={value.address_line2}
          onChange={(e) => update({ address_line2: e.target.value })}
          autoComplete="address-line2"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="addr-city">City / Town</Label>
          <Input
            id="addr-city"
            value={value.city}
            onChange={(e) => update({ city: e.target.value })}
            autoComplete="address-level2"
          />
        </div>
        <div>
          <Label htmlFor="addr-state">{stateLabel}</Label>
          <Input
            id="addr-state"
            value={value.state_province}
            onChange={(e) => update({ state_province: e.target.value })}
            autoComplete="address-level1"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="addr-postal">{postalLabel}</Label>
          <Input
            id="addr-postal"
            value={value.postal_code}
            onChange={(e) => update({ postal_code: e.target.value })}
            autoComplete="postal-code"
          />
        </div>
      </div>
    </div>
  );
}
