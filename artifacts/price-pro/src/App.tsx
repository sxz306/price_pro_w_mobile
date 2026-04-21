import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Quotes from "@/pages/Quotes";
import QuoteDetails from "@/pages/QuoteDetails";
import Customers from "@/pages/Customers";
import Login from "@/pages/Login";
import { getToken } from "@/lib/auth";

function AuthGate({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const hasToken = Boolean(getToken());

  useEffect(() => {
    if (!hasToken && location !== "/login") {
      setLocation("/login");
    } else if (hasToken && location === "/login") {
      setLocation("/");
    }
  }, [hasToken, location, setLocation]);

  if (!hasToken && location !== "/login") return null;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login}/>
      <Route path="/" component={Dashboard}/>
      <Route path="/products" component={Products}/>
      <Route path="/quotes" component={Quotes}/>
      <Route path="/quotes/:id" component={QuoteDetails}/>
      <Route path="/customers" component={Customers}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate>
            <Router />
          </AuthGate>
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
