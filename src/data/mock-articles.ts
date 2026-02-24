export interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readingTime: string;
  imageUrl: string;
}

export const MOCK_ARTICLES: Article[] = [
  {
    id: "1",
    title: "ChatGPT Health toma el relevo de Google: los riesgos de consultar los síntomas a la IA",
    excerpt: "Durante las dos últimas décadas, buscar síntomas en Google era el primer paso claro. Ahora, una nueva generación de chatbots de inteligencia artificial promete ser una alternativa mejor, más conversacional y personalizada, aunque con riesgos significativos.",
    category: "Inteligencia artificial",
    author: "Grace Huckins",
    date: "23 Feb 2026",
    readingTime: "11 min",
    imageUrl: "https://technologyreview.es/wp-content/uploads/2026/02/104362-el-dr-google-tuvo-sus-problemas-chatgpt-health-puede-funcionar-mejor-900x604.jpg",
  },
  {
    id: "2",
    title: "La nueva política de sanidad que lidera el polémico subsecretario de Salud de EE UU, Jim O’Neill",
    excerpt: "Jim O'Neill, el nuevo subsecretario de salud de Estados Unidos, lidera una propuesta de cambios radicales en la regulación de medicamentos y sanidad, generando un intenso debate en el sector.",
    category: "Biotecnología",
    author: "Jessica Hamzelou",
    date: "23 Feb 2026",
    readingTime: "15 min",
    imageUrl: "https://technologyreview.es/wp-content/uploads/2026/02/104482-subsecretario-de-salud-de-ee-uu-las-directrices-sobre-vacunas-aun-estan-sujetas-a-cambios-1024x576.jpg",
  },
  {
    id: "3",
    title: "El futuro de las baterías para vehículos eléctricos en 2026",
    excerpt: "Las baterías son la pieza clave de la transición energética. En 2026, veremos avances significativos en densidad energética y una reducción drástica de costes para acelerar la movilidad eléctrica.",
    category: "Cambio Climático y Energía",
    author: "Casey Crownhart",
    date: "20 Feb 2026",
    readingTime: "10 min",
    imageUrl: "https://technologyreview.es/wp-content/uploads/2026/02/104418-que-sigue-para-las-baterias-de-vehiculos-electricos-en-2026-1024x576.jpg",
  },
  {
    id: "4",
    title: "La vida eterna ya es un programa político: los Vitalistas afirman que morir es un error",
    excerpt: "¿Qué pasaría si envejecer no fuera inevitable? Un grupo de activistas y políticos, conocidos como Vitalistas, está impulsando la idea de que la longevidad extrema es un derecho humano y una prioridad política.",
    category: "Biotecnología",
    author: "Jessica Hamzelou",
    date: "19 Feb 2026",
    readingTime: "42 min",
    imageUrl: "https://technologyreview.es/wp-content/uploads/2026/02/104402-meet-the-vitalists-the-hardcore-longevity-enthusiasts-who-believe-death-is-wrong-1024x576.jpg",
  },
  {
    id: "5",
    title: "Defender a víctimas de acoso digital: un nuevo motivo para prohibir la entrada a EE UU",
    excerpt: "Un activista fue expulsado de EE UU por su labor de defensa contra el odio en línea. Este caso pone de relieve las crecientes restricciones ideológicas en las fronteras estadounidenses.",
    category: "Tecnología y Sociedad",
    author: "Eileen Guo",
    date: "18 Feb 2026",
    readingTime: "18 min",
    imageUrl: "https://technologyreview.es/wp-content/uploads/2026/02/104330-como-es-ser-expulsado-de-ee-uu-por-luchar-contra-el-odio-en-linea-1024x576.jpg",
  },
  {
    id: "6",
    title: "Cruzada contra chatGPT: “QuitGPT” insta a los usuarios a cancelar sus suscripciones",
    excerpt: "La campaña \"QuitGPT\" está ganando tracción en redes sociales, instando a los usuarios a abandonar sus suscripciones a ChatGPT Plus como respuesta a preocupaciones sobre ética y control de la IA.",
    category: "Inteligencia artificial",
    author: "Michelle Kim",
    date: "17 Feb 2026",
    readingTime: "8 min",
    imageUrl: "https://technologyreview.es/wp-content/uploads/2026/02/104456-una-campana-quitgpt-insta-a-las-personas-a-cancelar-sus-suscripciones-a-chatgpt-1024x576.jpg",
  },
  {
    id: "7",
    title: "Crónica de una batalla Pokémon: la ilusión colectiva de ver la IA en acción que generó Moltbook",
    excerpt: "Moltbook prometía un mundo virtual lleno de agentes inteligentes interactuando entre sí. Sin embargo, lo que parecía una revolución tecnológica resultó ser una ilusión colectiva decepcionante.",
    category: "Inteligencia artificial",
    author: "James O'donnell",
    date: "17 Feb 2026",
    readingTime: "3 min",
    imageUrl: "https://technologyreview.es/wp-content/uploads/2026/02/104443-la-glorificcion-de-pokemon-moltbook-la-nueva-clase-de-estafas-de-ia-1024x576.jpg",
  },
  {
    id: "8",
    title: "Una cirugía experimental devuelve a los pacientes de cáncer la posibilidad de dar a luz",
    excerpt: "Una innovadora técnica quirúrgica está permitiendo que mujeres jóvenes diagnosticadas con cáncer de cuello uterino agresivo puedan conservar su fertilidad y cumplir su deseo de ser madres.",
    category: "Biotecnología",
    author: "Jessica Hamzelou",
    date: "12 Feb 2026",
    readingTime: "7 min",
    imageUrl: "https://technologyreview.es/wp-content/uploads/2026/02/104323-una-cirugia-experimental-devuelve-a-los-pacientes-de-cancer-la-posibilidad-de-dar-a-luz-1024x576.jpg",
  }
];
