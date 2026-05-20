import React, { useState } from 'react';
import { Product } from './hooks/useWingConfig';
import { Plus, Trash2, Edit2, ShoppingBag, Check, Wallet, Pencil, X } from 'lucide-react';
import { useLang } from './LanguageContext';

interface ProductsTabProps {
  products: Product[];
  isRep: boolean;
  updateProducts: (products: Product[]) => void;
  fundBalance?: number;
  updateFundBalance?: (balance: number) => void;
}

export function ProductsTab({ products, isRep, updateProducts, fundBalance, updateFundBalance }: ProductsTabProps) {
  const { t } = useLang();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'unit' | 'amount'>('unit');
  const [editQuantity, setEditQuantity] = useState(0);
  const [editTargetQuantity, setEditTargetQuantity] = useState(0);
  const [editStatus, setEditStatus] = useState<'full' | 'more_than_half' | 'half' | 'less_than_half' | 'empty'>('full');

  const [isAdding, setIsAdding] = useState(false);
  const [isEditingFund, setIsEditingFund] = useState(false);
  const [editFundValue, setEditFundValue] = useState(0);

  const handleSaveFund = () => {
    if (updateFundBalance) {
      updateFundBalance(editFundValue);
    }
    setIsEditingFund(false);
  };

  const handleAdd = () => {
    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: editName || t.newProduct,
      type: editType,
    };
    if (editType === 'unit') {
      newProduct.quantity = editQuantity;
      newProduct.targetQuantity = editTargetQuantity;
    } else if (editType === 'amount') {
      newProduct.status = editStatus;
    }
    updateProducts([...products, newProduct]);
    setIsAdding(false);
    resetEditState();
  };

  const handleUpdate = (id: string) => {
    const updated = products.map(p => {
      if (p.id === id) {
        const up: Product = {
          id: p.id,
          name: editName,
          type: editType,
        };
        if (editType === 'unit') {
          up.quantity = editQuantity;
          up.targetQuantity = editTargetQuantity;
        } else if (editType === 'amount') {
          up.status = editStatus;
        }
        return up;
      }
      return p;
    });
    updateProducts(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    updateProducts(products.filter(p => p.id !== id));
  };

  const resetEditState = () => {
    setEditName('');
    setEditType('unit');
    setEditQuantity(0);
    setEditTargetQuantity(5);
    setEditStatus('full');
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'full': return t.statusFull;
      case 'more_than_half': return t.statusMoreThanHalf;
      case 'half': return t.statusHalf;
      case 'low': return t.statusLow;
      case 'less_than_half': return t.statusLow;
      case 'empty': return t.statusEmpty;
      default: return '';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'full': return 'bg-emerald-500';
      case 'more_than_half': return 'bg-lime-500';
      case 'half': return 'bg-amber-500';
      case 'low': return 'bg-orange-500';
      case 'less_than_half': return 'bg-orange-500';
      case 'empty': return 'bg-red-500';
      default: return 'bg-neutral-500';
    }
  };
  
  const getStatusWidth = (status?: string) => {
    switch (status) {
      case 'full': return '100%';
      case 'more_than_half': return '75%';
      case 'half': return '50%';
      case 'low': return '25%';
      case 'less_than_half': return '25%';
      case 'empty': return '0%';
      default: return '0%';
    }
  };

  const getUnitProgress = (quantity: number, target: number) => {
    if (target <= 0) return 100;
    return Math.min(100, Math.max(0, (quantity / target) * 100));
  };

  /* ---- FORMULÁRIO DE EDIÇÃO INLINE ---- */
  const renderEditForm = (onSave: () => void, onCancel: () => void) => (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={editName}
        onChange={e => setEditName(e.target.value)}
        className="bg-neutral-900 border border-neutral-700 text-white px-3 py-2 rounded-md focus:outline-none focus:border-pink-500"
        placeholder={t.productNamePlaceholder}
      />
      <select
        value={editType}
        onChange={e => setEditType(e.target.value as 'unit' | 'amount')}
        className="bg-neutral-900 border border-neutral-700 text-white px-3 py-2 rounded-md focus:outline-none focus:border-pink-500"
      >
        <option value="unit">{t.byUnit}</option>
        <option value="amount">{t.byVolume}</option>
      </select>

      {editType === 'unit' && (
        <div className="flex gap-2">
          <label className="flex-1 min-w-0 flex flex-col gap-1 text-xs text-neutral-400">
            {t.current}
            <input type="number" min="0" value={editQuantity} onChange={e => setEditQuantity(Number(e.target.value))} className="w-full bg-neutral-900 border border-neutral-700 text-white px-2 py-1.5 rounded-md focus:outline-none focus:border-pink-500" />
          </label>
          <label className="flex-1 min-w-0 flex flex-col gap-1 text-xs text-neutral-400">
            {t.idealMax}
            <input type="number" min="1" value={editTargetQuantity} onChange={e => setEditTargetQuantity(Number(e.target.value))} className="w-full bg-neutral-900 border border-neutral-700 text-white px-2 py-1.5 rounded-md focus:outline-none focus:border-pink-500" />
          </label>
        </div>
      )}

      {editType === 'amount' && (
        <select
          value={editStatus}
          onChange={e => setEditStatus(e.target.value as any)}
          className="bg-neutral-900 border border-neutral-700 text-white px-3 py-2 rounded-md focus:outline-none focus:border-pink-500"
        >
          <option value="full">{t.statusFull}</option>
          <option value="more_than_half">{t.statusMoreThanHalf}</option>
          <option value="half">{t.statusHalf}</option>
          <option value="less_than_half">{t.statusLow}</option>
          <option value="empty">{t.statusEmpty}</option>
        </select>
      )}

      <div className="flex gap-2 mt-2">
        <button onClick={onCancel} className="flex-1 px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm font-semibold transition-colors">{t.cancel}</button>
        <button onClick={onSave} disabled={!editName.trim()} className="flex-[2] items-center justify-center gap-1 bg-pink-600 hover:bg-pink-700 rounded-lg text-sm font-semibold transition-colors flex text-white disabled:opacity-50">
          <Check size={16} /> {t.save}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-100 flex items-center gap-2">
            <ShoppingBag className="text-pink-400" />
            {t.productsTitle}
          </h2>
          <p className="text-neutral-400 mt-1">{t.productsDesc}</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          {/* Fundo da Ala */}
          <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-3 flex-1 sm:flex-initial shadow-sm">
            <div className="bg-emerald-500/20 p-2 rounded-lg shrink-0">
              <Wallet className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-[120px]">
              <p className="text-xs text-emerald-300/80 font-medium whitespace-nowrap">{t.wingFund}</p>
              {isEditingFund ? (
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-400 font-bold text-sm">R$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editFundValue}
                      onChange={(e) => setEditFundValue(Number(e.target.value))}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveFund()}
                      className="bg-emerald-950 border border-emerald-500/50 rounded-md px-2 py-1 text-emerald-100 font-bold w-28 focus:outline-none focus:border-emerald-400 text-base"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveFund}
                      className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg py-2 text-sm font-bold transition-colors"
                    >
                      <Check size={15} /> {t.save}
                    </button>
                    <button
                      onClick={() => setIsEditingFund(false)}
                      className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-800 text-neutral-300 rounded-lg text-sm font-bold transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-black text-lg">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fundBalance || 0)}
                  </span>
                  {isRep && (
                    <button 
                      onClick={() => { setEditFundValue(fundBalance || 0); setIsEditingFund(true); }}
                      className="text-emerald-400/60 hover:text-emerald-300 transition-colors p-1"
                      title="Editar saldo"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Apenas o rep pode adicionar novos produtos */}
          {isRep && !isAdding && (
            <button
              onClick={() => { resetEditState(); setIsAdding(true); }}
              className="flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-3 sm:py-2.5 rounded-xl font-bold transition-colors shadow-sm flex-1 sm:flex-initial"
            >
              <Plus size={18} />
              {t.newProduct}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => {
          const isEditing = editingId === product.id;

          if (isEditing) {
            return (
              <div key={product.id} className="bg-neutral-800 rounded-xl p-5 border border-pink-500 flex flex-col gap-4 shadow-lg ring-2 ring-pink-500/20">
                {renderEditForm(
                  () => handleUpdate(product.id),
                  () => setEditingId(null)
                )}
              </div>
            );
          }

          const progress = product.type === 'unit'
            ? getUnitProgress(product.quantity || 0, product.targetQuantity || 1)
            : 0;

          return (
            <div key={product.id} className="bg-neutral-800 rounded-xl p-5 border border-neutral-700 flex flex-col justify-between shadow-sm hover:border-pink-500/30 transition-all group">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-white text-lg leading-tight pr-2">{product.name}</h3>
                  {/* Botões: editar = todos | excluir = só rep. No mobile sempre visível, no desktop aparece ao hover */}
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => {
                        setEditingId(product.id);
                        setEditName(product.name);
                        setEditType(product.type);
                        setEditQuantity(product.quantity || 0);
                        setEditTargetQuantity(product.targetQuantity || 1);
                        setEditStatus(product.status || 'full');
                        setIsAdding(false);
                      }}
                      className="p-1.5 text-neutral-400 hover:text-sky-400 hover:bg-neutral-700 rounded-md transition-colors"
                      title={t.edit}
                    >
                      <Edit2 size={14} />
                    </button>
                    {isRep && (
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-700 rounded-md transition-colors"
                        title={t.delete}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  {product.type === 'unit' ? (
                    <div className="flex items-end gap-2">
                      <span className="text-3xl font-black text-pink-100">{product.quantity}</span>
                      <span className="text-sm text-neutral-400 pb-1">/ {product.targetQuantity} unid.</span>
                    </div>
                  ) : (
                    <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold leading-none capitalize ${product.status === 'empty' ? 'bg-red-500/20 text-red-400' : product.status === 'less_than_half' ? 'bg-orange-500/20 text-orange-400' : product.status === 'half' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {getStatusLabel(product.status)}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden">
                {product.type === 'unit' ? (
                  <div
                    className={`h-full transition-all duration-500 ${progress <= 20 ? 'bg-red-500' : progress <= 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                ) : (
                  <div
                    className={`h-full transition-all duration-500 ${getStatusColor(product.status)}`}
                    style={{ width: getStatusWidth(product.status) }}
                  />
                )}
              </div>
            </div>
          );
        })}

        {isAdding && (
          <div className="bg-neutral-800 rounded-xl p-5 border border-pink-500 flex flex-col gap-4 shadow-lg ring-2 ring-pink-500/20">
            {renderEditForm(
              handleAdd,
              () => { setIsAdding(false); resetEditState(); }
            )}
          </div>
        )}
      </div>

      {products.length === 0 && !isAdding && (
        <div className="bg-neutral-800/50 rounded-2xl border border-neutral-700 p-10 text-center flex flex-col items-center">
          <ShoppingBag className="w-12 h-12 text-neutral-600 mb-4" />
          <h3 className="text-xl font-bold text-neutral-300 mb-2">{t.noProducts}</h3>
          <p className="text-neutral-500 max-w-md mx-auto">
            {isRep
              ? t.noProductsRep
              : t.noProductsResident}
          </p>
        </div>
      )}
    </div>
  );
}
