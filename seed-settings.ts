import { db } from "./src/lib/firebase-admin";

async function seedSettings() {
    if (!db) {
        console.error("Firebase Admin not initialized");
        return;
    }

    const categoriesRef = db.collection("settings").doc("categories");
    const doc = await categoriesRef.get();

    if (!doc.exists) {
        console.log("Seeding categories...");
        await categoriesRef.set({
            list: ["Inteligencia Artificial", "Biotecnología", "Energía", "Espacio", "Sostenibilidad", "Negocios"]
        });
        console.log("Categories seeded successfully.");
    } else {
        console.log("Categories already exist.");
    }
}

seedSettings();
