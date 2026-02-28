import { db } from "@/lib/firebase-admin";
import RSS from "rss";
import { NextResponse } from "next/server";

export const revalidate = 300; // Cache for 5 minutes

function parseRSSDate(date: any): Date {
    if (!date) return new Date();
    if (typeof date.toDate === 'function') return date.toDate();
    if (date instanceof Date) return date;
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) return parsed;
    return new Date();
}

export async function GET(request: Request) {
    if (!db) {
        return new NextResponse("Database not initialized", { status: 500 });
    }

    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "www.technologyreview.es";
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    const feed = new RSS({
        title: "MIT Technology Review en español | Social Feed (LinkedIn)",
        description: `Publicaciones optimizadas para LinkedIn generadas mediante IA. Ref: ${new Date().getTime()}`,
        feed_url: `${siteUrl}/rss/social`,
        site_url: siteUrl,
        image_url: `${siteUrl}/favicon.png`,
        language: "es",
        pubDate: new Date(),
        custom_namespaces: {
            'media': 'http://search.yahoo.com/mrss/'
        }
    });

    try {
        const snapshot = await db.collection("articles")
            .where("status", "in", ["published", "featured"])
            .orderBy("date", "desc")
            .limit(30)
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

            // Priority: Pre-generated AI social post -> Excerpt -> Title
            const socialText = data.socialPosts?.linkedin || data.excerpt || data.title;

            const item: any = {
                title: socialText,
                description: `<div>${imageUrl && !imageUrl.includes('?') ? `<img src="${imageUrl}" style="max-width:100%; margin-bottom: 20px;" /><br/>` : ""}${data.excerpt || data.title || ""}</div>`,
                url: `${siteUrl}/${data.slug || doc.id}`,
                guid: doc.id,
                date: parseRSSDate(data.date || data.migratedAt),
                custom_elements: []
            };

            // ONLY add to feed if it has a valid image and is NOT an attachment link
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
                feed.item(item);
            }
        });

        const xml = feed.xml();

        return new NextResponse(xml, {
            headers: {
                "Content-Type": "application/rss+xml; charset=utf-8",
                "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            },
        });
    } catch (error) {
        console.error("Error generating Social RSS feed:", error);
        return new NextResponse("Error generating social feed", { status: 500 });
    }
}
