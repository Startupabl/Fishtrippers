import { createFileRoute } from "@tanstack/react-router";
import { SettingsSubPage } from "@/components/admin/SettingsSubPage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_admin/admin/settings/hero")({
  component: HeroSettings,
});

function HeroSettings() {
  return (
    <SettingsSubPage
      title="Hero Slider"
      description="Edit homepage hero slider images and hero text."
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Hero slide image URLs</Label>
          <Textarea disabled placeholder="One image URL per line" rows={4} />
        </div>
        <div className="space-y-2">
          <Label>Seasonal promo headline</Label>
          <Input disabled placeholder='e.g. "Summer Squeeze — 20% off all paths"' />
        </div>
        <div className="space-y-2">
          <Label>Seasonal promo body</Label>
          <Textarea disabled placeholder="Short marketing copy shown on the hero." rows={3} />
        </div>
        <Button disabled>Save changes</Button>
      </div>
    </SettingsSubPage>
  );
}
