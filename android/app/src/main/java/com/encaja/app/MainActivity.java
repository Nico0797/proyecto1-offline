package com.encaja.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private int statusBarHeightPx = 0;
    private int navBarHeightPx = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // Edge-to-edge: app draws behind system bars
        WindowCompat.setDecorFitsSystemWindows(window, false);

        // Transparent system bars so the app background shows through
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        // Dark icons on light background (matches light theme default)
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);

        // Read actual system bar pixel heights and inject into WebView as CSS custom properties
        View decorView = window.getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            statusBarHeightPx = bars.top;
            navBarHeightPx = bars.bottom;
            injectSafeAreaInsets();
            return ViewCompat.onApplyWindowInsets(view, windowInsets);
        });

        // Delayed retry: ensures injection happens after the WebView page has loaded
        decorView.postDelayed(this::injectSafeAreaInsets, 600);
        decorView.postDelayed(this::injectSafeAreaInsets, 1500);
    }

    private void injectSafeAreaInsets() {
        try {
            if (getBridge() == null || getBridge().getWebView() == null) return;
            if (statusBarHeightPx <= 0 && navBarHeightPx <= 0) return;
            String js = String.format(
                "document.documentElement.style.setProperty('--cap-status-bar-height','%dpx');" +
                "document.documentElement.style.setProperty('--cap-nav-bar-height','%dpx');",
                statusBarHeightPx, navBarHeightPx
            );
            getBridge().getWebView().evaluateJavascript(js, null);
        } catch (Exception ignored) {
            // Bridge or WebView not ready yet — CSS fallback handles spacing
        }
    }
}
