import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://open-backstage.org";

const config: CapacitorConfig = {
  appId: "org.openbackstage.app",
  appName: "Open Backstage",
  webDir: "capacitor-web",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    allowNavigation: [
      "open-backstage.org",
      "*.open-backstage.org",
      "checkout.stripe.com",
    ],
  },
  ios: {
    contentInset: "never",
    allowsLinkPreview: false,
    backgroundColor: "#09090b",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#09090b",
      overlaysWebView: false,
    },
  },
};

export default config;
