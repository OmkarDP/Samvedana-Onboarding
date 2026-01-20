import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PaymentCancelled from "./pages/PaymentCancelled";
import PhoneEntry from "./pages/PhoneEntry";
import Onboarding from "./pages/Onboarding";
import Confirmation from "./pages/Confirmation";
import Success from "./pages/Success";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={<PhoneEntry />}
          />
          <Route
            path="/onboarding"
            element={<Onboarding />}
          />
          <Route
            path="/confirmation"
            element={<Confirmation />}
          />
          <Route
            path="/success"
            element={<Success />}
          />
          <Route
            path="/payment-cancelled"
            element={<PaymentCancelled />}
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route
            path="*"
            element={<NotFound />}
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
