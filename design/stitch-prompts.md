# Prompts para generar las 7 pantallas en la UI de Stitch

## Cómo usarlos

1. En Stitch: **Start a new design → Web**, modelo **Gemini 3**, y nombrá el proyecto `ShortURL2`.
2. Pegá el **BLOQUE DE ESTILO** y abajo el prompt de la pantalla 1. Generá.
3. **Quedate en el mismo proyecto** para las 6 restantes: así heredan el tema. A cada prompt volvé a pegarle el bloque de estilo; es lo que evita que se vaya a azul o a Inter.
4. Si una pantalla sale desviada, no la edites a mano: regenerala repitiendo el bloque de estilo.
5. Cuando estén las 7, decime el nombre del proyecto. Yo las traigo por API, las reviso una por una y corrijo el HTML exportado.

El canvas de Stitch **sí** muestra las pantallas generadas desde la UI. Las que generé por API no aparecían: por eso cambiamos de método.

## BLOQUE DE ESTILO (pegar al inicio de cada prompt)

```
Estilo: editorial cálido y sobrio. Fondo casi negro cálido #0E0F0C, superficies #141611,
superficies elevadas #1B1E17, filetes de 1px #262A22 y #3A4033. Texto principal hueso #EDEEE6,
secundario #A8B39C, etiquetas #8A9680. Acento lima ácido #C8F751, siempre con texto casi negro
#0E0F0C encima (nunca blanco). Titulares en serif Fraunces, texto de interfaz en Instrument Sans,
números, códigos y URLs en JetBrains Mono con cifras tabulares. Radios de 8 a 12, nunca mayores.
Sin gradientes, sin brillos, sin sombras: la profundidad se hace con filetes y superficies.
Espaciado en múltiplos de 4, padding de página 32. Etiquetas de sección en 12px mayúsculas con
tracking 0.08em.
```

---

## 1. `/` Crear link (pública)

```
Pantalla pública de creación de links, escritorio 1440x900.

Barra superior de 72px: marca "shorturl" en serif + pastilla "v1"; a la derecha el enlace de texto
"Panel" y un botón secundario "Iniciar sesión". Filete de 1px abajo.

Contenido centrado vertical y horizontalmente, ancho máximo 760:
- Pastilla con punto lima: "Analíticas en vivo"
- Titular grande en serif, exactamente dos líneas: "Links cortos." / "Datos que sirven."
- Bajada en gris: "Pegá cualquier URL, obtené un link de 7 caracteres y mirá exactamente cuándo lo abren."

Tarjeta de 720 de ancho, padding 24, radio 12:
- Etiqueta "URL ORIGINAL"
- Fila: campo de texto con placeholder "https://ejemplo.com/una/url/muy/larga" y botón lima "Acortar"
- Filete
- Etiqueta "LINK GENERADO"
- Franja: punto lima + "shorturl.app/x7Kd2pQ" en mono, y a la derecha botón secundario "Copiar"
- Dos filas de metadatos en mono pequeño, etiqueta de ancho fijo: "resp." / "302 · Cache-Control: no-store" y "destino" / "ejemplo.com/una/url/muy/larga"

Debajo de la tarjeta, nota centrada en gris: "Máximo 20 links por hora por IP · los clics de previews también cuentan"

No agregues pie de página ni enlaces inventados.
```

## 2. `/go/:code` Intersticial de destino

```
Pantalla intermedia antes de redirigir, escritorio 1440x900, sin barra de navegación.

Tarjeta centrada de 560 de ancho, padding 32, radio 12:
- Etiqueta en mayúsculas color ámbar #E8A33D: "VAS A SALIR DE SHORTURL"
- Titular en serif: "Este link te lleva a"
- Franja con el destino en mono: "ejemplo.com" en peso fuerte y el resto "/blog/como-acortar-urls" más apagado
- Texto gris: "No podemos verificar el contenido del destino. Si no esperabas este link, cerralo."
- Dos botones: lima "Continuar" y secundario "Volver"
- Filete y, debajo, en mono pequeño: "Creado hace 3 días · expira en 27 días"
Fuera de la tarjeta, centrado: enlace subrayado "Reportar este link".
```

## 3. `/login` Acceso del dueño

```
Pantalla de acceso, escritorio 1440x900, dividida en dos columnas.

Columna izquierda (44% del ancho) sobre superficie #141611, con filete de 1px a la derecha:
marca "shorturl" arriba a la izquierda, y pegado abajo el titular en serif "El panel es tuyo."
con la bajada gris "Los links son públicos. Las métricas, no."

Columna derecha centrada, ancho máximo 380:
- Etiqueta "ACCESO AL PANEL"
- Titular en serif "Entrá a tus métricas"
- Etiqueta "CONTRASEÑA" y campo con puntos suspensivos, foco con anillo lima de 2px
- Casilla marcada con check lima: "Recordarme 7 días"
- Botón lima a ancho completo: "Entrar"
- Filete y texto gris pequeño: "Sesión firmada en este navegador. Sin correo, sin registro."
A la izquierda del campo, no agregues botón de mostrar contraseña ni registro.
Agregá un enlace de texto "Volver al inicio" debajo del botón, discreto.
```

## 4. `/admin` Panel — estado, NO tendencias

```
Panel de administración, escritorio 1440x1024. Esta pantalla muestra el ESTADO DE HOY.
No incluye serie de 30 días ni gráfico de barras grande: las tendencias están en otra pantalla.

Barra lateral fija de 264: marca "shorturl" arriba; navegación Panel (activo, con barra lima de
2x14 y pastilla elevada), Links, Analíticas; abajo, sobre un filete, "oscar" con "DUEÑO" debajo y
"Salir" a la derecha.

Barra superior de 72: título "Panel" en serif con subtítulo gris "Hoy · Buenos Aires"; a la derecha
campo de búsqueda "Buscar código o URL" y botón lima "+ Nuevo link".

Contenido con padding 32 y separación 24:
1) Cuatro tarjetas de métrica en fila: "CLICS HOY" 47 con "↑ 8 vs. ayer" en lima; "LINKS ACTIVOS" 37;
   "ÚLTIMO CLIC" "hace 2 min"; "CREADOS HOY" 3.
2) Dos columnas: tarjeta "Actividad reciente" que crece, con las últimas 8 filas de 44px:
   hora en mono apagado "14:32", código en mono lima "x7Kd2pQ", destino truncado en gris.
   A la derecha, tarjeta de 300 de ancho "TOP DE HOY" con tres filas, cada una con marca lima de
   2px: "x7Kd2pQ" 32, "m3Qz8Tn" 9, "b9Wr4Lc" 5 (nombre a la izquierda, número en mono a la derecha).
3) Tarjeta de tabla con columnas CÓDIGO / DESTINO / CLICS / CREADO / ACCIONES y cinco filas de 56:
   códigos en mono lima, clics alineados a la derecha en mono, "hace 12 d" en mono apagado y un
   "···" al final que debe verse completo, sin recortarse contra el borde.

Sin gráfico de 30 días. Sin pie de página.
```

## 5. `/admin/links` Índice de links

```
Pantalla de índice de links, escritorio 1440x1024. Misma barra lateral y superior que el Panel,
con "Links" activo en la navegación.

Título "Links" en serif con subtítulo gris "37 activos · 4 deshabilitados".

Fila de herramientas: campo de búsqueda que crece con placeholder "Buscar por código, URL o destino";
selector "Estado: Todos"; botón secundario "Exportar CSV".

Tarjeta de tabla a ancho completo con columnas CÓDIGO (120) / DESTINO (flexible) / CLICS (80, a la
derecha) / CREADO (110) / ESTADO (110) / ACCIONES (48). Filas de 56px, separadas por filetes.
Cuatro filas activas: "x7Kd2pQ" con "ejemplo.com/blog/como-acortar-urls" 1.284 "hace 12 d" y
pastilla "ACTIVO" con punto lima; "m3Qz8Tn" 612; "b9Wr4Lc" 388; "t5Nv1Hs" 241.
Dos filas deshabilitadas: código en gris apagado y pastilla "DESHABILITADO" en ámbar.
Al pie de la tabla, alineado a la derecha: "37 de 41 links · página 1 de 2" con botones "Anterior"
y "Siguiente".
El "···" de acciones debe verse completo.
```

## 6. `/admin/links/:code` Detalle de link

```
Detalle de un link, escritorio 1440x1024. Misma barra lateral, con "Links" activo.

Barra superior: botón cuadrado con flecha "←", código "x7Kd2pQ" en mono y al lado el metadato
"302 · no-store · creado hace 12 días" en gris pequeño. A la derecha: botón secundario "Copiar link"
y botón con borde rojizo y texto rojo "Deshabilitar".

Franja de destino a ancho completo: etiqueta "DESTINO", la URL completa en mono y a la derecha el
enlace "Abrir".

Tres tarjetas de métrica: "CLICS TOTALES" 1.284; "CLICS HOY" 47 con "↑ 8 vs. ayer" en lima;
"MEJOR DÍA" 71 con "lunes 26 de mayo".

Abajo, dos columnas: tarjeta que crece "Clics por día" con barras lima y eje "1 may / 15 may / 30 may";
a la derecha una columna de 300 de ancho con dos tarjetas:
- "TOP DÍAS" con tres filas de 40px y marca lima: "lunes 26 may" 71, "martes 27 may" 67, "miércoles 28 may" 66
- "ACTIVIDAD" con tres filas etiqueta/valor: "Primer clic" / "12 may", "Último clic" / "hace 2 min", "Promedio" / "42,8 /día"
Sin pie de página.
```

## 7. `/admin/analytics` Analíticas globales

```
Pantalla de analíticas, escritorio 1440x1024. Misma barra lateral con "Analíticas" activo.
Esta pantalla es la de TENDENCIAS: acá vive la serie temporal y el análisis agregado.

Título "Analíticas" en serif con subtítulo gris "Todos los links · últimos 90 días".
Fila de filtros: control segmentado "7 d / 30 d / 90 d" con la opción activa en pastilla elevada y
subrayado lima de 2px; a la derecha botón secundario "Exportar CSV".

Tarjeta grande a ancho completo: etiqueta "CLICS TOTALES" y el número "9.482" en mono grande,
debajo la serie diaria de 90 días en barras lima finas con eje "1 mar / may / jul / 30 ago".

Dos columnas:
- "Top links" con cinco filas: número de orden, código en mono lima, destino truncado, una barra
  lima de longitud relativa y el total en mono. Valores: 1.284, 612, 388, 241, 96.
- "Días de la semana" con siete barras y sus valores encima: lun 2.140, mar 1.890, mié 1.750,
  jue 1.620, vie 1.340, sáb 422, dom 320. Nombres debajo en mono pequeño.

Tarjeta inferior "Comparativa" con tres métricas: "MEJOR DÍA DE LA SEMANA" lunes;
"CLICS POR LINK (PROMEDIO)" 34,7; "LINKS CON CERO CLICS" 6.
```
