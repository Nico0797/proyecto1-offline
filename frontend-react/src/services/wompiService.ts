const WOMPI_PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY || 'pub_test_X2a184V1i31234567890123456789012';
const WOMPI_IS_TEST = typeof WOMPI_PUBLIC_KEY === 'string' && WOMPI_PUBLIC_KEY.includes('pub_test');
const WOMPI_BASE = WOMPI_IS_TEST ? 'https://sandbox.wompi.co' : 'https://production.wompi.co';
const GPAY_ENV = WOMPI_IS_TEST ? 'TEST' : 'PRODUCTION';
const GPAY_MERCHANT_ID = import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID || '';
const GPAY_MERCHANT_NAME = import.meta.env.VITE_GOOGLE_PAY_MERCHANT_NAME || 'EnCaja';

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
        if (!window.WidgetCheckout) {
            alert("Error: El sistema de pagos no está disponible. Por favor recarga la página.");
            return;
        }
        if (!WOMPI_PUBLIC_KEY || !WOMPI_PUBLIC_KEY.startsWith('pub_')) {
            alert("Error de configuración: Llave pública de pagos inválida.");
            return;
        }
        const checkout = new window.WidgetCheckout({
            currency: options.currency,
            amountInCents: options.amountInCents,
            reference: options.reference,
            publicKey: WOMPI_PUBLIC_KEY,
            redirectUrl: options.redirectUrl,
            customerData: options.customerData
        });
        checkout.open(function (result: any) {
            const transaction = result.transaction;
            if (transaction.status === 'APPROVED') {
                window.location.reload();
            } else if (transaction.status === 'DECLINED') {
                alert("Transacción rechazada");
            } else if (transaction.status === 'ERROR') {
                alert("Error en la transacción.");
            }
        });
    },
    getAcceptanceToken: async (): Promise<string> => {
        const res = await fetch('/api/billing/wompi-acceptance', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo obtener acceptance token');
        return data.acceptance_token;
    },
    tokenizeCard: async (card: { number: string; cvc: string; exp_month: string; exp_year: string; card_holder: string; }): Promise<string> => {
        const resp = await fetch(`${WOMPI_BASE}/v1/tokens/cards`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${WOMPI_PUBLIC_KEY}`
            },
            body: JSON.stringify(card)
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(JSON.stringify(json));
        return json.data.id as string;
    },
    requestGooglePayToken: async (): Promise<string> => {
        if (!(window as any).google) {
            await new Promise<void>((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://pay.google.com/gp/p/js/pay.js';
                s.onload = () => resolve();
                s.onerror = () => reject(new Error('No se pudo cargar Google Pay'));
                document.head.appendChild(s);
            });
        }
        const paymentsClient = new (window as any).google.payments.api.PaymentsClient({ environment: GPAY_ENV });
        const baseParams = {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['VISA', 'MASTERCARD']
        };
        const isReadyReq = {
            apiVersion: 2,
            apiVersionMinor: 0,
            allowedPaymentMethods: [
                {
                    type: 'CARD',
                    parameters: baseParams
                }
            ]
        };
        const isReady = await paymentsClient.isReadyToPay(isReadyReq);
        if (!isReady.result) throw new Error('Google Pay no está disponible en este dispositivo');
        if (!GPAY_MERCHANT_ID) {
            throw new Error('Falta VITE_GOOGLE_PAY_MERCHANT_ID para Google Pay');
        }
        const tokenizationSpecification = {
            type: 'PAYMENT_GATEWAY',
            parameters: {
                gateway: 'wompi',
                gatewayMerchantId: GPAY_MERCHANT_ID
            }
        };
        const paymentDataRequest = {
            apiVersion: 2,
            apiVersionMinor: 0,
            allowedPaymentMethods: [
                {
                    type: 'CARD',
                    parameters: baseParams,
                    tokenizationSpecification
                }
            ],
            transactionInfo: {
                totalPriceStatus: 'FINAL',
                totalPrice: '0.01',
                currencyCode: 'COP',
                countryCode: 'CO'
            },
            merchantInfo: {
                merchantId: GPAY_MERCHANT_ID,
                merchantName: GPAY_MERCHANT_NAME
            }
        };
        const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
        const token = paymentData?.paymentMethodData?.tokenizationData?.token;
        if (!token) throw new Error('No se obtuvo token de Google Pay');
        return token;
    }
};
