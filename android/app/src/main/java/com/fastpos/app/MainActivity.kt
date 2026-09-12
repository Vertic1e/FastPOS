package com.fastpos.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.net.wifi.WifiManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.print.PrintAttributes
import android.print.PrintManager
import android.text.format.Formatter
import android.view.View
import android.webkit.*
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import com.fastpos.app.databinding.ActivityMainBinding
import java.net.HttpURLConnection
import java.net.InetSocketAddress
import java.net.Socket
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: SharedPreferences
    private val mainHandler = Handler(Looper.getMainLooper())
    private val executor = Executors.newFixedThreadPool(8)

    companion object {
        private const val PREFS_NAME = "FastPOSPrefs"
        private const val KEY_SERVER_URL = "server_url"
        private const val DEFAULT_SERVER_URL = "http://192.168.1.105:3000"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        setupWebView()
        setupListeners()
        setupBackPress()

        // Initial connect attempt
        val savedUrl = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        binding.etServerUrl.setText(savedUrl)
        tryConnect(savedUrl, autoScanOnFail = true)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val webView = binding.webView
        val settings = webView.settings

        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.loadWithOverviewMode = true
        settings.useWideViewPort = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

        val defaultUA = settings.userAgentString
        settings.userAgentString = "$defaultUA FastPOS-Terminal/2.0"

        // Native bridge for POS printing
        webView.addJavascriptInterface(PosBridge(this, webView), "FastPOSNative")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                binding.progressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                binding.progressBar.visibility = View.GONE
                binding.swipeRefresh.isRefreshing = false

                // Hook window.print() to Android native print manager
                view?.evaluateJavascript(
                    """
                    (function() {
                        if (!window.__fastpos_print_hooked) {
                            window.__fastpos_print_hooked = true;
                            var orig = window.print;
                            window.print = function() {
                                if (window.FastPOSNative && window.FastPOSNative.print) {
                                    window.FastPOSNative.print();
                                } else if (orig) { orig(); }
                            };
                        }
                    })();
                    """.trimIndent(),
                    null
                )
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    binding.progressBar.visibility = View.GONE
                    binding.swipeRefresh.isRefreshing = false
                    val url = binding.etServerUrl.text?.toString() ?: DEFAULT_SERVER_URL
                    showSetupScreen("Could not reach FastPOS at $url\nMake sure the local engine is started.")
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                binding.progressBar.progress = newProgress
                if (newProgress >= 100) binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun setupListeners() {
        binding.swipeRefresh.setColorSchemeColors(0xFFE85D26.toInt())
        binding.swipeRefresh.setOnRefreshListener {
            binding.webView.reload()
        }

        binding.btnConnect.setOnClickListener {
            val raw = binding.etServerUrl.text?.toString()?.trim() ?: ""
            if (raw.isNotEmpty()) {
                val formatted = formatUrl(raw)
                binding.etServerUrl.setText(formatted)
                prefs.edit().putString(KEY_SERVER_URL, formatted).apply()
                tryConnect(formatted, autoScanOnFail = false)
            }
        }

        binding.btnAutoDetect.setOnClickListener {
            scanLocalNetwork()
        }
    }

    private fun setupBackPress() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (binding.webView.canGoBack()) {
                    binding.webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }

    private fun formatUrl(input: String): String {
        var u = input.trim()
        if (!u.startsWith("http://") && !u.startsWith("https://")) {
            u = "http://$u"
        }
        val withoutScheme = u.substringAfter("://")
        if (!withoutScheme.contains(":") && !withoutScheme.contains("/")) {
            u = "$u:3000"
        }
        return u
    }

    private fun tryConnect(targetUrl: String, autoScanOnFail: Boolean) {
        showLoading("Connecting to FastPOS…")

        executor.execute {
            val fullUrl = if (targetUrl.endsWith("/pos") || targetUrl.endsWith("/")) targetUrl else "$targetUrl/pos"
            val healthUrl = targetUrl.replace("/pos", "").trimEnd('/') + "/api/health"

            var isReachable = false
            try {
                val conn = URL(healthUrl).openConnection() as HttpURLConnection
                conn.connectTimeout = 2500
                conn.readTimeout = 2500
                conn.requestMethod = "GET"
                val code = conn.responseCode
                conn.disconnect()
                if (code == 200) isReachable = true
            } catch (_: Exception) {
                // Try direct GET on targetUrl
                try {
                    val conn = URL(fullUrl).openConnection() as HttpURLConnection
                    conn.connectTimeout = 2500
                    conn.readTimeout = 2500
                    conn.requestMethod = "GET"
                    val code = conn.responseCode
                    conn.disconnect()
                    if (code in 200..399) isReachable = true
                } catch (_: Exception) {}
            }

            mainHandler.post {
                if (isReachable) {
                    showWebView(fullUrl)
                } else if (autoScanOnFail) {
                    scanLocalNetwork()
                } else {
                    showSetupScreen("Could not reach $targetUrl\nEnsure FastPOS is running and tap Connect.")
                }
            }
        }
    }

    private fun scanLocalNetwork() {
        showScanning(true, "Scanning local network for FastPOS server…")

        executor.execute {
            val foundIp = discoverFastPOSHost()

            mainHandler.post {
                showScanning(false, "")
                if (foundIp != null) {
                    val newUrl = "http://$foundIp:3000"
                    binding.etServerUrl.setText(newUrl)
                    prefs.edit().putString(KEY_SERVER_URL, newUrl).apply()
                    tryConnect(newUrl, autoScanOnFail = false)
                } else {
                    showSetupScreen("Could not automatically detect FastPOS server.\nPlease check your local network IP and tap Connect.")
                }
            }
        }
    }

    /**
     * Scans local Wi-Fi subnet for open port 3000 with FastPOS health response
     */
    private fun discoverFastPOSHost(): String? {
        try {
            // Check localhost first (in case of local reverse proxy or emulator)
            for (local in listOf("127.0.0.1", "10.0.2.2")) {
                if (isFastPosServer(local)) return local
            }

            val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            val ipInt = wifiManager?.connectionInfo?.ipAddress ?: 0
            if (ipInt == 0) return null

            @Suppress("DEPRECATION")
            val myIp = Formatter.formatIpAddress(ipInt)
            val prefix = myIp.substringBeforeLast('.')

            // Common default candidate IPs on typical routers
            val priorityIps = listOf(
                "$prefix.105", "$prefix.106", "$prefix.100", "$prefix.101",
                "$prefix.2", "$prefix.3", "$prefix.10", "$prefix.20"
            )

            for (ip in priorityIps) {
                if (isFastPosServer(ip)) return ip
            }

            // Quick scan range 1..50
            for (i in 1..50) {
                val ip = "$prefix.$i"
                if (ip == myIp) continue
                if (isFastPosServer(ip)) return ip
            }
        } catch (_: Exception) {}
        return null
    }

    private fun isFastPosServer(host: String): Boolean {
        return try {
            val socket = Socket()
            socket.connect(InetSocketAddress(host, 3000), 200)
            socket.close()

            // Verify with HTTP GET /api/health
            val conn = URL("http://$host:3000/api/health").openConnection() as HttpURLConnection
            conn.connectTimeout = 800
            conn.readTimeout = 800
            val code = conn.responseCode
            conn.disconnect()
            code == 200
        } catch (_: Exception) {
            false
        }
    }

    private fun showLoading(status: String) {
        binding.loadingView.visibility = View.VISIBLE
        binding.swipeRefresh.visibility = View.GONE
        binding.errorView.visibility = View.GONE
        binding.tvLoadingStatus.text = status
    }

    private fun showWebView(url: String) {
        binding.loadingView.visibility = View.GONE
        binding.errorView.visibility = View.GONE
        binding.swipeRefresh.visibility = View.VISIBLE
        binding.webView.loadUrl(url)
    }

    private fun showSetupScreen(errorMsg: String) {
        binding.loadingView.visibility = View.GONE
        binding.swipeRefresh.visibility = View.GONE
        binding.errorView.visibility = View.VISIBLE
        binding.tvErrorMsg.text = errorMsg
    }

    private fun showScanning(isScanning: Boolean, status: String) {
        binding.progressBarScanning.visibility = if (isScanning) View.VISIBLE else View.GONE
        binding.tvScanStatus.visibility = if (isScanning) View.VISIBLE else View.GONE
        binding.tvScanStatus.text = status
        binding.btnAutoDetect.isEnabled = !isScanning
        binding.btnConnect.isEnabled = !isScanning
    }

    override fun onDestroy() {
        super.onDestroy()
        executor.shutdownNow()
    }

    class PosBridge(private val context: Context, private val webView: WebView) {
        @JavascriptInterface
        fun print() {
            webView.post {
                val printManager = context.getSystemService(Context.PRINT_SERVICE) as? PrintManager ?: return@post
                val printAdapter = webView.createPrintDocumentAdapter("FastPOS_Receipt")
                val printAttributes = PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .build()
                printManager.print("FastPOS_Receipt", printAdapter, printAttributes)
            }
        }
    }
}
