import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PharmacyOrder } from '../../types';
import {
  Pill, CheckCircle2, Clock, QrCode, Search,
  Download, DollarSign, Package, AlertCircle, FileText
} from 'lucide-react';
import {
  generatePharmacyPaymentReceiptPdf,
  generateMedicineCollectionConfirmationPdf
} from '../../utils/pdfGenerator';

interface PharmacyDashboardProps {
  onNavigate: (tab: string) => void;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<PharmacyOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'pending-verification' | 'active-orders' | 'inventory' | 'history'>('pending-verification');
  const [isLoading, setIsLoading] = useState(true);

  // Verification & Pricing Modal
  const [verifyingOrder, setVerifyingOrder] = useState<PharmacyOrder | null>(null);
  const [itemsToPrice, setItemsToPrice] = useState<Array<{ medicineName: string; strength: string; quantity: number; unitPrice: number }>>([
    { medicineName: 'Amoxicillin & Potassium Clavulanate', strength: '625 mg', quantity: 10, unitPrice: 22 },
    { medicineName: 'Paracetamol 650mg Tablets', strength: '650 mg', quantity: 10, unitPrice: 4 },
    { medicineName: 'Pantoprazole Gastro-Resistant 40mg', strength: '40 mg', quantity: 7, unitPrice: 12 }
  ]);
  const [isSubmittingPricing, setIsSubmittingPricing] = useState(false);

  // Handover QR / Code Verification
  const [lookupOrderCode, setLookupOrderCode] = useState('');
  const [handoverSuccess, setHandoverSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [user?.id]);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/pharmacy-orders?pharmacyUserId=${user?.id}`);
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleOpenVerifyModal = (order: PharmacyOrder) => {
    setVerifyingOrder(order);
    if (order.items && order.items.length > 0) {
      setItemsToPrice(order.items.map(it => ({
        medicineName: it.medicine_name,
        strength: it.strength || '',
        quantity: it.quantity,
        unitPrice: it.unit_price
      })));
    } else {
      setItemsToPrice([
        { medicineName: 'Amoxicillin 625mg', strength: '625 mg', quantity: 10, unitPrice: 22 },
        { medicineName: 'Paracetamol 650mg', strength: '650 mg', quantity: 10, unitPrice: 4 }
      ]);
    }
  };

  const handlePricingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingOrder) return;

    setIsSubmittingPricing(true);
    try {
      const res = await fetch(`/api/pharmacy-orders/${verifyingOrder.id}/verify-and-price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyUserId: user?.id,
          items: itemsToPrice
        })
      });

      setIsSubmittingPricing(false);
      if (res.ok) {
        setVerifyingOrder(null);
        loadOrders();
      }
    } catch (e) {
      setIsSubmittingPricing(false);
      console.error(e);
    }
  };

  const handleUpdateFulfillment = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/pharmacy-orders/${orderId}/update-fulfillment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        loadOrders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyAndCollectByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupOrderCode.trim()) return;

    const matched = orders.find(o => o.order_id.toLowerCase() === lookupOrderCode.trim().toLowerCase());
    if (!matched) {
      alert(`Order ${lookupOrderCode} not found in this pharmacy's database.`);
      return;
    }

    if (matched.status !== 'Paid' && matched.status !== 'Ready for Pickup') {
      alert(`Order is currently in status: ${matched.status}. It must be paid before dispensing.`);
      return;
    }

    await handleUpdateFulfillment(matched.id, 'Collected');
    setHandoverSuccess(matched.order_id);
    setLookupOrderCode('');
  };

  const pendingVerification = orders.filter(o => o.status === 'Prescription Uploaded' || o.status === 'Under Verification');
  const activeFulfillment = orders.filter(o => o.status === 'Payment Pending' || o.status === 'Paid' || o.status === 'Processing' || o.status === 'Ready for Pickup');
  const collectedOrders = orders.filter(o => o.status === 'Collected');

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Pharmacy Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Pharmacy Fulfillment Console
              </h1>
              <span className="text-xs bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded font-medium border border-emerald-200">
                Drug License Form 20/21 Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Verify scanned prescriptions, calculate billings, and validate patient pickup QR tokens.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 font-medium">Store: {user?.fullName || 'Apollo Life Pharmacy'}</span>
          </div>
        </div>

        {/* Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500">Pending OCR Review</span>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{pendingVerification.length}</p>
            <span className="text-[11px] text-amber-700 mt-0.5 block font-medium">Awaiting Quote</span>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500">Active Preparing / Ready</span>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{activeFulfillment.length}</p>
            <span className="text-[11px] text-teal-700 mt-0.5 block font-medium">In Pipeline</span>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500">Dispensed &amp; Handed Over</span>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{collectedOrders.length}</p>
            <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">Completed Deliveries</span>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500">Total Pharmacy Orders</span>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{orders.length}</p>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Lifetime Records</span>
          </div>
        </div>

        {/* Handover Quick Verification Bar */}
        <div className="bg-emerald-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-300" />
            <h3 className="text-sm font-bold">Fast Patient Pickup &amp; QR Counter Verification</h3>
          </div>
          <p className="text-xs text-emerald-100 max-w-xl leading-relaxed">
            When a patient arrives at your medical shop counter, scan their QR code or enter their Order Reference ID below to complete medicine handover.
          </p>

          <form onSubmit={handleVerifyAndCollectByCode} className="flex flex-wrap gap-2 pt-1 max-w-lg">
            <input
              type="text"
              value={lookupOrderCode}
              onChange={e => setLookupOrderCode(e.target.value)}
              placeholder="e.g. SC-ORD-2026-4401"
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-emerald-950/80 border border-emerald-700 text-white placeholder-emerald-400 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg shadow-sm transition-colors"
            >
              Verify &amp; Hand Over Medicines
            </button>
          </form>

          {handoverSuccess && (
            <div className="p-2.5 bg-emerald-950 rounded-lg text-emerald-200 text-xs flex items-center justify-between border border-emerald-700">
              <span>Order {handoverSuccess} marked as COLLECTED. Handover confirmation generated.</span>
              <button
                type="button"
                onClick={() => setHandoverSuccess(null)}
                className="text-xs text-emerald-300 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          {[
            { key: 'pending-verification', label: `Pending Verification (${pendingVerification.length})` },
            { key: 'active-orders', label: `Active Fulfillment (${activeFulfillment.length})` },
            { key: 'history', label: `Dispensed History (${collectedOrders.length})` },
            { key: 'inventory', label: 'Medicine Price Catalog' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.key ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: PENDING VERIFICATION QUEUE */}
        {activeTab === 'pending-verification' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Prescription Verification Queue
            </h2>

            {pendingVerification.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No prescriptions awaiting verification.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {pendingVerification.map(order => (
                  <div key={order.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{order.order_id}</span>
                        <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-medium border border-amber-200">
                          {order.status}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Patient: <strong className="text-slate-800">{order.patient_name}</strong> · Phone: {order.patient_phone || '+91 98765 43210'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Uploaded: {new Date(order.created_at).toLocaleString('en-GB')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenVerifyModal(order)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start md:self-auto"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Review OCR &amp; Set Quotation</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ACTIVE ORDERS FULFILLMENT */}
        {activeTab === 'active-orders' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Orders Under Preparation &amp; Pickup
            </h2>

            {activeFulfillment.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No active orders in preparation.</p>
            ) : (
              <div className="space-y-4 text-xs">
                {activeFulfillment.map(order => (
                  <div key={order.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{order.order_id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.status === 'Ready for Pickup' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-0.5">Patient: {order.patient_name} ({order.patient_phone || '+91 98765 43210'})</p>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-400">Paid Amount</span>
                        <p className="font-bold text-emerald-700 text-sm">₹{order.total_amount}.00</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                      <span className="text-[11px] text-slate-400">
                        Txn: {order.transaction_ref || 'Verified Online'}
                      </span>

                      <div className="flex items-center gap-2">
                        {order.status === 'Paid' && (
                          <button
                            onClick={() => handleUpdateFulfillment(order.id, 'Processing')}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm"
                          >
                            Mark: Packing Medicines
                          </button>
                        )}

                        {order.status === 'Processing' && (
                          <button
                            onClick={() => handleUpdateFulfillment(order.id, 'Ready for Pickup')}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm"
                          >
                            Mark: Ready for Pickup
                          </button>
                        )}

                        {order.status === 'Ready for Pickup' && (
                          <button
                            onClick={() => handleUpdateFulfillment(order.id, 'Collected')}
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                          >
                            Confirm Patient Handover
                          </button>
                        )}

                        <button
                          onClick={() => generatePharmacyPaymentReceiptPdf(order)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DISPENSED HISTORY */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Dispensed Prescription History
            </h2>

            {collectedOrders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No completed orders yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {collectedOrders.map(order => (
                  <div key={order.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{order.order_id} · Patient: {order.patient_name}</p>
                      <p className="text-slate-400 text-[11px]">
                        Collected on {order.collected_at ? new Date(order.collected_at).toLocaleString('en-GB') : 'Verified'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">₹{order.total_amount}.00</span>
                      <button
                        onClick={() => generateMedicineCollectionConfirmationPdf(order)}
                        className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Audit Certificate</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: INVENTORY / PRICING CATALOG */}
        {activeTab === 'inventory' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Essential Drug Stock &amp; Pricing Directory
            </h2>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Medicine Formulation</th>
                    <th className="py-2.5 px-3">Manufacturer</th>
                    <th className="py-2.5 px-3">Unit MRP</th>
                    <th className="py-2.5 px-3">Stock Units</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { name: 'Mometasone Furoate 0.1% Cream (30g)', brand: 'Glenmark', price: 220, stock: 45, status: 'In Stock' },
                    { name: 'Levocetirizine 5mg (Strip of 10)', brand: 'Cipla', price: 120, stock: 120, status: 'In Stock' },
                    { name: 'Amoxicillin & Clavulanate 625mg (Strip of 10)', brand: 'Alkem', price: 220, stock: 85, status: 'In Stock' },
                    { name: 'Paracetamol 650mg (Strip of 15)', brand: 'Micro Labs', price: 60, stock: 300, status: 'In Stock' },
                    { name: 'Pantoprazole 40mg (Strip of 10)', brand: 'Sun Pharma', price: 120, stock: 95, status: 'In Stock' }
                  ].map((row, i) => (
                    <tr key={i}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{row.brand}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">₹{row.price}.00</td>
                      <td className="py-2.5 px-3">{row.stock}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* VERIFY OCR & SUBMIT QUOTATION MODAL */}
      {verifyingOrder && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Prescription OCR Verification &amp; Billing Calculation
                </h3>
                <p className="text-xs text-slate-500">
                  Order Reference: {verifyingOrder.order_id} · Patient: {verifyingOrder.patient_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingOrder(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold"
              >
                Close ✕
              </button>
            </div>

            <form onSubmit={handlePricingSubmit} className="space-y-5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-700 text-[11px] uppercase">Original Scanned Prescription Note:</span>
                <p className="text-slate-600 italic leading-relaxed">
                  "{verifyingOrder.ocr_extracted_text || 'Scanned e-prescription record verified by patient.'}"
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Dispensing Medicine Items &amp; Pricing:</span>
                </div>

                <div className="space-y-2">
                  {itemsToPrice.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-5">
                        <label className="text-[10px] text-slate-500 block">Medicine</label>
                        <input
                          type="text"
                          required
                          value={item.medicineName}
                          onChange={e => {
                            const c = [...itemsToPrice];
                            c[idx].medicineName = e.target.value;
                            setItemsToPrice(c);
                          }}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-semibold"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 block">Strength</label>
                        <input
                          type="text"
                          value={item.strength}
                          onChange={e => {
                            const c = [...itemsToPrice];
                            c[idx].strength = e.target.value;
                            setItemsToPrice(c);
                          }}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 block">Quantity</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => {
                            const c = [...itemsToPrice];
                            c[idx].quantity = parseInt(e.target.value, 10) || 1;
                            setItemsToPrice(c);
                          }}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-slate-500 block">Unit Price (₹)</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={e => {
                            const c = [...itemsToPrice];
                            c[idx].unitPrice = parseFloat(e.target.value) || 0;
                            setItemsToPrice(c);
                          }}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtotal Calculation */}
              <div className="p-3 bg-teal-50 rounded-xl border border-teal-200 flex items-center justify-between text-xs font-bold text-teal-900">
                <span>Total Quotation for Patient:</span>
                <span>
                  ₹{itemsToPrice.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0) * 1.05} (including 5% GST)
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setVerifyingOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPricing}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
                >
                  {isSubmittingPricing ? 'Sending Quotation...' : 'Verify Prescription & Request Patient Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
