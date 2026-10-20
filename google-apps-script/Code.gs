/**
 * =========================================================================================
 * INSTITUCIÓN EDUCATIVA VILLA FLORA - MEDELLÍN, COLOMBIA
 * Google Apps Script Serverless Bridge (Motor de Publicación Híbrida)
 * =========================================================================================
 * 
 * Este script actúa como webhook serverless receptor para la PWA de Coordinación.
 * Recibe el JSON consolidado de la matriz horaria escolar, limpia las hojas previas
 * y dibuja automáticamente las cuadrículas formateadas con estilos institucionales.
 * 
 * INSTRUCCIONES DE DESPLIEGUE EN GOOGLE DRIVE:
 * 1. Crea una hoja de cálculo nueva en Google Drive con la cuenta oficial del colegio.
 * 2. En el menú superior de Google Sheets, ve a: Extensiones > Apps Script.
 * 3. Borra el código existente en 'Código.gs' y pega este archivo completo.
 * 4. Haz clic en el botón azul superior: 'Implementar' (Deploy) > 'Nueva implementación'.
 * 5. En tipo de implementación, selecciona: 'Aplicación web' (Web App).
 * 6. Configura:
 *    - Descripción: "Webhook Horarios Villa Flora"
 *    - Ejecutar como: "Yo" (tu cuenta de correo)
 *    - Quién tiene acceso: "Cualquier persona" (Anyone)
 * 7. Haz clic en 'Implementar', autoriza los permisos requeridos y copia la 'URL de la aplicación web'.
 *    (Tiene la estructura: https://script.google.com/macros/s/.../exec)
 * 8. Pega esa URL en el modal "Publicar parrilla" dentro de la PWA.
 * 
 * DISTRIBUCIÓN PÚBLICA (IFRAME PARA WEBMASTER):
 * - En la misma hoja de cálculo: Archivo > Compartir > Publicar en la web.
 * - Selecciona "Página web" e "Insertar" para obtener el código <iframe> para la web del colegio.
 * =========================================================================================
 */

/**
 * Endpoint de prueba GET (Health Check)
 */
function doGet(e) {
  var output = {
    status: "ok",
    service: "I.E. Villa Flora - Google Sheets Serverless Bridge",
    institution: "Institución Educativa Villa Flora (Medellín)",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Endpoint receptor POST (Webhook invocado por la PWA)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Adquirir bloqueo para evitar colisiones si se envían múltiples clics concurrentes
    lock.waitLock(30000);

    if (!e || (!e.postData && !e.parameter)) {
      throw new Error("No se recibieron datos en el cuerpo de la solicitud (postData y parameter vacíos).");
    }

    var payload;
    if (e.parameter && e.parameter.data) {
      payload = typeof e.parameter.data === "string" ? JSON.parse(e.parameter.data) : e.parameter.data;
    } else if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        if (e.postData.contents.indexOf("data=") === 0) {
          var decoded = decodeURIComponent(e.postData.contents.substring(5).replace(/\+/g, " "));
          payload = JSON.parse(decoded);
        } else {
          throw parseErr;
        }
      }
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Renderizar Hoja Bachillerato
    if (payload.shifts && payload.shifts.bachillerato) {
      renderShiftSheet(ss, "Bachillerato", payload.shifts.bachillerato, payload.metadata);
    }

    // 2. Renderizar Hoja Primaria y T2
    if (payload.shifts && payload.shifts.primaria) {
      renderShiftSheet(ss, "Primaria_y_T2", payload.shifts.primaria, payload.metadata);
    }

    // 3. Renderizar Hoja Transición 1
    if (payload.shifts && payload.shifts.transicion) {
      renderShiftSheet(ss, "Transicion_1", payload.shifts.transicion, payload.metadata);
    }

    // 4. Renderizar Directorio Docente (Control de Carga)
    if (payload.teachersSummary) {
      renderTeachersSheet(ss, "Directorio_Docente", payload.teachersSummary, payload.metadata);
    }

    // 5. Soporte para Prueba de Fuego (payload.matrix 2D array directo)
    if (payload.matrix && Array.isArray(payload.matrix) && payload.matrix.length > 0) {
      var testSheet = ss.getSheetByName("Prueba_Webhook") || ss.getActiveSheet();
      testSheet.clear();
      var matrix = payload.matrix;
      var numRows = matrix.length;
      var numCols = matrix[0].length;
      var range = testSheet.getRange(1, 1, numRows, numCols);
      range.setValues(matrix);
      range.setHorizontalAlignment("center");
      range.setVerticalAlignment("middle");
      testSheet.getRange(1, 1, 1, numCols).setBackground("#1E3A8A").setFontColor("#FFFFFF").setFontWeight("bold");
      range.setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);
    }

    // Eliminar 'Hoja 1' o 'Sheet1' por defecto si ya existen las nuevas hojas
    cleanDefaultSheet(ss);

    var result = {
      status: "success",
      message: "Matriz horaria actualizada y renderizada con éxito en Google Sheets.",
      updatedAt: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error en doPost: " + error.toString());
    var errorResult = {
      status: "error",
      message: error.toString()
    };
    return ContentService.createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Renderiza una cuadrícula horaria por jornada y días
 */
function renderShiftSheet(ss, sheetName, shiftData, metadata) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }

  // Desactivar líneas de cuadrícula para control total de bordes
  sheet.setShowGridLines(true);

  var grades = shiftData.grades || [];
  var periodHeaders = shiftData.periodHeaders || [];
  var days = ["lunes", "martes", "miercoles", "jueves", "viernes"];
  var dayLabels = {
    lunes: "LUNES",
    martes: "MARTES",
    miercoles: "MIÉRCOLES",
    jueves: "JUEVES",
    viernes: "VIERNES"
  };

  var totalCols = periodHeaders.length + 1; // Col 1: Grado + Períodos
  var currentRow = 1;

  // --- BANNER INSTITUCIONAL ---
  var titleRange = sheet.getRange(currentRow, 1, 1, totalCols);
  titleRange.merge();
  titleRange.setValue("INSTITUCIÓN EDUCATIVA VILLA FLORA");
  titleRange.setBackground("#1E3A8A"); // Azul Villa Flora
  titleRange.setFontColor("#FFFFFF");
  titleRange.setFontWeight("bold");
  titleRange.setFontSize(14);
  titleRange.setHorizontalAlignment("center");
  titleRange.setVerticalAlignment("middle");
  sheet.setRowHeight(currentRow, 35);
  currentRow++;

  var subtitleRange = sheet.getRange(currentRow, 1, 1, totalCols);
  subtitleRange.merge();
  subtitleRange.setValue("HORARIO OFICIAL - " + shiftData.shiftName.toUpperCase() + " | " + metadata.academicPeriod + " (" + metadata.academicWeekText + ")");
  subtitleRange.setBackground("#2563EB"); // Azul medio
  subtitleRange.setFontColor("#FFFFFF");
  subtitleRange.setFontWeight("bold");
  subtitleRange.setFontSize(10);
  subtitleRange.setHorizontalAlignment("center");
  subtitleRange.setVerticalAlignment("middle");
  sheet.setRowHeight(currentRow, 25);
  currentRow++;

  var infoRange = sheet.getRange(currentRow, 1, 1, totalCols);
  infoRange.merge();
  infoRange.setValue("Última actualización: " + Utilities.formatDate(new Date(), "GMT-5", "dd/MM/yyyy hh:mm a") + " | Fuente: PWA Coordinación Villa Flora");
  infoRange.setBackground("#F1F5F9");
  infoRange.setFontColor("#475569");
  infoRange.setFontSize(9);
  infoRange.setFontStyle("italic");
  infoRange.setHorizontalAlignment("center");
  infoRange.setVerticalAlignment("middle");
  sheet.setRowHeight(currentRow, 20);
  currentRow += 2; // Espacio en blanco

  // --- TABLAS POR CADA DÍA ---
  days.forEach(function(dayKey) {
    var dayData = shiftData.days ? shiftData.days[dayKey] : null;

    // 1. Encabezado del Día
    var dayBanner = sheet.getRange(currentRow, 1, 1, totalCols);
    dayBanner.merge();
    dayBanner.setValue("— " + dayLabels[dayKey] + " —");
    dayBanner.setBackground("#0F172A"); // Slate 900
    dayBanner.setFontColor("#F8FAFC");
    dayBanner.setFontWeight("bold");
    dayBanner.setFontSize(11);
    dayBanner.setHorizontalAlignment("center");
    dayBanner.setVerticalAlignment("middle");
    sheet.setRowHeight(currentRow, 26);
    currentRow++;

    // 2. Encabezados de Columnas (Grado / Grupo | P1 | P2 | P3...)
    var colHeaders = ["Grado / Grupo"];
    periodHeaders.forEach(function(p) {
      colHeaders.push(p.label + "\n(" + p.time + ")");
    });

    var headerRowRange = sheet.getRange(currentRow, 1, 1, totalCols);
    headerRowRange.setValues([colHeaders]);
    headerRowRange.setBackground("#334155"); // Slate 700
    headerRowRange.setFontColor("#FFFFFF");
    headerRowRange.setFontWeight("bold");
    headerRowRange.setFontSize(9);
    headerRowRange.setHorizontalAlignment("center");
    headerRowRange.setVerticalAlignment("middle");
    headerRowRange.setWrap(true);
    sheet.setRowHeight(currentRow, 34);
    currentRow++;

    // 3. Filas por Grado
    var dayTableStartRow = currentRow;
    var dayValues = [];
    var dayBackgrounds = [];

    grades.forEach(function(grade) {
      var rowVals = [grade];
      var rowBgs = ["#F8FAFC"]; // Fondo del Grado

      periodHeaders.forEach(function(p) {
        var cell = (dayData && dayData.grid && dayData.grid[grade]) ? dayData.grid[grade][p.period] : null;
        if (cell && cell.subject) {
          var teacherStr = cell.teacherName ? " \n" + cell.teacherName : "";
          var roomStr = cell.classroomName ? " [" + cell.classroomName + "]" : "";
          rowVals.push(cell.subject + teacherStr + roomStr);

          // Coloreado condicional según estado
          if (cell.status === 'covered') {
            rowBgs.push("#ECFDF5"); // Verde menta
          } else if (cell.status === 'absent' || cell.status === 'uncovered') {
            rowBgs.push("#FEF2F2"); // Rojo suave
          } else {
            rowBgs.push("#FFFFFF"); // Blanco regular
          }
        } else {
          rowVals.push("—");
          rowBgs.push("#F8FAFC");
        }
      });

      dayValues.push(rowVals);
      dayBackgrounds.push(rowBgs);
    });

    if (dayValues.length > 0) {
      var dataRange = sheet.getRange(dayTableStartRow, 1, dayValues.length, totalCols);
      dataRange.setValues(dayValues);
      dataRange.setBackgrounds(dayBackgrounds);
      dataRange.setFontSize(8.5);
      dataRange.setHorizontalAlignment("center");
      dataRange.setVerticalAlignment("middle");
      dataRange.setWrap(true);

      // Columna de grado en negrita
      sheet.getRange(dayTableStartRow, 1, dayValues.length, 1).setFontWeight("bold");

      // Bordes limpios
      dataRange.setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);

      for (var r = 0; r < dayValues.length; r++) {
        sheet.setRowHeight(dayTableStartRow + r, 42);
      }

      currentRow += dayValues.length + 1; // Espacio entre días
    }
  });

  // Ajustar anchos de columnas
  sheet.setColumnWidth(1, 110); // Grado
  for (var c = 2; c <= totalCols; c++) {
    sheet.setColumnWidth(c, 150); // Horas
  }
}

/**
 * Renderiza la pestaña de Directorio Docente y Control de Carga Horaria (Decreto 1850)
 */
function renderTeachersSheet(ss, sheetName, teachers, metadata) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }

  sheet.setShowGridLines(true);
  var totalCols = 7;
  var currentRow = 1;

  // Banner
  var banner = sheet.getRange(currentRow, 1, 1, totalCols);
  banner.merge();
  banner.setValue("INSTITUCIÓN EDUCATIVA VILLA FLORA - DIRECTORIO DE CARGA LABORAL DOCENTE");
  banner.setBackground("#1E3A8A");
  banner.setFontColor("#FFFFFF");
  banner.setFontWeight("bold");
  banner.setFontSize(13);
  banner.setHorizontalAlignment("center");
  banner.setVerticalAlignment("middle");
  sheet.setRowHeight(currentRow, 35);
  currentRow++;

  var subBanner = sheet.getRange(currentRow, 1, 1, totalCols);
  subBanner.merge();
  subBanner.setValue("Control de Carga Máxima Semanal (Límite Legal: Decreto 1850 / MEN) | " + metadata.academicPeriod);
  subBanner.setBackground("#334155");
  subBanner.setFontColor("#FFFFFF");
  subBanner.setFontSize(9.5);
  subBanner.setHorizontalAlignment("center");
  subBanner.setVerticalAlignment("middle");
  sheet.setRowHeight(currentRow, 24);
  currentRow += 2;

  // Encabezados
  var headers = [
    "Cédula / Documento",
    "Docente",
    "Límite Legal",
    "Horas Asignadas",
    "Horas Disponibles",
    "Estado de Carga",
    "Materias Autorizadas (Catálogo MEN)"
  ];

  var headerRange = sheet.getRange(currentRow, 1, 1, totalCols);
  headerRange.setValues([headers]);
  headerRange.setBackground("#0F172A");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(9);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(currentRow, 30);
  currentRow++;

  var tableStartRow = currentRow;
  var rows = [];
  var bgs = [];

  teachers.forEach(function(t) {
    var statusText = "DISPONIBLE";
    var rowBg = "#FFFFFF";

    if (t.isOverloaded) {
      statusText = "EXCEDIDO";
      rowBg = "#FEE2E2";
    } else if (t.currentAssignedHours === t.maxWeeklyHours) {
      statusText = "LÍMITE ALCANZADO (22h)";
      rowBg = "#FEF3C7";
    }

    rows.push([
      t.documentId || "S/N",
      t.displayName,
      t.maxWeeklyHours + " hrs",
      t.currentAssignedHours + " hrs",
      t.remainingHours + " hrs",
      statusText,
      (t.allowedSubjects || []).join(", ")
    ]);

    bgs.push([
      "#F8FAFC",
      "#FFFFFF",
      "#F8FAFC",
      rowBg,
      rowBg,
      rowBg,
      "#FFFFFF"
    ]);
  });

  if (rows.length > 0) {
    var dataRange = sheet.getRange(tableStartRow, 1, rows.length, totalCols);
    dataRange.setValues(rows);
    dataRange.setBackgrounds(bgs);
    dataRange.setFontSize(9);
    dataRange.setVerticalAlignment("middle");
    dataRange.setBorder(true, true, true, true, true, true, "#CBD5E1", SpreadsheetApp.BorderStyle.SOLID);

    // Alineaciones
    sheet.getRange(tableStartRow, 1, rows.length, 1).setHorizontalAlignment("center");
    sheet.getRange(tableStartRow, 2, rows.length, 1).setHorizontalAlignment("left").setFontWeight("bold");
    sheet.getRange(tableStartRow, 3, rows.length, 4).setHorizontalAlignment("center");
    sheet.getRange(tableStartRow, 7, rows.length, 1).setHorizontalAlignment("left");

    for (var i = 0; i < rows.length; i++) {
      sheet.setRowHeight(tableStartRow + i, 26);
    }
  }

  // Anchos
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 110);
  sheet.setColumnWidth(5, 110);
  sheet.setColumnWidth(6, 160);
  sheet.setColumnWidth(7, 300);
}

/**
 * Elimina la hoja inicial por defecto si existen las hojas personalizadas
 */
function cleanDefaultSheet(ss) {
  var defaultSheet = ss.getSheetByName("Hoja 1") || ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch (e) {
      // Ignorar si no permite borrar
    }
  }
}
