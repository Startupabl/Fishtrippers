import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { AvatarCropperDialog } from "@/components/settings/AvatarCropperDialog";
import { validateUpload } from "@/lib/image-crop";
import { useProfileStore } from "@/stores/useProfileStore";
import { AvailabilityEditor } from "@/components/availability/AvailabilityEditor";
import { PhoneNumberInput } from "@/components/settings/PhoneNumberInput";
import { COUNTRIES, type Country } from "@/lib/countries";
import { buildE164, parseE164 } from "@/lib/phone-format";
import { TIMEZONES } from "@/lib/timezones";
import { CountryCombobox } from "@/components/settings/CountryCombobox";
import { detectCountryByIp } from "@/lib/geo-detect";
import { RequiredMark } from "@/components/settings/RequiredMark";
import { getHasAideListings } from "@/lib/profile-flags.functions";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  head: () => ({ meta: [{ title: "Profile — Settings" }] }),
  component: ProfileSettingsPage,
});

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  timezone?: string;
  avatar?: string;
};

function detectBrowserTz(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function ProfileSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [motto, setMotto] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userNumberId, setUserNumberId] = useState<string | null>(null);
  const [wasComplete, setWasComplete] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [phoneCountry, setPhoneCountry] = useState<Country>(COUNTRIES[0]);
  const [phoneLocal, setPhoneLocal] = useState("");
  const country = useProfileStore((s) => s.country);
  const setCountry = useProfileStore((s) => s.setCountry);
  const timezone = useProfileStore((s) => s.timezone);
  const setTimezone = useProfileStore((s) => s.setTimezone);
  const tzOptions = TIMEZONES;
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("profile-welcome-dismissed") === "1";
  });
  const showWelcomeBanner = !wasComplete && !bannerDismissed;
  const dismissBanner = () => {
    setBannerDismissed(true);
    try {
      sessionStorage.setItem("profile-welcome-dismissed", "1");
    } catch {
      // ignore
    }
  };

  const fetchHasAideListings = useServerFn(getHasAideListings);
  const { data: aideListings } = useQuery({
    queryKey: ["has-aide-listings", user?.id],
    queryFn: () => fetchHasAideListings(),
    enabled: !!user,
  });
  const showLabHours = aideListings?.hasListings === true;

  useEffect(() => {
    if (!user && typeof window !== "undefined") navigate({ to: "/login" });
  }, [user, navigate]);

  // Commit detected browser timezone to the store on mount if empty,
  // so an immediate Save persists it without the user touching the dropdown.
  useEffect(() => {
    const current = useProfileStore.getState().timezone;
    if (!current || !current.trim()) {
      const tz = detectBrowserTz();
      if (tz) useProfileStore.getState().setTimezone(tz);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, motto, avatar_url, phone_number, country, timezone, user_number_id, is_profile_complete")
      .eq("id", user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return;
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setDisplayName((data as { display_name?: string | null }).display_name ?? "");
        setMotto((data as { motto?: string | null }).motto ?? "");
        setAvatarUrl(data.avatar_url ?? null);
        setUserNumberId((data as { user_number_id?: string | null }).user_number_id ?? null);
        setWasComplete(Boolean((data as { is_profile_complete?: boolean }).is_profile_complete));
        const parsed = parseE164(data.phone_number);
        if (parsed) {
          const c = COUNTRIES.find((x) => x.iso2 === parsed.iso2);
          if (c) setPhoneCountry(c);
          setPhoneLocal(parsed.national);
        }
        const savedTz = data.timezone && data.timezone.trim() ? data.timezone : null;
        if (data.country) {
          // Country already saved — hydrate as-is, no IP call.
          useProfileStore.getState().setProfile({
            country: data.country,
            timezone: savedTz ?? detectBrowserTz(),
          });
        } else {
          // Country missing — auto-detect via IP, fall back to US.
          const detected = await detectCountryByIp();
          const iso = detected ?? "US";
          useProfileStore.getState().setCountry(iso);
          if (savedTz) {
            useProfileStore.getState().setTimezone(savedTz);
          } else {
            const browserTz = detectBrowserTz();
            if (browserTz) useProfileStore.getState().setTimezone(browserTz);
          }
          if (!parsed) {
            const c = COUNTRIES.find((x) => x.iso2 === iso);
            if (c) setPhoneCountry(c);
          }
        }
      });
  }, [user]);

  if (!user) return null;

  const resolveEffectiveTz = (): string => {
    const fromStore = timezone && timezone.trim() ? timezone.trim() : "";
    if (fromStore) return fromStore;
    const detected = detectBrowserTz();
    return detected ?? "";
  };

  const validate = (effectiveTz: string): FieldErrors => {
    const e: FieldErrors = {};
    if (!firstName.trim()) e.firstName = "Please enter your first name.";
    if (!lastName.trim()) e.lastName = "Please enter your last name.";
    if (!displayName.trim()) e.displayName = "Please enter a display name.";
    if (!effectiveTz)
      e.timezone = "Please select your timezone to ensure proper calendar syncing.";
    if (!avatarUrl) e.avatar = "Please upload a profile photo.";
    return e;
  };

  const handleSaveAndContinue = async () => {
    const effectiveTz = resolveEffectiveTz();
    // Make sure the store reflects the value we're about to save so the UI
    // and subsequent reads stay consistent.
    if (effectiveTz && effectiveTz !== timezone) {
      setTimezone(effectiveTz);
    }
    const eMap = validate(effectiveTz);
    setErrors(eMap);
    if (Object.keys(eMap).length > 0) {
      toast.error("Please complete required fields");
      return;
    }
    const trimmedPhone = phoneLocal.replace(/[^\d]/g, "");
    const e164 = trimmedPhone ? buildE164(phoneCountry, trimmedPhone) : null;
    if (trimmedPhone && !e164) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: displayName.trim(),
        motto: motto.trim() || null,
        avatar_url: avatarUrl,
        timezone: effectiveTz,
        country: country || null,
        phone_number: e164,
        is_profile_complete: true,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    useProfileStore.getState().setProfile({ lastName, avatarUrl, country, timezone: effectiveTz });
    useAuthStore.getState().setProfileComplete(true);
    useAuthStore.getState().setDisplayName(displayName.trim() || null);
    useAuthStore.getState().setAvatarUrl(avatarUrl);
    queryClient.invalidateQueries({ queryKey: ["profile-completion", user.id] });
    const wasFirstTime = !wasComplete;
    setWasComplete(true);
    if (wasFirstTime) {
      navigate({ to: "/onboarding/choice" });
    } else {
      toast.success("Profile updated");
      navigate({ to: "/" });
    }
  };


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    try {
      validateUpload(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid file");
      return;
    }
    setPendingFile(file);
    setCropperOpen(true);
  };

  const handleCropped = async (blob: Blob, ext: string) => {
    setUploading(true);
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: blob.type });
    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${pub.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setAvatarUrl(url);
    useProfileStore.getState().setProfile({ avatarUrl: url });
    useAuthStore.getState().setAvatarUrl(url);
    queryClient.invalidateQueries({ queryKey: ["profile-completion", user.id] });
    setUploading(false);
    setErrors((prev) => ({ ...prev, avatar: undefined }));
    toast.success("Photo updated");
  };

  const initials = useMemo(
    () =>
      `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() ||
      (user.email[0] ?? "?").toUpperCase(),
    [firstName, lastName, user.email],
  );

  return (
    <div className="space-y-6">
    {showWelcomeBanner ? (
      <Alert
        className="relative border-[#3DA35D]/30 bg-[#3DA35D]/10 pl-5 pr-12 shadow-sm"
      >
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-1.5 rounded-l-lg"
          style={{ backgroundColor: DESIGN_SYSTEM.colors.leafGreen }}
        />
        <AlertDescription className="text-foreground text-[15px] leading-relaxed">
          👋 Welcome to Lemonaidely! Before continuing to your dashboard, let's finish setting up your account. Having your correct name, photo, and time zone ensures your scheduled sessions and interactions sync perfectly. Fill out the quick details below to unlock your workspace!
        </AlertDescription>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={dismissBanner}
          aria-label="Dismiss welcome message"
          className="absolute right-2 top-2 h-7 w-7 text-foreground/60 hover:text-foreground hover:bg-[#3DA35D]/15"
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    ) : null}
    <Card className="p-6">
      <div className="flex items-center gap-4 border-b pb-6">
        <Avatar className="h-20 w-20">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={firstName} /> : null}
          <AvatarFallback
            className="text-xl font-semibold text-white"
            style={{ backgroundColor: DESIGN_SYSTEM.colors.leafGreen }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {firstName || lastName ? `${firstName} ${lastName}`.trim() : user.email}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm py-[6px]">
            User ID: <span className="font-mono">#{userNumberId ?? "———"}</span>
          </p>
        </div>
      </div>

      <h2 className="mt-6 text-xl font-semibold">
        {wasComplete ? "Profile Settings" : "Finish Account Setup"}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Fields marked with an asterisk (<span className="text-destructive">*</span>) are required to
        unlock full site access.
      </p>


      {/* Profile photo */}
      <div className="mt-6 flex items-start gap-4">
        <Avatar className="h-20 w-20">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={firstName} /> : null}
          <AvatarFallback
            className="text-xl font-semibold text-white"
            style={{ backgroundColor: DESIGN_SYSTEM.colors.leafGreen }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <Label htmlFor="avatar" className="flex cursor-pointer flex-col items-start gap-3">
            <span className="text-sm font-medium">
              Profile photo
              <RequiredMark />
            </span>
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent",
                errors.avatar && "border-destructive",
              )}
            >
              {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
            </span>
            <Input id="avatar" type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          </Label>
          {errors.avatar ? (
            <p className="mt-2 text-xs text-destructive">{errors.avatar}</p>
          ) : (
            <p className="mt-1 text-muted-foreground text-sm py-[6px]">
              This photo and your display name will be used when you send messages or list courses.
            </p>
          )}
        </div>
      </div>

      {/* First name */}
      <div className="mt-6">
        <Label htmlFor="first">
          First name
          <RequiredMark />
        </Label>
        <Input
          id="first"
          value={firstName}
          onChange={(e) => {
            setFirstName(e.target.value);
            if (errors.firstName) setErrors((p) => ({ ...p, firstName: undefined }));
          }}
          className={cn(errors.firstName && "border-destructive")}
          aria-invalid={!!errors.firstName}
        />
        {errors.firstName ? (
          <p className="mt-1 text-xs text-destructive">{errors.firstName}</p>
        ) : null}
      </div>

      {/* Last name */}
      <div className="mt-4">
        <Label htmlFor="last">
          Last name
          <RequiredMark />
        </Label>
        <Input
          id="last"
          value={lastName}
          onChange={(e) => {
            setLastName(e.target.value);
            if (errors.lastName) setErrors((p) => ({ ...p, lastName: undefined }));
          }}
          className={cn(errors.lastName && "border-destructive")}
          aria-invalid={!!errors.lastName}
        />
        {errors.lastName ? (
          <p className="mt-1 text-xs text-destructive">{errors.lastName}</p>
        ) : null}
      </div>

      {/* Display name */}
      <div className="mt-4">
        <Label htmlFor="display">
          Display name
          <RequiredMark />
        </Label>
        <Input
          id="display"
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value);
            if (errors.displayName) setErrors((p) => ({ ...p, displayName: undefined }));
          }}
          placeholder="e.g. Michael C."
          maxLength={60}
          className={cn(errors.displayName && "border-destructive")}
          aria-invalid={!!errors.displayName}
        />
        {errors.displayName ? (
          <p className="mt-1 text-xs text-destructive">{errors.displayName}</p>
        ) : (
          <p className="text-muted-foreground py-[6px] text-sm">
            Shown publicly on your Course pages instead of your real name. Recommended: first name + last initial.
          </p>
        )}
      </div>

      {/* Motto */}
      <div className="mt-4">
        <Label htmlFor="motto">
          Your Motto <span className="text-muted-foreground">(Optional)</span>
        </Label>
        <Input
          id="motto"
          value={motto}
          onChange={(e) => setMotto(e.target.value.slice(0, 60))}
          placeholder="e.g. Stay curious, build often."
          maxLength={60}
        />
        <div className="mt-1 flex items-start justify-between gap-2">
          <p className="text-muted-foreground text-sm">
            Type a short motto, favorite quote, or philosophy! This will pop up beautifully whenever someone hovers over your profile photo.
          </p>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {motto.length}/60
          </span>
        </div>
      </div>

      {/* Country */}
      <div className="mt-4">
        <Label htmlFor="loc-country">Country</Label>
        <CountryCombobox
          id="loc-country"
          value={country || "US"}
          onChange={(iso2) => {
            setCountry(iso2);
            const c = COUNTRIES.find((x) => x.iso2 === iso2);
            if (c) setPhoneCountry(c);
          }}
        />
      </div>

      {/* Time zone */}
      <div className="mt-4">
        <Label htmlFor="loc-tz">
          Time zone
          <RequiredMark />
        </Label>
        <Select
          value={timezone ?? ""}
          onValueChange={(v) => {
            setTimezone(v || null);
            if (errors.timezone) setErrors((p) => ({ ...p, timezone: undefined }));
          }}
          disabled={tzOptions.length === 0}
        >
          <SelectTrigger id="loc-tz" className={cn(errors.timezone && "border-destructive")}>
            <SelectValue placeholder={tzOptions.length ? "Select a time zone" : "No zones available"} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {tzOptions.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.timezone ? (
          <p className="mt-1 text-xs text-destructive">{errors.timezone}</p>
        ) : (
          <p className="text-muted-foreground py-[6px] text-sm">
            Used to show class times in your local time.
          </p>
        )}
      </div>

      {/* Phone */}
      <div className="mt-4">
        <Label htmlFor="phone">
          Phone number <span className="text-muted-foreground">(Optional)</span>
        </Label>
        <PhoneNumberInput
          id="phone"
          iso2={phoneCountry.iso2}
          local={phoneLocal}
          onCountryChange={(iso2) => {
            const c = COUNTRIES.find((x) => x.iso2 === iso2);
            if (c) setPhoneCountry(c);
          }}
          onLocalChange={setPhoneLocal}
        />
        <p className="text-muted-foreground py-[6px] text-sm">
          Used strictly for urgent class reminders and schedule updates. We will never spam you.
        </p>
      </div>

      {/* Single Save & Continue */}
      <div className="mt-8 flex justify-end">
        <Button
          onClick={handleSaveAndContinue}
          disabled={saving}
          className="font-semibold text-foreground"
          style={{ backgroundColor: DESIGN_SYSTEM.colors.sunnyYellow }}
        >
          {saving ? "Saving…" : "Save & Continue"}
        </Button>
      </div>

      <AvatarCropperDialog
        file={pendingFile}
        open={cropperOpen}
        onOpenChange={(o) => {
          setCropperOpen(o);
          if (!o) setPendingFile(null);
        }}
        onCropped={handleCropped}
      />
    </Card>



    {showLabHours ? (
      <Card id="lab-hours" className="p-6">
        <h2 className="text-xl font-semibold">Lab Hours</h2>
        <p className="mt-1 text-muted-foreground text-sm py-[6px]">
          Set when you're usually free. This shows on your Course pages and stays in
          sync with the "Manage Availability" shortcut.
        </p>
        <div className="mt-6">
          <AvailabilityEditor />
        </div>
      </Card>
    ) : null}
    </div>
  );
}
