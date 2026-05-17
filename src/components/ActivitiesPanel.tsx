import React from 'react';
import { Wrench, Droplets, Refrigerator, ShoppingCart } from 'lucide-react';
import { deleteField } from 'firebase/firestore';
import { AppConfig } from '../hooks/useWingConfig';
import { useLang } from '../LanguageContext';

const ROOMS = ['101', '102', '103', '104', '105', 'Coletivo'];

interface ActivitiesPanelProps {
  config: AppConfig;
  isRep: boolean;
  updateConfig: (updates: Partial<AppConfig>) => void;
  calcWeeklyOffset: (room: string) => number;
  calcMonthlyOffset: (room: string) => number;
  currentCleaningResponsible: string;
  currentMaintenanceResponsible: string;
  currentFridgeResponsible: string;
  currentBuyingProductsResponsible: string;
  absentRooms: string[];
  onToggleAbsent: (room: string) => void;
}

interface ActivityCardProps {
  colorBase: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  selectBg: string;
  selectBorder: string;
  selectFocus: string;
  isRep: boolean;
  value: string;
  autoLabel: string;
  onChange: (val: string) => void;
  responsibleLabel: string;
  roomLabel: (r: string) => string;
}

function ActivityCard({
  colorBase, icon, title, description, textColor, bgColor, borderColor,
  selectBg, selectBorder, selectFocus, isRep, value, autoLabel, onChange,
  responsibleLabel, roomLabel,
}: ActivityCardProps) {
  return (
    <div className={`${bgColor} ${borderColor} rounded-xl p-4 shadow-sm relative overflow-hidden group`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${colorBase}`} />
      <div className="flex items-start gap-4">
        <div className={`${selectBg} p-2.5 rounded-lg shrink-0`}>{icon}</div>
        <div className="flex-1">
          <h3 className={`font-bold ${textColor} text-lg mb-1`}>{title}</h3>
          <p className={`${textColor.replace('100', '300/70')} text-xs mb-3`}>{description}</p>
          {isRep ? (
            <div className="flex flex-col gap-1.5 mt-1">
              <label className={`text-xs font-semibold ${textColor.replace('100', '400/80')} uppercase tracking-wider`}>
                {responsibleLabel}
              </label>
              <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className={`w-full ${selectBg} ${selectBorder} rounded-md p-2 ${textColor} outline-none ${selectFocus} transition-colors`}
              >
                <option value="">{autoLabel}</option>
                {['101','102','103','104','105','Coletivo'].map(r => (
                  <option key={r} value={r}>{roomLabel(r)}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className={`text-sm font-semibold ${textColor} ${selectBg} inline-block px-3 py-1.5 rounded-md ${borderColor} border`}>
              {autoLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function roomLabel(room: string, t: { room: string; coletivo: string; auto: string }, auto = false): string {
  const label = room === 'Coletivo' ? t.coletivo : `${t.room} ${room}`;
  return auto ? `${label} (${t.auto})` : label;
}

export function ActivitiesPanel({
  config, isRep, updateConfig, calcWeeklyOffset, calcMonthlyOffset,
  currentCleaningResponsible, currentMaintenanceResponsible,
  currentFridgeResponsible, currentBuyingProductsResponsible,
  absentRooms, onToggleAbsent,
}: ActivitiesPanelProps) {
  const { t } = useLang();
  const rl = (room: string, auto = false) => roomLabel(room, t, auto);
  return (
    <div className="bg-neutral-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-700 overflow-hidden flex-1 flex flex-col">
      <div className="bg-neutral-800/80 px-5 py-4 border-b border-neutral-700 flex items-center space-x-2">
        <Wrench className="h-5 w-5 text-neutral-400" />
        <h2 className="text-lg font-semibold text-neutral-200 uppercase tracking-wider">{t.activities}</h2>
      </div>

      <div className="p-5 flex-1 bg-neutral-900/30 flex flex-col gap-4">
        <ActivityCard
          colorBase="bg-sky-500"
          icon={<Droplets className="w-5 h-5 text-sky-400" />}
          title={t.cleaning}
          description={t.cleaningDesc}
          textColor="text-sky-100"
          bgColor="bg-sky-950/40"
          borderColor="border-sky-800/50"
          selectBg="bg-sky-950"
          selectBorder="border border-sky-800"
          selectFocus="focus:border-sky-500"
          isRep={isRep}
          value={config.cleaningResponsible ?? ''}
          autoLabel={rl(currentCleaningResponsible, !config.cleaningResponsible)}
          responsibleLabel={t.responsibleRoom}
          roomLabel={rl}
          onChange={val => {
            if (val) updateConfig({ 
              cleaningResponsible: deleteField() as any,
              weeklyRotationOffset: calcWeeklyOffset(val) 
            });
            else updateConfig({ cleaningResponsible: deleteField() as any });
          }}
        />

        <ActivityCard
          colorBase="bg-amber-500"
          icon={<Wrench className="w-5 h-5 text-amber-400" />}
          title={t.maintenance}
          description={t.maintenanceDesc}
          textColor="text-amber-100"
          bgColor="bg-amber-950/40"
          borderColor="border-amber-800/50"
          selectBg="bg-amber-950"
          selectBorder="border border-amber-800"
          selectFocus="focus:border-amber-500"
          isRep={isRep}
          value={config.maintenanceResponsible ?? ''}
          autoLabel={rl(currentMaintenanceResponsible, !config.maintenanceResponsible)}
          responsibleLabel={t.responsibleRoom}
          roomLabel={rl}
          onChange={val => {
            if (val) updateConfig({ 
              maintenanceResponsible: deleteField() as any,
              weeklyRotationOffset: calcWeeklyOffset(val) 
            });
            else updateConfig({ maintenanceResponsible: deleteField() as any });
          }}
        />

        <ActivityCard
          colorBase="bg-teal-500"
          icon={<Refrigerator className="w-5 h-5 text-teal-400" />}
          title={t.fridgeCleaning}
          description={t.fridgeCleaningDesc}
          textColor="text-teal-100"
          bgColor="bg-teal-950/40"
          borderColor="border-teal-800/50"
          selectBg="bg-teal-950"
          selectBorder="border border-teal-800"
          selectFocus="focus:border-teal-500"
          isRep={isRep}
          value={config.fridgeCleaningResponsible ?? ''}
          autoLabel={rl(currentFridgeResponsible, !config.fridgeCleaningResponsible)}
          responsibleLabel={t.responsibleRoom}
          roomLabel={rl}
          onChange={val => {
            if (val) updateConfig({ 
              fridgeCleaningResponsible: deleteField() as any,
              monthlyRotationOffset: calcMonthlyOffset(val) 
            });
            else updateConfig({ fridgeCleaningResponsible: deleteField() as any });
          }}
        />

        <ActivityCard
          colorBase="bg-pink-500"
          icon={<ShoppingCart className="w-5 h-5 text-pink-400" />}
          title={t.buyingProducts}
          description={t.buyingProductsDesc}
          textColor="text-pink-100"
          bgColor="bg-pink-950/40"
          borderColor="border-pink-800/50"
          selectBg="bg-pink-950"
          selectBorder="border border-pink-800"
          selectFocus="focus:border-pink-500"
          isRep={isRep}
          value={config.buyingProductsResponsible ?? ''}
          autoLabel={rl(currentBuyingProductsResponsible, !config.buyingProductsResponsible)}
          responsibleLabel={t.responsibleRoom}
          roomLabel={rl}
          onChange={val => {
            if (val) updateConfig({ 
              buyingProductsResponsible: deleteField() as any,
              monthlyRotationOffset: calcMonthlyOffset(val) 
            });
            else updateConfig({ buyingProductsResponsible: deleteField() as any });
          }}
        />

        {/* ── Quartos Ausentes ── */}
        <div className="border-t border-neutral-700/60 pt-4 mt-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🚪</span>
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">{t.absentRooms}</h3>
          </div>
          <p className="text-[11px] text-neutral-500 mb-3 leading-snug">
            {isRep ? t.absentRoomsDescRep : t.absentRoomsDescResident}
          </p>
          <div className="flex flex-wrap gap-2">
            {['101', '102', '103', '104', '105'].map(room => {
              const isAbsent = absentRooms.includes(room);
              return (
                <button
                  key={room}
                  onClick={() => isRep && onToggleAbsent(room)}
                  disabled={!isRep}
                  title={isRep ? (isAbsent ? t.markPresent.replace('{room}', room) : t.markAbsent.replace('{room}', room)) : ''}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    isAbsent
                      ? 'bg-orange-900/40 border-orange-600/60 text-orange-300 shadow-sm'
                      : 'bg-neutral-800 border-neutral-600 text-neutral-400'
                  } ${isRep ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}`}
                >
                  {isAbsent && <span className="text-[10px]">✈</span>}
                  <span className={isAbsent ? 'line-through opacity-70' : ''}>Q{room}</span>
                  {isAbsent && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-orange-500 rounded-full flex items-center justify-center text-[7px] text-white font-black leading-none">!</span>
                  )}
                </button>
              );
            })}
          </div>
          {absentRooms.length > 0 && (
            <p className="text-[10px] text-orange-400/70 mt-2 italic">
              {absentRooms.length === 1
                ? t.absentOne.replace('{rooms}', absentRooms[0])
                : t.absentMany.replace('{rooms}', absentRooms.join(', Q'))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
