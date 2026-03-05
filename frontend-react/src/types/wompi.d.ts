// src/types/wompi.d.ts
export interface WompiWidget {
    open: (options: any) => void;
}

declare global {
    interface Window {
        WidgetCheckout: WompiWidget;
    }
}
