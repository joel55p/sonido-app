import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import {
  ServiceColumn,
  ServiceAttendance,
  UserMember,
  AttendanceStatus,
} from '../types';

/**
 * Compresses and square-crops an uploaded image file to a crisp 180x180 Data URL
 * so that ~55 member photos fit effortlessly in free databases & LocalStorage
 * and render without CORS issues in PDF export.
 */
export function processUploadedPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = 180;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar el lienzo de imagen'));
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.onerror = () => reject(new Error('Archivo de imagen inválido'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Exports the DOM element containing the Cuadro de Privilegios into a single-page
 * high-resolution Landscape PDF matching the reference PDF layout.
 */
export async function exportScheduleElementToPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 1750,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [355.6, 215.9],
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 6;

  const availW = pageWidth - margin * 2;
  const availH = pageHeight - margin * 2;

  const imgRatio = canvas.width / canvas.height;
  const pageRatio = availW / availH;

  let renderW = availW;
  let renderH = availW / imgRatio;

  if (imgRatio < pageRatio) {
    renderH = availH;
    renderW = availH * imgRatio;
  }

  const offsetX = margin + (availW - renderW) / 2;
  const offsetY = margin + (availH - renderH) / 2;

  pdf.addImage(imgData, 'JPEG', offsetX, offsetY, renderW, renderH);
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

function formatStatusLabel(status: AttendanceStatus): string {
  switch (status) {
    case 'asistio':
      return 'SÍ ASISTIÓ';
    case 'no_asistio':
      return 'NO ASISTIÓ';
    case 'excusa':
      return 'PUSO EXCUSA';
    case 'tarde':
      return 'LLEGÓ TARDE';
    default:
      return 'PENDIENTE';
  }
}

/**
 * Generates and downloads a formal PDF Attendance & Notes Report for a single Service.
 */
export function exportServiceAttendanceReportToPdf(params: {
  service: ServiceColumn;
  weekRange: string;
  assignedSlots: {
    slotKey: string;
    roleTitle: string;
    member: UserMember;
  }[];
  attendance: ServiceAttendance | undefined;
  exportedBy: string;
}): void {
  const { service, weekRange, assignedSlots, attendance, exportedBy } = params;
  const records = attendance?.records || {};
  const generalComment = attendance?.generalComment || 'Sin comentario general registrado.';

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 15;

  // Header Banner
  pdf.setFillColor(15, 23, 42); // Slate 900
  pdf.rect(12, y, pageWidth - 24, 26, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('DEPARTAMENTO DE SONIDO — MINISTERIOS EBENEZER', 18, y + 9);

  pdf.setFontSize(11);
  pdf.setTextColor(147, 197, 253);
  pdf.text(
    `Reporte de Asistencia del Servicio: ${service.dayGroup} - ${service.name} (${service.time})`,
    18,
    y + 16
  );

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(203, 213, 225);
  pdf.text(`Semana: ${weekRange}   |   Uniforme: ${service.uniform}`, 18, y + 22);

  y += 33;

  // Metadata & Summary Row
  let asistio = 0;
  let tarde = 0;
  let excusa = 0;
  let noAsistio = 0;
  let pendiente = 0;

  assignedSlots.forEach((slot) => {
    const st = records[slot.slotKey]?.status || 'pendiente';
    if (st === 'asistio') asistio++;
    else if (st === 'tarde') tarde++;
    else if (st === 'excusa') excusa++;
    else if (st === 'no_asistio') noAsistio++;
    else pendiente++;
  });

  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.text(
    `Registrado / Supervisado por: ${attendance?.updatedBy || exportedBy}`,
    14,
    y
  );
  pdf.text(
    `Fecha de exportación: ${new Date().toLocaleString('es-GT')}`,
    pageWidth - 14,
    y,
    { align: 'right' }
  );

  y += 6;

  // Summary boxes
  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(203, 213, 225);
  pdf.rect(12, y, pageWidth - 24, 12, 'FD');

  pdf.setFontSize(9);
  pdf.setTextColor(15, 23, 42);
  pdf.text(
    `Total Asignados: ${assignedSlots.length}   |   Sí Asistió: ${asistio}   |   Llegó Tarde: ${tarde}   |   Puso Excusa: ${excusa}   |   No Asistió: ${noAsistio}   |   Pendiente: ${pendiente}`,
    16,
    y + 7.5
  );

  y += 18;

  // Table Header
  pdf.setFillColor(27, 54, 93);
  pdf.rect(12, y, pageWidth - 24, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('PRIVILEGIO / PUESTO', 15, y + 5.5);
  pdf.text('HERMANO ASIGNADO', 58, y + 5.5);
  pdf.text('ASISTENCIA', 112, y + 5.5);
  pdf.text('COMENTARIO ESPECÍFICO', 142, y + 5.5);

  y += 8;

  // Table Rows
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);

  if (assignedSlots.length === 0) {
    pdf.setTextColor(100, 116, 139);
    pdf.text('No hay hermanos asignados en este servicio.', 16, y + 7);
    y += 12;
  } else {
    assignedSlots.forEach((slot, idx) => {
      const rec = records[slot.slotKey];
      const status = rec?.status || 'pendiente';
      const commentText = rec?.comment?.trim() || '—';

      const wrappedComment = pdf.splitTextToSize(commentText, 52);
      const rowHeight = Math.max(9, wrappedComment.length * 4.5 + 3);

      if (y + rowHeight > 265) {
        pdf.addPage();
        y = 15;
      }

      if (idx % 2 === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.rect(12, y, pageWidth - 24, rowHeight, 'F');
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.rect(12, y, pageWidth - 24, rowHeight, 'S');

      pdf.setTextColor(30, 41, 59);
      pdf.setFont('helvetica', 'bold');
      pdf.text(slot.roleTitle, 15, y + 5.5);

      pdf.setFont('helvetica', 'normal');
      pdf.text(slot.member.name, 58, y + 5.5);

      // Color-coded status text
      pdf.setFont('helvetica', 'bold');
      if (status === 'asistio') pdf.setTextColor(5, 150, 105);
      else if (status === 'no_asistio') pdf.setTextColor(220, 38, 38);
      else if (status === 'tarde') pdf.setTextColor(217, 119, 6);
      else if (status === 'excusa') pdf.setTextColor(37, 99, 235);
      else pdf.setTextColor(100, 116, 139);

      pdf.text(formatStatusLabel(status), 112, y + 5.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      pdf.text(wrappedComment, 142, y + 5.5);

      y += rowHeight;
    });
  }

  y += 8;

  // General Service Comment Section
  if (y + 35 > 280) {
    pdf.addPage();
    y = 15;
  }

  pdf.setFillColor(241, 245, 249);
  pdf.setDrawColor(148, 163, 184);
  const wrappedGeneral = pdf.splitTextToSize(generalComment, pageWidth - 34);
  const boxHeight = Math.max(22, wrappedGeneral.length * 5 + 12);

  pdf.rect(12, y, pageWidth - 24, boxHeight, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9.5);
  pdf.setTextColor(15, 23, 42);
  pdf.text('COMENTARIO GENERAL DEL SERVICIO:', 16, y + 7);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(51, 65, 85);
  pdf.text(wrappedGeneral, 16, y + 13);

  const safeFile = `Reporte_Asistencia_${service.dayGroup}_${service.name}`
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  pdf.save(`${safeFile}.pdf`);
}
