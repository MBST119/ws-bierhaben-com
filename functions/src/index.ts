import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const adminApp = initializeApp();
const adminDb = getFirestore(adminApp);

const recaptchaSecret = defineSecret("RECAPTCHA_SECRET_KEY");

/**
 * Verifies a Google reCAPTCHA v2 token server-side.
 * Called from the client before completing email registration.
 */
export const verifyRecaptcha = onCall(
  { secrets: [recaptchaSecret], region: "europe-west1" },
  async (request) => {
    const token = request.data?.token;

    if (!token || typeof token !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "reCAPTCHA-Token fehlt oder ist ungültig."
      );
    }

    const secretKey = recaptchaSecret.value();

    if (!secretKey) {
      console.error("RECAPTCHA_SECRET_KEY is not configured.");
      throw new HttpsError(
        "internal",
        "reCAPTCHA-Konfiguration fehlt auf dem Server."
      );
    }

    // Verify token with Google's reCAPTCHA API
    const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    try {
      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const result = await response.json();

      if (!result.success) {
        console.warn("reCAPTCHA verification failed:", result["error-codes"]);
        throw new HttpsError(
          "permission-denied",
          "reCAPTCHA-Verifizierung fehlgeschlagen. Bitte versuche es erneut."
        );
      }

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error("reCAPTCHA verification error:", error);
      throw new HttpsError(
        "internal",
        "Fehler bei der reCAPTCHA-Verifizierung."
      );
    }
  }
);

/**
 * Serves the Listing Detail page with dynamic Open Graph metadata
 * dynamically injected for social previews (e.g. WhatsApp Status previews).
 */
export const serveListingDetail = onRequest({ region: "europe-west1" }, async (req, res) => {
  const listingId = req.query.id;
  const projectId = process.env.GCLOUD_PROJECT || "bierhaben-com-dev";
  const baseUrl = projectId === "bierhaben-com-prod" ? "https://bierhaben.com" : `https://${projectId}.web.app`;
  
  const path = require("path");
  const fs = require("fs");
  const templatePath = path.join(__dirname, "../detail-template.html");

  let html = "";
  try {
    if (fs.existsSync(templatePath)) {
      html = fs.readFileSync(templatePath, "utf8");
    } else {
      console.error(`Template file not found at ${templatePath}`);
      res.status(500).send("Server Error: template missing");
      return;
    }
  } catch (err) {
    console.error("Error reading local template HTML:", err);
    res.status(500).send("Server Error");
    return;
  }

  // If no listing ID is provided, just serve the static HTML unmodified
  if (!listingId || typeof listingId !== "string") {
    res.status(200).send(html);
    return;
  }

  try {
    const docRef = adminDb.collection("listings").doc(listingId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      const listing = docSnap.data();
      if (listing) {
         const escapeHtml = (unsafe: string) => {
          return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        };

        const getUnitName = (unit: string, price: number) => {
          const plural = price > 1;
          switch (unit) {
            case "flasche": return plural ? "Flaschen" : "Flasche";
            case "kiste": return plural ? "Kisten" : "Kiste";
            case "dose": return plural ? "Dosen" : "Dose";
            default: return "Einheiten";
          }
        };

        const getUnitEmoji = (unit: string) => {
          switch (unit) {
            case "flasche": return "🍺";
            case "kiste": return "🍻";
            case "dose": return "🥫";
            default: return "🥤";
          }
        };

        const title = escapeHtml(`${listing.title} | bierhaben.com`);
        const unitLabel = getUnitName(listing.beerUnit || "flasche", listing.beerPrice || 1);
        const emoji = getUnitEmoji(listing.beerUnit || "flasche");
        const descriptionText = `Schau mal, was ich auf bierhaben.com gefunden habe: "${listing.title}" für ${listing.beerPrice || 1}x ${unitLabel} ${emoji}!`;
        const description = escapeHtml(descriptionText);
        const imageUrl = listing.images && listing.images.length > 0 ? escapeHtml(listing.images[0]) : "";
        
        // Construct dynamic metadata tags
        const metaTags = `
<title>${title}</title>
<meta name="description" content="${description}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${imageUrl}" />
<meta property="og:url" content="${escapeHtml(`${baseUrl}/angebote/detail?id=${listingId}`)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="bierhaben.com" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${imageUrl}" />
        `.trim();

        // Remove existing tags to prevent duplicates
        html = html.replace(/<title>[^]*?<\/title>/gi, "");
        html = html.replace(/<meta name="description"[^>]*>/gi, "");
        html = html.replace(/<meta property="og:[^"]+"[^>]*>/gi, "");
        html = html.replace(/<meta name="twitter:[^"]+"[^>]*>/gi, "");

        // Inject new tags at the top of the <head>
        html = html.replace(/<head>/i, `<head>\n${metaTags}`);
      }
    }
  } catch (error) {
    console.error("Error fetching listing details in Cloud Function:", error);
  }

  // Set standard caching for CDN edge distribution
  res.set("Cache-Control", "public, max-age=300, s-maxage=3600");
  res.status(200).send(html);
});
