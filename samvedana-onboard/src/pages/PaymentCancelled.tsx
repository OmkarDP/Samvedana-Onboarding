import { useEffect } from "react";
import { XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentCancelled = () => {
  useEffect(() => {
    // optional auto-redirect back to registration after short delay
    const timer = setTimeout(() => {
      window.location.href = "/";
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center shadow-lg rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-xl font-bold text-samvedana-blue mr-2">संवेदना</h1>
            <span className="text-lg font-semibold text-samvedana-orange"> Foundation</span>
          </div>
          <div className="mx-auto mb-4">
            <XCircle className="h-16 w-16 text-red-500" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl text-red-600">Payment Cancelled</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Your payment was cancelled or failed to complete. You can try again anytime.
          </p>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg text-left">
            <p className="text-sm font-medium mb-2">Next Steps</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Verify your internet connection</li>
              <li>Return to the registration form to retry payment</li>
              <li>Contact Samvedana support if the issue persists</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancelled;
