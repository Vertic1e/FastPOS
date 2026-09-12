package com.fastpos.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.os.Bundle
import android.print.PrintAttributes
import android.print.PrintManager
import android.view.View
import android.webkit.*
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import com.fastpos.app.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: SharedPreferences

    companion object {
        private const val PREFS_NAME = "FastPOSPrefs"
        private const val KEY_SERVER_URL = "server_url"
        // Default local host address for testing on device
        private const val DEFAULT_SERVER_URL = "http://192.168.1.106:3000"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        setupWebView()
        setupListeners()

        val savedUrl = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        binding.etServerUrl.setText(savedUrl)
        loadUrl(savedUrl)

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

        // Modern Chrome user-agent for smart POS compatibility
        val defaultUserAgent = settings.userAgentString
        settings.userAgentString = "$defaultUserAgent FastPOS/1.0"

        // Javascript interface for native POS printing & hardware features
        webView.addJavascriptInterface(PosBridge(this, webView), "FastPOSNative")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                binding.progressBar.visibility = View.VISIBLE
                binding.errorView.visibility = View.GONE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                binding.progressBar.visibility = View.GONE
                binding.swipeRefresh.isRefreshing = false
                binding.errorView.visibility = View.GONE

                // Inject native print hook: redirect window.print() to Android native print manager
                view?.evaluateJavascript(
                    """
                    (function() {
                        if (!window.__fastpos_print_hooked) {
                            window.__fastpos_print_hooked = true;
                            var originalPrint = window.print;
                            window.print = function() {
                                if (window.FastPOSNative && window.FastPOSNative.print) {
                                    window.FastPOSNative.print();
                                } else if (originalPrint) {
                                    originalPrint();
                                }
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
                    binding.errorView.visibility = View.VISIBLE
                    binding.tvErrorMsg.text = "Could not connect to:\n${request.url}\n\nMake sure the server is running on the network."
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                binding.progressBar.progress = newProgress
                if (newProgress >= 100) {
                    binding.progressBar.visibility = View.GONE
                }
            }
        }
    }

    private fun setupListeners() {
        binding.swipeRefresh.setOnRefreshListener {
            binding.webView.reload()
        }

        binding.btnConnect.setOnClickListener {
            val inputUrl = binding.etServerUrl.text?.toString()?.trim() ?: ""
            val formattedUrl = if (!inputUrl.startsWith("http://") && !inputUrl.startsWith("https://")) {
                "http://$inputUrl"
            } else {
                inputUrl
            }
            prefs.edit().putString(KEY_SERVER_URL, formattedUrl).apply()
            loadUrl(formattedUrl)
        }

        binding.btnResetDefault.setOnClickListener {
            binding.etServerUrl.setText(DEFAULT_SERVER_URL)
            prefs.edit().putString(KEY_SERVER_URL, DEFAULT_SERVER_URL).apply()
            loadUrl(DEFAULT_SERVER_URL)
        }
    }

    private fun loadUrl(url: String) {
        binding.errorView.visibility = View.GONE
        binding.webView.loadUrl(url)
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
