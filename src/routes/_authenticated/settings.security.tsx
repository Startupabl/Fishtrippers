import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";

export const Route = createFileRoute("/_authenticated/settings/security")({
  head: () => ({ meta: [{ title: "Security — Settings" }] }),
  component: SecuritySettingsPage,
});

function SecuritySettingsPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!user && typeof window !== "undefined") navigate({ to: "/login" });
    if (user) setEmail(user.email);
  }, [user, navigate]);

  if (!user) return null;

  const handleEmail = async () => {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) toast.error(error.message);
    else toast.success("Check your inbox to confirm the new email.");
  };

  const handlePassword = async () => {
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setPassword("");
    }
  };

  const handleCancel = async () => {
    await supabase.auth.signOut();
    toast.success("Account sign-out complete. Contact support to permanently delete your data.");
    navigate({ to: "/" });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold">Email</h2>
        <p className="mt-1 text-sm text-muted-foreground">Update the email used for login and notifications.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button onClick={handleEmail}>Update email</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose a strong password (at least 8 characters).</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="pw">New password</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button onClick={handlePassword}>Update password</Button>
        </div>
      </Card>

      <Card className="border-destructive/30 p-6">
        <h2 className="text-xl font-semibold text-destructive">Cancel account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This signs you out and starts the account closure process.
        </p>
        <div className="mt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Cancel my account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  You'll be signed out. To permanently delete your data, contact support after sign-out.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep account</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancel}>Cancel account</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </div>
  );
}
