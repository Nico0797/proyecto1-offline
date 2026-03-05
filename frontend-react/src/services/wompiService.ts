// src/services/wompiService.ts

// Replace with your actual Wompi Public Key
const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY || 'pub_test_X2a184V1i31234567890123456789012'; // Fallback genérico, debe ser reemplazado por uno válido si falla

interface WompiCheckoutOptions {
    currency: string;
    amountInCents: number;
    reference: string;
    redirectUrl?: string; // Optional, for redirection after payment
    customerData?: {
        email: string;
        fullName: string;
        phoneNumber: string;
        phoneNumberPrefix: string;
        legalId: string;
        legalIdType: string;
    };
}

export const wompiService = {
    openCheckout: (options: WompiCheckoutOptions) => {
        // Ensure Wompi widget is loaded
        if (!window.WidgetCheckout) {
            console.error("Wompi Widget not loaded");
            alert("Error: El sistema de pagos no está disponible. Por favor recarga la página.");
            return;
        }

        // Validate Public Key
        if (!WOMPI_PUBLIC_KEY || !WOMPI_PUBLIC_KEY.startsWith('pub_')) {
            console.error("Invalid Wompi Public Key:", WOMPI_PUBLIC_KEY);
            alert("Error de configuración: Llave pública de pagos inválida.");
            return;
        }

        const checkout = new window.WidgetCheckout({
            currency: options.currency,
            amountInCents: options.amountInCents,
            reference: options.reference,
            publicKey: WOMPI_PUBLIC_KEY,
            redirectUrl: options.redirectUrl, // Uncommented to allow redirect
            customerData: options.customerData
        });
        
        checkout.open(function (result: any) {
            const transaction = result.transaction;
            console.log('Transaction result:', transaction);
            
            if (transaction.status === 'APPROVED') {
                // Handle success (e.g., update backend, show success message)
                alert("Operación exitosa: " + transaction.id);
                // Here you would typically call your backend to confirm the transaction
                // api.post('/payments/confirm', { transactionId: transaction.id })
                window.location.reload();
            } else if (transaction.status === 'DECLINED') {
                // Handle decline
                alert("Transacción rechazada: " + (transaction.statusMessage || "Intente con otro medio de pago"));
            } else if (transaction.status === 'ERROR') {
                 // Handle error
                 alert("Error en la transacción. Por favor intente nuevamente.");
            }
        });
    }
};
