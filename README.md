## ☁️ Configuración de Almacenamiento (Cloudflare R2)

Esta aplicación utiliza **Cloudflare R2** para almacenar productos, materiales y archivos multimedia. Para que funcione correctamente en producción, debes seguir estos pasos:

### 1. Crear el Bucket R2
En tu panel de Cloudflare:
1. Ve a **R2 > Overview**.
2. Haz clic en **Create bucket**.
3. Nómbralo: `plataformaing`.

### 2. Vincular el Bucket a Pages
1. Ve a tu proyecto en **Pages > [Nombre de tu Proyecto] > Settings**.
2. Ve a **Functions > R2 bucket bindings**.
3. Haz clic en **Add binding**.
4. Nombre de la variable: `plataformaing`.
5. Selecciona el bucket que creaste en el paso anterior.
6. **Importante**: Repite esto tanto para "Production" como para "Preview".

### 3. Configurar Variables de Entorno (API Key)
Por seguridad, la comunicación con R2 requiere una clave.
1. En **Settings > Environment variables**, añade una variable:
   - **Variable name**: `API_KEY`
   - **Value**: (Cualquier clave secreta que elijas)
2. En tu archivo `.env` local o en las variables de entorno de Vite de Cloudflare, añade:
   - `VITE_API_KEY`: (La misma clave secreta anterior)

### 4. Desarrollo Local
Para probar localmente con Wrangler:
1. Crea un archivo `.dev.vars` en la raíz con:
   ```env
   API_KEY=tu_clave_secreta
   ```
2. Ejecuta `npx wrangler pages dev .` para simular las funciones de Cloudflare localmente.

---
© 2024 DURAMAX - Footwear Engineering Tool
