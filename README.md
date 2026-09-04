# Gantt + CPM — Programación de obra

Herramienta web estática para programación de obra mediante diagrama de Gantt, método CPM, ruta crítica, holguras y calendarización.

**Desarrollado por Luis Diego Peregrina García.**

## Funciones

- Hoja editable de actividades, precedencias y duraciones.
- Cálculo automático CPM: ES, EF, LS, LF y holgura.
- Identificación visual de actividades críticas.
- Diagrama de Gantt vinculado al cálculo.
- Calendarización por días naturales o lunes a sábado.
- Red CPM de precedencias.
- Confirmación antes de eliminar una actividad, con advertencia especial para actividades críticas.
- Vista previa HTML editable y descargable en cada apartado.
- Exportación CSV independiente de Actividades, Gantt, CPM, Calendarización y Red CPM.
- Exportación global a un archivo Excel (.xlsx) con cinco hojas.
- Persistencia local de los cambios en el navegador.


La exportación global `.xlsx` usa SheetJS desde CDN. Las exportaciones CSV y las vistas previas HTML funcionan directamente desde el navegador.

## Autoría

© Luis Diego Peregrina García.
