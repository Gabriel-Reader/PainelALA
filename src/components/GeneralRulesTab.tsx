import React, { useState } from 'react';
import { Plus, Trash2, Edit2, CheckSquare, Check, X, GripVertical, AlertCircle, Pencil, Image as ImageIcon } from 'lucide-react';
import { AppConfig, RuleBlock } from '../hooks/useWingConfig';
import { useLang } from '../LanguageContext';
import { toPng } from 'html-to-image';
import { showToast } from './Toast';

const renderFormattedText = (text: string) => {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="font-bold text-neutral-900">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

interface GeneralRulesTabProps {
  config: AppConfig;
  isRep: boolean;
  updateConfig: (updates: Partial<AppConfig>) => void;
  currentGeneralRuleBlocks: RuleBlock[];
}

export function GeneralRulesTab({ config, isRep, updateConfig, currentGeneralRuleBlocks }: GeneralRulesTabProps) {
  const [editingBlockTitle, setEditingBlockTitle] = useState<string | null>(null);
  const [editBlockTitleValue, setEditBlockTitleValue] = useState('');
  const [addingRuleToBlock, setAddingRuleToBlock] = useState<string | null>(null);
  const [addingRuleDesc, setAddingRuleDesc] = useState('');
  const [editingRule, setEditingRule] = useState<{ blockId: string; index: number; value: string } | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ blockId: string; index: number } | null>(null);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const { t } = useLang();

  const rulesContainerRef = React.useRef<HTMLDivElement>(null);

  const handleCopyImage = async (elementId?: string, fileName?: string) => {
    const targetElement = elementId ? document.getElementById(elementId) : rulesContainerRef.current;
    if (!targetElement) return;

    try {
      showToast('Gerando imagem...', 'info');
      
      const elementsToHide = targetElement.querySelectorAll('.opacity-0, .text-red-400, .text-indigo-600, .text-red-500, button[title="Editar"], button[title="Excluir Painel"]');
      elementsToHide.forEach((el) => { (el as HTMLElement).style.visibility = 'hidden'; });

      const dataUrl = await toPng(targetElement as HTMLElement, { cacheBust: true, backgroundColor: elementId ? 'transparent' : '#171717', pixelRatio: 3, skipFonts: true, style: { margin: '0' } });
      
      elementsToHide.forEach((el) => { (el as HTMLElement).style.visibility = ''; });

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast('Imagem copiada para a área de transferência!', 'success');
      } catch (err) {
        const link = document.createElement('a');
        link.download = fileName ? `${fileName}.png` : 'regras-gerais.png';
        link.href = dataUrl;
        link.click();
        showToast('Imagem baixada com sucesso!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar imagem.', 'error');
    }
  };

  const handleAddBlock = () => {
    const newBlock: RuleBlock = { id: Date.now().toString(), title: t.newGeneralBlock, rules: [] };
    updateConfig({ generalRuleBlocks: [...currentGeneralRuleBlocks, newBlock] });
  };

  const handleRemoveBlock = (blockId: string) => {
    const blockToDelete = currentGeneralRuleBlocks.find(b => b.id === blockId);
    if (!blockToDelete) return;
    updateConfig({ generalRuleBlocks: currentGeneralRuleBlocks.filter(b => b.id !== blockId) });
    showToast(`Lousa '${blockToDelete.title}' excluída.`, 'info', {
      label: 'Desfazer',
      onClick: () => updateConfig({ generalRuleBlocks: [...currentGeneralRuleBlocks] })
    });
  };

  const handleUpdateBlockTitle = (blockId: string) => {
    updateConfig({ generalRuleBlocks: currentGeneralRuleBlocks.map(b => b.id === blockId ? { ...b, title: editBlockTitleValue } : b) });
    setEditingBlockTitle(null);
  };

  const handleAddRule = (blockId: string) => {
    if (!addingRuleDesc.trim()) return;
    updateConfig({ generalRuleBlocks: currentGeneralRuleBlocks.map(b => b.id === blockId ? { ...b, rules: [...b.rules, addingRuleDesc] } : b) });
    setAddingRuleToBlock(null);
    setAddingRuleDesc('');
  };

  const handleRemoveRule = (blockId: string, ruleIndex: number) => {
    const block = currentGeneralRuleBlocks.find(b => b.id === blockId);
    if (!block) return;

    updateConfig({
      generalRuleBlocks: currentGeneralRuleBlocks.map(b => {
        if (b.id !== blockId) return b;
        const newRules = [...b.rules];
        newRules.splice(ruleIndex, 1);
        return { ...b, rules: newRules };
      }),
    });

    showToast(`Regra excluída.`, 'info', {
      label: 'Desfazer',
      onClick: () => updateConfig({ generalRuleBlocks: [...currentGeneralRuleBlocks] })
    });
  };

  const handleUpdateRule = (blockId: string, ruleIndex: number, newValue: string) => {
    if (!newValue.trim()) return;
    updateConfig({
      generalRuleBlocks: currentGeneralRuleBlocks.map(b => {
        if (b.id !== blockId) return b;
        const newRules = [...b.rules];
        newRules[ruleIndex] = newValue.trim();
        return { ...b, rules: newRules };
      }),
    });
    setEditingRule(null);
  };

  const handleDragStart = (e: React.DragEvent, blockId: string, index: number) => {
    setDraggedItem({ blockId, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, blockId: string, index: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.blockId !== blockId || draggedItem.index === index) return;

    const newRules = [...currentGeneralRuleBlocks.find(b => b.id === blockId)!.rules];
    const [removed] = newRules.splice(draggedItem.index, 1);
    newRules.splice(index, 0, removed);

    updateConfig({
      generalRuleBlocks: currentGeneralRuleBlocks.map(b => (b.id === blockId ? { ...b, rules: newRules } : b))
    });

    setDraggedItem({ blockId, index });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleTouchStart = (e: React.TouchEvent, blockId: string, index: number) => {
    setDraggedItem({ blockId, index });
  };

  const handleTouchMove = (e: React.TouchEvent, blockId: string) => {
    if (!draggedItem || draggedItem.blockId !== blockId) return;

    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!element) return;

    const li = element.closest('li');
    if (!li) return;

    const indexAttr = li.getAttribute('data-index');
    const targetBlockId = li.getAttribute('data-block-id');
    if (indexAttr === null || targetBlockId !== blockId) return;

    const targetIndex = parseInt(indexAttr, 10);
    if (targetIndex === draggedItem.index) return;

    const newRules = [...currentGeneralRuleBlocks.find(b => b.id === blockId)!.rules];
    const [removed] = newRules.splice(draggedItem.index, 1);
    newRules.splice(targetIndex, 0, removed);

    updateConfig({
      generalRuleBlocks: currentGeneralRuleBlocks.map(b => (b.id === blockId ? { ...b, rules: newRules } : b))
    });

    setDraggedItem({ blockId, index: targetIndex });
  };

  const handleTouchEnd = () => {
    setDraggedItem(null);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8">
      <div className="bg-sky-900/20 border border-sky-800/50 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
        <div className="p-3 bg-sky-900/40 rounded-xl shrink-0">
          <AlertCircle className="w-6 h-6 text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1 gap-4">
            <h2 className="text-lg font-bold text-sky-100">{config?.generalRulesCardTitle ?? 'Solicitação de Manutenção'}</h2>
            {isRep && (
              <button
                onClick={() => setIsEditingDescription(true)}
                className="p-2 bg-sky-900/40 hover:bg-sky-800/60 rounded-lg text-sky-300 transition-colors shrink-0"
                title={t.editTexts || 'Editar Textos'}
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-sky-300/80 text-sm leading-relaxed whitespace-pre-line text-justify">
            {config?.generalRulesCardDescription ?? (config?.maintenanceDescription || t.maintenanceDefaultDesc)}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 flex-wrap">
        <button onClick={() => handleCopyImage()} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium py-2.5 px-4 rounded-lg shadow-sm border border-neutral-700 flex items-center gap-2 transition-colors">
          <ImageIcon size={18} /> Exportar Todas
        </button>
        {isRep && (
          <button onClick={handleAddBlock} className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm border border-sky-500/50 flex items-center gap-2 transition-colors">
            <Plus size={18} /> {t.newGeneralRuleBlock}
          </button>
        )}
      </div>

      <div ref={rulesContainerRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start p-2 -m-2 sm:p-4 sm:-m-4 bg-[#171717] rounded-xl">
        {currentGeneralRuleBlocks.map((block, i) => (
          <div key={block.id} className="bg-neutral-800 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-neutral-700 overflow-hidden flex flex-col items-start h-max pb-0 relative group">
            {isRep && (
              <button onClick={() => handleRemoveBlock(block.id)} className="absolute top-4 right-4 z-20 text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-full transition-colors opacity-0 group-hover:opacity-100" title={t.deletePanel}>
                <Trash2 size={16} />
              </button>
            )}
            <div className="w-full flex-1 bg-neutral-900 border-t border-neutral-700 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/stucco.png')] opacity-20 pointer-events-none" />
              <div id={`general-rule-block-${block.id}`} className="bg-white bg-[url('/stucco.png')] w-[92%] mx-auto mt-6 mb-6 rounded-xl p-6 sm:p-8 shadow-lg border border-neutral-200 relative">
                <div className="w-12 h-1.5 rounded-full bg-indigo-500/80 absolute top-3 left-1/2 transform -translate-x-1/2 shadow-sm z-10" />

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
                    className={`text-center font-bold text-xl md:text-2xl text-indigo-700 uppercase mb-8 mt-6 tracking-wide drop-shadow-sm ${isRep ? 'cursor-pointer hover:bg-black/5 p-2 md:-mx-2 rounded-lg transition-colors group/title relative hover:underline' : ''}`}
                    onClick={() => { if (isRep) { setEditBlockTitleValue(block.title); setEditingBlockTitle(block.id); } }}
                  >
                    {block.title}
                    {isRep && <Edit2 size={16} className="opacity-0 group-hover/title:opacity-100 absolute top-1/2 transform -translate-y-1/2 -right-8 text-neutral-500 bg-white border border-neutral-200 p-1 w-7 h-7 rounded flex items-center justify-center transition-all shadow-sm" />}
                  </h3>
                )}

                {addingRuleToBlock === block.id && (
                  <div className="mb-6 bg-white/50 backdrop-blur-sm p-5 rounded-xl border border-neutral-200 shadow-sm relative z-10">
                    <label className="text-xs font-bold text-sky-600 uppercase tracking-widest mb-3 block">{t.newRule}</label>
                    <textarea className="w-full border border-neutral-300 rounded-lg p-3 text-sm outline-none focus:border-sky-500 bg-white/80 text-neutral-800 mb-4 transition-colors placeholder:text-neutral-400 shadow-inner" value={addingRuleDesc} onChange={e => setAddingRuleDesc(e.target.value)} placeholder={t.generalRulePlaceholder} rows={2} />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setAddingRuleToBlock(null)} className="text-xs text-neutral-500 hover:text-neutral-700 hover:bg-white px-4 py-2 rounded-md font-bold uppercase tracking-wide transition-colors border border-neutral-200">{t.cancel}</button>
                      <button onClick={() => handleAddRule(block.id)} disabled={!addingRuleDesc.trim()} className="text-xs bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold uppercase tracking-wide transition-colors shadow-sm">{t.add}</button>
                    </div>
                  </div>
                )}

                <ul className="space-y-4 relative z-10">
                  {block.rules.map((rule, idx) => {
                    const isEditing = editingRule && editingRule.blockId === block.id && editingRule.index === idx;
                    const isDraggingThis = draggedItem && draggedItem.blockId === block.id && draggedItem.index === idx;
                    return (
                      <li
                        key={`${block.id}-rule-${idx}`}
                        data-index={idx}
                        data-block-id={block.id}
                        draggable={isRep && !isEditing}
                        onDragStart={e => handleDragStart(e, block.id, idx)}
                        onDragOver={e => handleDragOver(e, block.id, idx)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-start group/rule min-h-[40px] w-full p-1.5 rounded-lg transition-all duration-150 relative ${
                          isRep ? 'pl-8 pr-[70px]' : 'pl-2 pr-2'
                        } ${
                          isDraggingThis ? 'opacity-40 bg-indigo-50 border border-dashed border-indigo-300' : 'hover:bg-neutral-50/30'
                        }`}
                      >
                        {isRep && !isEditing && (
                          <div
                            onTouchStart={e => handleTouchStart(e, block.id, idx)}
                            onTouchMove={e => handleTouchMove(e, block.id)}
                            onTouchEnd={handleTouchEnd}
                            style={{ touchAction: 'none' }}
                            className="absolute left-1.5 top-[11px] text-neutral-400 hover:text-neutral-600 cursor-grab active:cursor-grabbing shrink-0 opacity-100 md:opacity-0 md:group-hover/rule:opacity-100 transition-opacity select-none"
                          >
                            <GripVertical size={16} />
                          </div>
                        )}
                        <div className="bg-indigo-100 p-1 rounded border border-indigo-200 mr-3 shrink-0 shadow-sm mt-1">
                          <CheckSquare className="h-4 w-4 text-indigo-600" />
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingRule.value}
                              onChange={e => setEditingRule({ ...editingRule, value: e.target.value })}
                              className="flex-1 text-neutral-800 border-b-2 border-indigo-500 bg-transparent py-1 px-1 outline-none text-base md:text-lg leading-relaxed font-medium"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleUpdateRule(block.id, idx, editingRule.value);
                                if (e.key === 'Escape') setEditingRule(null);
                              }}
                            />
                            <button
                              onClick={() => handleUpdateRule(block.id, idx, editingRule.value)}
                              className="text-emerald-600 hover:text-emerald-700 p-2 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-100 shadow-sm bg-white"
                              title={t.save}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => setEditingRule(null)}
                              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 shadow-sm bg-white"
                              title={t.cancel}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-neutral-800 font-medium text-base md:text-lg leading-relaxed flex-1 text-justify">{renderFormattedText(rule)}</span>
                            {isRep && (
                              <div className="absolute right-1.5 top-1.5 flex items-center gap-1 shrink-0 transition-all opacity-100 md:opacity-0 md:group-hover/rule:opacity-100">
                                <button
                                  onClick={() => setEditingRule({ blockId: block.id, index: idx, value: rule })}
                                  className="text-indigo-600 hover:text-indigo-700 hover:bg-white border border-neutral-200 shadow-sm p-1.5 rounded-md transition-colors bg-white"
                                  title={t.edit}
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleRemoveRule(block.id, idx)}
                                  className="text-red-500 hover:text-red-700 hover:bg-white border border-neutral-200 shadow-sm p-1.5 rounded-md transition-colors bg-white"
                                  title={t.removeRule}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </li>
                    );
                  })}
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
              
              <div className="w-full mt-2 p-3 bg-neutral-900/50 border-t border-neutral-800 flex justify-center">
                <button
                  onClick={() => handleCopyImage(`general-rule-block-${block.id}`, block.title)}
                  className="flex items-center gap-2 text-neutral-400 hover:text-white hover:bg-neutral-800 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors border border-transparent hover:border-neutral-700"
                  title="Copiar este cartão como imagem"
                >
                  <ImageIcon size={14} className="sm:w-4 sm:h-4" /> Exportar Cartão
                </button>
              </div>

            </div>
          </div>
        ))}
      </div>

      {isEditingDescription && (
        <GeneralRulesSettingsModal
          config={config}
          onClose={() => setIsEditingDescription(false)}
          onSave={async (updates) => {
            await updateConfig(updates);
            setIsEditingDescription(false);
          }}
        />
      )}
    </div>
  );
}

function GeneralRulesSettingsModal({
  config,
  onClose,
  onSave
}: {
  config?: AppConfig;
  onClose: () => void;
  onSave: (updates: Partial<AppConfig>) => Promise<void>;
}) {
  const [title, setTitle] = useState(config?.generalRulesCardTitle ?? 'Solicitação de Manutenção');
  const [description, setDescription] = useState(config?.generalRulesCardDescription ?? (config?.maintenanceDescription ?? 'Preencha os campos abaixo com os problemas encontrados na ala ou no seu quarto. Ao clicar em enviar, sua solicitação será registrada automaticamente e enviada para a administração providenciar os reparos.'));
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave({
      generalRulesCardTitle: title,
      generalRulesCardDescription: description
    });
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/50">
          <h2 className="text-xl font-bold text-neutral-100 flex items-center gap-2">
            <Pencil className="w-5 h-5 text-sky-400" />
            Editar Textos da Aba
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Título do Card</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-400 hover:text-white font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-medium transition-colors"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
