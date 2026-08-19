package com.hisabbook.app;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.os.Bundle;
import android.os.Message;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        setupInAppWebView();
    }

    @Override
    public void onResume() {
        super.onResume();
        setupInAppWebView();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupInAppWebView() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);

            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            // Get original WebChromeClient set by Capacitor to delegate essential methods (like file picker and camera)
            final WebChromeClient originalClient = webView.getWebChromeClient();

            // Safe delegation wrapper to prevent crashes due to internal Capacitor classes
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                    WebView popupWebView = new WebView(MainActivity.this);
                    WebSettings popupSettings = popupWebView.getSettings();
                    popupSettings.setJavaScriptEnabled(true);
                    popupSettings.setDomStorageEnabled(true);
                    popupSettings.setSupportMultipleWindows(true);
                    popupSettings.setJavaScriptCanOpenWindowsAutomatically(true);
                    popupSettings.setAllowFileAccess(true);
                    popupSettings.setAllowContentAccess(true);

                    // Clean user agent so Google OAuth does not block the webview
                    String ua = popupSettings.getUserAgentString();
                    if (ua != null && ua.contains("; wv")) {
                        popupSettings.setUserAgentString(ua.replace("; wv", ""));
                    }

                    CookieManager.getInstance().setAcceptThirdPartyCookies(popupWebView, true);

                    Dialog dialog = new Dialog(MainActivity.this, android.R.style.Theme_DeviceDefault_Light_NoActionBar_Fullscreen);
                    dialog.setContentView(popupWebView, new ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                    ));

                    popupWebView.setWebChromeClient(new WebChromeClient() {
                        @Override
                        public void onCloseWindow(WebView window) {
                            try {
                                if (dialog.isShowing()) {
                                    dialog.dismiss();
                                }
                            } catch (Exception ignored) {}
                            window.destroy();
                        }
                    });

                    popupWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                            view.loadUrl(request.getUrl().toString());
                            return true;
                        }

                        @Override
                        public boolean shouldOverrideUrlLoading(WebView view, String url) {
                            view.loadUrl(url);
                            return true;
                        }
                    });

                    dialog.setOnCancelListener(d -> {
                        try {
                            popupWebView.destroy();
                        } catch (Exception ignored) {}
                    });

                    dialog.show();

                    WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                    transport.setWebView(popupWebView);
                    resultMsg.sendToTarget();
                    return true;
                }

                // Delegate standard file chooser requests directly back to Capacitor's original client
                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<android.net.Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                    if (originalClient != null) {
                        return originalClient.onShowFileChooser(webView, filePathCallback, fileChooserParams);
                    }
                    return super.onShowFileChooser(webView, filePathCallback, fileChooserParams);
                }

                // Delegate system permission requests directly back to Capacitor's original client
                @Override
                public void onPermissionRequest(PermissionRequest request) {
                    if (originalClient != null) {
                        originalClient.onPermissionRequest(request);
                    } else {
                        super.onPermissionRequest(request);
                    }
                }
            });
        }
    }
}
