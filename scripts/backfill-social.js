const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccountKey = process.env.ADMIN_SDK_KEY;
    if (serviceAccountKey) {
        let serviceAccount;
        try {
            serviceAccount = JSON.parse(serviceAccountKey);
        } catch (e) {
            const decoded = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
            serviceAccount = JSON.parse(decoded);
        }
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: "techreview-mgz-1771952"
        });
    } else {
        admin.initializeApp({
            projectId: "techreview-mgz-1771952"
        });
    }
}
const db = admin.firestore();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function generateSocialPost(articleData) {
    const prompt = `
    Actúa como un experto en redes sociales para una revista de tecnología de prestigio (MIT Technology Review en español).
    Tu tarea es crear un post de LinkedIn atractivo basado en el siguiente artículo:
    
    TÍTULO: ${articleData.title}
    EXTRACTO: ${articleData.excerpt}
    
    REQUISITOS DEL POST:
    - Lenguaje profesional pero cercano y provocador.
    - Menciona por qué esta tecnología o tendencia es importante ahora mismo.
    - Usa máximo 3 hashtags relevantes.
    - NO incluyas el enlace (Buffer lo añadirá).
    - Entre 100 y 250 palabras.
    - Escribe el post en Español de España.
    
    Responde ÚNICAMENTE con el texto del post.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Error generating social post:", error);
        return articleData.excerpt || "";
    }
}

async function backfill() {
    console.log("Fetching latest 10 articles...");
    const snapshot = await db.collection("articles")
        .limit(10)
        .get();

    console.log(`Found ${snapshot.docs.length} articles.`);

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.socialPosts?.linkedin) {
            console.log(`Skipping ${data.title} (already has post)`);
            continue;
        }

        console.log(`Generating post for: ${data.title}`);
        const post = await generateSocialPost(data);
        await doc.ref.update({
            "socialPosts.linkedin": post,
            "socialPosts.generatedAt": new Date().toISOString()
        });
        console.log("Success.");
    }
    console.log("Backfill complete.");
}

backfill().catch(console.error);
