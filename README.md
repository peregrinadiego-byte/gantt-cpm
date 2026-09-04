# Gantt + CPM — Programación de obra

Herramienta web estática para elaborar y consultar una programación de obra mediante diagrama de Gantt, Método de la Ruta Crítica (CPM) y calendarización.

**Autor:** Luis Diego Peregrina García

## Funciones

- Hoja editable de actividades, precedencias y duraciones.
- Cálculo automático de ES, EF, LS, LF, holgura y actividades críticas.
- Diagrama de Gantt vinculado a la base editable.
- Tabla CPM con lectura visual de holguras y ruta crítica.
- Calendarización con búsqueda, filtros, ordenamiento y ficha interactiva por actividad.
- Red CPM de precedencias.
- Confirmación obligatoria antes de eliminar una actividad.
- Vista previa personalizable en cada módulo: título, subtítulo, autor, nota, orientación y resumen del proyecto.
- Descarga de cada vista previa como HTML autónomo e impresión/guardado como PDF desde el navegador.
- Exportación general a CSV.
- Persistencia local mediante `localStorage`.
- Compatible con GitHub Pages; no requiere backend ni API.

## Publicación en GitHub Pages

1. Sube `index.html`, `styles.css`, `app.js` y `README.md` a la raíz del repositorio.
2. Abre **Settings → Pages**.
3. Selecciona **Deploy from a branch**.
4. Elige la rama `main` y la carpeta `/root`.
5. Guarda la configuración.

La aplicación se ejecuta completamente en el navegador del usuario.
