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
          setTariffs(INITIAL_TARIFFS);
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

  const results = useMemo(() => {
    const durationMinutes = (inputs.days * 1440) + (inputs.hours * 60);
    const extraKm = (km: number, included: number) => Math.max(0, km - included);

    return tariffs
      .map(tariff => {
        let timeCost = 0;
        const unitInMinutes = tariff.unitType === 'hour' ? 60 : 1440;
        const totalUnitMinutes = unitInMinutes * tariff.unitValue;
        
        // Base cost is always the unit cost
        // Extra minutes are calculated if duration exceeds base duration
        const extraMinutes = Math.max(0, durationMinutes - totalUnitMinutes);
        timeCost = tariff.unitCost + (extraMinutes * tariff.extraMinutePrice);

        const kmCost = extraKm(inputs.estimatedKm, tariff.kmIncluded) * tariff.pricePerExtraKm;

        return {
          tariffId: tariff.id,
          providerName: tariff.providerName,
          tariffName: tariff.tariffName,
          totalCost: timeCost + kmCost + tariff.unlockFee,
          type: tariff.type,
          breakdown: {
            unlockFee: tariff.unlockFee,
            timeCost,
            kmCost
          },
          color: tariff.color
        };
      }).sort((a, b) => a.totalCost - b.totalCost);
  }, [tariffs, inputs]);

  const addTariff = () => {
    const newId = crypto.randomUUID();
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
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Car className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Dàgdègàs!</h1>
          </div>
          <nav className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'calculator' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Calcolatore
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'admin' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
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
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <CalcIcon className="w-5 h-5 text-blue-600" />
                  Parametri Viaggio
                </h2>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Durata Totale</span>
                    <span className="text-sm font-bold text-blue-600">
                      {inputs.days > 0 && `${inputs.days}g `}
                      {inputs.hours > 0 && `${inputs.hours}h `}
                      {inputs.days === 0 && inputs.hours === 0 && "0h"}
                      <span className="text-gray-400 font-normal ml-1">
                        ({(inputs.days * 1440) + (inputs.hours * 60)} min)
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Giorni</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          value={inputs.days}
                          onChange={e => setInputs({ ...inputs, days: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Ore</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="23"
                          value={inputs.hours}
                          onChange={e => setInputs({ ...inputs, hours: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Km Stimati</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        value={inputs.estimatedKm}
                        onChange={e => setInputs({ ...inputs, estimatedKm: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0" />
                  <p className="text-sm text-blue-800 leading-relaxed">
                    Le tariffe <b>Station Based</b> richiedono il ritiro e la riconsegna nello stesso punto. Le tariffe <b>Free Floating</b> permettono di lasciare l'auto ovunque nell'area operativa.
                  </p>
                </div>
              </div>
            </section>

            {/* Results */}
            <section className="md:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold px-2">Migliori Tariffe</h2>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {results.map((result, index) => (
                    <motion.div
                      key={result.tariffId}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className={`relative overflow-hidden p-5 rounded-2xl shadow-sm border-2 transition-all ${
                        result.type === 'station-based' ? 'bg-gray-100 border-gray-200' : 'bg-white border-transparent'
                      } ${index === 0 ? 'ring-4 ring-blue-50 !border-blue-500' : ''}`}
                    >
                      {index === 0 && (
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-widest">
                          Migliore
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-inner"
                            style={{ backgroundColor: result.color }}
                          >
                            <Car className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg leading-tight">{result.providerName}</h3>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter ${
                                result.type === 'station-based' ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-600'
                              }`}>
                                {result.type === 'station-based' ? 'Station Based' : 'Free Floating'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 font-medium">{result.tariffName}</p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400 font-bold uppercase mt-1">
                              {result.breakdown.unlockFee > 0 && <span>Sblocco: €{result.breakdown.unlockFee.toFixed(2)}</span>}
                              <span>Tempo: €{result.breakdown.timeCost.toFixed(2)}</span>
                              <span>Km: €{result.breakdown.kmCost.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-gray-900">
                            €{result.totalCost.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Totale Stimato</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {results.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                    <p className="text-gray-400 font-medium">Nessuna tariffa trovata con i filtri selezionati.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          /* Admin Panel */
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Gestione Tariffe</h2>
                <p className="text-gray-500 text-sm">Visualizza e modifica le tariffe disponibili.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addTariff}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-200 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Nuova Tariffa
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Provider</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tariffa</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tariffs.map(tariff => (
                      <tr 
                        key={tariff.id} 
                        onClick={() => setEditingTariffId(tariff.id)}
                        className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-8 rounded-full" style={{ backgroundColor: tariff.color }} />
                            <span className="font-bold text-gray-900">{tariff.providerName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 font-medium">{tariff.tariffName}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {tariffs.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 font-medium">Nessuna tariffa configurata.</p>
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
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
                  >
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: editingTariff.color }}>
                          <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xl">Modifica Tariffa</h3>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{editingTariff.providerName}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingTariffId(null)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>

                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Nome Gestore</label>
                          <input
                            type="text"
                            value={editingTariff.providerName}
                            onChange={e => updateTariff(editingTariff.id, { providerName: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Nome Tariffa</label>
                          <input
                            type="text"
                            value={editingTariff.tariffName}
                            onChange={e => updateTariff(editingTariff.id, { tariffName: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Tipo Servizio</label>
                          <select
                            value={editingTariff.type}
                            onChange={e => updateTariff(editingTariff.id, { type: e.target.value as ServiceType })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                          >
                            <option value="free-floating">Free Floating</option>
                            <option value="station-based">Station Based</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Tipo Unità</label>
                          <select
                            value={editingTariff.unitType}
                            onChange={e => updateTariff(editingTariff.id, { unitType: e.target.value as RateUnit })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                          >
                            <option value="hour">Ore</option>
                            <option value="day">Giorni</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Quantità Unità</label>
                          <input
                            type="number"
                            value={editingTariff.unitValue}
                            onChange={e => updateTariff(editingTariff.id, { unitValue: parseFloat(e.target.value) || 1 })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Costo Base (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingTariff.unitCost}
                            onChange={e => updateTariff(editingTariff.id, { unitCost: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Minuto Extra (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingTariff.extraMinutePrice}
                            onChange={e => updateTariff(editingTariff.id, { extraMinutePrice: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Km Inclusi</label>
                          <input
                            type="number"
                            value={editingTariff.kmIncluded}
                            onChange={e => updateTariff(editingTariff.id, { kmIncluded: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Costo Km Extra (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingTariff.pricePerExtraKm}
                            onChange={e => updateTariff(editingTariff.id, { pricePerExtraKm: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Costo Sblocco (€)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editingTariff.unlockFee}
                            onChange={e => updateTariff(editingTariff.id, { unlockFee: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Colore Brand</label>
                          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                            <input
                              type="color"
                              value={editingTariff.color}
                              onChange={e => updateTariff(editingTariff.id, { color: e.target.value })}
                              className="w-8 h-8 rounded-lg border-none cursor-pointer overflow-hidden bg-transparent"
                            />
                            <span className="text-xs font-mono text-gray-400 uppercase font-bold">{editingTariff.color}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                      <button
                        onClick={() => deleteTariff(editingTariff.id)}
                        className="flex items-center gap-2 text-red-500 hover:text-red-600 font-bold text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Elimina Tariffa
                      </button>
                      <button
                        onClick={() => setEditingTariffId(null)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-200 active:scale-95"
                      >
                        Salva e Chiudi
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-12 border-t border-gray-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-gray-400 text-xs font-medium uppercase tracking-widest">
          <p>© 2026 Milano Car Sharing Comparator</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-gray-600 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Termini</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Supporto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
