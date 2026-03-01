import LegalLayout from "@/components/layout/LegalLayout";

export default function CookiesPage() {
    return (
        <LegalLayout title="Cookies">
            <p>Una cookie es un dato que se almacena en el disco duro del usuario que contiene información respecto del usuario, tal como la identificación del usuario para acceder a la página. Si un usuario rechaza la cookie, no podrán iniciar la sesión en nuestra página para tener acceso al contenido premium. No utilizamos cookies para almacenar información confidencial.</p>

            <h2>Archivos para Iniciar la Sesión</h2>
            <p>Utilizamos direcciones del Internet Protocol (IP) para analizar tendencias, administrar la página, rastrear los movimientos del usuario en nuestra página, y reunir información demográfica amplia para uso conjunto.</p>

            <h2>Vínculos</h2>
            <p>Esta página contiene vínculos a otras páginas. Technology Review, Inc. no es responsable por las prácticas de privacidad de otras páginas. Alentamos a nuestros usuarios a que sean conscientes de cuando abandonen nuestra página, y lean las declaraciones de privacidad de cada página que recoja información personal identificable.</p>

            <h2>Notificación de Cambios</h2>
            <p>Technology Review, Inc. se reserva los derechos de modificar su política de privacidad. Sin embargo, si decidiéramos modificar nuestra política, informaríamos de nuestros cambios claramente, por lo tanto, los usuarios siempre estarán conscientes de la información que recogemos, cómo la usamos, y bajo qué circunstancias, de existir, la revelaremos. Si en algún momento decidiéramos utilizar información personalmente identificable, de un modo distinto al que afirmamos en el momento de recolectarla, notificaremos a los usuarios mediante correo electrónico.</p>
        </LegalLayout>
    );
}
