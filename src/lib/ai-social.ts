import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "./firebase-admin";

export async function getOrGenerateSocialPost(articleId: string, articleData: any) {
    if (!db) return null;

    // 1. Check if post already exists
    if (articleData.socialPosts?.linkedin) {
        return articleData.socialPosts.linkedin;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        console.warn("GEMINI_API_KEY is not set. Falling back to excerpt.");
        return articleData.excerpt || articleData.title;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 2. Generate if not exists
    const prompt = `
    Actúa como un experto en redes sociales para una revista de tecnología de prestigio (MIT Technology Review en español).
    Tu tarea es crear un post de LinkedIn atractivo basado en el siguiente artículo:
    
    TÍTULO: ${articleData.title}
    EXTRACTO: ${articleData.excerpt}
    CONTENIDO (Fragmento): ${articleData.content?.substring(0, 1000) || ""}
    
    REQUISITOS DEL POST:
    - Lenguaje profesional pero cercano y provocador.
    - Menciona por qué esta tecnología o tendencia es importante ahora mismo.
    - Usa máximo 3 hashtags relevantes.
    - NO incluyas el enlace todavía (Buffer lo añadirá automáticamente desde el feed).
    - El post debe tener entre 100 y 250 palabras.
    - Usa un tono que fomente el debate o la reflexión.
    - Escribe el post en Español.
    
    Responde ÚNICAMENTE con el texto del post, sin explicaciones ni introducciones.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();

        // 3. Save back to Firestore
        await db.collection("articles").doc(articleId).update({
            "socialPosts.linkedin": text,
            "socialPosts.generatedAt": new Date().toISOString()
        });

        return text;
    } catch (error) {
        console.error("Error generating social post:", error);
        return articleData.excerpt || articleData.title; // Fallback
    }
}
