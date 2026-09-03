# Gantt + CPM — Programación de Obra

Herramienta web estática para construir y visualizar un programa de obra con:

- hoja editable de actividades;
- precedencias y duraciones;
- cálculo automático CPM (ES, EF, LS, LF y holgura);
- identificación visual de ruta crítica;
- diagrama de Gantt;
- calendarización;
- red CPM;
- exportación a CSV;
- persistencia local en el navegador.

## Publicar en GitHub Pages

1. Crear un repositorio nuevo en GitHub.
2. Subir `index.html`, `styles.css`, `app.js` y `README.md`.
3. Ir a **Settings → Pages**.
4. En **Build and deployment**, elegir `Deploy from a branch`.
5. Seleccionar la rama `main` y carpeta `/root`.
6. Guardar y abrir la URL de GitHub Pages que genere el repositorio.

No requiere backend ni API.

## Datos iniciales

Fecha de inicio: 5 de septiembre de 2026.  
Calendario inicial: días naturales.  
Ruta crítica inicial: C1 → C2 → C3 → C4 → C5 → C7.  
Duración total inicial: 84 días.
