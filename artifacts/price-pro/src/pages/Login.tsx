import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { login } from "@/lib/auth";
import logoUrl from "/favicon.svg";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("rep@pricepro.com");
  const [password, setPassword] = useState("");

  const m = useMutation({
    mutationFn: () => login(email.trim(), password),
    onSuccess: () => setLocation("/"),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <img src={logoUrl} alt="Price Pro" className="h-12 w-12 mb-2" />
          <CardTitle className="text-2xl">Price Pro</CardTitle>
          <CardDescription>Sign in to your sales workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              m.mutate();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="input-email"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-password"
                required
              />
            </div>
            {m.isError ? (
              <p className="text-sm text-destructive" data-testid="text-error">
                {(m.error as Error).message}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={m.isPending || !email || !password}
              data-testid="button-sign-in"
            >
              {m.isPending ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Demo credentials: rep@pricepro.com / pricepro
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
