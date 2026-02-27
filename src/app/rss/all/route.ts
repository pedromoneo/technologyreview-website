import { db } from "@/lib/firebase-admin";
import RSS from "rss";
import { NextResponse } from "next/server";

export const revalidate = 600; // Cache for 10 minutes

function parseRSSDate(date: any): Date {
    if (!date) return new Date();
    // If it's a Firestore Timestamp (has toDate method)
    if (typeof date.toDate === 'function') return date.toDate();
    // If it's already a Date object
    if (date instanceof Date) return date;

    // Attempt to parse string
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) return parsed;

    return new Date(); // Fallback
}

export async function GET(request: Request) {
    if (!db) {
        return new NextResponse("Database not initialized", { status: 500 });
    }

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "www.technologyreview.es";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    const feed = new RSS({
        title: "MIT Technology Review en español | Todos los artículos",
        description: `Últimas noticias y análisis sobre tecnologías emergentes. Ref: ${new Date().getTime()}`,
        feed_url: `${siteUrl}/rss/all`,
        site_url: siteUrl,
        image_url: `${siteUrl}/favicon.png`,
        language: "es",
        pubDate: new Date(),
        copyright: `All rights reserved ${new Date().getFullYear()}, MIT Technology Review en español`,
        custom_namespaces: {
            'media': 'http://search.yahoo.com/mrss/'
        }
    });

    try {
        const snapshot = await db.collection("articles")
            .where("status", "in", ["published", "featured"])
            .orderBy("migratedAt", "desc")
            .limit(10)
            .get();

        snapshot.docs.forEach((doc) => {
            const data = doc.data();
            let imageUrl = data.imageUrl;
            if (imageUrl && imageUrl.startsWith('http://')) {
                imageUrl = imageUrl.replace('http://', 'https://');
            }
            let imageType = 'image/jpeg';
            if (imageUrl) {
                if (imageUrl.toLowerCase().endsWith('.png')) imageType = 'image/png';
                else if (imageUrl.toLowerCase().endsWith('.gif')) imageType = 'image/gif';
                else if (imageUrl.toLowerCase().endsWith('.webp')) imageType = 'image/webp';
            }

            const item: any = {
                title: data.title || "Sin título",
                description: `<div>${imageUrl && !imageUrl.includes('?') ? `<img src="${imageUrl}" style="max-width:100%; margin-bottom: 20px;" /><br/>` : ""}${data.excerpt || ""}</div>`,
                url: `${siteUrl}/${data.slug || doc.id}`,
                guid: doc.id,
                categories: [data.category || "General"],
                author: data.author || "Redacción",
                date: parseRSSDate(data.migratedAt || data.date),
                custom_elements: [
                    { "content:encoded": data.excerpt || "" }
                ],
            };

            if (imageUrl && !imageUrl.includes('?')) {
                item.enclosure = { url: imageUrl, type: imageType };
                item.custom_elements.push({
                    'media:content': {
                        _attr: {
                            url: imageUrl,
                            medium: 'image',
                            type: imageType
                        }
                    }
                });
            }

            feed.item(item);
        });

        const xml = feed.xml(); // No indents to keep it compact

        return new NextResponse(xml, {
            headers: {
                "Content-Type": "application/rss+xml; charset=utf-8",
                "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
            },
        });
    } catch (error) {
        console.error("Error generating RSS feed:", error);
        return new NextResponse("Error generating feed", { status: 500 });
    }
}
