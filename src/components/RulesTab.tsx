import React, { useState } from 'react';
import { Plus, Trash2, Edit2, CheckSquare } from 'lucide-react';
import { AppConfig, RuleBlock } from '../hooks/useWingConfig';
import { useLang } from '../LanguageContext';

interface RulesTabProps {
  config: AppConfig;
  isRep: boolean;
  updateConfig: (updates: Partial<AppConfig>) => void;
  currentRuleBlocks: RuleBlock[];
}

export function RulesTab({ config, isRep, updateConfig, currentRuleBlocks }: RulesTabProps) {
  const [editingBlockTitle, setEditingBlockTitle] = useState<string | null>(null);
  const [editBlockTitleValue, setEditBlockTitleValue] = useState('');
  const [addingRuleToBlock, setAddingRuleToBlock] = useState<string | null>(null);
  const [addingRuleDesc, setAddingRuleDesc] = useState('');
  const { t } = useLang();

  const handleAddBlock = () => {
    const newBlock: RuleBlock = { id: Date.now().toString(), title: t.newCleaningBlock, rules: [] };
    updateConfig({ ruleBlocks: [...currentRuleBlocks, newBlock] });
  };

  const handleRemoveBlock = (blockId: string) =>
    updateConfig({ ruleBlocks: currentRuleBlocks.filter(b => b.id !== blockId) });

  const handleUpdateBlockTitle = (blockId: string) => {
    updateConfig({ ruleBlocks: currentRuleBlocks.map(b => b.id === blockId ? { ...b, title: editBlockTitleValue } : b) });
    setEditingBlockTitle(null);
  };

  const handleAddRule = (blockId: string) => {
    if (!addingRuleDesc.trim()) return;
    updateConfig({ ruleBlocks: currentRuleBlocks.map(b => b.id === blockId ? { ...b, rules: [...b.rules, addingRuleDesc] } : b) });
    setAddingRuleToBlock(null);
    setAddingRuleDesc('');
  };

  const handleRemoveRule = (blockId: string, ruleIndex: number) => {
    updateConfig({
      ruleBlocks: currentRuleBlocks.map(b => {
        if (b.id !== blockId) return b;
        const newRules = [...b.rules];
        newRules.splice(ruleIndex, 1);
        return { ...b, rules: newRules };
      }),
    });
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      {isRep && (
        <div className="flex justify-end">
          <button onClick={handleAddBlock} className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm border border-sky-500/50 flex items-center gap-2 transition-colors">
            <Plus size={18} /> {t.newRuleBlock}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {currentRuleBlocks.map((block, i) => (
          <div key={block.id} className="bg-neutral-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-700 overflow-hidden flex flex-col items-start h-max pb-8 relative group">
            {isRep && currentRuleBlocks.length > 1 && (
              <button onClick={() => handleRemoveBlock(block.id)} className="absolute top-4 right-4 z-20 text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-full transition-colors opacity-0 group-hover:opacity-100" title={t.deletePanel}>
                <Trash2 size={16} />
              </button>
            )}
            <div className="w-full flex-1 bg-neutral-900 border-t border-neutral-700 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stucco.png')] opacity-20 pointer-events-none" />
              <div className={`bg-white bg-[url('https://www.transparenttextures.com/patterns/stucco.png')] w-[92%] mx-auto mt-6 rounded-xl p-6 sm:p-8 shadow-lg border border-neutral-200 relative transform ${i % 2 === 0 ? 'rotate-[0.5deg]' : 'rotate-[-0.5deg]'}`}>
                <div className="w-12 h-1.5 rounded-full bg-sky-500/80 absolute top-3 left-1/2 transform -translate-x-1/2 shadow-sm z-10" />

                {editingBlockTitle === block.id ? (
                  <div className="mb-8 mt-6 flex flex-col items-center gap-3 relative z-10 bg-white/50 backdrop-blur-sm p-5 rounded-xl shadow-inner border border-neutral-200">
                    <input type="text" value={editBlockTitleValue} onChange={e => setEditBlockTitleValue(e.target.value)} className="w-full text-center font-bold text-xl text-neutral-800 border-b-2 border-neutral-300 bg-transparent py-2 outline-none focus:border-sky-500 transition-colors" placeholder={t.blockTitlePlaceholder} />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setEditingBlockTitle(null)} className="text-xs bg-white hover:bg-neutral-100 text-neutral-600 px-4 py-2 rounded-md uppercase font-bold tracking-wider transition-colors border border-neutral-300">{t.cancel}</button>
                      <button onClick={() => handleUpdateBlockTitle(block.id)} className="text-xs bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-md uppercase font-bold tracking-wider transition-colors shadow-sm">{t.save}</button>
                    </div>
                  </div>
                ) : (
                  <h3
                    className={`text-center font-bold text-xl md:text-2xl text-sky-700 uppercase mb-8 mt-6 tracking-wide drop-shadow-sm ${isRep ? 'cursor-pointer hover:bg-black/5 p-2 md:-mx-2 rounded-lg transition-colors group/title relative hover:underline' : ''}`}
                    onClick={() => { if (isRep) { setEditBlockTitleValue(block.title); setEditingBlockTitle(block.id); } }}
                  >
                    {block.title}
                    {isRep && <Edit2 size={16} className="opacity-0 group-hover/title:opacity-100 absolute top-1/2 transform -translate-y-1/2 -right-8 text-neutral-500 bg-white border border-neutral-200 p-1 w-7 h-7 rounded flex items-center justify-center transition-all shadow-sm" />}
                  </h3>
                )}

                {addingRuleToBlock === block.id && (
                  <div className="mb-6 bg-white/50 backdrop-blur-sm p-5 rounded-xl border border-neutral-200 shadow-sm relative z-10">
                    <label className="text-xs font-bold text-sky-600 uppercase tracking-widest mb-3 block">{t.newRule}</label>
                    <textarea className="w-full border border-neutral-300 rounded-lg p-3 text-sm outline-none focus:border-sky-500 bg-white/80 text-neutral-800 mb-4 transition-colors placeholder:text-neutral-400 shadow-inner" value={addingRuleDesc} onChange={e => setAddingRuleDesc(e.target.value)} placeholder={t.rulePlaceholder} rows={2} />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setAddingRuleToBlock(null)} className="text-xs text-neutral-500 hover:text-neutral-700 hover:bg-white px-4 py-2 rounded-md font-bold uppercase tracking-wide transition-colors border border-neutral-200">{t.cancel}</button>
                      <button onClick={() => handleAddRule(block.id)} disabled={!addingRuleDesc.trim()} className="text-xs bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide transition-colors shadow-sm">{t.add}</button>
                    </div>
                  </div>
                )}

                <ul className="space-y-4 relative z-10">
                  {block.rules.map((rule, idx) => (
                    <li key={`${block.id}-rule-${idx}-${rule.substring(0, 10)}`} className="flex items-center group/rule">
                      <div className="bg-sky-100 p-1 rounded border border-sky-200 mr-4 shrink-0 shadow-sm"><CheckSquare className="h-4 w-4 text-sky-600" /></div>
                      <span className="text-neutral-800 font-medium text-base md:text-lg leading-relaxed flex-1">{rule}</span>
                      {isRep && (
                       <button onClick={() => handleRemoveRule(block.id, idx)} className="opacity-0 group-hover/rule:opacity-100 text-red-500 hover:text-red-700 hover:bg-white border border-transparent hover:border-red-200 shadow-sm shrink-0 ml-3 p-2 rounded transition-all" title={t.removeRule}><Trash2 size={16} /></button>
                      )}
                    </li>
                  ))}
                </ul>

                {block.rules.length === 0 && !addingRuleToBlock && (
                  <div className="text-center text-neutral-500 italic py-6 bg-black/5 rounded-lg border border-neutral-300 border-dashed relative z-10">{t.noRules}</div>
                )}

                {isRep && addingRuleToBlock !== block.id && (
                  <button onClick={() => setAddingRuleToBlock(block.id)} className="mt-8 flex items-center justify-center w-full gap-2 text-neutral-500 hover:text-neutral-700 hover:bg-black/5 p-4 rounded-xl border border-dashed border-neutral-300 font-bold uppercase tracking-widest text-xs transition-colors relative z-10 shadow-sm hover:shadow">
                    <Plus size={16} /> {t.addItem}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
