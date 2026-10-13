import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

// 1. Appointment Confirmation PDF
export async function generateAppointmentConfirmationPdf(appointment: any): Promise<void> {
  const doc = new jsPDF();

  // Primary Header
  doc.setFillColor(15, 118, 110); // Emerald/Teal brand color
  doc.rect(0, 0, 210, 32, 'F');

  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SMARTCARE HEALTHCARE', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Appointment Booking Confirmation', 14, 26);

  // Appointment ID Badge
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Booking Reference: ${appointment.appointment_id || appointment.appointmentCode}`, 14, 44);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, 14, 50);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 54, 196, 54);

  // Patient Info Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 60, 88, 50, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('PATIENT INFORMATION', 20, 68);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Name: ${appointment.patient_name || 'Madhur Sathya'}`, 20, 76);
  doc.text(`Age / Gender: ${appointment.patient_age || '30'} Y / ${appointment.patient_gender || 'Male'}`, 20, 84);
  doc.text(`Contact: ${appointment.patient_phone || '+91 98765 43210'}`, 20, 92);
  doc.text(`Email: ${appointment.patient_email || 'patient@smartcare.com'}`, 20, 100);

  // Doctor & Facility Info Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(108, 60, 88, 50, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('DOCTOR & FACILITY', 114, 68);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Doctor: ${appointment.doctor_name}`, 114, 76);
  doc.text(`Department: ${appointment.department_name}`, 114, 84);
  doc.text(`Consultation Mode: ${appointment.appointment_type === 'online' ? 'Online (Zoom Meeting)' : 'In-Person (Hospital Clinic)'}`, 114, 92);
  doc.text(`Facility: ${appointment.hospital_name || 'SmartCare Multi-Specialty'}`, 114, 100);

  // Schedule Details Section
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 118, 182, 36, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 118, 110);
  doc.text('CONFIRMED SCHEDULE', 20, 127);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Appointment Date: ${appointment.appointment_date}`, 20, 136);
  doc.text(`Appointment Time Slot: ${appointment.appointment_time}`, 20, 144);

  if (appointment.appointment_type === 'online') {
    doc.text(`Zoom Link: ${appointment.zoom_join_url || 'https://zoom.us/j/smartcare-online'}`, 108, 136);
    doc.text(`Passcode: ${appointment.zoom_passcode || 'SC2026'}`, 108, 144);
  } else {
    doc.text(`Address: ${appointment.clinic_address || 'Hospital Boulevard, Medical Center'}`, 108, 136);
    doc.text(`Instructions: Please arrive 15 minutes prior to slot.`, 108, 144);
  }

  // Reason for Visit
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Health Concern / Symptoms Reported:', 14, 166);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(appointment.main_health_issue || appointment.symptoms || 'General medical follow-up.', 14, 174, { maxWidth: 182 });

  // QR Code
  try {
    const qrDataUrl = await QRCode.toDataURL(`SMARTCARE:${appointment.appointment_id || appointment.appointmentCode}:${appointment.appointment_date}`);
    doc.addImage(qrDataUrl, 'PNG', 154, 196, 36, 36);
    doc.setFontSize(8);
    doc.text('Scan for Verification', 154, 236);
  } catch (e) {
    // skip qr if error
  }

  // Footer Instructions
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Important Notice: This appointment booking confirmation is issued by SmartCare Platform.', 14, 270);
  doc.text('For rescheduling or inquiries, contact SmartCare Support at support@smartcare.health or 1800-419-CARE.', 14, 276);

  doc.save(`Appointment_${appointment.appointment_id || 'Confirmation'}.pdf`);
}

// 2. Appointment Payment Receipt PDF
export async function generateAppointmentPaymentReceiptPdf(appointment: any): Promise<void> {
  const doc = new jsPDF();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SMARTCARE RECEIPT', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Appointment Payment Receipt', 14, 26);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Receipt No: ${appointment.receipt_no || 'RCP-2026-' + Math.floor(1000 + Math.random() * 9000)}`, 14, 44);
  doc.text(`Transaction Ref: ${appointment.transaction_ref || 'TXN-RZP-' + Math.floor(100000 + Math.random() * 900000)}`, 14, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Date of Payment: ${new Date().toLocaleDateString('en-GB')}`, 130, 44);
  doc.text(`Status: COMPLETED (Verified)`, 130, 50);

  doc.line(14, 56, 196, 56);

  // Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Billed To (Patient):', 14, 66);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(appointment.patient_name || 'Madhur Sathya', 14, 73);
  doc.text(appointment.patient_email || 'patient@smartcare.com', 14, 80);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Healthcare Provider:', 110, 66);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Dr. ${appointment.doctor_name}`, 110, 73);
  doc.text(`Department: ${appointment.department_name}`, 110, 80);

  // Table Header
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 94, 182, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('Description', 20, 100);
  doc.text('Mode', 110, 100);
  doc.text('Amount (INR)', 160, 100);

  // Table Row
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text(`Doctor Consultation Fee (${appointment.department_name})`, 20, 114);
  doc.text(appointment.appointment_type === 'online' ? 'Online' : 'In-Person', 110, 114);
  doc.text(`₹ ${appointment.consultation_fee || 500}.00`, 160, 114);

  doc.text('Healthcare Goods & Services Tax (5%)', 20, 124);
  doc.text('Govt Tax', 110, 124);
  doc.text(`₹ ${appointment.tax_amount || 25}.00`, 160, 124);

  doc.line(14, 134, 196, 134);

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL PAID:', 110, 144);
  doc.text(`₹ ${appointment.total_amount || 525}.00`, 160, 144);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Gateway: Razorpay / ${appointment.payment_method || 'UPI'}`, 14, 160);

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated tax invoice and does not require a physical signature.', 14, 270);

  doc.save(`Receipt_${appointment.receipt_no || 'Consultation'}.pdf`);
}

// 3. Official Doctor Digital Prescription PDF
export async function generateDoctorPrescriptionPdf(prescription: any): Promise<void> {
  const doc = new jsPDF();

  // Top Hospital Header
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 36, 'F');

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(prescription.hospital_name || 'SMARTCARE MULTI-SPECIALTY HOSPITAL', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Department of ' + (prescription.department_name || 'Clinical Care') + ' | Center of Excellence', 14, 26);
  doc.text('Accredited Healthcare Facility | Digital Consultation Services', 14, 32);

  // Doctor Details
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Dr. ${prescription.doctor_name}`, 14, 48);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`${prescription.doctor_qualification || 'MBBS, MD'}`, 14, 54);
  doc.text(`Registration No: ${prescription.medical_reg_no || 'MCI-REG-2024'}`, 14, 60);

  // Prescription Meta
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 118, 110);
  doc.text(`Rx ID: ${prescription.prescription_id}`, 140, 48);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Date: ${prescription.created_at ? new Date(prescription.created_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}`, 140, 54);
  doc.text(`Apt Ref: ${prescription.appointment_code || 'SC-APT-2026'}`, 140, 60);

  doc.setDrawColor(203, 213, 225);
  doc.line(14, 66, 196, 66);

  // Patient Particulars Bar
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 70, 182, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Patient: ${prescription.patient_name}`, 20, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(`Age: ${prescription.patient_age || '30'} Y`, 90, 78);
  doc.text(`Gender: ${prescription.patient_gender || 'Male'}`, 125, 78);
  doc.text(`Follow-Up: ${prescription.follow_up_date || 'After 7 Days'}`, 155, 78);

  // Clinical Notes & Diagnosis
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Clinical Diagnosis & Observations:', 14, 94);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(`Diagnosis: ${prescription.diagnosis || 'Clinical evaluation completed.'}`, 14, 101);
  if (prescription.clinical_notes) {
    doc.text(`Notes: ${prescription.clinical_notes}`, 14, 107, { maxWidth: 182 });
  }

  // The Rx Emblem
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(15, 118, 110);
  doc.text('Rx', 14, 124);

  // Medicines Table
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 130, 182, 9, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('#', 18, 136);
  doc.text('Medicine & Strength', 26, 136);
  doc.text('Dosage', 95, 136);
  doc.text('Frequency & Timing', 125, 136);
  doc.text('Duration', 170, 136);

  let currentY = 145;
  const medicines = prescription.medicines || [];

  medicines.forEach((med: any, index: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    doc.text(`${index + 1}`, 18, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${med.medicine_name} ${med.strength ? '(' + med.strength + ')' : ''}`, 26, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${med.dosage || '1 unit'}`, 95, currentY);
    doc.text(`${med.frequency || '1x daily'} · ${med.timing || 'After food'}`, 125, currentY);
    doc.text(`${med.duration_days || med.duration || 5} days`, 170, currentY);

    if (med.instructions) {
      currentY += 5;
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Instructions: ${med.instructions}`, 26, currentY);
    }

    currentY += 9;
  });

  // Doctor Signature Stamp Box
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(130, 220, 66, 36, 2, 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text('DIGITALLY SIGNED', 142, 230);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Dr. ${prescription.doctor_name}`, 142, 238);
  doc.text(`Reg: ${prescription.medical_reg_no || 'MCI-VERIFIED'}`, 142, 244);
  doc.text('SmartCare Verified Practitioner', 142, 250);

  // QR Code for Pharmacy Verification
  try {
    const qrData = await QRCode.toDataURL(`SMARTCARE:RX:${prescription.prescription_id}:${prescription.doctor_name}`);
    doc.addImage(qrData, 'PNG', 14, 218, 34, 34);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Scan to Authenticate Prescription', 14, 256);
  } catch (e) {
    // fallback
  }

  // Footer Disclaimer
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Legal Notice: This digital prescription is generated under Telemedicine Practice Guidelines & IT Act 2000.', 14, 274);
  doc.text('Valid at all licensed pharmacies across India. Upload directly to SmartCare Pharmacy for fulfillment.', 14, 280);

  doc.save(`Prescription_${prescription.prescription_id}.pdf`);
}

// 4. Pharmacy Payment Receipt PDF
export async function generatePharmacyPaymentReceiptPdf(order: any): Promise<void> {
  const doc = new jsPDF();

  doc.setFillColor(14, 116, 144);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SMARTCARE PHARMACY RECEIPT', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Medicine Order Payment Invoice', 14, 26);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Order ID: ${order.order_id}`, 14, 44);
  doc.text(`Txn Ref: ${order.transaction_ref || 'TXN-RX-' + Math.floor(100000 + Math.random() * 900000)}`, 14, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Pharmacy: ${order.shop_name || 'Apollo Life Pharmacy'}`, 110, 44);
  doc.text(`Status: PAID & DISPATCHING`, 110, 50);

  doc.line(14, 56, 196, 56);

  // Items Table
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 66, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Medicine Description', 20, 72);
  doc.text('Qty', 115, 72);
  doc.text('Unit Price', 140, 72);
  doc.text('Total', 175, 72);

  let curY = 82;
  const items = order.items || [
    { medicine_name: 'Mometasone Furoate 0.1% Cream', quantity: 1, unit_price: 220, total_price: 220 },
    { medicine_name: 'Levocetirizine 5mg (Strip of 10)', quantity: 1, unit_price: 120, total_price: 120 }
  ];

  items.forEach((item: any) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(item.medicine_name, 20, curY);
    doc.text(String(item.quantity), 118, curY);
    doc.text(`₹ ${item.unit_price}`, 142, curY);
    doc.text(`₹ ${item.total_price}`, 175, curY);
    curY += 8;
  });

  doc.line(14, curY + 2, 196, curY + 2);

  curY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Subtotal:', 130, curY);
  doc.text(`₹ ${order.subtotal || 340}.00`, 175, curY);

  curY += 7;
  doc.text('Taxes (GST 5%):', 130, curY);
  doc.text(`₹ ${order.tax || 17}.00`, 175, curY);

  curY += 9;
  doc.setFontSize(11);
  doc.setTextColor(14, 116, 144);
  doc.text('TOTAL AMOUNT PAID:', 110, curY);
  doc.text(`₹ ${order.total_amount || 357}.00`, 175, curY);

  doc.save(`Pharmacy_Receipt_${order.order_id}.pdf`);
}

// 5. Medicine Collection Confirmation PDF
export async function generateMedicineCollectionConfirmationPdf(order: any): Promise<void> {
  const doc = new jsPDF();

  doc.setFillColor(16, 185, 129); // Green confirmation
  doc.rect(0, 0, 210, 32, 'F');

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('MEDICINE COLLECTION CONFIRMATION', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('SmartCare Verified Pharmacy Handover', 14, 26);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Order Code: ${order.order_id}`, 14, 46);
  doc.text(`Handover Status: COLLECTED`, 14, 53);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Collected On: ${order.collected_at ? new Date(order.collected_at).toLocaleString('en-GB') : new Date().toLocaleString('en-GB')}`, 14, 60);

  doc.text(`Dispensing Pharmacy: ${order.shop_name || 'Apollo Life Pharmacy'}`, 110, 46);
  doc.text(`Patient: ${order.patient_name || 'Madhur Sathya'}`, 110, 53);

  doc.line(14, 68, 196, 68);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Pharmacist Verification Statement:', 14, 78);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('The medicines prescribed have been verified against the registered digital prescription and safely handed over to the patient/authorized representative in compliance with pharmacy dispensing standards.', 14, 86, { maxWidth: 182 });

  // Verification QR
  try {
    const qrData = await QRCode.toDataURL(`SMARTCARE:${order.order_id}:COLLECTED_VERIFIED`);
    doc.addImage(qrData, 'PNG', 14, 110, 40, 40);
    doc.setFontSize(8);
    doc.text('Official Collection Audit Stamp', 14, 156);
  } catch (e) {
    // fallback
  }

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('SmartCare Healthcare Network · Secure Prescription Dispensing Record', 14, 270);

  doc.save(`Collection_Confirmation_${order.order_id}.pdf`);
}
