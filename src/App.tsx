/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Calculator as CalcIcon, Settings, Info, ChevronRight, Car, Clock, MapPin, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CarSharingTariff, CalculationInput, CalculationResult, RateUnit, ServiceType } from './types';
import { INITIAL_TARIFFS } from './constants';

export default function App() {
  const [tariffs, setTariffs] = useState<CarSharingTariff[]>([]);
  const [activeTab, setActiveTab] = useState<'calculator' | 'admin'>('calculator');
  const [editingTariffId, setEditingTariffId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<CalculationInput>({
    days: 0,
    hours: 1,
    estimatedKm: 10,
    isAirport: false,
  });

  // Load tariffs from API
  useEffect(() => {
    const fetchTariffs = async () => {
      try {
        const response = await fetch('/api/services');
        const data = await response.json();
        if (data && data.length > 0) {
          setTariffs(data);
        } else {
          // If server returns empty, save initial tariffs to server
          setTariffs(INITIAL_TARIFFS);
          saveTariffs(INITIAL_TARIFFS);
        }
      } catch (e) {
        setTariffs(INITIAL_TARIFFS);
      }
    };
    fetchTariffs();
  }, []);

  // Save tariffs to API
  const saveTariffs = async (newTariffs: CarSharingTariff[]) => {
    setTariffs(newTariffs);
    try {
      await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTariffs),
      });
    } catch (e) {
      console.error("Failed to save tariffs to server", e);
    }
  };

  const resultsByProvider = useMemo(() => {
    const durationMinutes = (inputs.days * 1440) + (inputs.hours * 60);
    const extraKm = (km: number, included: number) => Math.max(0, km - included);

    const allResults = tariffs.map(tariff => {
      let timeCost = 0;
      const unitInMinutes = tariff.unitType === 'hour' ? 60 : 1440;
      const totalUnitMinutes = unitInMinutes * tariff.unitValue;
      
      const extraMinutes = Math.max(0, durationMinutes - totalUnitMinutes);
      
      // Special logic for Enjoy max cost
      if (tariff.providerName === 'Enjoy' && tariff.maxTimeCost && durationMinutes <= 1440) {
        timeCost = Math.min(tariff.unitCost + (extraMinutes * tariff.extraMinutePrice), tariff.maxTimeCost);
      } else if (tariff.providerName === 'Enjoy' && durationMinutes > 1440 && tariff.unitType === 'hour') {
        // Enjoy hourly tariffs not applicable after 24h
        timeCost = Infinity;
      } else if (tariff.providerName === 'E-Vai' && tariff.unitType === 'hour') {
        // E-Vai hourly max 5h
        if (durationMinutes > 300) {
          timeCost = Infinity;
        } else {
          timeCost = Math.ceil(durationMinutes / 60) * tariff.unitCost;
        }
      } else {
        timeCost = tariff.unitCost + (extraMinutes * tariff.extraMinutePrice);
      }

      const kmCost = extraKm(inputs.estimatedKm, tariff.kmIncluded) * tariff.pricePerExtraKm;
      const airportFee = inputs.isAirport ? tariff.airportFee : 0;

      return {
        tariffId: tariff.id,
        providerName: tariff.providerName,
        tariffName: tariff.tariffName,
        totalCost: timeCost + kmCost + tariff.unlockFee + airportFee,
        type: tariff.type,
        breakdown: {
          unlockFee: tariff.unlockFee,
          timeCost,
          kmCost,
          airportFee
        },
        color: tariff.color
      };
    }).filter(r => r.totalCost !== Infinity && r.totalCost >= 0);

    // Group by provider
    const grouped: Record<string, any[]> = {};
    allResults.forEach(res => {
      if (!grouped[res.providerName]) grouped[res.providerName] = [];
      grouped[res.providerName].push(res);
    });

    // Sort each group and take top 2, then sort groups by best price
    return Object.entries(grouped)
      .map(([provider, results]) => ({
        provider,
        results: results.sort((a, b) => a.totalCost - b.totalCost).slice(0, 2)
      }))
      .sort((a, b) => a.results[0].totalCost - b.results[0].totalCost);
  }, [tariffs, inputs]);

  const addTariff = () => {
    // Fallback for crypto.randomUUID() in non-secure contexts (HTTP)
    const newId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID() 
      : Date.now().toString(36) + Math.random().toString(36).substring(2);
      
    const newTariff: CarSharingTariff = {
      id: newId,
      providerName: "Nuovo Gestore",
      tariffName: "Nuova Tariffa",
      unitType: "hour",
      unitValue: 1,
      unitCost: 0.25,
      extraMinutePrice: 0.25,
      kmIncluded: 0,
      pricePerExtraKm: 0.29,
      unlockFee: 0,
      airportFee: 0,
      maxTimeCost: 0,
      color: "#" + Math.floor(Math.random()*16777215).toString(16),
      type: "free-floating"
    };
    saveTariffs([...tariffs, newTariff]);
    setEditingTariffId(newId);
  };

  const updateTariff = (id: string, updates: Partial<CarSharingTariff>) => {
    saveTariffs(tariffs.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTariff = (id: string) => {
    saveTariffs(tariffs.filter(t => t.id !== id));
    if (editingTariffId === id) setEditingTariffId(null);
  };

  const editingTariff = tariffs.find(t => t.id === editingTariffId);

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] font-sans">
      {/* Header */}
      <header className="bg-[#1e293b] border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Car className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Dàgdègàs!</h1>
          </div>
          <nav className="flex bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'calculator' ? 'bg-slate-700 shadow-sm text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Calcolatore
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'admin' ? 'bg-slate-700 shadow-sm text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Tariffe
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {activeTab === 'calculator' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Inputs */}
            <section className="md:col-span-1 space-y-6">
              <div className="bg-[#1e293b] p-6 rounded-2xl shadow-sm border border-slate-800">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
                  <CalcIcon className="w-5 h-5 text-blue-500" />
                  Parametri Viaggio
                </h2>
                
                <div className="space-y-4">
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Durata Totale</span>
                    <span className="text-sm font-bold text-blue-400">
                      {inputs.days > 0 && `${inputs.days}g `}
                      {inputs.hours > 0 && `${inputs.hours}h `}
                      {inputs.days === 0 && inputs.hours === 0 && "0h"}
                      <span className="text-slate-500 font-normal ml-1">
                        ({(inputs.days * 1440) + (inputs.hours * 60)} min)
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Giorni</label>
                      <input
                        type="number"
                        min="0"
                        value={inputs.days}
                        onChange={e => setInputs({ ...inputs, days: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ore</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={inputs.hours}
                        onChange={e => setInputs({ ...inputs, hours: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Km Stimati</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="number"
                        value={inputs.estimatedKm}
                        onChange={e => setInputs({ ...inputs, estimatedKm: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                    <span className="text-sm font-medium text-slate-300">Aeroporto</span>
                    <button
                      onClick={() => setInputs({ ...inputs, isAirport: !inputs.isAirport })}
                      className={`w-12 h-6 rounded-full transition-colors relative ${inputs.isAirport ? 'bg-blue-600' : 'bg-slate-600'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${inputs.isAirport ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-800/30">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-400 shrink-0" />
                  <p className="text-xs text-blue-200/70 leading-relaxed">
                    I prezzi includono carburante e assicurazione. I supplementi aeroportuali sono applicati se selezionati.
                  </p>
                </div>
              </div>
            </section>

            {/* Results */}
            <section className="md:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold px-2 text-white">Soluzioni Ordinate per Costo</h2>
              <div className="space-y-6">
                {resultsByProvider.map(({ provider, results: providerResults }) => (
                  <div key={provider} className="bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                    <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: providerResults[0].color }} />
                        <h3 className="font-bold text-xl text-white">{provider}</h3>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Top 2 Tariffe</span>
                    </div>
                    <div className="divide-y divide-slate-800">
                      {providerResults.map((result, idx) => (
                        <div key={result.tariffId} className={`p-6 flex justify-between items-center transition-colors hover:bg-slate-800/20 ${idx === 0 ? 'bg-blue-500/5' : ''}`}>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-100">{result.tariffName}</span>
                              {idx === 0 && (
                                <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Best</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 font-bold uppercase">
                              {result.breakdown.unlockFee > 0 && <span>Sblocco: €{result.breakdown.unlockFee.toFixed(2)}</span>}
                              <span>Tempo: €{result.breakdown.timeCost.toFixed(2)}</span>
                              <span>Km: €{result.breakdown.kmCost.toFixed(2)}</span>
                              {result.breakdown.airportFee > 0 && <span>Aeroporto: €{result.breakdown.airportFee.toFixed(2)}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black text-white">
                              €{result.totalCost.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Totale Stimato</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {resultsByProvider.length === 0 && (
                  <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700">
                    <p className="text-slate-500 font-medium">Nessuna tariffa applicabile per questa durata.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          /* Admin Panel - Dark Mode */
          <>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">Gestione Tariffe</h2>
                  <p className="text-slate-400 text-sm">Visualizza e modifica le tariffe disponibili.</p>
                </div>
                <button
                  onClick={addTariff}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Nuova Tariffa
                </button>
              </div>

              <div className="bg-[#1e293b] rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/50 border-b border-slate-800">
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Provider</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tariffa</th>
                        <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {tariffs.map(tariff => (
                        <tr 
                          key={tariff.id} 
                          onClick={() => setEditingTariffId(tariff.id)}
                          className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-8 rounded-full" style={{ backgroundColor: tariff.color }} />
                              <span className="font-bold text-slate-100">{tariff.providerName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-400 font-medium">{tariff.tariffName}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 transition-colors ml-auto" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {tariffs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-400 font-medium">Nessuna tariffa configurata.</p>
                </div>
              )}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
              {editingTariff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setEditingTariffId(null)}
                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-[#1e293b] rounded-3xl shadow-2xl overflow-hidden border border-slate-800"
                  >
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: editingTariff.color }}>
                          <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-white">Modifica Tariffa</h3>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{editingTariff.providerName}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingTariffId(null)}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-slate-500" />
                      </button>
                    </div>

                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nome Gestore</label>
                          <input
                            type="text"
                            value={editingTariff.providerName}
                            onChange={e => updateTariff(editingTariff.id, { providerName: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Nome Tariffa</label>
                          <input
                            type="text"
                            value={editingTariff.tariffName}
                            onChange={e => updateTariff(editingTariff.id, { tariffName: e.target.value })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tipo Servizio</label>
                          <select
                            value={editingTariff.type}
                            onChange={e => updateTariff(editingTariff.id, { type: e.target.value as ServiceType })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-white"
                          >
                            <option value="free-floating">Free Floating</option>
                            <option value="station-based">Station Based</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Tipo Unità</label>
                          <select
                            value={editingTariff.unitType}
                            onChange={e => updateTariff(editingTariff.id, { unitType: e.target.value as RateUnit })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-white"
                          >
                            <option value="hour">Ore</option>
                            <option value="day">Giorni</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Quantità Unità</label>
                          <input
                            type="number"
                            value={editingTariff.unitValue}
                            onChange={e => updateTariff(editingTariff.id, { unitValue: parseFloat(e.target.value) || 1 })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Costo Base (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingTariff.unitCost}
                            onChange={e => updateTariff(editingTariff.id, { unitCost: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Minuto Extra (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingTariff.extraMinutePrice}
                            onChange={e => updateTariff(editingTariff.id, { extraMinutePrice: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Km Inclusi</label>
                          <input
                            type="number"
                            value={editingTariff.kmIncluded}
                            onChange={e => updateTariff(editingTariff.id, { kmIncluded: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Costo Km Extra (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingTariff.pricePerExtraKm}
                            onChange={e => updateTariff(editingTariff.id, { pricePerExtraKm: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Costo Sblocco (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingTariff.unlockFee}
                            onChange={e => updateTariff(editingTariff.id, { unlockFee: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Supplemento Aeroporto (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingTariff.airportFee}
                            onChange={e => updateTariff(editingTariff.id, { airportFee: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Colore Brand</label>
                          <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl">
                            <input
                              type="color"
                              value={editingTariff.color}
                              onChange={e => updateTariff(editingTariff.id, { color: e.target.value })}
                              className="w-8 h-8 rounded-lg border-none cursor-pointer overflow-hidden bg-transparent"
                            />
                            <span className="text-xs font-mono text-slate-500 uppercase font-bold">{editingTariff.color}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-800/50 border-t border-slate-800 flex justify-between items-center">
                      <button
                        onClick={() => deleteTariff(editingTariff.id)}
                        className="flex items-center gap-2 text-red-400 hover:text-red-300 font-bold text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Elimina Tariffa
                      </button>
                      <button
                        onClick={() => setEditingTariffId(null)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                      >
                        Salva e Chiudi
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-12 border-t border-slate-800 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-slate-500 text-xs font-medium uppercase tracking-widest">
          <p>© 2026 Dàgdègàs! Milano Car Sharing</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-slate-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Termini</a>
            <a href="#" className="hover:text-slate-300 transition-colors">Supporto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
